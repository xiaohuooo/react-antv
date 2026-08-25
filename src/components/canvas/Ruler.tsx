import { useEffect, useRef } from "react";

interface RulerProps {
  zoom: number;
  translate: { tx: number; ty: number };
  mousePos: { x: number; y: number };
  selectionBBox: { x: number; y: number; w: number; h: number } | null;
  theme: "dark" | "light";
}

// 主题颜色配置
const themeColors = {
  dark: {
    background: "#2a2a2a", // 标尺背景
    gradientBlack: "rgba(0,0,0,0.5)", // 黑色渐变端（横向底部 / 竖向右侧）
    minorTick: "#555", // 小刻度
    midTick: "#777", // 中间刻度（1/2处）
    majorTick: "#aaa", // 大刻度
    label: "#ccc", // 标签文字
    indicator: "#1677ff", // 光标指示线
    selection: "rgba(22,119,255,0.15)", // 选择框背景
    selectionBorder: "#1677ff", // 选择框边框
  },
  light: {
    background: "#f0f0f0", // 标尺背景
    gradientBlack: "rgba(0,0,0,0.3)", // 黑色渐变端（横向底部 / 竖向右侧）
    minorTick: "#999", // 小刻度
    midTick: "#666", // 中间刻度（1/2处）
    majorTick: "#333", // 大刻度
    label: "#333", // 标签文字
    indicator: "#1677ff", // 光标指示线
    selection: "rgba(22,119,255,0.15)", // 选择框背景
    selectionBorder: "#1677ff", // 选择框边框
  },
};

export default function Ruler({
  zoom,
  translate,
  mousePos,
  selectionBBox,
  theme,
}: RulerProps) {
  const hRef = useRef<HTMLCanvasElement>(null);
  const vRef = useRef<HTMLCanvasElement>(null);

  const colors = themeColors[theme];

  useEffect(() => {
    const hCanvas = hRef.current;
    const vCanvas = vRef.current;
    if (!hCanvas || !vCanvas) return;

    const draw = () => {
    const dpr = window.devicePixelRatio || 1;
    const hWidth = hCanvas.clientWidth;
    const hHeight = hCanvas.clientHeight;
    const vWidth = vCanvas.clientWidth;
    const vHeight = vCanvas.clientHeight;

    hCanvas.width = hWidth * dpr;
    hCanvas.height = hHeight * dpr;
    vCanvas.width = vWidth * dpr;
    vCanvas.height = vHeight * dpr;

    const hCtx = hCanvas.getContext("2d")!;
    const vCtx = vCanvas.getContext("2d")!;
    hCtx.scale(dpr, dpr);
    vCtx.scale(dpr, dpr);

    // 固定步长：每 100 画布单位为一个大刻度
    const MAJOR_STEP = 100;
    const majorStep = MAJOR_STEP * zoom; // 大刻度像素间距
    const minorStep = majorStep / 10; // 10 等分小刻度

    const drawRuler = (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      horizontal: boolean,
    ) => {
      // 背景
      ctx.fillStyle = colors.background;
      ctx.fillRect(0, 0, width, height);

      // 黑色渐变叠加：横向从下往上，竖向从右往左
      const blackGradient = horizontal
        ? ctx.createLinearGradient(0, height, 0, 0)
        : ctx.createLinearGradient(width, 0, 0, 0);
      blackGradient.addColorStop(0, colors.gradientBlack);
      blackGradient.addColorStop(0.3, "rgba(0,0,0,0)");
      ctx.fillStyle = blackGradient;
      ctx.fillRect(0, 0, width, height);

      // 原点在屏幕上的位置（画布坐标 (0,0) 对应的屏幕位置）
      const originPos = horizontal ? translate.tx : translate.ty;

      // 计算需要绘制的大刻度范围
      const startMajor = Math.floor(-originPos / majorStep) - 1;
      const endMajor =
        Math.ceil((-originPos + (horizontal ? width : height)) / majorStep) + 1;

      // 小刻度过密时跳过显示
      const showMinor = minorStep >= 3;

      // 刻度尺寸：大刻度=标尺厚度（贯穿），中刻度=半厚+2，小刻度=1/4厚+2
      // 标尺"厚度"指刻度延伸方向的尺寸：水平标尺为 height，垂直标尺为 width
      const rulerThickness = horizontal ? height : width;
      const midLen = Math.floor(rulerThickness / 2) + 2;
      const minLen = Math.floor(rulerThickness / 4) + 2;

      // --- 绘制小刻度和中刻度 ---
      if (showMinor) {
        // 小刻度
        ctx.strokeStyle = colors.minorTick;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let major = startMajor; major <= endMajor; major++) {
          const majorPos = originPos + major * majorStep;
          for (let sub = 1; sub < 10; sub++) {
            const pos = majorPos + sub * minorStep;
            if (pos < 0 || pos > (horizontal ? width : height)) continue;
            // sub === 5 是中刻度，稍后单独绘制
            if (sub === 5) continue;
            if (horizontal) {
              ctx.moveTo(pos, height - minLen);
              ctx.lineTo(pos, height);
            } else {
              ctx.moveTo(width - minLen, pos);
              ctx.lineTo(width, pos);
            }
          }
        }
        ctx.stroke();

        // 中刻度（两个大刻度正中间）
        ctx.strokeStyle = colors.midTick;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let major = startMajor; major <= endMajor; major++) {
          const pos = originPos + major * majorStep + 5 * minorStep;
          if (pos < 0 || pos > (horizontal ? width : height)) continue;
          if (horizontal) {
            ctx.moveTo(pos, height - midLen);
            ctx.lineTo(pos, height);
          } else {
            ctx.moveTo(width - midLen, pos);
            ctx.lineTo(width, pos);
          }
        }
        ctx.stroke();
      }

      // --- 绘制大刻度（贯穿标尺全高）和标签 ---
      ctx.font = "10px sans-serif";

      for (let major = startMajor; major <= endMajor; major++) {
        const pos = originPos + major * majorStep;
        if (pos < -60 || pos > (horizontal ? width + 60 : height + 60))
          continue;

        const label = (major * MAJOR_STEP).toString();

        if (horizontal) {
          // 大刻度线（贯穿标尺全高）
          ctx.strokeStyle = colors.majorTick;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(pos, 0);
          ctx.lineTo(pos, height);
          ctx.stroke();

          // 标签：文字开始位置在大刻度右侧 3 像素处
          ctx.fillStyle = colors.label;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(label, pos + 3, 7);
        } else {
          // 大刻度线（贯穿标尺全宽）
          ctx.strokeStyle = colors.majorTick;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, pos);
          ctx.lineTo(width, pos);
          ctx.stroke();

          // 标签：文字结束位置在大刻度下方 3 像素处（旋转显示，自下而上阅读）
          ctx.save();
          ctx.translate(width - 12, pos + 3);
          ctx.rotate(-Math.PI / 2);
          ctx.fillStyle = colors.label;
          ctx.textAlign = "right";
          ctx.textBaseline = "middle";
          ctx.fillText(label, 0, 0);
          ctx.restore();
        }
      }
    };

    drawRuler(hCtx, hWidth, hHeight, true);
    drawRuler(vCtx, vWidth, vHeight, false);
    };

    draw();

    // 监听标尺容器尺寸变化，随页面大小自动重绘
    const resizeObserver = new ResizeObserver(() => {
      draw();
    });
    resizeObserver.observe(hCanvas);
    resizeObserver.observe(vCanvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, [zoom, translate, theme]);

  // 计算光标在屏幕上的位置（考虑缩放和平移）
  const screenMouseX = translate.tx + mousePos.x * zoom - 24;
  const screenMouseY = translate.ty + mousePos.y * zoom - 24;

  // 计算选择框在屏幕上的位置
  const screenSelX = selectionBBox
    ? translate.tx + selectionBBox.x * zoom - 24
    : 0;
  const screenSelY = selectionBBox
    ? translate.ty + selectionBBox.y * zoom - 24
    : 0;
  const screenSelW = selectionBBox ? selectionBBox.w * zoom : 0;
  const screenSelH = selectionBBox ? selectionBBox.h * zoom : 0;

  return (
    <>
      {/* 水平标尺 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 24,
          right: 0,
          height: 24,
          zIndex: 10,
          pointerEvents: "none",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <canvas ref={hRef} style={{ width: "100%", height: "100%" }} />
        {/* 光标指示线 */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: screenMouseX,
            width: 1,
            height: "100%",
            background: colors.indicator,
            zIndex: 20,
          }}
        />
        {/* 选择框指示 */}
        {selectionBBox && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: screenSelX,
              width: screenSelW,
              height: "100%",
              background: colors.selection,
              borderLeft: `1px solid ${colors.selectionBorder}`,
              borderRight: `1px solid ${colors.selectionBorder}`,
              zIndex: 15,
            }}
          />
        )}
      </div>
      {/* 垂直标尺 */}
      <div
        style={{
          position: "absolute",
          top: 24,
          left: 0,
          bottom: 0,
          width: 24,
          zIndex: 10,
          pointerEvents: "none",
          borderRight: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <canvas ref={vRef} style={{ width: "100%", height: "100%" }} />
        {/* 光标指示线 */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: screenMouseY,
            width: "100%",
            height: 1,
            background: colors.indicator,
            zIndex: 20,
          }}
        />
        {/* 选择框指示 */}
        {selectionBBox && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: screenSelY,
              height: screenSelH,
              width: "100%",
              background: colors.selection,
              borderTop: `1px solid ${colors.selectionBorder}`,
              borderBottom: `1px solid ${colors.selectionBorder}`,
              zIndex: 15,
            }}
          />
        )}
      </div>
      {/* 左上角交叉区域：与标尺背景一致的实心矩形 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 24,
          height: 24,
          zIndex: 11,
          background: colors.background,
          borderRight: "1px solid rgba(255, 255, 255, 0.1)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          // border: `1px solid ${colors.minorTick}`,
        }}
      >
        <svg
          className="icon"
          viewBox="0 0 1024 1024"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          p-id="10776"
          width="25"
          height="25"
          fill={colors.minorTick}
        >
          <path d="M887.156364 523.636364h-68.305455v-23.272728h68.305455v23.272728zM750.545455 523.636364h-68.305455v-23.272728h68.305455v23.272728z m-136.61091 0h-68.305454v-23.272728h68.305454v23.272728z m-136.610909 0h-68.305454v-23.272728h68.305454v23.272728z m-136.610909 0h-68.305454v-23.272728h68.305454v23.272728z m-136.610909 0h-68.305454v-23.272728h68.305454v23.272728zM523.636364 926.72h-23.272728v-81.454545h23.272728v81.454545z m0-149.76h-23.272728v-81.454545h23.272728v81.454545z m0-149.76h-23.272728v-81.454545h23.272728v81.454545z m0-149.76h-23.272728v-81.454545h23.272728v81.454545z m0-149.76h-23.272728v-81.454545h23.272728v81.454545z m0-149.76h-23.272728v-81.454545h23.272728v81.454545z"></path>
        </svg>
      </div>
    </>
  );
}
