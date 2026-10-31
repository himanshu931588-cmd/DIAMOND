// kernel-ebpf/src/lib.rs — Re-export the generated BPF skeleton
//
// The actual skeleton code is generated at build time by build.rs
// via libbpf-cargo's SkeletonBuilder. The include!() macro pulls it
// into this crate so overseer-daemon can reference it.

#[allow(non_upper_case_globals)]
#[allow(non_camel_case_types)]
#[allow(non_snake_case)]
#[allow(dead_code)]
#[allow(clippy::all)]
pub mod aegis_lsm {
    include!(concat!(env!("OUT_DIR"), "/aegis_lsm.skel.rs"));
}

