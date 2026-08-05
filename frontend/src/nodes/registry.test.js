// Guards the registry's invariants. A duplicate `type` or a category that
// silently reorders would not throw — the node would just quietly go missing
// from the canvas or the tabs.

import { definitions } from './definitions';
import { byType, categories, definitionsIn, initialData } from './registry';

test('node types are unique', () => {
  const types = definitions.map((d) => d.type);
  expect(new Set(types).size).toBe(types.length);
});

test('every definition is reachable by type', () => {
  definitions.forEach((d) => expect(byType[d.type]).toBe(d));
});

test('categories derive in declaration order, without duplicates', () => {
  expect(categories).toEqual(['General', 'LLMs', 'Logic', 'Data Transformation', 'Integrations']);
});

test('every definition appears under exactly one category', () => {
  const listed = categories.flatMap((c) => definitionsIn(c));
  expect(listed).toHaveLength(definitions.length);
});

test('initialData seeds every field that declares a default', () => {
  const data = initialData('llm', 'llm-1');

  expect(data).toMatchObject({ id: 'llm-1', nodeType: 'llm', model: 'gpt-4o', personalKey: false });
});

test('function defaults receive the node id', () => {
  expect(initialData('customInput', 'customInput-1').inputName).toBe('input_1');
});

test('fields declare a kind that a field component implements', () => {
  const { FIELDS } = require('./fields');

  definitions
    .flatMap((d) => d.fields ?? [])
    .forEach((field) => expect(FIELDS[field.kind]).toBeDefined());
});
