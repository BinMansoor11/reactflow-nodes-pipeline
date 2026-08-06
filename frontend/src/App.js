import { TopBar } from './components/TopBar';
import { NodePalette } from './components/NodePalette';
import { PipelineUI } from './ui';

// A fixed-height column: chrome takes what it needs, the canvas takes the
// rest. Nothing on the page scrolls, so the canvas is the only thing that
// pans — previously the palette pushed the submit button below the fold.
function App() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <TopBar />
      <NodePalette />
      <main className="min-h-0 flex-1">
        <PipelineUI />
      </main>
    </div>
  );
}

export default App;
