// submit.js
// Owns the request lifecycle. The call itself lives in lib/api.js and the
// presentation in components/ResultDialog.

import { useCallback, useState } from 'react';
import { useStore } from './store';
import { parsePipeline } from './lib/api';
import { ResultDialog } from './components/ResultDialog';

export const SubmitButton = () => {
  const [state, setState] = useState({ status: 'idle', result: null, error: null });

  const onSubmit = useCallback(async () => {
    setState({ status: 'loading', result: null, error: null });

    // Read at submit time rather than subscribing, so this component does not
    // re-render on every node drag.
    const { nodes, edges } = useStore.getState();

    try {
      const result = await parsePipeline({ nodes, edges });
      setState({ status: 'success', result, error: null });
    } catch (error) {
      setState({ status: 'error', result: null, error: error.message });
    }
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={onSubmit}
        disabled={state.status === 'loading'}
        className="rounded-md bg-accent-strong px-4 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {state.status === 'loading' ? 'Parsing…' : 'Submit'}
      </button>

      <ResultDialog
        status={state.status}
        result={state.result}
        error={state.error}
        onClose={() => setState({ status: 'idle', result: null, error: null })}
      />
    </>
  );
};
