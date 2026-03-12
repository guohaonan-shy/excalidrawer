/**
 * Shared text measurement and wrapping utilities.
 *
 * Width estimation heuristic: CJK characters ≈ fontSize wide,
 * ASCII characters ≈ 0.62 × fontSize (matches Excalifont metrics).
 */

// CJK ranges: CJK Unified Ideographs, CJK Ext-A/B, CJK Compatibility,
// Hiragana, Katakana, Hangul, fullwidth forms, etc.
function isCJK(code) {
  return code > 0x2e7f;
}

/**
 * Estimate rendered width of a single line of text.
 * @param {string} text  - single-line text (no \n)
 * @param {number} fontSize
 * @returns {number} estimated pixel width
 */
export function estimateTextWidth(text, fontSize) {
  let w = 0;
  for (const ch of text) {
    w += isCJK(ch.codePointAt(0)) ? fontSize : fontSize * 0.62;
  }
  return Math.ceil(w);
}

/**
 * Wrap text to fit within maxWidth pixels.
 * Preserves existing \n line breaks. For ASCII text, breaks at word
 * boundaries (spaces / hyphens). For CJK text, breaks at character level.
 *
 * @param {string} text      - input text (may contain \n)
 * @param {number} maxWidth  - maximum line width in pixels
 * @param {number} fontSize  - font size for width estimation
 * @returns {string} text with \n inserted at wrap points
 */
export function wrapText(text, maxWidth, fontSize) {
  if (!text) return "";
  // Process each existing line independently
  return text
    .split("\n")
    .map((line) => wrapLine(line, maxWidth, fontSize))
    .join("\n");
}

/**
 * Wrap a single line (no existing \n).
 */
function wrapLine(line, maxWidth, fontSize) {
  if (!line) return "";
  if (estimateTextWidth(line, fontSize) <= maxWidth) return line;

  const result = [];
  let current = "";
  let currentW = 0;

  // Tokenize: split into runs of CJK chars and non-CJK words
  const tokens = tokenize(line);

  for (const token of tokens) {
    const tokenW = estimateTextWidth(token, fontSize);

    if (token === " ") {
      // Space: add if it fits, otherwise start new line
      if (currentW + tokenW <= maxWidth) {
        current += " ";
        currentW += tokenW;
      } else {
        result.push(current);
        current = "";
        currentW = 0;
      }
      continue;
    }

    // CJK single character — allow char-level breaking
    if (token.length === 1 && isCJK(token.codePointAt(0))) {
      if (currentW + tokenW > maxWidth && current) {
        result.push(current);
        current = "";
        currentW = 0;
      }
      current += token;
      currentW += tokenW;
      continue;
    }

    // ASCII word
    if (currentW + tokenW <= maxWidth) {
      current += token;
      currentW += tokenW;
    } else if (current) {
      result.push(current);
      current = token;
      currentW = tokenW;
    } else {
      // Single word wider than maxWidth — keep it on its own line
      current = token;
      currentW = tokenW;
    }
  }

  if (current) result.push(current);
  return result.join("\n");
}

/**
 * Tokenize text into an array of:
 * - individual CJK characters
 * - ASCII word runs (consecutive non-space, non-CJK)
 * - spaces
 */
function tokenize(text) {
  const tokens = [];
  let word = "";

  for (const ch of text) {
    const code = ch.codePointAt(0);

    if (ch === " ") {
      if (word) { tokens.push(word); word = ""; }
      tokens.push(" ");
    } else if (isCJK(code)) {
      if (word) { tokens.push(word); word = ""; }
      tokens.push(ch);
    } else {
      word += ch;
    }
  }
  if (word) tokens.push(word);
  return tokens;
}

/**
 * Count lines in text (after wrapping).
 * @param {string} text
 * @returns {number}
 */
export function lineCount(text) {
  if (!text) return 1;
  return text.split("\n").length;
}

/**
 * Compute required container height for (possibly multi-line) text.
 * @param {string} text          - text with \n for line breaks
 * @param {number} fontSize
 * @param {number} [padding=20]  - total vertical padding
 * @returns {number}
 */
export function textHeight(text, fontSize, padding = 20) {
  const lines = lineCount(text);
  return Math.ceil(lines * fontSize * 1.4 + padding);
}
