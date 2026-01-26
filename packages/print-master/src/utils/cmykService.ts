// ============================================================================
// 🎨 CMYK Service - CMYK 转换服务
// ============================================================================

import { CMYKColor, RGBColor, ColorProfile, GamutWarning } from '../types';
import { rgbToCMYK, cmykToRGB } from './cmykConverter';

/**
 * CMYK 转换服务类
 */
export class CMYKService {
  private colorProfile: ColorProfile;
  private serverUrl: string | null;

  constructor(colorProfile: ColorProfile = 'sRGB', serverUrl: string | null = null) {
    this.colorProfile = colorProfile;
    this.serverUrl = serverUrl;
  }

  /**
   * 设置色彩配置文件
   */
  setColorProfile(profile: ColorProfile) {
    this.colorProfile = profile;
  }

  /**
   * 转换 RGB 到 CMYK
   * 如果配置了服务器，使用服务器端转换；否则使用客户端简化算法
   */
  async convertRGBtoCMYK(rgb: RGBColor): Promise<CMYKColor> {
    if (this.serverUrl) {
      return this.serverConvert(rgb);
    }
    return rgbToCMYK(rgb);
  }

  /**
   * 服务器端转换 (使用真实的 ICC 配置文件)
   */
  private async serverConvert(rgb: RGBColor): Promise<CMYKColor> {
    try {
      const response = await fetch(`${this.serverUrl}/api/cmyk/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rgb,
          profile: this.colorProfile,
        }),
      });

      if (!response.ok) {
        throw new Error('Server conversion failed');
      }

      const data = await response.json();
      return data.cmyk;
    } catch (error) {
      console.warn('Server conversion failed, falling back to client-side:', error);
      return rgbToCMYK(rgb);
    }
  }

  /**
   * 检查颜色是否在色域内
   */
  checkGamut(rgb: RGBColor): GamutWarning {
    const cmyk = rgbToCMYK(rgb);
    const backToRGB = cmykToRGB(cmyk);

    // 计算 Delta E (简化版本)
    const deltaE = this.calculateDeltaE(rgb, backToRGB);
    const isOutOfGamut = deltaE > 2.3; // Delta E > 2.3 表示可见差异

    return {
      color: rgb,
      deltaE,
      isOutOfGamut,
      suggestedCMYK: cmyk,
    };
  }

  /**
   * 计算 Delta E (CIE76 简化版本)
   */
  private calculateDeltaE(rgb1: RGBColor, rgb2: RGBColor): number {
    const dr = rgb1.r - rgb2.r;
    const dg = rgb1.g - rgb2.g;
    const db = rgb1.b - rgb2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  /**
   * 批量转换颜色
   */
  async batchConvert(colors: RGBColor[]): Promise<CMYKColor[]> {
    if (this.serverUrl && colors.length > 10) {
      return this.serverBatchConvert(colors);
    }
    return Promise.all(colors.map(c => this.convertRGBtoCMYK(c)));
  }

  /**
   * 服务器端批量转换
   */
  private async serverBatchConvert(colors: RGBColor[]): Promise<CMYKColor[]> {
    try {
      const response = await fetch(`${this.serverUrl}/api/cmyk/batch-convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          colors,
          profile: this.colorProfile,
        }),
      });

      if (!response.ok) {
        throw new Error('Server batch conversion failed');
      }

      const data = await response.json();
      return data.cmykColors;
    } catch (error) {
      console.warn('Server batch conversion failed, falling back to client-side:', error);
      return colors.map(rgbToCMYK);
    }
  }
}

// 导出单例实例
export const cmykService = new CMYKService();
