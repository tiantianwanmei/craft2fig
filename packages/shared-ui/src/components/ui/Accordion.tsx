// ============================================================================
// Figma 原生极简风格 Accordion 组件
// ============================================================================

import React, { useState } from 'react';
import { useTokenStore } from '@genki/shared-theme';

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({ 
  title, 
  children, 
  defaultOpen = false,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const resolvedTokens = useTokenStore(s => s.resolvedTokens);

  return (
    <div
      style={{
        marginBottom: '1px',
      }}
    >
      {/* Header - Figma 原生风格 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 0',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: resolvedTokens['shared-color-text-primary'] || '#ffffff',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: '600',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            color: resolvedTokens['shared-color-text-secondary'] || 'rgba(255, 255, 255, 0.5)',
          }}
        >
          {title}
        </span>
        
        {/* 统一的箭头样式 */}
        <span style={{
          fontSize: resolvedTokens['shared-arrow-fontSize'] || '8px',
          color: resolvedTokens['shared-arrow-color'] || 'rgba(255, 255, 255, 0.4)',
          transition: `transform ${resolvedTokens['shared-arrow-transition'] || '0.15s'} ease`,
          transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
          display: 'inline-block',
          width: resolvedTokens['shared-arrow-width'] || '8px',
        }}>
          ▶
        </span>
      </button>

      {/* Content */}
      {isOpen && (
        <div
          style={{
            paddingBottom: '12px',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

interface AccordionProps {
  children: React.ReactNode;
  className?: string;
}

export const Accordion: React.FC<AccordionProps> = ({ children, className }) => {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  );
};
