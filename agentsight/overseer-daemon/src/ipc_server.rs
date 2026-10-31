// overseer-daemon/src/ipc_server.rs
//
// WebSocket IPC Server for Tauri v2 / Next.js Desktop Control Center.
// Streams live Ring-0 telemetry, 3-color taint updates, and prompts the
// user via desktop interceptor modals when Weight is in Tier 2 (10-40).

use std::sync::Arc;
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use tokio::net::TcpListener;
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::Message;
use tracing::{error, info, warn};

use crate::process_freezer::{self, FreezeAction};
use crate::DaemonState;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum IpcEvent {
    AgentRunning {
        pid: u32,
        comm: String,
    },
    AgentPaused {
        pid: u32,
        comm: String,
        risk_weight: u32,
        reason: String,
        timestamp_ns: u64,
    },
    AgentBlocked {
        pid: u32,
        comm: String,
        risk_weight: u32,
        reason: String,
        timestamp_ns: u64,
    },
    TaintChanged {
        pid: u32,
        comm: String,
        taint_mask: u8,
        reason: String,
    },
    TelemetrySync {
        total_pids: usize,
        frozen_pids: usize,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "action")]
pub enum UserVerdictMessage {
    AllowOnce { pid: u32 },
    BlockAndRedirect { pid: u32, steering_prompt: String },
    TerminateAndRollback { pid: u32, reason: String },
}

pub async fn run(state: Arc<DaemonState>) -> anyhow::Result<()> {
    let addr = state.config.ws_bind_addr.clone();
    let listener = TcpListener::bind(&addr).await?;
    info!("[IPC Server] WebSocket Control Center listening on ws://{}", addr);

    while let Ok((stream, peer)) = listener.accept().await {
        info!("[IPC Server] UI client connected from {}", peer);
        let state_clone = Arc::clone(&state);
        let mut rx = state.event_tx.subscribe();

        tokio::spawn(async move {
            let ws_stream = match accept_async(stream).await {
                Ok(ws) => ws,
                Err(e) => {
                    error!("[IPC Server] WebSocket handshake error: {}", e);
                    return;
                }
            };

            let (mut ws_sender, mut ws_receiver) = ws_stream.split();

            loop {
                tokio::select! {
                    // Send broadcast events to connected UI client
                    Ok(event) = rx.recv() => {
                        if let Ok(json) = serde_json::to_string(&event) {
                            if let Err(e) = ws_sender.send(Message::Text(json)).await {
                                warn!("[IPC Server] Error sending event to UI: {}", e);
                                break;
                            }
                        }
                    }
                    // Handle incoming verdicts from UI client
                    Some(msg_result) = ws_receiver.next() => {
                        match msg_result {
                            Ok(Message::Text(text)) => {
                                info!("[IPC Server] Received UI command: {}", text);
                                if let Ok(verdict) = serde_json::from_str::<UserVerdictMessage>(&text) {
                                    handle_user_verdict(&state_clone, verdict).await;
                                }
                            }
                            Ok(Message::Close(_)) => {
                                info!("[IPC Server] UI client disconnected");
                                break;
                            }
                            Err(e) => {
                                warn!("[IPC Server] Error receiving message: {}", e);
                                break;
                            }
                            _ => {}
                        }
                    }
                }
            }
        });
    }

    Ok(())
}

async fn handle_user_verdict(state: &Arc<DaemonState>, verdict: UserVerdictMessage) {
    match verdict {
        UserVerdictMessage::AllowOnce { pid } => {
            process_freezer::handle_freeze_action(
                state,
                pid,
                FreezeAction::AllowOnce,
            ).await;
        }
        UserVerdictMessage::BlockAndRedirect { pid, steering_prompt } => {
            process_freezer::handle_freeze_action(
                state,
                pid,
                FreezeAction::BlockAndRedirect { steering_prompt },
            ).await;
        }
        UserVerdictMessage::TerminateAndRollback { pid, reason } => {
            process_freezer::handle_freeze_action(
                state,
                pid,
                FreezeAction::TerminateAndRollback {
                    reason,
                    stderr_feedback: "Operation terminated by user verdict; ephemeral changes rolled back.".to_string(),
                },
            ).await;
        }
    }
}

