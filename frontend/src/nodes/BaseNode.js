// BaseNode.js
// Renders every node on the canvas. A node's appearance and its handles are
// both derived from its config object — see definitions.js.
//
// Handle placement is the reason this file exists. Left handles come from
// fields marked `input: true` (aligned to that field's row) or from a bare
// `inputs` list (spread evenly down the card). Right handles come from
// `outputs`. Nothing declares a pixel position, so adding a field can never
// leave a handle pointing at the wrong row.

import { useMemo } from 'react';
import { Handle, Position, useStore as useFlowStore } from 'reactflow';
import { useStore } from '../store';
import { FIELDS, BADGES } from './fields';

// Offsets a handle onto the card's border. Field rows are inset by the card's
// 12px padding; the bare-handle wrappers already sit on the border.
const ROW_OFFSET = -17;
const EDGE_OFFSET = -5;

const HelpDot = ({ text }) => (
  <span
    title={text}
    className="ml-1 inline-flex h-3 w-3 cursor-help items-center justify-center rounded-full border border-ink-muted/50 text-[8px] leading-none text-ink-muted"
  >
    ?
  </span>
);

const Badge = ({ children }) => (
  <span className="rounded bg-accent-tint px-1.5 py-0.5 text-[10px] font-medium text-accent">
    {children}
  </span>
);

export const BaseNode = ({ id, data, selected, config }) => {
  const updateNodeField = useStore((state) => state.updateNodeField);
  const set = (key) => (value) => updateNodeField(id, key, value);

  // Which of this node's handles already have an edge. The selector returns a
  // joined string rather than a Set so zustand's default equality check works
  // and the node only re-renders when its own connections change.
  const connectedKey = useStore((state) => {
    const ids = [];

    for (const edge of state.edges) {
      if (edge.source === id && edge.sourceHandle) ids.push(edge.sourceHandle);
      if (edge.target === id && edge.targetHandle) ids.push(edge.targetHandle);
    }

    return ids.sort().join('|');
  });

  const connected = useMemo(
    () => new Set(connectedKey ? connectedKey.split('|') : []),
    [connectedKey]
  );

  // 'source' while a connection is being dragged from a source handle,
  // 'target' from a target handle, null otherwise. Drives which handles recede
  // and which stand out — see the [data-connecting] rules in index.css.
  const connecting = useFlowStore((state) => state.connectionHandleType);

  // ponytail: connections are validated structurally only — any output may be
  // wired to any input. Type checking wants a `type` on every handle plus
  // isValidConnection here; the red/green handle states are already wired for
  // it. See notes/bonus-ideas.md.
  const handleClass = (handleId) =>
    connected.has(handleId) ? 'node-handle node-handle--connected' : 'node-handle';

  const { fields = [], inputs = [], outputs = [] } = config;

  // Outputs render as a described list only when they have descriptions to
  // show; otherwise they are bare handles on the right edge.
  const listOutputs = outputs.some((output) => output.description);

  return (
    <div
      className={`relative rounded-node bg-white shadow-node transition-colors ${
        selected ? 'border-2 border-accent' : 'border border-edge'
      }`}
      style={{ width: config.width ?? 240 }}
      data-connecting={connecting ?? undefined}
    >
      {/* Bare left handles, spread evenly down the card. Unlike field-bound
          handles these have no row to name them, so each carries a label
          outside the card. */}
      {inputs.map((input, index) => (
        <div
          key={input}
          className="absolute left-0 -translate-y-1/2"
          style={{ top: `${((index + 1) / (inputs.length + 1)) * 100}%` }}
        >
          <span className="absolute right-2 top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] leading-none text-ink-muted">
            {input}
          </span>
          <Handle
            type="target"
            position={Position.Left}
            id={`${id}-${input}`}
            className={handleClass(`${id}-${input}`)}
            style={{ left: EDGE_OFFSET, top: 0 }}
            title={input}
          />
        </div>
      ))}

      <header className="flex items-center gap-2 px-3 pt-3">
        <span className="flex h-5 min-w-[26px] items-center justify-center rounded bg-accent-tint px-1 text-[9px] font-bold tracking-wide text-accent">
          {config.icon}
        </span>
        <h3 className="text-[13px] font-semibold text-accent">{config.label}</h3>
      </header>

      {config.description && (
        <p className="px-3 pt-1 text-[11px] leading-snug text-ink-muted">{config.description}</p>
      )}

      <div className="px-3 pt-2">
        <span className="block rounded bg-accent-tint py-1 text-center text-[11px] text-accent">
          {id}
        </span>
      </div>

      {fields.length > 0 && (
        <div className="space-y-2.5 p-3">
          {fields.map((field) => {
            const Field = FIELDS[field.kind];
            const badge = BADGES[field.kind];

            return (
              <div key={field.key} className="relative">
                {field.input && (
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={`${id}-${field.key}`}
                    className={handleClass(`${id}-${field.key}`)}
                    style={{ left: ROW_OFFSET, top: '50%' }}
                    title={field.label}
                  />
                )}

                {field.kind !== 'toggle' && (
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-[12px] text-ink">
                      {field.label}
                      {field.help && <HelpDot text={field.help} />}
                    </span>
                    {badge && <Badge>{badge}</Badge>}
                  </div>
                )}

                <Field field={field} value={data?.[field.key]} onChange={set(field.key)} />
              </div>
            );
          })}
        </div>
      )}

      {listOutputs ? (
        <div className="border-t border-edge-muted px-3 py-2">
          <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-ink">
            <span>Output Fields</span>
            <span>Type</span>
          </div>
          {outputs.map((output) => (
            <div key={output.key} className="relative py-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-accent">{output.key}</span>
                {output.type && <Badge>{output.type}</Badge>}
              </div>
              {output.description && (
                <p className="text-[11px] leading-snug text-ink-muted">{output.description}</p>
              )}
              <Handle
                type="source"
                position={Position.Right}
                id={`${id}-${output.key}`}
                className={handleClass(`${id}-${output.key}`)}
                style={{ right: ROW_OFFSET, top: '50%' }}
                title={output.key}
              />
            </div>
          ))}
        </div>
      ) : (
        outputs.map((output, index) => (
          <Handle
            key={output.key}
            type="source"
            position={Position.Right}
            id={`${id}-${output.key}`}
            className={handleClass(`${id}-${output.key}`)}
            style={{ top: `${((index + 1) / (outputs.length + 1)) * 100}%` }}
            title={output.key}
          />
        ))
      )}
    </div>
  );
};
