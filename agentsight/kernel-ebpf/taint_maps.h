/*
 * taint_maps.h — Shared ABI between Ring-0 eBPF C and Ring-3 Rust userspace
 *
 * DIAMOND: Kernel-Level AI Agent Intent & Drift Overseer
 * Built upon and extending eunomia-bpf/agentsight
 * Copyright (c) 2026 DIAMOND Contributors (Credits: eunomia-bpf/agentsight)
 *
 * This header defines the taint bitmask constants, map key/value structs,
 * and RingBuffer event layout used by both the eBPF LSM programs and the
 * Rust overseer daemon via libbpf-rs CO-RE skeleton generation.
 */

#ifndef __TAINT_MAPS_H
#define __TAINT_MAPS_H

/* ═══════════════════════════════════════════════════════════════════════════
 * 3-Color Taint Bitmask System
 *
 * Each tracked PID carries a u8 bitmask. Multiple taints can be OR'd together.
 * A PID carrying TAINT_RED | TAINT_AMBER (0x3) has touched both confidential
 * data and untrusted external input — maximum containment applies.
 * ═══════════════════════════════════════════════════════════════════════════ */

/* TAINT_RED — Confidentiality / Privacy
 * Set when a process reads files in ~/Pictures, ~/.ssh, .env, credentials,
 * or any path outside the approved workspace boundary.
 * A RED-tainted PID is forbidden from any non-loopback network egress. */
#define TAINT_RED       0x01

/* TAINT_AMBER — Untrusted External Input
 * Set when a process ingests data from external web endpoints, GitHub,
 * or any non-local source. Lowers the privilege ceiling: AMBER processes
 * cannot write to PURPLE-protected inodes. */
#define TAINT_AMBER     0x02

/* TAINT_PURPLE — Scorer & System Integrity
 * Protects critical files: unit tests (verify_tests.py), /var/log,
 * Aegis Ring's own configuration and scoring files.
 * Any write/unlink to a PURPLE inode from a tracked PID returns -EACCES
 * at Ring-0 with zero userspace round-trip. */
#define TAINT_PURPLE    0x04

/* Combined taint check macros */
#define HAS_RED(mask)    ((mask) & TAINT_RED)
#define HAS_AMBER(mask)  ((mask) & TAINT_AMBER)
#define HAS_PURPLE(mask) ((mask) & TAINT_PURPLE)

/* ═══════════════════════════════════════════════════════════════════════════
 * Map Key/Value Structures — exact binary layout shared with Rust via bindgen
 * ═══════════════════════════════════════════════════════════════════════════ */

/* inode_policy_map: maps filesystem inode → taint classification */
struct inode_policy_key {
    __u64 inode;
};

struct inode_policy_val {
    __u8  rule_flag;    /* TAINT_RED, TAINT_AMBER, or TAINT_PURPLE */
    __u8  _pad[7];      /* alignment to 8 bytes for efficient BPF map ops */
};

/* cross_pid_inode_map: tracks directory creations across PIDs for swarm detection */
struct cross_pid_key {
    __u64 inode;        /* inode of the created directory/file */
};

struct cross_pid_val {
    __u32 creator_pid;  /* PID that created this inode */
    __u32 creator_pgid; /* process group of creator — detects multi-agent collusion */
    __u64 create_ts;    /* bpf_ktime_get_ns() timestamp */
    __u8  taint_at_create; /* taint mask of creator at time of mkdir */
    __u8  _pad[7];
};

/* ═══════════════════════════════════════════════════════════════════════════
 * RingBuffer Event — streamed from Ring-0 to Ring-3 in real time
 *
 * Every policy decision, taint transition, and enforcement action generates
 * one of these events on rb_events. The Rust daemon consumes them via
 * ring_buf.poll() and correlates with AgentSight SSL telemetry by PID.
 * ═══════════════════════════════════════════════════════════════════════════ */

/* Event type enum — determines how the Rust daemon interprets the event */
enum aegis_event_type {
    AEGIS_EVENT_TAINT_TRANSITION  = 1,  /* PID gained a new taint bit */
    AEGIS_EVENT_ACCESS_DENIED     = 2,  /* -EACCES returned at Ring-0 */
    AEGIS_EVENT_PROCESS_FROZEN    = 3,  /* SIGSTOP sent, awaiting verdict */
    AEGIS_EVENT_FORK_PROPAGATION  = 4,  /* taint inherited by child PID */
    AEGIS_EVENT_NETWORK_BLOCKED   = 5,  /* RED PID attempted external connect */
    AEGIS_EVENT_SWARM_DETECTED    = 6,  /* cross-PID inode collusion pattern */
    AEGIS_EVENT_UNLINK_BLOCKED    = 7,  /* deletion of PURPLE inode blocked */
    AEGIS_EVENT_WORKSPACE_ESCAPE  = 8,  /* O_CREAT outside approved workspace */
    AEGIS_EVENT_INFO              = 255, /* informational / debug */
};

/* Risk weight thresholds — mirrored from architecture spec */
#define WEIGHT_GREEN_MAX    9     /* Tier 1: auto-allow, < 5ms SIGCONT */
#define WEIGHT_YELLOW_MIN   10    /* Tier 2: freeze + prompt user */
#define WEIGHT_YELLOW_MAX   40
#define WEIGHT_RED_MIN      41    /* Tier 3: hard block + rollback + steer */

/* The main event struct pushed to rb_events ringbuf */
struct aegis_event {
    /* Process identification */
    __u32 pid;           /* triggering process PID */
    __u32 ppid;          /* parent PID */
    __u32 pgid;          /* process group ID */
    __u32 uid;           /* user ID */

    /* Filesystem context */
    __u64 inode;         /* relevant inode number (file or directory) */
    __u64 parent_inode;  /* parent directory inode (for path reconstruction) */

    /* Taint state */
    __u8  taint_mask;    /* current taint bitmask AFTER this event */
    __u8  old_taint;     /* taint bitmask BEFORE this event (for transitions) */
    __u8  inode_policy;  /* policy flag from inode_policy_map (if applicable) */
    __u8  _pad1;

    /* Network context (populated only for socket_connect events) */
    __u32 dest_ip;       /* destination IPv4 address in network byte order */
    __u16 dest_port;     /* destination port in host byte order */
    __u16 addr_family;   /* AF_INET (2) or AF_INET6 (10) */

    /* Event metadata */
    __u32 event_type;    /* enum aegis_event_type */
    __s32 action_taken;  /* 0 = allowed, -EACCES(-13) = denied, 19 = SIGSTOP */
    __u32 risk_weight;   /* computed risk weight for this event */
    __u32 _pad2;

    /* Process command name */
    char  comm[16];      /* TASK_COMM_LEN = 16 */

    /* Timestamp */
    __u64 timestamp_ns;  /* bpf_ktime_get_ns() */
};

/* RingBuffer sizing — 256KB, power of 2, fits ~2000 events in flight */
#define AEGIS_RINGBUF_SIZE  (256 * 1024)

/* Maximum entries for hash maps */
#define MAX_TRACKED_PIDS    4096
#define MAX_POLICY_INODES   8192
#define MAX_CROSS_PID_ENTRIES 2048

/* Workspace boundary detection — inode of the approved workspace root.
 * Populated at load time by the Rust daemon via bpf_map_update_elem. */
#define WORKSPACE_ROOT_INODE_KEY  0xFFFFFFFFFFFFFFFFULL

/* Signal constants for eBPF bpf_send_signal() helper */
#define SIG_STOP  19   /* SIGSTOP — freeze the thread */
#define SIG_CONT  18   /* SIGCONT — resume (sent from userspace) */
#define SIG_KILL  9    /* SIGKILL — terminate (sent from userspace) */

#endif /* __TAINT_MAPS_H */

