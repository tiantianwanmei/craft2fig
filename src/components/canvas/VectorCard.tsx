/**
 * 🚀 VectorCard - 优化的矢量卡片组件
 * 使用 React.memo 避免不必要的重渲染
 * 使用 monorepo COMPONENT_TOKENS (引用 SEMANTIC_TOKENS)
 */

import { memo, useMemo, useRef, useCallback, CSSProperties } from 'react';
import { COMPONENT_TOKENS } from '@genki/shared-theme';

interface VectorCardProps {
  layer: any;
  isHovered: boolean;
  isOrdered: boolean;
  isReplacing: boolean;  // 是否正在被替换（橙色状态）
  orderNum?: number;
  nextNum: number;
  swapNum?: number;  // 交换模式下被摄取的编号
  isSwapMode: boolean;  // 是否处于交换模式
  isClipMask: boolean;
  isHPanel: boolean;
  displayName: string;
  // 已缩放的位置和尺寸
  scaledPosition: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  onVectorClick: (id: string) => void;
  onVectorDoubleClick: (id: string) => void;
  onMouseEnter: (id: string) => void;
  onMouseLeave: () => void;
}

// 使用 component 级别的 vectorCard tokens - 引用 semantic tokens
const VC = COMPONENT_TOKENS.vectorCard;

export const VectorCard = memo(function VectorCard({
  layer,
  isHovered,
  isOrdered,
  isReplacing,
  orderNum,
  nextNum,
  swapNum,
  isSwapMode,
  isClipMask,
  isHPanel,
  displayName,
  scaledPosition,
  onVectorClick,
  onVectorDoubleClick,
  onMouseEnter,
  onMouseLeave,
}: VectorCardProps) {
  // 防抖：区分单击和双击，避免双击时触发单击
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const DOUBLE_CLICK_DELAY = 200; // ms

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // 延迟执行单击，如果在延迟期间发生双击则取消
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }
    clickTimerRef.current = setTimeout(() => {
      onVectorClick(layer.id);
      clickTimerRef.current = null;
    }, DOUBLE_CLICK_DELAY);
  }, [layer.id, onVectorClick]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // 取消单击的延迟执行
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    onVectorDoubleClick(layer.id);
  }, [layer.id, onVectorDoubleClick]);

  // 缓存SVG预览URL
  const svgDataUrl = useMemo(() => {
    if (!layer.svgPreview) return null;
    try {
      return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(layer.svgPreview)))}`;
    } catch {
      return null;
    }
  }, [layer.svgPreview]);

  // 卡片样式 - 使用已缩放的位置，内部样式保持固定像素（无动画）
  const cardStyle = useMemo((): CSSProperties => {
    const base: CSSProperties = {
      position: 'absolute',
      boxSizing: 'border-box',
      left: scaledPosition.left,
      top: scaledPosition.top,
      width: scaledPosition.width,
      height: scaledPosition.height,
      border: `1px solid ${VC.border.default}`,
      borderRadius: '4px',
      background: VC.bg.default,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      pointerEvents: 'auto', // 确保可以接收鼠标事件
    };

    if (isHPanel) {
      base.border = `2px solid ${VC.border.hPanel}`;
      base.boxShadow = VC.shadow.hPanel;
      base.background = VC.bg.hPanel;
      base.zIndex = 30;
    } else if (isReplacing) {
      // 替换模式：橙色高亮
      base.border = '2px solid #ff9900';
      base.boxShadow = '0 0 12px rgba(255, 153, 0, 0.5)';
      base.background = 'rgba(255, 153, 0, 0.1)';
      base.zIndex = 25;
    } else if (isOrdered) {
      base.border = `1px solid ${VC.border.selected}`;
      base.boxShadow = VC.shadow.selected;
      base.background = VC.bg.selected;
      base.zIndex = 20;
    } else if (isHovered) {
      base.border = `1px solid ${VC.border.hover}`;
      base.background = VC.bg.hover;
      base.zIndex = 10;
    }

    return base;
  }, [scaledPosition, isHovered, isOrdered, isReplacing, isHPanel]);

  // SVG 预览透明度
  const svgOpacity = isOrdered ? 0.6 : isHovered ? 0.5 : 0.3;

  return (
    <div
      style={cardStyle}
      data-vector-card
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={(e) => {
        e.stopPropagation();
        onMouseEnter(layer.id);
      }}
      onMouseLeave={(e) => {
        e.stopPropagation();
        onMouseLeave();
      }}
      role="button"
      tabIndex={0}
      title="单击选择 | 双击设为H面(根节点)"
    >
      {/* SVG 预览背景 */}
      {svgDataUrl && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url('${svgDataUrl}')`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: svgOpacity,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}

      {/* H 面徽章 */}
      {isHPanel && (
        <div
          style={{
            position: 'absolute',
            top: '2px',
            left: '2px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: VC.border.hPanel,
            color: VC.text.hPanel,
            fontSize: '9px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3,
          }}
        >
          H
        </div>
      )}

      {/* 序号徽章 - 已选中时显示（替换模式为橙色）- 无动画 */}
      {isOrdered && (
        <div
          style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: isReplacing ? '18px' : '16px',
            height: isReplacing ? '18px' : '16px',
            borderRadius: '50%',
            background: isReplacing ? '#ff9900' : 'transparent',
            border: isReplacing ? 'none' : `1px solid ${VC.badge.border}`,
            color: isReplacing ? '#fff' : VC.badge.text,
            fontSize: isReplacing ? '9px' : '8px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 1,
            zIndex: 3,
          }}
        >
          {orderNum}
        </div>
      )}

      {/* 幽灵序号 - 未选中面片 hover 时显示空心虚线编号（无动画） */}
      {!isOrdered && (
        <div
          style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            background: 'transparent',
            border: `1px dashed ${VC.badge.ghostBorder}`,
            color: VC.badge.ghostText,
            fontSize: '8px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isHovered ? 1 : 0,
            zIndex: 3,
          }}
        >
          {isSwapMode ? swapNum : nextNum}
        </div>
      )}

      {/* 名称标签 */}
      <span
        style={{
          fontSize: '9px',
          fontWeight: 400,
          color: isOrdered ? VC.text.selected : VC.text.default,
          textAlign: 'center',
          padding: '2px 4px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%',
          zIndex: 2,
        }}
      >
        {displayName}
      </span>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.layer.id === nextProps.layer.id &&
    prevProps.isHovered === nextProps.isHovered &&
    prevProps.isOrdered === nextProps.isOrdered &&
    prevProps.isReplacing === nextProps.isReplacing &&
    prevProps.orderNum === nextProps.orderNum &&
    prevProps.nextNum === nextProps.nextNum &&
    prevProps.swapNum === nextProps.swapNum &&
    prevProps.isSwapMode === nextProps.isSwapMode &&
    prevProps.isClipMask === nextProps.isClipMask &&
    prevProps.isHPanel === nextProps.isHPanel &&
    prevProps.displayName === nextProps.displayName &&
    prevProps.scaledPosition.left === nextProps.scaledPosition.left &&
    prevProps.scaledPosition.top === nextProps.scaledPosition.top &&
    prevProps.scaledPosition.width === nextProps.scaledPosition.width &&
    prevProps.scaledPosition.height === nextProps.scaledPosition.height
  );
});
