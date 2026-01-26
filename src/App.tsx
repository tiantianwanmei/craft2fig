/**
 * 🚀 App - 主应用组件
 * 使用 monorepo token system 确保设计一致性
 */

import { useEffect, useState } from 'react';
import { ControlPanel, ViewportArea } from './components';
import { CyclesRenderPreview } from './components/canvas/CyclesRenderPreview';
import { usePluginMessage } from './hooks';
import { useAppStore } from './store';
import { TokenInjector } from '@genki/shared-ui';
import { SEMANTIC_TOKENS, BASE_TOKENS } from '@genki/shared-theme';

// 核心布局样式 - 使用覆盖布局实现毛玻璃效果
const styles = {
  appContainer: {
    position: 'relative' as const,
    height: '100vh',
    width: '100%',
    overflow: 'hidden',
    background: '#0f0f12', // 纯色暗黑背景，去掉渐变
  },
  viewport: {
    position: 'absolute' as const,
    inset: 0,
  },
  controlPanel: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    background: 'rgba(24, 24, 28, 0.88)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
    boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.4)',
    overflow: 'visible',
    zIndex: 20,
    transition: `width ${SEMANTIC_TOKENS.motion.duration.normal} ${SEMANTIC_TOKENS.motion.easing.smooth}`,
  },
  panelToggle: {
    position: 'absolute' as const,
    left: '-12px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '12px',
    height: '48px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: 'none',
    borderRadius: '4px 0 0 4px',
    color: 'rgba(255, 255, 255, 0.25)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    zIndex: 100,
    boxShadow: 'none',
    transition: 'all 0.15s ease',
    opacity: 0.6,
  },
  notificationContainer: {
    position: 'fixed' as const,
    bottom: SEMANTIC_TOKENS.spacing.layout.lg,
    left: SEMANTIC_TOKENS.spacing.layout.lg,
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: SEMANTIC_TOKENS.spacing.gap.sm,
  },
};

export default function App() {
  const { sendMessage } = usePluginMessage();
  const notifications = useAppStore((s) => s.notifications);
  const removeNotification = useAppStore((s) => s.removeNotification);
  const sidebarWidth = useAppStore((s) => s.sidebarWidth);
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [uiMounted, setUiMounted] = useState(false);

  // 🚀 性能优化：合并初始化请求，减少重渲染次数
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setUiMounted(true);
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  // UI 启动握手：一旦 React 挂载完成，通知插件侧（用于 showUI 自愈重试）
  useEffect(() => {
    if (!uiMounted) return;
    sendMessage({ type: 'UI_MOUNTED' });
  }, [sendMessage, uiMounted]);

  // 等首帧稳定后再请求初始化数据，避免打开/切换时偶发白屏
  useEffect(() => {
    if (!uiMounted) return;
    sendMessage({ type: 'INIT_APP' });
  }, [sendMessage, uiMounted]);

  return (
    <>
      {/* 注入 Design Tokens 为 CSS 变量 */}
      <TokenInjector />

      {/* 主布局：Viewport 全屏 + Control Panel 覆盖在右侧 */}
      <div style={styles.appContainer}>
        {/* Viewport - 全屏显示 */}
        <div style={styles.viewport}>
          {uiMounted ? (
            <ViewportArea />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(161, 161, 170, 0.95)',
              fontSize: '12px',
            }}>
              Loading…
            </div>
          )}
        </div>

        {/* Control Panel - 覆盖在右侧 (毛玻璃效果) */}
        <div data-control-panel="true" style={{
          ...styles.controlPanel,
          width: panelCollapsed ? '0px' : `${sidebarWidth}px`,
        }}>
          {/* 折叠按钮 - 精致隐形设计 */}
          <button
            type="button"
            style={styles.panelToggle}
            onClick={() => setPanelCollapsed(!panelCollapsed)}
            title={panelCollapsed ? '展开面板' : '收起面板'}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.6';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.25)';
            }}
          >
            <svg
              width="6"
              height="10"
              viewBox="0 0 6 10"
              fill="none"
              style={{
                transform: panelCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease',
              }}
            >
              <path
                d="M1 1L5 5L1 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {!panelCollapsed && uiMounted && <ControlPanel />}
        </div>
      </div>

      {/* Cycles 渲染预览 - 全屏 overlay */}
      <CyclesRenderPreview />

      {/* 通知 Toast */}
      {notifications.length > 0 && (
        <div style={styles.notificationContainer}>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderRadius: '8px',
                background: notification.variant === 'success'
                  ? 'rgba(34, 197, 94, 0.15)'
                  : notification.variant === 'error'
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'rgba(245, 158, 11, 0.15)',
                border: `1px solid ${
                  notification.variant === 'success'
                    ? 'rgba(34, 197, 94, 0.4)'
                    : notification.variant === 'error'
                    ? 'rgba(239, 68, 68, 0.4)'
                    : 'rgba(245, 158, 11, 0.4)'
                }`,
                backdropFilter: 'blur(10px)',
              }}
            >
              <span style={{ fontSize: '12px', color: '#e4e4e7' }}>{notification.message}</span>
              <button
                type="button"
                onClick={() => removeNotification(notification.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.5)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
