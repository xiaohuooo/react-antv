# WebPMC

基于 React + AntV X6 的可视化图形编辑器，用于绘制与编排图形

## 技术栈

- **框架**：React 18 + TypeScript + Vite
- **图形引擎**：@antv/x6（节点/边、分组、缩放/旋转、撤销重做、剪贴板）
- **UI 组件**：Ant Design 6
- **数据可视化**：ECharts、@visactor/react-vtable

## 快速开始

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务
npm run build    # 类型检查 + 生产构建
npm run preview  # 预览构建产物
```

## 目录结构

```
src/
├── App.tsx                 # 应用入口：装配菜单栏 / 工具栏 / 三栏布局
├── components/
│   ├── canvas/
│   │   ├── CanvasTab.tsx   # 画布主体：X6 实例、事件绑定、键盘快捷键
│   │   └── Ruler.tsx        # 标尺
│   ├── layout/
│   │   ├── MenuBar.tsx      # 顶部菜单
│   │   ├── Toolbar.tsx      # 工具栏（撤销/复制/分组/层级/画线/导出 等）
│   │   ├── LeftPanel.tsx    # 左侧组件库
│   │   ├── RightPanel.tsx   # 右侧属性面板
│   │   └── CenterTabs.tsx   # 中心多画布页签
│   └── vtable/             # VTable 示例
├── stores/
│   └── appStore.ts          # Zustand 全局状态
└── x6/
    └── shapes/
        ├── basic.ts         # 基础图形注册（矩形/圆/多边形/弧/扇形 等）
        └── custom.ts        # 自定义节点注册 + 分组变换同步等工具函数
```

## 主要功能

- **图形绘制**：内置矩形、圆、椭圆、文本、多边形、路径、弧线、扇形、弓形等基础形状
- **自定义组件**：开关、风扇（旋转动画）、表格、动态 / 静态 SVG、图片节点
- **分组管理**：多选创建分组，分组缩放/旋转时子节点同步变换（基于 `data.groupOrigin` 的仿射计算）
- **编辑能力**：撤销/重做、复制/剪切/粘贴、删除、上移/下移/置顶/置底
- **画线模式**：自由直线、折线
- **交互辅助**：标尺、网格、主题切换（明/暗）
- **数据互通**：导出画布 JSON、剪贴板跨分组复制

## 分组变换同步说明

分组父节点在创建时会把每个子节点的原始中心 / 尺寸 / 角度存入 `data.groupOrigin.children`。
缩放或旋转父节点时，`syncGroupChildrenTransform`（见 [src/x6/shapes/custom.ts](src/x6/shapes/custom.ts)）按父节点当前缩放比与旋转角对子节点偏移做仿射变换，从而同步子节点的位置 / 尺寸 / 角度。

> 注意：复制 / 粘贴分组时，X6 会为子节点生成新 ID。`remapPastedGroupChildren` 负责把 `groupOrigin.children` 中的旧 ID 重映射到粘贴后实际嵌入的新子节点，避免多个分组互相串扰。Toolbar 按钮与 Ctrl+V 两个粘贴入口均已接入。
