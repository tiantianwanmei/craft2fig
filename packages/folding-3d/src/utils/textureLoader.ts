/**
 * TextureLoader - 贴图加载工具
 * 从 clipmask SVG/PNG 预览加载贴图
 */

import * as THREE from 'three';

export interface TextureLoadResult {
  textures: Map<string, THREE.Texture>;
  errors: string[];
}

/**
 * 从 Base64 数据加载贴图
 */
export function loadTextureFromBase64(
  base64Data: string,
  mimeType: 'image/png' | 'image/svg+xml' = 'image/png'
): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const texture = new THREE.Texture(img);
      texture.needsUpdate = true;
      texture.colorSpace = THREE.SRGBColorSpace;
      resolve(texture);
    };
    img.onerror = reject;
    img.src = `data:${mimeType};base64,${base64Data}`;
  });
}

/**
 * 从 SVG 字符串加载贴图
 */
export function loadTextureFromSVG(
  svgString: string
): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const texture = new THREE.Texture(img);
      texture.needsUpdate = true;
      URL.revokeObjectURL(url);
      resolve(texture);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}
