import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App'

import React from 'react'

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
