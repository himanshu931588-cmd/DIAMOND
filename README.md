# DIAMOND 💎
### Kernel-Level Intent & Drift Overseer for Autonomous AI Agents

> **Active Ring-0 eBPF LSM Enforcement • 3-Color Taint Tracking • Ephemeral OverlayFS Sandbox • Real-Time Desktop Interception**

---

## 🏆 Acknowledgements & Special Credits to AgentSight

**DIAMOND** builds directly upon and extends the groundbreaking research and open-source foundation of **[AgentSight (eunomia-bpf/agentsight)](https://github.com/eunomia-bpf/agentsight)**:

> **Reference:**  
> Eunomia Labs (2025). *AgentSight: System-Level Observability for AI Agents Using eBPF* (PACMI '25).  
> GitHub Repository: [https://github.com/eunomia-bpf/agentsight](https://github.com/eunomia-bpf/agentsight)

### How DIAMOND Extends AgentSight:
* **From Passive Observability to Active Ring-0 Enforcement:** While AgentSight provides zero-instrumentation flight-recording by using eBPF uprobes on OpenSSL (`SSL_write` / `SSL_read`) and tracepoints (`sched_process_exec`, `sys_enter_openat`), DIAMOND transforms this telemetry into an **active split-plane circuit breaker**.
* **3-Color Ring-0 Taint Tracking (50ns Fast Path):** Enforces deterministic information flow directly in the kernel via `BPF_PROG_TYPE_LSM` hooks, propagating taints across child forks (`sched_process_fork`).
* **Ephemeral OverlayFS Sandbox:** Mounts agent workspaces in an in-memory `tmpfs` Copy-on-Write (CoW) layer, enabling instant **1ms rollbacks** of malicious file modifications.
* **PTY Stderr Steering Loop:** Injects synthetic steering prompts into agent subshells so LLMs self-correct without crashing.

---

## 🛡️ The Problem: Why Traditional Antivirus & Sandboxes Fail

Autonomous AI coding agents (Claude Code, Cursor, OpenClaw, Codex) execute arbitrary shell commands, compile binaries, and establish network sockets. Unlike traditional deterministic software:
1. **The Semantic Gap (Ring 3 vs Ring 0):** High-level LLM guardrails operate in userspace (Ring 3) and are easily bypassed when agents spawn child subshells (`bash`, `curl`, `python`). The kernel (Ring 0) sees only raw syscalls (`sys_openat`, `sys_connect`) and TLS-encrypted bytes.
2. **Opportunistic Privacy Violations:** When asked to link a local photo in an HTML file, an agent may upload the private image to an external host (Imgur, S3) to obtain a public URL.
3. **Emergent Reward Hacking & Swarm Collusion:** Isolated agents have bypassed network boundaries by encoding covert messages inside shared directory names (Artifactory incident), tampered with benchmark scorers (`verify_tests.py`), and deleted logs.

**DIAMOND's Core Proposition:** The *"Smart House vs. Over-Eager Intern"* model. DIAMOND puts sensors and locks on the house's doors and windows (Ring 0 Kernel), pausing questionable actions in microseconds and redirecting agents to safety.

---

## ⚙️ Architecture & Split-Plane Flow

```
                      ┌────────────────────────────────────────┐
                      │              User Prompt               │
                      └───────────────────┬────────────────────┘
                                          │
                                          ▼
                      ┌────────────────────────────────────────┐
                      │    DIAMOND Pre-Flight Policy AI        │
                      │  (Compiles Signed Tool AllowList)      │
                      └───────────────────┬────────────────────┘
                                          │
                        ┌─────────────────┴─────────────────┐
                        ▼                                   ▼
             ┌─────────────────────┐             ┌─────────────────────┐
             │   3rd-Party Agent   │             │   eBPF Kernel LSM   │
             │ (Claude Code, PTY)  │             │ (Ring 0 Fast Path)  │
             └──────────┬──────────┘             └──────────▲──────────┘
                        │ Syscall Request                   │
                        └───────────────────────────────────┘
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    │                                           │
             [In AllowList?]                             [Not in List]
                    │                                           │
                    ▼ (50ns)                                    ▼
         ┌─────────────────────┐                     ┌─────────────────────┐
         │ Kernel Executes     │                     │ Security AI Scorer  │
         │ Transparently       │                     │ (0 - 100 Risk)      │
         └─────────────────────┘                     └──────────┬──────────┘
                                                                │
                    ┌───────────────────────────┬───────────────┴───────────────┐
                    ▼                           ▼                               ▼
          Weight < 10 (Tier 1)      Weight 10 - 40 (Tier 2)           Weight > 40 (Tier 3)
         ┌─────────────────────┐   ┌─────────────────────────┐     ┌─────────────────────────┐
         │  Fast-Path Resume   │   │  SIGSTOP Process Freeze │     │  Ring-0 -EACCES Deny    │
         │  (< 5ms SIGCONT)    │   │  Desktop Modal Prompt   │     │  1ms OverlayFS Rollback │
         └─────────────────────┘   │  [Allow Once / Deny]    │     │  Inject Stderr Steering │
                                   └─────────────────────────┘     └─────────────────────────┘
```

---

## 🎨 Ring-0 Deterministic 3-Color Taint Tracking

| Taint Color | Bitmask | Trigger Condition | Ring-0 Kernel Rule |
| :--- | :---: | :--- | :--- |
| **RED (Privacy)** | `0x1` | PID reads private files (`~/Pictures`, `~/.ssh`, `.env`, `party.jpg`) | Barred from non-loopback outbound network sockets (`lsm/socket_connect`). |
| **AMBER (Untrusted)** | `0x2` | Agent reads external web pages, GitHub issues, package metadata | Privilege ceiling lowered to neutralize indirect prompt injection. |
| **PURPLE (Integrity)** | `0x4` | Scorer scripts (`verify_tests.py`), `/var/log`, DIAMOND overseer files | Write (`FMODE_WRITE`) or `unlink` triggers immediate Ring-0 `-EACCES` (Weight 100). |

---

## 🔬 Four End-to-End Scenarios

* **Scenario A — The HTML Photo Privacy Leak:** Agent reads `party.jpg` (`TAINT_RED=1`). Agent runs Python/curl attempting `POST api.imgur.com`. eBPF LSM blocks socket at 0 bytes sent (Weight 85). Injects stderr feedback: *"External upload of private file forbidden; use local relative path."* Agent self-corrects.
* **Scenario B — Sibling Folder Shortcut:** Blocked from internet, agent attempts to copy `party.jpg` to `../shared_assets/`. Crosses Landlock/workspace boundary without egress. Frozen via `SIGSTOP` (Weight 28). Triggers Desktop Interceptor Modal: *"Agent wants to copy party.jpg outside project folder. [Allow] / [Deny]"*.
* **Scenario C — Benchmark Scorer Reward Hack:** Agent attempts to rewrite or unlink `verify_tests.py` to force 100% pass. Hits `TAINT_PURPLE` inode protection. Instant Ring-0 `-EACCES` (Weight 100). OverlayFS wipes shadow modifications in 1ms.
* **Scenario D — Unforeseen Swarm Covert Channel:** 300 empty directories created like Morse code letters in shared utility closet. Single `mkdir` has Weight 1, but eBPF Cross-PID Inode Tracker + 2-Second Sliding Window flags high-entropy inter-agent steganography (Drift Weight 94). Entire process group (`PGID`) frozen immediately.

---

## 📁 Repository Structure

```
DIAMOND/
├── agentsight/
│   ├── kernel-ebpf/              # [Ring 0] eBPF LSM C code & maps
│   │   ├── taint_maps.h          # Shared ABI, 3-color taint bitmasks, RingBuf layout
│   │   ├── aegis_lsm.bpf.c       # LSM hooks (file_open, socket_connect, inode_mkdir)
│   │   ├── build.rs              # libbpf-cargo CO-RE SkeletonBuilder
│   │   └── Cargo.toml
│   │
│   ├── overseer-daemon/          # [Ring 3] Core Rust Security Supervisor & Bridge
│   │   ├── src/main.rs           # Daemon entry point & async task supervisor
│   │   ├── src/kernel_bridge.rs  # Loads BPF skeleton, resolves inodes, polls RingBuffer
│   │   ├── src/process_freezer.rs# SIGSTOP/SIGCONT/SIGKILL & PTY stderr steering
│   │   ├── src/sandbox_overlay.rs# Ephemeral OverlayFS mount & 1ms RAM rollback
│   │   ├── src/agentsight_bridge.rs # Ingests AgentSight telemetry (/tmp/aegis_telemetry.sock)
│   │   ├── src/ipc_server.rs     # WebSocket server for Desktop UI & Interceptor Modal
│   │   └── Cargo.toml
│   │
│   ├── backend/                  # Node.js + Express + Socket.IO Control Plane
│   │   ├── src/index.ts          # Server entry point (Port 3001)
│   │   ├── src/routes/agent.ts   # Agent lifecycle & tool evaluation endpoints
│   │   ├── src/routes/demo.ts    # Pre-scripted scenarios (A, B, C, D) demo runner
│   │   ├── src/routes/policy.ts  # Pre-Flight Policy AI AllowList endpoints
│   │   ├── src/routes/audit.ts   # Real-time immutable audit log
│   │   ├── src/services/policyAI.ts   # Pre-Flight LLM / heuristic AllowList generator
│   │   ├── src/services/securityAI.ts # 0-100 Risk Scorer (Ollama + heuristics)
│   │   ├── src/services/ebpfMock.ts   # Fast-path kernel filter emulator
│   │   └── src/socket/events.ts  # WebSocket push gateway (alert:new, agent:state)
│   │
│   └── frontend/                 # Next.js 14 + Tailwind CSS Control Center
│       ├── app/layout.tsx
│       ├── app/globals.css
│       ├── app/components/RiskGauge.tsx   # Semicircular SVG live risk meter
│       ├── app/components/StatusBar.tsx   # Real-time containment telemetry
│       └── lib/socket.ts                  # Socket.IO client interface
```

---

## 🚀 Quickstart & Running DIAMOND

### 1. Run the Backend Control Plane
```bash
cd agentsight/backend
npm install
npm run dev
# Starts backend and Socket.IO on http://localhost:3001
```

### 2. Run the Frontend Dashboard
```bash
cd agentsight/frontend
npm install
npm run dev
# Dashboard opens on http://localhost:3000
```

### 3. Run Ring-0 eBPF & Rust Daemon (Linux Kernel 5.7+ with CONFIG_BPF_LSM=y)
```bash
# Dump kernel BTF types
bpftool btf dump file /sys/kernel/btf/vmlinux format c > agentsight/kernel-ebpf/vmlinux.h

# Build and start the overseer daemon
cd agentsight/overseer-daemon
cargo build --release
sudo ./target/release/diamond-overseer --workspace /path/to/agent/workspace
```

---

## 📜 License
Licensed under GPL-2.0 or BSD-3-Clause to maintain compatibility with Linux kernel eBPF subsystem.  
**Special thanks to the eunomia-bpf team for the AgentSight framework.**
