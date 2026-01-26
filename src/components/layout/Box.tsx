/**
 * Box - 容器组件
 * 用于控制内边距、外边距等盒模型属性
 * 实现"内容与布局分离"的设计原则
 */

import { memo, CSSProperties, ReactNode } from 'react';

type SpacingSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface BoxProps {
  children: ReactNode;
  p?: SpacingSize;  // padding
  px?: SpacingSize; // padding-left & padding-right
  py?: SpacingSize; // padding-top & padding-bottom
  pt?: SpacingSize; // padding-top
  pr?: SpacingSize; // padding-right
  pb?: SpacingSize; // padding-bottom
  pl?: SpacingSize; // padding-left
  m?: SpacingSize;  // margin
  mx?: SpacingSize; // margin-left & margin-right
  my?: SpacingSize; // margin-top & margin-bottom
  mt?: SpacingSize; // margin-top
  mr?: SpacingSize; // margin-right
  mb?: SpacingSize; // margin-bottom
  ml?: SpacingSize; // margin-left
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

export const Box = memo(function Box({
  children,
  p, px, py, pt, pr, pb, pl,
  m, mx, my, mt, mr, mb, ml,
  className = '',
  style = {},
}: BoxProps) {
  const boxStyle: CSSProperties = {
    ...style,
  };

  // Padding
  if (p) {
    boxStyle.padding = spacingMap[p];
  } else {
    if (px) {
      boxStyle.paddingLeft = spacingMap[px];
      boxStyle.paddingRight = spacingMap[px];
    }
    if (py) {
      boxStyle.paddingTop = spacingMap[py];
      boxStyle.paddingBottom = spacingMap[py];
    }
    if (pt) boxStyle.paddingTop = spacingMap[pt];
    if (pr) boxStyle.paddingRight = spacingMap[pr];
    if (pb) boxStyle.paddingBottom = spacingMap[pb];
    if (pl) boxStyle.paddingLeft = spacingMap[pl];
  }

  // Margin
  if (m) {
    boxStyle.margin = spacingMap[m];
  } else {
    if (mx) {
      boxStyle.marginLeft = spacingMap[mx];
      boxStyle.marginRight = spacingMap[mx];
    }
    if (my) {
      boxStyle.marginTop = spacingMap[my];
      boxStyle.marginBottom = spacingMap[my];
    }
    if (mt) boxStyle.marginTop = spacingMap[mt];
    if (mr) boxStyle.marginRight = spacingMap[mr];
    if (mb) boxStyle.marginBottom = spacingMap[mb];
    if (ml) boxStyle.marginLeft = spacingMap[ml];
  }

  return (
    <div className={className} style={boxStyle}>
      {children}
    </div>
  );
});
