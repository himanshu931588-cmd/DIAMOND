// overseer-daemon/src/process_freezer.rs
//
// Manages SIGSTOP / SIGCONT / SIGKILL process lifecycles,
// triggers 1ms OverlayFS RAM diff rollbacks via sandbox_overlay.rs,
// and injects synthetic steering feedback into the agent's stderr/PTY stream.

use std::sync::Arc;
use tracing::{info, warn, error};
use serde::{Deserialize, Serialize};

use crate::sandbox_overlay;
use crate::DaemonState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FreezeAction {
    AllowOnce,
    BlockAndRedirect {
        steering_prompt: String,
    },
    TerminateAndRollback {
        reason: String,
        stderr_feedback: String,
    },
}

pub async fn handle_freeze_action(
    state: &Arc<DaemonState>,
    pid: u32,
    action: FreezeAction,
) {
    match action {
        FreezeAction::AllowOnce => {
            info!("[Process Freezer] Human approved: Sending SIGCONT to PID {}", pid);
            send_signal_to_pid(pid, 18); // SIGCONT = 18
            state.frozen_pids.remove(&pid);
        }
        FreezeAction::BlockAndRedirect { steering_prompt } => {
            warn!("[Process Freezer] Blocking syscall for PID {} and injecting steering: {}", pid, steering_prompt);
            inject_stderr_feedback(pid, &steering_prompt).await;
            // Resume agent so it can read synthetic stderr and self-correct
            send_signal_to_pid(pid, 18); // SIGCONT
            state.frozen_pids.remove(&pid);
        }
        FreezeAction::TerminateAndRollback { reason, stderr_feedback } => {
            error!("[Process Freezer] Terminating PID {} and triggering 1ms OverlayFS Rollback! Reason: {}", pid, reason);
            inject_stderr_feedback(pid, &stderr_feedback).await;
            
            // 1. Send SIGKILL to abort rogue process tree
            send_signal_to_pid(pid, 9); // SIGKILL = 9
            state.frozen_pids.remove(&pid);

            // 2. Perform instant RAM diff rollback
            sandbox_overlay::rollback_upper_layer(&state.config).await;
        }
    }
}

fn send_signal_to_pid(pid: u32, sig: i32) {
    #[cfg(unix)]
    {
        use nix::sys::signal::{kill, Signal};
        use nix::unistd::Pid;

        if let Ok(signal) = Signal::try_from(sig) {
            let target = Pid::from_raw(pid as i32);
            if let Err(e) = kill(target, signal) {
                warn!("[Process Freezer] Failed to send signal {} to PID {}: {}", sig, pid, e);
            } else {
                info!("[Process Freezer] Signal {} delivered to PID {}", sig, pid);
            }
        }
    }

    #[cfg(not(unix))]
    {
        info!("[Process Freezer Mock] Simulated signal {} delivered to PID {}", sig, pid);
    }
}

async fn inject_stderr_feedback(pid: u32, message: &str) {
    info!(
        "[Stderr Steering Loop] Injected synthetic feedback into PID {} execution stream:\n  >> [STEER]: {}",
        pid, message
    );
    // In a live PTY wrapper, this writes to the slave fd of the agent subprocess.
}

