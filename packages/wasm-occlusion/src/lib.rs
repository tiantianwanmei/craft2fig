#[no_mangle]
pub extern "C" fn alloc(size: usize) -> *mut u8 {
    let mut buf: Vec<u8> = Vec::with_capacity(size);
    let ptr = buf.as_mut_ptr();
    std::mem::forget(buf);
    ptr
}

#[no_mangle]
pub unsafe extern "C" fn alpha_composite_inplace(ptr_target_rgba: *mut u8, ptr_occluder_rgba: *const u8, len: usize) {
    if ptr_target_rgba.is_null() || ptr_occluder_rgba.is_null() {
        return;
    }

    let target_rgba = std::slice::from_raw_parts_mut(ptr_target_rgba, len);
    let occluder_rgba = std::slice::from_raw_parts(ptr_occluder_rgba, len);

    let mut i: usize = 3;
    while i < len {
        let ta = target_rgba[i] as u16;
        let oa = occluder_rgba[i] as u16;
        target_rgba[i] = ((ta * (255 - oa)) / 255) as u8;
        i += 4;
    }
}
