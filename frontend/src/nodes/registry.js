// registry.js
// The single source of truth shared by the canvas and the palette. Everything
// here is derived from definitions.js, so nothing has to be listed twice.

import { BaseNode } from './BaseNode';
import { definitions } from './definitions';
import { FIELD_TYPES } from './fields';
import { ANY } from '../lib/types';

const wrap = (config) => {
  const Node = (props) => <BaseNode {...props} config={config} />;
  Node.displayName = `${config.type}Node`;
  return Node;
};

export const byType = Object.fromEntries(definitions.map((d) => [d.type, d]));

// Built once at module scope: reactflow warns if nodeTypes changes identity
// between renders.
export const nodeTypes = Object.fromEntries(definitions.map((d) => [d.type, wrap(d)]));

// Tab order is definition order.
export const categories = [...new Set(definitions.map((d) => d.category))];

export const definitionsIn = (category) => definitions.filter((d) => d.category === category);

// Resolves what a handle carries, given the node it belongs to. Handle ids are
// `${nodeId}-${key}`, so the key is whatever follows the node's own id.
//
// Returns undefined for a handle that does not exist, which lib/types treats as
// unconstrained rather than incompatible.
export const handleTypeOf = (node, handleId) => {
  const config = node && byType[node.type];
  if (!config || !handleId) return undefined;

  const key = handleId.slice(node.id.length + 1);

  const output = (config.outputs ?? []).find((candidate) => candidate.key === key);
  if (output) return output.type ?? ANY;

  const input = (config.inputs ?? []).find((candidate) => candidate.key === key);
  if (input) return input.type ?? ANY;

  // A field-bound handle takes its type from the field's kind, so no
  // definition restates what the kind already implies.
  const field = (config.fields ?? []).find((candidate) => candidate.key === key && candidate.input);
  if (field) return FIELD_TYPES[field.kind] ?? ANY;

  const dynamic = config.dynamicInputs?.(node.data) ?? [];
  return dynamic.find((candidate) => candidate.key === key)?.type;
};

// Seeds a new node's data from its field defaults, so a node carries real
// values from the moment it lands on the canvas rather than after first edit.
export const initialData = (type, id) => {
  const data = { id, nodeType: type };

  for (const field of byType[type].fields ?? []) {
    if (field.default !== undefined) {
      data[field.key] = typeof field.default === 'function' ? field.default(id) : field.default;
    }
  }

  return data;
};
