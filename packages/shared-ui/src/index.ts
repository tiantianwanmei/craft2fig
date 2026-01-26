// ============================================================================
// @genki/shared-ui - Main Entry Point
// ============================================================================
// 统一导出所有 UI 组件

// 基础 UI 组件
export { Button } from './components/ui/Button';
export { Select } from './components/ui/Select';
export { Slider } from './components/ui/Slider';
export { Divider } from './components/ui/Divider';
export { Section } from './components/ui/Section';
export { RootTabs, NestedTabs } from './components/ui/Tabs';
export { Accordion, AccordionItem } from './components/ui/Accordion';

// 通用组件
export { ErrorBoundary } from './components/ErrorBoundary';
export { CustomSelect } from './components/CustomSelect';
export { TokenInjector } from './components/TokenInjector';

// 毛玻璃组件
export { GlassCard } from './components/GlassCard';
export type { GlassCardProps, GlassVariant, GlassColorVariant } from './components/GlassCard';
export { GlassShowcase } from './components/GlassShowcase';

// 动画组件 (Framer Motion)
export { AnimatedButton } from './components/AnimatedButton';
export type { AnimatedButtonProps } from './components/AnimatedButton';
export { AnimatedCard } from './components/AnimatedCard';
export type { AnimatedCardProps } from './components/AnimatedCard';
export { AnimatedList } from './components/AnimatedList';
export type { AnimatedListProps } from './components/AnimatedList';
export { AnimationShowcase } from './components/AnimationShowcase';

// Linear Style 组件 (物理微交互)
export { LinearTabs } from './components/LinearTabs';
export type { LinearTabsProps, LinearTab } from './components/LinearTabs';

// Vercel/AI Style 组件 (流光科技)
export { BorderBeam } from './components/BorderBeam';
export type { BorderBeamProps } from './components/BorderBeam';
export { SpotlightCard } from './components/SpotlightCard';
export type { SpotlightCardProps } from './components/SpotlightCard';
