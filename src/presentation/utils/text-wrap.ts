/**
 * 《孤城神机营》- CJK Chinese Typography & Text Wrap Utility
 * 
 * Solves Phaser 3's built-in basicWordWrap limitation where words are only split on ASCII spaces,
 * which causes Chinese descriptions to treat entire sentences as a single word and overflow horizontally.
 */

export interface MeasureOptions {
  fontSize?: number;
  context?: CanvasRenderingContext2D | null;
}

/**
 * Measures text pixel width using CanvasRenderingContext2D if available,
 * with a fallback font metric heuristic for headless/test environments.
 */
export function measureTextWidth(
  text: string,
  context?: CanvasRenderingContext2D | null,
  fontSize: number = 14
): number {
  if (context && typeof context.measureText === 'function') {
    const metrics = context.measureText(text);
    if (metrics && typeof metrics.width === 'number' && metrics.width > 0) {
      return metrics.width;
    }
  }

  // Heuristic metric: CJK char ~ 1.0em, ASCII / punctuation ~ 0.55em
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    width += code > 255 ? fontSize : fontSize * 0.55;
  }
  return width;
}

/**
 * Wraps text (supporting CJK characters, alphanumeric words, percentages, and punctuation)
 * so that no line exceeds maxWidth.
 */
export function wrapCJKText(
  text: string,
  maxWidth: number,
  options?: MeasureOptions | ((str: string) => number)
): string {
  if (!text) return '';

  const fontSize = (typeof options === 'object' && options?.fontSize) ? options.fontSize : 14;
  const measureFn: (str: string) => number =
    typeof options === 'function'
      ? options
      : (str: string) => measureTextWidth(str, options?.context, fontSize);

  const HANGING_PUNCT = /^[，。！？；：）》”、%]/;
  const lines: string[] = [];
  const paragraphs = text.split('\n');

  for (const para of paragraphs) {
    if (!para) {
      lines.push('');
      continue;
    }

    // Tokenize into alphanumeric/percentage groups, spaces, or individual characters
    const tokens = para.match(/[a-zA-Z0-9%+\-\.]+|\s|[^\s]/gu) || [];
    let currentLine = '';

    for (let idx = 0; idx < tokens.length; idx++) {
      const token = tokens[idx];
      if (token === ' ' && currentLine.length === 0) continue;
      const testLine = currentLine + token;
      const testWidth = measureFn(testLine);

      // Hanging punctuation: allow a trailing comma/period/percent if it fits within hanging tolerance
      const isHanging = HANGING_PUNCT.test(token);
      const hangingTolerance = fontSize * 0.9;

      if (testWidth <= maxWidth || (isHanging && testWidth <= maxWidth + hangingTolerance)) {
        currentLine = testLine;
      } else {
        if (currentLine.length > 0) {
          lines.push(currentLine.trimEnd());
          currentLine = (token === ' ') ? '' : token;
        } else {
          // Fallback if a single token is wider than maxWidth
          for (const char of token) {
            if (measureFn(currentLine + char) <= maxWidth) {
              currentLine += char;
            } else {
              if (currentLine.length > 0) lines.push(currentLine);
              currentLine = char;
            }
          }
        }
      }
    }

    if (currentLine.length > 0) {
      lines.push(currentLine.trimEnd());
    }
  }

  return lines.join('\n');
}
