// SPDX-License-Identifier: GPL-2.0 OR BSD-3-Clause
/*
 * aegis_lsm.bpf.c — Ring-0 eBPF LSM Circuit Breaker for Aegis Ring
 *
 * Implements active kernel-level enforcement hooks:
 *   - tp_btf/sched_process_fork  — taint propagation to child processes
 *   - lsm/file_open              — taint transition + write/read policy
 *   - lsm/inode_unlink           — protect PURPLE integrity inodes
 *   - lsm/inode_mkdir            — cross-PID swarm collusion detection
 *   - lsm/socket_connect         — RED taint network egress blocking
 *
 * Compile: clang -O2 -target bpf -D__TARGET_ARCH_x86 -c aegis_lsm.bpf.c -o aegis_lsm.bpf.o
 * Load:    libbpf-rs skeleton (see build.rs / kernel_bridge.rs)
 *
 * Requires: Linux 5.7+, CONFIG_BPF_LSM=y, BTF enabled
 */

#include "vmlinux.h"
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>
#include <bpf/bpf_core_read.h>
#include "taint_maps.h"

/* Character device for licensing */
char LICENSE[] SEC("license") = "GPL";

/* ═══════════════════════════════════════════════════════════════════════════
 * BPF Map Definitions
 * ═══════════════════════════════════════════════════════════════════════════ */

/* Per-PID taint bitmask tracking */
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, MAX_TRACKED_PIDS);
    __type(key, __u32);    /* pid */
    __type(value, __u8);   /* taint bitmask */
} taint_pid_map SEC(".maps");

/* Filesystem inode → policy classification */
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, MAX_POLICY_INODES);
    __type(key, __u64);    /* inode number (i_ino) */
    __type(value, __u8);   /* TAINT_RED / TAINT_AMBER / TAINT_PURPLE */
} inode_policy_map SEC(".maps");

/* Cross-PID inode creation tracking (swarm collusion detection) */
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, MAX_CROSS_PID_ENTRIES);
    __type(key, __u64);                /* inode of created dir/file */
    __type(value, struct cross_pid_val);
} cross_pid_inode_map SEC(".maps");

/* RingBuffer for streaming events to userspace daemon */
struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, AEGIS_RINGBUF_SIZE);
} rb_events SEC(".maps");

/* Workspace root inode — set by userspace at load time.
 * Key 0 stores the inode number of the approved workspace root directory. */
struct {
    __uint(type, BPF_MAP_TYPE_ARRAY);
    __uint(max_entries, 1);
    __type(key, __u32);
    __type(value, __u64);
} workspace_root_map SEC(".maps");

/* ═══════════════════════════════════════════════════════════════════════════
 * Helper: Look up the current PID's taint mask
 * ═══════════════════════════════════════════════════════════════════════════ */
static __always_inline __u8 get_pid_taint(__u32 pid)
{
    __u8 *val = bpf_map_lookup_elem(&taint_pid_map, &pid);
    return val ? *val : 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Helper: Look up inode policy from inode_policy_map
 * ═══════════════════════════════════════════════════════════════════════════ */
static __always_inline __u8 get_inode_policy(__u64 ino)
{
    __u8 *val = bpf_map_lookup_elem(&inode_policy_map, &ino);
    return val ? *val : 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Helper: Check if PID is being tracked (exists in taint_pid_map)
 * ═══════════════════════════════════════════════════════════════════════════ */
static __always_inline bool is_tracked_pid(__u32 pid)
{
    return bpf_map_lookup_elem(&taint_pid_map, &pid) != NULL;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Helper: Get workspace root inode from the config array map
 * ═══════════════════════════════════════════════════════════════════════════ */
static __always_inline __u64 get_workspace_root_inode(void)
{
    __u32 key = 0;
    __u64 *val = bpf_map_lookup_elem(&workspace_root_map, &key);
    return val ? *val : 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Helper: Emit a structured event to the RingBuffer
 * ═══════════════════════════════════════════════════════════════════════════ */
static __always_inline int emit_event(
    __u32 event_type,
    __u32 pid,
    __u32 ppid,
    __u32 pgid,
    __u64 inode,
    __u64 parent_inode,
    __u8  taint_mask,
    __u8  old_taint,
    __u8  inode_policy,
    __u32 dest_ip,
    __u16 dest_port,
    __u16 addr_family,
    __s32 action_taken,
    __u32 risk_weight)
{
    struct aegis_event *evt;

    evt = bpf_ringbuf_reserve(&rb_events, sizeof(*evt), 0);
    if (!evt)
        return -1;

    evt->pid           = pid;
    evt->ppid          = ppid;
    evt->pgid          = pgid;
    evt->uid           = (__u32)bpf_get_current_uid_gid();
    evt->inode         = inode;
    evt->parent_inode  = parent_inode;
    evt->taint_mask    = taint_mask;
    evt->old_taint     = old_taint;
    evt->inode_policy  = inode_policy;
    evt->_pad1         = 0;
    evt->dest_ip       = dest_ip;
    evt->dest_port     = dest_port;
    evt->addr_family   = addr_family;
    evt->event_type    = event_type;
    evt->action_taken  = action_taken;
    evt->risk_weight   = risk_weight;
    evt->_pad2         = 0;
    evt->timestamp_ns  = bpf_ktime_get_ns();
    bpf_get_current_comm(&evt->comm, sizeof(evt->comm));

    bpf_ringbuf_submit(evt, 0);
    return 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * Helper: Get current task's ppid and pgid using BPF_CORE_READ
 * ═══════════════════════════════════════════════════════════════════════════ */
static __always_inline __u32 get_ppid(struct task_struct *task)
{
    struct task_struct *parent;
    parent = BPF_CORE_READ(task, real_parent);
    return BPF_CORE_READ(parent, tgid);
}

static __always_inline __u32 get_pgid(struct task_struct *task)
{
    struct signal_struct *sig;
    struct pid *pid_struct;

    sig = BPF_CORE_READ(task, signal);
    if (!sig)
        return 0;

    pid_struct = BPF_CORE_READ(sig, pids[PIDTYPE_PGID]);
    if (!pid_struct)
        return 0;

    /* For simplicity, use the task's tgid as an approximation of pgid.
     * Full pgid resolution requires pid_vnr() which isn't available in BPF. */
    return BPF_CORE_READ(task, tgid);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * HOOK 1: sched_process_fork — Taint Propagation
 *
 * When a tracked PID forks (bash, python3, curl, etc.), the child
 * automatically inherits the parent's full taint bitmask. This prevents
 * taint washing via subprocess spawning.
 * ═══════════════════════════════════════════════════════════════════════════ */
SEC("tp_btf/sched_process_fork")
int BPF_PROG(handle_fork, struct task_struct *parent, struct task_struct *child)
{
    __u32 parent_pid = BPF_CORE_READ(parent, tgid);
    __u32 child_pid  = BPF_CORE_READ(child, tgid);
    __u32 ppid       = get_ppid(parent);
    __u32 pgid;

    /* Only propagate if parent is a tracked PID */
    if (!is_tracked_pid(parent_pid))
        return 0;

    __u8 parent_taint = get_pid_taint(parent_pid);

    /* Inherit full taint bitmask — no taint washing via fork() */
    bpf_map_update_elem(&taint_pid_map, &child_pid, &parent_taint, BPF_ANY);

    pgid = get_pgid(parent);

    emit_event(
        AEGIS_EVENT_FORK_PROPAGATION,
        child_pid,
        parent_pid,
        pgid,
        0,               /* no inode */
        0,               /* no parent inode */
        parent_taint,    /* child inherits this mask */
        0,               /* old taint (child had none) */
        0,               /* no inode policy */
        0, 0, 0,         /* no network context */
        0,               /* action: allowed (fork itself isn't blocked) */
        0                /* weight: informational */
    );

    return 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * HOOK 2: lsm/file_open — File Access Policy Enforcement
 *
 * Three enforcement paths:
 *
 * A) PURPLE inode + WRITE/APPEND → Ring-0 hard deny (-EACCES), weight 100
 *    Protects scoring files, unit tests, Aegis config from tampering.
 *
 * B) RED inode + READ → taint transition, OR TAINT_RED into PID's mask
 *    Process touched confidential data; network egress now restricted.
 *
 * C) O_CREAT outside workspace → SIGSTOP + Yellow Zone event (weight 28)
 *    Agent attempting to create files outside its sandbox boundary.
 * ═══════════════════════════════════════════════════════════════════════════ */
SEC("lsm/file_open")
int BPF_PROG(handle_file_open, struct file *file)
{
    __u32 pid = (__u32)bpf_get_current_pid_tgid();
    struct task_struct *task;
    struct inode *inode_ptr;
    __u64 ino;
    __u8  policy;
    __u8  taint;
    __u8  old_taint;
    unsigned int f_mode;
    unsigned int f_flags;
    __u32 ppid_val, pgid_val;

    /* Fast path: skip if this PID isn't tracked */
    if (!is_tracked_pid(pid))
        return 0;

    /* Read file metadata using CO-RE */
    inode_ptr = BPF_CORE_READ(file, f_inode);
    if (!inode_ptr)
        return 0;

    ino     = BPF_CORE_READ(inode_ptr, i_ino);
    f_mode  = BPF_CORE_READ(file, f_mode);
    f_flags = BPF_CORE_READ(file, f_flags);
    policy  = get_inode_policy(ino);
    taint   = get_pid_taint(pid);
    old_taint = taint;

    task = (struct task_struct *)bpf_get_current_task();
    ppid_val = get_ppid(task);
    pgid_val = get_pgid(task);

    /* ─── Path A: PURPLE inode protection (write/unlink) ─── */
    if (HAS_PURPLE(policy)) {
        /* Check for write mode: FMODE_WRITE (bit 1) or O_WRONLY/O_RDWR flags */
        if ((f_mode & 0x2) || (f_flags & (0x1 | 0x2))) {
            /* Critical: integrity violation attempt — hard deny at Ring-0 */
            emit_event(
                AEGIS_EVENT_ACCESS_DENIED,
                pid, ppid_val, pgid_val,
                ino, 0,
                taint, old_taint, policy,
                0, 0, 0,
                -13,    /* -EACCES */
                100     /* Maximum risk weight */
            );
            return -13; /* -EACCES — blocked in kernel, never reaches userspace */
        }
    }

    /* ─── Path B: RED inode read → taint transition ─── */
    if (HAS_RED(policy) && !(f_mode & 0x2)) {
        /* Process is reading a confidential file — elevate its taint */
        __u8 new_taint = taint | TAINT_RED;
        bpf_map_update_elem(&taint_pid_map, &pid, &new_taint, BPF_ANY);

        emit_event(
            AEGIS_EVENT_TAINT_TRANSITION,
            pid, ppid_val, pgid_val,
            ino, 0,
            new_taint, old_taint, policy,
            0, 0, 0,
            0,       /* allowed — read isn't blocked, just tainted */
            5        /* low risk weight for read-only taint */
        );

        /* Read is allowed, but PID is now RED-tainted */
        return 0;
    }

    /* ─── Path C: Workspace boundary escape detection ─── */
    if (f_flags & 0x40) {  /* O_CREAT = 0x40 */
        __u64 ws_root = get_workspace_root_inode();

        if (ws_root > 0) {
            /* Get the parent directory inode */
            struct dentry *dentry = BPF_CORE_READ(file, f_path.dentry);
            struct dentry *parent_dentry = BPF_CORE_READ(dentry, d_parent);
            struct inode *parent_inode = NULL;

            if (parent_dentry) {
                parent_inode = BPF_CORE_READ(parent_dentry, d_inode);
            }

            __u64 parent_ino = 0;
            if (parent_inode) {
                parent_ino = BPF_CORE_READ(parent_inode, i_ino);
            }

            /* Simple heuristic: if the parent directory inode doesn't
             * match the workspace root and doesn't have a policy entry
             * (meaning it's not a known-good location), flag it.
             *
             * The userspace daemon does full path resolution; this is
             * the fast-path 50ns kernel check. */
            if (parent_ino != ws_root && parent_ino > 0) {
                __u8 parent_policy = get_inode_policy(parent_ino);
                if (parent_policy == 0) {
                    /* Creating a file in an unknown directory — Yellow Zone */
                    bpf_send_signal(SIG_STOP);

                    emit_event(
                        AEGIS_EVENT_WORKSPACE_ESCAPE,
                        pid, ppid_val, pgid_val,
                        ino, parent_ino,
                        taint, old_taint, 0,
                        0, 0, 0,
                        SIG_STOP,    /* action: SIGSTOP */
                        28           /* Yellow Zone weight */
                    );

                    /* Don't return -EACCES here; the process is frozen
                     * via SIGSTOP and awaits userspace verdict. The file
                     * open is allowed to proceed only after SIGCONT. */
                }
            }
        }
    }

    return 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * HOOK 3: lsm/inode_unlink — Prevent Deletion of PURPLE Integrity Files
 *
 * Hard deny at Ring-0 with -EACCES if a tracked PID tries to delete
 * a PURPLE-protected inode (unit tests, scoring files, logs, Aegis config).
 * ═══════════════════════════════════════════════════════════════════════════ */
SEC("lsm/inode_unlink")
int BPF_PROG(handle_inode_unlink, struct inode *dir, struct dentry *dentry)
{
    __u32 pid = (__u32)bpf_get_current_pid_tgid();
    struct task_struct *task;
    struct inode *target_inode;
    __u64 ino;
    __u64 dir_ino;
    __u8  policy;
    __u8  taint;
    __u32 ppid_val, pgid_val;

    if (!is_tracked_pid(pid))
        return 0;

    target_inode = BPF_CORE_READ(dentry, d_inode);
    if (!target_inode)
        return 0;

    ino     = BPF_CORE_READ(target_inode, i_ino);
    dir_ino = BPF_CORE_READ(dir, i_ino);
    policy  = get_inode_policy(ino);
    taint   = get_pid_taint(pid);

    task = (struct task_struct *)bpf_get_current_task();
    ppid_val = get_ppid(task);
    pgid_val = get_pgid(task);

    /* PURPLE inode deletion → immediate Ring-0 deny */
    if (HAS_PURPLE(policy)) {
        emit_event(
            AEGIS_EVENT_UNLINK_BLOCKED,
            pid, ppid_val, pgid_val,
            ino, dir_ino,
            taint, taint, policy,
            0, 0, 0,
            -13,     /* -EACCES */
            100      /* maximum risk weight */
        );
        return -13;  /* -EACCES */
    }

    /* RED inode deletion by any tracked PID → also block (data destruction
     * of confidential files is as dangerous as exfiltration) */
    if (HAS_RED(policy)) {
        emit_event(
            AEGIS_EVENT_ACCESS_DENIED,
            pid, ppid_val, pgid_val,
            ino, dir_ino,
            taint, taint, policy,
            0, 0, 0,
            -13,
            85       /* high risk weight */
        );
        return -13;
    }

    return 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * HOOK 4: lsm/inode_mkdir — Cross-PID Swarm Collusion Detection
 *
 * When a tracked PID creates a directory, record the PID/PGID/timestamp
 * in cross_pid_inode_map. The userspace daemon runs entropy analysis
 * across these entries to detect coordinated multi-agent covert channels
 * (Scenario D: Swarm Collusion).
 * ═══════════════════════════════════════════════════════════════════════════ */
SEC("lsm/inode_mkdir")
int BPF_PROG(handle_inode_mkdir, struct inode *dir, struct dentry *dentry,
             umode_t mode)
{
    __u32 pid = (__u32)bpf_get_current_pid_tgid();
    struct task_struct *task;
    struct inode *new_inode;
    __u64 dir_ino;
    __u8  taint;
    __u32 ppid_val, pgid_val;

    if (!is_tracked_pid(pid))
        return 0;

    taint = get_pid_taint(pid);
    dir_ino = BPF_CORE_READ(dir, i_ino);

    task = (struct task_struct *)bpf_get_current_task();
    ppid_val = get_ppid(task);
    pgid_val = get_pgid(task);

    /* Record this directory creation for cross-PID analysis */
    struct cross_pid_val entry = {
        .creator_pid      = pid,
        .creator_pgid     = pgid_val,
        .create_ts        = bpf_ktime_get_ns(),
        .taint_at_create  = taint,
    };

    bpf_map_update_elem(&cross_pid_inode_map, &dir_ino, &entry, BPF_ANY);

    /* Check if another tracked PID recently created something in the
     * same parent directory — potential inter-agent signaling. */
    __u8 *parent_val = bpf_map_lookup_elem(&inode_policy_map, &dir_ino);

    /* Emit informational event for userspace entropy analysis */
    emit_event(
        AEGIS_EVENT_SWARM_DETECTED,
        pid, ppid_val, pgid_val,
        dir_ino, 0,
        taint, taint, parent_val ? *parent_val : 0,
        0, 0, 0,
        0,       /* allowed — mkdir itself isn't blocked */
        15       /* moderate weight, userspace decides final verdict */
    );

    return 0;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * HOOK 5: lsm/socket_connect — RED Taint Network Egress Blocking
 *
 * If a PID carrying TAINT_RED (has read confidential/private data)
 * attempts an outbound TCP/UDP connection to any non-loopback address,
 * the connection is blocked at Ring-0 with -EACCES before any bytes
 * are transmitted. The thread is also frozen via SIGSTOP.
 *
 * This is the core anti-exfiltration defense.
 * ═══════════════════════════════════════════════════════════════════════════ */
SEC("lsm/socket_connect")
int BPF_PROG(handle_socket_connect, struct socket *sock,
             struct sockaddr *address, int addrlen)
{
    __u32 pid = (__u32)bpf_get_current_pid_tgid();
    struct task_struct *task;
    __u8  taint;
    __u16 family;
    __u32 dest_ip = 0;
    __u16 dest_port = 0;
    __u32 ppid_val, pgid_val;

    if (!is_tracked_pid(pid))
        return 0;

    taint = get_pid_taint(pid);

    /* Only enforce on RED-tainted PIDs */
    if (!HAS_RED(taint))
        return 0;

    /* Read address family */
    family = BPF_CORE_READ(address, sa_family);

    /* ─── IPv4 check ─── */
    if (family == 2) { /* AF_INET */
        struct sockaddr_in *addr4 = (struct sockaddr_in *)address;

        dest_ip   = BPF_CORE_READ(addr4, sin_addr.s_addr);
        dest_port = __builtin_bswap16(BPF_CORE_READ(addr4, sin_port));

        /* Allow loopback (127.0.0.0/8) — internal daemon communication */
        __u8 first_octet = dest_ip & 0xFF;
        if (first_octet == 127)
            return 0;

        /* Non-loopback destination with RED taint → BLOCK + FREEZE */
        task = (struct task_struct *)bpf_get_current_task();
        ppid_val = get_ppid(task);
        pgid_val = get_pgid(task);

        /* Freeze the thread before any data leaves */
        bpf_send_signal(SIG_STOP);

        emit_event(
            AEGIS_EVENT_NETWORK_BLOCKED,
            pid, ppid_val, pgid_val,
            0, 0,
            taint, taint, 0,
            dest_ip, dest_port, family,
            -13,     /* -EACCES */
            85       /* Red Zone weight */
        );

        return -13;  /* Connection denied at Ring-0 */
    }

    /* ─── IPv6 check ─── */
    if (family == 10) { /* AF_INET6 */
        struct sockaddr_in6 *addr6 = (struct sockaddr_in6 *)address;

        dest_port = __builtin_bswap16(BPF_CORE_READ(addr6, sin6_port));

        /* Read first 4 bytes of IPv6 address to check for loopback (::1) */
        __u8 ipv6_bytes[16];
        bpf_probe_read_kernel(&ipv6_bytes, sizeof(ipv6_bytes),
                              &addr6->sin6_addr.in6_u.u6_addr8);

        /* Check for ::1 (loopback) */
        bool is_loopback = true;
        int i;
        #pragma unroll
        for (i = 0; i < 15; i++) {
            if (ipv6_bytes[i] != 0) {
                is_loopback = false;
                break;
            }
        }
        if (ipv6_bytes[15] != 1)
            is_loopback = false;

        if (is_loopback)
            return 0;

        /* Non-loopback IPv6 with RED taint → BLOCK */
        task = (struct task_struct *)bpf_get_current_task();
        ppid_val = get_ppid(task);
        pgid_val = get_pgid(task);

        bpf_send_signal(SIG_STOP);

        /* Store first 4 bytes of IPv6 as dest_ip for the event */
        __u32 ipv6_prefix;
        __builtin_memcpy(&ipv6_prefix, ipv6_bytes, 4);

        emit_event(
            AEGIS_EVENT_NETWORK_BLOCKED,
            pid, ppid_val, pgid_val,
            0, 0,
            taint, taint, 0,
            ipv6_prefix, dest_port, family,
            -13,
            85
        );

        return -13;
    }

    return 0;
}

