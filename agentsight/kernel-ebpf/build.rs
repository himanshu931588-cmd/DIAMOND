// build.rs — libbpf-cargo SkeletonBuilder for aegis_lsm.bpf.c
//
// This build script compiles the eBPF C source against vmlinux.h using
// libbpf-cargo's SkeletonBuilder, producing a Rust skeleton module that
// provides type-safe map access and program attachment.
//
// Prerequisites:
//   - clang/llvm installed (for BPF target compilation)
//   - vmlinux.h generated via: bpftool btf dump file /sys/kernel/btf/vmlinux format c > vmlinux.h
//   - Kernel 5.7+ with CONFIG_BPF_LSM=y and BTF enabled

use std::env;
use std::path::PathBuf;

use libbpf_cargo::SkeletonBuilder;

const BPF_SOURCE: &str = "aegis_lsm.bpf.c";

fn main() {
    let out_dir = PathBuf::from(
        env::var_os("OUT_DIR").expect("OUT_DIR must be set by cargo"),
    );

    let skel_path = out_dir.join("aegis_lsm.skel.rs");

    // Tell cargo to re-run if the BPF source or headers change
    println!("cargo:rerun-if-changed={}", BPF_SOURCE);
    println!("cargo:rerun-if-changed=taint_maps.h");
    println!("cargo:rerun-if-changed=vmlinux.h");

    // Additional clang arguments for CO-RE BTF compilation:
    //   -D__TARGET_ARCH_x86  — target x86_64 (adjust for ARM64 if needed)
    //   -I.                  — include current dir for taint_maps.h
    //   -g                   — generate BTF debug info required by CO-RE
    //   -O2                  — optimization level required by BPF verifier
    let clang_args = format!(
        "-D__TARGET_ARCH_{arch} -I{src_dir} -g -O2 -Wall -Wno-unused-value -Wno-compare-distinct-pointer-types",
        arch = target_arch(),
        src_dir = env::current_dir()
            .expect("Failed to get current directory")
            .display()
    );

    SkeletonBuilder::new()
        .source(BPF_SOURCE)
        .clang_args(&clang_args)
        .build_and_generate(&skel_path)
        .expect(
            "Failed to build and generate BPF skeleton.\n\
             Ensure:\n\
             1. clang/llvm is installed: apt install clang llvm\n\
             2. vmlinux.h exists in kernel-ebpf/: bpftool btf dump file /sys/kernel/btf/vmlinux format c > vmlinux.h\n\
             3. libbpf headers are available: apt install libbpf-dev\n\
             4. Kernel has BTF enabled: ls /sys/kernel/btf/vmlinux"
        );

    println!("cargo:warning=eBPF skeleton generated at {:?}", skel_path);
}

/// Determine the target architecture for BPF compilation.
/// Maps Rust target triples to Linux kernel arch names.
fn target_arch() -> &'static str {
    let arch = env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_default();
    match arch.as_str() {
        "x86_64" | "x86" => "x86",
        "aarch64" => "arm64",
        "arm" => "arm",
        "riscv64" => "riscv",
        "s390x" => "s390",
        "powerpc64" => "powerpc",
        "mips" | "mips64" => "mips",
        "loongarch64" => "loongarch",
        _ => "x86", // default fallback
    }
}

