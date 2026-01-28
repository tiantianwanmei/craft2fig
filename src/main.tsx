import { createRoot } from 'react-dom/client'
/**
 * 🚀 WebGPU Global Polyfills
 * three/webgpu often accesses these constants at module level.
 * In restricted environments (like Figma iframe without WebGPU), they may be missing and cause crashes upon import.
 */
if (typeof window !== 'undefined') {
  if (!('GPUShaderStage' in window)) (window as any).GPUShaderStage = { VERTEX: 0x0001, FRAGMENT: 0x0002, COMPUTE: 0x0004 };
  if (!('GPUBufferUsage' in window)) (window as any).GPUBufferUsage = { MAP_READ: 0x0001, MAP_WRITE: 0x0002, COPY_SRC: 0x0004, COPY_DST: 0x0008, INDEX: 0x0010, VERTEX: 0x0020, UNIFORM: 0x0040, STORAGE: 0x0080, INDIRECT: 0x0100, QUERY_RESOLVE: 0x0200 };
  if (!('GPUColorWrite' in window)) (window as any).GPUColorWrite = { RED: 0x1, GREEN: 0x2, BLUE: 0x4, ALPHA: 0x8, ALL: 0xF };
  if (!('GPUTextureUsage' in window)) (window as any).GPUTextureUsage = { COPY_SRC: 0x01, COPY_DST: 0x02, TEXTURE_BINDING: 0x04, STORAGE_BINDING: 0x08, RENDER_ATTACHMENT: 0x10 };
  if (!('GPUMapMode' in window)) (window as any).GPUMapMode = { READ: 1, WRITE: 2 };
}

import './styles/globals.css'
import App from './App'

import React from 'react'
import * as THREE from 'three'

function getUrlBasename(url: string | undefined | null): string {
  if (!url) return ''
  try {
    // Figma iframe location.origin can be "null" string
    const origin = (window.location.origin === 'null' || !window.location.origin) ? 'http://localhost' : window.location.origin

    // If url is already absolute (contains ://), origin is ignored by URL constructor
    const u = new URL(url, origin)
    const pathname = u.pathname || ''
    const idx = pathname.lastIndexOf('/')
    return idx >= 0 ? pathname.slice(idx + 1) : pathname
  } catch (e) {
    // If it's a base64 or blob URL, the constructor might throw if not handled correctly in this env
    const q = url.indexOf('?')
    const cleaned = q >= 0 ? url.slice(0, q) : url
    const idx = cleaned.lastIndexOf('/')
    return idx >= 0 ? cleaned.slice(idx + 1) : cleaned
  }
}

function normalizeCubemapUrls(urls: unknown): string[] | null {
  if (Array.isArray(urls)) return urls.map((u) => String(u))
  if (typeof urls === 'string') return [urls]
  return null
}

const DEFAULT_DREI_CUBEMAP_FILE_SET = new Set([
  '/px.png',
  '/nx.png',
  '/py.png',
  '/ny.png',
  '/pz.png',
  '/nz.png',
])

const DEFAULT_DREI_CUBEMAP_BASENAME_SET = new Set([
  'px.png',
  'nx.png',
  'py.png',
  'ny.png',
  'pz.png',
  'nz.png',
])

function isDefaultDreiCubemapFaceUrl(url: string): boolean {
  if (DEFAULT_DREI_CUBEMAP_FILE_SET.has(url)) return true
  const base = getUrlBasename(url)
  return DEFAULT_DREI_CUBEMAP_BASENAME_SET.has(base.replace(/^\//, ''))
}

function isDefaultDreiCubemapRequest(urls: unknown): boolean {
  const list = normalizeCubemapUrls(urls)
  if (!list || list.length !== 6) return false
  return list.every((u) => {
    if (DEFAULT_DREI_CUBEMAP_FILE_SET.has(u)) return true
    const base = getUrlBasename(u)
    return DEFAULT_DREI_CUBEMAP_BASENAME_SET.has(base.replace(/^\//, ''))
  })
}

let cubeTextureFallbackInstalled = false
let defaultDreiCubemapWarned = false
let imageLoaderFallbackInstalled = false
// 🚀 Global URL Protector
// In some environments (like Figma iframe), new URL() with relative paths can crash if origin is not set correctly.
// This override ensures it never throws and provides safe logging.
const __origURL = window.URL;
function SafeURL(url: string | URL, base?: string | URL): URL {
  try {
    const sUrl = String(url);
    const sBase = base ? String(base) : undefined;

    // If it's a relative path and base is a data URI or problematic, the URL constructor will throw.
    if (sBase && sBase.startsWith('data:') && !sUrl.includes('://')) {
      const dummyOrigin = (window.location.origin === 'null' || !window.location.origin) ? 'http://localhost' : window.location.origin;
      return new __origURL(sUrl, dummyOrigin);
    }
    return new __origURL(url, base);
  } catch (e) {
    if (String(url).length < 200) {
      console.warn('[Genki] Intercepted Invalid URL:', { url, base });
    }
    try {
      const dummyOrigin = (window.location.origin === 'null' || !window.location.origin) ? 'http://localhost' : window.location.origin;
      const safeBase = (base && String(base).startsWith('data:')) ? dummyOrigin : (base || dummyOrigin);
      return new __origURL(String(url), safeBase);
    } catch (e2) {
      const fallback = new __origURL('http://localhost/fallback');
      Object.defineProperties(fallback, {
        href: { value: String(url) },
        toString: { value: () => String(url) }
      });
      return fallback;
    }
  }
}
// 🛡️ Copy all static properties (createObjectURL, revokeObjectURL, etc)
Object.getOwnPropertyNames(__origURL).forEach(prop => {
  if (!(prop in SafeURL)) {
    try {
      (SafeURL as any)[prop] = (__origURL as any)[prop];
    } catch (e) { }
  }
});
SafeURL.prototype = __origURL.prototype;
(window as any).URL = SafeURL;

function installCubeTextureFallback(): void {
  if (cubeTextureFallbackInstalled) return
  cubeTextureFallbackInstalled = true

  const originalLoad = THREE.CubeTextureLoader.prototype.load
  THREE.CubeTextureLoader.prototype.load = function patchedLoad(
    urls: unknown,
    onLoad?: (texture: THREE.CubeTexture) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: unknown) => void
  ): THREE.CubeTexture {
    if (isDefaultDreiCubemapRequest(urls)) {
      if (!defaultDreiCubemapWarned) {
        defaultDreiCubemapWarned = true
        console.warn(
          '[Genki] Intercepted drei default cubemap load (/px.png..). This is invalid in Figma iframe.',
          'urls=',
          normalizeCubemapUrls(urls),
          'Stack:',
          new Error().stack
        )
      }
      const canvas = document.createElement('canvas')
      canvas.width = 1
      canvas.height = 1
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = '#000'
        ctx.fillRect(0, 0, 1, 1)
      }

      const cubeTexture = new THREE.CubeTexture([canvas, canvas, canvas, canvas, canvas, canvas])
      cubeTexture.needsUpdate = true
      Promise.resolve().then(() => onLoad?.(cubeTexture))
      return cubeTexture
    }

    return originalLoad.call(this, urls as never, onLoad as never, onProgress as never, onError as never) as THREE.CubeTexture
  }

  if (!imageLoaderFallbackInstalled) {
    imageLoaderFallbackInstalled = true
    const originalImageLoad = THREE.ImageLoader.prototype.load
    THREE.ImageLoader.prototype.load = function patchedImageLoad(
      url: string,
      onLoad?: (image: HTMLImageElement) => void,
      onProgress?: (event: ProgressEvent) => void,
      onError?: (event: unknown) => void
    ): HTMLImageElement {
      if (isDefaultDreiCubemapFaceUrl(url)) {
        if (!defaultDreiCubemapWarned) {
          defaultDreiCubemapWarned = true
          console.warn(
            '[Genki] Intercepted drei default cubemap face load (px/nx/..png).',
            'url=',
            url,
            'Stack:',
            new Error().stack
          )
        }

        const canvas = document.createElement('canvas')
        canvas.width = 1
        canvas.height = 1
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.fillStyle = '#000'
          ctx.fillRect(0, 0, 1, 1)
        }

        const img = new Image()
        img.onload = () => onLoad?.(img)
        img.onerror = () => onError?.(new Error('Blocked default drei cubemap face load'))
        img.src = canvas.toDataURL('image/png')
        return img
      }

      return originalImageLoad.call(this, url, onLoad as never, onProgress as never, onError as never) as HTMLImageElement
    }
  }
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, errorMessage: '' }
  }

  static getDerivedStateFromError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return { hasError: true, errorMessage: message }
  }

  componentDidCatch(error: unknown) {
    console.error('UI crashed:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0b',
          color: 'rgba(255, 255, 255, 0.8)',
          fontSize: '12px',
          padding: '12px',
          boxSizing: 'border-box',
          textAlign: 'center',
        }}>
          UI error: {this.state.errorMessage}
        </div>
      )
    }

    return this.props.children
  }
}

// Reduce scroll-blocking listener violations by defaulting certain events to passive
// when third-party code registers listeners without options.
const __origAddEventListener = EventTarget.prototype.addEventListener
EventTarget.prototype.addEventListener = function (
  type: string,
  listener: EventListenerOrEventListenerObject | null,
  options?: boolean | AddEventListenerOptions
) {
  if ((type === 'wheel' || type === 'touchstart' || type === 'touchmove') && options === undefined) {
    return __origAddEventListener.call(this, type, listener, { passive: true })
  }
  return __origAddEventListener.call(this, type, listener, options as any)
}

// 🚀 性能优化：生产环境完全移除 StrictMode（避免双重渲染）
// 注意：开发时如需 StrictMode，请手动取消注释

// ✅ 修复 React 19 Error #299 + 等待 DOM 加载完成
function initializeApp() {
  installCubeTextureFallback()
  const rootElement = document.getElementById('root')

  if (!rootElement) {
    console.error('❌ Root element not found! Retrying...')
    // 如果 DOM 还没加载，延迟100ms重试
    setTimeout(initializeApp, 100)
    return
  }

  const existingRoot = (rootElement as any)._reactRootContainer

  if (existingRoot) {
    // 如果已经有 root，直接更新（这在插件重新加载时会发生）
    existingRoot.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    )
  } else {
    // 首次创建 root
    const root = createRoot(rootElement)
    root.render(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    )
      // 保存 root 引用，以便下次检测
      ; (rootElement as any)._reactRootContainer = root
  }
}

// 等待 DOM 加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp)
} else {
  // DOM 已经加载完成，直接初始化
  initializeApp()
}
