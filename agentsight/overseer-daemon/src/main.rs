// overseer-daemon/src/main.rs — Aegis Ring Overseer Daemon Entry Point
//
// Orchestrates:
//   1. eBPF LSM skeleton loading and attachment (kernel_bridge)
//   2. RingBuffer event polling and correlation (kernel_bridge)
//   3. AgentSight telemetry ingestion from /tmp/aegis_telemetry.sock
//   4. Process lifecycle management (SIGSTOP/SIGCONT/SIGKILL)
//   5. WebSocket IPC to Tauri desktop frontend (ipc_server)
//   6. OverlayFS sandbox rollback (sandbox_overlay)

mod agentsight_bridge;
mod ipc_server;
mod kernel_bridge;
mod process_freezer;
mod sandbox_overlay;

use std::sync::Arc;

use clap::Parser;
use dashmap::DashMap;
use tokio::sync::broadcast;
use tracing::{info, warn};
use tracing_subscriber::{fmt, EnvFilter};

/// Shared daemon state accessible across all async tasks
pub struct DaemonState {
    /// Active frozen PIDs awaiting user verdict: PID → event context
    pub frozen_pids: DashMap<u32, kernel_bridge::FrozenContext>,

    /// Broadcast channel for pushing events to WebSocket clients
    pub event_tx: broadcast::Sender<ipc_server::IpcEvent>,

    /// Configuration
    pub config: DaemonConfig,
}

#[derive(Debug, Clone)]
pub struct DaemonConfig {
    pub workspace_root: String,
    pub agent_pids: Vec<u32>,
    pub telemetry_sock: String,
    pub ws_bind_addr: String,
    pub overlay_upper: String,
    pub overlay_mount: String,
}

#[derive(Parser, Debug)]
#[command(name = "aegis-overseer", about = "Aegis Ring — Kernel-Level AI Agent Overseer Daemon")]
struct Cli {
    /// Root directory of the agent's approved workspace
    #[arg(short, long, default_value = "/home/user/workspace")]
    workspace: String,

    /// Comma-separated list of PIDs to track (agent processes)
    #[arg(short, long, default_value = "")]
    pids: String,

    /// Path to AgentSight telemetry Unix socket
    #[arg(short, long, default_value = "/tmp/aegis_telemetry.sock")]
    telemetry_sock: String,

    /// WebSocket bind address for Tauri IPC
    #[arg(long, default_value = "127.0.0.1:9850")]
    ws_addr: String,

    /// OverlayFS upper layer directory (ephemeral tmpfs)
    #[arg(long, default_value = "/tmp/aegis_overlay/upper")]
    overlay_upper: String,

    /// OverlayFS merged mount point
    #[arg(long, default_value = "/tmp/aegis_overlay/merged")]
    overlay_mount: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize structured logging
    fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .with_target(true)
        .with_thread_ids(true)
        .json()
        .init();

    let cli = Cli::parse();

    info!("═══════════════════════════════════════════════════════════");
    info!("  🛡️  Aegis Ring — Kernel-Level Agent Overseer Daemon");
    info!("  Workspace:     {}", cli.workspace);
    info!("  WebSocket IPC: ws://{}", cli.ws_addr);
    info!("  Telemetry:     {}", cli.telemetry_sock);
    info!("═══════════════════════════════════════════════════════════");

    let agent_pids: Vec<u32> = cli
        .pids
        .split(',')
        .filter_map(|s| s.trim().parse().ok())
        .collect();

    if agent_pids.is_empty() {
        warn!(
            "No agent PIDs specified. Use --pids to track agent processes, \
             or they will be discovered via AgentSight telemetry."
        );
    }

    let config = DaemonConfig {
        workspace_root: cli.workspace.clone(),
        agent_pids: agent_pids.clone(),
        telemetry_sock: cli.telemetry_sock.clone(),
        ws_bind_addr: cli.ws_addr.clone(),
        overlay_upper: cli.overlay_upper.clone(),
        overlay_mount: cli.overlay_mount.clone(),
    };

    // Broadcast channel: kernel events → WebSocket clients + internal handlers
    let (event_tx, _) = broadcast::channel::<ipc_server::IpcEvent>(1024);

    let state = Arc::new(DaemonState {
        frozen_pids: DashMap::new(),
        event_tx: event_tx.clone(),
        config,
    });

    // ─── Task 1: Load eBPF skeleton and start RingBuffer polling ───
    let state_kernel = Arc::clone(&state);
    let kernel_handle = tokio::spawn(async move {
        if let Err(e) = kernel_bridge::run(state_kernel).await {
            tracing::error!("Kernel bridge fatal error: {}", e);
        }
    });

    // ─── Task 2: WebSocket IPC server for Tauri frontend ───
    let state_ipc = Arc::clone(&state);
    let ipc_handle = tokio::spawn(async move {
        if let Err(e) = ipc_server::run(state_ipc).await {
            tracing::error!("IPC server fatal error: {}", e);
        }
    });

    // ─── Task 3: AgentSight telemetry ingestion ───
    let state_agent = Arc::clone(&state);
    let agent_handle = tokio::spawn(async move {
        if let Err(e) = agentsight_bridge::run(state_agent).await {
            tracing::error!("AgentSight bridge fatal error: {}", e);
        }
    });

    // ─── Task 4: OverlayFS sandbox monitor ───
    let state_overlay = Arc::clone(&state);
    let overlay_handle = tokio::spawn(async move {
        sandbox_overlay::init(&state_overlay.config).await;
    });

    info!("All subsystems launched. Aegis Ring is active.");

    // Wait for any task to complete (or crash)
    tokio::select! {
        r = kernel_handle => {
            warn!("Kernel bridge exited: {:?}", r);
        }
        r = ipc_handle => {
            warn!("IPC server exited: {:?}", r);
        }
        r = agent_handle => {
            warn!("AgentSight bridge exited: {:?}", r);
        }
        r = overlay_handle => {
            warn!("OverlayFS monitor exited: {:?}", r);
        }
    }

    Ok(())
}

