// toolbar.js
// Palette. Both the category list and the tiles come from the node registry,
// so a new definition shows up here without this file being touched.
//
// Styling is deliberately plain for now — the tabbed chrome lands in Part 2.

import { DraggableNode } from './draggableNode';
import { categories, definitionsIn } from './nodes/registry';

export const PipelineToolbar = () => {
  return (
    <div className="border-b border-edge-muted bg-white px-4 py-3">
      {categories.map((category) => (
        <div key={category} className="mb-3 last:mb-0">
          <h2 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
            {category}
          </h2>
          <div className="flex flex-wrap gap-2">
            {definitionsIn(category).map((definition) => (
              <DraggableNode
                key={definition.type}
                type={definition.type}
                label={definition.label}
                icon={definition.icon}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
