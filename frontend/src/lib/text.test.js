import { parseVariables, textNodeWidth, MIN_WIDTH, MAX_WIDTH } from './text';

describe('parseVariables', () => {
  test('finds a variable and tolerates surrounding whitespace', () => {
    expect(parseVariables('{{input}}')).toEqual(['input']);
    expect(parseVariables('{{  input  }}')).toEqual(['input']);
  });

  test('keeps first-appearance order and drops duplicates', () => {
    expect(parseVariables('{{b}} then {{a}} then {{b}}')).toEqual(['b', 'a']);
  });

  test('accepts the full identifier grammar', () => {
    expect(parseVariables('{{_x}} {{$y}} {{a1}} {{camelCase}}')).toEqual([
      '_x',
      '$y',
      'a1',
      'camelCase',
    ]);
  });

  test('rejects names that are not valid identifiers', () => {
    expect(parseVariables('{{1abc}}')).toEqual([]);
    expect(parseVariables('{{with space}}')).toEqual([]);
    expect(parseVariables('{{a-b}}')).toEqual([]);
    expect(parseVariables('{{}}')).toEqual([]);
  });

  test('rejects reserved words, which match the identifier pattern but are not usable', () => {
    expect(parseVariables('{{class}} {{for}} {{return}}')).toEqual([]);
  });

  test('ignores single braces and unclosed pairs', () => {
    expect(parseVariables('{input} and {{unclosed')).toEqual([]);
  });

  test('survives empty and missing input', () => {
    expect(parseVariables()).toEqual([]);
    expect(parseVariables('')).toEqual([]);
  });
});

describe('textNodeWidth', () => {
  test('short text sits at the minimum', () => {
    expect(textNodeWidth('hi')).toBe(MIN_WIDTH);
  });

  test('long text is capped at the maximum', () => {
    expect(textNodeWidth('x'.repeat(500))).toBe(MAX_WIDTH);
  });

  test('grows with the longest line, not the total length', () => {
    const oneLongLine = textNodeWidth('x'.repeat(60));
    const manyShortLines = textNodeWidth('xx\n'.repeat(60));

    expect(oneLongLine).toBeGreaterThan(manyShortLines);
    expect(manyShortLines).toBe(MIN_WIDTH);
  });

  test('is monotonic between the bounds', () => {
    expect(textNodeWidth('x'.repeat(50))).toBeGreaterThan(textNodeWidth('x'.repeat(40)));
  });
});
