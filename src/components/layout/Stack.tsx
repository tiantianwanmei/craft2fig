/**
 * Stack - 布局组件
 * 用于控制子元素的间距和排列方向
 * 实现"内容与布局分离"的设计原则
 */

import { memo, CSSProperties, ReactNode } from 'react';

type SpacingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
type Direction = 'row' | 'column';
type Align = 'start' | 'center' | 'end' | 'stretch';
type Justify = 'start' | 'center' | 'end' | 'between' | 'around';

interface StackProps {
  children: ReactNode;
  spacing?: SpacingSize;
  direction?: Direction;
  align?: Align;
  justify?: Justify;
  wrap?: boolean;
  className?: string;
  style?: CSSProperties;
}

const spacingMap: Record<SpacingSize, string> = {
  xs: 'var(--p-space-1)',
  sm: 'var(--p-space-2)',
  md: 'var(--p-space-3)',
  lg: 'var(--p-space-4)',
  xl: 'var(--p-space-6)',
  '2xl': 'var(--p-space-8)',
};

const alignMap: Record<Align, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

const justifyMap: Record<Justify, string> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
};

export const Stack = memo(function Stack({
  children,
  spacing = 'md',
  direction = 'column',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  className = '',
  style = {},
}: StackProps) {
  const stackStyle: CSSProperties = {
    display: 'flex',
    flexDirection: direction,
    alignItems: alignMap[align],
    justifyContent: justifyMap[justify],
    gap: spacingMap[spacing],
    flexWrap: wrap ? 'wrap' : 'nowrap',
    ...style,
  };

  return (
    <div className={className} style={stackStyle}>
      {children}
    </div>
  );
});
