# Genki Packaging Exporter - Modernization & Migration Plan (Optimized Version)

## 1. Overview

### 1.1 Core Objectives
Refactor the legacy 12,000+ line HTML/JS monolithic codebase into a solution that meets three core standards:
*   **High-Performance React Architecture**: Scalable, robust, and easily maintainable for future iterations.
*   **100% Feature Parity**: Zero loss of existing functionality and no deviation from the original plugin's business behavior.
*   **Pixel-Perfect Fidelity**: Exact matching of the legacy UI's visual style and user interaction experience (no visible or operational discrepancies).

### 1.2 Core Philosophy
Adopt the **Iterative Strangler Fig Pattern** as the guiding methodology:
- Gradually replace legacy system modules with modern, standardized components, until the old monolithic codebase can be safely decommissioned without risk.
- A non-negotiable requirement: the plugin must remain **fully buildable and usable throughout the entire refactoring process**. This mitigates the high risks of a "big bang" full rewrite (e.g., project delays, functional breaks, unforeseen technical debt).

---

## 2. Phased Roadmap (With Clear Deliverables & Risk Mitigation)
Each phase is designed to deliver a usable subset of functionality, with minimal overlap and clear exit criteria.

### Phase 1: Infrastructure & Core Architecture (The Foundation)
**Goal**: Establish a type-safe, high-performance technical foundation to support the plugin's complex business logic and future scalability.
**Exit Criteria**: Type checking enabled, core state management available, style system aligned with legacy design; UI ↔ Plugin communication bridge usable.

1.  **Strict TypeScript Configuration & Core Interface Definition**
    *   [ ] Enforce strict type checking for all new code (enable `strict: true` in `tsconfig.json`) to eliminate `any` type pollution and catch type errors at compile time.
    *   [ ] Define strongly-typed core interfaces that align 1:1 with legacy data structures: `Vector`, `MarkedLayer`, `FoldEdge`, `DrivenRelation` (ensure data compatibility during incremental migration).
    *   [ ] **Typed Message Bus Architecture**: Build a type-safe communication bridge to replace loose, untyped `postMessage` calls, enabling secure, traceable, and error-resistant UI ↔ Plugin interaction.

2.  **Zustand State Management System (Optimized for Figma Plugins)**
    *   [ ] **Single Source of Truth (SSOT)**: Centralize all critical app state (Selections, Modes, Canvas Transform, Project Data) in Zustand stores to eliminate scattered state and data inconsistency.
    *   [ ] **Persistence Middleware**: Implement custom Zustand middleware to auto-sync core state with Figma's `clientStorage`, ensuring cross-session state consistency and data persistence.
    *   [ ] **Performance Optimization for High-Frequency Operations**: Use Zustand's transient updates for high-frequency changes (slider dragging, canvas panning/zooming) to avoid unnecessary React re-render storms and ensure smooth interaction.

3.  **Tailwind CSS + CSS Variables Style System (Visual Consistency Guaranteed)**
    *   [ ] Extract all hardcoded CSS variables from the legacy `ui.html` into a centralized, maintainable file: `src/styles/variables.css`.
    *   [ ] Configure Tailwind CSS theme to map exactly to the legacy "Genki Design System" design tokens (e.g., Primary Cyan, Glassmorphism effects, spacing, typography) to ensure pixel-perfect visual parity from the start.

### Phase 2: Component Atomization (Reusable, Testable UI System)
**Goal**: Deconstruct the monolithic legacy UI into isolated, atomic, reusable React components; establish a standardized UI component library to reduce redundancy and improve maintainability.
**Exit Criteria**: Core layout usable, all tabs migrated to component-based structure, visualization components functional (empty state allowed, no business logic required yet).

1.  **Layout & Shell Components (UI Skeleton)**
    *   [ ] `MainLayout`: Implement resizable split-pane architecture (Viewport / Control Panel) with responsive behavior matching the legacy UI.
    *   [ ] `FloatingToolbar`: Build canvas control component (Zoom, Pan, Reset) with hover/active states aligned to legacy design.
    *   [ ] `StatusBar`: Implement global status indication system to display real-time plugin status, operation feedback, and error prompts.

2.  **Control Panel (N-Panel) Migration (Tab-by-Tab, Low Risk Isolation)**
    *   *Migration Strategy*: Migrate one tab at a time to isolate complexity, validate functionality incrementally, and avoid blocking progress.
    *   [ ] **Export Tab**: Migrate Clip Mode toggles, Craft Vector switches, and Selection actions (e.g., select all, clear selection).
    *   [ ] **Fold Tab**: Migrate Fold Edge list, Driven Relations tree (implemented as a recursive component), and auto-naming tools.
    *   [ ] **Craft Tab** (Highest Complexity, Sub-Component Breakdown):
        *   `CraftTypeSelector`: Build dynamic button grid for craft type selection with active state highlighting.
        *   `ParamPanel`: Implement context-aware parameter inputs (sliders, toggles, dropdowns) adapted for Normal/Emboss/UV/Hotfoil scenarios.
        *   `TexturePreview`: Build real-time canvas preview component for material texture previews (placeholder for subsequent algorithm integration).

3.  **Visualization Components (Core User Interaction Interfaces)**
    *   [ ] **SpatialCanvas (2D)**: Re-implement the legacy "Vector Card" system using HTML overlay on a transformable container.
        *   *Key Optimization*: Use CSS transforms for Pan/Zoom operations instead of Canvas 2D redraws to ensure crisp text rendering and improved performance.
    *   [ ] **WebGPU3DCanvas**: Encapsulate the legacy iframe-based renderer into a React component with stable, type-safe message passing (prepare for subsequent 3D logic integration).
    *   [ ] **CraftThumbnails**: Build horizontal scrollable list component for quick material preview and selection, with smooth scrolling behavior.

### Phase 3: Logic Migration (The Brain - Algorithmic & Interactive Logic)
**Goal**: Port complex business logic from legacy global scripts to pure TypeScript functions and custom React Hooks; achieve logic-UI decoupling to improve testability and reusability.
**Exit Criteria**: All core algorithms ported and unit testable, custom hooks functional, no legacy script dependencies for new features.

1.  **Algorithmic Utilities (Pure TypeScript Functions, No React Dependencies)**
    *   *Core Requirement*: Implement as pure functions (no side effects, deterministic output based on input) to enable independent unit testing and future reuse across other features.
    *   [ ] `NormalMapGenerator`: Port Sobel/Scharr edge detection algorithms, Grayscale conversion, and Oklab brightness adjustment logic.
    *   [ ] `SDFGenerator`: Port Signed Distance Field (SDF) generation logic for Emboss/Deboss visual effects.
    *   [ ] `TextureGenerator`: Port Perlin Noise algorithm and procedural texture generation logic (e.g., Brushed metal, Noise patterns, gradient textures).

2.  **Custom React Hooks (Encapsulate Interactive & Stateful Logic)**
    *   *Core Requirement*: Encapsulate React-specific logic into custom hooks to promote code reuse and separate UI rendering from business logic.
    *   [ ] `useCanvasInteraction`: Handle canvas Pan, Zoom, and "Ghost Edge" detection logic; expose unified interaction APIs for the `SpatialCanvas` component.
    *   [ ] `useSelectionSync`: Implement bi-directional sync logic between Figma's native selection and React's global state to ensure data consistency across the plugin.
    *   [ ] `useAutoNaming`: Port the legacy "H-Panel" based auto-naming algorithm (L/R/F/HT/HB naming rules) and expose auto-naming triggers and results.

### Phase 4: Data Flow & Communication (Seamless UI ↔ Figma Sandbox Sync)
**Goal**: Establish a robust, modular data communication system between the React UI and Figma's plugin sandbox; ensure seamless, efficient data synchronization and event handling.
**Exit Criteria**: Modular plugin controller usable, message routing stable, high-cost operations optimized, no data sync discrepancies.

1.  **Plugin Controller (`code.ts`) Modularization**
    *   [ ] Refactor the monolithic `code.ts` into feature-based modular handlers: `handlers/export.ts`, `handlers/selection.ts`, `handlers/storage.ts`, etc.
    *   [ ] Implement a robust, type-safe `onMessage` router to organize and dispatch incoming UI messages to the corresponding modular handlers (eliminate messy conditional logic).

2.  **Event Handling & Performance Optimization**
    *   [ ] Decouple UI rendering from heavy data processing (use Web Workers where necessary) to ensure UI responsiveness even during complex operations.
    *   [ ] Implement debounced updates for high-cost operations (e.g., large Normal Map generation, bulk texture processing) to avoid frequent, redundant executions and improve plugin performance.
    *   [ ] Add error handling and fallback mechanisms for critical communication events to prevent plugin crashes.

### Phase 5: QA & Polish (Production-Ready Delivery)
**Goal**: Verify performance, functionality, and visual fidelity; fix edge cases and polish the user experience to meet production deployment standards.
**Exit Criteria**: Pass all performance benchmarks, 100% feature/visual parity with legacy plugin, no critical bugs, 60fps canvas interaction maintained.

1.  **Performance Profiling & Optimization**
    *   [ ] Profile React render cycles using React DevTools; minimize unnecessary re-renders via memoization (`React.memo`, `useMemo`, `useCallback`).
    *   [ ] Verify canvas interaction performance (ensure stable 60fps during Pan/Zoom/selection operations).
    *   [ ] Optimize bundle size (tree shaking, code splitting) to reduce plugin load time and memory usage.

2.  **Feature & Visual Parity Check (Comprehensive Validation)**
    *   [ ] Conduct pixel-perfect visual comparison between the new React UI and the legacy UI (use screenshot overlay tools for precise validation).
    *   [ ] Verify all export formats (JSON structure, file naming, data fields) match the legacy plugin exactly (no data loss or format deviation).
    *   [ ] Test all edge cases and corner scenarios (e.g., large project data, invalid inputs, network errors) to ensure functional robustness.
    *   [ ] Conduct user acceptance testing (UAT) to validate the user experience matches the legacy plugin.

---

## 3. Execution Priority Queue (Clear, Actionable Roadmap)
This queue prioritizes early wins, foundation stability, and incremental complexity to minimize project risk and accelerate validation.

1.  **Environment Setup**: Tailwind CSS configuration & Zustand Store initialization (**foundation for all subsequent work**; no functionality, but enables all future development).
2.  **Core UI**: `MainLayout` & Empty Viewport implementation (**build the UI skeleton**; validate layout consistency with legacy plugin early).
3.  **Export Feature**: Export Tab migration & Basic UI-Plugin communication (**quick win**; validate the end-to-end data flow and core architecture feasibility).
4.  **Fold Feature**: Fold Tab, Spatial Canvas interaction, Auto-naming logic (**medium complexity**; build on early wins, validate recursive components and interaction logic).
5.  **Craft Feature**: Craft Tab, Normal Map algorithms, Texture generation (**high complexity**; centralize resources to tackle the most challenging functionality).
6.  **Integration & Polish**: WebGPU 3D linking, full end-to-end testing, bug fixes, and user experience polish (**production readiness**; ensure all components work seamlessly together).

---

## 4. Key Optimization Highlights (vs. Original Version)
1.  **Clearer Exit Criteria**: Added explicit exit criteria for each phase to ensure measurable progress and avoid vague deliverables.
2.  **Enhanced Risk Mitigation**: Emphasized low-risk incremental migration, error handling, and fallback mechanisms throughout each phase.
3.  **More Actionable Details**: Added specific technical notes (e.g., `tsconfig.json` `strict: true`, React memoization) to reduce implementation ambiguity.
4.  **Stronger Consistency Guarantees**: Reinforced visual/functional parity requirements at each stage, not just the final QA phase.
5.  **Improved Readability**: Structured bullet points, consistent formatting, and clear section hierarchy to make the plan easier to follow for the entire team.
