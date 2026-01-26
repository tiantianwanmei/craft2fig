// ============================================================================
// InfoCard - 信息卡片组件
// ============================================================================

import React from 'react';

interface InfoCardProps {
  partsCount: number;
  totalArea: number;
  t?: (key: string) => string;
}

export const InfoCard: React.FC<InfoCardProps> = ({
  partsCount,
  totalArea,
  t = (key) => key,
}) => {
  return (
    <div
      className="absolute bottom-6 left-6 backdrop-blur-xl shadow-2xl"
      style={{
        backgroundColor: 'hsl(var(--background) / 0.6)',
        border: '1px solid hsl(var(--border))',
        borderRadius: '8px',
        padding: '8px 10px',
        width: '140px'
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div
            className="mb-0"
            style={{
              fontSize: '8px',
              fontWeight: '400',
              color: 'hsl(var(--muted-foreground) / 0.4)',
              whiteSpace: 'nowrap'
            }}
          >
            {t('info.parts')}
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: '700',
              color: 'hsl(var(--primary))',
              lineHeight: '1.3'
            }}
          >
            {partsCount}
          </div>
          <div
            style={{
              fontSize: '8px',
              fontWeight: '400',
              color: 'hsl(var(--muted-foreground) / 0.4)'
            }}
          >
            {t('info.unit.parts')}
          </div>
        </div>
        <div>
          <div
            className="mb-0"
            style={{
              fontSize: '8px',
              fontWeight: '400',
              color: 'hsl(var(--muted-foreground) / 0.4)',
              whiteSpace: 'nowrap'
            }}
          >
            {t('info.area')}
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: '700',
              color: 'hsl(var(--primary))',
              lineHeight: '1.3'
            }}
          >
            {(totalArea / 100).toFixed(1)}
          </div>
          <div
            style={{
              fontSize: '8px',
              fontWeight: '400',
              color: 'hsl(var(--muted-foreground) / 0.4)'
            }}
          >
            cm²
          </div>
        </div>
      </div>
    </div>
  );
};
