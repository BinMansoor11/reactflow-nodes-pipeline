// ResultDialog.js
// The brief asks for a "user-friendly alert". window.alert cannot show three
// values legibly, cannot show a loading state, and cannot be styled — so this
// is a dialog. It renders whatever the submit flow is currently doing and owns
// none of that state itself.

import { useEffect } from 'react';

const Stat = ({ label, value }) => (
  <div className="flex-1 rounded-lg border border-edge-muted px-3 py-2 text-center">
    <div className="text-2xl font-semibold text-ink">{value}</div>
    <div className="text-[11px] uppercase tracking-wide text-ink-muted">{label}</div>
  </div>
);

const Verdict = ({ isDag }) => (
  <div
    className={`flex items-start gap-2 rounded-lg px-3 py-2 text-[12px] ${
      isDag ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'
    }`}
  >
    <span aria-hidden="true" className="text-[14px] leading-none">
      {isDag ? '✓' : '!'}
    </span>
    <span>
      {isDag ? (
        <>
          This pipeline <strong>is a DAG</strong> — every path runs forward, with no cycles.
        </>
      ) : (
        <>
          This pipeline <strong>is not a DAG</strong> — some nodes feed back into each other, so it
          has no valid execution order.
        </>
      )}
    </span>
  </div>
);

export const ResultDialog = ({ status, result, error, onClose }) => {
  const dismissible = status !== 'loading';

  useEffect(() => {
    if (!dismissible) return undefined;

    const onKeyDown = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [dismissible, onClose]);

  if (status === 'idle') return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4"
      onClick={() => dismissible && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pipeline result"
        className="w-full max-w-sm rounded-node border border-edge bg-white p-4 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        {status === 'loading' && (
          <p className="py-6 text-center text-[13px] text-ink-muted">Parsing pipeline…</p>
        )}

        {status === 'error' && (
          <>
            <h2 className="mb-2 text-[14px] font-semibold text-ink">Could not parse pipeline</h2>
            <p className="mb-4 text-[12px] leading-relaxed text-ink-muted">{error}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <h2 className="mb-3 text-[14px] font-semibold text-accent">Pipeline parsed</h2>
            <div className="mb-3 flex gap-2">
              <Stat label="Nodes" value={result.num_nodes} />
              <Stat label="Edges" value={result.num_edges} />
            </div>
            <Verdict isDag={result.is_dag} />
          </>
        )}

        {dismissible && (
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-md bg-accent-strong py-2 text-[13px] font-medium text-white transition-colors hover:bg-accent"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
};
