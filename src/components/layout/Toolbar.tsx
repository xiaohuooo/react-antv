import { Tooltip, Button, Space, Switch, App } from 'antd'
import {
  LeftOutlined,
  RightOutlined,
  TeamOutlined,
  DeleteOutlined,
  BulbOutlined,
  BulbFilled,
  AimOutlined,
  MinusOutlined,
  ColumnHeightOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignBottomOutlined,
  BorderOutlined,
  CameraOutlined,
  UndoOutlined,
  RedoOutlined,
  CopyOutlined,
  ScissorOutlined,
  SnippetsOutlined,
  NodeIndexOutlined,
  StopOutlined,
} from '@ant-design/icons'
import { useAppStore } from '../../stores/appStore'
import { remapPastedGroupChildren } from '../../x6/shapes/custom'

export default function Toolbar() {
  const { message } = App.useApp()
  const leftPanelVisible = useAppStore((s) => s.leftPanelVisible)
  const setLeftPanelVisible = useAppStore((s) => s.setLeftPanelVisible)
  const rightPanelVisible = useAppStore((s) => s.rightPanelVisible)
  const setRightPanelVisible = useAppStore((s) => s.setRightPanelVisible)
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const setCanvasShowGrid = useAppStore((s) => s.setCanvasShowGrid)
  const canvasShowGrid = useAppStore((s) => s.canvasShowGrid)
  const selectedCellIds = useAppStore((s) => s.selectedCellIds)
  const selectedEdgeIds = useAppStore((s) => s.selectedEdgeIds)

  const getGraph = () => useAppStore.getState().getActiveGraph()

  const handleShowHideLeft = () => setLeftPanelVisible(!leftPanelVisible)
  const handleShowHideRight = () => setRightPanelVisible(!rightPanelVisible)

  // 撤销
  const handleUndo = () => {
    const graph = getGraph()
    if (graph) { graph.undo(); message.info('撤销') }
  }
  // 重做
  const handleRedo = () => {
    const graph = getGraph()
    if (graph) { graph.redo(); message.info('重做') }
  }
  // 复制
  const handleCopy = () => {
    const graph = getGraph()
    if (graph && selectedCellIds.length > 0) {
      const cells = selectedCellIds.map((id: string) => graph.getCellById(id))
      const childIds = new Set();
      cells.forEach(item => {
        if (item.children && Array.isArray(item.children)) {
          item.children.forEach(childId => childIds.add(childId));
        }
      });
      const newCells = [...childIds.values()].filter(item => !cells.includes(item))
      console.log(newCells)
      if (cells.length) { graph.copy([...cells, ...newCells]); message.success('已复制') }
    }
  }
  // 剪切
  const handleCut = () => {
    const graph = getGraph()
    if (graph && selectedCellIds.length > 0) {
      const cells = selectedCellIds.map((id: string) => graph.getCellById(id))
      const childIds = new Set();
      cells.forEach(item => {
        if (item.children && Array.isArray(item.children)) {
          item.children.forEach(childId => childIds.add(childId));
        }
      });
      const newCells = [...childIds.values()].filter(item => !cells.includes(item))
      console.log(newCells)
      if (cells.length) { graph.cut([...cells, ...newCells]); message.success('已剪切') }
    }
  }
  // 粘贴
  const handlePaste = () => {
    const graph = getGraph()
    if (graph) {
      const pasted: any[] = (graph.paste() as any[]) || []
      remapPastedGroupChildren(pasted, graph)
      message.success('已粘贴')
    }
  }
  // 删除
  const handleDelete = () => {
    const graph = getGraph()
    if (graph && selectedCellIds.length > 0) {
      const cells = selectedCellIds.map((id: string) => graph.getCellById(id))
      if (cells.length) { graph.removeCells(cells); message.success('已删除') }
    }
  }
  // 分组
  const handleGroup = () => {
    const graph = getGraph()
    if (graph && selectedCellIds.length >= 2) {
      const cells = selectedCellIds.map((id: string) => graph.getCellById(id))
      const bbox = graph.getCellsBBox(cells)
      if (bbox) {
        // 存档各子节点的原始中心/尺寸/角度，作为缩放/旋转同步的基准
        const childrenOrigin = cells.map((c: any) => {
          const pos = c.getPosition()
          const size = c.getSize()
          const angle = (typeof c.getAngle === 'function' ? c.getAngle() : 0) || 0
          return {
            id: c.id,
            cx: pos.x + size.width / 2,
            cy: pos.y + size.height / 2,
            w: size.width,
            h: size.height,
            angle,
          }
        })
        const parent = graph.addNode({
          shape: 'rect',
          x: bbox.x,
          y: bbox.y,
          width: bbox.width,
          height: bbox.height,
          attrs: {
            body: { fill: 'transparent', stroke: 'transparent', strokeDasharray: '5,5', strokeWidth: 1 },
            label: { text: '分组', fill: 'transparent', fontSize: 12 },
          },
          zIndex: -1,
          data: {
            isGroup: true,
            groupOrigin: {
              cx: bbox.x + bbox.width / 2,
              cy: bbox.y + bbox.height / 2,
              size: { width: bbox.width, height: bbox.height },
              angle: 0,
              children: childrenOrigin,
            },
          },
        })
        // embed：建立父子关系，子节点平移自动跟随父节点
        cells.forEach((cell) => parent.embed(cell))
        message.success('已创建分组')
        graph.cleanSelection();
        graph.select(parent);
        graph.createTransformWidget(parent);
      }
    } else {
      message.warning('请选择至少2个对象进行分组')
    }
  }
  // 取消分组
  const handleUngroup = () => {
    const graph = getGraph()
    if (graph && selectedCellIds.length > 0) {
      const cells = selectedCellIds.map((id: string) => graph.getCellById(id))
      const removable = cells.filter((c: any) => c.getAttrs?.()?.label?.text === '分组')
      if (removable.length > 0) {
        graph.removeCells(removable)
        message.success('已取消分组')
      } else {
        message.info('所选对象不是分组')
      }
    }
  }
  // 重置视图：缩放至 100%，画布原点对齐标尺交叉矩形的右下角
  const handleResetView = () => {
    const graph = getGraph()
    if (graph) {
      graph.zoomTo(1)
      // 将画布坐标 (0,0) 对齐到标尺交叉矩形的右下角（屏幕坐标 24, 24）
      // 水平标尺高 24px，垂直标尺宽 24px，交叉矩形位于 (0,0) 到 (24, 24)
      graph.translate(0, 0)
      message.info('视图已重置为100%')
    }
  }
  // 画线模式：none / straight / polyline
  const lineMode = useAppStore((s) => s.lineMode)
  const setLineMode = useAppStore((s) => s.setLineMode)
  // 自由直线：两次点击确定起点与终点，完成后自动退出
  const handleStraightLine = () => {
    setLineMode('straight')
    message.info('自由直线：点击画布第1次定起点，第2次定终点')
  }
  // 折线：多点逐段绘制，右键或双击结束，完成后自动退出
  const handlePolyline = () => {
    setLineMode('polyline')
    message.info('折线：点击画布逐点绘制，双击或右键结束')
  }
  // 结束直线建立：取消正在进行的自由直线/折线，并删除未完成的线
  const handleEndLine = () => {
    setLineMode('none')
    message.info('已结束画线')
  }
  // 上移
  const handleMoveUp = () => {
    const graph = getGraph()
    if (graph && selectedCellIds.length > 0) {
      const cells = selectedCellIds.map((id: string) => graph.getCellById(id))
      const childIds = new Set();
      cells.forEach(item => {
        if (item.children && Array.isArray(item.children)) {
          item.children.forEach(childId => childIds.add(childId));
        }
      });
      const newCells = [...childIds.values()].filter(item => !cells.includes(item))
      // 已在顶层则跳过，避免多余按下让 zIndex 超过最大值，导致下移时需要多按一次
      const maxZ = graph.model.getMaxZIndex()
      newCells.forEach((cell: any) => {
        if (cell.getZIndex() <= maxZ) cell.setZIndex(cell.getZIndex() + 1)
      })
      selectedCellIds.forEach((id: string) => {
        const cell = graph.getCellById(id)
        if (cell && cell.getZIndex() <= maxZ) cell.setZIndex(cell.getZIndex() + 1)
      })
    }
  }
  // 下移
  const handleMoveDown = () => {
    const graph = getGraph()
    if (graph && selectedCellIds.length > 0) {
      const cells = selectedCellIds.map((id: string) => graph.getCellById(id))
      const childIds = new Set();
      cells.forEach(item => {
        if (item.children && Array.isArray(item.children)) {
          item.children.forEach(childId => childIds.add(childId));
        }
      });
      const newCells = [...childIds.values()].filter(item => !cells.includes(item))
      // 已在底层则跳过，避免多余按下让 zIndex 低于最小值
      const minZ = graph.model.getMinZIndex()
      newCells.forEach((cell: any) => {
        if (cell.getZIndex() >= minZ) cell.setZIndex(cell.getZIndex() - 1)
      })
      selectedCellIds.forEach((id: string) => {
        const cell = graph.getCellById(id)
        if (cell && cell.getZIndex() >= minZ) cell.setZIndex(cell.getZIndex() - 1)
      })
    }
  }
  // 前置
  const handleBringToFront = () => {
    const graph = getGraph()
    if (graph && selectedCellIds.length > 0) {
      const cells = selectedCellIds.map((id: string) => graph.getCellById(id))
      const childIds = new Set();
      cells.forEach(item => {
        if (item.children && Array.isArray(item.children)) {
          item.children.forEach(childId => childIds.add(childId));
        }
      });

      selectedCellIds.forEach((id: string) => graph.getCellById(id)?.toFront())
      const newCells = [...childIds.values()].filter(item => !cells.includes(item))
      newCells.forEach((cell: any) => cell.toFront())
    }
  }
  // 后置
  const handleSendToBack = () => {
    const graph = getGraph()
    if (graph && selectedCellIds.length > 0) {
      const cells = selectedCellIds.map((id: string) => graph.getCellById(id))
      const childIds = new Set();
      cells.forEach(item => {
        if (item.children && Array.isArray(item.children)) {
          item.children.forEach(childId => childIds.add(childId));
        }
      });
      const newCells = [...childIds.values()].filter(item => !cells.includes(item))
      newCells.forEach((cell: any) => cell.toBack())
      selectedCellIds.forEach((id: string) => graph.getCellById(id)?.toBack())
    }
  }
  // 导出JSON
  const handleExport = () => {
    const graph = getGraph()
    if (graph) {
      const json = JSON.stringify(graph.toJSON(), null, 2)
      console.log(json, '--json')
      const a = document.createElement('a')
      a.href = 'data:text/json,' + encodeURIComponent(json)
      a.download = `canvas-${Date.now()}.json`
      a.click()
      message.success('已导出JSON')
    }
  }

  return (
    <div className="toolbar">
      <Space size={4}>
        <Tooltip title={leftPanelVisible ? '隐藏左控制面板' : '显示左控制面板'}>
          <Button type="text" icon={leftPanelVisible ? <LeftOutlined /> : <RightOutlined />} onClick={handleShowHideLeft} />
        </Tooltip>

        <Tooltip title={rightPanelVisible ? '隐藏右控制面板' : '显示右控制面板'}>
          <Button type="text" icon={rightPanelVisible ? <RightOutlined /> : <LeftOutlined />} onClick={handleShowHideRight} />
        </Tooltip>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <Tooltip title="撤销 (Ctrl+Z)">
          <Button type="text" icon={<UndoOutlined />} onClick={handleUndo} />
        </Tooltip>
        <Tooltip title="重做 (Ctrl+Y)">
          <Button type="text" icon={<RedoOutlined />} onClick={handleRedo} />
        </Tooltip>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <Tooltip title="复制 (Ctrl+C)">
          <Button type="text" icon={<CopyOutlined />} onClick={handleCopy} />
        </Tooltip>
        <Tooltip title="剪切 (Ctrl+X)">
          <Button type="text" icon={<ScissorOutlined />} onClick={handleCut} />
        </Tooltip>
        <Tooltip title="粘贴 (Ctrl+V)">
          <Button type="text" icon={<SnippetsOutlined />} onClick={handlePaste} />
        </Tooltip>
        <Tooltip title="删除 (Delete)">
          <Button type="text" icon={<DeleteOutlined />} onClick={handleDelete} />
        </Tooltip>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <Tooltip title="分组">
          <Button type="text" icon={<TeamOutlined />} onClick={handleGroup} />
        </Tooltip>
        <Tooltip title="取消分组">
          <Button type="text" icon={<DeleteOutlined />} onClick={handleUngroup} />
        </Tooltip>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <Tooltip title="主题切换">
          <Button type="text" icon={theme === 'dark' ? <BulbFilled /> : <BulbOutlined />} onClick={toggleTheme} />
        </Tooltip>

        <Tooltip title="100%视图">
          <Button type="text" icon={<AimOutlined />} onClick={handleResetView} />
        </Tooltip>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <Tooltip title="自由直线">
          <Button
            type="text"
            icon={<MinusOutlined />}
            onClick={handleStraightLine}
            style={lineMode === 'straight' ? { color: '#1677ff', backgroundColor: 'rgba(22,119,255,0.1)' } : undefined}
          />
        </Tooltip>
        <Tooltip title="折线">
          <Button
            type="text"
            icon={<NodeIndexOutlined />}
            onClick={handlePolyline}
            style={lineMode === 'polyline' ? { color: '#1677ff', backgroundColor: 'rgba(22,119,255,0.1)' } : undefined}
          />
        </Tooltip>
        <Tooltip title="结束直线建立">
          <Button
            type="text"
            icon={<StopOutlined />}
            onClick={handleEndLine}
            disabled={lineMode === 'none'}
          />
        </Tooltip>

        <Tooltip title="显示/隐藏网格">
          <Switch size="small" checked={canvasShowGrid} onChange={(checked) => setCanvasShowGrid(checked)} />
        </Tooltip>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <Tooltip title="上移一层">
          <Button type="text" icon={<VerticalAlignTopOutlined />} onClick={handleMoveUp} />
        </Tooltip>
        <Tooltip title="下移一层">
          <Button type="text" icon={<VerticalAlignBottomOutlined />} onClick={handleMoveDown} />
        </Tooltip>
        <Tooltip title="置于顶层">
          <Button type="text" icon={<ColumnHeightOutlined />} onClick={handleBringToFront} />
        </Tooltip>
        <Tooltip title="置于底层">
          <Button type="text" icon={<BorderOutlined />} onClick={handleSendToBack} />
        </Tooltip>

        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <Tooltip title="导出">
          <Button type="text" icon={<CameraOutlined />} onClick={handleExport} />
        </Tooltip>
      </Space>
    </div>
  )
}
