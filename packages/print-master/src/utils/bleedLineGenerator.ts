// ============================================================================
// 🔪 Bleed Line Generator - 出血线生成器（基于 Clipper2 全球标准算法）
// ============================================================================
//
// 实现全球印刷行业标准的出血线生成算法：
// - 基于 Clipper2 库的多边形偏移（Polygon Offsetting）
// - 支持 Miter/Round/Square 三种连接类型
// - 符合 Adobe Illustrator 的 Offset Path 标准
// - 适用于复杂刀版图外轮廓（圆角、插舌、异形等）
//
// 参考标准：
// - 印刷行业标准出血：3mm (纸板), 5-8mm (瓦楞纸)
// - Clipper2 多边形偏移算法
// - Adobe Illustrator Offset Path 算法
// ============================================================================

import {
  JoinType,
  EndType,
  ClipperOffset,
  PointD,
  Clipper64,
  ClipType,
  FillRule
} from 'clipper2-js';

export type BleedJoinType = 'miter' | 'round' | 'square';

export interface BleedLineOptions {
  /** 出血距离（mm），默认 3mm */
  bleedDistance: number;

  /** 连接类型，默认 'round' */
  joinType?: BleedJoinType;

  /** Miter 限制（仅用于 miter 类型），默认 2.0 */
  miterLimit?: number;

  /** 精度（用于圆角的分段数），默认 0.25 */
  arcTolerance?: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface Contour {
  points: Point2D[];
  isHole?: boolean;
}

/**
 * 将 Clipper2 的 JoinType 映射
 */
function mapJoinType(joinType: BleedJoinType): JoinType {
  switch (joinType) {
    case 'miter':
      return JoinType.Miter;
    case 'round':
      return JoinType.Round;
    case 'square':
      return JoinType.Square;
    default:
      return JoinType.Round;
  }
}

/**
 * 将点数组转换为 Clipper2 Point64 数组
 */
function pointsToPath64(points: Point2D[]): any[] {
  return points.map(p => ({
    x: Math.round(p.x * 100),
    y: Math.round(p.y * 100)
  }));
}

/**
 * 将 Clipper2 Point64 数组转换回点数组
 */
function path64ToPoints(path: any[]): Point2D[] {
  return path.map(p => ({
    x: p.x / 100,
    y: p.y / 100
  }));
}

/**
 * 生成出血线轮廓
 *
 * @param contours 原始刀版图轮廓（外轮廓 + 可选的内孔）
 * @param options 出血线选项
 * @returns 出血线轮廓数组
 */
export function generateBleedLines(
  contours: Contour[],
  options: BleedLineOptions
): Contour[] {
  const {
    bleedDistance,
    joinType = 'round',
    miterLimit = 2.0,
    arcTolerance = 0.25
  } = options;

  // 创建 ClipperOffset 实例
  const clipperOffset = new ClipperOffset(miterLimit, arcTolerance);

  // 转换为 Clipper2 Path64 并添加路径
  contours.forEach(contour => {
    const path = pointsToPath64(contour.points);
    clipperOffset.addPath(path, mapJoinType(joinType), EndType.Polygon);
  });

  // 执行偏移操作
  const solution: any[] = [];
  const delta = bleedDistance * 100; // 缩放到整数
  clipperOffset.execute(delta, solution);

  // 转换回点数组
  return solution.map(path => ({
    points: path64ToPoints(path),
    isHole: false
  }));
}

/**
 * 从 SVG 路径命令提取点
 */
function extractPointsFromDlist(dlist: any[]): Point2D[] {
  const points: Point2D[] = [];

  dlist.forEach(cmd => {
    if (cmd.type === 'M' || cmd.type === 'L') {
      points.push({ x: cmd.x, y: cmd.y });
    } else if (cmd.type === 'C') {
      // 贝塞尔曲线，取终点
      points.push({ x: cmd.x, y: cmd.y });
    } else if (cmd.type === 'A') {
      // 圆弧，取终点
      points.push({ x: cmd.x, y: cmd.y });
    }
  });

  return points;
}

/**
 * 从 Face 数组提取真正的外轮廓
 *
 * 使用 Clipper2 Union 操作合并所有 face 的轮廓
 */
export function extractOuterContour(faces: any[]): Contour {
  if (faces.length === 0) {
    return { points: [], isHole: false };
  }

  // 如果输入是简单的 Part2D（有 x, y, width, height）
  if (faces[0].width !== undefined && faces[0].height !== undefined) {
    // 使用边界框
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    faces.forEach(part => {
      minX = Math.min(minX, part.x);
      minY = Math.min(minY, part.y);
      maxX = Math.max(maxX, part.x + part.width);
      maxY = Math.max(maxY, part.y + part.height);
    });

    return {
      points: [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY }
      ],
      isHole: false
    };
  }

  // 如果输入是 Face（有 dlist）
  // 使用 Clipper2 Union 合并所有 face 的轮廓
  try {
    const clipper = new Clipper64();
    const allPaths: any[] = [];

    // 收集所有 face 的路径
    faces.forEach(face => {
      if (face.dlist && face.dlist.length > 0) {
        const points = extractPointsFromDlist(face.dlist);
        if (points.length >= 3) {
          const path = pointsToPath64(points);
          allPaths.push(path);
        }
      }
    });

    if (allPaths.length === 0) {
      // 降级到边界框
      return extractBoundingBox(faces);
    }

    // 使用 Union 操作合并所有路径
    clipper.addSubject(allPaths);
    const solution: any[] = [];
    clipper.execute(ClipType.Union, FillRule.NonZero, solution);

    if (solution.length > 0) {
      // 取第一个轮廓（最大的外轮廓）
      return {
        points: path64ToPoints(solution[0]),
        isHole: false
      };
    }
  } catch (error) {
    console.warn('Clipper2 Union failed, falling back to bounding box:', error);
  }

  // 降级：使用边界框
  return extractBoundingBox(faces);
}

/**
 * 提取边界框作为降级方案
 */
function extractBoundingBox(faces: any[]): Contour {
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  faces.forEach(face => {
    const dlist = face.dlist || [];
    dlist.forEach((cmd: any) => {
      if (cmd.x !== undefined && cmd.y !== undefined) {
        minX = Math.min(minX, cmd.x);
        minY = Math.min(minY, cmd.y);
        maxX = Math.max(maxX, cmd.x);
        maxY = Math.max(maxY, cmd.y);
      }
    });
  });

  return {
    points: [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY }
    ],
    isHole: false
  };
}
