import { useEffect, useRef, useCallback, useState } from "react";
import {
  Graph,
  Transform,
  Selection,
  Snapline,
  Keyboard,
  Clipboard,
  History,
  Scroller,
  Shape,
} from "@antv/x6";
import { useAppStore } from "../../stores/appStore";
import type { LineMode } from "../../types";
import {
  registerBasicShapes,
  createNodeByType,
  registerEdgeTools,
  updateArcSectorChord,
} from "../../x6/shapes/basic";
import {
  registerCustomShapes,
  createCustomNodeByType,
  setupFanNode,
  updateFanScale,
  updateSwitchScale,
  cleanupFanAnimation,
  setupTableNode,
  setupSvgAnimations,
  syncGroupChildrenTransform,
  remapPastedGroupChildren,
  updateEchartsSize,
} from "../../x6/shapes/custom";
import Ruler from "./Ruler";

// 模块加载时注册所有自定义形状与边工具（仅执行一次）
registerBasicShapes();
registerCustomShapes();
registerEdgeTools();

interface CanvasTabProps {
  tabId: string;
}

/**
 * 画布标签页组件
 * 负责 X6 图实例的创建、插件注册、事件绑定、节点拖拽与快捷键处理
 * 同时驱动标尺（Ruler）的缩放/平移/光标位置显示
 */
export default function CanvasTab({ tabId }: CanvasTabProps) {
  // 画布容器 DOM 引用 & 图实例引用
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  // 全局状态：选中元素、缩放、网格、背景、自由连线模式等
  const setSelectedCellIds = useAppStore((s) => s.setSelectedCellIds);
  const setSelectedEdgeIds = useAppStore((s) => s.setSelectedEdgeIds);
  const zoom = useAppStore((s) => s.zoom);
  const setZoom = useAppStore((s) => s.setZoom);
  const canvasShowGrid = useAppStore((s) => s.canvasShowGrid);
  const canvasBgColor = useAppStore((s) => s.canvasBgColor);
  const canvasBgImage = useAppStore((s) => s.canvasBgImage);
  const canvasBgImageFill = useAppStore((s) => s.canvasBgImageFill);
  const canvasGridSize = useAppStore((s) => s.canvasGridSize);
  const theme = useAppStore((s) => s.theme);
  const lineMode = useAppStore((s) => s.lineMode);
  const setLineMode = useAppStore((s) => s.setLineMode);

  // 鼠标在画布坐标系中的位置（驱动标尺指示线）
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  // 当前选中元素的包围盒（驱动标尺选择框）
  const [selectionBBox, setSelectionBBox] = useState<any>(null);
  // 画布平移量（驱动标尺刻度与画布对齐）
  const [translate, setTranslate] = useState({ tx: 0, ty: 0 });

  // 画线模式标志（用 ref 避免在事件回调中拿到过期闭包）
  const lineModeRef = useRef<LineMode>('none');
  // 当前正在绘制的连线（点击多次逐步延长）
  const currentEdgeRef = useRef<any>(null);
  // 已确认的点数（每次左键点击打点 +1，右键/双击结束不增加）
  const confirmedPointsRef = useRef<number>(0);
  // 待选中的边：连线建立完成后需进入选中状态，但需等退出画线模式 useEffect 恢复选择能力后再选中
  const pendingSelectEdgeRef = useRef<any>(null);
  // 结束绘制时的收尾函数（恢复可交互、挂载编辑工具），由主 useEffect 注入
  const finalizeFreeLineRef = useRef<(edge: any) => void>(() => { });
  const useDebounce = () => {
    let timer = null;

    const debounce = (fn: any, delay: number, node: any) => {
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(() => {
        fn(node);
        timer = null;
      }, delay);
    };

    return { debounce };
  };
  const { debounce } = useDebounce();

  // 同步画线模式到 ref，并在进入/退出模式时清理未完成的连线
  useEffect(() => {
    lineModeRef.current = lineMode;
    const graph = graphRef.current;
    if (!graph) return;

    if (lineMode !== 'none') {
      // 进入画线模式：禁用选择能力，重置已确认点数，并清理上一模式残留的进行中连线
      graph.disableSelection();
      confirmedPointsRef.current = 0;
      if (currentEdgeRef.current) {
        graph.removeCell(currentEdgeRef.current);
        currentEdgeRef.current = null;
      }
    } else {
      // 退出画线模式：恢复选择能力
      // 说明：正常完成路径在完成时已将 currentEdgeRef 置空并保留连线；
      // 这里仍存在 currentEdgeRef 表示被「结束直线建立」取消，需删除未完成的线
      graph.enableSelection();
      if (currentEdgeRef.current) {
        graph.removeCell(currentEdgeRef.current);
        currentEdgeRef.current = null;
      }
      confirmedPointsRef.current = 0;
      // 若刚完成一条连线，选中该边以显示端点 / 顶点 / 选择框
      const pendingEdge = pendingSelectEdgeRef.current;
      pendingSelectEdgeRef.current = null;
      if (pendingEdge) {
        graph.cleanSelection();
        graph.select(pendingEdge);
      }
    }
  }, [lineMode]);

  // 画布初始化（仅在 tabId 变化时执行一次）
  useEffect(() => {
    if (!containerRef.current) return;

    // 创建 X6 图实例
    const graph = new Graph({
      container: containerRef.current,
      autoResize: true, // 容器尺寸变化时自动调整画布
      // 点状网格
      grid: {
        visible: canvasShowGrid,
        type: "dot",
        args: { color: "#666666", thickness: 2 },
      },
      connecting: {
        // allowBlank: false,
        allowNode: false,
      },
      // 平移：按住空格 + 左键拖拽
      panning: {
        enabled: true,
        eventTypes: ["leftMouseDown"],
        modifiers: ["space"],
      },
      // 缩放：Ctrl/Meta + 滚轮，以鼠标位置为缩放中心
      mousewheel: {
        enabled: true,
        zoomAtMousePosition: true,
        modifiers: ["ctrl", "meta"],
        minScale: 0.5,
        maxScale: 3,
      },
    });

    // 注册 X6 插件：变换（缩放/旋转）、选择、对齐线、键盘、剪贴板、历史记录
    graph.use(
      new Transform({
        resizing: { enabled: true, minWidth: 30, minHeight: 30 },
        rotating: { enabled: true },
      }),
    );

    graph.use(
      new Selection({
        multiple: true, // 多选
        rubberband: true, //是否启用框选节点功能
        rubberNode: true, //框选时是否将节点纳入框选范围计算
        rubberEdge: true, //框选时是否将边纳入框选范围计算,如果为false,则折线就不能框选
        movable: true, //拖动选框时框选的节点是否一起移动
        showNodeSelectionBox: true, //是否显示节点的选择框
        showEdgeSelectionBox: true, //是否显示边的选择框
        strict: true, //严格框选模式:仅当节点/边‌完全包含‌在选框内才被选中,否则不选中(默认false,即只要部分重叠即选中)
        pointerEvents: "none",
      }),
    );

    graph.use(new Snapline({
      resizing: true,
      filter: (cell: any) => {
        return !cell.children
      },
    })); // 对齐辅助线
    graph.use(new Keyboard()); // 键盘交互
    graph.use(new Clipboard()); // 剪贴板
    graph.use(new History()); // 撤销/重做

    // 边选中时显示端点圆 / 顶点圆，取消选中时隐藏
    // 画线模式期间禁止添加选中工具（顶点/端点圆），避免正在绘制的边被意外选中
    graph.on("cell:selected", ({ cell }: any) => {
      if (lineModeRef.current !== 'none') return;
      if (cell && cell.isEdge()) addEdgeHandleTools(cell);
    });
    graph.on("cell:unselected", ({ cell }: any) => {
      if (cell && cell.isEdge()) removeEdgeHandleTools(cell);
    });

    // 选中元素变化：同步到全局状态并记录包围盒（用于标尺选择框）
    graph.on("selection:changed", ({ added, removed, selected }: any) => {
      if (removed.length > 0 && removed[0].children) {
        removed[0].setAttrs({ body: { stroke: 'transparent' } })
      }
      const nodeIds: string[] = [];
      const edgeIds: string[] = [];
      selected.forEach((cell: any) => {
        if (cell.isNode()) nodeIds.push(cell.id);
        if (cell.isEdge()) edgeIds.push(cell.id);
      });
      setSelectedCellIds(nodeIds);
      setSelectedEdgeIds(edgeIds);
      if (selected.length === 1) {
        const bbox = selected[0].getBBox();
        setSelectionBBox({
          x: bbox.x,
          y: bbox.y,
          w: bbox.width,
          h: bbox.height,
        });
      } else if (selected.length > 1) {
        const cells = selected.map((id) => graph.getCellById(id));
        const bbox = graph.getCellsBBox(cells);
        setSelectionBBox({
          x: bbox.x,
          y: bbox.y,
          w: bbox.width,
          h: bbox.height,
        });
      }
    });
    // 画布缩放：同步 zoom 和 translate 到标尺
    graph.on("scale", ({ sx }: { sx: number }) => {
      setZoom(sx);
      const { tx, ty } = graph.translate();
      setTranslate({ tx, ty });
    });

    // 画布平移：同步 translate 到标尺
    graph.on("translate", ({ tx, ty }: { tx: number; ty: number }) => {
      setTranslate({ tx, ty });
    });

    // 使用原生 mousemove 监听，确保鼠标在画布任意位置移动时标尺指示线都能跟随
    const handleMouseMove = (e: MouseEvent) => {
      const localPoint = graph.clientToLocal({ x: e.clientX, y: e.clientY });
      setMousePos({ x: localPoint.x, y: localPoint.y });
      // 画线模式：实时更新当前连线的终点，使下一段跟随鼠标动态预览
      if (lineModeRef.current !== 'none' && currentEdgeRef.current) {
        currentEdgeRef.current.setTarget({ x: localPoint.x, y: localPoint.y });
      }
    };
    containerRef.current?.addEventListener("mousemove", handleMouseMove);

    graph.on("blank:click", ({ node }: any) => {
      // 包围盒
      setSelectionBBox(null);
      // const portId = node.addPorts([{ id: `port-${Date.now()}`, group: 'top' }])
    });

    // 给自由直线 / 折线添加端点圆和顶点工具（选中时调用）
    const addEdgeHandleTools = (edge: any) => {
      try {
        edge.addTools([
          { name: "vertices", args: { modifiers: ["ctrl"], attrs: { fill: 'rgb(0,170,255)', 'stroke-width': 1, r: 4, } } },
          { name: "circle-target-arrowhead" },
          { name: "circle-source-arrowhead" },
        ]);
      } catch (_) { /* ignore if tools already exist */ }
    };
    // 移除端点圆和顶点工具（取消选中时调用）
    const removeEdgeHandleTools = (edge: any) => {
      try {
        edge.removeTool("vertices");
      } catch (_) { /* ignore */ }
      try {
        edge.removeTool("circle-target-arrowhead");
      } catch (_) { /* ignore */ }
      try {
        edge.removeTool("circle-source-arrowhead");
      } catch (_) { /* ignore */ }
    };

    // 结束自由连线绘制：清理 dblclick 产生的末尾重复顶点
    // 端点圆 / 顶点圆不在此处挂载，而是仅在该边被选中时显示
    finalizeFreeLineRef.current = (edge: any) => {
      const vertices = edge.getVertices() || [];
      if (vertices.length > 0) {
        const last = vertices[vertices.length - 1];
        const target = edge.getTargetPoint();
        if (
          target &&
          Math.abs(last.x - target.x) < 1 &&
          Math.abs(last.y - target.y) < 1
        ) {
          edge.setVertices(vertices.slice(0, -1));
        }
      }
    };

    // 画线模式：打点（首次点击创建连线，后续点击按模式分流）
    // 终点跟随鼠标时光标压在连线自身上，blank:click 不会触发，
    // 因此同时监听 cell:click，确保点击落在连线/节点上也能打点
    const placeLinePoint = (e: MouseEvent) => {
      if (lineModeRef.current === 'none') return;
      const localPoint = graph.clientToLocal({ x: e.clientX, y: e.clientY });

      if (!currentEdgeRef.current) {
        // 首次点击：创建以当前点为起止的连线（绘制中不挂载工具，选择能力已禁用）
        currentEdgeRef.current = graph.addEdge({
          source: { x: localPoint.x, y: localPoint.y },
          target: { x: localPoint.x, y: localPoint.y },
          attrs: {
            line: {
              stroke: "#8f8f8f",
              strokeWidth: 1,
              targetMarker: null,
            },
          },
        });
        confirmedPointsRef.current = 1;
        return;
      }

      const edge = currentEdgeRef.current;

      if (lineModeRef.current === 'straight') {
        // 自由直线：第 2 次点击直接设定终点，完成并自动退出
        setTimeout(() => {
          edge.setTarget({ x: localPoint.x, y: localPoint.y });
          confirmedPointsRef.current++;
          finalizeFreeLineRef.current(edge);
          currentEdgeRef.current = null;
          confirmedPointsRef.current = 0;
          pendingSelectEdgeRef.current = edge;
          setLineMode('none');
        }, 200);
        return;
      }

      // 折线：将上一次终点转为顶点，再把终点更新为当前点
      const oldTarget = edge.getTargetPoint();
      const source = edge.getSourcePoint();
      if (oldTarget.x !== source.x || oldTarget.y !== source.y) {
        const oldVertices = edge.getVertices() || [];
        edge.setVertices([
          ...oldVertices,
          { x: oldTarget.x, y: oldTarget.y },
        ]);
      }
      edge.setTarget({ x: localPoint.x, y: localPoint.y });
      confirmedPointsRef.current++;
    };

    // 统一结束绘制：按规则判断保留或删除，右键/双击/Enter 的点不计入
    // 规则：
    //   (b) 折线：已确认点数 ≤ 2 → 删除建立的折线
    //        折线：已确认点数 ≥ 3 → 保留（N 个顶点 → N-1 条线段）
    //   (c) 自由直线：已确认点数 = 2 → 保留（1 条线段）
    //        自由直线：已确认点数 ≤ 1 → 删除
    // 保留的边会被标记为待选中，等退出画线模式 useEffect 恢复选择能力后自动选中
    const endLineDrawing = (type?: 'back' | 'exit') => {
      if (lineModeRef.current === 'none') return;
      if (!currentEdgeRef.current) {
        currentEdgeRef.current = null;
        confirmedPointsRef.current = 0;
        setLineMode('none');
        return;
      }
      const edge = currentEdgeRef.current;
      if (type == 'back') {
        // 删除edge最后一个打点
        const vertices = edge.getVertices() || [];
        if (vertices.length > 0) {
          edge.setVertices(vertices.slice(0, -1));
          confirmedPointsRef.current--;
        }
      }
      const n = confirmedPointsRef.current;
      let keep = false;

      if (lineModeRef.current === 'polyline') {
        // 折线：点 ≤ 2 则取消（2 个点也认为点数不够）
        if (n <= 2) {
          graph.removeCell(edge);
        } else {
          // 正确收尾：把最后一个顶点作为 target，移除末尾重复顶点
          // 结构：source=P1, vertices=[P2, P3, ..., PN], target=previewPos
          // 目标：source=P1, vertices=[P2, ..., P(N-1)], target=PN
          const vertices = edge.getVertices() || [];
          if (vertices.length > 0) {
            const lastVertex = vertices[vertices.length - 1];
            edge.setTarget({ x: lastVertex.x, y: lastVertex.y });
            edge.setVertices(vertices.slice(0, -1));
          }
          finalizeFreeLineRef.current(edge);
          keep = true;
        }
      } else {
        // straight 自由直线：2 个点（1 条线段）是最小要求
        if (n <= 1) {
          graph.removeCell(edge);
        } else {
          finalizeFreeLineRef.current(edge);
          keep = true;
        }
      }

      currentEdgeRef.current = null;
      confirmedPointsRef.current = 0;
      pendingSelectEdgeRef.current = keep ? edge : null;
      setLineMode('none');
    };

    // 结束当前连线：长度为 0 则移除，否则恢复可编辑状态；exitMode=true 时退出画线模式
    // （保留此函数作为 dblclick 内部过渡入口，实际统一走 endLineDrawing）
    const finishLine = (exitMode: boolean) => {
      if (exitMode) {
        endLineDrawing('back');
      }
    };
    // blank 与 cell 都要监听：光标在连线上时走 cell:click，在空白时走 blank:click
    graph.on("blank:click", ({ e }: { e: MouseEvent }) => {
      if (lineModeRef.current === 'none') return;
      if (e.detail === 2) { // 双击
        // finishLine(true);
      } else if (e.detail === 1) { // 单击
        placeLinePoint(e);
      }
    });
    graph.on("cell:click", ({ e }: { e: MouseEvent }) => {
      if (lineModeRef.current === 'none') return;
      if (e.detail === 2) { // 双击
        // finishLine(true);
      } else if (e.detail === 1) { // 单击
        placeLinePoint(e);
      }
    });
    // 双击结束折线并自动退出画线模式
    // graph.on("blank:dblclick", () => finishLine(true));
    // graph.on("cell:dblclick", () => finishLine(true));

    // 节点添加：根据类型初始化风扇动画 / 表格 / SVG 动画
    graph.on("node:added", ({ node }: any) => {
      // 弧线/扇形/弓形：按外框尺寸重算路径（覆盖从 JSON 加载的非默认尺寸）
      updateArcSectorChord(node);
      // 开关：初始化椭圆缩放
      if (node.shape === "custom-switch") {
        updateSwitchScale(node, graph);
      }
      // 风扇：根据叶片数和配色模式启动旋转动画
      if (node.shape === "custom-fan") {
        const data = node.getData() || {};
        const bladeCount = data.bladeCount || 3;
        const colorMode = data.colorMode || "mono";
        setupFanNode(node, bladeCount, colorMode, graph);
      }
      // 表格：按配置渲染行列、标题、合并列等
      if (node.shape === "custom-simpletable") {
        const data = node.getData() || {};
        setupTableNode(node, {
          showTitle: data.showTitle ?? true,
          mergeCols: data.mergeCols ?? 0,
          rowCount: data.rowCount ?? 4,
          colCount: data.colCount ?? 3,
          alternateFill: data.alternateFill ?? true,
          titleText: data.titleText ?? "表格标题",
        });
      }
      // 动态 SVG：延迟启动内部动画（等待 DOM 就绪）
      if (
        node.shape === "custom-svg-dynamic1" ||
        node.shape === "custom-svg-dynamic2" ||
        node.shape === "custom-svg-file1" ||
        node.shape === "custom-svg-file2"
      ) {
        // 延迟以确保 DOM 完成渲染后再启动动画
        setTimeout(() => setupSvgAnimations(node, graph), 50);
      }
    });

    // 节点尺寸实时变化（拖拽缩放过程中）：风扇/开关实时调整大小，弧线/扇形重算路径
    let fanResizeRaf: number | null = null;
    graph.on("node:change:size", ({ node }: any) => {
      if (node.shape === "custom-fan") {
        // rAF 节流：每帧最多更新一次，避免高频 change:size 导致卡顿
        if (fanResizeRaf !== null) cancelAnimationFrame(fanResizeRaf);
        fanResizeRaf = requestAnimationFrame(() => {
          fanResizeRaf = null;
          updateFanScale(node, graph);
        });
        return;
      }
      // 开关：实时随外框尺寸同步拨杆/椭圆大小与描边
      if (node.shape === "custom-switch") {
        updateSwitchScale(node, graph);
        return;
      }
      // 弧线/扇形/弓形：实时随外框尺寸重算路径
      if (
        node.shape === "custom-arc" ||
        node.shape === "custom-sector" ||
        node.shape === "custom-chord"
      ) {
        updateArcSectorChord(node);
      }
      if (
        node.shape.includes("custom-echarts") ||
        node.shape === "custom-tree" ||
        node.shape === "custom-vtable"
      ) {
        updateEchartsSize(node);
      }
    });

    // 节点缩放：风扇重新计算椭圆比例、表格重绘、SVG 动画重启
    graph.on("node:resizing", ({ node }: any) => {
      if (node.shape === "custom-fan") {
        updateFanScale(node, graph);
      }
      if (node.shape === "custom-switch") {
        updateSwitchScale(node, graph);
      }
      if (node.shape === "custom-simpletable") {
        const data = node.getData() || {};
        setupTableNode(node, {
          showTitle: data.showTitle ?? true,
          mergeCols: data.mergeCols ?? 0,
          rowCount: data.rowCount ?? 4,
          colCount: data.colCount ?? 3,
          alternateFill: data.alternateFill ?? true,
          titleText: data.titleText ?? "表格标题",
        });
      }
      if (
        node.shape === "custom-svg-dynamic1" ||
        node.shape === "custom-svg-dynamic2" ||
        node.shape === "custom-svg-file1" ||
        node.shape === "custom-svg-file2"
      ) {
        // 延迟以确保 DOM 完成渲染后再启动动画
        setTimeout(() => setupSvgAnimations(node, graph), 50);
      }
      // 分组缩放同步到子节点（非分组节点会提前 return）
      syncGroupChildrenTransform(node, graph);
    });
    graph.on("node:resized", ({ node }: any) => {
      containerRef.current?.classList.remove("dragging-selected");
    });

    // 节点旋转：分组旋转同步到子节点（非分组节点会提前 return）
    graph.on("node:rotating", ({ node }: any) => {
      syncGroupChildrenTransform(node, graph);
      // containerRef.current?.classList.remove("dragging-selected");
    });
    graph.on("node:rotated", ({ node }: any) => {
      // syncGroupChildrenTransform(node, graph);
      containerRef.current?.classList.remove("dragging-selected");
    });

    // 节点移除：清理风扇动画避免内存泄漏
    graph.on("node:removed", ({ node }: any) => {
      if (node.shape === "custom-fan") {
        cleanupFanAnimation(node, graph);
      }
      setSelectionBBox(null)
    });
    graph.on("edge:removed", ({ node }: any) => {
      setSelectionBBox(null)
    });

    // 工具函数：批量切换连接桩（端口）的显隐
    const showPorts = (ports: NodeListOf<SVGElement>, show: boolean) => {
      for (let i = 0, len = ports.length; i < len; i += 1) {
        ports[i].style.visibility = show ? "visible" : "hidden";
      }
    };

    // 悬停节点时显示连接桩
    graph.on("node:mouseenter", ({ node }: any) => {
      const data = node.store.data.attrs || {};
      if (!data.hasPorts) return;
      const rects = node.parent?.children?.filter((item: any) => item.id !== node.id) || [];
      const views = rects.map((item: any) => graph.findViewByCell(item));
      const allPorts: any = [];
      views.forEach((view) => {
        if (view && view.container) {
          const ports = view.container.querySelectorAll(".x6-port-body");
          // 将 NodeList 转换为数组并合并
          allPorts.push(...Array.from(ports));
        }
      });
      const container = containerRef.current as HTMLElement;
      if (!container) return;
      const ports = container.querySelectorAll(
        ".x6-port-body",
      ) as NodeListOf<SVGElement>;
      showPorts(ports, true);
      showPorts(allPorts, false);
    });

    // 离开节点时隐藏连接桩
    graph.on("node:mouseleave", () => {
      const container = containerRef.current as HTMLElement;
      if (!container) return;
      const ports = container.querySelectorAll(
        ".x6-port-body",
      ) as NodeListOf<SVGElement>;
      showPorts(ports, false);
    });
    let lastSelectedNode: any | null = null;
    graph.on("node:move", ({ node }: any) => {
      if (node.parent) {
        graph.cleanSelection();
      }
      lastSelectedNode = node;
    })
    // 拖动已选中节点时隐藏包围框与操作点（需求 7），拖动结束后恢复
    const handleDragVisualHide = ({ node, current, previous, options }: any) => {
      const selectedCells = graph.getSelectedCells();
      // console.log("handleDragVisualHide", selectedCells);
      const el = node.parent ? node.parent : node;
      if (selectedCells.length > 1) {
        const cells = selectedCells.map((id) => graph.getCellById(id));
        const bbox = graph.getCellsBBox(cells);
        setSelectionBBox({
          x: bbox.x,
          y: bbox.y,
          w: bbox.width,
          h: bbox.height,
        });
      } else {
        // 实时标尺更新
        const bbox = el.getBBox();
        setSelectionBBox({
          x: bbox.x,
          y: bbox.y,
          w: bbox.width,
          h: bbox.height,
        });
      }

      if (graph.isSelected(el)) {
        containerRef.current?.classList.add("dragging-selected");
      } else {
        const isSameNode = lastSelectedNode?.children?.find((child: any) => child.id === node.id);
        console.log(isSameNode, lastSelectedNode, '---isSameNode');
        if ((selectedCells.length == 1 || selectedCells.length == 0) && node.parent && !options.skipParentHandler && !isSameNode) {
          console.log('isSameNode=========');
          const { x: cx, y: cy } = current;
          const { x: px, y: py } = previous;
          const parent = node.parent;
          const { x, y } = parent.getPosition();
          parent.setPosition(x - (px - cx), y - (py - cy));
          parent.children.filter((child: any) => child !== node).forEach((child: any) => {
            const { x, y } = child.getPosition();
            child.prop(
              {
                position: { x: x - (px - cx), y: y - (py - cy) },
              },
              { skipParentHandler: true },
            )
            child.setPosition(x - (px - cx), y - (py - cy));
          })
          containerRef.current?.classList.add("dragging-selected");
          debounce(
            (n: any) => {
              graph.once("node:mouseup", ({ node }: any) => {
                graph.cleanSelection();
                graph.clearTransformWidgets()
                graph.select(n);
                graph.createTransformWidget(n);
              });
            },
            0,
            node
          );
          return
        }
        // 防抖执行
        debounce(
          (n: any) => {
            graph.cleanSelection();
            graph.clearTransformWidgets()
            graph.select(n);
            graph.createTransformWidget(n);
          },
          10,
          el
        );
      }
    };
    const handleDragVisualShow = () => {
      console.log("handleDragVisualShow");
      const existingBox = document.querySelector('.x6-widget-selection-box1');
      if (existingBox) {
        existingBox.remove();
      }
      containerRef.current?.classList.remove("dragging-selected");
    };
    graph.on("node:change:position", handleDragVisualHide);
    // 边拖动：更新选择框
    graph.on("edge:change:terminal", ({ cell }: any) => {
      if (!cell) return;
      const bbox = cell.getBBox();
      setSelectionBBox({
        x: bbox.x,
        y: bbox.y,
        w: bbox.width,
        h: bbox.height,
      });
    });
    graph.on("edge:moved", ({ cell }: any) => {
      // 画线模式期间禁止因边移动而自动选中（setTarget 可能触发此事件）
      if (lineModeRef.current !== 'none') return;
      if (!graph.isSelected(cell)) {
        graph.cleanSelection();
        graph.clearTransformWidgets()
        graph.select(cell);
        addEdgeHandleTools(cell)
      }
    })
    containerRef.current.addEventListener("mouseup", handleDragVisualShow);
    const fun = (selectedCells: any[]) => {
      if (selectedCells.length > 1) {
        const cells = selectedCells.map((id) => graph.getCellById(id));
        const bbox = graph.getCellsBBox(cells);
        setSelectionBBox({
          x: bbox.x,
          y: bbox.y,
          w: bbox.width,
          h: bbox.height,
        });
      } else {
        // 实时标尺更新
        const bbox = selectedCells[0].getBBox();
        setSelectionBBox({
          x: bbox.x,
          y: bbox.y,
          w: bbox.width,
          h: bbox.height,
        });
      }
    }
    // 方向键微调选中元素位置（每次 1 个网格）
    // 节点用 setPosition；边（自由直线 / 折线）用 translate —— 同时移动 source、target 和 vertices
    const moveSelectedBy = (dx: number, dy: number) => {
      const selected = graph.getSelectedCells();
      if (selected.length === 0) return;
      const childIds = new Set();
      selected.forEach(item => {
        if (item.children && Array.isArray(item.children)) {
          item.children.forEach(childId => childIds.add(childId.id));
        }
      });
      const result = selected.filter(item => !childIds.has(item.id));
      console.log(result, '---childs');
      result.forEach((cell: any) => {
        if (cell.isNode && cell.isNode()) {
          // 分组子节点不可单独移动（只能随分组一起移动），跳过
          // if (cell.parent && cell.hasParent()) {
          //   const parent = cell.parent;
          //   const { x, y } = parent.getPosition();
          //   parent.setPosition(x + dx, y + dy);
          //   parent.children.forEach((child: any) => {
          //     const { x, y } = child.getPosition();
          //     child.setPosition(x + dx, y + dy);
          //   })
          //   return
          // }
          const { x, y } = cell.getPosition();
          cell.setPosition(x + dx, y + dy);
          cell.children && cell.children.forEach((child: any) => {
            const { x, y } = child.getPosition();
            child.setPosition(x + dx, y + dy);
          })
        } else if (cell.isEdge && cell.isEdge()) {
          cell.translate(dx, dy);
        }
      });
      containerRef.current?.classList.remove("dragging-selected");
    };
    // 全局键盘快捷键
    const handleKeyDown = (e: KeyboardEvent) => {
      // 撤销 / 重做
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        const selectedCells = graph.getSelectedCells();
        if (e.shiftKey) {
          graph.redo();
        } else {
          graph.undo();
        }
        fun(selectedCells);
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        graph.redo();
        // 画线模式：Esc 取消正在进行的画线并退出画线模式（删除未完成的线）
      } else if (e.key === "Escape") {
        if (lineModeRef.current !== 'none') {
          e.preventDefault();
          if (currentEdgeRef.current) {
            graph.removeCell(currentEdgeRef.current);
            currentEdgeRef.current = null;
          }
          setLineMode('none');
        }
        // 画线模式：Enter 结束当前连线（按点数规则判断保留或删除）并退出画线模式
      } else if (e.key === "Enter") {
        if (lineModeRef.current !== 'none') {
          e.preventDefault();
          endLineDrawing();
        }
        // 删除选中元素
      } else if (e.key === "Delete") {
        const selected = graph.getSelectedCells();
        if (selected.length > 0) {
          e.preventDefault();
          selected.forEach((cell: any) => {
            console.log(cell);
            if (cell.children) {
              graph.removeCells(cell.children);
            }
          })
          graph.removeCells(selected);
          const existingBox = document.querySelector('.x6-widget-selection-box1');
          if (existingBox) {
            existingBox.remove();
          }
        }
        // 全选（画线模式期间禁用，防止选中正在绘制的边）
      } else if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        if (lineModeRef.current !== 'none') return;
        e.preventDefault();
        const allCells = graph.getCells();
        graph.select(allCells);
        // 复制
      } else if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        const cells = graph.getSelectedCells();
        const childIds = new Set();
        cells.forEach(item => {
          if (item.children && Array.isArray(item.children)) {
            item.children.forEach(childId => childIds.add(childId));
          }
        });
        const newCells = [...childIds.values()].filter(item => !cells.includes(item))
        if (cells.length) {
          graph.copy([...cells, ...newCells]);
        }
        // 粘贴
      } else if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        if (!graph.isClipboardEmpty()) {
          const cells = graph.paste({ offset: 32 });
          remapPastedGroupChildren(cells as any[], graph);
          // graph.cleanSelection();
          // graph.clearTransformWidgets();
          // graph.select(cells);
        }
        // 方向键微调选中元素位置
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const gridSize = graph.getGridSize();
        moveSelectedBy(-gridSize, 0);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const gridSize = graph.getGridSize();
        moveSelectedBy(gridSize, 0);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const gridSize = graph.getGridSize();
        moveSelectedBy(0, -gridSize);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        const gridSize = graph.getGridSize();
        moveSelectedBy(0, gridSize);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    // 右键结束当前连线（按点数规则判断保留或删除）并自动退出画线模式
    document.addEventListener("contextmenu", function (event) {
      event.preventDefault(); // 阻止浏览器默认菜单
      if (lineModeRef.current !== 'none') {
        endLineDrawing();
      }
    });
    document.addEventListener("dblclick", function (event) {
      event.preventDefault(); // 阻止浏览器默认菜单
      if (lineModeRef.current !== 'none') {
        endLineDrawing('back');
      }
    });

    graphRef.current = graph;

    // 若挂载时已处于画线模式（如切换标签页），同步禁用该画布的选择能力
    if (lineModeRef.current !== 'none') {
      graph.disableSelection();
    }

    // 将图实例存入全局 store 供其他模块使用
    const currentTabs = useAppStore.getState().tabs;
    const updatedTabs = [...currentTabs];
    const idx = updatedTabs.findIndex((t) => t.id === tabId);
    if (idx !== -1) {
      updatedTabs[idx] = { ...updatedTabs[idx], graph };
      useAppStore.setState({ tabs: updatedTabs });
    }

    // 卸载时清理：断开监听、移除事件、销毁图实例
    return () => {
      containerRef.current?.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleDragVisualShow);
      document.removeEventListener("keydown", handleKeyDown);
      graph.dispose();
      graphRef.current = null;
    };
  }, [tabId]);

  // 响应网格显隐开关
  useEffect(() => {
    if (graphRef.current) {
      if (canvasShowGrid) {
        graphRef.current.showGrid();
        graphRef.current.setGridSize(10);
      } else {
        graphRef.current.hideGrid();
        graphRef.current.setGridSize(1);
      }
    }
  }, [canvasShowGrid]);

  // 拖拽放置：从组件面板拖入节点，按类型分发到基础形状或自定义形状
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const componentKey = e.dataTransfer.getData("component-key");
    if (!componentKey) return;

    const graph = graphRef.current;
    if (!graph) return;
    // 清空画布选择
    graph.cleanSelection();

    // 将屏幕坐标转换为画布坐标
    const localPoint = graph.clientToLocal({ x: e.clientX, y: e.clientY });
    const basicTypes = [
      "line",
      "rect",
      "circle",
      "ellipse",
      "polygon",
      "polyline",
      "path",
      "text",
      "arc",
      "sector",
      "chord",
    ];
    let newNode: any;
    if (basicTypes.includes(componentKey)) {
      newNode = createNodeByType(
        graph,
        componentKey,
        localPoint.x,
        localPoint.y,
      );
    } else {
      newNode = createCustomNodeByType(
        graph,
        componentKey,
        localPoint.x,
        localPoint.y,
      );
    }
    // 新建对象完成后处于选中状态（需求 5）；此前已 cleanSelection，故仅选中新建对象
    if (newNode) {
      // 拖动时鼠标锚定在对象中心，放置时让对象中心对齐鼠标落点
      const { width, height } = newNode.getSize()
      newNode.position(localPoint.x - width / 2, localPoint.y - height / 2)
      graph.select(newNode);
      graph.createTransformWidget(newNode);
    }
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      style={{
        width: "100%",
        height: "100%",
        minHeight: 400,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 标尺：显示刻度、光标指示线、选择框 */}
      <Ruler
        zoom={zoom}
        translate={translate}
        mousePos={mousePos}
        selectionBBox={selectionBBox}
        theme={theme}
      />
      {/* 画布容器：接收拖拽与鼠标事件 */}
      <div
        className="graph-container"
        ref={containerRef}
        style={{
          cursor: lineMode !== 'none' ? "crosshair" : "default",
          backgroundImage: canvasBgImage ? `url(${canvasBgImage})` : "none",
          backgroundSize: canvasBgImageFill === "cover" ? "cover" : "unset",
        }}
      />
    </div>
  );
}
