// ============================================================================
// 📤 Export Guide - 导出指南
// ============================================================================

import React, { useState } from 'react';
import { usePrintMasterStore } from '../store';

interface ExportGuideProps {
  className?: string;
}

export const ExportGuide: React.FC<ExportGuideProps> = ({ className = '' }) => {
  const settings = usePrintMasterStore((s) => s.settings);
  const [activeFormat, setActiveFormat] = useState<'pdf' | 'png' | 'tiff'>('pdf');

  const exportFormats = {
    pdf: {
      name: 'PDF',
      icon: '📄',
      description: '最常用的印刷格式',
      steps: [
        '文件 → 导出 → PDF',
        '选择 "印刷质量" 预设',
        '启用 "包含出血和印刷标记"',
        `设置出血为 ${settings.bleed}mm`,
        '色彩模式选择 CMYK',
        `嵌入 ${settings.colorProfile} 色彩配置文件`,
        '压缩选项: 无损压缩或最小压缩',
      ],
      tips: [
        '确保所有字体已嵌入或转为轮廓',
        '图片分辨率不低于 300 DPI',
        '透明度需拼合',
      ],
    },
    png: {
      name: 'PNG',
      icon: '🖼️',
      description: '适合数字打样和预览',
      steps: [
        '文件 → 导出 → PNG',
        `设置分辨率为 ${settings.dpi} DPI`,
        '色彩模式: RGB (用于屏幕) 或 CMYK (用于印刷)',
        '包含透明度 (如需要)',
        `导出尺寸包含 ${settings.bleed}mm 出血`,
      ],
      tips: [
        'PNG 不支持 CMYK，印刷前需转换',
        '文件较大，不适合大尺寸印刷',
        '适合用于数字打样和客户预览',
      ],
    },
    tiff: {
      name: 'TIFF',
      icon: '📸',
      description: '专业印刷格式',
      steps: [
        '文件 → 导出 → TIFF',
        `分辨率: ${settings.dpi} DPI`,
        '色彩模式: CMYK',
        `嵌入 ${settings.colorProfile} 配置文件`,
        '压缩: LZW 或不压缩',
        `包含 ${settings.bleed}mm 出血`,
        '保存图层 (可选)',
      ],
      tips: [
        'TIFF 支持 CMYK 和专业色彩管理',
        '文件较大，但质量最高',
        '印刷厂首选格式',
      ],
    },
  };

  const currentFormat = exportFormats[activeFormat];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 标题 */}
      <div className="flex items-center gap-2 pb-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-lg">📤</span>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          导出指南
        </h3>
      </div>

      {/* 格式选择 */}
      <div className="flex gap-2">
        {(Object.keys(exportFormats) as Array<keyof typeof exportFormats>).map((format) => (
          <button
            key={format}
            onClick={() => setActiveFormat(format)}
            className={`
              flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all
              ${
                activeFormat === format
                  ? 'bg-[var(--semantic-button-primary-bg)] text-[var(--semantic-button-primary-text)] shadow-md'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-base">{exportFormats[format].icon}</span>
              <span>{exportFormats[format].name}</span>
            </div>
          </button>
        ))}
      </div>

      {/* 格式说明 */}
      <div className="p-3 bg-[var(--semantic-surface-info)] border border-[var(--semantic-border-info)] rounded-lg">
        <p className="text-xs text-[var(--semantic-text-info)]">
          {currentFormat.description}
        </p>
      </div>

      {/* 导出步骤 */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">
          📝 导出步骤
        </h4>
        <ol className="space-y-1.5 pl-2">
          {currentFormat.steps.map((step, idx) => (
            <li key={idx} className="flex gap-2 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-mono text-[var(--semantic-text-accent)] font-medium min-w-[20px]">
                {idx + 1}.
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* 重要提示 */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300">
          💡 重要提示
        </h4>
        <ul className="space-y-1.5 pl-2">
          {currentFormat.tips.map((tip, idx) => (
            <li key={idx} className="flex gap-2 text-xs text-gray-600 dark:text-gray-400">
              <span className="text-amber-500">•</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
