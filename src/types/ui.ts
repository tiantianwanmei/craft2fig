/**
 * 🎨 UI Types - UI 组件类型定义
 */

import type { ReactNode, CSSProperties } from 'react';
import type { CraftType, CraftParams } from './core';

// ========== 通用 UI 类型 ==========

/** 尺寸 */
export type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** 变体 */
export type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

/** 方向 */
export type Direction = 'horizontal' | 'vertical';

/** 对齐 */
export type Alignment = 'start' | 'center' | 'end' | 'stretch';

/** 位置 */
export type Position = 'top' | 'right' | 'bottom' | 'left';

// ========== 基础组件 Props ==========

/** 通用组件 Props */
export interface BaseComponentProps {
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly children?: ReactNode;
  readonly testId?: string;
}

/** 可交互组件 Props */
export interface InteractiveProps extends BaseComponentProps {
  readonly disabled?: boolean;
  readonly loading?: boolean;
}

// ========== 按钮类型 ==========

export interface ButtonProps extends InteractiveProps {
  readonly variant?: Variant;
  readonly size?: Size;
  readonly icon?: ReactNode;
  readonly iconPosition?: 'left' | 'right';
  readonly fullWidth?: boolean;
  readonly onClick?: () => void;
}

// ========== 输入框类型 ==========

export interface InputProps extends InteractiveProps {
  readonly type?: 'text' | 'number' | 'password' | 'email';
  readonly value: string | number;
  readonly placeholder?: string;
  readonly prefix?: ReactNode;
  readonly suffix?: ReactNode;
  readonly error?: string;
  readonly onChange: (value: string) => void;
  readonly onBlur?: () => void;
  readonly onFocus?: () => void;
}

// ========== 滑块类型 ==========

export interface SliderProps extends InteractiveProps {
  readonly value: number;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly label?: string;
  readonly showValue?: boolean;
  readonly onChange: (value: number) => void;
  readonly onChangeEnd?: (value: number) => void;
}

// ========== 开关类型 ==========

export interface ToggleProps extends InteractiveProps {
  readonly checked: boolean;
  readonly label?: string;
  readonly labelPosition?: 'left' | 'right';
  readonly onChange: (checked: boolean) => void;
}

// ========== 选择框类型 ==========

export interface SelectOption<T = string> {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
  readonly icon?: ReactNode;
}

export interface SelectProps<T = string> extends InteractiveProps {
  readonly value: T;
  readonly options: readonly SelectOption<T>[];
  readonly placeholder?: string;
  readonly onChange: (value: T) => void;
}

// ========== 标签页类型 ==========

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly icon?: ReactNode;
  readonly disabled?: boolean;
  readonly badge?: number | string;
}

export interface TabsProps extends BaseComponentProps {
  readonly items: readonly TabItem[];
  readonly activeId: string;
  readonly onChange: (id: string) => void;
  readonly variant?: 'line' | 'pill' | 'enclosed';
}

// ========== 面板类型 ==========

export interface PanelProps extends BaseComponentProps {
  readonly title?: string;
  readonly collapsible?: boolean;
  readonly collapsed?: boolean;
  readonly onToggle?: () => void;
  readonly headerActions?: ReactNode;
}

// ========== 工艺面板类型 ==========

export interface CraftPanelProps extends BaseComponentProps {
  readonly craftType: CraftType;
  readonly params: CraftParams;
  readonly onChange: (params: Partial<CraftParams>) => void;
  readonly onPreview?: () => void;
}

// ========== 缩略图类型 ==========

export interface ThumbnailItem {
  readonly id: string;
  readonly name: string;
  readonly imageUrl?: string;
  readonly craftType: CraftType;
  readonly selected?: boolean;
}

export interface ThumbnailListProps extends BaseComponentProps {
  readonly items: readonly ThumbnailItem[];
  readonly selectedId?: string;
  readonly onSelect: (id: string) => void;
  readonly onDelete?: (id: string) => void;
}

// ========== 画布类型 ==========

export interface CanvasProps extends BaseComponentProps {
  readonly width: number;
  readonly height: number;
  readonly zoom: number;
  readonly panX: number;
  readonly panY: number;
  readonly onZoomChange?: (zoom: number) => void;
  readonly onPanChange?: (x: number, y: number) => void;
}

// ========== 工具栏类型 ==========

export interface ToolbarItem {
  readonly id: string;
  readonly icon: ReactNode;
  readonly label: string;
  readonly shortcut?: string;
  readonly disabled?: boolean;
  readonly active?: boolean;
}

export interface ToolbarProps extends BaseComponentProps {
  readonly items: readonly ToolbarItem[];
  readonly onAction: (id: string) => void;
  readonly orientation?: Direction;
}

// ========== 状态栏类型 ==========

export interface StatusBarProps extends BaseComponentProps {
  readonly message?: string;
  readonly progress?: number;
  readonly variant?: 'info' | 'success' | 'warning' | 'error';
}

// ========== 对话框类型 ==========

export interface DialogProps extends BaseComponentProps {
  readonly open: boolean;
  readonly title: string;
  readonly description?: string;
  readonly onClose: () => void;
  readonly onConfirm?: () => void;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly variant?: 'default' | 'danger';
}

// ========== 提示类型 ==========

export interface ToastProps {
  readonly id: string;
  readonly message: string;
  readonly variant: 'info' | 'success' | 'warning' | 'error';
  readonly duration?: number;
  readonly onDismiss: (id: string) => void;
}
