// definitions.js
// Every node in the app. Adding one here is the whole job: it appears on the
// canvas, in the palette, and under its category tab with no other edits.
//
// Declaration order is tab order.
//
//   type        reactflow node type, and the registry key
//   category    derives the palette tab list
//   fields      form controls; `input: true` gives the row a left handle,
//               whose type is derived from the field's kind
//   inputs      left handles with no corresponding field: { key, type }
//   outputs     right handles: { key, type }; add a `description` to render
//               them as a list
//
// Handle types gate connections — see lib/types.js. `Any` connects to
// anything; Number widens to Text but not the reverse.
//
// Two keys take a function of the node's data rather than a literal, which is
// what lets a node vary at runtime without becoming a component:
//
//   width           number, or (data) => number
//   dynamicInputs   (data) => [{ key, type }]  — extra target handles

import { parseVariables, textNodeWidth } from '../lib/text';

export const definitions = [
  {
    type: 'customInput',
    label: 'Input',
    category: 'General',
    icon: 'IN',
    description: 'Pass data of different types into your workflow.',
    width: 240,
    fields: [
      {
        key: 'inputName',
        label: 'Name',
        kind: 'text',
        help: 'Referenced by downstream nodes.',
        default: (id) => id.replace('customInput-', 'input_'),
      },
      { key: 'inputType', label: 'Type', kind: 'select', options: ['Text', 'File'], default: 'Text' },
    ],
    // The user picks Text or File at runtime, so the output stays Any.
    outputs: [{ key: 'value', type: 'Any' }],
  },

  {
    type: 'customOutput',
    label: 'Output',
    category: 'General',
    icon: 'OUT',
    description: 'Return a result from your workflow.',
    width: 240,
    inputs: [{ key: 'value', type: 'Any' }],
    fields: [
      {
        key: 'outputName',
        label: 'Name',
        kind: 'text',
        default: (id) => id.replace('customOutput-', 'output_'),
      },
      { key: 'outputType', label: 'Type', kind: 'select', options: ['Text', 'Image'], default: 'Text' },
    ],
  },

  // Part 3 lives here, in config. The node resizes with its content and grows
  // a target handle per {{variable}} — both expressed as functions of its own
  // data, so it needs no component of its own.
  {
    type: 'text',
    label: 'Text',
    category: 'General',
    icon: 'TXT',
    description: 'Compose text, with variables from upstream nodes.',
    width: (data) => textNodeWidth(data?.text),
    dynamicInputs: (data) => parseVariables(data?.text).map((key) => ({ key, type: 'Text' })),
    fields: [
      {
        key: 'text',
        label: 'Text',
        kind: 'textarea',
        autosize: true,
        help: 'Type {{ variable }} to pull in an upstream value.',
        placeholder: 'e.g. Question: {{ input }}',
        default: '{{input}}',
      },
    ],
    outputs: [{ key: 'output', type: 'Text' }],
  },

  // Proves a node can have no I/O at all — the schema does not assume handles.
  {
    type: 'note',
    label: 'Note',
    category: 'General',
    icon: 'DOC',
    description: 'A comment for whoever reads this pipeline next.',
    width: 240,
    fields: [{ key: 'note', label: 'Note', kind: 'textarea', rows: 4, placeholder: 'Leave a note…' }],
  },

  {
    type: 'llm',
    label: 'LLM',
    category: 'LLMs',
    icon: 'AI',
    description: 'Run a prompt through a language model.',
    width: 340,
    fields: [
      {
        key: 'system',
        label: 'System (Instructions)',
        kind: 'textarea',
        help: 'Sets how the model should behave.',
        placeholder: 'Answer the question based on context in a professional manner.',
        input: true,
      },
      {
        key: 'prompt',
        label: 'Prompt',
        kind: 'textarea',
        placeholder: 'e.g. Question: {{ input }}',
        input: true,
      },
      {
        key: 'model',
        label: 'Model',
        kind: 'select',
        options: ['gpt-4o', 'claude-opus-4', 'gemini-2.5-pro'],
        default: 'gpt-4o',
      },
      { key: 'personalKey', label: 'Use Personal API Key', kind: 'toggle', default: false },
    ],
    outputs: [
      { key: 'response', type: 'Text', description: 'The response as a single string' },
      { key: 'tokens_used', type: 'Number', description: 'The number of tokens used' },
    ],
  },

  {
    type: 'filter',
    label: 'Filter',
    category: 'Logic',
    icon: 'FLT',
    description: 'Keep only the values that match a condition.',
    width: 260,
    inputs: [{ key: 'input', type: 'Any' }],
    fields: [
      {
        key: 'operator',
        label: 'Condition',
        kind: 'select',
        options: ['contains', 'equals', 'starts with', 'is empty'],
        default: 'contains',
      },
      { key: 'value', label: 'Value', kind: 'text', placeholder: 'Compare against…' },
    ],
    outputs: [{ key: 'output', type: 'Any' }],
  },

  // Proves branching: two source handles off one node.
  {
    type: 'condition',
    label: 'Condition',
    category: 'Logic',
    icon: 'IF',
    description: 'Route data down one of two paths.',
    width: 260,
    inputs: [{ key: 'input', type: 'Any' }],
    fields: [
      {
        key: 'expression',
        label: 'Expression',
        kind: 'text',
        help: 'Evaluated against the incoming value.',
        placeholder: 'e.g. score > 0.8',
      },
    ],
    outputs: [
      { key: 'true', type: 'Any', description: 'Taken when the expression holds' },
      { key: 'false', type: 'Any', description: 'Taken otherwise' },
    ],
  },

  {
    type: 'math',
    label: 'Math',
    category: 'Data Transformation',
    icon: 'FX',
    description: 'Combine two numeric inputs.',
    width: 260,
    inputs: [
      { key: 'a', type: 'Number' },
      { key: 'b', type: 'Number' },
    ],
    fields: [
      {
        key: 'operation',
        label: 'Operation',
        kind: 'select',
        options: ['add', 'subtract', 'multiply', 'divide'],
        default: 'add',
      },
      { key: 'precision', label: 'Decimal places', kind: 'number', min: 0, max: 10, default: 2 },
    ],
    outputs: [{ key: 'result', type: 'Number' }],
  },

  {
    type: 'apiRequest',
    label: 'API Request',
    category: 'Integrations',
    icon: 'API',
    description: 'Call an external HTTP endpoint.',
    width: 340,
    inputs: [{ key: 'trigger', type: 'Any' }],
    fields: [
      {
        key: 'method',
        label: 'Method',
        kind: 'select',
        options: ['GET', 'POST', 'PUT', 'DELETE'],
        default: 'GET',
      },
      { key: 'url', label: 'URL', kind: 'text', placeholder: 'https://api.example.com/v1/items' },
      { key: 'body', label: 'Body', kind: 'textarea', help: 'Sent as JSON.', placeholder: '{ }' },
    ],
    outputs: [
      { key: 'response', type: 'Text', description: 'The raw response body' },
      { key: 'status', type: 'Number', description: 'The HTTP status code' },
    ],
  },
];
