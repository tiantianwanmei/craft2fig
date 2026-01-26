// ============================================================================
// 🎨 DESIGN EDITOR - 简化版设计编辑器
// ============================================================================
// 只通过图层列表选择元素，通过属性面板调参，不支持直接操作视图

import React, { useState } from 'react';
import { useTokenStore } from '../store/useTokenStore';
import { Portal } from '../utils/PortalManager';
import { ISOLATION_STYLE } from '../constants/zIndex';
import { TokenSelector } from './TokenSelector';
import { CustomSelect } from './CustomSelect';

interface EditableElement {
  id: string;
  name: string;
  selector: string;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  styles: {
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    backgroundColor?: string;
    borderRadius?: string;
    padding?: string;
    margin?: string;
  };
}

export const DesignEditor = () => {
  const [isDesignMode, setIsDesignMode] = useState(false);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [elements, setElements] = useState<Record<string, EditableElement>>({});
  const setToken = useTokenStore(s => s.setToken);
  const tokens = useTokenStore(s => s.tokens); // 获取 tokens 用于 UI 绑定
  const resolvedTokens = useTokenStore(s => s.resolvedTokens); // 获取 resolved tokens

  // 切换设计模式
  const toggleDesignMode = (event?: any) => {
    const detail = event?.detail;
    console.log('🎨 Design panel event:', detail);
    
    if (detail?.action === 'open') {
      console.log('📂 Opening Design panel...');
      
      // 1. 强制关闭 Tune 面板
      window.dispatchEvent(new CustomEvent('toggle-tune-mode', { detail: { action: 'close' } }));
      
      // 2. 隐藏默认控制面板
      const controlPanel = document.getElementById('control-panel');
      if (controlPanel) {
        controlPanel.style.display = 'none';
        console.log('  ✅ Default panel hidden');
      }
      
      // 3. 显示设计面板
      setIsDesignMode(true);
      setTimeout(() => scanEditableElements(), 100);
      console.log('  ✅ Design panel opened');
      return;
    }
    
    if (detail?.action === 'close') {
      console.log('📂 Closing Design panel...');
      
      // 1. 隐藏设计面板
      setIsDesignMode(false);
      setSelectedElement(null);
      
      // 2. 清除高亮
      Object.values(elements).forEach(element => {
        const domEl = document.querySelector(element.selector) as HTMLElement;
        if (domEl) {
          domEl.style.outline = '';
          domEl.style.outlineOffset = '';
          domEl.style.boxShadow = '';
        }
      });
      
      // 3. 显示默认控制面板
      const controlPanel = document.getElementById('control-panel');
      if (controlPanel) {
        controlPanel.style.display = 'flex';
        console.log('  ✅ Default panel shown');
      }
      return;
    }
    
    // Toggle 模式
    const newState = !isDesignMode;
    console.log(`📂 Toggling Design panel: ${isDesignMode} → ${newState}`);
    
    if (newState) {
      // 打开设计面板
      window.dispatchEvent(new CustomEvent('toggle-tune-mode', { detail: { action: 'close' } }));
      const controlPanel = document.getElementById('control-panel');
      if (controlPanel) controlPanel.style.display = 'none';
      setIsDesignMode(true);
      setTimeout(() => scanEditableElements(), 100);
    } else {
      // 关闭设计面板
      setIsDesignMode(false);
      setSelectedElement(null);
      Object.values(elements).forEach(element => {
        const domEl = document.querySelector(element.selector) as HTMLElement;
        if (domEl) {
          domEl.style.outline = '';
          domEl.style.outlineOffset = '';
          domEl.style.boxShadow = '';
        }
      });
      const controlPanel = document.getElementById('control-panel');
      if (controlPanel) controlPanel.style.display = 'flex';
    }
  };
  
  // 监听全局事件
  React.useEffect(() => {
    window.addEventListener('toggle-design-mode', toggleDesignMode);
    return () => window.removeEventListener('toggle-design-mode', toggleDesignMode);
  }, [isDesignMode, elements]);

  // 扫描可编辑元素 - 保留所有元素，用组件化方式组织
  const scanEditableElements = () => {
    console.log('🔍 Scanning editable elements...');
    const scannedElements: Record<string, EditableElement> = {};
    
    // 扫描所有带 data-editable 的元素
    const editableElements = document.querySelectorAll('[data-editable]');
    console.log('📋 Found elements with data-editable:', editableElements.length);
    
    editableElements.forEach((domEl) => {
      const el = domEl as HTMLElement;
      const id = el.getAttribute('data-editable') || '';
      const name = el.getAttribute('data-name') || id;
      
      const rect = el.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(el);
      
      console.log('📝 Scanning element:', { id, name, fontSize: computedStyle.fontSize, color: computedStyle.color });
      
      scannedElements[id] = {
        id,
        name,
        selector: `[data-editable="${id}"]`,
        position: { x: rect.left, y: rect.top },
        size: { width: rect.width, height: rect.height },
        styles: {
          fontSize: computedStyle.fontSize || '16px',
          fontWeight: computedStyle.fontWeight || '400',
          color: computedStyle.color || '#ffffff',
          backgroundColor: computedStyle.backgroundColor || 'transparent',
          borderRadius: computedStyle.borderRadius || '0px',
          padding: computedStyle.padding || '0px',
          margin: computedStyle.margin || '0px',
        }
      };
    });
    
    // 如果没有找到带 data-editable 的元素，添加一些默认元素
    if (Object.keys(scannedElements).length === 0) {
      console.log('⚠️ No data-editable elements found, using default selectors...');
      const editableSelectors = [
        { id: 'app-title', name: 'GENKI ULTIMATE 标题', selector: 'h1' },
        { id: 'info-card', name: '信息卡片', selector: '#info-card' },
        { id: 'export-button', name: '导出按钮', selector: 'button[class*="w-full"][class*="py-4"]' },
      ];
  
      editableSelectors.forEach(({ id, name, selector }) => {
        const domEl = document.querySelector(selector) as HTMLElement;
        if (domEl) {
          const rect = domEl.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(domEl);
          
          scannedElements[id] = {
            id,
            name,
            selector,
            position: { x: rect.left, y: rect.top },
            size: { width: rect.width, height: rect.height },
            styles: {
              fontSize: computedStyle.fontSize,
              fontWeight: computedStyle.fontWeight,
              color: computedStyle.color,
              backgroundColor: computedStyle.backgroundColor,
              borderRadius: computedStyle.borderRadius,
              padding: computedStyle.padding,
              margin: computedStyle.margin,
            }
          };
        }
      });
    }
    
    console.log('✅ Scanned elements:', Object.keys(scannedElements).length, scannedElements);
    setElements(scannedElements);
    
    // 自动选中第一个元素，这样参数面板会立即显示
    const firstElementId = Object.keys(scannedElements)[0];
    if (firstElementId) {
      setSelectedElement(firstElementId);
      console.log('✅ Auto-selected first element:', firstElementId);
    }
  };

  // 更新元素样式 - 只修改选中元素，不影响全局 Token
  const updateElementStyle = (elementId: string, property: string, value: string) => {
    console.log('🎨 ========== UPDATE STYLE START ==========');
    console.log('Element ID:', elementId);
    console.log('Property:', property);
    console.log('Value:', value);
    console.log('Current elements state:', elements);
    
    // 1. 更新本地状态并获取更新后的元素信息
    setElements(prev => {
      console.log('📦 Previous elements state:', prev);
      console.log('📦 Element to update:', prev[elementId]);
      
      const updatedElements = {
        ...prev,
        [elementId]: {
          ...prev[elementId],
          styles: {
            ...prev[elementId].styles,
            [property]: value
          }
        }
      };
      
      console.log('📦 Updated elements state:', updatedElements);
      console.log('📦 Updated element:', updatedElements[elementId]);
      
      // 2. 立即应用到 DOM（使用更新后的元素信息）
      const element = updatedElements[elementId];
      if (element && element.selector) {
        console.log('🔍 Searching for element with selector:', element.selector);
        const domEl = document.querySelector(element.selector) as HTMLElement;
        console.log('🔍 Found DOM element:', domEl);
        
        if (domEl) {
          // 直接设置内联样式，使用 setProperty 添加 !important
          console.log('📝 Before style change:', domEl.style[property as any]);
          
          // 使用 setProperty 方法添加 !important 优先级
          domEl.style.setProperty(property, value, 'important');
          
          console.log('📝 After style change:', domEl.style[property as any]);
          console.log('✅ SUCCESS! Applied to DOM with !important:', {
            elementName: element.name,
            selector: element.selector,
            property,
            value,
            actualStyleValue: domEl.style[property as any],
            priority: domEl.style.getPropertyPriority(property)
          });
        } else {
          console.error('❌ FAILED! DOM element not found with selector:', element.selector);
          console.error('Available elements in DOM:', document.querySelectorAll('*').length);
        }
      } else {
        console.error('❌ FAILED! Element not found in state:', elementId);
        console.error('Available element IDs:', Object.keys(prev));
      }
      
      console.log('🎨 ========== UPDATE STYLE END ==========');
      return updatedElements;
    });
    
    // 3. 更新到 Token 系统（最高优先级！）
    updateTokenFromProperty(property, value);
  };
  
  // 从 CSS 属性更新到 Token 系统（组件级，极细颗粒度）
  const updateTokenFromProperty = (property: string, value: string) => {
    if (!setToken) return;
    
    const element = elements[selectedElement];
    if (!element) return;
    
    console.log('🔄 Updating component-specific token:', element.id, property, value);
    
    // 根据元素 ID 确定组件前缀
    const componentPrefix = getComponentPrefix(element.id);
    
    // 更新组件专属的 Token（Figma 标准：[asset]-[type]-[property]-[state]）
    const state = 'default'; // 当前状态
    switch (property) {
      case 'fontSize':
        setToken(`${componentPrefix}-fontSize-${state}`, value);
        console.log(`✅ Updated ${componentPrefix}-fontSize-${state} = ${value}`);
        break;
        
      case 'fontWeight':
        setToken(`${componentPrefix}-fontWeight-${state}`, value);
        console.log(`✅ Updated ${componentPrefix}-fontWeight-${state} = ${value}`);
        break;
        
      case 'color':
        setToken(`${componentPrefix}-color-${state}`, value);
        console.log(`✅ Updated ${componentPrefix}-color-${state} = ${value}`);
        break;
        
      case 'backgroundColor':
        setToken(`${componentPrefix}-background-${state}`, value);
        console.log(`✅ Updated ${componentPrefix}-background-${state} = ${value}`);
        break;
        
      case 'borderRadius':
        setToken(`${componentPrefix}-borderRadius-${state}`, value);
        console.log(`✅ Updated ${componentPrefix}-borderRadius-${state} = ${value}`);
        break;
        
      case 'padding':
        setToken(`${componentPrefix}-padding-${state}`, value);
        console.log(`✅ Updated ${componentPrefix}-padding-${state} = ${value}`);
        break;
        
      case 'margin':
        setToken(`${componentPrefix}-margin-${state}`, value);
        console.log(`✅ Updated ${componentPrefix}-margin-${state} = ${value}`);
        break;
    }
  };
  
  // 获取组件前缀（用于 Token 命名）- WORLD-CLASS FIGMA STANDARD
  // 格式: [asset]-[type]-[property]-[state]
  const getComponentPrefix = (elementId: string): string => {
    // Title Component
    if (elementId === 'app-title') return 'title-h1';
    if (elementId === 'app-subtitle') return 'title-caption';
    
    // Info Card Component
    if (elementId === 'info-card') return 'infoCard-container';
    if (elementId.startsWith('info-label-')) return 'infoCard-label';
    if (elementId.startsWith('info-value-')) return 'infoCard-value';
    if (elementId.startsWith('info-unit-')) return 'infoCard-unit';
    
    // Button Primary Component
    if (elementId === 'export-button') return 'button-primary';
    
    return elementId;
  };
  
  // 处理数值输入的键盘事件（支持上下键）
  const handleNumericKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    elementId: string,
    property: string
  ) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      
      // 从当前输入框获取值
      const currentValue = (e.target as HTMLInputElement).value;
      
      // 提取数值和单位
      const match = currentValue.match(/^([\d.]+)(.*)$/);
      if (match) {
        const num = parseFloat(match[1]);
        const unit = match[2] || '';
        const step = e.shiftKey ? 10 : 1; // Shift + 上下键 = 10倍步长
        const newNum = e.key === 'ArrowUp' ? num + step : num - step;
        const newValue = `${Math.max(0, newNum)}${unit}`;
        updateElementStyle(elementId, property, newValue);
      }
    }
  };

  // 键盘快捷键
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isDesignMode) return;
      
      // Esc 退出
      if (e.key === 'Escape') {
        toggleDesignMode(); // 直接调用切换函数
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDesignMode, toggleDesignMode]);

  if (!isDesignMode) {
    return null;
  }

  return (
    <Portal containerId="DESIGN_EDITOR">
      {/* 设计模式工具栏 - 顶部 */}
      <div className="absolute top-0 left-0 right-0 backdrop-blur-xl border-b p-3 flex items-center justify-between"
        style={{
          ...ISOLATION_STYLE,
          zIndex: 150,
          backgroundColor: resolvedTokens['panel-background'] || 'rgba(15, 15, 15, 0.95)',
          borderColor: resolvedTokens['semantic-color-brand'] || 'rgba(139, 92, 246, 0.3)'
        }}
      >
        <div className="flex items-center gap-2">
          <div style={{ fontSize: tokens['typography-h3-fontSize'] || '14px', fontWeight: tokens['typography-h3-fontWeight'] || '600', color: resolvedTokens['semantic-color-brand'] || '#a78bfa' }}>
            ✨ 设计模式
          </div>
          <div className="px-2 py-1 rounded" style={{ 
            fontSize: tokens['typography-caption-fontSize'] || '10px',
            fontWeight: tokens['typography-caption-fontWeight'] || '400',
            backgroundColor: 'rgba(139, 92, 246, 0.3)',
            color: resolvedTokens['semantic-color-brand'] || '#c4b5fd'
          }}>
            {Object.keys(elements).length} 个元素
          </div>
        </div>
        
        {/* 退出 */}
        <button
          onClick={toggleDesignMode}
          className="px-3 py-1.5 rounded-lg transition-all hover:scale-105"
          style={{
            fontSize: tokens['typography-caption-fontSize'] || '10px',
            fontWeight: tokens['typography-caption-fontWeight'] || '400',
            backgroundColor: 'rgba(239, 68, 68, 0.2)',
            color: resolvedTokens['semantic-color-error'] || 'rgb(239, 68, 68)',
            border: `1px solid rgba(239, 68, 68, 0.3)`
          }}
        >
          ✕ 退出 (Esc)
        </button>
      </div>

      {/* 右侧统一面板 - 元素列表 + 属性调节 */}
      <style>{`
        @keyframes gradientFade1 {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        
        @keyframes gradientFade2 {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }
        
        .animated-panel-gradient {
          position: relative;
          background: rgba(20, 20, 25, 0.85);
          backdrop-filter: blur(10px);
          will-change: auto;
        }
        
        .animated-panel-gradient::before,
        .animated-panel-gradient::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 0;
          will-change: opacity;
          transform: translateZ(0);
        }
        
        .animated-panel-gradient::before {
          background: radial-gradient(ellipse 150% 100% at 100% 30%,
            rgba(34, 211, 238, 0.10) 0%,
            rgba(56, 189, 248, 0.07) 30%,
            rgba(14, 165, 233, 0.04) 60%,
            transparent 100%
          );
          animation: gradientFade1 10s ease-in-out infinite;
        }
        
        .animated-panel-gradient::after {
          background: radial-gradient(ellipse 180% 120% at 100% 60%,
            rgba(6, 182, 212, 0.12) 0%,
            rgba(14, 165, 233, 0.09) 30%,
            rgba(34, 211, 238, 0.05) 60%,
            transparent 100%
          );
          animation: gradientFade2 10s ease-in-out infinite;
        }
      `}</style>
      <div className="fixed flex flex-col border-l animated-panel-gradient"
        style={{
          ...ISOLATION_STYLE,
          position: 'fixed',
          top: '60px',
          right: 0,
          left: 'auto',
          bottom: '0',
          zIndex: 200,
          width: '280px',
          backdropFilter: 'blur(60px) saturate(180%)',
          WebkitBackdropFilter: 'blur(60px) saturate(180%)',
          boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.3)',
          borderColor: resolvedTokens['shared-color-border'] || 'rgba(255, 255, 255, 0.1)',
          pointerEvents: 'auto'
        }}
      >
        <div className="flex-1 overflow-y-auto" style={{ position: 'relative', zIndex: 2 }}>
          {/* 元素列表区域 - 组件化分组 */}
          <div className="p-4 border-b" style={{ borderColor: resolvedTokens['shared-color-divider'] || 'rgba(255, 255, 255, 0.06)' }}>
            <h3 className="mb-3" style={{ fontSize: resolvedTokens['shared-fontSize-md'] || '14px', fontWeight: resolvedTokens['shared-fontWeight-semibold'] || '600', color: resolvedTokens['shared-color-text-primary'] || 'white' }}>
              可编辑元素
            </h3>
            
            <div className="space-y-3">
              {/* 标题组件 */}
              <div>
                <div className="mb-1 px-1" style={{ fontSize: resolvedTokens['shared-fontSize-xs'] || '10px', fontWeight: resolvedTokens['shared-fontWeight-regular'] || '400', color: resolvedTokens['shared-color-text-secondary'] || 'rgba(255,255,255,0.6)' }}>标题</div>
                {['app-title', 'app-subtitle'].filter(id => elements[id]).map((id) => (
                  <button
                    key={id}
                    onClick={() => setSelectedElement(id)}
                    className="w-full text-left px-3 py-2 rounded-lg transition-all text-xs hover:scale-[1.02]"
                    style={{
                      backgroundColor: selectedElement === id ? '#06b6d4' : 'rgba(255, 255, 255, 0.05)',
                      color: selectedElement === id ? 'white' : 'var(--textColors-muted)',
                      border: `1px solid ${selectedElement === id ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)'}`
                    }}
                  >
                    {elements[id].name}
                  </button>
                ))}
              </div>
              
              {/* 信息卡片组件 */}
              <div>
                <div className="mb-1 px-1" style={{ fontSize: tokens['typography-caption-fontSize'] || '10px', fontWeight: tokens['typography-caption-fontWeight'] || '400', color: '#c4b5fd' }}>信息卡片</div>
                {['info-card', 'info-label-1', 'info-value-1', 'info-unit-1'].filter(id => elements[id]).map((id) => (
                  <button
                    key={id}
                    onClick={() => setSelectedElement(id)}
                    className="w-full text-left px-3 py-2 rounded-lg transition-all text-xs hover:scale-[1.02]"
                    style={{
                      fontSize: tokens['typography-caption-fontSize'] || '10px',
                      backgroundColor: selectedElement === id ? '#06b6d4' : 'rgba(255, 255, 255, 0.05)',
                      color: selectedElement === id ? 'white' : 'var(--textColors-muted)',
                      border: `1px solid ${selectedElement === id ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)'}`,
                      marginLeft: id !== 'info-card' ? '12px' : '0'
                    }}
                  >
                    {elements[id].name}
                  </button>
                ))}
              </div>
              
              {/* 按钮组件 */}
              <div>
                <div className="mb-1 px-1" style={{ fontSize: tokens['typography-caption-fontSize'] || '10px', fontWeight: tokens['typography-caption-fontWeight'] || '400', color: '#c4b5fd' }}>按钮</div>
                {['export-button'].filter(id => elements[id]).map((id) => (
                  <button
                    key={id}
                    onClick={() => setSelectedElement(id)}
                    className="w-full text-left px-3 py-2 rounded-lg transition-all text-xs hover:scale-[1.02]"
                    style={{
                      backgroundColor: selectedElement === id ? '#06b6d4' : 'rgba(255, 255, 255, 0.05)',
                      color: selectedElement === id ? 'white' : 'var(--textColors-muted)',
                      border: `1px solid ${selectedElement === id ? '#06b6d4' : 'rgba(255, 255, 255, 0.1)'}`
                    }}
                  >
                    {elements[id].name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 属性调节区域 */}
          {selectedElement && elements[selectedElement] ? (
            <div className="p-4">
              <h3 className="text-sm font-bold mb-3" style={{ color: resolvedTokens['semantic-color-brand'] || '#a78bfa' }}>
                🎨 {elements[selectedElement].name}
              </h3>
              
              <div className="space-y-4">
                {/* 字体大小 */}
                <div>
                  <label className="block mb-2" style={{ fontSize: tokens['typography-caption-fontSize'] || '10px', fontWeight: tokens['typography-caption-fontWeight'] || '400', color: tokens['typography-caption-color'] || 'rgba(255,255,255,0.6)' }}>
                    字体大小 (↑↓ 调节)
                  </label>
                  <TokenSelector
                    value={elements[selectedElement].styles.fontSize || ''}
                    onChange={(value) => updateElementStyle(selectedElement, 'fontSize', value)}
                    placeholder="16px 或 $ 选择 Token"
                    filterType="fontSize"
                  />
                </div>

                {/* 字重 */}
                <div>
                  <label className="block mb-2" style={{ fontSize: tokens['typography-caption-fontSize'] || '10px', fontWeight: tokens['typography-caption-fontWeight'] || '400', color: tokens['typography-caption-color'] || 'rgba(255,255,255,0.6)' }}>
                    字重
                  </label>
                  <CustomSelect
                    value={elements[selectedElement].styles.fontWeight || '400'}
                    onChange={(value) => updateElementStyle(selectedElement, 'fontWeight', value)}
                    options={[
                      { value: '400', label: 'Normal (400)' },
                      { value: '500', label: 'Medium (500)' },
                      { value: '600', label: 'Semibold (600)' },
                      { value: '700', label: 'Bold (700)' }
                    ]}
                    placeholder="选择字重"
                  />
                </div>

                {/* 文字颜色 */}
                <div>
                  <label className="block mb-2" style={{ fontSize: tokens['typography-caption-fontSize'] || '10px', fontWeight: tokens['typography-caption-fontWeight'] || '400', color: tokens['typography-caption-color'] || 'rgba(255,255,255,0.6)' }}>
                    文字颜色
                  </label>
                  <TokenSelector
                    value={elements[selectedElement].styles.color || ''}
                    onChange={(value) => updateElementStyle(selectedElement, 'color', value)}
                    placeholder="#ffffff 或 $ 选择 Token"
                    filterType="colors"
                  />
                </div>

                {/* 背景颜色 */}
                <div>
                  <label className="block mb-2" style={{ fontSize: tokens['typography-caption-fontSize'] || '10px', fontWeight: tokens['typography-caption-fontWeight'] || '400', color: tokens['typography-caption-color'] || 'rgba(255,255,255,0.6)' }}>
                    背景颜色
                  </label>
                  <TokenSelector
                    value={elements[selectedElement].styles.backgroundColor || ''}
                    onChange={(value) => updateElementStyle(selectedElement, 'backgroundColor', value)}
                    placeholder="rgba(0,0,0,0.5) 或 $ 选择 Token"
                    filterType="colors"
                  />
                </div>

                {/* 圆角 */}
                <div>
                  <label className="block mb-2" style={{ fontSize: tokens['typography-caption-fontSize'] || '10px', fontWeight: tokens['typography-caption-fontWeight'] || '400', color: tokens['typography-caption-color'] || 'rgba(255,255,255,0.6)' }}>
                    圆角 (↑↓ 调节)
                  </label>
                  <TokenSelector
                    value={elements[selectedElement].styles.borderRadius || ''}
                    onChange={(value) => updateElementStyle(selectedElement, 'borderRadius', value)}
                    placeholder="8px 或 $ 选择 Token"
                    filterType="borderRadius"
                  />
                </div>

                {/* 内边距 */}
                <div>
                  <label className="block mb-2" style={{ fontSize: tokens['typography-caption-fontSize'] || '10px', fontWeight: tokens['typography-caption-fontWeight'] || '400', color: tokens['typography-caption-color'] || 'rgba(255,255,255,0.6)' }}>
                    内边距 (↑↓ 调节)
                  </label>
                  <input
                    type="text"
                    value={elements[selectedElement].styles.padding || ''}
                    onChange={(e) => updateElementStyle(selectedElement, 'padding', e.target.value)}
                    onKeyDown={(e) => handleNumericKeyDown(e, selectedElement, 'padding')}
                    className="w-full bg-black/30 border rounded-lg px-3 py-2 text-xs text-white"
                    style={{ borderColor: 'var(--neutral-700)' }}
                    placeholder="16px"
                  />
                </div>

                {/* 外边距 */}
                <div>
                  <label className="block mb-2" style={{ fontSize: tokens['typography-caption-fontSize'] || '10px', fontWeight: tokens['typography-caption-fontWeight'] || '400', color: tokens['typography-caption-color'] || 'rgba(255,255,255,0.6)' }}>
                    外边距 (↑↓ 调节, Shift+↑↓ 快速)
                  </label>
                  <input
                    type="text"
                    value={elements[selectedElement].styles.margin || ''}
                    onChange={(e) => updateElementStyle(selectedElement, 'margin', e.target.value)}
                    onKeyDown={(e) => handleNumericKeyDown(e, selectedElement, 'margin')}
                    className="w-full bg-black/30 border rounded-lg px-3 py-2 text-xs text-white"
                    style={{ borderColor: 'var(--neutral-700)' }}
                    placeholder="0px"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 flex items-center justify-center" style={{ minHeight: '200px' }}>
              <div className="text-center" style={{ color: 'var(--textColors-muted)' }}>
                <div className="text-4xl mb-2">👆</div>
                <div className="text-xs">选择一个元素开始编辑</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 视图高亮（只显示，不可交互） */}
      {Object.entries(elements).map(([id, element]) => {
        if (!element.position || !element.size) return null;
        const isSelected = selectedElement === id;
        
        return (
          <div
            key={id}
            className="fixed pointer-events-none"
            style={{
              zIndex: 9998,
              left: element.position.x,
              top: element.position.y,
              width: element.size.width,
              height: element.size.height,
              boxShadow: isSelected 
                ? '0 0 0 3px rgba(139, 92, 246, 0.6), 0 0 30px rgba(139, 92, 246, 0.8), inset 0 0 20px rgba(139, 92, 246, 0.2)' 
                : `0 0 0 2px ${resolvedTokens['semantic-color-link'] || 'rgba(6, 182, 212, 0.3)'}`,
              borderRadius: '4px',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        );
      })}
    </Portal>
  );
};
