// overseer-daemon/build.rs — Build script for the overseer daemon
//
// Compiles the eBPF C source from ../kernel-ebpf/ and generates the
// Rust skeleton directly into this crate's OUT_DIR.

use std::env;
use std::path::PathBuf;

use libbpf_cargo::SkeletonBuilder;

fn main() {
    let manifest_dir = PathBuf::from(
        env::var_os("CARGO_MANIFEST_DIR").expect("CARGO_MANIFEST_DIR not set"),
    );
    let kernel_ebpf_dir = manifest_dir.join("..").join("kernel-ebpf");
    let bpf_source = kernel_ebpf_dir.join("aegis_lsm.bpf.c");

    let out_dir = PathBuf::from(env::var_os("OUT_DIR").expect("OUT_DIR not set"));
    let skel_path = out_dir.join("aegis_lsm.skel.rs");

    println!("cargo:rerun-if-changed={}", bpf_source.display());
    println!(
        "cargo:rerun-if-changed={}",
        kernel_ebpf_dir.join("taint_maps.h").display()
    );

    let arch = match env::var("CARGO_CFG_TARGET_ARCH")
        .unwrap_or_default()
        .as_str()
    {
        "x86_64" | "x86" => "x86",
        "aarch64" => "arm64",
        _ => "x86",
    };

    let clang_args = format!(
        "-D__TARGET_ARCH_{} -I{} -g -O2 -Wall",
        arch,
        kernel_ebpf_dir.display()
    );

    SkeletonBuilder::new()
        .source(&bpf_source)
        .clang_args(&clang_args)
        .build_and_generate(&skel_path)
        .unwrap_or_else(|e| {
            // In development on non-Linux or without BTF, generate a stub
            eprintln!(
                "WARNING: eBPF skeleton build failed ({}). \
                 Generating stub for development.",
                e
            );
            std::fs::write(
                &skel_path,
                "// Stub: eBPF skeleton not available on this platform\n",
            )
            .expect("Failed to write stub skeleton");
        });
}

