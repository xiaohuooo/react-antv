import { Graph, Node } from '@antv/x6'
import { register } from '@antv/x6-react-shape'
import { Tree } from 'antd'
import { ListTable } from '@visactor/react-vtable';
import React from 'react'
import ReactECharts from 'echarts-for-react';

// 标记是否已注册自定义节点，避免重复注册
let registered = false
// 标记是否已注入风扇动画样式，避免重复注入
let fanStyleInjected = false

// 表格最大行列数
const MAX_TABLE_ROWS = 6
const MAX_TABLE_COLS = 6

/**
 * 生成表格测试数据
 * 第1、2列包含相邻相同字符串便于测试行合并
 * 其他列自动生成"XX行XX列串"格式内容
 */
function generateTableData(rowCount: number, colCount: number): string[][] {
  const data: string[][] = []

  // 第0行作为列头行
  const headerRow: string[] = []
  for (let c = 0; c < colCount; c++) {
    headerRow.push(`列${c + 1}`)
  }
  data.push(headerRow)

  // 内容行（从第1行开始）
  for (let r = 0; r < rowCount - 1; r++) {
    const row: string[] = []
    for (let c = 0; c < colCount; c++) {
      if (c === 0) {
        // 第1列：预设相邻相同值
        const col0Data = ['组A', '组A', '组A', '组B', '组B', '组C']
        row.push(col0Data[r % col0Data.length])
      } else if (c === 1) {
        // 第2列：预设相邻相同值
        const col1Data = ['产品', '产品', '服务', '服务', '服务', '其他']
        row.push(col1Data[r % col1Data.length])
      } else {
        // 其他列：自动生成
        row.push(`${r + 1}行${c + 1}列串`)
      }
    }
    data.push(row)
  }
  return data
}

/**
 * 检测行合并：在指定列中找到相邻相同内容的单元格进行合并
 * 返回合并映射：mergedCells[col] = [{startRow, span}]
 * 注意：跳过第0行（列头行），从第1行开始检测合并
 */
function detectRowMerges(data: string[][], mergeCols: number): Map<number, Array<{ startRow: number; span: number }>> {
  const merges = new Map<number, Array<{ startRow: number; span: number }>>()
  const rowCount = data.length
  const effectiveCols = Math.min(mergeCols, data[0]?.length || 0)

  // 从第1行开始（跳过列头行第0行）
  for (let c = 0; c < effectiveCols; c++) {
    const colMerges: Array<{ startRow: number; span: number }> = []
    let r = 1  // 从第1行开始，跳过列头行
    while (r < rowCount) {
      let span = 1
      while (r + span < rowCount && data[r][c] === data[r + span][c]) {
        span++
      }
      if (span > 1) {
        colMerges.push({ startRow: r, span })
      }
      r += span
    }
    if (colMerges.length > 0) {
      merges.set(c, colMerges)
    }
  }
  return merges
}

/**
 * 注入风扇旋转动画所需的 CSS 样式
 * 包含旋转动画关键帧、旋转器和缩放器的样式
 */
function injectFanStyle() {
  if (fanStyleInjected) return
  fanStyleInjected = true
  const style = document.createElement('style')
  style.textContent = `
    @keyframes fan-spin-cw {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .fan-rotator {
      animation: fan-spin-cw 2s linear infinite;
      transform-origin: 50% 50%;
      transform-box: fill-box;
    }
    .fan-scaler {
      transform-box: fill-box;
    }
  `
  document.head.appendChild(style)
}

/**
 * 风扇叶片 SVG 路径数据
 * 这是一个完整的叶片形状，基于特定坐标系设计
 * 坐标原点在叶片根部附近
 */

const FAN_BLADE_PATH = 'm31.48,27.15a21.32,21.32 0 0 1 -2.66,-6.58a24.55,24.55 0 0 1 -0.55,-8.25a14.44,14.44 0 0 1 2.92,-7.88a10.56,10.56 0 0 1 6.89,-4.23a21.63,21.63 0 0 1 7.24,0.27a20.01,20.01 0 0 1 8.2,3.88a8.06,8.06 0 0 1 3.17,4.63c0.32,1.38 0.16,3.39 -2.27,5.07l-0.04,0.02a42.3,42.3 0 0 0 -6.31,4.75a31.45,31.45 0 0 0 -6.21,7.96a31.37,31.37 0 0 1 -1.68,2.84c-0.12,0.15 -0.25,0.27 -0.36,0.4l-7.56,-1.79l-0.78,-1.09z'
const FAN_BLADE_PATH1 = 'm30.96,27.15a18.02,21.32 0 0 1 -2.25,-6.58a20.75,24.55 0 0 1 -0.46,-8.25a12.21,14.44 0 0 1 2.47,-7.88a8.93,10.56 0 0 1 5.82,-4.23a18.28,21.63 0 0 1 6.12,0.27a16.91,20.01 0 0 1 6.93,3.88a6.81,8.06 0 0 1 2.68,4.63c0.27,1.38 0.14,3.39 -1.92,5.07l-0.03,0.02a35.75,42.3 0 0 0 -5.33,4.75a26.58,31.45 0 0 0 -5.25,7.96a26.51,31.37 0 0 1 -1.42,2.84c-0.1,0.15 -0.21,0.27 -0.3,0.4l-6.39,-1.79l-0.66,-1.09z'
const FAN_BLADE_PATH3 = 'm29.65,27.15a28.38,21.32 0 0 1 -3.54,-6.58a32.68,24.55 0 0 1 -0.73,-8.25a19.22,14.44 0 0 1 3.89,-7.88a14.06,10.56 0 0 1 9.17,-4.23a28.79,21.63 0 0 1 9.64,0.27a26.64,20.01 0 0 1 10.17,3.69a10.73,8.06 0 0 1 4.22,4.63c0.43,1.38 0.55,3.83 -3.02,5.07l-0.05,0.02a56.31,42.3 0 0 0 -7.45,5.12c-3,2.59 -6,5.18 -9.01,7.77a41.76,31.37 0 0 1 -2.57,2.65c-0.16,0.15 -0.33,0.27 -0.48,0.4l-9.19,-1.6l-1.04,-1.09z'
// 叶片根部在路径中的偏移量（叶片连接中心的位置）
const BLADE_ROOT_X = 32.27 + 7.5
const BLADE_ROOT_Y = 28.252 + 8

/**
 * 根据叶片数量选择叶片路径
 * 5 叶风扇使用 FAN_BLADE_PATH1，其它使用 FAN_BLADE_PATH
 *
 * @param bladeCount - 叶片数量
 * @returns 对应的叶片 SVG 路径数据
 */
function getBladePath(bladeCount: number): string {
  return bladeCount === 5 ? FAN_BLADE_PATH1 : bladeCount === 3 ? FAN_BLADE_PATH3 : FAN_BLADE_PATH
}

/**
 * 计算每个叶片的变换矩阵
 * 根据叶片数量和节点尺寸，将叶片均匀分布在圆周上
 * 
 * @param bladeCount - 叶片数量（3-5）
 * @param nodeWidth - 节点宽度
 * @param nodeHeight - 节点高度
 * @returns 每个叶片的 transform 字符串数组
 */
function computeBladeTransforms(
  bladeCount: number,
  nodeWidth: number,
  nodeHeight: number,
): Array<{ transform: string }> {
  const blades: Array<{ transform: string }> = []
  const angleStep = 360 / bladeCount

  // 叶片路径基于 ~80x80 的参考尺寸设计，需要缩放到节点大小
  // 使用较大尺寸使叶片填充更大维度，CSS 缩放将创建椭圆效果
  const maxDim = Math.max(nodeWidth, nodeHeight)
  // 基础缩放比例与根部偏移，确保风扇始终在外框内（叶片最远点 + 根部偏移 <= maxDim/2）
  const baseScale = maxDim / 85
  // 5 叶风扇时叶片整体缩小 1/4（uniform scale 保持形状不变，避免各向异性 scale 导致叶片形状畸变）
  const bladeScale = baseScale
  const rootDist = maxDim * 0.05

  for (let i = 0; i < bladeCount; i++) {
    // 从顶部（-90°）开始，顺时针分布
    const angleDeg = angleStep * i - 90
    const angleRad = (angleDeg * Math.PI) / 180

    // 根部相对于组原点(0,0)的位置
    // 叶片围绕原点对称分布，使包围盒中心在原点，与 refX/refY 中心对齐
    const rootX = rootDist * Math.cos(angleRad)
    const rootY = rootDist * Math.sin(angleRad)

    // 叶片旋转以指向外部（考虑叶片的自然方向）
    const rotate = angleDeg - 49

    // SVG 变换：平移到根部位置 → 旋转到正确方向 → 缩放到合适大小 → 将路径原点移到根部
    const transform = `translate(${rootX.toFixed(2)}, ${rootY.toFixed(2)}) rotate(${Math.round(rotate)}) scale(${bladeScale.toFixed(3)}) translate(${-BLADE_ROOT_X}, ${-BLADE_ROOT_Y})`

    blades.push({ transform })
  }

  return blades
}

/**
 * 根据配色模式和叶片索引获取叶片的填充色和边框色
 * 
 * @param colorMode - 配色模式：'mono'（单色）或 'gradient'（渐变色）
 * @param bladeIndex - 叶片索引（从0开始）
 * @returns 包含填充色和边框色的对象
 */
function getBladeColors(colorMode: 'mono' | 'gradient', bladeIndex: number): { fill: string; stroke: string } {
  if (colorMode === 'gradient') {
    // 渐变色模式：每个叶片使用不同的色相作为描边，填充引用对应渐变定义
    const hue = 200 + bladeIndex * 20
    return {
      // fill 在 updateFanScale 中被替换为 url(#fan-grad-...) 引用
      fill: '#ffffff',
      stroke: `hsl(${hue}, 70%, 40%)`,
    }
  }
  // 单色模式：所有叶片填充白色，蓝色描边
  return { fill: '#ffffff', stroke: '#1890ff' }
}

/**
 * 获取渐变色模式下叶片渐变的起止颜色
 * 使用 objectBoundingBox 坐标系，渐变会随叶片变换一起旋转
 *
 * @param bladeIndex - 叶片索引（从0开始）
 * @returns 渐变起止颜色 { light, dark }
 */
function getBladeGradientStops(bladeIndex: number): { light: string; dark: string } {
  const hue = 200 + bladeIndex * 20
  return {
    light: `hsl(${hue}, 85%, 78%)`,
    dark: `hsl(${hue}, 70%, 38%)`,
  }
}

/**
 * 在节点所属 SVG 的 <defs> 中创建/更新每个叶片的线性渐变定义
 * 使用 objectBoundingBox（默认）坐标系：渐变相对于叶片包围盒定义，
 * 因此会随叶片 transform 一起旋转，保证旋转时渐变方向跟随叶片
 *
 * @param node - X6 节点实例
 * @param graph - 图形实例
 * @param bladeCount - 叶片数量
 * @param colorMode - 配色模式
 */
function ensureFanGradients(
  node: Node,
  graph: Graph | undefined,
  bladeCount: number,
  colorMode: 'mono' | 'gradient',
) {
  if (colorMode !== 'gradient') return
  const bladesEl = getBladesEl(node, graph)
  if (!bladesEl) return
  const svg = (bladesEl as any).ownerSVGElement as SVGSVGElement | null
  if (!svg) return

  let defs = svg.querySelector('defs')
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    svg.insertBefore(defs, svg.firstChild)
  }

  const SVGNS = 'http://www.w3.org/2000/svg'
  // 用节点 id 命名空间避免多个风扇互相冲突
  const nodeKey = String(node.id || '').replace(/[^a-zA-Z0-9_-]/g, '-')

  for (let i = 0; i < bladeCount; i++) {
    const gradId = `fan-grad-${nodeKey}-${i}`
    let grad = svg.getElementById(gradId) as SVGLinearGradientElement | null
    const { light, dark } = getBladeGradientStops(i)
    if (!grad) {
      grad = document.createElementNS(SVGNS, 'linearGradient') as SVGLinearGradientElement
      grad.setAttribute('id', gradId)
      // objectBoundingBox（默认）：渐变随叶片包围盒旋转
      grad.setAttribute('x1', '0')
      grad.setAttribute('y1', '0')
      grad.setAttribute('x2', '1')
      grad.setAttribute('y2', '1')
      const stop1 = document.createElementNS(SVGNS, 'stop')
      stop1.setAttribute('offset', '0%')
      stop1.setAttribute('stop-color', light)
      const stop2 = document.createElementNS(SVGNS, 'stop')
      stop2.setAttribute('offset', '100%')
      stop2.setAttribute('stop-color', dark)
      grad.appendChild(stop1)
      grad.appendChild(stop2)
      defs.appendChild(grad)
    } else {
      const stops = grad.querySelectorAll('stop')
      if (stops.length >= 2) {
        stops[0].setAttribute('stop-color', light)
        stops[1].setAttribute('stop-color', dark)
      }
    }
  }
}

/**
 * 配置风扇节点
 * 在节点创建并添加到画布后调用此函数
 * 
 * @param node - X6 节点实例
 * @param bladeCount - 叶片数量（3-5）
 * @param colorMode - 配色模式
 * @param graph - 图形实例（用于查找视图）
 */
export function setupFanNode(
  node: Node,
  bladeCount: number = 3,
  colorMode: 'mono' | 'gradient' = 'mono',
  graph?: Graph,
) {
  // 注入风扇动画样式
  injectFanStyle()

  // 限制叶片数量在 3-5 之间
  const count = Math.max(3, Math.min(5, bladeCount))

  // 存储配置，供 updateFanScale 及 resize 时使用
  node.setData({
    ...node.getData(),
    bladeCount: count,
    colorMode,
  })

  // 由 updateFanScale 统一负责：叶片变换、中心圆/椭圆、旋转动画
  updateFanScale(node, graph)
}

/**
 * 获取节点的叶片组 DOM 元素
 * 叶片组是一个包含叶片路径子元素的 <g> 元素
 * 
 * @param node - X6 节点实例
 * @param graph - 图形实例
 * @returns 叶片组 SVG 元素或 null
 */
function getBladesEl(node: Node, graph?: Graph): SVGElement | null {
  // 尝试使用 graph 查找视图
  let view: any = null
  if (graph) {
    view = node.findView(graph)
  } else {
    // 如果没有 graph，无法查找视图
    return null
  }
  if (!view) return null
  const container = view.container
  if (!container) return null

  // 叶片组是容器 <g> 的第二个子元素（索引 1）
  // 结构：container[0] = circle (主体), container[1] = g (叶片), container[2] = ellipse (中心圆/椭圆)
  if (container.children.length >= 2) {
    const bladesEl = container.children[1]
    if (bladesEl && bladesEl.tagName === 'g') {
      return bladesEl as SVGElement
    }
  }

  // 备用方案：查找包含 <path> 子元素的 <g> 元素
  const gs = container.querySelectorAll('g')
  for (let i = 0; i < gs.length; i++) {
    const g = gs[i]
    if (g.querySelector('path')) {
      return g as SVGElement
    }
  }

  return null
}

/**
 * 更新风扇的尺寸适配与椭圆缩放
 * 根据当前节点尺寸：
 * - 重新计算叶片变换，使风扇随外框大小贴合
 * - 设置中心圆/椭圆（正方形为圆，长方形为椭圆，不随叶片旋转）
 * - 应用椭圆旋转动画
 * 在节点尺寸变化或初始化时调用
 *
 * @param node - X6 节点实例
 * @param graph - 图形实例
 */
export function updateFanScale(node: Node, graph?: Graph) {
  const size = node.getSize()
  const { width, height } = size

  // 读取叶片配置（resize 时从 data 获取，默认 3 叶单色）
  const data = node.getData() || {}
  const bladeCount = Math.max(3, Math.min(5, data.bladeCount || 3))
  const colorMode: 'mono' | 'gradient' = data.colorMode || 'mono'

  // 重新计算叶片变换，使叶片随外框大小贴合
  const transforms = computeBladeTransforms(bladeCount, width, height)
  // 5 叶风扇使用 FAN_BLADE_PATH1，其它使用 FAN_BLADE_PATH
  const bladePath = getBladePath(bladeCount)
  // 渐变定义 id 命名空间（每个风扇节点独立）
  const nodeKey = String(node.id || '').replace(/[^a-zA-Z0-9_-]/g, '-')
  const attrs: any = {}
  for (let i = 0; i < 5; i++) {
    const selector = `blade${i + 1}`
    if (i < bladeCount) {
      const { transform } = transforms[i]
      const colors = getBladeColors(colorMode, i)
      // 渐变模式：填充引用对应渐变定义（渐变随叶片旋转）
      const fill = colorMode === 'gradient' ? `url(#fan-grad-${nodeKey}-${i})` : colors.fill
      attrs[selector] = {
        d: bladePath,
        fill,
        stroke: colors.stroke,
        strokeWidth: 1,
        transform,
        // vector-effect: non-scaling-stroke 使线宽不随风扇缩放而变化
        style: 'visibility: visible; vector-effect: non-scaling-stroke',
      }
    } else {
      attrs[selector] = { style: 'visibility: hidden' }
    }
  }

  // 叶片组居中 + 初始隐藏（直到动画启动后再显示，避免左上角闪烁）
  attrs.blades = {
    refX: '50%',
    refY: '50%',
    style: 'visibility: hidden',
  }

  // 中心圆/椭圆：rx 随宽度、ry 随高度，正方形时 rx=ry 为正圆，长方形时为椭圆
  // hub 与 blades 为同级元素，不应用旋转动画，因此不随叶片旋转
  // 使用 x: width/2, y: height/2 + refX/refY = 50% 让 X6 把 hub 正确居中
  // 中心圆/椭圆在 0.09 基础上再缩小 1/4（0.09 → 0.0675），线宽固定为 2 并添加 non-scaling-stroke 保持不变
  attrs.hub = {
    refX: '50%',
    refY: '50%',
    x: width / 2,
    y: height / 2,
    rx: width * 0.0675,
    ry: height * 0.0675,
    fill: '#1890ff',
    stroke: '#fff',
    strokeWidth: 2,
    // vector-effect: non-scaling-stroke 使线宽不随风扇缩放而变化
    style: 'vector-effect: non-scaling-stroke',
  }

  node.setAttrs(attrs)

  // 计算椭圆缩放比例（旋转效果）：正方形不缩放为圆形旋转，长方形压缩为椭圆旋转
  let scaleX = 1
  let scaleY = 1
  if (width > height) {
    // 横向：压缩 Y 轴，创建侧面旋转效果（椭圆）
    scaleY = height / width
  } else if (height > width) {
    // 纵向：压缩 X 轴
    scaleX = width / height
  }

  // 先尝试立即应用居中变换（避免创建时闪烁在左上角）
  let retries = 0
  const maxRetries = 8
  const tryApply = () => {
    const bladesEl = getBladesEl(node, graph)
    if (bladesEl) {
      // 渐变模式下注入每个叶片的渐变定义（在显示前完成，避免无填充闪烁）
      ensureFanGradients(node, graph, bladeCount, colorMode)
      // 启动旋转动画（内含居中变换）
      startFanAnimation(bladesEl, scaleX, scaleY, width, height)
    } else if (retries < maxRetries) {
      retries++
      setTimeout(tryApply, 30)
    }
  }
  setTimeout(tryApply, 10)
}

/**
 * 更新开关节点的椭圆缩放与拨杆尺寸
 * 根据节点宽高比动态调整圆为椭圆、拨杆尺寸与描边
 * 外框为长方形时圆变为椭圆，外框为正方形时圆变为正圆
 *
 * @param node - X6 节点实例
 * @param graph - 图形实例
 */
export function updateSwitchScale(node: Node, _graph?: Graph) {
  const size = node.getSize()
  const { width, height } = size

  // 原始设计尺寸
  const origWidth = 100
  const origHeight = 60
  const origOuterR = 8
  const origInnerR = 4
  const origSwitchHeight = 2
  const origStrokeWidth = 1

  // 位置缩放比例
  const scaleX = width / origWidth
  const scaleY = height / origHeight
  const avgScale = (scaleX + scaleY) / 2

  // 椭圆半径：rx 随宽度缩放，ry 匹配外框宽高比
  const outerRx = origOuterR * scaleX
  const outerRy = outerRx * (height / width)
  const innerRx = origInnerR * scaleX
  const innerRy = innerRx * (height / width)

  // 位置（按比例缩放）
  const leftCx = 10 * scaleX
  const leftCy = 30 * scaleY
  const rightCx = 90 * scaleX
  const rightCy = 30 * scaleY

  // 开关拨杆（按比例缩放）
  const switchX = 15 * scaleX
  const switchY = 28 * scaleY
  const switchWidth = 70 * scaleX
  const switchHeight = origSwitchHeight * scaleY
  const strokeWidth = Math.max(1, origStrokeWidth * avgScale)

  // 开关旋转（缩放后的中心点）
  const switchOpenTransform = `rotate(-10,  ${switchX}, ${switchY})`

  // 应用属性：显式设置 switch 选择器的 height 与 strokeWidth，
  // 避免仅依赖 group 继承可能出现的层级合并问题
  const attrs: any = {
    lco: { cx: leftCx, cy: leftCy, rx: outerRx, ry: outerRy },
    lci: { cx: leftCx, cy: leftCy, rx: innerRx, ry: innerRy },
    rco: { cx: rightCx, cy: rightCy, rx: outerRx, ry: outerRy },
    rci: { cx: rightCx, cy: rightCy, rx: innerRx, ry: innerRy },
    switch: {
      x: switchX,
      y: switchY,
      width: switchWidth,
      height: switchHeight,
      strokeWidth,
      transform: switchOpenTransform,
    },
    line: {
      height: switchHeight,
      strokeWidth,
    },
  }

  node.setAttrs(attrs)
}

/**
 * 在叶片元素上启动或重新启动风扇旋转动画
 * 结合椭圆缩放和顺时针旋转
 * 通过 CSS translate 将叶片组从 X6 默认位置（左上角）平移到节点中心
 *
 * @param bladesEl - 叶片组 SVG 元素
 * @param scaleX - X 轴缩放比例
 * @param scaleY - Y 轴缩放比例
 * @param width - 节点宽度
 * @param height - 节点高度
 */
function startFanAnimation(
  bladesEl: SVGElement,
  scaleX: number,
  scaleY: number,
  width: number,
  height: number,
) {
  // 清理之前的动画
  const prevSheet = (bladesEl as any)._fanAnimSheet
  if (prevSheet) {
    prevSheet.remove()
      ; (bladesEl as any)._fanAnimSheet = null
  }

  // 为当前元素创建唯一的动画名称
  const animId = 'fan-anim-' + Date.now() + '-' + Math.floor(Math.random() * 10000)

  // 旋转中心：叶片根部的汇聚点，即局部坐标系原点 (0, 0)
  // 在 computeBladeTransforms 中，叶片围绕原点 (0,0) 对称分布：
  //   rootX = rootDist * cos(angle), rootY = rootDist * sin(angle)
  // 所有叶片根部都指向原点，所以原点就是真正的旋转中心（hub 中心）
  //
  // 注意：不能用 getBBox() 的中心作为旋转中心！
  // 因为单个叶片形状不对称（叶片向一个方向延伸），bbox 中心会偏离原点，
  // 导致旋转时摇摆/偏移。
  //
  // 变换顺序（从右到左作用于点）：
  //   1. rotate(deg)          围绕原点 (0,0) 旋转（叶片汇聚点）
  //   2. scale(sX, sY)        椭圆缩放（绕原点）
  //   3. translate(w/2, h/2)  将原点（旋转中心）平移到节点中心
  // transform-origin: 0 0 确保旋转/缩放围绕局部原点
  const baseTransform = `translate(${width / 2}px, ${height / 2}px) scale(${scaleX}, ${scaleY})`
  const startTransform = `${baseTransform} rotate(0deg)`
  const endTransform = `${baseTransform} rotate(360deg)`

  // 注入关键帧动画
  const styleSheet = document.createElement('style')
  styleSheet.id = animId
  styleSheet.textContent = `
    @keyframes ${animId} {
      from { transform: ${startTransform}; }
      to { transform: ${endTransform}; }
    }
  `
  document.head.appendChild(styleSheet)

  // 不使用 transform-box: fill-box（会导致旋转中心偏移）
  // transform-origin: 0 0 = 局部坐标系原点（叶片汇聚点 / hub 中心）
  bladesEl.style.animation = `${animId} 2s linear infinite`
  bladesEl.style.transformOrigin = '0 0'
  bladesEl.style.visibility = 'hidden'

  // 在浏览器完成一次样式计算后再显示，确保动画初始帧使用居中变换
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bladesEl.style.visibility = 'visible'
    })
  })

    // 存储引用以便清理
    ; (bladesEl as any)._fanAnimId = animId
    ; (bladesEl as any)._fanAnimSheet = styleSheet
}

/**
 * 清理风扇动画
 * 在节点销毁时调用，防止内存泄漏
 * 
 * @param node - X6 节点实例
 * @param graph - 图形实例
 */
export function cleanupFanAnimation(node: Node, graph?: Graph) {
  const bladesEl = getBladesEl(node, graph)
  if (bladesEl) {
    // 移除注入的样式
    if ((bladesEl as any)._fanAnimSheet) {
      ; (bladesEl as any)._fanAnimSheet.remove()
        ; (bladesEl as any)._fanAnimSheet = null
    }
    // 清除动画样式
    bladesEl.style.removeProperty('animation')
    bladesEl.style.removeProperty('transform-origin')
    bladesEl.style.removeProperty('transform-box')
    bladesEl.style.removeProperty('transform')
    bladesEl.style.removeProperty('visibility')
  }
}

/**
 * 表格节点配置选项
 */
interface TableNodeOptions {
  showTitle?: boolean
  mergeCols?: number
  rowCount?: number
  colCount?: number
  alternateFill?: boolean
  titleText?: string
}

/**
 * 配置表格节点
 * 根据选项动态生成表格内容、行列合并、样式等
 * 
 * @param node - X6 节点实例
 * @param options - 表格配置选项
 */
export function setupTableNode(
  node: Node,
  options: TableNodeOptions = {},
) {
  const {
    showTitle = true,
    mergeCols = 0,
    rowCount = 4,
    colCount = 3,
    alternateFill = true,
    titleText = '表格标题',
  } = options

  // 限制范围
  const rows = Math.max(1, Math.min(MAX_TABLE_ROWS, rowCount))
  const cols = Math.max(1, Math.min(MAX_TABLE_COLS, colCount))
  const mCols = Math.max(0, Math.min(cols, mergeCols))

  // 生成数据
  const data = generateTableData(rows, cols)

  // 检测行合并
  const merges = detectRowMerges(data, mCols)

  // 计算节点尺寸和单元格布局
  const size = node.getSize()
  const nodeW = size.width
  const nodeH = size.height

  // 标题区域高度
  const titleH = showTitle ? 28 : 0

  // 内边距
  const padding = 8
  const tableTop = titleH + padding
  const tableBottom = nodeH - padding
  const tableLeft = padding
  const tableRight = nodeW - padding
  const tableW = tableRight - tableLeft
  const tableH = tableBottom - tableTop

  // 计算列宽和行高
  const colWidth = tableW / cols
  const rowHeight = tableH / rows

  // 构建属性
  const attrs: any = {}

  // 标题
  attrs.title = {
    refX: '50%',
    refY: showTitle ? titleH / 2 + 4 : 0,
    fill: '#333',
    fontSize: 13,
    text: showTitle ? titleText : '',
    fontWeight: 'bold',
    textAnchor: 'middle',
    textVerticalAnchor: 'middle',
    style: showTitle ? 'visibility: visible' : 'visibility: hidden',
  }

  // 首先隐藏所有单元格
  for (let r = 0; r < MAX_TABLE_ROWS; r++) {
    for (let c = 0; c < MAX_TABLE_COLS; c++) {
      attrs[`cell_${r}_${c}`] = { style: 'visibility: hidden' }
      attrs[`cellText_${r}_${c}`] = { style: 'visibility: hidden' }
    }
  }

  // 追踪已被合并掉的单元格（不再单独显示）
  const mergedOutCells = new Set<string>()

  // 标记被合并的单元格
  merges.forEach((colMerges, col) => {
    for (const merge of colMerges) {
      for (let r = merge.startRow + 1; r < merge.startRow + merge.span; r++) {
        mergedOutCells.add(`${r}_${col}`)
      }
    }
  })

  // 配置每个可见单元格
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // 跳过被合并掉的单元格
      if (mergedOutCells.has(`${r}_${c}`)) {
        continue
      }

      // 检查该单元格是否是合并起始单元格
      const mergeInfo = getMergeInfo(merges, r, c)
      const span = mergeInfo ? mergeInfo.span : 1

      const x = tableLeft + c * colWidth
      const y = tableTop + r * rowHeight
      const w = colWidth
      const h = rowHeight * span

      // 判断是否是列头行（第0行）
      const isHeaderRow = r === 0

      // 填充逻辑：列头行使用独立颜色，内容行使用交错填充
      let fill: string
      if (isHeaderRow) {
        // 列头行：独立填充色（浅蓝色）
        fill = '#e6f4ff'
      } else if (alternateFill) {
        // 内容行：从第1行开始交错填充（r=1,2,3... → 对应 contentRow=0,1,2...）
        const contentRow = r - 1
        fill = contentRow % 2 === 0 ? '#f0f7ff' : '#ffffff'
      } else {
        fill = '#f0f7ff'
      }

      // 边框颜色
      const stroke = '#e0e0e0'
      const strokeWidth = 1

      // 圆角
      const rx = 1
      const ry = 1

      attrs[`cell_${r}_${c}`] = {
        x,
        y,
        width: w,
        height: h,
        fill,
        stroke,
        strokeWidth,
        rx,
        ry,
        style: 'visibility: visible',
      }

      // 文字位置：单元格中心
      const textX = x + w / 2
      const textY = y + h / 2

      // 列头行文字加粗，内容行正常
      attrs[`cellText_${r}_${c}`] = {
        refX: textX,
        refY: textY,
        fill: '#333',
        fontSize: 13,
        text: data[r][c],
        textAnchor: 'middle',
        textVerticalAnchor: 'middle',
        fontWeight: isHeaderRow ? 'bold' : 'normal',
        style: 'visibility: visible',
      }
    }
  }

  // 应用属性
  node.setAttrs(attrs)

  // 存储配置供后续使用
  node.setData({
    ...node.getData(),
    showTitle,
    mergeCols: mCols,
    rowCount: rows,
    colCount: cols,
    alternateFill,
    titleText,
  })
}

/**
 * 获取指定单元格的合并信息
 */
function getMergeInfo(
  merges: Map<number, Array<{ startRow: number; span: number }>>,
  row: number,
  col: number,
): { startRow: number; span: number } | null {
  const colMerges = merges.get(col)
  if (!colMerges) return null
  return colMerges.find(m => m.startRow === row) || null
}

/**
 * 注册所有自定义节点到 X6 Graph
 * 包含表格、风扇、图表、SVG、图片等多种节点类型
 * 只需调用一次
 */
export function registerCustomShapes() {
  if (registered) return
  registered = true

  // 注入风扇动画样式
  injectFanStyle()

  // ============ 注册自定义表格节点 ============
  // 生成表格 markup：固定最大 6x6 单元格，动态控制可见性
  const tableMarkup: any[] = [
    { tagName: 'rect', selector: 'body' },
    { tagName: 'text', selector: 'title' },
  ]
  for (let r = 0; r < MAX_TABLE_ROWS; r++) {
    for (let c = 0; c < MAX_TABLE_COLS; c++) {
      tableMarkup.push({ tagName: 'rect', selector: `cell_${r}_${c}` })
      tableMarkup.push({ tagName: 'text', selector: `cellText_${r}_${c}` })
    }
  }

  // 生成默认属性
  const tableAttrs: any = {
    body: { fill: '#fff', stroke: '#d9d9d9', strokeWidth: 1, rx: 8, ry: 8 },
    title: { refX: '50%', refY: 14, fill: '#333', fontSize: 13, text: '表格标题', fontWeight: 'bold' },
  }
  for (let r = 0; r < MAX_TABLE_ROWS; r++) {
    for (let c = 0; c < MAX_TABLE_COLS; c++) {
      tableAttrs[`cell_${r}_${c}`] = { style: 'visibility: hidden' }
      tableAttrs[`cellText_${r}_${c}`] = { style: 'visibility: hidden' }
    }
  }

  const ports = {
    groups: {
      right: {
        position: 'right',
        attrs: {
          circle: {
            r: 4,
            magnet: true,
            stroke: '#5F95FF',
            strokeWidth: 1,
            fill: '#fff',
            style: {
              visibility: 'hidden',
            },
          },
        },
      },
      left: {
        position: 'left',
        attrs: {
          circle: {
            r: 4,
            magnet: true,
            stroke: '#5F95FF',
            strokeWidth: 1,
            fill: '#fff',
            style: {
              visibility: 'hidden',
            },
          },
        },
      },
    },
    items: [
      {
        group: 'right',
      },
      {
        group: 'left',
      },
    ],
  }
  const switchCenter = {
    x: 15,
    y: 28,
  }
  const switchOpen = `rotate(-15, ${switchCenter.x}, ${switchCenter.y})`
  const switchClose = `rotate(-12, ${switchCenter.x}, ${switchCenter.y})`
  // 自定义开关
  Graph.registerNode('custom-switch', {
    inherit: 'rect',
    width: 100,
    height: 60,
    markup: [
      {
        tagName: 'g',
        selector: 'left-group',
        children: [
          // {
          //   tagName: 'rect',
          //   selector: 'left',
          //   groupSelector: 'line',
          //   attrs: {
          //     x: 0,
          //     y: 30,
          //   },
          // },
          {
            tagName: 'ellipse',
            selector: 'lco',
            groupSelector: 'co',
            attrs: {
              cx: 10,
              cy: 30,
            },
          },
          {
            tagName: 'ellipse',
            selector: 'lci',
            groupSelector: 'ci',
            attrs: {
              cx: 10,
              cy: 30,
            },
          },
        ],
      },
      {
        tagName: 'rect',
        selector: 'switch',
        groupSelector: 'line',
      },
      {
        tagName: 'g',
        selector: 'right-group',
        children: [
          // {
          //   tagName: 'rect',
          //   selector: 'right',
          //   groupSelector: 'line',
          //   attrs: {
          //     x: 70,
          //     y: 30,
          //   },
          // },
          {
            tagName: 'ellipse',
            selector: 'rco',
            groupSelector: 'co',
            attrs: {
              cx: 90,
              cy: 30,
            },
          },
          {
            tagName: 'ellipse',
            selector: 'rci',
            groupSelector: 'ci',
            attrs: {
              cx: 90,
              cy: 30,
            },
          },
        ],
      },
    ],
    attrs: {
      line: {
        width: 30,
        height: 2,
        fill: '#ff0000',
        stroke: '#ff0000',
      },
      co: {
        rx: 8,
        ry: 8,
        fill: '#ff0000',
      },
      ci: {
        rx: 4,
        ry: 4,
        fill: '#ffffff',
      },
      ellipse: {
        fill: '#ff0000',
      },
      switch: {
        ...switchCenter,
        width: 70,
        transform: switchOpen,
      },
    },
    ports,

  })

  Graph.registerNode('custom-simpletable', {
    inherit: 'rect',
    width: 260,
    height: 180,
    markup: tableMarkup,
    attrs: tableAttrs,
  })

  // ============ 注册增强型风扇节点 ============
  // 功能特性：
  // - 动态叶片数量（3-5）
  // - 顺时针旋转动画
  // - 正方形为圆形旋转，长方形为椭圆旋转（侧面旋转效果）
  // - 单色或渐变色配色模式
  Graph.registerNode('custom-fan', {
    inherit: 'rect',
    width: 80,
    height: 80,
    markup: [
      { tagName: 'circle', selector: 'body' },        // 主体（透明边框）
      {
        tagName: 'g',
        selector: 'blades',                          // 叶片组（旋转）
        children: [
          { tagName: 'path', selector: 'blade1' },   // 叶片 1-5
          { tagName: 'path', selector: 'blade2' },
          { tagName: 'path', selector: 'blade3' },
          { tagName: 'path', selector: 'blade4' },
          { tagName: 'path', selector: 'blade5' },
        ],
      },
      { tagName: 'ellipse', selector: 'hub' },        // 中心圆/椭圆（不随叶片旋转）
    ],
    attrs: {
      body: { fill: 'transparent', stroke: '#1890ff', strokeWidth: 1, style: 'vector-effect: non-scaling-stroke' },
      blades: {
        refX: '50%',
        refY: '50%',
        style: 'visibility: hidden',
      },
      // 中心圆/椭圆：正方形为圆，长方形为椭圆；由 updateFanScale 动态设置 rx/ry
      // 默认 80x80 节点：rx=ry=5.4（0.0675*80），线宽固定 2 且添加 non-scaling-stroke 保持不变
      hub: {
        refX: '50%',
        refY: '50%',
        rx: 5.4,
        ry: 5.4,
        fill: '#1890ff',
        stroke: '#fff',
        strokeWidth: 2,
        style: 'vector-effect: non-scaling-stroke',
      },
      // 默认叶片位置（80x80 节点），将被 setupFanNode 替换
      // bladeScale=80/85≈0.941，rootDist=4，确保风扇在外框内
      blade1: { d: FAN_BLADE_PATH, fill: '#ffffff', stroke: '#1890ff', strokeWidth: 1, transform: 'translate(0, -4) rotate(-139) scale(0.941) translate(-39.77, -36.252)', style: 'vector-effect: non-scaling-stroke' },
      blade2: { d: FAN_BLADE_PATH, fill: '#ffffff', stroke: '#1890ff', strokeWidth: 1, transform: 'translate(3.46, 2) rotate(-19) scale(0.941) translate(-39.77, -36.252)', style: 'vector-effect: non-scaling-stroke' },
      blade3: { d: FAN_BLADE_PATH, fill: '#ffffff', stroke: '#1890ff', strokeWidth: 1, transform: 'translate(-3.46, 2) rotate(101) scale(0.941) translate(-39.77, -36.252)', style: 'vector-effect: non-scaling-stroke' },
      blade4: { style: 'visibility: hidden' },
      blade5: { style: 'visibility: hidden' },
      // hub: { refX: '50%', refY: '50%', r: 5, fill: '#1890ff', stroke: '#fff', strokeWidth: 2 },
    },
  })

  // ============ 注册 ECharts 风格折线图节点 ============
  register({
    shape: 'custom-echarts-line',
    width: 380,
    height: 250,
    effect: ['option', 'size'],
    component: ({ node }: { node: Node }) => {
      const option = node.prop('option')
      const size = node.prop('size')
      return React.createElement(ReactECharts, { option, style: size })
    },
  })

  // ============ 注册 ECharts 风格柱状图节点 ============
  register({
    shape: 'custom-echarts-bar',
    width: 380,
    height: 250,
    effect: ['option', 'size'],
    component: ({ node }: { node: Node }) => {
      const option = node.prop('option')
      const size = node.prop('size')
      return React.createElement(ReactECharts, { option, style: size })
    },
  })

  // ============ 注册 ECharts 风格饼图节点 ============

  register({
    shape: 'custom-echarts-pie',
    width: 380,
    height: 250,
    effect: ['option', 'size'],
    component: ({ node }: { node: Node }) => {
      const option = node.prop('option')
      const size = node.prop('size')
      return React.createElement(ReactECharts, { option, style: size })
    },
  })

  // ============ 注册 antd Tree 组件节点 ============
  register({
    shape: 'custom-tree',
    width: 320,
    height: 225,
    effect: ['color', 'size'],
    component: ({ node }: { node: Node }) => {
      const size = node.prop('size')
      const treeData = (node.getData()?.treeData) || [
        {
          title: '项目根目录',
          key: 'root',
          children: [
            {
              title: '源代码',
              key: 'src',
              children: [
                { title: '入口文件.tsx', key: 'entry' },
                { title: '组件文件夹', key: 'components' },
              ],
            },
            {
              title: '资源文件',
              key: 'assets',
              children: [
                { title: '样式表.css', key: 'css' },
                { title: '图片资源', key: 'images' },
              ],
            },
            { title: '配置项.json', key: 'config' },
          ],
        },
      ]
      return React.createElement(
        'div',
        {
          style: {
            width: size.width,
            height: size.height,
            //   padding: '8px 10px',
            background: '#fff',
            //   borderRadius: 6,
            //   border: '1px solid #d9d9d9',
            //   boxSizing: 'border-box',
            //   overflow: 'hidden',
            //   fontSize: 12,
          },
        },
        React.createElement(Tree as any, {
          treeData,
          defaultExpandAll: true,
          blockNode: true,
          style: {
            fontSize: 12, background: 'transparent', overflow: 'auto', height: size.height, width: size.width, scrollbarWidth: 'thin',
            scrollbarColor: 'var(--ant-color-text) transparent',
          },
        }),
      )
    },
  })

  // ============ 注册 vtable 表格组件节点 ============
  register({
    shape: 'custom-vtable',
    width: 320,
    height: 225,
    effect: ['color', 'size'],
    component: ({ node }: { node: Node }) => {
      const option = (node.getData()?.option)
      const size = node.prop('size')
      console.log(option, '-----11111111')
      return React.createElement(
        'div',
        {
          style: {
            width: size.width,
            height: size.height,
            //   padding: '8px 10px',
            background: '#fff',
            //   borderRadius: 6,
            //   border: '1px solid #d9d9d9',
            //   boxSizing: 'border-box',
            //   overflow: 'hidden',
            //   fontSize: 12,
          },
        },
        React.createElement(ListTable as any, {
          option,
          height: size.height,
        }),
      )
    },
  })


  // ============ 注册静态 SVG 图形节点 ============
  Graph.registerNode('custom-svg-static', {
    inherit: 'rect',
    width: 140,
    height: 100,
    markup: [
      { tagName: 'rect', selector: 'body' },
      {
        tagName: 'g',
        selector: 'svgContent',
        children: [
          { tagName: 'path', selector: 'mountain1' },
          { tagName: 'path', selector: 'mountain2' },
          { tagName: 'circle', selector: 'sun' },
          { tagName: 'path', selector: 'cloud' },
        ],
      },
    ],
    attrs: {
      body: { fill: 'transparent', stroke: '#d9d9d9', strokeWidth: 1, rx: 4 },
      mountain1: { refX: '50%', refY: '50%', d: 'M -50 30 L -20 -20 L 10 15 Z', fill: '#52c41a' },
      mountain2: { refX: '50%', refY: '50%', d: 'M -10 25 L 25 -15 L 55 20 Z', fill: '#389e0d' },
      sun: { refX: '50%', refY: '50%', cx: 35, cy: -25, r: 10, fill: '#faad14' },
      cloud: { refX: '50%', refY: '50%', d: 'M -40 -30 Q -30 -45 -15 -35 Q -5 -50 10 -38 Q 25 -45 30 -30 Z', fill: '#e6f7ff', stroke: '#91d5ff', strokeWidth: 1 },
    },
  })

  // ============ 注册动态 SVG 节点1：旋转齿轮 (SMIL) ============
  Graph.registerNode('custom-svg-dynamic1', {
    inherit: 'rect',
    width: 120,
    height: 120,
    markup: [
      { tagName: 'rect', selector: 'body' },
      {
        tagName: 'g',
        selector: 'rotor',
        children: [
          { tagName: 'circle', selector: 'gearOuter' },
          { tagName: 'circle', selector: 'gearInner' },
          { tagName: 'circle', selector: 'gearCenter' },
          { tagName: 'g', selector: 'teethGroup' },
        ],
      },
    ],
    attrs: {
      body: { fill: 'transparent', stroke: '#d9d9d9', strokeWidth: 1, rx: 4 },
      rotor: { refX: '50%', refY: '50%' },
      gearOuter: { r: 40, fill: '#fa8c16', stroke: '#d46b08', strokeWidth: 2 },
      gearInner: { r: 25, fill: '#fff7e6', stroke: '#d46b08', strokeWidth: 1 },
      gearCenter: { r: 6, fill: '#d46b08' },
    },
  })

  // ============ 注册动态 SVG 节点2：脉动心形 (SMIL) ============
  Graph.registerNode('custom-svg-dynamic2', {
    inherit: 'rect',
    width: 120,
    height: 120,
    markup: [
      { tagName: 'rect', selector: 'body' },
      {
        tagName: 'g',
        selector: 'pulseGroup',
        children: [
          { tagName: 'path', selector: 'heart' },
          // { tagName: 'circle', selector: 'sparkle1' },
          // { tagName: 'circle', selector: 'sparkle2' },
          // { tagName: 'circle', selector: 'sparkle3' },
        ],
      },
    ],
    attrs: {
      body: { fill: 'transparent', stroke: '#d9d9d9', strokeWidth: 1, rx: 4 },
      pulseGroup: { refX: '50%', refY: '50%' },
      heart: {
        d: 'M 0 -30 C -20 -50, -45 -20, 0 25 C 45 -20, 20 -50, 0 -30 Z',
        fill: '#f5222d',
        stroke: '#cf1322',
        strokeWidth: 1.5,
      },
      // sparkle1: { cx: -30, cy: -30, r: 3, fill: '#fff1f0' },
      // sparkle2: { cx: 35, cy: 20, r: 2, fill: '#fff1f0' },
      // sparkle3: { cx: -15, cy: 35, r: 2.5, fill: '#fff1f0' },
    },
  })

  // ============ 注册 SVG 文件动画1：弹跳小球 (SMIL) ============
  Graph.registerNode('custom-svg-file1', {
    inherit: 'rect',
    width: 140,
    height: 120,
    markup: [
      { tagName: 'rect', selector: 'body' },
      {
        tagName: 'g',
        selector: 'animContainer',
        children: [],
      },
    ],
    attrs: {
      body: { fill: '#fafafa', stroke: '#d9d9d9', strokeWidth: 1, rx: 4 },
      animContainer: { refX: '50%', refY: '50%' },
    },
  })

  // ============ 注册 SVG 文件动画2：旋转加载 (SMIL) ============
  Graph.registerNode('custom-svg-file2', {
    inherit: 'rect',
    width: 120,
    height: 120,
    markup: [
      { tagName: 'rect', selector: 'body' },
      {
        tagName: 'g',
        selector: 'animContainer',
        children: [],
      },
    ],
    attrs: {
      body: { fill: '#fafafa', stroke: '#d9d9d9', strokeWidth: 1, rx: 4 },
      animContainer: { refX: '50%', refY: '50%' },
    },
  })

  // ============ 注册图片节点 ============
  Graph.registerNode('custom-image', {
    inherit: 'rect',
    width: 120,
    height: 90,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'image', selector: 'img' },  // 图片元素
      { tagName: 'text', selector: 'label' },
    ],
    attrs: {
      body: { fill: '#f5f5f5', stroke: '#d9d9d9', strokeWidth: 1, rx: 4 },
      img: {
        refWidth: '100%',
        refHeight: '100%',
        href: '',
        preserveAspectRatio: 'xMidYMid meet',
      },
      // label: { refX: '50%', refY: '100%', refDy: 4, fill: '#666', fontSize: 11, text: '图片' },
    },
  })

  // ============ 注册仪表盘节点 ============
  register({
    shape: 'custom-echarts-gauge',
    width: 380,
    height: 250,
    effect: ['option', 'size'],
    component: ({ node }: { node: Node }) => {
      const option = node.prop('option')
      console.log(option);
      const size = node.prop('size')
      return React.createElement(ReactECharts, { option, style: size })
    },
  })

  // ============ 注册时钟节点 ============
  register({
    shape: 'custom-echarts-clock',
    width: 380,
    height: 250,
    effect: ['option', 'size'],
    component: ({ node }: { node: Node }) => {
      const option = node.prop('option')
      console.log(option);
      const size = node.prop('size')
      return React.createElement(ReactECharts, { option, style: size })
    },
  })
}

// ============ SVG SMIL 动画配置 ============

/**
 * 为齿轮节点添加 SMIL 旋转动画
 */
function setupGearSmil(node: Node, graph: Graph) {
  const view = node.findView(graph)
  if (!view) return

  const container = view.container
  if (!container) return

  // 查找 rotor group (第一个 <g> 元素)
  let rotor: SVGGElement | null = null
  for (let i = 0; i < container.children.length; i++) {
    const child = container.children[i]
    if (child.tagName === 'g') {
      rotor = child as SVGGElement
      break
    }
  }
  if (!rotor) return

  // 查找 teethGroup (rotor 下最后一个 <g> 元素)
  let teethGroup: SVGGElement | null = null
  for (let i = rotor.children.length - 1; i >= 0; i--) {
    if (rotor.children[i].tagName === 'g') {
      teethGroup = rotor.children[i] as SVGGElement
      break
    }
  }
  const bbox = rotor.getBBox()
  rotor.style.translate = `${bbox.width / 2 - bbox.x / 4}px ${bbox.height / 2 - bbox.y / 4}px`
  // 创建齿轮齿
  if (teethGroup) {
    const toothCount = 8
    const toothLength = 8
    for (let i = 0; i < toothCount; i++) {
      const angle = (i * 360) / toothCount
      const tooth = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      tooth.setAttribute('x', '-3')
      tooth.setAttribute('y', `-${40 + toothLength}`)
      tooth.setAttribute('width', '6')
      tooth.setAttribute('height', `${toothLength}`)
      tooth.setAttribute('fill', '#d46b08')
      tooth.setAttribute('transform', `rotate(${angle})`)
      teethGroup.appendChild(tooth)
    }
  }

  // 添加 SMIL 旋转动画
  const animateTransform = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'animateTransform',
  )
  animateTransform.setAttribute('attributeName', 'transform')
  animateTransform.setAttribute('type', 'rotate')
  animateTransform.setAttribute('from', `0`)
  animateTransform.setAttribute('to', `360`)
  animateTransform.setAttribute('dur', '3s')
  animateTransform.setAttribute('repeatCount', 'indefinite')
  rotor.appendChild(animateTransform)
  // Force-start the SMIL animation
  requestAnimationFrame(() => {
    if (animateTransform.beginElement) {
      animateTransform.beginElement()
    }
  })
}

/**
 * 为心形节点添加 SMIL 脉动动画
 */
function setupHeartSmil(node: Node, graph: Graph) {
  const view = node.findView(graph)
  if (!view) return

  const container = view.container
  if (!container) return

  // 查找 pulseGroup (第一个 <g> 元素)
  let pulseGroup: SVGGElement | null = null
  for (let i = 0; i < container.children.length; i++) {
    const child = container.children[i]
    if (child.tagName === 'g') {
      pulseGroup = child as SVGGElement
      break
    }
  }
  if (!pulseGroup) return
  const bbox = pulseGroup.getBBox()
  pulseGroup.style.translate = `${bbox.width / 2 - bbox.x}px ${bbox.height / 2 - bbox.y}px`
  // 添加 SMIL 缩放动画
  const animateScale = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'animateTransform',
  )
  animateScale.setAttribute('attributeName', 'transform')
  animateScale.setAttribute('type', 'scale')
  animateScale.setAttribute('values', '1;1.15;1')
  animateScale.setAttribute('keyTimes', '0;0.5;1')
  animateScale.setAttribute('dur', '1s')
  animateScale.setAttribute('repeatCount', 'indefinite')
  pulseGroup.appendChild(animateScale)

  // 添加透明度动画
  const animateOpacity = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'animate',
  )
  animateOpacity.setAttribute('attributeName', 'opacity')
  animateOpacity.setAttribute('values', '1;0.7;1')
  animateOpacity.setAttribute('keyTimes', '0;0.5;1')
  animateOpacity.setAttribute('dur', '1s')
  animateOpacity.setAttribute('repeatCount', 'indefinite')
  pulseGroup.appendChild(animateOpacity)

  // Force-start SMIL animations
  requestAnimationFrame(() => {
    if (animateScale.beginElement) animateScale.beginElement()
    if (animateOpacity.beginElement) animateOpacity.beginElement()
  })
}

/**
 * SVG 文件1内容：弹跳小球 SMIL 动画
 */
const SVG_FILE1_CONTENT = `
  <g>
    <ellipse cx="0" cy="45" rx="35" ry="5" fill="#e6f7ff" opacity="0.5"/>
    <circle cx="-35" cy="-30" r="15" fill="#ff4d4f" stroke="#cf1322" stroke-width="1.5">
      <animate
        attributeName="cx"
        values="-35;35;-35"
        keyTimes="0;0.5;1"
        dur="2s"
        repeatCount="indefinite"/>
      <animate
        attributeName="cy"
        values="-30;-60;-30"
        keyTimes="0;0.25;0.5"
        dur="1s"
        repeatCount="indefinite"/>
      <animate
        attributeName="cy"
        values="-30;-60;-30"
        keyTimes="0.5;0.75;1"
        dur="1s"
        repeatCount="indefinite"
        begin="1s"/>
    </circle>
    <circle cx="35" cy="-30" r="10" fill="#1890ff" stroke="#096dd9" stroke-width="1">
      <animate
        attributeName="cy"
        values="-30;-55;-30"
        keyTimes="0;0.5;1"
        dur="1.5s"
        repeatCount="indefinite"/>
    </circle>
    <circle cx="0" cy="-45" r="8" fill="#52c41a" stroke="#389e0d" stroke-width="1">
      <animate
        attributeName="cx"
        values="-25;25;-25"
        keyTimes="0;0.5;1"
        dur="3s"
        repeatCount="indefinite"/>
      <animate
        attributeName="cy"
        values="-45;-65;-45"
        keyTimes="0;0.25;0.5"
        dur="1s"
        repeatCount="indefinite"/>
      <animate
        attributeName="cy"
        values="-45;-65;-45"
        keyTimes="0.5;0.75;1"
        dur="1s"
        repeatCount="indefinite"
        begin="1s"/>
    </circle>
  </g>
`

/**
 * SVG 文件2内容：旋转加载 SMIL 动画
 */
const SVG_FILE2_CONTENT = `
  <g>
    <circle cx="0" cy="0" r="35" fill="none" stroke="#f0f0f0" stroke-width="4"/>
    <circle cx="0" cy="0" r="35" fill="none" stroke="#1890ff" stroke-width="4"
            stroke-dasharray="50, 200" stroke-linecap="round">
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0"
        to="360"
        dur="1.5s"
        repeatCount="indefinite"/>
    </circle>
    <circle cx="0" cy="0" r="20" fill="none" stroke="#f0f0f0" stroke-width="3"/>
    <circle cx="0" cy="-20" r="4" fill="#fa8c16">
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0"
        to="360"
        dur="1s"
        repeatCount="indefinite"/>
    </circle>
    <circle cx="17" cy="10" r="4" fill="#52c41a">
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0"
        to="360"
        dur="1.3s"
        repeatCount="indefinite"/>
    </circle>
    <circle cx="-17" cy="10" r="4" fill="#f5222d">
      <animateTransform
        attributeName="transform"
        type="rotate"
        from="0"
        to="360"
        dur="0.8s"
        repeatCount="indefinite"/>
    </circle>
    <text x="0" y="5" text-anchor="middle" font-size="12" fill="#666" font-weight="bold">加载中</text>
  </g>
`

/**
 * 设置 SVG 文件动画节点
 */
function setupSvgFileAnim(node: Node, graph: Graph, svgContent: string) {
  const view = node.findView(graph)
  if (!view) return

  const container = view.container
  if (!container) return

  // 查找 animContainer (第一个 <g> 元素)
  let animContainer: SVGGElement | null = null
  for (let i = 0; i < container.children.length; i++) {
    const child = container.children[i]
    if (child.tagName === 'g') {
      animContainer = child as SVGGElement
      break
    }
  }
  if (!animContainer) return

  // 清空现有内容
  animContainer.innerHTML = ''

  // 创建临时容器解析 SVG 内容
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="-70 -70 140 140">${svgContent}</svg>`

  const tempSvg = tempDiv.querySelector('svg')
  if (!tempSvg) return

  // 将解析后的子元素移动到动画容器中
  while (tempSvg.firstChild) {
    animContainer.appendChild(tempSvg.firstChild)
  }

  // 确保 DOM 完成渲染后再启动动画
  requestAnimationFrame(() => {
    const anims = animContainer.querySelectorAll(
      'animate,animateTransform,animateMotion',
    )
    anims.forEach((anim: any) => {
      if (anim.beginElement) anim.beginElement()
    })
  })
}

/**
 * SVG 动画节点初始化入口
 */
export function setupSvgAnimations(node: Node, graph: Graph) {
  const shape = node.shape
  switch (shape) {
    case 'custom-svg-dynamic1':
      setupGearSmil(node, graph)
      break
    case 'custom-svg-dynamic2':
      setupHeartSmil(node, graph)
      break
    case 'custom-svg-file1':
      setupSvgFileAnim(node, graph, SVG_FILE1_CONTENT)
      break
    case 'custom-svg-file2':
      setupSvgFileAnim(node, graph, SVG_FILE2_CONTENT)
      break
    default:
      break
  }
}

/**
 * 根据类型创建自定义节点
 * 工厂函数，简化节点的创建过程
 * 
 * @param graph - X6 图形实例
 * @param type - 节点类型
 * @param x - X 坐标
 * @param y - Y 坐标
 * @param options - 额外选项（风扇节点的叶片数量和配色）
 * @returns 创建的节点实例
 */
export function createCustomNodeByType(
  graph: Graph,
  type: string,
  x: number,
  y: number,
  options?: {
    bladeCount?: number
    colorMode?: 'mono' | 'gradient'
    tableOptions?: TableNodeOptions
  },
): any {
  switch (type) {
    case 'switch': {
      const node = graph.addNode({ shape: 'custom-switch', x, y })
      // 初始化开关节点的椭圆缩放
      updateSwitchScale(node, graph)
      return node
    }
    case 'simpletable': {
      const node = graph.addNode({ shape: 'custom-simpletable', x, y })
      // 初始化表格节点
      // 配置表格选项
      return node
    }
    case 'fan': {
      const node = graph.addNode({ shape: 'custom-fan', x, y })
      // 初始化风扇节点
      // 配置风扇选项
      return node
    }
    case 'echarts-line':
      const option = {
        grid: {
          left: '5%',
          top: '5%',
          right: '5%',
          bottom: '5%',
          containLabel: true //grid 区域是否包含坐标轴的刻度标签。
        },
        xAxis: {
          type: 'category',
          data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            data: [150, 230, 224, 218, 135, 147, 260],
            type: 'line'
          }
        ]
      };
      const target4 = graph.addNode({ shape: 'custom-echarts-line', x, y })
      target4.prop('option', option)
      return target4
    case 'echarts-bar':
      const option1 = {
        grid: {
          left: '5%',
          top: '5%',
          right: '5%',
          bottom: '5%',
          containLabel: true //grid 区域是否包含坐标轴的刻度标签。
        },
        xAxis: {
          type: 'category',
          data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        },
        yAxis: {
          type: 'value'
        },
        series: [
          {
            data: [150, 230, 224, 218, 135, 147, 260],
            type: 'bar'
          }
        ]
      };
      const target3 = graph.addNode({ shape: 'custom-echarts-bar', x, y })
      target3.prop('option', option1)
      return target3
    case 'echarts-pie':
      const option2 = {
        tooltip: {
          trigger: 'item'
        },
        series: [
          {
            name: 'Access From',
            type: 'pie',
            radius: '70%',
            data: [
              { value: 1048, name: 'Search Engine' },
              { value: 735, name: 'Direct' },
              { value: 580, name: 'Email' },
              { value: 484, name: 'Union Ads' },
              { value: 300, name: 'Video Ads' }
            ],
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }
        ]
      };;
      const target2 = graph.addNode({ shape: 'custom-echarts-pie', x, y })
      target2.prop('option', option2)
      return target2
    case 'echarts-gauge':
      const option3 = {
        tooltip: {
          formatter: '{a} <br/>{b} : {c}%'
        },
        series: [
          {
            name: 'Pressure',
            type: 'gauge',
            radius: '90%',
            detail: {
              formatter: '{value}'
            },
            data: [
              {
                value: 50,
                name: 'SCORE'
              }
            ]
          }
        ]
      };
      const target1 = graph.addNode({ shape: 'custom-echarts-gauge', x, y })
      target1.prop('option', option3)
      return target1
    case 'echarts-clock':
      // 时钟1
      const option4 = {
        series: [
          {
            name: 'hour',
            type: 'gauge',
            radius: '90%',
            startAngle: 90,
            endAngle: -270,
            min: 0,
            max: 12,
            splitNumber: 12,
            clockwise: true,
            axisLine: {
              lineStyle: {
                width: 6, // 进一步缩小
                color: [[1, 'rgba(0,0,0,0.7)']],
                shadowColor: 'rgba(0, 0, 0, 0.5)',
                shadowBlur: 6 // 进一步缩小
              }
            },
            splitLine: {
              lineStyle: {
                shadowColor: 'rgba(0, 0, 0, 0.3)',
                shadowBlur: 1,
                shadowOffsetX: 0,
                shadowOffsetY: 1
              }
            },
            axisLabel: {
              fontSize: 18, // 进一步缩小
              distance: 12, // 进一步缩小
              formatter: function (value) {
                if (value === 0) {
                  return '';
                }
                return value + '';
              }
            },
            anchor: {
              show: true,
              icon: 'path://M532.8,70.8C532.8,70.8,532.8,70.8,532.8,70.8L532.8,70.8C532.7,70.8,532.8,70.8,532.8,70.8z M456.1,49.6c-2.2-6.2-8.1-10.6-15-10.6h-37.5v10.6h37.5l0,0c2.9,0,5.3,2.4,5.3,5.3c0,2.9-2.4,5.3-5.3,5.3v0h-22.5c-1.5,0.1-3,0.4-4.3,0.9c-4.5,1.6-8.1,5.2-9.7,9.8c-0.6,1.7-0.9,3.4-0.9,5.3v16h10.6v-16l0,0l0,0c0-2.7,2.1-5,4.7-5.3h10.3l10.4,21.2h11.8l-10.4-21.2h0c6.9,0,12.8-4.4,15-10.6c0.6-1.7,0.9-3.5,0.9-5.3C457,53,456.7,51.2,456.1,49.6z M388.9,92.1h11.3L381,39h-3.6h-11.3L346.8,92v0h11.3l3.9-10.7h7.3h7.7l3.9-10.6h-7.7h-7.3l7.7-21.2v0L388.9,92.1z M301,38.9h-10.6v53.1H301V70.8h28.4l3.7-10.6H301V38.9zM333.2,38.9v10.6v10.7v31.9h10.6V38.9H333.2z M249.5,81.4L249.5,81.4L249.5,81.4c-2.9,0-5.3-2.4-5.3-5.3h0V54.9h0l0,0c0-2.9,2.4-5.3,5.3-5.3l0,0l0,0h33.6l3.9-10.6h-37.5c-1.9,0-3.6,0.3-5.3,0.9c-4.5,1.6-8.1,5.2-9.7,9.7c-0.6,1.7-0.9,3.5-0.9,5.3l0,0v21.3c0,1.9,0.3,3.6,0.9,5.3c1.6,4.5,5.2,8.1,9.7,9.7c1.7,0.6,3.5,0.9,5.3,0.9h33.6l3.9-10.6H249.5z M176.8,38.9v10.6h49.6l3.9-10.6H176.8z M192.7,81.4L192.7,81.4L192.7,81.4c-2.9,0-5.3-2.4-5.3-5.3l0,0v-5.3h38.9l3.9-10.6h-53.4v10.6v5.3l0,0c0,1.9,0.3,3.6,0.9,5.3c1.6,4.5,5.2,8.1,9.7,9.7c1.7,0.6,3.4,0.9,5.3,0.9h23.4h10.2l3.9-10.6l0,0H192.7z M460.1,38.9v10.6h21.4v42.5h10.6V49.6h17.5l3.8-10.6H460.1z M541.6,68.2c-0.2,0.1-0.4,0.3-0.7,0.4C541.1,68.4,541.4,68.3,541.6,68.2L541.6,68.2z M554.3,60.2h-21.6v0l0,0c-2.9,0-5.3-2.4-5.3-5.3c0-2.9,2.4-5.3,5.3-5.3l0,0l0,0h33.6l3.8-10.6h-37.5l0,0c-6.9,0-12.8,4.4-15,10.6c-0.6,1.7-0.9,3.5-0.9,5.3c0,1.9,0.3,3.7,0.9,5.3c2.2,6.2,8.1,10.6,15,10.6h21.6l0,0c2.9,0,5.3,2.4,5.3,5.3c0,2.9-2.4,5.3-5.3,5.3l0,0h-37.5v10.6h37.5c6.9,0,12.8-4.4,15-10.6c0.6-1.7,0.9-3.5,0.9-5.3c0-1.9-0.3-3.7-0.9-5.3C567.2,64.6,561.3,60.2,554.3,60.2z',
              showAbove: false,
              offsetCenter: [0, '-25%'], // 调整位置
              size: 50, // 进一步缩小
              keepAspect: true,
              itemStyle: {
                color: '#707177'
              }
            },
            pointer: {
              icon: 'path://M2.9,0.7L2.9,0.7c1.4,0,2.6,1.2,2.6,2.6v115c0,1.4-1.2,2.6-2.6,2.6l0,0c-1.4,0-2.6-1.2-2.6-2.6V3.3C0.3,1.9,1.4,0.7,2.9,0.7z',
              width: 5, // 进一步缩小
              length: '50%',
              offsetCenter: [0, '8%'],
              itemStyle: {
                color: '#C0911F',
                shadowColor: 'rgba(0, 0, 0, 0.3)',
                shadowBlur: 4,
                shadowOffsetX: 1,
                shadowOffsetY: 2
              }
            },
            detail: {
              show: false
            },
            title: {
              offsetCenter: [0, '30%']
            },
            data: [
              {
                value: 0
              }
            ]
          },
          {
            name: 'minute',
            type: 'gauge',
            startAngle: 90,
            endAngle: -270,
            min: 0,
            max: 60,
            clockwise: true,
            axisLine: {
              show: false
            },
            splitLine: {
              show: false
            },
            axisTick: {
              show: false
            },
            axisLabel: {
              show: false
            },
            pointer: {
              icon: 'path://M2.9,0.7L2.9,0.7c1.4,0,2.6,1.2,2.6,2.6v115c0,1.4-1.2,2.6-2.6,2.6l0,0c-1.4,0-2.6-1.2-2.6-2.6V3.3C0.3,1.9,1.4,0.7,2.9,0.7z',
              width: 4, // 进一步缩小
              length: '65%',
              offsetCenter: [0, '8%'],
              itemStyle: {
                color: '#C0911F',
                shadowColor: 'rgba(0, 0, 0, 0.3)',
                shadowBlur: 4,
                shadowOffsetX: 1,
                shadowOffsetY: 2
              }
            },
            anchor: {
              show: true,
              size: 10, // 进一步缩小
              showAbove: false,
              itemStyle: {
                borderWidth: 7, // 进一步缩小
                borderColor: '#C0911F',
                shadowColor: 'rgba(0, 0, 0, 0.3)',
                shadowBlur: 4,
                shadowOffsetX: 1,
                shadowOffsetY: 2
              }
            },
            detail: {
              show: false
            },
            title: {
              offsetCenter: ['0%', '-40%']
            },
            data: [
              {
                value: 0
              }
            ]
          },
          {
            name: 'second',
            type: 'gauge',
            startAngle: 90,
            endAngle: -270,
            min: 0,
            max: 60,
            animationEasingUpdate: 'bounceOut',
            clockwise: true,
            axisLine: {
              show: false
            },
            splitLine: {
              show: false
            },
            axisTick: {
              show: false
            },
            axisLabel: {
              show: false
            },
            pointer: {
              icon: 'path://M2.9,0.7L2.9,0.7c1.4,0,2.6,1.2,2.6,2.6v115c0,1.4-1.2,2.6-2.6,2.6l0,0c-1.4,0-2.6-1.2-2.6-2.6V3.3C0.3,1.9,1.4,0.7,2.9,0.7z',
              width: 2, // 进一步缩小
              length: '80%',
              offsetCenter: [0, '8%'],
              itemStyle: {
                color: '#C0911F',
                shadowColor: 'rgba(0, 0, 0, 0.3)',
                shadowBlur: 4,
                shadowOffsetX: 1,
                shadowOffsetY: 2
              }
            },
            anchor: {
              show: true,
              size: 7, // 进一步缩小
              showAbove: true,
              itemStyle: {
                color: '#C0911F',
                shadowColor: 'rgba(0, 0, 0, 0.3)',
                shadowBlur: 4,
                shadowOffsetX: 1,
                shadowOffsetY: 2
              }
            },
            detail: {
              show: false
            },
            title: {
              offsetCenter: ['0%', '-40%']
            },
            data: [
              {
                value: 0
              }
            ]
          }
        ]
      };
      const target = graph.addNode({ shape: 'custom-echarts-clock', x, y })
      target.prop('option', option4)
      return target
    case 'svg-static':
      return graph.addNode({ shape: 'custom-svg-static', x, y })
    case 'svg-dynamic1':
    case 'svg-dynamic2':
    case 'svg-file1':
    case 'svg-file2': {
      const shapeMap: Record<string, string> = {
        'svg-dynamic1': 'custom-svg-dynamic1',
        'svg-dynamic2': 'custom-svg-dynamic2',
        'svg-file1': 'custom-svg-file1',
        'svg-file2': 'custom-svg-file2',
      }
      const node = graph.addNode({ shape: shapeMap[type], x, y })
      // 初始化 SVG 动画节点
      setTimeout(() => setupSvgAnimations(node, graph), 50)
      return node
    }
    case 'img-png':
    case 'img-jpg':
    case 'img-svg':
    case 'img-gif':
    case 'apng-1':
    case 'apng-2':
    case 'gif-1':
    case 'gif-2':
      // 在线图片资源
      const img = {
        'img-png': 'https://img.shetu66.com/2023/06/19/1687143887709876.png',
        'img-jpg': 'https://img2.tukuppt.com/photo-big/30/24/51/856a0773cd88f943796.jpg',
        'img-svg': 'https://iconmonstr.com/?s2member_file_download_key=975c2f7d66191441e1e10570bf3e5798&s2member_file_download=7.8.0/svg/iconmonstr-quote-right-filled.svg',
        'img-gif': 'https://gif.net.cn/api/media/public/36582/biaoqing_cmdmtl5cd0004118eww7b7lya.gif',
        'apng-1': '/public/animated.png',
        'apng-2': '/public/animated1.png',
        'gif-1': 'https://gif.net.cn/api/media/public/36582/biaoqing_cmdmtl5cd0004118eww7b7lya.gif',
        'gif-2': 'https://gif.net.cn/api/media/public/36578/biaoqing_cmdmtl5sw000e118ea1y8bn2h.gif',
      }
      return graph.addNode({ shape: 'custom-image', x, y, attrs: { img: { href: img[type] || '' } } })
    case 'antd-tree':
      return graph.addNode({
        shape: 'custom-tree',
        x,
        y,
        data: {
          treeData: [
            {
              title: '项目根目录',
              key: 'root',
              children: [
                {
                  title: '源代码',
                  key: 'src',
                  children: [
                    { title: '入口文件.tsx', key: 'entry' },
                    { title: '组件文件夹', key: 'components' },
                  ],
                },
                {
                  title: '资源文件',
                  key: 'assets',
                  children: [
                    { title: '样式表.css', key: 'css' },
                    { title: '图片资源', key: 'images' },
                  ],
                },
                { title: '配置项.json', key: 'config' },
              ],
            },
          ],
        },
      })
    case 'vtable-demo':
      return graph.addNode({
        shape: 'custom-vtable',
        x,
        y,
        data: {
          option: {
            columns: [
              {
                field: '0',
                title: 'name'
              },
              {
                field: '1',
                title: 'age'
              },
              {
                field: '2',
                title: 'gender'
              },
              {
                field: '3',
                title: 'hobby'
              }
            ],
            records: new Array(9).fill(['John', 18, 'male', '🏀'])
          },
        },
      })
    default:
      return graph.addNode({
        shape: 'custom-rect',
        x,
        y,
        width: 100,
        height: 60,
        attrs: { label: { text: type } },
      })
  }
}

/**
 * 同步分组父节点的缩放/旋转变换到所有子节点
 * 基于 parent.data.groupOrigin 中存档的原始状态计算仿射变换：
 *   1. 取子节点原始中心相对父节点原始中心的偏移 (dx, dy)
 *   2. 按父节点当前缩放比 (sx, sy) 缩放该偏移
 *   3. 按父节点当前旋转角度旋转该偏移
 *   4. 平移到父节点当前中心，得到子节点新中心
 * 节点平移由 X6 的 embed 机制自动处理，此处只处理缩放与旋转
 */
export function syncGroupChildrenTransform(node: any, graph: Graph) {
  const data = node.getData?.() || {}
  if (!data.isGroup) return
  const origin = data.groupOrigin
  if (!origin || !origin.children?.length) return

  const currentSize = node.getSize()
  const currentAngle = (node.getAngle?.() as number) || 0
  const pos = node.getPosition()
  // X6 中 position 为未旋转时的左上角，中心 = pos + size/2（旋转不改变中心）
  const currentCx = pos.x + currentSize.width / 2
  const currentCy = pos.y + currentSize.height / 2

  const sx = currentSize.width / origin.size.width
  const sy = currentSize.height / origin.size.height
  const rad = (currentAngle * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  origin.children.forEach((co: any) => {
    const child = graph.getCellById(co.id)
    if (!child || !child.isNode?.()) return

    const dx = co.cx - origin.cx
    const dy = co.cy - origin.cy
    const sdx = dx * sx
    const sdy = dy * sy
    const rdx = sdx * cos - sdy * sin
    const rdy = sdx * sin + sdy * cos
    const newCx = currentCx + rdx
    const newCy = currentCy + rdy

    const newW = co.w * sx
    const newH = co.h * sy

    child.setPosition(newCx - newW / 2, newCy - newH / 2)
    child.resize(newW, newH)
    if (typeof child.rotate === 'function') {
      child.rotate(co.angle + currentAngle, { absolute: true })
    }
  })
}

/**
 * 粘贴后修正新分组的 groupOrigin.children.id 指向。
 * 复制/粘贴会为子节点生成新 ID 并重新 embed，但父节点 data.groupOrigin.children
 * 里仍保留旧 ID，导致旋转/缩放任一分组时会通过旧 ID 操控到另一分组的子节点。
 * 这里按“子节点相对父节点中心的偏移 + 尺寸”将旧 ID 重映射到实际嵌入的新子节点。
 */
export function remapPastedGroupChildren(cells: any[], graph: any) {
  if (!Array.isArray(cells) || !cells.length) return
  cells.forEach((cell: any) => {
    const data = cell.getData?.() || {}
    if (!data.isGroup) return
    const origin = data.groupOrigin
    if (!origin || !Array.isArray(origin.children) || !origin.children.length) return
    const newChildren = (cell.getChildren?.() || [])
      .filter((c: any) => c.isNode?.())
    // 回退：getChildren 依赖 cell.model，若尚未就绪则直接读 store 里的 children id 用 graph 查找
    if (!newChildren.length) {
      const childIds: string[] = cell.store?.get?.('children') || []
      childIds.forEach((id: string) => {
        const c = graph.getCellById?.(id)
        if (c && c.isNode?.()) newChildren.push(c)
      })
    }
    if (!newChildren.length) return
    const pPos = cell.getPosition()
    const pSize = cell.getSize()
    const pCx = pPos.x + pSize.width / 2
    const pCy = pPos.y + pSize.height / 2
    const used = new Set<string>()
    // 粘贴只做整体平移，子节点相对父节点中心的偏移、尺寸、角度均与原始一致，据此匹配
    const remapped = origin.children.map((co: any) => {
      const relDx = co.cx - origin.cx
      const relDy = co.cy - origin.cy
      let best: any = null
      let bestScore = Infinity
      newChildren.forEach((nc: any) => {
        if (used.has(nc.id)) return
        const nPos = nc.getPosition()
        const nSize = nc.getSize()
        const nCx = nPos.x + nSize.width / 2
        const nCy = nPos.y + nSize.height / 2
        const score =
          Math.abs((nCx - pCx) - relDx) +
          Math.abs((nCy - pCy) - relDy) +
          Math.abs(nSize.width - co.w) +
          Math.abs(nSize.height - co.h)
        if (score < bestScore) { bestScore = score; best = nc }
      })
      if (best) used.add(best.id)
      return { ...co, id: best ? best.id : co.id }
    })
    cell.setData({ ...data, groupOrigin: { ...origin, children: remapped } }, { silent: true })
  })
}

export function updateEchartsSize(node: any) {
  const shape = node.shape
  const size = node.getSize()
  const w = size.width
  const h = size.height
  node.prop('size', { width: w, height: h })
}
