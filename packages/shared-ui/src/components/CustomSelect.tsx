// ============================================================================
// Custom Select - 自定义下拉选择器（统一样式）
// ============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useTokenStore } from '@genki/shared-theme';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  placeholder = '选择...'
}) => {
  const resolvedTokens = useTokenStore(s => s.resolvedTokens);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div ref={ref} className="relative w-full">
      {/* 选择按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-all"
        style={{
          backgroundColor: resolvedTokens['tokenItem-input-background'] || 'rgba(0, 0, 0, 0.3)',
          borderColor: resolvedTokens['tokenItem-input-border'] || 'rgba(255, 255, 255, 0.1)',
          color: resolvedTokens['tokenItem-input-text'] || '#ffffff',
          fontSize: resolvedTokens['tokenItem-input-fontSize'] || '10px'
        }}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <span style={{ 
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>▼</span>
      </button>

      {/* 下拉列表 */}
      {isOpen && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-2xl overflow-hidden z-[9999]"
          style={{
            backgroundColor: resolvedTokens['tokenBindingSelector-background'] || 'rgba(17, 24, 39, 1)',
            border: `1px solid ${resolvedTokens['tokenBindingSelector-border'] || 'rgba(55, 65, 81, 1)'}`,
            maxHeight: '200px',
            overflowY: 'auto'
          }}
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            
            return (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-cyan-500/10 transition-colors text-left"
                style={{
                  backgroundColor: isSelected ? (resolvedTokens['tokenBindingSelector-item-selected'] || 'rgba(6, 182, 212, 0.2)') : 'transparent',
                  color: resolvedTokens['tokenBindingSelector-text-primary'] || 'rgba(255, 255, 255, 1)',
                  fontSize: '11px'
                }}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <span style={{ color: resolvedTokens['tokenBindingSelector-text-selected'] || 'rgba(34, 211, 238, 1)' }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
      
      {/* 精简滚动条样式 */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};
