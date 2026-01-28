# 🛠️ Fix Report

## ✅ 1. Fixed Critical Crash (Invalid URL)
**Issue:** The app was crashing with `TypeError: Failed to construct 'URL': Invalid URL`.
**Cause:** `src/workers/occlusionComputeClient.ts` was trying to create a `new URL()` using `window.location.href` as a base. In Figma plugins (and some iframe environments), `window.location.href` is often `about:blank` or `data:...`, which causes `new URL` to throw an error synchronously.
**Fix:** Removed the unsafe `new URL` construction and replaced it with a direct relative path string. This prevents the crash and allows the app to load.

## ✅ 2. Restored Missing Asset
**Issue:** `wasm_occlusion.wasm` was missing from the `public/wasm/` directory, which would cause the occlusion feature to fail (even if the crash was fixed).
**Fix:** Located the compiled WASM file in `packages/wasm-occlusion/target/...` and copied it to `public/wasm/wasm_occlusion.wasm`.

---

## 🚀 How to Solve "WebGPU Enable Error"

If you still see WebGPU errors after this fix, it is likely due to browser/environment support. WebGPU is **experimental** in many contexts.

### For Figma Desktop App
Figma blocks WebGPU by default. You **must** launch it with flags:

**Windows:**
1.  Right-click Figma Desktop shortcut → **Properties**.
2.  Add to **Target**: ` --enable-unsafe-webgpu --enable-features=WebGPU`
    *   *Example:* `"C:\Users\...\Figma.exe" --enable-unsafe-webgpu --enable-features=WebGPU`
3.  Click OK and restart Figma.

**macOS:**
Run this in Terminal:
```bash
open /Applications/Figma.app --args --enable-unsafe-webgpu --enable-features=WebGPU
```

### For Chrome/Edge Browser
1.  Ensure version **113+**.
2.  Go to `chrome://flags/#enable-unsafe-webgpu` (if needed) and enable it, though modern versions enable it by default on supported hardware.
3.  Check `chrome://gpu` to verify WebGPU is "Hardware accelerated".
