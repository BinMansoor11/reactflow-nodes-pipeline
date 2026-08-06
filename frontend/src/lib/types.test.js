import { canConnect, ANY } from './types';

test('a type accepts itself', () => {
  expect(canConnect('Text', 'Text')).toBe(true);
  expect(canConnect('Number', 'Number')).toBe(true);
});

test('Number widens to Text, but Text does not narrow to Number', () => {
  expect(canConnect('Number', 'Text')).toBe(true);
  expect(canConnect('Text', 'Number')).toBe(false);
});

test('Any is compatible in both directions', () => {
  expect(canConnect(ANY, 'Number')).toBe(true);
  expect(canConnect('Text', ANY)).toBe(true);
  expect(canConnect(ANY, ANY)).toBe(true);
});

test('an untyped handle is unconstrained, not incompatible', () => {
  expect(canConnect(undefined, 'Number')).toBe(true);
  expect(canConnect('Text', undefined)).toBe(true);
});

test('an unknown target type only accepts itself', () => {
  expect(canConnect('File', 'File')).toBe(true);
  expect(canConnect('Text', 'File')).toBe(false);
});
