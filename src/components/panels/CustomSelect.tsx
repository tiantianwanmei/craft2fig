/**
 * 🎨 CustomSelect - 自定义下拉选择器（暗黑主题）
 * 替代原生 select，完全可控的样式
 * 使用 monorepo SEMANTIC_TOKENS 确保设计一致性
 */

import { memo, useState, useRef, useEffect } from 'react';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  style?: React.CSSProperties;
}

export const CustomSelect = memo(function CustomSelect({
  value,
  onChange,
  options,
  placeholder = '请选择...',
  style = {}
}: CustomSelectProps) {
  console.log('🔍 CustomSelect rendered:', { value, options, placeholder });
  console.log('🎨 SEMANTIC_TOKENS.color.bg.secondary:', SEMANTIC_TOKENS.color.bg.secondary);

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (option: string) => {
    onChange(option);
    setIsOpen(false);
  };

  const displayValue = value || placeholder;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        ...style
      }}
    >
      {/* 选择框 */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: `${SEMANTIC_TOKENS.spacing.component.sm} ${SEMANTIC_TOKENS.spacing.component.md}`,
          paddingRight: '28px',
          background: SEMANTIC_TOKENS.color.bg.interactive.default,
          border: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.default}`,
          borderRadius: SEMANTIC_TOKENS.border.radius.sm,
          color: value ? SEMANTIC_TOKENS.color.text.primary : SEMANTIC_TOKENS.color.text.tertiary,
          fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
          cursor: 'pointer',
          transition: `all ${SEMANTIC_TOKENS.motion.duration.fast} ease`,
          userSelect: 'none' as const,
          position: 'relative' as const
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = SEMANTIC_TOKENS.color.bg.interactive.hover;
          e.currentTarget.style.borderColor = SEMANTIC_TOKENS.color.border.strong;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = SEMANTIC_TOKENS.color.bg.interactive.default;
          e.currentTarget.style.borderColor = SEMANTIC_TOKENS.color.border.default;
        }}
      >
        {displayValue}

        {/* 下拉箭头 */}
        <span
          style={{
            position: 'absolute' as const,
            right: SEMANTIC_TOKENS.spacing.component.md,
            top: '50%',
            transform: `translateY(-50%) rotate(${isOpen ? '180deg' : '0deg'})`,
            transition: `transform ${SEMANTIC_TOKENS.motion.duration.normal} ease`,
            fontSize: SEMANTIC_TOKENS.typography.fontSize.micro,
            color: SEMANTIC_TOKENS.color.text.tertiary
          }}
        >
          ▼
        </span>
      </div>

      {/* 下拉列表 */}
      {isOpen && (
        <div
          style={{
            position: 'fixed' as const,
            top: containerRef.current ? containerRef.current.getBoundingClientRect().bottom + 4 : 0,
            left: containerRef.current ? containerRef.current.getBoundingClientRect().left : 0,
            width: containerRef.current ? containerRef.current.getBoundingClientRect().width : 'auto',
            maxHeight: '200px',
            overflowY: 'auto' as const,
            background: SEMANTIC_TOKENS.color.bg.secondary,
            border: `${SEMANTIC_TOKENS.border.width.thin} solid ${SEMANTIC_TOKENS.color.border.default}`,
            borderRadius: SEMANTIC_TOKENS.border.radius.md,
            boxShadow: SEMANTIC_TOKENS.shadow.lg,
            zIndex: 1000,
            padding: SEMANTIC_TOKENS.spacing.component.sm
          }}
        >
          {options.length === 0 ? (
            <div
              style={{
                padding: `${SEMANTIC_TOKENS.spacing.component.md} ${SEMANTIC_TOKENS.spacing.component.lg}`,
                fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
                color: SEMANTIC_TOKENS.color.text.disabled,
                textAlign: 'center' as const
              }}
            >
              暂无选项
            </div>
          ) : (
            options.map((option) => (
              <div
                key={option}
                onClick={() => handleSelect(option)}
                style={{
                  padding: `${SEMANTIC_TOKENS.spacing.component.md} ${SEMANTIC_TOKENS.spacing.component.lg}`,
                  fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
                  color: option === value ? SEMANTIC_TOKENS.color.text.primary : SEMANTIC_TOKENS.color.text.secondary,
                  background: option === value ? SEMANTIC_TOKENS.color.bg.interactive.active : 'transparent',
                  borderRadius: SEMANTIC_TOKENS.border.radius.sm,
                  cursor: 'pointer',
                  transition: `all ${SEMANTIC_TOKENS.motion.duration.fast} ease`,
                  fontWeight: option === value ? SEMANTIC_TOKENS.typography.fontWeight.medium : SEMANTIC_TOKENS.typography.fontWeight.regular,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = option === value
                    ? SEMANTIC_TOKENS.color.bg.interactive.active
                    : SEMANTIC_TOKENS.color.bg.interactive.hover;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = option === value
                    ? SEMANTIC_TOKENS.color.bg.interactive.active
                    : 'transparent';
                }}
              >
                {option}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
});
