import { create } from 'zustand'
import type { ThemeMode, TabPage, TreeCategory, LineMode } from '../types'

interface AppState {
  theme: ThemeMode
  leftPanelVisible: boolean
  rightPanelVisible: boolean
  activeTabId: string
  tabs: TabPage[]
  selectedCellIds: string[]
  selectedEdgeIds: string[]
  canvasSize: { width: number; height: number }
  canvasBgColor: string
  canvasBgImage: string
  canvasBgImageFill: string
  canvasShowGrid: boolean
  canvasGridSize: number
  zoom: number
  lineMode: LineMode
  categories: TreeCategory[]
  defaultTree: TreeCategory[]
  activeCategoryKey: string
  activeComponentKey: string

  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setLeftPanelVisible: (visible: boolean) => void
  setRightPanelVisible: (visible: boolean) => void
  addTab: () => void
  removeTab: (id: string) => void
  setActiveTab: (id: string) => void
  setSelectedCellIds: (ids: string[]) => void
  setSelectedEdgeIds: (ids: string[]) => void
  setCanvasSize: (size: { width: number; height: number }) => void
  setCanvasBgColor: (color: string) => void
  setCanvasBgImage: (image: string) => void
  setCanvasBgImageFill: (fill: string) => void
  setCanvasShowGrid: (show: boolean) => void
  setCanvasGridSize: (size: number) => void
  setZoom: (zoom: number) => void
  setLineMode: (mode: LineMode) => void
  setActiveCategory: (key: string) => void
  setActiveComponent: (key: string) => void
  getActiveGraph: () => any
}

// 默认组件分类
const defaultCategories: TreeCategory[] = [
  {
    key: 'basic',
    title: '基本',
    icon: '⬚',
    children: [
      { key: 'line', label: '独立直线', icon: '━', category: 'basic', type: '1' },
      { key: 'rect', label: '矩形', icon: '▭', category: 'basic', type: '1' },
      { key: 'circle', label: '圆形', icon: '○', category: 'basic', type: '1' },
      { key: 'ellipse', label: '椭圆', icon: '⬭', category: 'basic', type: '1' },
      { key: 'polygon', label: '多边形', icon: '⬡', category: 'basic', type: '1' },
      { key: 'polyline', label: '折线', icon: '〰', category: 'basic', type: '1' },
      { key: 'path', label: '路径', icon: '✦', category: 'basic', type: '1' },
      { key: 'text', label: '文本', icon: 'T', category: 'basic', type: '1' },
      { key: 'arc', label: '弧线', icon: '⌒', category: 'basic', type: '2' },
      { key: 'sector', label: '扇形', icon: '◠', category: 'basic', type: '2' },
      { key: 'chord', label: '弓形', icon: '◡', category: 'basic', type: '2' },
    ],
  },
  {
    key: 'custom',
    title: '自定义',
    icon: '⚙',
    children: [
      { key: 'switch', label: '开关', icon: '🔘', category: 'custom', type: '1' },
      { key: 'simpletable', label: '简单表格', icon: '▦', category: 'custom', type: '1' },
      { key: 'fan', label: '风扇', icon: '✺', category: 'custom', type: '3' },
    ],
  },
  {
    key: 'echarts',
    title: 'ECharts',
    icon: '📊',
    children: [
      { key: 'echarts-line', label: '折线图', icon: '📈', category: 'echarts', type: '1' },
      { key: 'echarts-bar', label: '柱状图', icon: '📊', category: 'echarts', type: '1' },
      { key: 'echarts-pie', label: '饼图', icon: '🥧', category: 'echarts', type: '4' },
      { key: 'echarts-gauge', label: '仪表盘', icon: '🚀', category: 'echarts', type: '4' },
      { key: 'echarts-clock', label: '时钟', icon: '🕐', category: 'echarts', type: '4' },
    ],
  },
  {
    key: 'gif',
    title: 'GIF动画',
    icon: '🎬',
    children: [
      { key: 'gif-1', label: '动画1', icon: '🎞', category: 'gif', type: '1' },
      { key: 'gif-2', label: '动画2', icon: '🎞', category: 'gif', type: '2' },
    ],
  },
  {
    key: 'apng',
    title: 'APNG动画',
    icon: '🎞',
    children: [
      { key: 'apng-1', label: '动画1', icon: '🖼', category: 'apng', type: '1' },
      { key: 'apng-2', label: '动画2', icon: '🖼', category: 'apng', type: '2' },
    ],
  },
  {
    key: 'vtable',
    title: 'VTable表格',
    icon: '📋',
    children: [
      { key: 'vtable-demo', label: '表格示例', icon: '📋', category: 'vtable', type: '1' },
    ],
  },
  {
    key: 'antd',
    title: 'Antd',
    icon: '🌳',
    children: [
      { key: 'antd-tree', label: 'Tree组件', icon: '🌳', category: 'antd', type: '1' },
    ],
  },
  {
    key: 'svg',
    title: 'SVG',
    icon: '✦',
    children: [
      { key: 'svg-static', label: '静态SVG', icon: '◇', category: 'svg', type: '1' },
      { key: 'svg-dynamic1', label: '旋转齿轮', icon: '⚙', category: 'svg', type: '2' },
      { key: 'svg-dynamic2', label: '脉动心形', icon: '♥', category: 'svg', type: '2' },
      { key: 'svg-file1', label: '弹跳小球', icon: '◉', category: 'svg', type: '2' },
      { key: 'svg-file2', label: '旋转加载', icon: '↻', category: 'svg', type: '2' },
    ],
  },
  {
    key: 'image',
    title: '图片',
    icon: '🖼',
    children: [
      { key: 'img-png', label: 'PNG', icon: '🖼', category: 'image', type: '1' },
      { key: 'img-jpg', label: 'JPG', icon: '🖼', category: 'image', type: '4' },
      { key: 'img-svg', label: 'SVG图片', icon: '🖼', category: 'image', type: '5' },
      { key: 'img-gif', label: 'GIF图片', icon: '🖼', category: 'image', type: '1' },
    ],
  },
]

const defaultTree = [
  {
    key: '1',
    title: '组件库1',
    icon: '⬚',
  },
  {
    key: '2',
    title: '组件库2',
    icon: '⬚',
  },
]

let tabCounter = 0
const createTab = (): TabPage => {
  tabCounter++
  return {
    id: `tab-${Date.now()}-${tabCounter}`,
    title: `画布 ${tabCounter}`,
    graph: null,
  }
}

const initialTab = createTab()

export const useAppStore = create<AppState>((set, get) => ({
  theme: 'dark', // 默认主题
  leftPanelVisible: true, // 默认显示左侧面板
  rightPanelVisible: true, // 默认显示右侧面板
  activeTabId: initialTab.id, // 默认选中第一个画布页
  tabs: [initialTab], // 默认画布页
  selectedCellIds: [], // 默认选中单元格
  selectedEdgeIds: [], // 默认选中边
  canvasSize: { width: 1200, height: 800 }, // 默认画布大小
  canvasBgColor: '#1e1e1e', // 默认画布背景颜色
  canvasBgImage: '', // 默认画布背景图片
  canvasBgImageFill: 'unset', // 默认画布背景图片填充模式
  canvasShowGrid: true, // 默认显示网格
  canvasGridSize: 10, // 默认网格大小
  zoom: 1, // 默认缩放比例
  lineMode: 'none', // 默认不开启画线模式
  categories: defaultCategories, // 默认组件分类
  defaultTree: defaultTree, // 默认组件库树
  activeCategoryKey: 'basic', // 默认选中基本分类
  activeComponentKey: '', // 默认选中空组件

  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  setLeftPanelVisible: (visible) => set({ leftPanelVisible: visible }),
  setRightPanelVisible: (visible) => set({ rightPanelVisible: visible }),

  addTab: () => {
    const { tabs } = get()
    if (tabs.length >= 10) return
    const newTab = createTab()
    set({ tabs: [...tabs, newTab], activeTabId: newTab.id })
  },
  removeTab: (id) => {
    const { tabs, activeTabId } = get()
    if (tabs.length <= 1) return
    const index = tabs.findIndex((t) => t.id === id)
    const newTabs = tabs.filter((t) => t.id !== id)
    const newActiveTabId = activeTabId === id ? (newTabs[Math.max(0, index - 1)]?.id ?? newTabs[0]?.id) : activeTabId
    set({ tabs: newTabs, activeTabId: newActiveTabId, selectedCellIds: [], selectedEdgeIds: [] })
  },
  setActiveTab: (id) => set({ activeTabId: id, selectedCellIds: [], selectedEdgeIds: [] }),

  setSelectedCellIds: (ids) => set({ selectedCellIds: ids }),
  setSelectedEdgeIds: (ids) => set({ selectedEdgeIds: ids }),

  setCanvasSize: (size) => set({ canvasSize: size }),
  setCanvasBgColor: (color) => set({ canvasBgColor: color }),
  setCanvasBgImage: (image) => set({ canvasBgImage: image }),
  setCanvasBgImageFill: (fill) => set({ canvasBgImageFill: fill }),
  setCanvasShowGrid: (show) => set({ canvasShowGrid: show }),
  setCanvasGridSize: (size) => set({ canvasGridSize: size }),
  setZoom: (zoom) => set({ zoom }),
  setLineMode: (mode) => set({ lineMode: mode }),

  setActiveCategory: (key) => set({ activeCategoryKey: key, activeComponentKey: '' }),
  setActiveComponent: (key) => set({ activeComponentKey: key }),

  getActiveGraph: () => {
    const { tabs, activeTabId } = get()
    const tab = tabs.find((t) => t.id === activeTabId)
    return tab?.graph ?? null
  },
}))

// Debug: expose store to window for testing
if (typeof window !== 'undefined') {
  (window as any).__appStore = useAppStore
}
