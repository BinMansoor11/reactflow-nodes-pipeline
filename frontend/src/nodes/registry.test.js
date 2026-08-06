// Guards the registry's invariants. A duplicate `type` or a category that
// silently reorders would not throw — the node would just quietly go missing
// from the canvas or the tabs.

import { definitions } from './definitions';
import { byType, categories, definitionsIn, handleTypeOf, initialData } from './registry';

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

describe('handleTypeOf', () => {
  const node = (id, type, data = {}) => ({ id, type, data });

  test('reads a declared output type', () => {
    expect(handleTypeOf(node('llm-1', 'llm'), 'llm-1-response')).toBe('Text');
    expect(handleTypeOf(node('llm-1', 'llm'), 'llm-1-tokens_used')).toBe('Number');
  });

  test('reads a declared bare input type', () => {
    expect(handleTypeOf(node('math-1', 'math'), 'math-1-a')).toBe('Number');
  });

  test('derives a field-bound handle type from the field kind', () => {
    expect(handleTypeOf(node('llm-1', 'llm'), 'llm-1-prompt')).toBe('Text');
  });

  test('resolves dynamic handles from the node data', () => {
    const textNode = node('text-1', 'text', { text: '{{ topic }}' });

    expect(handleTypeOf(textNode, 'text-1-topic')).toBe('Text');
    expect(handleTypeOf(textNode, 'text-1-absent')).toBeUndefined();
  });

  test('handles ids containing a hyphen in the node id', () => {
    // ids are `${nodeId}-${key}`, and nodeIds contain a hyphen themselves.
    expect(handleTypeOf(node('customInput-1', 'customInput'), 'customInput-1-value')).toBe('Any');
  });

  test('returns undefined for an unknown node or handle', () => {
    expect(handleTypeOf(undefined, 'llm-1-response')).toBeUndefined();
    expect(handleTypeOf(node('note-1', 'note'), 'note-1-nope')).toBeUndefined();
  });
});

test('every declared handle has a type', () => {
  definitions.forEach((definition) => {
    [...(definition.inputs ?? []), ...(definition.outputs ?? [])].forEach((handle) => {
      expect(handle.type).toBeDefined();
    });
  });
});

test('fields declare a kind that a field component implements', () => {
  const { FIELDS } = require('./fields');

  definitions
    .flatMap((d) => d.fields ?? [])
    .forEach((field) => expect(FIELDS[field.kind]).toBeDefined());
});
