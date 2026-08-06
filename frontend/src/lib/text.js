// text.js
// The two derivations the Text node needs: which variables its content
// declares, and how wide the card should be to show it.

// A valid JS identifier inside double braces, with optional surrounding
// whitespace: {{ input }}, {{input}}.
const VARIABLE = /\{\{\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*\}\}/g;

// Reserved words match the identifier pattern but are not valid variable
// names, so {{ class }} should not produce a handle.
const RESERVED = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally',
  'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'null',
  'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof',
  'var', 'void', 'while', 'with', 'yield',
]);

// Order matters: handles are laid out in the order variables first appear, so
// the list reads the way the text does.
export const parseVariables = (text = '') => {
  const names = [];

  for (const [, name] of String(text).matchAll(VARIABLE)) {
    if (!RESERVED.has(name) && !names.includes(name)) {
      names.push(name);
    }
  }

  return names;
};

export const MIN_WIDTH = 280;
export const MAX_WIDTH = 520;

const CHAR_PX = 7; // ~13px system sans
const CHROME_PX = 44; // card padding + control padding + borders

// The longest line drives the width. The card widens until it reaches the cap,
// after which the textarea wraps and grows in height instead.
export const textNodeWidth = (text = '') => {
  const longest = String(text)
    .split('\n')
    .reduce((max, line) => Math.max(max, line.length), 0);

  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, longest * CHAR_PX + CHROME_PX));
};
