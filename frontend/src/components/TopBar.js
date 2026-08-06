// TopBar.js
// Breadcrumb, a live count of what is on the canvas, and the primary action.

import { shallow } from 'zustand/shallow';
import { useStore } from '../store';
import { SubmitButton } from '../submit';

const selector = (state) => ({ nodes: state.nodes.length, edges: state.edges.length });

export const TopBar = () => {
  const { nodes, edges } = useStore(selector, shallow);

  return (
    <header className="flex items-center justify-between border-b border-edge-muted bg-white px-4 py-2.5">
      <div className="flex items-center gap-1.5 text-[13px]">
        <span className="text-ink-muted">Pipelines</span>
        <span className="text-ink-muted/60">/</span>
        <span className="font-medium text-ink">Untitled Pipeline</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-[12px] tabular-nums text-ink-muted">
          {nodes} {nodes === 1 ? 'node' : 'nodes'} · {edges} {edges === 1 ? 'edge' : 'edges'}
        </span>
        <SubmitButton />
      </div>
    </header>
  );
};
