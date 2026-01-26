/**
 * 📐 FoldTab - 折叠标签页
 * 完全还原原版：折叠边编辑开关、根面板提示、带动关系
 */

import { memo, useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../store';
import { usePluginMessage } from '../../hooks/usePluginMessage';
import { CustomSelect } from './CustomSelect';
import { SEMANTIC_TOKENS } from '@genki/shared-theme';

export const FoldTab = memo(function FoldTab() {
  const {
    foldEdges,
    clipmaskVectors,
    foldSequence,
    panelNameMap,
    sourceFrameId,
    foldEdgeEditMode,
    setFoldEdgeEditMode,
    drivenMap,
  } = useAppStore(
    useShallow((s) => ({
      foldEdges: s.foldEdges,
      clipmaskVectors: s.clipmaskVectors,
      foldSequence: s.foldSequence,
      panelNameMap: s.panelNameMap,
      sourceFrameId: s.sourceFrameId,
      foldEdgeEditMode: s.foldEdgeEditMode,
      setFoldEdgeEditMode: s.setFoldEdgeEditMode,
      drivenMap: s.drivenMap,
    }))
  );
  const { sendMessage } = usePluginMessage();

  // 本地状态
  const [parentPanel, setParentPanel] = useState('');
  const [childPanel, setChildPanel] = useState('');
  const [manualRelations, setManualRelations] = useState<Record<string, string[]>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // 保存定时器
  const saveTimerRef = useRef<number | null>(null);

  // 当 store 中的 drivenMap 更新时，同步到本地状态
  useEffect(() => {
    if (drivenMap && Object.keys(drivenMap).length > 0) {
      setManualRelations(drivenMap);
    }
  }, [drivenMap]);

  // 自动保存带动关系到 Figma
  useEffect(() => {
    if (!sourceFrameId) return;

    // 清除之前的定时器
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // 延迟保存（防抖）
    saveTimerRef.current = setTimeout(() => {
      sendMessage({
        type: 'saveDrivenRelations',
        frameId: sourceFrameId,
        relations: {
          relations: manualRelations,
          order: []
        }
      } as any);
    }, 200);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [manualRelations, sourceFrameId, sendMessage]);

  // 获取面板显示名称
  const getPanelDisplayName = useCallback((id: string) => {
    return panelNameMap[id] || clipmaskVectors.find(v => v.id === id)?.name || id;
  }, [panelNameMap, clipmaskVectors]);

  // 获取所有面板选项（用于下拉列表）
  // 原版逻辑：只显示已分配折叠顺序的面板（foldSequence 中的面板）
  const allPanelOptions = useMemo(() => {
    // 获取已选中的面板 ID（在 foldSequence 中的）
    const selectedIds = new Set(foldSequence);

    // 从 clipmaskVectors 中筛选已选中的面板，并获取显示名称
    if (clipmaskVectors.length > 0 && selectedIds.size > 0) {
      return clipmaskVectors
        .filter(v => selectedIds.has(v.id))
        .map(v => panelNameMap[v.id] || v.name);
    }

    // 备选：如果没有 foldSequence，显示所有 clipmaskVectors
    if (clipmaskVectors.length > 0) {
      return clipmaskVectors.map(v => panelNameMap[v.id] || v.name);
    }

    // 最后备选：从 panelNameMap 获取
    const namesFromMap = Object.values(panelNameMap);
    if (namesFromMap.length > 0) {
      return namesFromMap;
    }
    return [];
  }, [panelNameMap, clipmaskVectors, foldSequence]);

  // 根据名称获取面板 ID
  const getPanelIdByName = useCallback((name: string) => {
    // 先检查 panelNameMap 的反向映射
    for (const [id, panelName] of Object.entries(panelNameMap)) {
      if (panelName === name) return id;
    }
    // 再检查 clipmaskVectors
    const found = clipmaskVectors.find(v => v.name === name);
    return found?.id || name;
  }, [panelNameMap, clipmaskVectors]);

  // 添加子面板到组 - 嵌套链式带动关系
  // 逻辑：选择父面板 1，依次添加 2, 3, 4 时：
  // - 1 → 2（第一个子节点直接挂在父节点下）
  // - 2 → 3（第二个子节点挂在第一个子节点下）
  // - 3 → 4（第三个子节点挂在第二个子节点下）
  const handleAddChildToGroup = useCallback(() => {
    if (!parentPanel) {
      alert('请选择父面板');
      return;
    }
    if (!childPanel) {
      alert('请选择子面板');
      return;
    }
    if (parentPanel === childPanel) {
      alert('父面板和子面板不能相同');
      return;
    }

    const parentId = getPanelIdByName(parentPanel);
    const childId = getPanelIdByName(childPanel);

    // 检查循环引用
    const wouldCreateCycle = (parent: string, child: string, relations: Record<string, string[]>): boolean => {
      if (parent === child) return true;
      const children = relations[child];
      if (!children) return false;
      for (const c of children) {
        if (c === parent || wouldCreateCycle(parent, c, relations)) {
          return true;
        }
      }
      return false;
    };

    setManualRelations(prev => {
      if (wouldCreateCycle(parentId, childId, prev)) {
        alert('不能添加：会造成循环引用');
        return prev;
      }

      const newRelations = { ...prev };
      const existingChildren = newRelations[parentId];

      if (existingChildren && existingChildren.length > 0) {
        // 父节点已有直接子节点，把新子节点添加到最后一个直接子节点下
        const lastDirectChild = existingChildren[existingChildren.length - 1];

        if (!newRelations[lastDirectChild]) {
          newRelations[lastDirectChild] = [];
        }
        if (!newRelations[lastDirectChild].includes(childId)) {
          newRelations[lastDirectChild].push(childId);
        }
      } else {
        // 没有子节点，直接添加
        if (!newRelations[parentId]) {
          newRelations[parentId] = [];
        }
        if (!newRelations[parentId].includes(childId)) {
          newRelations[parentId].push(childId);
        }
      }

      return newRelations;
    });

    setChildPanel('');
  }, [parentPanel, childPanel, getPanelIdByName]);

  // 删除整个组
  const handleRemoveGroup = useCallback((parentId: string) => {
    setManualRelations(prev => {
      const newRelations = { ...prev };
      delete newRelations[parentId];
      return newRelations;
    });
  }, []);

  // 从组中删除子面板
  const handleRemoveChild = useCallback((parentId: string, childId: string) => {
    setManualRelations(prev => {
      const newRelations = { ...prev };
      if (newRelations[parentId]) {
        newRelations[parentId] = newRelations[parentId].filter(c => c !== childId);
        if (newRelations[parentId].length === 0) {
          delete newRelations[parentId];
        }
      }
      return newRelations;
    });
  }, []);

  // 点击面板，设为父面板（方便继续添加子面板）
  const handleSelectAsParent = useCallback((panelName: string) => {
    setParentPanel(panelName);
  }, []);

  // 切换组展开/折叠
  const handleToggleExpand = useCallback((parentId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [parentId]: !prev[parentId]
    }));
  }, []);

  const handleAutoName = useCallback(() => {
    sendMessage({ type: 'AUTO_NAME_FOLDS' });
  }, [sendMessage]);

  const handleClearFoldOrder = useCallback(() => {
    sendMessage({ type: 'CLEAR_SELECTION' });
  }, [sendMessage]);

  // 重建链式带动关系：将扁平结构转换为嵌套链式结构
  // 递归处理所有层级，例如：
  // 1: [2, 3, 4] → 1: [2], 2: [3], 3: [4]
  // 2: [2-1T, 2-1B, 2-2T] → 2: [3, 2-1T, 2-1B], 2-1T: [2-2T] (T系列链式)
  const handleRebuildChainRelations = useCallback(() => {
    setManualRelations(prev => {
      const newRelations: Record<string, string[]> = {};
      const processed = new Set<string>();

      // 递归处理节点的子节点，将扁平结构转为链式
      const processNode = (nodeId: string) => {
        if (processed.has(nodeId)) return;
        processed.add(nodeId);

        const children = prev[nodeId];
        if (!children || children.length === 0) return;

        // 分类子节点：X轴面板、T面板、B面板
        const xPanels: string[] = [];
        const tPanels: string[] = [];
        const bPanels: string[] = [];

        children.forEach(childId => {
          const name = panelNameMap[childId] || childId;
          if (name.includes('T')) {
            tPanels.push(childId);
          } else if (name.includes('B')) {
            bPanels.push(childId);
          } else {
            xPanels.push(childId);
          }
        });

        // 构建当前节点的直接子节点（每类只保留第一个）
        const directChildren: string[] = [];
        if (xPanels.length > 0) directChildren.push(xPanels[0]);
        if (tPanels.length > 0) directChildren.push(tPanels[0]);
        if (bPanels.length > 0) directChildren.push(bPanels[0]);
        newRelations[nodeId] = directChildren;

        // X面板链式：2 → 3 → 4
        for (let i = 0; i < xPanels.length - 1; i++) {
          const current = xPanels[i];
          const next = xPanels[i + 1];
          if (!newRelations[current]) newRelations[current] = [];
          if (!newRelations[current].includes(next)) {
            newRelations[current].unshift(next);
          }
        }

        // T面板链式：2-1T → 2-2T → 2-3T
        for (let i = 0; i < tPanels.length - 1; i++) {
          const current = tPanels[i];
          const next = tPanels[i + 1];
          if (!newRelations[current]) newRelations[current] = [];
          if (!newRelations[current].includes(next)) {
            newRelations[current].push(next);
          }
        }

        // B面板链式：2-1B → 2-2B → 2-3B
        for (let i = 0; i < bPanels.length - 1; i++) {
          const current = bPanels[i];
          const next = bPanels[i + 1];
          if (!newRelations[current]) newRelations[current] = [];
          if (!newRelations[current].includes(next)) {
            newRelations[current].push(next);
          }
        }

        // 递归处理所有子节点
        children.forEach(childId => processNode(childId));
      };

      // 找出根节点并开始处理
      const allChildren = new Set<string>();
      Object.values(prev).forEach(children => {
        children.forEach(child => allChildren.add(child));
      });
      const rootNodes = Object.keys(prev).filter(p => !allChildren.has(p));

      rootNodes.forEach(rootId => processNode(rootId));

      return newRelations;
    });
  }, [panelNameMap]);

  // 找出根节点（没有被任何节点引用的节点）
  const getRootNodes = useCallback(() => {
    const allChildren = new Set<string>();
    Object.values(manualRelations).forEach(children => {
      children.forEach(child => allChildren.add(child));
    });
    return Object.keys(manualRelations).filter(parent => !allChildren.has(parent));
  }, [manualRelations]);

  // 递归渲染树节点 - 精致暗黑风格
  const renderTreeNode = useCallback((nodeId: string, depth: number = 0) => {
    const children = manualRelations[nodeId] || [];
    const isExpanded = expandedGroups[nodeId] !== false;
    const hasChildren = children.length > 0;

    return (
      <div key={nodeId} style={{ marginLeft: depth > 0 ? SEMANTIC_TOKENS.spacing.component.xl : '0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: SEMANTIC_TOKENS.spacing.component.xs,
            padding: `${SEMANTIC_TOKENS.spacing.component.xs} 6px`,
            margin: '2px 0',
            background: depth === 0 ? 'rgba(6, 182, 212, 0.08)' : 'transparent',
            borderRadius: SEMANTIC_TOKENS.border.radius.xs,
            cursor: 'pointer',
            transition: `all ${SEMANTIC_TOKENS.motion.duration.fast} ease`
          }}
          onMouseEnter={(e) => {
            if (depth > 0) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (depth > 0) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
          onClick={() => handleSelectAsParent(nodeId)}
        >
          {/* 展开/折叠按钮 - 极简精致版本 */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpand(nodeId);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.3)',
                cursor: 'pointer',
                padding: '2px',
                width: '14px',
                height: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '2px',
                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'all 150ms cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          ) : (
            <span style={{ width: '14px' }} />
          )}

          {/* 节点名称 - 使用面板显示名称 */}
          <span style={{
            fontSize: SEMANTIC_TOKENS.typography.fontSize.xs,
            fontFamily: 'monospace',
            color: depth === 0 ? 'rgba(6, 182, 212, 0.9)' : 'rgba(255, 255, 255, 0.8)',
            fontWeight: depth === 0 ? SEMANTIC_TOKENS.typography.fontWeight.medium : SEMANTIC_TOKENS.typography.fontWeight.regular,
            flex: 1,
            marginLeft: depth === 0 ? '0' : SEMANTIC_TOKENS.spacing.component.xs
          }}>
            {getPanelDisplayName(nodeId)}
          </span>

          {/* 子节点数量徽章 */}
          {hasChildren && (
            <span style={{
              fontSize: '9px',
              color: 'rgba(255, 255, 255, 0.4)',
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '2px 6px',
              borderRadius: SEMANTIC_TOKENS.border.radius.full,
              fontFamily: 'monospace'
            }}>
              {children.length}
            </span>
          )}

          {/* 删除按钮 - 精致设计 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (depth === 0) {
                handleRemoveGroup(nodeId);
              } else {
                for (const [parentId, childList] of Object.entries(manualRelations)) {
                  if (childList.includes(nodeId)) {
                    handleRemoveChild(parentId, nodeId);
                    break;
                  }
                }
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.3)',
              cursor: 'pointer',
              padding: '0',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: SEMANTIC_TOKENS.border.radius.sm,
              transition: `all ${SEMANTIC_TOKENS.motion.duration.fast} ease-out`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgba(239, 68, 68, 0.9)';
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* 递归渲染子节点 */}
        {hasChildren && isExpanded && (
          <div>
            {children.map(childId => renderTreeNode(childId, depth + 1))}
          </div>
        )}
      </div>
    );
  }, [manualRelations, expandedGroups, handleSelectAsParent, handleToggleExpand, handleRemoveGroup, handleRemoveChild, getPanelDisplayName]);

  return (
    <div className="panel-tab-content active">
      {/* 折叠边编辑开关 */}
      <div className="section">
        <div
          className={`toggle-row ${foldEdgeEditMode ? 'active' : ''}`}
          onClick={() => setFoldEdgeEditMode(!foldEdgeEditMode)}
        >
          <div>
            <div className="toggle-label">编辑折叠边</div>
            <div className="toggle-hint">开启后可 hover 高亮折叠线，右键删除</div>
          </div>
          <div className={`toggle-switch ${foldEdgeEditMode ? 'active' : ''}`} />
        </div>
      </div>

      {/* 根面板提示 */}
      <div className="section">
        <div style={{
          padding: SEMANTIC_TOKENS.spacing.component.md,
          background: 'rgba(245, 158, 11, 0.1)',
          borderRadius: SEMANTIC_TOKENS.border.radius.sm,
          fontSize: '10px',
          color: '#f59e0b'
        }}>
          💡 双击面板设为H面(根节点) | 开启编辑模式后右键删除折叠线
        </div>
      </div>

      {/* 带动关系 */}
      <div className="section">
        <div style={{
          fontSize: SEMANTIC_TOKENS.typography.fontSize.sm,
          fontWeight: SEMANTIC_TOKENS.typography.fontWeight.bold,
          color: SEMANTIC_TOKENS.color.text.primary,
          padding: `10px ${SEMANTIC_TOKENS.spacing.component.lg}`,
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: SEMANTIC_TOKENS.border.radius.sm,
          marginBottom: SEMANTIC_TOKENS.spacing.component.lg
        }}>
          带动关系
        </div>

        {/* 父子面板选择器 - 紧凑精致版 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr auto',
          gap: '6px',
          marginBottom: SEMANTIC_TOKENS.spacing.component.lg,
          alignItems: 'stretch'
        }}>
          <CustomSelect
            value={parentPanel}
            onChange={setParentPanel}
            options={allPanelOptions}
            placeholder="父面板"
            style={{
              minWidth: 0,
              fontSize: '10px'
            }}
          />
          <CustomSelect
            value={childPanel}
            onChange={setChildPanel}
            options={allPanelOptions}
            placeholder="子面板"
            style={{
              minWidth: 0,
              fontSize: '10px'
            }}
          />
          <button
            type="button"
            onClick={handleAddChildToGroup}
            style={{
              padding: '0',
              width: '32px',
              height: '100%',
              minHeight: '28px',
              background: SEMANTIC_TOKENS.color.button.primary.bg,
              border: 'none',
              borderRadius: SEMANTIC_TOKENS.border.radius.sm,
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: SEMANTIC_TOKENS.typography.fontWeight.bold,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: `all ${SEMANTIC_TOKENS.motion.duration.fast} ease`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = SEMANTIC_TOKENS.color.button.primary.hover;
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = SEMANTIC_TOKENS.color.button.primary.bg;
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            +
          </button>
        </div>

        {/* 带动关系列表 */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: SEMANTIC_TOKENS.border.radius.sm,
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: SEMANTIC_TOKENS.spacing.component.md,
          minHeight: '80px',
          maxHeight: '240px',
          overflowY: 'auto'
        }}>
          {Object.keys(manualRelations).length === 0 ? (
            <div style={{
              padding: SEMANTIC_TOKENS.spacing.component.xl,
              textAlign: 'center',
              fontSize: '10px',
              color: 'rgba(255, 255, 255, 0.3)',
              fontStyle: 'italic'
            }}>
              暂无带动关系
            </div>
          ) : (
            getRootNodes().map(rootId => renderTreeNode(rootId, 0))
          )}
        </div>

        {/* 重建链式关系按钮 */}
        {Object.keys(manualRelations).length > 0 && (
          <button
            type="button"
            onClick={handleRebuildChainRelations}
            style={{
              marginTop: SEMANTIC_TOKENS.spacing.component.md,
              padding: `${SEMANTIC_TOKENS.spacing.component.sm} ${SEMANTIC_TOKENS.spacing.component.md}`,
              width: '100%',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: SEMANTIC_TOKENS.border.radius.sm,
              color: '#f59e0b',
              fontSize: '10px',
              fontWeight: SEMANTIC_TOKENS.typography.fontWeight.medium,
              cursor: 'pointer',
              transition: `all ${SEMANTIC_TOKENS.motion.duration.fast} ease`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(245, 158, 11, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(245, 158, 11, 0.15)';
            }}
          >
            重建链式关系
          </button>
        )}
      </div>

      {/* 折叠边列表 */}
      <div className="section">
        <div className="section-title">折叠边列表</div>
        <div className="fold-edge-list">
          {foldEdges.length === 0 ? (
            <div style={{
              padding: SEMANTIC_TOKENS.spacing.component.lg,
              textAlign: 'center',
              fontSize: '10px',
              color: 'rgba(255, 255, 255, 0.4)'
            }}>
              暂无折叠边<br/>
              <span style={{ fontSize: '9px' }}>选择线条并点击添加折叠边</span>
            </div>
          ) : (
            foldEdges.map((edge) => (
              <div
                key={edge.id}
                className="fold-edge-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: `6px ${SEMANTIC_TOKENS.spacing.component.md}`,
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: SEMANTIC_TOKENS.border.radius.xs,
                  marginBottom: SEMANTIC_TOKENS.spacing.component.xs
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: SEMANTIC_TOKENS.spacing.component.md }}>
                  <span style={{
                    width: SEMANTIC_TOKENS.spacing.component.md,
                    height: SEMANTIC_TOKENS.spacing.component.md,
                    borderRadius: '50%',
                    background: edge.direction === 'L' ? '#3b82f6' :
                               edge.direction === 'R' ? '#22c55e' :
                               edge.direction === 'F' ? '#f59e0b' :
                               '#a855f7'
                  }} />
                  <span style={{ fontSize: SEMANTIC_TOKENS.typography.fontSize.xs, color: 'rgba(255, 255, 255, 0.9)' }}>
                    {edge.name}
                  </span>
                  <span style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    {edge.angle}°
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 操作按钮 */}
      <div style={{ display: 'flex', gap: SEMANTIC_TOKENS.spacing.component.md, marginTop: SEMANTIC_TOKENS.spacing.component.lg }}>
        <button
          type="button"
          className="secondary-btn"
          onClick={handleAutoName}
          style={{ flex: 1 }}
        >
          Auto Name
        </button>
        <button
          type="button"
          className="secondary-btn danger"
          onClick={handleClearFoldOrder}
          style={{ flex: 1 }}
        >
          Clear Order
        </button>
      </div>
    </div>
  );
});
