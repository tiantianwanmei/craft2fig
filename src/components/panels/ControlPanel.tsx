/**
 * 🎛️ ControlPanel - 控制面板组件
 * 使用 Linear 级别的流动 Tab 动画
 * 支持 Cycles 渲染模式切换
 */

import { memo } from 'react';
import { ExportTab } from './ExportTab';
import { FoldTab } from './FoldTab';
import { CraftTab } from './CraftTab';
import { CyclesControlPanel } from './CyclesControlPanel';
import { LinearTabs } from '../ui/LinearTabs';
import { useAppStore } from '../../store';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    minHeight: 0,
    overflow: 'hidden',
    marginLeft: SEMANTIC_TOKENS.spacing.panel.marginLeft, // 10px - 侧边栏左侧间距
    marginRight: SEMANTIC_TOKENS.spacing.panel.marginRight, // 10px - 侧边栏右侧间距
  },
  content: {
    flex: 1,
    minHeight: 0,
    overflowY: 'scroll' as const, // 强制显示滚动条，避免布局抖动
    padding: `${SEMANTIC_TOKENS.spacing.panel.paddingY} ${SEMANTIC_TOKENS.spacing.panel.paddingX}`,
  },
  footer: {
    padding: `${SEMANTIC_TOKENS.spacing.component.md} ${SEMANTIC_TOKENS.spacing.component.lg}`,
    borderTop: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.weak}`,
    background: 'transparent',
    color: SEMANTIC_TOKENS.color.text.secondary,
    fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
    textAlign: 'center' as const,
    flexShrink: 0,
  },
};

export const ControlPanel = memo(function ControlPanel() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const clipmaskVectors = useAppStore((s) => s.clipmaskVectors);
  const markedLayers = useAppStore((s) => s.markedLayers);
  const cyclesPreviewOpen = useAppStore((s) => s.cyclesPreviewOpen);

  // Cycles 渲染模式下显示专属控制面板
  if (cyclesPreviewOpen) {
    return <CyclesControlPanel />;
  }

  return (
    <div style={styles.root}>
      {/* Tab 栏 - Linear 级别的流动 Tab 动画 */}
      <LinearTabs
        tabs={[
          { id: 'export', label: 'Export' },
          { id: 'fold', label: 'Fold' },
          { id: 'craft', label: 'Craft' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* 内容区 */}
      <div style={styles.content}>
        {activeTab === 'export' && <ExportTab />}
        {activeTab === 'fold' && <FoldTab />}
        {activeTab === 'craft' && <CraftTab />}
      </div>

      {/* Footer - 状态信息 */}
      <div style={styles.footer}>
        <span style={{ color: '#10b981', marginRight: '6px' }}>●</span>
        Ready 刀版图: {clipmaskVectors.length} | 工艺标注: {markedLayers.length}
      </div>
    </div>
  );
});
