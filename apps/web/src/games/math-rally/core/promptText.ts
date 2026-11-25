import type { MathRallyQuestion } from './shared';

/** Prompt text from kind and operands (slot meanings: packages/shared/src/math-rally/v1/questions.ts). */
const MINUS = '\u2212';
const TIMES = '\u00d7';
const DIVIDE = '\u00f7';

function n(v: number): string {
  return v < 0 ? `(${MINUS}${-v})` : String(v);
}

function plain(v: number): string {
  return v < 0 ? `${MINUS}${-v}` : String(v);
}

const SUPERSCRIPT: Record<string, string> = { '0': '\u2070', '1': '\u00b9', '2': '\u00b2', '3': '\u00b3', '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079' };

export function promptText(q: Pick<MathRallyQuestion, 'kind' | 'operands'>): string {
  const o = q.operands;
  const [a = 0, b = 0, c = 0, d = 0] = o;
  switch (q.kind) {
    case 'add':
      return `${a} + ${b} = ?`;
    case 'sub':
      return `${a} ${MINUS} ${b} = ?`;
    case 'mul':
      return `${a} ${TIMES} ${b} = ?`;
    case 'div':
      return `${a} ${DIVIDE} ${b} = ?`;
    case 'twoStep':
      return [
        `${b} + ${c} ${TIMES} ${d} = ?`,
        `${b} ${TIMES} ${c} ${MINUS} ${d} = ?`,
        `(${b} + ${c}) ${TIMES} ${d} = ?`,
        `${b} ${MINUS} ${c} ${TIMES} ${d} = ?`,
      ][a] as string;
    case 'fractionOf':
      return `${a}/${b} of ${c} = ?`;
    case 'percentOf':
    case 'percentOfAny':
      return `${a}% of ${b} = ?`;
    case 'square':
      return `${a}\u00b2 = ?`;
    case 'negArith':
      return `${plain(b)} ${['+', MINUS, TIMES, DIVIDE][a]} ${n(c)} = ?`;
    case 'fracAdd':
      return `${a}/${b} + ${c}/${d} = ?`;
    case 'power':
      return `${a}${String(b).split('').map((x) => SUPERSCRIPT[x]).join('')} = ?`;
    case 'sqrt':
      return `\u221a${a} = ?`;
    case 'equation':
      return [`x + ${b} = ${plain(c)}`, `x ${MINUS} ${b} = ${plain(c)}`, `${b}x = ${plain(c)}`][a] + ', x = ?';
  }
}

/** Options as shown on signs and chips (real minus sign). */
export function optionText(option: string): string {
  return option.replace(/^-/, MINUS);
}
