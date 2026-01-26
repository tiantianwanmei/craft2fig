// ============================================================================
// 3D VIEW COMPONENT - 完整的 3D 视图
// ============================================================================
// 集成场景、控制面板、加载状态等

import React, { useState, useEffect } from 'react';
import { Scene } from './Scene';
import { Controls3D } from './Controls3D';
import { FuturisticBackground } from './FuturisticBackground';
import { TopIsland } from '../hud/TopIsland';
import { PropertyIsland } from '../hud/PropertyIsland';
import { use3DStore } from '../../store/use3DStore';
// 直接导入生产级 JSON
import productionDataJSON from '../../../../reference app/生产级飞机盒.json';
import type { RawProductionData } from '../../types/productionTopology';
// 🔥 修复：使用 import 而不是 require
import { parseProductionJSON, printProductionTopology } from '../../utils/productionParser';
const PRODUCTION_DATA = productionDataJSON as RawProductionData;

interface View3DProps {
  /** 是否显示控制面板 */
  showControls?: boolean;
  /** 控制面板位置 */
  controlsPosition?: 'left' | 'right' | 'bottom';
  /** 是否显示高级选项 */
  showAdvanced?: boolean;
  /** 初始折叠进度 */
  initialFoldProgress?: number;
  /** 容器高度 */
  height?: string;
  /** 退出回调 */
  onClose?: () => void;
  /** 2D 刀版数据 */
  layoutData?: any;
  /** 使用生产级数据 */
  useProduction?: boolean;
  /** 生产级数据（外部传入） */
  productionData?: any;
}

/**
 * 🌍 完整的 3D 视图组件
 * 
 * 这是对外暴露的主要组件，包含：
 * - 3D 场景渲染
 * - 控制面板
 * - 加载状态
 * - 错误处理
 */
export const View3D: React.FC<View3DProps> = ({
  showControls = true,
  controlsPosition = 'right',
  showAdvanced = false,
  initialFoldProgress = 0,
  height = '100vh',
  onClose,
  layoutData,
  useProduction = false,
  productionData: externalProductionData,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productionData, setProductionData] = useState<any>(externalProductionData || null);
  const [loadingProduction, setLoadingProduction] = useState(false);
  const setFoldProgress = use3DStore((s) => s.setFoldProgress);

  // 初始化折叠进度
  useEffect(() => {
    setFoldProgress(initialFoldProgress);
  }, [initialFoldProgress, setFoldProgress]);

  // 更新外部传入的生产级数据
  useEffect(() => {
    if (externalProductionData) {
      setProductionData(externalProductionData);
      console.log('🏭 External production data loaded!');
      console.log('📦 Raw Data:', externalProductionData);
      
      // 解析并打印拓扑树
      try {
        const parsed = parseProductionJSON(externalProductionData);
        console.log('🌳 Parsed Topology:');
        console.log(printProductionTopology(parsed));
        console.log('📊 Parsed Data Object:', parsed);
        
        // 详细检查每个节点的归一化结果
        console.log('🔍 Detailed Normalization Check:');
        parsed.topology.nodes.forEach((node, index) => {
          if (node.geometry.dlist && node.geometry.dlist.length > 0) {
            const first = node.geometry.dlist[0];
            const last = node.geometry.dlist[node.geometry.dlist.length - 1];
            console.log(`  ${index}. ${node.id} [${node.role}]:`);
            console.log(`     First: (${first.x?.toFixed(1)}, ${first.y?.toFixed(1)})`);
            console.log(`     Last:  (${last.x?.toFixed(1)}, ${last.y?.toFixed(1)})`);
            if (node.children && node.children.length > 0) {
              console.log(`     Children hinges:`, node.children.map(c => 
                `${c.nodeId}@(${c.hinge.x.toFixed(1)},${c.hinge.y.toFixed(1)})`
              ).join(', '));
            }
          }
        });
      } catch (err) {
        console.error('❌ Failed to parse:', err);
      }
    }
  }, [externalProductionData]);

  // 加载生产级数据（直接使用导入的数据作为后备）
  useEffect(() => {
    if (useProduction && !productionData && !externalProductionData) {
      setLoadingProduction(true);
      // 模拟加载延迟，让用户看到加载动画
      setTimeout(() => {
        setProductionData(PRODUCTION_DATA);
        console.log('🏭 Fallback production data loaded!');
        console.log('📊 Faces:', PRODUCTION_DATA.data.knife.faces.length);
        console.log('📏 Folds:', PRODUCTION_DATA.data.knife.folds?.length || 0);
        setLoadingProduction(false);
      }, 500);
    }
  }, [useProduction, productionData, externalProductionData]);

  // 模拟加载过程
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // 错误边界处理
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes('WebGL')) {
        setError('您的浏览器不支持 WebGL，无法渲染 3D 场景');
      }
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (error) {
    return (
      <div style={{
        width: '100%',
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a1a1a',
        color: '#ffffff',
        fontSize: '14px',
        padding: '20px',
        textAlign: 'center',
      }}>
        <div>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0a0a0a',
      zIndex: 9999,
    }}>
      {/* 未来感背景 */}
      <FuturisticBackground />
      
      {/* 加载状态 */}
      {(isLoading || loadingProduction) && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(10, 10, 10, 0.9)',
          color: '#ffffff',
          zIndex: 10000,
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>
              {loadingProduction ? '🏭' : '📦'}
            </div>
            <div style={{ fontSize: '14px' }}>
              {loadingProduction ? '加载生产级数据中...' : '加载 3D 场景中...'}
            </div>
            {loadingProduction && (
              <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                解析 19 个面 • 24 个折线 • 38 个 Arc 指令
              </div>
            )}
          </div>
        </div>
      )}

      {/* 顶部导航岛 */}
      <TopIsland
        onSave={() => console.log('保存')}
        onExport={() => console.log('导出')}
      />

      {/* 3D 场景 - 全屏沉浸式 */}
      <Scene 
        height="100vh" 
        showControls={true} 
        layoutData={layoutData}
        useProduction={useProduction}
        productionData={productionData}
      />

      {/* 右侧属性岛 - 直接使用 Controls3D，不嵌套 */}
      {showControls && (
        <Controls3D
          position={controlsPosition}
          showAdvanced={showAdvanced}
          onClose={onClose}
        />
      )}

      {/* 性能提示 */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        fontSize: '10px',
        color: 'rgba(255, 255, 255, 0.3)',
        fontFamily: 'monospace',
        pointerEvents: 'none',
      }}>
        React Three Fiber + Lamina + WASM
      </div>
    </div>
  );
};

/**
 * 🎬 嵌入式 3D 预览 (用于卡片、弹窗等)
 */
export const View3DCompact: React.FC<{ foldProgress?: number; height?: string }> = ({
  foldProgress = 0.5,
  height = '300px',
}) => {
  return (
    <div style={{ position: 'relative', width: '100%', height, borderRadius: '8px', overflow: 'hidden' }}>
      <Scene height={height} showControls={false} foldProgress={foldProgress} />
    </div>
  );
};
