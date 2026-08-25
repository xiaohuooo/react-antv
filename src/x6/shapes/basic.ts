import { Graph } from '@antv/x6'

let registered = false
let edgeToolsRegistered = false
export function registerEdgeTools() {
  if (edgeToolsRegistered) return
  edgeToolsRegistered = true

  // 圆形箭头工具
  Graph.registerEdgeTool('circle-target-arrowhead', {
    inherit: 'target-arrowhead',
    tagName: 'circle',
    attrs: {
      r: 4,
      fill: 'rgb(0,170,255)',
      'stroke-width': 1,
      cursor: 'move',
    },
  })
  // 圆形箭头工具
  Graph.registerEdgeTool('circle-source-arrowhead', {
    inherit: 'source-arrowhead',
    tagName: 'circle',
    attrs: {
      r: 4,
      fill: 'rgb(255,49,69)',
      'stroke-width': 1,
      cursor: 'move',
    },
  })
}

export function registerBasicShapes() {
  if (registered) return
  registered = true
  // #region 初始化图形
  // 独立直线
  const ports = {
    groups: {
      top: {
        position: 'top',
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
      bottom: {
        position: 'bottom',
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
        group: 'top',
      },
      {
        group: 'right',
      },
      {
        group: 'bottom',
      },
      {
        group: 'left',
      },
    ],
  }
  // 折线节点
  Graph.registerNode('custom-line', {
    inherit: 'path',
    width: 10,
    height: 10,
    markup: [
      { tagName: 'path', selector: 'body' },
      { tagName: 'circle', selector: 'startPoint' },
      { tagName: 'circle', selector: 'endPoint' },
      { tagName: 'text', selector: 'label' },
    ],
    attrs: {
      body: {
        connection: true,
        strokeWidth: 2,
        stroke: '#5F95FF',
        fill: 'none',
        targetMarker: null,
      },
      startPoint: {
        r: 4,
        magnet: true,
        fill: '#fff',
        stroke: '#5F95FF',
        strokeWidth: 2,
      },
      endPoint: {
        r: 4,
        magnet: true,
        fill: '#fff',
        stroke: '#5F95FF',
        strokeWidth: 2,
      },
      label: {
        refX: 0.5,
        refY: '100%',
        refDy: 8,
        fill: '#333',
        fontSize: 12,
      },
    },
  })
  // 矩形节点
  Graph.registerNode('custom-rect', {
    inherit: 'rect',
    width: 100,
    height: 60,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'text', selector: 'label' },
    ],
    attrs: {
      body: {
        fill: '#1677ff',
        stroke: '#4096ff',
        strokeWidth: 1,
        rx: 4,
        ry: 4,
      },
      label: {
        refX: '50%',
        refY: '50%',
        fill: '#fff',
        fontSize: 14,
      },
    },
    ports: { ...ports }
  })
  // 圆形节点
  Graph.registerNode('custom-circle', {
    inherit: 'circle',
    width: 80,
    height: 80,
    markup: [
      { tagName: 'circle', selector: 'body' },
      { tagName: 'text', selector: 'label' },
    ],
    attrs: {
      body: {
        fill: '#52c41a',
        stroke: '#73d13d',
        strokeWidth: 1,
      },
      label: {
        refX: '50%',
        refY: '50%',
        fill: '#fff',
        fontSize: 14,
      },
    },
    ports: { ...ports }
  })
  // 椭圆节点
  Graph.registerNode('custom-ellipse', {
    inherit: 'ellipse',
    width: 120,
    height: 80,
    markup: [
      { tagName: 'ellipse', selector: 'body' },
      { tagName: 'text', selector: 'label' },
    ],
    attrs: {
      body: {
        fill: '#fa8c16',
        stroke: '#ffa940',
        strokeWidth: 1,
      },
      label: {
        refX: '50%',
        refY: '50%',
        fill: '#fff',
        fontSize: 14,
      },
    },
  })
  // 文本节点
  Graph.registerNode('custom-text', {
    inherit: 'rect',
    width: 120,
    height: 40,
    markup: [
      { tagName: 'rect', selector: 'body' },
      { tagName: 'text', selector: 'label' },
    ],
    attrs: {
      body: {
        fill: 'transparent',
        stroke: 'transparent',
        strokeWidth: 0,
      },
      label: {
        refX: '50%',
        refY: '50%',
        fill: '#fff',
        fontSize: 14,
        fontWeight: 'normal',
        text: `text`,
      },
    },
  })
  // 多边形节点
  Graph.registerNode('custom-polygon', {
    inherit: 'polygon',
    width: 100,
    height: 100,
    markup: [
      { tagName: 'polygon', selector: 'body' },
      { tagName: 'text', selector: 'label' },
    ],
    attrs: {
      body: {
        fill: '#eb2f96',
        stroke: '#f759ab',
        strokeWidth: 1,
        refPoints: '50,0 100,38 82,100 18,100 0,38',
      },
      label: {
        refX: '50%',
        refY: '50%',
        fill: '#fff',
        fontSize: 14,
      },
    },
  })
  // 折线节点
  Graph.registerNode('custom-polyline', {
    inherit: 'polyline',
    width: 100,
    height: 60,
    markup: [
      { tagName: 'polyline', selector: 'body' },
      { tagName: 'text', selector: 'label' },
    ],
    attrs: {
      body: {
        fill: 'none',
        stroke: '#ffa940',
        strokeWidth: 1,
        refPoints: '0,40 40,40 40,80 80,80 80,120 120,120 120,160',
      },
      label: {
        refX: '50%',
        refY: '50%',
        fill: '#fff',
        fontSize: 14,
      },
    },
  })
  // 路径节点
  Graph.registerNode('custom-path', {
    inherit: 'path',
    width: 60,
    height: 60,
    markup: [
      { tagName: 'path', selector: 'body' },
      { tagName: 'text', selector: 'label' },
    ],
    attrs: {
      body: {
        fill: '#ED8A19',
        stroke: 'none',
        strokeWidth: 1,
        d: 'M26.285,2.486l5.407,10.956c0.376,0.762,1.103,1.29,1.944,1.412l12.091,1.757c2.118,0.308,2.963,2.91,1.431,4.403l-8.749,8.528c-0.608,0.593-0.886,1.448-0.742,2.285l2.065,12.042c0.362,2.109-1.852,3.717-3.746,2.722l-10.814-5.685c-0.752-0.395-1.651-0.395-2.403,0l-10.814,5.685c-1.894,0.996-4.108-0.613-3.746-2.722l2.065-12.042c0.144-0.837-0.134-1.692-0.742-2.285l-8.749-8.528c-1.532-1.494-0.687-4.096,1.431-4.403l12.091-1.757c0.841-0.122,1.568-0.65,1.944-1.412l5.407-10.956C22.602,0.567,25.338,0.567,26.285,2.486z',
      },
      label: {
        refX: '50%',
        refY: '50%',
        fill: '#fff',
        fontSize: 14,
      },
    },
  })
  // 弧形节点
  Graph.registerNode('custom-arc', {
    inherit: 'path',
    width: 100,
    height: 60,
    markup: [
      { tagName: 'path', selector: 'body' },
      { tagName: 'text', selector: 'label' },
    ],
    attrs: {
      body: {
        // fill: '#fa541c',
        stroke: '#ff7a45',
        strokeWidth: 1,
        d: 'M 0 60 A 50 50 0 0 1 100 60',
      },
      label: {
        refX: '50%',
        refY: '100%',
        fill: '#fff',
        fontSize: 14,
      },
    },
  })

  // 扇形节点
  Graph.registerNode('custom-sector', {
    inherit: 'path',
    width: 100,
    height: 80,
    markup: [
      { tagName: 'path', selector: 'body' },
      { tagName: 'text', selector: 'label' },
    ],
    attrs: {
      body: {
        fill: '#a0d911',
        stroke: '#bae637',
        strokeWidth: 1,
        d: 'M 50 80 L 50 0 A 50 50 0 0 1 100 50 Z',
      },
      label: {
        refX: '50%',
        refY: '50%',
        fill: '#fff',
        fontSize: 14,
      },
    },
  })
  // 弓形节点
  Graph.registerNode('custom-chord', {
    inherit: 'path',
    width: 100,
    height: 60,
    markup: [
      { tagName: 'path', selector: 'body' },
      { tagName: 'text', selector: 'label' },
    ],
    attrs: {
      body: {
        fill: '#fadb14',
        stroke: '#ffec3d',
        strokeWidth: 1,
        d: 'M 16.67 5 C 0 55, 100 55, 83.33 5',
      },
      label: {
        refX: '50%',
        refY: '50%',
        fill: '#333',
        fontSize: 14,
      },
    },
  })
}

export function createNodeByType(graph: Graph, type: string, x: number, y: number): any {
  const nodeConfig: any = { x, y }
  switch (type) {
    case 'line':
      return graph.addNode({ shape: 'custom-line', ...nodeConfig, width: 2, height: 2 })
    case 'rect':
      return graph.addNode({ shape: 'custom-rect', ...nodeConfig })
    case 'circle':
      return graph.addNode({ shape: 'custom-circle', ...nodeConfig })
    case 'ellipse':
      return graph.addNode({ shape: 'custom-ellipse', ...nodeConfig })
    case 'polygon':
      return graph.addNode({ shape: 'custom-polygon', ...nodeConfig })
    case 'polyline':
      return graph.addNode({ shape: 'custom-polyline', ...nodeConfig })
    case 'path':
      return graph.addNode({ shape: 'custom-path', ...nodeConfig })
    case 'text':
      return graph.addNode({ shape: 'custom-text', ...nodeConfig })
    case 'arc':
      return graph.addNode({ shape: 'custom-arc', ...nodeConfig })
    case 'sector':
      return graph.addNode({ shape: 'custom-sector', ...nodeConfig })
    case 'chord':
      return graph.addNode({ shape: 'custom-chord', ...nodeConfig })
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
 * 弧线 / 扇形 / 弓形：随外框尺寸等比缩放路径 d
 * 保持各形状原始比例，默认尺寸下与原始 d 完全一致，缩放外框时按比例重算 d。
 */
export function updateArcSectorChord(node: any) {
  const shape = node.shape
  if (shape !== 'custom-arc' && shape !== 'custom-sector' && shape !== 'custom-chord') return
  const size = node.getSize()
  const w = size.width
  const h = size.height
  let d = ''
  if (shape === 'custom-arc') {
    // 原始 100×60：M 0 60 A 50 50 0 0 1 100 60
    d = `M 0 ${h} A ${w / 2} ${h * 5 / 6} 0 0 1 ${w} ${h}`
  } else if (shape === 'custom-sector') {
    // 原始 100×80：M 50 80 L 50 0 A 50 50 0 0 1 100 50 Z
    d = `M ${w / 2} ${h} L ${w / 2} 0 A ${w / 2} ${h * 5 / 8} 0 0 1 ${w} ${h * 5 / 8} Z`
  } else {
    // custom-chord 原始 path 100×60：M 16.67 5 C 0 55, 100 55, 83.33 5
    d = `M ${w / 6} ${h / 12} C 0 ${h * 11 / 12}, ${w} ${h * 11 / 12}, ${w * 5 / 6} ${h / 12}`
  }
  node.setAttrs({ body: { d } })
}
