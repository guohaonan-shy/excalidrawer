export {
  setSeed,
  base,
  rect,
  diamond,
  ellipse,
  textEl,
  box,
  diamondBox,
  arrow,
  row,
  grid,
  colors,
  excalidraw,
} from "./elements.mjs";

export { toSvg, toPng, registerFonts, autoRegisterCjkFont } from "./export.mjs";

export { estimateTextWidth, wrapText, lineCount, textHeight, fitBoundText } from "./text.mjs";

// Layout helpers (0.6.0+): pure coordinate math, no element creation.
export {
  gridLayout,
  chooseGrid,
  chain,
  swimlane,
  hubSpoke,
  edgePoint,
  routeU,
  labelAnchor,
  fitContainer,
  titledBox,
  contrastText,
  triplet,
} from "./layout.mjs";

// Fixed-size output geometry: fit content into a target canvas (0.6.0+).
export { normalizeCanvas, resolveCanvas, contentBounds, CanvasError } from "./canvas.mjs";

// Serializer: sugar/raw elements → output formats (0.5.6+).
export { render, validateElements, ElementValidationError, VALID_FORMATS } from "./render.mjs";

// Deterministic quality linter: geometry warnings (overflow / overlap / arrows).
export { validate } from "./validate.mjs";

// Sugar translation: shorthand → raw elements (0.5.7+).
export { desugar, SugarError } from "./sugar.mjs";

// Built-in templates
export { timeline, flowchart, architecture, sequence } from "./templates/index.mjs";
