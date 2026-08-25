import { useEffect, useState } from 'react'
import { Tabs, Form, InputNumber, ColorPicker, Select, Switch, Empty, Input, Button, Divider } from 'antd'
import { useAppStore } from '../../stores/appStore'
import { setupFanNode, updateFanScale, updateSwitchScale, setupTableNode } from '../../x6/shapes/custom'
import VTableDemo from '../vtable/VTableDemo'

/**
 * 右侧面板组件 - 用于显示和编辑画布、节点、边等元素的属性
 * 根据当前选中的元素类型动态显示不同的属性编辑界面
 */
export default function RightPanel() {
  // ==================== 状态管理 ====================
  // 从全局状态中获取画布相关的状态和操作方法
  const canvasSize = useAppStore((s) => s.canvasSize)
  const setCanvasSize = useAppStore((s) => s.setCanvasSize)
  const canvasBgColor = useAppStore((s) => s.canvasBgColor)
  const setCanvasBgColor = useAppStore((s) => s.setCanvasBgColor)
  const canvasBgImage = useAppStore((s) => s.canvasBgImage)
  const setCanvasBgImage = useAppStore((s) => s.setCanvasBgImage)
  const canvasBgImageFill = useAppStore((s) => s.canvasBgImageFill)
  const setCanvasBgImageFill = useAppStore((s) => s.setCanvasBgImageFill)

  const canvasShowGrid = useAppStore((s) => s.canvasShowGrid)
  const setCanvasShowGrid = useAppStore((s) => s.setCanvasShowGrid)
  const canvasGridSize = useAppStore((s) => s.canvasGridSize)
  const setCanvasGridSize = useAppStore((s) => s.setCanvasGridSize)

  // 获取选中的节点和边的ID列表
  const selectedCellIds = useAppStore((s) => s.selectedCellIds)
  const selectedEdgeIds = useAppStore((s) => s.selectedEdgeIds)
  const getActiveGraph = useAppStore((s) => s.getActiveGraph)

  // ==================== 本地状态 ====================
  // 存储当前选中的节点、边、多选对象的属性数据
  const [nodeProps, setNodeProps] = useState<any>(null)  // 单个节点的属性
  const [edgeProps, setEdgeProps] = useState<any>(null)  // 单个边的属性
  const [multiProps, setMultiProps] = useState<any>(null) // 多个对象的属性
  function findChildrenInArray(arr: any[]) {
    // 收集所有children的id
    const childIds = arr.flatMap(item =>
      (item.children || []).map(child => child.id)
    );

    // 返回在children中出现的对象
    return arr.filter(item => childIds.includes(item.id));
  }
  function createSelectionBox(cell: any) {
    const graph = getActiveGraph()
    if (!graph) return
    const existingBox = document.querySelector('.x6-widget-selection-box1');
    if (existingBox) {
      (existingBox as any)._cleanup?.();
      existingBox.remove();
    }
    const selectionBox = document.createElement("div");
    selectionBox.classList.add("x6-widget-selection-box", "x6-widget-selection-box1");
    selectionBox.style.position = 'absolute';
    selectionBox.style.boxSizing = 'border-box';

    // 同步选中框位置/尺寸/旋转：跟随画布缩放、平移与节点旋转
    const updateBox = () => {
      const pos = cell.getPosition()
      const size = cell.getSize()
      const angle = cell.getAngle?.() ?? 0
      const scale = graph.scale()  // X6 Graph 用 scale() 读取当前缩放，返回 { sx, sy }
      // 本地坐标转画布容器坐标（已包含 scale 与 translate）
      const p = graph.localToGraph({ x: pos.x, y: pos.y })
      selectionBox.style.left = `${p.x}px`
      selectionBox.style.top = `${p.y}px`
      selectionBox.style.width = `${size.width * scale.sx}px`
      selectionBox.style.height = `${size.height * scale.sy}px`
      selectionBox.style.transformOrigin = 'center center'
      selectionBox.style.transform = `rotate(${angle}deg)`
    }
    updateBox()

    // x6-graph 容器中添加选中框
    graph.view.container.appendChild(selectionBox);

    // 监听画布缩放/平移与节点变化，实时同步选中框
    const onTransform = () => updateBox()
    graph.on("scale", () => {
      onTransform();
    });
    graph.on("translate", () => {
      onTransform();
    });
    // 保存清理函数，避免事件监听器泄漏
    (selectionBox as any)._cleanup = () => {
    }
  }

  // ==================== 副作用 - 更新属性面板 ====================
  /**
   * 当选中的节点或边发生变化时，更新属性面板的显示
   * 根据选择情况分为三种模式：
   * 1. 选中1个节点：显示节点属性
   * 2. 选中多个元素：显示多选属性（位置、尺寸等）
   * 3. 选中1条边：显示边属性
   * 4. 无选中：显示画布属性
   */
  useEffect(() => {
    const graph = getActiveGraph()
    if (!graph) return
    setCanvasSize({
      width: graph.view.container.clientWidth,
      height: graph.view.container.clientHeight,
    })
    // 处理单个节点选中
    if (selectedCellIds.length === 1) {
      const cell = graph.getCellById(selectedCellIds[0])
      if (cell && cell.isNode()) {
        const pos = cell.getPosition()
        const size = cell.getSize()
        const data = cell.getData() || {}
        console.log(cell.getAttrs());
        if (cell.parent) {
          graph.createTransformWidget(cell.parent);
          graph.select(cell.parent);
          graph.unselect(cell);
          // 自定义一个选中框元素
          createSelectionBox(cell);
        } else {
          graph.createTransformWidget(cell);
        }
        if (cell.children) {
          //边框颜色
          cell.setAttrs({ body: { stroke: '#888' } })
        }


        setNodeProps({
          id: cell.id,
          x: Math.round(pos.x) - 24,
          y: Math.round(pos.y) - 24,
          width: Math.round(size.width),
          height: Math.round(size.height),
          rotation: Math.round(cell.getRotation?.() || 0),
          shape: cell.shape,
          hasPorts: (cell.getAttrs?.()?.hasPorts),
          label: cell.getAttrs?.()?.label?.text || '',
          fill: cell.getAttrs?.()?.body?.fill || '',
          stroke: cell.getAttrs?.()?.body?.stroke || '',
          fontWeight: cell.getAttrs?.()?.text?.fontWeight || '',
          fontSize: cell.getAttrs?.()?.text?.fontSize || '',
          fontFamily: cell.getAttrs?.()?.text?.fontFamily || '',
          // Fan-specific properties
          bladeCount: data.bladeCount ?? 3,
          colorMode: data.colorMode ?? 'mono',
        })
      } else {
        setNodeProps(null) // 不是节点则清空节点属性
      }
    }
    // 处理多选
    else if (selectedCellIds.length > 1) {
      const cells = selectedCellIds.map(id => graph.getCellById(id))
      const childCells = findChildrenInArray(cells)

      if (selectedCellIds.length == 2 && childCells.length) {
        console.log(childCells, '--childCells');
        const pos = childCells[0].getPosition()
        const size = childCells[0].getSize()
        const data = childCells[0].getData() || {}
        setNodeProps({
          id: childCells[0].id,
          x: Math.round(pos.x) - 24,
          y: Math.round(pos.y) - 24,
          width: Math.round(size.width),
          height: Math.round(size.height),
          rotation: Math.round(childCells[0].getRotation?.() || 0),
          shape: childCells[0].shape,
          hasPorts: (childCells[0].getAttrs?.()?.hasPorts),
          label: childCells[0].getAttrs?.()?.label?.text || '',
          fill: childCells[0].getAttrs?.()?.body?.fill || '',
          stroke: childCells[0].getAttrs?.()?.body?.stroke || '',
          fontWeight: childCells[0].getAttrs?.()?.text?.fontWeight || '',
          fontSize: childCells[0].getAttrs?.()?.text?.fontSize || '',
          fontFamily: childCells[0].getAttrs?.()?.text?.fontFamily || '',
          // Fan-specific properties
          bladeCount: data.bladeCount ?? 3,
          colorMode: data.colorMode ?? 'mono',
        })
        return
      }
      const bbox = graph.getCellsBBox(cells)
      if (bbox) {
        setMultiProps({
          count: selectedCellIds.length,
          x: Math.round(bbox.x),
          y: Math.round(bbox.y),
          width: Math.round(bbox.width),
          height: Math.round(bbox.height),
        })
      }
    } else {
      setNodeProps(null)
      setMultiProps(null)
    }

    // 处理边选中（优先级高于节点选中）
    if (selectedEdgeIds.length === 1) {
      const edge = graph.getCellById(selectedEdgeIds[0])
      if (edge && edge.isEdge()) {
        const attrs = edge.getAttrs()
        setEdgeProps({
          id: edge.id,
          lineWidth: attrs?.line?.strokeWidth || 1,
          stroke: attrs?.line?.stroke || '#333',
          lineDash: attrs?.line?.strokeDasharray || 'solid',
        })
      }
    } else {
      setEdgeProps(null)
    }
  }, [selectedCellIds, selectedEdgeIds]) // 依赖选中的节点和边

  // ==================== 属性更新函数 ====================
  /**
   * 更新节点属性
   * @param key - 属性名称
   * @param value - 属性值
   * 根据不同的属性类型调用对应的图形方法进行更新
   */
  const updateNodeProp = (key: string, value: any) => {
    if (!nodeProps || !nodeProps.id) return
    const graph = getActiveGraph()
    if (!graph) return
    const node = graph.getCellById(nodeProps.id)
    if (!node) return

    // 更新本地状态
    const updatedProps = { ...nodeProps, [key]: value }
    setNodeProps(updatedProps)

    // 根据属性类型调用不同的图形方法
    switch (key) {
      case 'x':
      case 'y':
        node.setPosition(updatedProps.x + 24, updatedProps.y + 24)
        break
      case 'width':
      case 'height':
        node.resize(updatedProps.width, updatedProps.height)
        // 更新风扇节点的椭圆缩放
        if (node.shape === 'custom-fan') {
          updateFanScale(node, graph)
        }
        // 更新开关节点的椭圆缩放
        if (node.shape === 'custom-switch') {
          updateSwitchScale(node, graph)
        }
        // If this is a table node, re-setup after resize
        if (node.shape === 'custom-simpletable') {
          setupTableNode(node, {
            showTitle: updatedProps.showTitle ?? true,
            mergeCols: updatedProps.mergeCols ?? 0,
            rowCount: updatedProps.rowCount ?? 4,
            colCount: updatedProps.colCount ?? 3,
            alternateFill: updatedProps.alternateFill ?? true,
            titleText: updatedProps.titleText ?? '表格标题',
          })
        }
        break
      case 'rotation':
        node.rotate(updatedProps.rotation)
        break
      case 'fill':
        const temp1 = typeof value === 'string' ? value : value?.toHexString?.() || ''
        node.setAttrs({ body: { fill: temp1 } })
        break
      case 'stroke':
        const temp2 = typeof value === 'string' ? value : value?.toHexString?.() || ''
        node.setAttrs({ body: { stroke: temp2 } })
        break
      case 'label':
        node.setAttrs({ label: { text: value } })
        break
      case 'fontSize':
        node.setAttrs(({ label: { fontSize: value } }))
        break
      case 'fontWeight':
        node.setAttrs(({ label: { fontWeight: value } }))
        break
      case 'fontFamily':
        node.setAttrs(({ label: { fontFamily: value } }))
        break
      case 'bladeCount':
      case 'colorMode':
        // 更新风扇节点的属性
        setupFanNode(node, updatedProps.bladeCount, updatedProps.colorMode, graph)
        break
      case 'showTitle':
      case 'titleText':
      case 'mergeCols':
      case 'rowCount':
      case 'colCount':
      case 'alternateFill':
        // 更新表格节点的属性
        setupTableNode(node, {
          showTitle: updatedProps.showTitle ?? true,
          mergeCols: updatedProps.mergeCols ?? 0,
          rowCount: updatedProps.rowCount ?? 4,
          colCount: updatedProps.colCount ?? 3,
          alternateFill: updatedProps.alternateFill ?? true,
          titleText: updatedProps.titleText ?? '表格标题',
        })
        break
      case 'hasPorts':
        // 更新节点是否有接线桩
        console.log(value);
        node.setAttrs({ hasPorts: value })
        break
      case 'echartsConfig':
        // 更新echarts配置
        const option3 = {
          tooltip: {
            formatter: '{a} <br/>{b} : {c}%'
          },
          series: [
            {
              name: 'Pressure',
              type: 'gauge',
              detail: {
                formatter: '{value}'
              },
              data: [
                {
                  // 随机整数，范围0-100
                  value: Math.floor(Math.random() * 100),
                  name: 'SCORE'
                }
              ]
            }
          ]
        };
        node.prop('option', option3)
        break
    }
  }

  /**
   * 更新边属性
   * @param key - 属性名称
   * @param value - 属性值
   */
  const updateEdgeProp = (key: string, value: any) => {
    if (!edgeProps || !edgeProps.id) return
    const graph = getActiveGraph()
    if (!graph) return
    const edge = graph.getCellById(edgeProps.id)
    if (!edge) return

    const updated = { ...edgeProps, [key]: value }
    setEdgeProps(updated)

    switch (key) {
      case 'lineWidth':
        edge.setAttrs({ line: { strokeWidth: value } })
        break
      case 'stroke':
        console.log(value)
        const temp1 = typeof value === 'string' ? value : value?.toHexString?.() || '#A2B1C3'
        edge.setAttrs({ line: { stroke: temp1 } })
        break
      case 'lineDash':
        // 将线型转换为对应的dasharray值
        edge.setAttrs({
          line: {
            strokeDasharray: value === 'dashed' ? '5,5' : value === 'dotted' ? '2,2' : ''
          }
        })
        break
    }
  }

  /**
   * 更新画布尺寸
   * @param key - 宽度或高度
   * @param value - 尺寸值
   */
  const updateCanvasSize = (key: 'width' | 'height', value: number | null) => {
    if (value) {
      setCanvasSize({ ...canvasSize, [key]: value })
      const graph = getActiveGraph()
      const { width, height } = { ...canvasSize, [key]: value }
      if (graph) {
        console.log(width, height, '----canvasSize')
        graph.resize(width, height)
      }
    }
  }

  /**
   * 更新画布背景颜色
   * @param color - 颜色值（支持字符串或ColorPicker对象）
   */
  const updateBgColor = (color: any) => {
    const hex = typeof color === 'string' ? color : color?.toHexString?.() || '#1e1e1e'
    setCanvasBgColor(hex)
    const graph = getActiveGraph()
    graph.drawBackground({ color: hex, })
  }

  /**
   * 切换网格显示
   * @param show - 是否显示网格
   */
  const updateShowGrid = (show: boolean) => {
    setCanvasShowGrid(show)
    const graph = getActiveGraph()
    if (graph) {
      if (show) graph.showGrid()
      else graph.hideGrid()
    }
  }

  /**
   * 更新网格大小
   * @param size - 网格大小值
   */
  const updateGridSize = (size: number | null) => {
    if (size) {
      setCanvasGridSize(size)
      const graph = getActiveGraph()
      if (graph) {
        graph.setGridSize(size)
      }
    }
  }

  // ==================== 渲染函数 ====================
  /**
   * 渲染画布属性编辑界面
   * 包括：画布尺寸、背景颜色、网格设置等
   */
  const renderCanvasProps = () => (
    <Form layout="vertical" style={{ padding: 12 }} size="small">
      <Form.Item label="画布宽度">
        <InputNumber
          min={100}
          max={5000}
          value={canvasSize.width}
          onChange={(v) => updateCanvasSize('width', v)}
          style={{ width: '100%' }}
        />
      </Form.Item>
      <Form.Item label="画布高度">
        <InputNumber
          min={100}
          max={5000}
          value={canvasSize.height}
          onChange={(v) => updateCanvasSize('height', v)}
          style={{ width: '100%' }}
        />
      </Form.Item>
      <Form.Item label="背景颜色">
        <ColorPicker value={canvasBgColor} onChange={updateBgColor} showText />
      </Form.Item>
      {/* .背景图片 */}
      <Form.Item label="背景图片">
        <Input placeholder="请输入背景图片URL" value={canvasBgImage} onChange={(v) => setCanvasBgImage(v.target.value)} />
      </Form.Item>
      {/* 背景填充方式 */}
      {canvasBgImage && (
        <Form.Item label="背景填充方式">
          <Select value={canvasBgImageFill} options={[
            { value: 'unset', label: '默认' },
            { value: 'cover', label: '覆盖' },
          ]} onSelect={(v) => setCanvasBgImageFill(v)} style={{ width: '100%' }}>

          </Select>
        </Form.Item>)
      }
      <Form.Item label="显示网格">
        <Switch checked={canvasShowGrid} onChange={updateShowGrid} />
      </Form.Item>
      {canvasShowGrid && (
        <Form.Item label="网格大小">
          <InputNumber
            min={1}
            max={100}
            value={canvasGridSize}
            onChange={(v) => updateGridSize(v)}
            style={{ width: '100%' }}
          />
        </Form.Item>
      )}
    </Form>
  )

  /**
   * 渲染节点属性编辑界面
   * 包括：位置、尺寸、旋转角度、外观样式等
   */
  const renderNodeProps = () => {
    if (!nodeProps) {
      return <div style={{ padding: 12 }}><Empty description="选择一个对象查看属性" /></div>
    }
    const isFan = nodeProps.shape === 'custom-fan'
    const isTable = nodeProps.shape === 'custom-simpletable'
    const isEcharts = nodeProps.shape.includes('echarts')
    // 独立直线
    const isLine = nodeProps.shape === 'custom-line'
    // 自定义
    const isCustom = ['custom-switch', 'custom-simpletable', 'custom-fan', 'custom-vtable', 'custom-tree'].includes(nodeProps.shape)
    const isSvg = nodeProps.shape.includes('svg')
    console.log(nodeProps, 'isCustom')
    return (
      <Form layout="vertical" style={{ padding: 12 }} size="small">
        <Divider titlePlacement="left" plain>基本位置</Divider>
        <Form.Item label="X坐标">
          <InputNumber value={nodeProps.x} onChange={(v) => updateNodeProp('x', v)} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="Y坐标">
          <InputNumber value={nodeProps.y} onChange={(v) => updateNodeProp('y', v)} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="宽度">
          <InputNumber value={nodeProps.width} onChange={(v) => updateNodeProp('width', v)} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="高度">
          <InputNumber value={nodeProps.height} onChange={(v) => updateNodeProp('height', v)} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="旋转角度">
          <InputNumber
            min={0}
            max={360}
            value={nodeProps.rotation}
            onChange={(v) => updateNodeProp('rotation', v)}
            style={{ width: '100%' }}
          />
        </Form.Item>
        {isFan && (
          <>
            <Divider titlePlacement="left" plain>风扇设置</Divider>
            <Form.Item label="扇叶数量">
              <Select
                value={nodeProps.bladeCount ?? 3}
                onChange={(v) => updateNodeProp('bladeCount', v)}
                style={{ width: '100%' }}
                options={[
                  { value: 3, label: '3 叶' },
                  { value: 4, label: '4 叶' },
                  { value: 5, label: '5 叶' },
                ]}
              />
            </Form.Item>
            <Form.Item label="颜色模式">
              <Select
                value={nodeProps.colorMode ?? 'mono'}
                onChange={(v) => updateNodeProp('colorMode', v)}
                style={{ width: '100%' }}
                options={[
                  { value: 'mono', label: '单色' },
                  { value: 'gradient', label: '渐变' },
                ]}
              />
            </Form.Item>
            <Form.Item label="动画说明">
              <div style={{ fontSize: 11, color: '#888', lineHeight: 1.5 }}>
                正方形节点：圆形旋转<br />
                长方形节点：椭圆（侧旋）
              </div>
            </Form.Item>
          </>
        )}
        {isTable && (
          <>
            <Divider titlePlacement="left" plain>表格设置</Divider>
            <Form.Item label="显示标题">
              <Switch
                checked={nodeProps.showTitle ?? true}
                onChange={(v) => updateNodeProp('showTitle', v)}
              />
            </Form.Item>
            <Form.Item label="标题文字">
              <Input
                value={nodeProps.titleText ?? '表格标题'}
                onChange={(e) => updateNodeProp('titleText', e.target.value)}
              />
            </Form.Item>
            <Form.Item label="合并列数">
              <Select
                value={nodeProps.mergeCols ?? 0}
                onChange={(v) => updateNodeProp('mergeCols', v)}
                style={{ width: '100%' }}
                options={[
                  { value: 0, label: '0 (无合并)' },
                  { value: 1, label: '第1列' },
                  { value: 2, label: '第1-2列' },
                  { value: 3, label: '第1-3列' },
                ]}
              />
            </Form.Item>
            <Form.Item label="行数">
              <InputNumber
                min={1}
                max={6}
                value={nodeProps.rowCount ?? 4}
                onChange={(v) => updateNodeProp('rowCount', v)}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="列数">
              <InputNumber
                min={1}
                max={6}
                value={nodeProps.colCount ?? 3}
                onChange={(v) => updateNodeProp('colCount', v)}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item label="交替填充">
              <Switch
                checked={nodeProps.alternateFill ?? true}
                onChange={(v) => updateNodeProp('alternateFill', v)}
              />
            </Form.Item>
          </>
        )}
        {
          isEcharts && (
            <>
              <Divider titlePlacement="left" plain>echcharts设置</Divider>
              <Form.Item label="echarts配置">
                <Button onClick={() => updateNodeProp('echartsConfig')}>随机数据</Button>
              </Form.Item>
            </>
          )
        }
        {!isEcharts && !isLine && !isCustom && !isSvg && (<><Divider titlePlacement="left" plain>外观</Divider>
          <Form.Item label="文本内容">
            <Input value={nodeProps.label} onChange={(e) => updateNodeProp('label', e.target.value)} />
          </Form.Item>
          {/* 字体 大小 粗细 */}
          <Form.Item label="字体">
            <Input value={nodeProps.fontFamily} onChange={(e) => updateNodeProp('fontFamily', e.target.value)} />
          </Form.Item>
          <Form.Item label="大小">
            <InputNumber value={nodeProps.fontSize} onChange={(v) => updateNodeProp('fontSize', v)} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="粗细">
            <InputNumber value={nodeProps.fontWeight} onChange={(v) => updateNodeProp('fontWeight', v)} style={{ width: '100%' }} />
          </Form.Item>
          {nodeProps.shape !== 'custom-arc' && <Form.Item label="填充颜色">
            <ColorPicker value={nodeProps.fill || '#1677ff'} onChange={(c) => updateNodeProp('fill', c)} showText />
          </Form.Item>}
          <Form.Item label="边框颜色">
            <ColorPicker value={nodeProps.stroke || '#4096ff'} onChange={(c) => updateNodeProp('stroke', c)} showText />
          </Form.Item>
          <Form.Item label="连接桩">
            <Switch checked={nodeProps.hasPorts} onChange={(c) => updateNodeProp('hasPorts', c)} />
          </Form.Item></>)
        }
      </Form>
    )
  }

  /**
   * 渲染多选属性编辑界面
   * 显示选中对象的数量和整体边界框信息
   */
  const renderMultiProps = () => {
    if (!multiProps) {
      return <div style={{ padding: 12 }}><Empty description="选择多个对象查看属性" /></div>
    }
    return (
      <Form layout="vertical" style={{ padding: 12 }} size="small">
        <Form.Item label="对象个数">
          <InputNumber value={multiProps.count} style={{ width: '100%' }} disabled />
        </Form.Item>
        <Form.Item label="X坐标">
          <InputNumber value={multiProps.x} style={{ width: '100%' }} disabled />
        </Form.Item>
        <Form.Item label="Y坐标">
          <InputNumber value={multiProps.y} style={{ width: '100%' }} disabled />
        </Form.Item>
        <Form.Item label="总宽度">
          <InputNumber value={multiProps.width} style={{ width: '100%' }} disabled />
        </Form.Item>
        <Form.Item label="总高度">
          <InputNumber value={multiProps.height} style={{ width: '100%' }} disabled />
        </Form.Item>
      </Form>
    )
  }

  /**
   * 渲染边属性编辑界面
   * 包括：线宽、颜色、线型等
   */
  const renderEdgeProps = () => {
    if (!edgeProps) {
      return <div style={{ padding: 12 }}><Empty description="选择一个边查看属性" /></div>
    }
    return (
      <Form layout="vertical" style={{ padding: 12 }} size="small">
        <Divider titlePlacement="left" plain>边线属性</Divider>
        <Form.Item label="线宽">
          <InputNumber
            min={1}
            max={20}
            value={edgeProps.lineWidth}
            onChange={(v) => updateEdgeProp('lineWidth', v)}
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item label="线色">
          <ColorPicker value={edgeProps.stroke} onChange={(c) => updateEdgeProp('stroke', c)} showText />
        </Form.Item>
        <Form.Item label="线类型">
          <Select
            value={edgeProps.lineDash}
            onChange={(v) => updateEdgeProp('lineDash', v)}
            style={{ width: '100%' }}
            options={[
              { value: 'solid', label: '实线' },
              { value: 'dashed', label: '虚线' },
              { value: 'dotted', label: '点线' },
            ]}
          />
        </Form.Item>
      </Form>
    )
  }

  /**
   * 根据当前选中的元素类型，决定渲染哪个属性编辑界面
   * 优先级：边 > 节点 > 多选 > 画布
   */
  const renderPropsContent = () => {
    if (selectedEdgeIds.length >= 1) return renderEdgeProps()
    if (selectedCellIds.length === 1) return renderNodeProps()
    if (selectedCellIds.length > 1) {
      const graph = getActiveGraph()
      const cells = selectedCellIds.map(id => graph.getCellById(id))
      const childCells = findChildrenInArray(cells)
      if (selectedCellIds.length == 2 && childCells.length) {
        return renderNodeProps()
      }
      return renderMultiProps()
    }
    return renderCanvasProps()
  }

  // ==================== 主渲染 ====================
  return (
    <div className="right-panel">
      <Tabs
        tabPlacement="top"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}
        items={[
          {
            key: 'props',
            label: '属性',
            children: renderPropsContent()
          },
          {
            key: 'other',
            label: '其它',
            children: <VTableDemo />
          },
        ]}
      />
    </div>
  )
}