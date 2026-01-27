import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'

import React from 'react'
import * as THREE from 'three'

function getUrlBasename(url: string): string {
  try {
    const u = new URL(url, window.location.origin)
    const pathname = u.pathname || ''
    const idx = pathname.lastIndexOf('/')
    return idx >= 0 ? pathname.slice(idx) : pathname
  } catch {
    const q = url.indexOf('?')
    const cleaned = q >= 0 ? url.slice(0, q) : url
    const idx = cleaned.lastIndexOf('/')
    return idx >= 0 ? cleaned.slice(idx) : cleaned
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
    ;(rootElement as any)._reactRootContainer = root
  }
}

// 等待 DOM 加载完成
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp)
} else {
  // DOM 已经加载完成，直接初始化
  initializeApp()
}
