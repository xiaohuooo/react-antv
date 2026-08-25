export type ThemeMode = 'dark' | 'light'

// 画线模式：none 未开启 / straight 自由直线（两次点击） / polyline 折线（多点，右键或双击结束）
export type LineMode = 'none' | 'straight' | 'polyline'

export interface TabPage {
  id: string
  title: string
  graph: any
}

export interface ComponentItem {
  key: string
  label: string
  icon: string
  category: string
  data?: Record<string, any>
  type?: string
}

export interface TreeCategory {
  key: string
  title: string
  icon: string
  children?: ComponentItem[]
  type?: string
}
