/**
 * @genki/folding-3d 类型定义
 */

/** 面板数据 */
export interface PanelData {
  id: string;
  name: string;
  path?: string;
  svgPreview?: string;
  color?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 折叠数据 */
export interface FoldingData {
  params: {
    l: number;  // 长度
    w: number;  // 宽度
    h: number;  // 高度
    t: number;  // 厚度
  };
  panels: PanelData[];
  sequence?: string[];
  nameMap?: Record<string, string>;
  drivenMap?: Record<string, string[]>;
  rootPanelId?: string;
}

/** 3D状态 */
export interface Folding3DState {
  foldProgress: number;
  animationDuration: number;
  isAnimating: boolean;
  thickness: number;
  showWireframe: boolean;
  showLabels: boolean;
}

/** 相机状态 */
export interface CameraState {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

/** 环境状态 */
export interface EnvironmentState {
  preset: string;
  backgroundColor: string;
  intensity: number;
}
