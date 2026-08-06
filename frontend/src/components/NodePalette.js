// NodePalette.js
// Search, category tabs, and the tile row. Every part of this is derived from
// the node registry — the tab list is `categories`, the tiles are the
// definitions in the active category. Adding a node to definitions.js puts it
// here, and a node in a new category creates that tab, with no edit to this
// file.

import { useState } from 'react';
import { DraggableNode } from './DraggableNode';
import { categories, definitionsIn } from '../nodes/registry';
import { definitions } from '../nodes/definitions';

export const NodePalette = () => {
  const [active, setActive] = useState(categories[0]);
  const [query, setQuery] = useState('');

  const search = query.trim().toLowerCase();

  // Searching looks across every category, since a name you half-remember is
  // rarely one you can also place in the right tab.
  const visible = search
    ? definitions.filter((definition) => definition.label.toLowerCase().includes(search))
    : definitionsIn(active);

  return (
    <div className="border-b border-edge-muted bg-white">
      <div className="flex items-center gap-4 px-4">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search nodes"
          aria-label="Search nodes"
          className="my-2 w-48 shrink-0 rounded-md border border-edge-muted px-2.5 py-1.5 text-[12px] text-ink outline-none transition-colors placeholder:text-ink-muted focus:border-accent"
        />

        <nav className="flex min-w-0 flex-1 gap-1 overflow-x-auto" aria-label="Node categories">
          {categories.map((category) => {
            const isActive = !search && category === active;

            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setQuery('');
                  setActive(category);
                }}
                aria-current={isActive ? 'true' : undefined}
                className={`whitespace-nowrap border-b-2 px-2 py-2.5 text-[12px] transition-colors ${
                  isActive
                    ? 'border-accent font-medium text-accent'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {category}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 pb-3 pt-1">
        {visible.length > 0 ? (
          visible.map((definition) => (
            <DraggableNode
              key={definition.type}
              type={definition.type}
              label={definition.label}
              icon={definition.icon}
            />
          ))
        ) : (
          <p className="py-5 text-[12px] text-ink-muted">No nodes match “{query.trim()}”.</p>
        )}
      </div>
    </div>
  );
};
