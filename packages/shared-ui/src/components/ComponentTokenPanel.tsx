import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useTokenStore } from "../store/useTokenStore";
import { IconManager } from "./IconManager";
import { TokenBindingSelector } from "./TokenBindingSelector";
import { BackgroundPresetSelector } from "./BackgroundPresetSelector";

// 简单的内存存储
const memoryStorage = {
  storage: {} as Record<string, string>,
  getItem(key: string) {
    return this.storage[key] || null;
  },
  setItem(key: string, value: string) {
    this.storage[key] = value;
  },
  removeItem(key: string) {
    delete this.storage[key];
  }
};

interface TokenDef {
  key: string;
  label: string;
  type:
    | "color"
    | "spacing"
    | "fontSize"
    | "fontWeight"
    | "radius"
    | "shadow"
    | "gradient"
    | "opacity"
    | "blur"
    | "other";
  category?: string;
  defaultValue?: string; // 默认值，支持引用其他token如 {shared-color-primary}
}
interface ComponentDef {
  id: string;
  name: string;
  icon: string;
  description?: string;
  group?: string; // 分组名称
  tokens: TokenDef[];
}

const COMPONENTS: ComponentDef[] = [
  // ========================================
  // COMPONENT TOKEN PANEL - 组件Token面板自身
  // � COMPONENT TOKEN PANEL - 组件Token面板自身
  // ========================================
  {
    id: "componentTokenPanel",
    name: "🎯 组件Token面板",
    icon: "🎯",
    description: "组件Token面板自身的样式tokens",
    tokens: [
      // === 面板容器 ===
      {
        key: "panel-background",
        label: "面板背景",
        type: "color",
        category: "容器",
        defaultValue: "rgba(15, 15, 15, 0.98)",
      },
      {
        key: "panel-border",
        label: "面板边框",
        type: "color",
        category: "容器",
        defaultValue: "rgba(245, 158, 11, 0.3)",
      },
      {
        key: "panel-border-radius",
        label: "面板圆角",
        type: "radius",
        category: "容器",
        defaultValue: "12px",
      },
      {
        key: "panel-shadow",
        label: "面板阴影",
        type: "shadow",
        category: "容器",
        defaultValue: "0 20px 60px rgba(0, 0, 0, 0.5)",
      },
      
      // === 标题栏 ===
      {
        key: "panel-header-background",
        label: "标题栏背景",
        type: "other",
        category: "标题栏",
        defaultValue: "linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.1))",
      },
      {
        key: "panel-header-title-color",
        label: "标题颜色",
        type: "color",
        category: "标题栏",
        defaultValue: "#f59e0b",
      },
      {
        key: "panel-header-subtitle-color",
        label: "副标题颜色",
        type: "color",
        category: "标题栏",
        defaultValue: "rgba(255,255,255,0.5)",
      },
      
      // === 按钮 ===
      {
        key: "panel-button-background",
        label: "按钮背景",
        type: "color",
        category: "按钮",
        defaultValue: "rgba(255,255,255,0.05)",
      },
      {
        key: "panel-button-border",
        label: "按钮边框",
        type: "color",
        category: "按钮",
        defaultValue: "rgba(255,255,255,0.1)",
      },
      {
        key: "panel-button-radius",
        label: "按钮圆角",
        type: "radius",
        category: "按钮",
        defaultValue: "6px",
      },
      
      // === 分类 ===
      {
        key: "panel-category-background",
        label: "分类背景",
        type: "color",
        category: "分类",
        defaultValue: "rgba(255,255,255,0.03)",
      },
      {
        key: "panel-category-background-active",
        label: "分类背景(激活)",
        type: "color",
        category: "分类",
        defaultValue: "rgba(245, 158, 11, 0.1)",
      },
      {
        key: "panel-category-border",
        label: "分类边框",
        type: "color",
        category: "分类",
        defaultValue: "rgba(255,255,255,0.05)",
      },
      {
        key: "panel-category-border-active",
        label: "分类边框(激活)",
        type: "color",
        category: "分类",
        defaultValue: "rgba(245, 158, 11, 0.3)",
      },
      
      // === Token输入框 ===
      {
        key: "panel-input-background",
        label: "输入框背景",
        type: "color",
        category: "输入框",
        defaultValue: "rgba(0,0,0,0.5)",
      },
      {
        key: "panel-input-border",
        label: "输入框边框",
        type: "color",
        category: "输入框",
        defaultValue: "rgba(255,255,255,0.1)",
      },
      {
        key: "panel-input-text-color",
        label: "输入框文字",
        type: "color",
        category: "输入框",
        defaultValue: "white",
      },
      {
        key: "panel-input-reference-color",
        label: "引用文字颜色",
        type: "color",
        category: "输入框",
        defaultValue: "#06b6d4",
      },
    ],
  },
  
  // ========================================
  // � SHARED TOKENS - 共用设计令牌
  // ========================================
  {
    id: "sharedTokens",
    name: "🎨 共用 Tokens",
    icon: "🎨",
    description: "全局共用的设计令牌，修改后会同步到所有引用的地方",
    tokens: [
      // === Semantic Colors - 语义化颜色 ===
      {
        key: "semantic-color-success",
        label: "成功色",
        type: "color",
        category: "语义颜色",
        defaultValue: "#22c55e",
      },
      {
        key: "semantic-color-warning",
        label: "警告色",
        type: "color",
        category: "语义颜色",
        defaultValue: "#f59e0b",
      },
      {
        key: "semantic-color-error",
        label: "错误色",
        type: "color",
        category: "语义颜色",
        defaultValue: "#ef4444",
      },
      {
        key: "semantic-color-info",
        label: "信息色",
        type: "color",
        category: "语义颜色",
        defaultValue: "#3b82f6",
      },
      {
        key: "semantic-color-brand",
        label: "品牌色",
        type: "color",
        category: "语义颜色",
        defaultValue: "#8b5cf6",
      },
      {
        key: "semantic-color-link",
        label: "链接色",
        type: "color",
        category: "语义颜色",
        defaultValue: "#06b6d4",
      },
      {
        key: "semantic-color-disabled",
        label: "禁用色",
        type: "color",
        category: "语义颜色",
        defaultValue: "#6b7280",
      },
      
      // === Base Colors - 基础颜色 ===
      {
        key: "shared-color-primary",
        label: "主色调",
        type: "color",
        category: "基础颜色",
      },
      {
        key: "shared-color-secondary",
        label: "次要色",
        type: "color",
        category: "基础颜色",
        defaultValue: "#764ba2",
      },
      {
        key: "shared-color-accent",
        label: "强调色",
        type: "color",
        category: "基础颜色",
        defaultValue: "#f59e0b",
      },
      {
        key: "shared-color-text-primary",
        label: "主要文字颜色",
        type: "color",
        category: "基础颜色",
        defaultValue: "#ffffff",
      },
      {
        key: "shared-color-text-secondary",
        label: "次要文字颜色",
        type: "color",
        category: "基础颜色",
        defaultValue: "rgba(255, 255, 255, 0.6)",
      },
      {
        key: "shared-color-background",
        label: "背景色",
        type: "color",
        category: "基础颜色",
        defaultValue: "rgba(0, 0, 0, 0.3)",
      },
      {
        key: "shared-color-border",
        label: "边框颜色",
        type: "color",
        category: "基础颜色",
        defaultValue: "rgba(255, 255, 255, 0.1)",
      },
      
      // === Semantic Spacing - 语义化间距 ===
      {
        key: "semantic-spacing-component-gap",
        label: "组件间距",
        type: "spacing",
        category: "语义间距",
        defaultValue: "{shared-spacing-md}",
      },
      {
        key: "semantic-spacing-section-gap",
        label: "区块间距",
        type: "spacing",
        category: "语义间距",
        defaultValue: "{shared-spacing-lg}",
      },
      {
        key: "semantic-spacing-inline-gap",
        label: "行内间距",
        type: "spacing",
        category: "语义间距",
        defaultValue: "{shared-spacing-sm}",
      },
      
      // === Base Spacing - 基础间距 ===
      {
        key: "shared-spacing-xs",
        label: "超小间距",
        type: "spacing",
        category: "基础间距",
        defaultValue: "4px",
      },
      {
        key: "shared-spacing-sm",
        label: "小间距",
        type: "spacing",
        category: "基础间距",
        defaultValue: "8px",
      },
      {
        key: "shared-spacing-md",
        label: "中等间距",
        type: "spacing",
        category: "基础间距",
        defaultValue: "16px",
      },
      {
        key: "shared-spacing-lg",
        label: "大间距",
        type: "spacing",
        category: "基础间距",
        defaultValue: "24px",
      },
      {
        key: "shared-spacing-xl",
        label: "超大间距",
        type: "spacing",
        category: "基础间距",
        defaultValue: "32px",
      },
      {
        key: "shared-radius-sm",
        label: "小圆角",
        type: "radius",
        category: "基础形状",
        defaultValue: "4px",
      },
      {
        key: "shared-radius-md",
        label: "中等圆角",
        type: "radius",
        category: "基础形状",
        defaultValue: "8px",
      },
      {
        key: "shared-radius-lg",
        label: "大圆角",
        type: "radius",
        category: "基础形状",
        defaultValue: "12px",
      },
      {
        key: "shared-fontSize-xs",
        label: "超小字号",
        type: "fontSize",
        category: "基础文字",
        defaultValue: "11px",
      },
      {
        key: "shared-fontSize-sm",
        label: "小字号",
        type: "fontSize",
        category: "基础文字",
        defaultValue: "12px",
      },
      {
        key: "shared-fontSize-md",
        label: "中等字号",
        type: "fontSize",
        category: "基础文字",
        defaultValue: "14px",
      },
      {
        key: "shared-fontSize-lg",
        label: "大字号",
        type: "fontSize",
        category: "基础文字",
        defaultValue: "16px",
      },
      {
        key: "shared-fontSize-xl",
        label: "超大字号",
        type: "fontSize",
        category: "基础文字",
        defaultValue: "20px",
      },
      {
        key: "shared-fontWeight-normal",
        label: "正常字重",
        type: "fontWeight",
        category: "基础文字",
        defaultValue: "400",
      },
      {
        key: "shared-fontWeight-medium",
        label: "中等字重",
        type: "fontWeight",
        category: "基础文字",
        defaultValue: "500",
      },
      {
        key: "shared-fontWeight-bold",
        label: "粗体字重",
        type: "fontWeight",
        category: "基础文字",
        defaultValue: "600",
      },
      {
        key: "shared-shadow-sm",
        label: "小阴影",
        type: "shadow",
        category: "基础效果",
        defaultValue: "0 1px 2px rgba(0, 0, 0, 0.05)",
      },
      {
        key: "shared-shadow-md",
        label: "中等阴影",
        type: "shadow",
        category: "基础效果",
        defaultValue: "0 4px 6px rgba(0, 0, 0, 0.1)",
      },
      {
        key: "shared-shadow-lg",
        label: "大阴影",
        type: "shadow",
        category: "基础效果",
        defaultValue: "0 10px 15px rgba(0, 0, 0, 0.1)",
      },
    ],
  },
  
  // ========================================
  // 🔝 TOP BAR - 顶部工具栏区域
  // ========================================
  {
    id: "topBar",
    name: "🔝 顶部工具栏",
    icon: "🔝",
    description: "顶部导航栏容器",
    tokens: [
      {
        key: "topBar-height",
        label: "高度",
        type: "spacing",
        category: "布局",
        defaultValue: "60px",
      },
      {
        key: "topBar-background-type",
        label: "背景类型",
        type: "other",
        category: "背景",
        defaultValue: "color", // color | gradient | image | video | lottie | code
      },
      {
        key: "topBar-background",
        label: "背景（颜色/渐变）",
        type: "other",
        category: "背景",
        defaultValue: "{shared-color-background}",
      },
      {
        key: "topBar-background-image",
        label: "背景图片URL",
        type: "other",
        category: "背景",
        defaultValue: "",
      },
      {
        key: "topBar-background-image-scale",
        label: "背景图片缩放",
        type: "other",
        category: "背景",
        defaultValue: "1",
      },
      {
        key: "topBar-background-image-x",
        label: "背景图片X位置",
        type: "other",
        category: "背景",
        defaultValue: "50%",
      },
      {
        key: "topBar-background-image-y",
        label: "背景图片Y位置",
        type: "other",
        category: "背景",
        defaultValue: "50%",
      },
      {
        key: "topBar-background-video",
        label: "背景视频URL",
        type: "other",
        category: "背景",
        defaultValue: "",
      },
      {
        key: "topBar-background-lottie",
        label: "Lottie动画URL",
        type: "other",
        category: "背景",
        defaultValue: "",
      },
      {
        key: "topBar-background-code",
        label: "动态背景代码",
        type: "other",
        category: "背景",
        defaultValue: "",
      },
      {
        key: "topBar-background-size",
        label: "背景尺寸",
        type: "other",
        category: "背景",
        defaultValue: "cover",
      },
      {
        key: "topBar-background-position",
        label: "背景位置",
        type: "other",
        category: "背景",
        defaultValue: "center",
      },
      {
        key: "topBar-background-repeat",
        label: "背景重复",
        type: "other",
        category: "背景",
        defaultValue: "no-repeat",
      },
      {
        key: "topBar-background-opacity",
        label: "背景透明度",
        type: "other",
        category: "背景",
        defaultValue: "1",
      },
      {
        key: "topBar-border",
        label: "边框颜色",
        type: "color",
        category: "颜色",
        defaultValue: "{shared-color-border}",
      },
      {
        key: "topBar-padding-x",
        label: "水平内边距",
        type: "spacing",
        category: "布局",
        defaultValue: "{shared-spacing-lg}",
      },
      {
        key: "topBar-gap",
        label: "元素间距",
        type: "spacing",
        category: "布局",
        defaultValue: "{shared-spacing-md}",
      },
      {
        key: "topBar-blur",
        label: "背景模糊",
        type: "blur",
        category: "效果",
        defaultValue: "20px",
      },
      {
        key: "topBar-overlay-opacity",
        label: "毛玻璃蒙层透明度",
        type: "other",
        category: "效果",
        defaultValue: "0.3",
      },
      {
        key: "topBar-overlay-blur",
        label: "毛玻璃模糊强度",
        type: "blur",
        category: "效果",
        defaultValue: "10px",
      },
    ],
  },
  {
    id: "topBar-logo",
    name: "  ├─ Logo",
    icon: "✈️",
    description: "应用Logo图标",
    tokens: [
      {
        key: "topBar-logo-size",
        label: "Logo大小",
        type: "spacing",
        category: "布局",
        defaultValue: "32px",
      },
      {
        key: "topBar-logo-background",
        label: "Logo背景",
        type: "gradient",
        category: "颜色",
        defaultValue: "linear-gradient(135deg, {shared-color-primary} 0%, {shared-color-secondary} 100%)",
      },
      {
        key: "topBar-logo-fontSize",
        label: "图标字号",
        type: "fontSize",
        category: "文字",
        defaultValue: "{shared-fontSize-lg}",
      },
    ],
  },
  {
    id: "appTitle",
    name: "  ├─ 应用标题",
    icon: "✈️",
    description: "主标题和副标题",
    tokens: [
      {
        key: "title-h1-fontSize-default",
        label: "主标题字号",
        type: "fontSize",
        category: "文字",
        defaultValue: "{shared-fontSize-xl}",
      },
      {
        key: "title-h1-fontWeight-default",
        label: "主标题字重",
        type: "fontWeight",
        category: "文字",
        defaultValue: "{shared-fontWeight-bold}",
      },
      {
        key: "title-h1-color-default",
        label: "主标题颜色",
        type: "color",
        category: "颜色",
        defaultValue: "{shared-color-text-primary}",
      },
      {
        key: "title-caption-fontSize-default",
        label: "副标题字号",
        type: "fontSize",
        category: "文字",
        defaultValue: "{shared-fontSize-xs}",
      },
      {
        key: "title-caption-fontWeight-default",
        label: "副标题字重",
        type: "fontWeight",
        category: "文字",
        defaultValue: "{shared-fontWeight-normal}",
      },
      {
        key: "title-caption-color-default",
        label: "副标题颜色",
        type: "color",
        category: "颜色",
        defaultValue: "{shared-color-text-secondary}",
      },
    ],
  },
  {
    id: "navButtons",
    name: "  ├─ 模式按钮",
    icon: "🔘",
    description: "展开/折叠按钮",
    tokens: [
      {
        key: "ui-button-secondary-fontSize-default",
        label: "按钮字号",
        type: "fontSize",
        category: "文字",
        defaultValue: "{shared-fontSize-xs}",
      },
      {
        key: "ui-button-secondary-fontWeight-default",
        label: "按钮字重",
        type: "fontWeight",
        category: "文字",
        defaultValue: "{shared-fontWeight-medium}",
      },
      {
        key: "ui-button-secondary-color-default",
        label: "按钮文字颜色",
        type: "color",
        category: "颜色",
        defaultValue: "{shared-color-text-secondary}",
      },
    ],
  },
  {
    id: "panelButtons",
    name: "  └─ 面板切换按钮",
    icon: "🎛",
    description: "设计/Tune/组件按钮",
    tokens: [
      {
        key: "ui-button-secondary-fontSize-default",
        label: "按钮字号",
        type: "fontSize",
        category: "文字",
        defaultValue: "{shared-fontSize-xs}",
      },
      {
        key: "ui-button-secondary-fontWeight-default",
        label: "按钮字重",
        type: "fontWeight",
        category: "文字",
        defaultValue: "{shared-fontWeight-medium}",
      },
    ],
  },
  
  // ========================================
  // 🌌 CANVAS AREA - 画布区域
  // ========================================
  {
    id: "canvasArea",
    name: "🌌 画布区域",
    icon: "🌌",
    description: "主画布容器",
    tokens: [
      {
        key: "background-gradient",
        label: "渐变背景",
        type: "gradient",
        category: "颜色",
        defaultValue: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      },
    ],
  },
  {
    id: "background",
    name: "  ├─ 背景样式",
    icon: "🎨",
    description: "网格和波点背景",
    tokens: [
      {
        key: "background-grid-size",
        label: "网格大小",
        type: "spacing",
        category: "布局",
        defaultValue: "15px",
      },
      {
        key: "background-grid-color",
        label: "网格颜色",
        type: "color",
        category: "颜色",
        defaultValue: "#bed5fe",
      },
      {
        key: "background-grid-opacity",
        label: "网格透明度",
        type: "other",
        category: "效果",
        defaultValue: "0.15",
      },
      {
        key: "background-dot-size",
        label: "波点大小",
        type: "spacing",
        category: "布局",
        defaultValue: "1px",
      },
      {
        key: "background-dot-spacing",
        label: "波点间距",
        type: "spacing",
        category: "布局",
        defaultValue: "20px",
      },
      {
        key: "background-dot-color",
        label: "波点颜色",
        type: "color",
        category: "颜色",
        defaultValue: "#bed5fe",
      },
    ],
  },
  {
    id: "infoCard",
    name: "  └─ 信息卡片",
    icon: "💳",
    description: "显示部件数量、总面积",
    tokens: [
      {
        key: "infoCard-container-background-default",
        label: "容器背景",
        type: "color",
        category: "颜色",
      },
      {
        key: "infoCard-container-border-default",
        label: "容器边框",
        type: "color",
        category: "颜色",
      },
      {
        key: "infoCard-container-borderRadius-default",
        label: "圆角",
        type: "radius",
        category: "形状",
      },
      {
        key: "infoCard-container-padding-default",
        label: "内边距",
        type: "spacing",
        category: "布局",
      },
      {
        key: "infoCard-label-fontSize-default",
        label: "标签字号",
        type: "fontSize",
        category: "文字",
      },
      {
        key: "infoCard-label-color-default",
        label: "标签颜色",
        type: "color",
        category: "颜色",
      },
      {
        key: "infoCard-value-fontSize-default",
        label: "数值字号",
        type: "fontSize",
        category: "文字",
      },
      {
        key: "infoCard-value-color-default",
        label: "数值颜色",
        type: "color",
        category: "颜色",
      },
    ],
  },
  
  // ========================================
  // ⚙️ DEFAULT PANEL - 默认面板（右侧）
  // ========================================
  {
    id: "defaultPanel",
    name: "⚙️ 默认面板",
    icon: "⚙️",
    description: "右侧参数控制面板容器",
    tokens: [
      {
        key: "defaultPanel-width",
        label: "宽度",
        type: "spacing",
        category: "布局",
      },
      {
        key: "defaultPanel-background",
        label: "背景",
        type: "other",
        category: "颜色",
      },
      {
        key: "defaultPanel-border",
        label: "边框",
        type: "color",
        category: "颜色",
      },
      {
        key: "defaultPanel-padding",
        label: "内边距",
        type: "spacing",
        category: "布局",
      },
      {
        key: "defaultPanel-section-gap",
        label: "区块间距",
        type: "spacing",
        category: "布局",
      },
    ],
  },
  {
    id: "defaultPanel-labels",
    name: "  ├─ 标签文字",
    icon: "🏷",
    description: "参数标签样式",
    tokens: [
      {
        key: "defaultPanel-label-fontSize",
        label: "标签字号",
        type: "fontSize",
        category: "文字",
      },
      {
        key: "defaultPanel-label-color",
        label: "标签颜色",
        type: "color",
        category: "颜色",
      },
    ],
  },
  {
    id: "buttonPrimary",
    name: "  └─ 导出按钮",
    icon: "🔵",
    description: "主要操作按钮",
    tokens: [
      {
        key: "button-primary-background-default",
        label: "背景",
        type: "gradient",
        category: "颜色",
        defaultValue: "linear-gradient(135deg, {shared-color-primary} 0%, {shared-color-accent} 100%)",
      },
      {
        key: "button-primary-color-default",
        label: "文字颜色",
        type: "color",
        category: "颜色",
        defaultValue: "{shared-color-text-primary}",
      },
      {
        key: "button-primary-fontSize-default",
        label: "字号",
        type: "fontSize",
        category: "文字",
        defaultValue: "{shared-fontSize-md}",
      },
      {
        key: "button-primary-fontWeight-default",
        label: "字重",
        type: "fontWeight",
        category: "文字",
        defaultValue: "{shared-fontWeight-medium}",
      },
      {
        key: "button-primary-borderRadius-default",
        label: "圆角",
        type: "radius",
        category: "形状",
        defaultValue: "{shared-radius-md}",
      },
      {
        key: "button-primary-padding-default",
        label: "内边距",
        type: "spacing",
        category: "布局",
        defaultValue: "{shared-spacing-md}",
      },
    ],
  },
  
  // ========================================
  // ✨ DESIGN PANEL - 设计面板
  // ========================================
  {
    id: "designPanel",
    name: "✨ 设计面板",
    icon: "✨",
    description: "设计编辑器面板",
    tokens: [
      {
        key: "designPanel-background",
        label: "背景",
        type: "other",
        category: "颜色",
      },
      {
        key: "designPanel-blur",
        label: "模糊效果",
        type: "blur",
        category: "效果",
      },
      {
        key: "designPanel-border",
        label: "边框",
        type: "color",
        category: "颜色",
      },
      {
        key: "designPanel-shadow",
        label: "阴影",
        type: "shadow",
        category: "效果",
      },
      {
        key: "designPanel-title-fontSize",
        label: "标题字号",
        type: "fontSize",
        category: "文字",
      },
      {
        key: "designPanel-title-color",
        label: "标题颜色",
        type: "color",
        category: "颜色",
      },
    ],
  },
  
  // ========================================
  // � UI COMPONENTS - 通用UI组件
  // ========================================
  {
    id: "colorPreview",
    name: "🎨 颜色预览组件",
    icon: "🎨",
    description: "颜色选择器的预览色块",
    tokens: [
      {
        key: "colorPreview-size",
        label: "色块大小",
        type: "spacing",
        category: "布局",
        defaultValue: "24px",
      },
      {
        key: "colorPreview-border",
        label: "边框颜色",
        type: "color",
        category: "颜色",
        defaultValue: "{shared-color-border}",
      },
      {
        key: "colorPreview-borderRadius",
        label: "圆角",
        type: "radius",
        category: "形状",
        defaultValue: "{shared-radius-sm}",
      },
      {
        key: "colorPreview-shadow",
        label: "阴影",
        type: "shadow",
        category: "效果",
        defaultValue: "{shared-shadow-sm}",
      },
    ],
  },
  {
    id: "inputField",
    name: "📝 输入框组件",
    icon: "📝",
    description: "文本输入框样式",
    tokens: [
      {
        key: "input-background",
        label: "背景色",
        type: "color",
        category: "颜色",
        defaultValue: "rgba(255, 255, 255, 0.05)",
      },
      {
        key: "input-border",
        label: "边框颜色",
        type: "color",
        category: "颜色",
        defaultValue: "{shared-color-border}",
      },
      {
        key: "input-borderRadius",
        label: "圆角",
        type: "radius",
        category: "形状",
        defaultValue: "{shared-radius-sm}",
      },
      {
        key: "input-padding",
        label: "内边距",
        type: "spacing",
        category: "布局",
        defaultValue: "{shared-spacing-sm}",
      },
      {
        key: "input-fontSize",
        label: "字号",
        type: "fontSize",
        category: "文字",
        defaultValue: "{shared-fontSize-sm}",
      },
      {
        key: "input-color",
        label: "文字颜色",
        type: "color",
        category: "颜色",
        defaultValue: "{shared-color-text-primary}",
      },
      {
        key: "input-focus-border",
        label: "聚焦边框",
        type: "color",
        category: "颜色",
        defaultValue: "{shared-color-primary}",
      },
    ],
  },
  {
    id: "iconButton",
    name: "🔘 图标按钮",
    icon: "🔘",
    description: "纯图标按钮样式",
    tokens: [
      {
        key: "iconButton-size",
        label: "按钮大小",
        type: "spacing",
        category: "布局",
        defaultValue: "32px",
      },
      {
        key: "iconButton-background",
        label: "背景色",
        type: "color",
        category: "颜色",
        defaultValue: "rgba(255, 255, 255, 0.05)",
      },
      {
        key: "iconButton-hover-background",
        label: "悬停背景",
        type: "color",
        category: "颜色",
        defaultValue: "rgba(255, 255, 255, 0.1)",
      },
      {
        key: "iconButton-border",
        label: "边框",
        type: "color",
        category: "颜色",
        defaultValue: "{shared-color-border}",
      },
      {
        key: "iconButton-borderRadius",
        label: "圆角",
        type: "radius",
        category: "形状",
        defaultValue: "{shared-radius-sm}",
      },
      {
        key: "iconButton-iconSize",
        label: "图标大小",
        type: "fontSize",
        category: "文字",
        defaultValue: "{shared-fontSize-md}",
      },
    ],
  },
  {
    id: "tooltip",
    name: "💬 提示框",
    icon: "💬",
    description: "悬停提示框样式",
    tokens: [
      {
        key: "tooltip-background",
        label: "背景色",
        type: "color",
        category: "颜色",
        defaultValue: "rgba(0, 0, 0, 0.9)",
      },
      {
        key: "tooltip-color",
        label: "文字颜色",
        type: "color",
        category: "颜色",
        defaultValue: "{shared-color-text-primary}",
      },
      {
        key: "tooltip-fontSize",
        label: "字号",
        type: "fontSize",
        category: "文字",
        defaultValue: "{shared-fontSize-xs}",
      },
      {
        key: "tooltip-padding",
        label: "内边距",
        type: "spacing",
        category: "布局",
        defaultValue: "{shared-spacing-sm}",
      },
      {
        key: "tooltip-borderRadius",
        label: "圆角",
        type: "radius",
        category: "形状",
        defaultValue: "{shared-radius-sm}",
      },
      {
        key: "tooltip-shadow",
        label: "阴影",
        type: "shadow",
        category: "效果",
        defaultValue: "{shared-shadow-lg}",
      },
    ],
  },
  
  // ========================================
  // 🎯 COMPONENT TOKEN PANEL - 组件Token面板
  // ========================================
  {
    id: "componentPanel",
    name: "🎯 组件Token面板",
    icon: "🎯",
    description: "组件Token管理面板样式",
    tokens: [
      {
        key: "componentPanel-background",
        label: "面板背景",
        type: "other",
        category: "颜色",
        defaultValue: "rgba(15, 15, 15, 0.98)",
      },
      {
        key: "componentPanel-border",
        label: "面板边框",
        type: "color",
        category: "颜色",
        defaultValue: "rgba(245, 158, 11, 0.3)",
      },
      {
        key: "componentPanel-borderRadius",
        label: "面板圆角",
        type: "radius",
        category: "形状",
        defaultValue: "{shared-radius-lg}",
      },
      {
        key: "componentPanel-shadow",
        label: "面板阴影",
        type: "shadow",
        category: "效果",
        defaultValue: "0 20px 60px rgba(0, 0, 0, 0.5)",
      },
      {
        key: "componentPanel-header-background",
        label: "标题栏背景",
        type: "gradient",
        category: "颜色",
        defaultValue: "linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.1))",
      },
      {
        key: "componentPanel-header-title-color",
        label: "标题颜色",
        type: "color",
        category: "颜色",
        defaultValue: "{shared-color-accent}",
      },
      {
        key: "componentPanel-header-title-fontSize",
        label: "标题字号",
        type: "fontSize",
        category: "文字",
        defaultValue: "15px",
      },
      {
        key: "componentPanel-header-subtitle-color",
        label: "副标题颜色",
        type: "color",
        category: "颜色",
        defaultValue: "{shared-color-text-secondary}",
      },
      {
        key: "componentPanel-header-subtitle-fontSize",
        label: "副标题字号",
        type: "fontSize",
        category: "文字",
        defaultValue: "9px",
      },
      {
        key: "componentPanel-button-size",
        label: "按钮大小",
        type: "spacing",
        category: "布局",
        defaultValue: "28px",
      },
      {
        key: "componentPanel-button-gap",
        label: "按钮间距",
        type: "spacing",
        category: "布局",
        defaultValue: "6px",
      },
      {
        key: "componentPanel-content-padding",
        label: "内容内边距",
        type: "spacing",
        category: "布局",
        defaultValue: "{shared-spacing-md}",
      },
    ],
  },
  
  // ========================================
  // �� TUNE PANEL - Token调音台
  // ========================================
  {
    id: "tokenTuner",
    name: "🏛 Tune面板",
    icon: "🏛",
    description: "Token调音台面板容器",
    tokens: [
      {
        key: "tokenTuner-panel-background",
        label: "面板背景（rgba格式）",
        type: "other",
        category: "颜色",
      },
      {
        key: "tokenTuner-panel-border",
        label: "面板边框",
        type: "color",
        category: "颜色",
      },
      {
        key: "tokenTuner-panel-shadow",
        label: "面板阴影",
        type: "shadow",
        category: "效果",
      },
      {
        key: "tokenTuner-panel-blur",
        label: "面板模糊（磨砂效果）",
        type: "blur",
        category: "效果",
      },
      {
        key: "tokenTuner-padding-x",
        label: "水平内边距",
        type: "spacing",
        category: "布局",
      },
      {
        key: "tokenTuner-padding-y",
        label: "垂直内边距",
        type: "spacing",
        category: "布局",
      },
      {
        key: "tokenTuner-title-fontSize",
        label: "标题字号",
        type: "fontSize",
        category: "文字",
      },
      {
        key: "tokenTuner-title-color",
        label: "标题颜色",
        type: "color",
        category: "颜色",
      },
      {
        key: "tokenTuner-input-gap",
        label: "输入框间距",
        type: "spacing",
        category: "布局",
      },
      {
        key: "tokenTuner-input-border",
        label: "输入框边框",
        type: "color",
        category: "颜色",
      },
      {
        key: "tokenTuner-button-brand-background",
        label: "品牌按钮背景",
        type: "gradient",
        category: "颜色",
      },
    ],
  },
  {
    id: "tokenItem",
    name: "  ├─ Token 项",
    icon: "🎯",
    description: "单个 Token 编辑项样式",
    tokens: [
      {
        key: "tokenItem-gap",
        label: "元素间距",
        type: "spacing",
        category: "布局",
      },
      {
        key: "tokenItem-margin-bottom",
        label: "底部外边距",
        type: "spacing",
        category: "布局",
      },
      {
        key: "tokenItem-padding-x",
        label: "水平内边距",
        type: "spacing",
        category: "布局",
      },
      {
        key: "tokenItem-padding-y",
        label: "垂直内边距",
        type: "spacing",
        category: "布局",
      },
      {
        key: "tokenItem-hover-background",
        label: "悬停背景",
        type: "color",
        category: "颜色",
      },
      {
        key: "tokenItem-label-fontSize",
        label: "标签字号",
        type: "fontSize",
        category: "文字",
      },
      {
        key: "tokenItem-label-color",
        label: "标签颜色",
        type: "color",
        category: "颜色",
      },
      {
        key: "tokenItem-input-background",
        label: "输入框背景",
        type: "color",
        category: "颜色",
      },
      {
        key: "tokenItem-input-border",
        label: "输入框边框",
        type: "color",
        category: "颜色",
      },
      {
        key: "tokenItem-input-borderRadius",
        label: "输入框圆角",
        type: "radius",
        category: "形状",
      },
    ],
  },
  {
    id: "collapsibleGroup",
    name: "  └─ 折叠组",
    icon: "📁",
    description: "Token 分组折叠组件样式",
    tokens: [
      {
        key: "collapsibleGroup-padding-x",
        label: "水平内边距",
        type: "spacing",
        category: "布局",
      },
      {
        key: "collapsibleGroup-padding-y",
        label: "垂直内边距",
        type: "spacing",
        category: "布局",
      },
      {
        key: "collapsibleGroup-margin-bottom",
        label: "底部外边距",
        type: "spacing",
        category: "布局",
      },
      {
        key: "collapsibleGroup-gap",
        label: "内容间距",
        type: "spacing",
        category: "布局",
      },
      {
        key: "collapsibleGroup-hover-background",
        label: "悬停背景",
        type: "color",
        category: "颜色",
      },
      {
        key: "collapsibleGroup-border-radius",
        label: "圆角",
        type: "radius",
        category: "形状",
      },
      {
        key: "collapsibleGroup-title-fontSize",
        label: "标题字号",
        type: "fontSize",
        category: "文字",
      },
      {
        key: "collapsibleGroup-title-color",
        label: "标题颜色",
        type: "color",
        category: "颜色",
      },
    ],
  },
];

const AccordionItem: React.FC<{
  component: ComponentDef;
  isOpen: boolean;
  onToggle: () => void;
  isSelected: boolean;
  onSelect: () => void;
  highlightEnabled: boolean;
}> = ({ component, isOpen, onToggle, isSelected, onSelect, highlightEnabled }) => {
  const allTokens = useTokenStore((s) => s.tokens);
  const resolvedTokens = useTokenStore((s) => s.resolvedTokens);
  const setToken = useTokenStore((s) => s.setToken);
  const [bindingSelectorOpen, setBindingSelectorOpen] = useState(false);
  const [bindingSelectorPosition, setBindingSelectorPosition] = useState({
    x: 0,
    y: 0,
  });
  const [bindingTargetKey, setBindingTargetKey] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 自动转换 rgba 格式
  useEffect(() => {
    Object.keys(allTokens).forEach(key => {
      if (key.includes('background')) {
        const value = allTokens[key];
        // 检测是否需要转换：包含token引用但不是rgba格式
        if (value && value.includes('{') && !value.startsWith('rgba(')) {
          const tokenMatches = value.match(/\{[^}]+\}/g);
          // 如果有至少一个opacity token，自动转换
          if (tokenMatches && tokenMatches.some(t => t.includes('opacity'))) {
            if (tokenMatches.length >= 2) {
              const colorToken = tokenMatches[0];
              const opacityToken = tokenMatches.find(t => t.includes('opacity')) || tokenMatches[tokenMatches.length - 1];
              
              // 自动包裹为 rgba 格式
              // resolveTokenValue 会自动处理 hex 转 RGB
              const wrapped = `rgba(${colorToken}, ${opacityToken})`;
              if (wrapped !== value) {
                setToken(key, wrapped);
              }
            }
          }
        }
      }
    });
  }, [allTokens, resolvedTokens, setToken]);

  // 当组件被选中且展开时，滚动到视图并聚焦
  useEffect(() => {
    if (isSelected && isOpen && containerRef.current) {
      // 延迟滚动，确保DOM已更新
      const timer = setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'nearest',
            inline: 'nearest'
          });
        }
      }, 300); // 增加延迟时间，等待展开动画
      return () => clearTimeout(timer);
    }
  }, [isSelected, isOpen]);

  const groupedTokens = component.tokens.reduce(
    (acc, token) => {
      const category = token.category || "其他";
      if (!acc[category]) acc[category] = [];
      acc[category].push(token);
      return acc;
    },
    {} as Record<string, TokenDef[]>,
  );
  
  // 每个分类的折叠状态
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(groupedTokens)) // 默认全部展开
  );
  
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };
  
  return (
    <div 
      ref={containerRef}
      style={{ 
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        boxShadow: isSelected && highlightEnabled ? `0 0 0 2px ${resolvedTokens['shared-color-border-focus'] || '#06b6d4'} inset, 0 0 20px rgba(6, 182, 212, 0.2)` : 'none',
        background: isSelected && highlightEnabled ? (resolvedTokens['shared-color-background-hover'] || 'rgba(255, 255, 255, 0.05)') : 'transparent',
        transition: 'all 0.3s'
      }}>
      <button
        onClick={() => { 
          onToggle(); // 切换展开/折叠
          if (!isOpen) onSelect(); // 只在展开时选中
        }}
        style={{
          width: "100%",
          padding: resolvedTokens['shared-collapsible-padding'] || '8px',
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: isOpen ? (resolvedTokens['shared-color-background-hover'] || 'rgba(255, 255, 255, 0.05)') : "transparent",
          border: "none",
          cursor: "pointer",
          color: "white",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              fontSize: component.name.includes('├─') || component.name.includes('└─') ? '10px' : (resolvedTokens['shared-fontSize-sm'] || '11px'),
              fontWeight: component.name.includes('├─') || component.name.includes('└─') ? (resolvedTokens['shared-fontWeight-regular'] || '400') : (resolvedTokens['shared-fontWeight-semibold'] || '600'),
              color: component.name.includes('├─') || component.name.includes('└─') ? (resolvedTokens['shared-color-text-secondary'] || 'rgba(255,255,255,0.6)') : (isOpen ? (resolvedTokens['shared-color-text-brand'] || "#06b6d4") : (resolvedTokens['shared-color-text-primary'] || "white")),
              letterSpacing: '-0.01em',
              paddingLeft: component.name.includes('├─') || component.name.includes('└─') ? '16px' : '0'
            }}
          >
            {component.name.replace(/[├└]─\s*/g, '').replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim()}
          </div>
        </div>
        <span
          style={{
            fontSize: resolvedTokens['shared-arrow-fontSize'] || '8px',
            color: resolvedTokens['shared-arrow-color'] || 'rgba(255,255,255,0.4)',
            transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
            transition: `transform ${resolvedTokens['shared-arrow-transition'] || '0.15s'} ease`,
            display: 'inline-block',
            width: resolvedTokens['shared-arrow-width'] || '8px'
          }}
        >
          ▶
        </span>
      </button>
      {isOpen && (
        <div
          style={{ padding: "12px 16px 16px", background: "rgba(0,0,0,0.2)" }}
        >
          {Object.entries(groupedTokens).map(([category, tokens]) => {
            const isCategoryExpanded = expandedCategories.has(category);
            return (
              <div key={category} style={{ marginBottom: "12px" }}>
                <button
                  onClick={() => toggleCategory(category)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    background: isCategoryExpanded ? (resolvedTokens['shared-color-background-hover'] || 'rgba(255, 255, 255, 0.05)') : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isCategoryExpanded ? (resolvedTokens['shared-color-border-focus'] || '#06b6d4') : "rgba(255,255,255,0.05)"}`,
                    borderRadius: "6px",
                    color: "white",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "11px",
                    fontWeight: "600",
                    transition: "all 0.2s",
                  }}
                >
                  <span>
                    📁 {category}{" "}
                    <span
                      style={{
                        opacity: 0.5,
                        fontSize: "10px",
                        marginLeft: "4px",
                      }}
                    >
                      ({tokens.length})
                    </span>
                  </span>
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: resolvedTokens['shared-arrow-fontSize'] || '8px',
                      color: resolvedTokens['shared-arrow-color'] || 'rgba(255,255,255,0.4)',
                      transform: isCategoryExpanded ? "rotate(90deg)" : "rotate(0deg)",
                      transition: `transform ${resolvedTokens['shared-arrow-transition'] || '0.15s'} ease`,
                      marginRight: "6px",
                      width: resolvedTokens['shared-arrow-width'] || '8px'
                    }}
                  >
                    ▶
                  </span>
                </button>
                {isCategoryExpanded && (
                  <div>
              {tokens.map((token) => {
                const rawValue = allTokens[token.key] || "";
                const resolvedValue = resolvedTokens[token.key] || "";
                const isTokenReference = rawValue.includes("{");
                const isColor =
                  token.type === "color" && resolvedValue.startsWith("#");
                
                return (
                  <div
                    key={token.key}
                    style={{
                      marginBottom: "10px",
                      background: "rgba(0,0,0,0.3)",
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid rgba(255,255,255,0.05)",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "9px",
                        color: "rgba(255,255,255,0.6)",
                        marginBottom: "4px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span>{token.label}</span>
                      {isTokenReference && (
                        <span style={{
                          fontSize: "8px",
                          color: resolvedTokens['semantic-color-link'] || "#06b6d4",
                          background: "rgba(6, 182, 212, 0.1)",
                          padding: "2px 6px",
                          borderRadius: "3px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}>
                          <span style={{ opacity: 0.6 }}>
                            {rawValue.includes('space/') ? '📐' : 
                             rawValue.includes('base-') ? '🔧' : '🔗'}
                          </span>
                          → {resolvedValue}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center", flexDirection: token.type === "blur" ? "column" : "row" }}>
                      {isColor && (
                        <input
                          type="color"
                          value={resolvedValue}
                          onChange={(e) => setToken(token.key, e.target.value)}
                          style={{
                            width: "22px",
                            height: "22px",
                            border: "1px solid rgba(255,255,255,0.2)",
                            borderRadius: "3px",
                            cursor: "pointer",
                            flexShrink: 0,
                          }}
                        />
                      )}
                      {token.type === "blur" && (
                        <div style={{ width: "100%", marginBottom: "8px" }}>
                          <input
                            type="range"
                            min="0"
                            max="50"
                            step="1"
                            value={parseInt(resolvedValue) || 0}
                            onChange={(e) => setToken(token.key, e.target.value + "px")}
                            style={{
                              width: "100%",
                              height: "4px",
                              borderRadius: "2px",
                              background: "linear-gradient(90deg, rgba(0,255,255,0.2), rgba(0,255,255,0.8))",
                              outline: "none",
                              cursor: "pointer",
                            }}
                          />
                          <div style={{ 
                            fontSize: "9px", 
                            color: "#00ffff", 
                            textAlign: "center",
                            marginTop: "4px",
                            fontWeight: "600"
                          }}>
                            {resolvedValue}
                          </div>
                        </div>
                      )}
                      {token.key.includes("opacity") && (
                        <div style={{ width: "100%", marginBottom: "8px" }}>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={parseFloat(resolvedValue) || 0}
                            onChange={(e) => setToken(token.key, e.target.value)}
                            style={{
                              width: "100%",
                              height: "4px",
                              borderRadius: "2px",
                              background: "linear-gradient(90deg, rgba(0,255,255,0.2), rgba(0,255,255,0.8))",
                              outline: "none",
                              cursor: "pointer",
                            }}
                          />
                          <div style={{ 
                            fontSize: "9px", 
                            color: "#00ffff", 
                            textAlign: "center",
                            marginTop: "4px",
                            fontWeight: "600"
                          }}>
                            {(parseFloat(resolvedValue) * 100).toFixed(0)}%
                          </div>
                        </div>
                      )}
                      <input
                        type="text"
                        value={rawValue}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          const cursorPos = e.target.selectionStart || 0;
                          setCursorPosition(cursorPos);
                          setToken(token.key, newValue);
                          if (newValue.endsWith("$")) {
                            const rect = e.target.getBoundingClientRect();
                            // 使用输入框中心位置
                            const inputCenterX = rect.left + rect.width / 2;
                            console.log('🎯 触发 TokenBindingSelector:', {
                              tokenKey: token.key,
                              inputCenterX,
                              rectBottom: rect.bottom
                            });
                            setBindingSelectorPosition({
                              x: inputCenterX,
                              y: rect.bottom + 4,
                            });
                            setBindingTargetKey(token.key);
                            setBindingSelectorOpen(true);
                          }
                        }}
                        onClick={(e) => {
                          const cursorPos = e.currentTarget.selectionStart || 0;
                          setCursorPosition(cursorPos);
                        }}
                        onKeyUp={(e) => {
                          const cursorPos = e.currentTarget.selectionStart || 0;
                          setCursorPosition(cursorPos);
                        }}
                        style={{
                          flex: 1,
                          padding: "5px 8px",
                          background: "rgba(0,0,0,0.5)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "3px",
                          color: isTokenReference ? "#06b6d4" : "white",
                          fontSize: "9px",
                          fontFamily: "monospace",
                        }}
                        placeholder="输入值或 $ 选择Token"
                      />
                    </div>
                    <div style={{ marginTop: "3px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div
                        style={{
                          fontSize: "8px",
                          color: "rgba(255,255,255,0.3)",
                          fontFamily: "monospace",
                        }}
                      >
                        {token.key}
                      </div>
                      {isTokenReference && (
                        <div style={{
                          fontSize: "7px",
                          color: '#06b6d4',
                          background: 'rgba(6, 182, 212, 0.1)',
                          padding: "2px 4px",
                          borderRadius: "2px",
                          fontWeight: "600",
                        }}>
                          {rawValue.includes('space/') || rawValue.includes('layout/') ? 'SEMANTIC' : 
                           rawValue.includes('base-') ? 'BASE' : 'TOKEN'}
                        </div>
                      )}
                    </div>
                    {bindingSelectorOpen && bindingTargetKey === token.key && (
                      <TokenBindingSelector
                        currentValue={rawValue}
                        onSelect={(tokenRef) => {
                          const currentValue = allTokens[token.key] || "";
                          
                          // 判断是否是颜色类型（需要叠加）
                          const isColorType = token.type === 'color' || token.type === 'other' && token.key.includes('background');
                          
                          if (isColorType) {
                            // 检测选中的token类型
                            const isOpacityToken = tokenRef.includes('opacity');
                            const valueBeforeDollar = currentValue.slice(0, -1).trim();
                            
                            if (isOpacityToken) {
                              // 选择的是opacity token
                              // 检测当前值的类型
                              const isHexColor = /^#[0-9a-fA-F]{6}$/.test(valueBeforeDollar);
                              const isTokenRef = valueBeforeDollar.startsWith('{') && valueBeforeDollar.endsWith('}');
                              const hasComma = valueBeforeDollar.includes(',');
                              
                              if (hasComma) {
                                // 已经有逗号，替换opacity部分
                                const parts = valueBeforeDollar.split(',');
                                const colorPart = parts[0].trim();
                                const newValue = `${colorPart}, ${tokenRef}`;
                                setToken(token.key, newValue);
                              } else if (isHexColor || isTokenRef) {
                                // 单个颜色值（hex或token），添加opacity
                                const newValue = `${valueBeforeDollar}, ${tokenRef}`;
                                setToken(token.key, newValue);
                              } else {
                                // 其他情况，在光标位置插入
                                const newValue = valueBeforeDollar.slice(0, cursorPosition - 1) + 
                                                tokenRef + 
                                                valueBeforeDollar.slice(cursorPosition - 1);
                                setToken(token.key, newValue);
                              }
                            } else {
                              // 选择的是颜色token
                              const hasComma = valueBeforeDollar.includes(',');
                              
                              if (hasComma) {
                                // 已经有逗号，替换颜色部分，保留opacity
                                const parts = valueBeforeDollar.split(',');
                                const opacityPart = parts[1]?.trim() || '';
                                const newValue = opacityPart ? `${tokenRef}, ${opacityPart}` : tokenRef;
                                setToken(token.key, newValue);
                              } else {
                                // 没有逗号，直接替换整个值
                                setToken(token.key, tokenRef);
                              }
                            }
                          } else {
                            // 其他类型：直接替换整个值
                            setToken(token.key, tokenRef);
                          }
                          
                          setBindingSelectorOpen(false);
                        }}
                        onClose={() => setBindingSelectorOpen(false)}
                        position={bindingSelectorPosition}
                        filterType={
                          token.type === 'color' ? 'colors' :
                          token.type === 'other' && token.key.includes('background') ? 'colors' :
                          token.type === 'other' ? 'all' :
                          token.type
                        }
                      />
                    )}
                  </div>
                );
              })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ComponentTokenPanel: React.FC = () => {
  const resolvedTokens = useTokenStore((s) => s.resolvedTokens);
  const [isOpen, setIsOpen] = useState(false);
  const [openComponents, setOpenComponents] = useState<Set<string>>(new Set());
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState(() => {
    const savedPosition = memoryStorage.getItem("componentTokenPanelPosition");
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition);
        const safeX = Math.max(0, Math.min(window.innerWidth - 360, parsed.x));
        const safeY = Math.max(0, Math.min(window.innerHeight - 600, parsed.y));
        return { x: safeX, y: safeY };
      } catch (e) {
        console.error("Failed to parse saved position:", e);
      }
    }
    const defaultX = window.innerWidth - 300;
    const defaultY = 20;
    const safeX = Math.max(0, Math.min(window.innerWidth - 360, defaultX));
    const safeY = Math.max(0, Math.min(window.innerHeight - 600, defaultY));
    return {
      x: safeX,
      y: safeY,
    };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [highlightEnabled, setHighlightEnabled] = useState(true);
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [panelSize, setPanelSize] = useState({ width: 360, height: 600 }); // ComponentTokenPanel 专用宽度
  const [isIconManagerOpen, setIsIconManagerOpen] = useState(false);
  const [componentIcons, setComponentIcons] = useState<Record<string, string>>({});
  const [isBackgroundPresetOpen, setIsBackgroundPresetOpen] = useState(false);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(72);
  const [panelTop, setPanelTop] = useState(0);
  
  // 获取撤销/重做功能
  const undo = useTokenStore((s) => s.undo);
  const redo = useTokenStore((s) => s.redo);
  const canUndo = useTokenStore((s) => s.canUndo);
  const canRedo = useTokenStore((s) => s.canRedo);
  const setToken = useTokenStore((s) => s.setToken);
  const tokens = useTokenStore((s) => s.tokens);
  const allTokens = useTokenStore((s) => s.tokens);

  useLayoutEffect(() => {
    const measure = () => {
      if (headerRef.current) {
        const height = headerRef.current.getBoundingClientRect().height || headerRef.current.offsetHeight;
        setHeaderHeight(height);
      }
      if (panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        setPanelTop(rect.top);
      }
    };
    
    // 立即测量
    measure();
    
    // 使用 requestAnimationFrame 确保在下一帧也测量（拖动后）
    const rafId = requestAnimationFrame(measure);
    
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      cancelAnimationFrame(rafId);
    };
  }, [position.x, position.y, panelSize.width, panelSize.height, isMinimized, isDragging]);

  // 计算安全的弹窗起始位置：面板顶部 + 头部高度，面板左侧位置
  const safeOverlayTop = panelTop + headerHeight;
  const safeOverlayLeft = position.x; // 弹窗从面板左边缘开始，不遮挡左侧内容

  // 🎯 导出配置
  const handleExportConfig = () => {
    const config = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      tokens: allTokens,
      components: COMPONENTS.map(c => ({
        id: c.id,
        name: c.name,
        tokens: c.tokens.map(t => t.key)
      }))
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `genki-tokens-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('✅ 配置已导出', config);
  };

  // 🎯 导入配置
  const handleImportConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const config = JSON.parse(event.target?.result as string);
          
          if (!config.tokens) {
            alert('❌ 配置文件格式错误');
            return;
          }

          // 批量导入tokens
          Object.entries(config.tokens).forEach(([key, value]) => {
            setToken(key, value as string);
          });

          console.log('✅ 配置已导入', config);
          alert(`✅ 成功导入 ${Object.keys(config.tokens).length} 个tokens`);
        } catch (error) {
          console.error('❌ 导入失败', error);
          alert('❌ 配置文件解析失败');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // 🎯 自动初始化默认tokens - 从COMPONENTS定义中提取defaultValue
  useEffect(() => {
    const initializeDefaultTokens = () => {
      console.log('🎨 开始自动初始化tokens...');

      let initializedCount = 0;
      let skippedCount = 0;

      // 遍历所有组件的所有tokens
      COMPONENTS.forEach(component => {
        component.tokens.forEach(token => {
          // 如果token已存在值，跳过
          if (tokens[token.key]) {
            skippedCount++;
            return;
          }

          // 如果有defaultValue，使用它
          if (token.defaultValue) {
            setToken(token.key, token.defaultValue);
            initializedCount++;
          }
        });
      });

      console.log(`✅ Tokens初始化完成！初始化: ${initializedCount}, 跳过: ${skippedCount}`);
    };

    // 延迟初始化，确保store已准备好
    const timer = setTimeout(initializeDefaultTokens, 100);
    return () => clearTimeout(timer);
  }, []);

  // 高亮实际应用场景中的组件并跳转到TokenTuner（仅针对TokenTuner内部组件）
  useEffect(() => {
    if (!highlightEnabled || !selectedComponent) {
      // 移除所有高亮
      document.querySelectorAll('[data-component-highlight]').forEach(el => {
        (el as HTMLElement).style.outline = '';
        (el as HTMLElement).style.boxShadow = '';
        (el as HTMLElement).removeAttribute('data-component-highlight');
      });
      return;
    }
    
    // 🎯 区分两类组件：
    // 1. 需要切换面板才能看到的组件 - 跳转到对应面板
    // 2. 视觉上能直接看到的组件 - 只高亮，不跳转
    
    const needsPanelSwitch = [
      'tokenTuner',        // 需要打开Tune面板才能看到
      'tokenItem',         // 需要打开Tune面板才能看到
      'collapsibleGroup',  // 需要打开Tune面板才能看到
      'designPanel',       // 需要打开Design面板才能看到
    ];
    
    const visibleComponents = [
      'topBar',            // 顶部工具栏可见
      'topBar-logo',       // Logo可见
      'appTitle',          // 标题可见
      'navButtons',        // 模式按钮可见
      'panelButtons',      // 面板按钮可见
      'canvasArea',        // 画布区域可见
      'background',        // 背景可见
      'infoCard',          // 信息卡片可见
      'defaultPanel',      // 默认面板可见
      'defaultPanel-labels', // 面板标签可见
      'buttonPrimary',     // 导出按钮可见
    ];
    
    // 需要切换面板的组件：跳转到对应面板
    if (needsPanelSwitch.includes(selectedComponent)) {
      if (selectedComponent === 'designPanel') {
        // 打开Design面板
        window.dispatchEvent(new CustomEvent('toggle-design-mode', { 
          detail: { action: 'open' } 
        }));
      } else {
        // 打开Tune面板
        window.dispatchEvent(new CustomEvent('toggle-tune-mode', { 
          detail: { action: 'open' } 
        }));
        
        // 发送聚焦事件到TokenTuner
        setTimeout(() => {
          const tokenPrefixMap: Record<string, string> = {
            'tokenTuner': 'tokenTuner',
            'tokenItem': 'tokenItem',
            'collapsibleGroup': 'collapsibleGroup',
          };
          
          const tokenPrefix = tokenPrefixMap[selectedComponent] || selectedComponent;
          
          const event = new CustomEvent('focus-component', {
            detail: { componentId: tokenPrefix }
          });
          window.dispatchEvent(event);
        }, 200);
      }
    }
    // 视觉上可见的组件：只高亮，不跳转

    // 根据组件ID查找并高亮对应的DOM元素
    const componentSelectors: Record<string, string> = {
      // TokenTuner 内部组件
      'tokenTuner': '[style*="rgba(15, 15, 15, 0.75)"][style*="320px"]',
      'tokenItem': '[style*="tokenItem"]',
      'collapsibleGroup': '[style*="collapsibleGroup"]',
      // Top Bar 区域
      'topBar': 'div.fixed.backdrop-blur-xl[style*="height"]',
      'topBar-logo': 'div.fixed.backdrop-blur-xl div[style*="32px"][style*="32px"]',
      'appTitle': '[data-editable="app-title"]',
      'navButtons': 'button[onClick*="setMode"]',
      'panelButtons': 'button[onClick*="activePanel"]',
      // Canvas 区域
      'canvasArea': 'div#preview-area',
      'background': 'div#preview-area',
      'infoCard': '[data-editable*="info"]',
      // Default Panel 区域
      'defaultPanel': 'div#control-panel.default-control-panel',
      'defaultPanel-labels': 'div#control-panel label',
      'buttonPrimary': 'button[data-editable="export-button"]',
      // Design Panel
      'designPanel': '[style*="designPanel"]',
    };

    const selector = componentSelectors[selectedComponent];
    console.log(`🔍 尝试高亮组件: ${selectedComponent}, 选择器: ${selector}`);
    
    if (selector) {
      const elements = document.querySelectorAll(selector);
      console.log(`✅ 找到 ${elements.length} 个元素:`, elements);
      
      if (elements.length === 0) {
        console.warn(`⚠️ 未找到元素: ${selectedComponent}`);
      }
      
      elements.forEach(el => {
        // 滚动到元素位置
        el.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        });
        
        (el as HTMLElement).style.outline = `3px solid ${resolvedTokens['shared-color-border-focus'] || '#06b6d4'}`;
        (el as HTMLElement).style.boxShadow = '0 0 0 6px rgba(6, 182, 212, 0.2), 0 0 30px rgba(6, 182, 212, 0.3)';
        (el as HTMLElement).style.transition = 'all 0.3s';
        (el as HTMLElement).setAttribute('data-component-highlight', 'true');
        console.log(`✨ 高亮元素并滚动到视图:`, el);
      });
    } else {
      console.warn(`⚠️ 没有为组件 ${selectedComponent} 定义选择器`);
    }

    return () => {
      // 清理高亮
      document.querySelectorAll('[data-component-highlight]').forEach(el => {
        (el as HTMLElement).style.outline = '';
        (el as HTMLElement).style.boxShadow = '';
        (el as HTMLElement).removeAttribute('data-component-highlight');
      });
    };
  }, [highlightEnabled, selectedComponent]);

  useEffect(() => {
    const handleToggle = (e: CustomEvent) =>
      setIsOpen(e.detail.action === "open");
    window.addEventListener(
      "toggle-components-mode",
      handleToggle as EventListener,
    );
    return () =>
      window.removeEventListener(
        "toggle-components-mode",
        handleToggle as EventListener,
      );
  }, []);

  // 添加键盘快捷键支持
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z / Cmd+Z - 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) undo();
      }
      // Ctrl+Shift+Z / Cmd+Shift+Z - 重做
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (canRedo()) redo();
      }
      // Ctrl+Y / Cmd+Y - 重做（备选）
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        if (canRedo()) redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, undo, redo, canUndo, canRedo]);
  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // 边界限制
      const padding = 20;
      const maxX = window.innerWidth - panelSize.width - padding;
      const maxY = window.innerHeight - panelSize.height - padding;
      
      const boundedX = Math.max(padding, Math.min(maxX, newX));
      const boundedY = Math.max(padding, Math.min(maxY, newY));
      
      setPosition({ x: boundedX, y: boundedY });
    };
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset, panelSize]);

  // 调整大小
  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(320, Math.min(800, e.clientX - position.x));
      const newHeight = Math.max(400, Math.min(window.innerHeight - position.y - 20, e.clientY - position.y));
      setPanelSize({ width: newWidth, height: newHeight });
    };
    const handleMouseUp = () => setIsResizing(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, position]);
  const toggleComponent = (id: string) => {
    setOpenComponents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  if (!isOpen) return null;

  // 🎯 最小化状态 - 显示科技感浮动按钮
  if (isMinimized) {
    return (
      <div
        onClick={() => setIsMinimized(false)}
        style={{
          position: "fixed",
          right: "20px",
          bottom: "20px",
          width: "64px",
          height: "64px",
          borderRadius: "16px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          border: "2px solid rgba(255, 255, 255, 0.2)",
          boxShadow: "0 8px 32px rgba(102, 126, 234, 0.4), 0 0 0 0 rgba(102, 126, 234, 0.4)",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1) rotate(5deg)";
          e.currentTarget.style.boxShadow = "0 12px 48px rgba(102, 126, 234, 0.6), 0 0 0 8px rgba(102, 126, 234, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1) rotate(0deg)";
          e.currentTarget.style.boxShadow = "0 8px 32px rgba(102, 126, 234, 0.4), 0 0 0 0 rgba(102, 126, 234, 0.4)";
        }}
      >
        <style>
          {`
            @keyframes pulse {
              0%, 100% {
                box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4), 0 0 0 0 rgba(102, 126, 234, 0.4);
              }
              50% {
                box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4), 0 0 0 12px rgba(102, 126, 234, 0);
              }
            }
          `}
        </style>
        <div style={{ fontSize: "28px", marginBottom: "2px" }}>🎯</div>
        <div style={{ fontSize: "9px", fontWeight: "600", color: "white", opacity: 0.9 }}>
          组件
        </div>
      </div>
    );
  }

  // 🎯 完整面板状态
  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        top: position.y + "px",
        left: position.x + "px",
        width: panelSize.width + "px",
        height: panelSize.height + "px",
        display: "flex",
        flexDirection: "column",
        background: resolvedTokens["base-colors-alpha-black-95"] || "rgba(28, 28, 30, 0.5)",
        color: resolvedTokens["shared-color-text-primary"] || "white",
        borderRadius: resolvedTokens["shared-radius-lg"] || "12px",
        border: `1px solid ${resolvedTokens["shared-color-border"] || "rgba(255, 255, 255, 0.12)"}`,
        zIndex: 1000,
        backdropFilter: "blur(60px) saturate(180%)",
        WebkitBackdropFilter: "blur(60px) saturate(180%)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        overflow: "hidden",
        transition: isDragging || isResizing ? "none" : "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: "none",
        willChange: "auto",
      }}
    >
      <div
        ref={headerRef}
        onMouseDown={(e) => {
          setIsDragging(true);
          setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y,
          });
        }}
        style={{
          padding: "12px 16px",
          borderBottom: `1px solid ${resolvedTokens["shared-color-border"] || "rgba(255,255,255,0.1)"}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "transparent",
          flexShrink: 0,
          cursor: "move",
          position: "relative",
          zIndex: 10001,
        }}
      >
        <div>
          <div
            style={{ fontSize: resolvedTokens["shared-fontSize-md"] || "14px", fontWeight: resolvedTokens["shared-fontWeight-semibold"] || "600", color: resolvedTokens["shared-color-text-primary"] || "#ffffff" }}
          >
组件 Token 管理
          </div>
          <div
            style={{
              fontSize: resolvedTokens["shared-fontSize-xs"] || "10px",
              color: resolvedTokens["shared-color-text-muted"] || "rgba(255,255,255,0.4)",
              marginTop: "2px",
            }}
          >
            {COMPONENTS.length} 个组件 · 可拖动
          </div>
        </div>
        <div
          style={{ display: "flex", gap: "6px" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              width: "24px",
              height: "24px",
              borderRadius: resolvedTokens["shared-radius-sm"] || "4px",
              background: resolvedTokens["shared-color-background-hover"] || "rgba(255,255,255,0.05)",
              border: `1px solid ${resolvedTokens["shared-color-border"] || "rgba(255,255,255,0.1)"}`,
              color: resolvedTokens["shared-color-text-primary"] || "white",
              cursor: "pointer",
              fontSize: "12px",
            }}
            title={isMinimized ? "展开" : "折叠"}
          >
            {isMinimized ? "□" : "−"}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{
              width: "24px",
              height: "24px",
              borderRadius: resolvedTokens["shared-radius-sm"] || "4px",
              background: resolvedTokens["shared-color-background-hover"] || "rgba(255,255,255,0.05)",
              border: `1px solid ${resolvedTokens["shared-color-border"] || "rgba(255,255,255,0.1)"}`,
              color: resolvedTokens["shared-color-text-primary"] || "white",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            ✕
          </button>
        </div>
      </div>
      {!isMinimized && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
            {/* 🎨 图标管理器 - 卷展栏 */}
            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <button
                onClick={() => setIsIconManagerOpen(!isIconManagerOpen)}
                style={{
                  width: "100%",
                  padding: "8px 0",
                  background: "transparent",
                  border: "none",
                  color: resolvedTokens["shared-color-text-primary"] || "white",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: resolvedTokens["shared-fontSize-sm"] || "11px",
                  fontWeight: resolvedTokens["shared-fontWeight-semibold"] || "600",
                }}
              >
                <span>图标管理器</span>
                <span style={{ 
                  fontSize: resolvedTokens['shared-arrow-fontSize'] || '8px',
                  color: resolvedTokens['shared-arrow-color'] || 'rgba(255,255,255,0.4)',
                  transform: isIconManagerOpen ? "rotate(90deg)" : "rotate(0deg)", 
                  transition: `transform ${resolvedTokens['shared-arrow-transition'] || '0.15s'} ease`,
                  display: 'inline-block',
                  width: resolvedTokens['shared-arrow-width'] || '8px'
                }}>▶</span>
              </button>
              {isIconManagerOpen && (
                <IconManager
                  isOpen={true}
                  onClose={() => {}}
                  onSelectIcon={(componentId, icon) => {
                    setComponentIcons(prev => ({ ...prev, [componentId]: icon }));
                    console.log(`✅ 已为组件 ${componentId} 设置图标: ${icon}`);
                  }}
                />
              )}
            </div>

            {/* 🌊 背景预设选择器 - 卷展栏 */}
            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <button
                onClick={() => setIsBackgroundPresetOpen(!isBackgroundPresetOpen)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: isBackgroundPresetOpen ? "rgba(0, 255, 255, 0.1)" : "transparent",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                <span>动态背景预设</span>
                <span style={{ 
                  fontSize: resolvedTokens['shared-arrow-fontSize'] || '8px',
                  color: resolvedTokens['shared-arrow-color'] || 'rgba(255,255,255,0.4)',
                  transform: isBackgroundPresetOpen ? "rotate(90deg)" : "rotate(0deg)", 
                  transition: `transform ${resolvedTokens['shared-arrow-transition'] || '0.15s'} ease`,
                  display: 'inline-block',
                  width: resolvedTokens['shared-arrow-width'] || '8px'
                }}>▶</span>
              </button>
              {isBackgroundPresetOpen && (
                <BackgroundPresetSelector
                  isOpen={true}
                  onClose={() => {}}
                />
              )}
            </div>

            {/* 组件列表 */}
            {COMPONENTS.map((component) => (
              <AccordionItem
                key={component.id}
                component={component}
                isOpen={openComponents.has(component.id)}
                onToggle={() => toggleComponent(component.id)}
                isSelected={selectedComponent === component.id}
                onSelect={() => setSelectedComponent(component.id)}
                highlightEnabled={highlightEnabled}
              />
            ))}
          </div>
          <div
            style={{
              padding: "8px 16px",
              fontSize: "10px",
              color: resolvedTokens['shared-color-text-secondary'] || 'rgba(255, 255, 255, 0.6)',
              borderTop: `1px solid ${resolvedTokens['shared-color-divider'] || 'rgba(255, 255, 255, 0.06)'}`,
              textAlign: "center",
            }}
          >
            
          </div>
        </>
      )}
      
      {/* 调整大小手柄 - 右下角 */}
      {!isMinimized && (
        <div
          onMouseDown={(e) => {
            e.stopPropagation();
            setIsResizing(true);
          }}
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: "16px",
            height: "16px",
            cursor: "nwse-resize",
            background: "transparent",
            borderBottomRightRadius: "8px",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: "4px",
              bottom: "4px",
              width: "8px",
              height: "8px",
              borderRight: `1px solid ${resolvedTokens['shared-color-border'] || 'rgba(255, 255, 255, 0.2)'}`,
              borderBottom: `1px solid ${resolvedTokens['shared-color-border'] || 'rgba(255, 255, 255, 0.2)'}`,
            }}
          />
        </div>
      )}

</div>
  );
};
