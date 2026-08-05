// registry.js
// The single source of truth shared by the canvas and the palette. Everything
// here is derived from definitions.js, so nothing has to be listed twice.

import { BaseNode } from './BaseNode';
import { definitions } from './definitions';

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
