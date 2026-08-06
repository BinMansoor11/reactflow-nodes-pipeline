// DraggableNode.js
// A palette tile. Drag data is the node type; the canvas looks the rest up in
// the registry when it lands.

export const DraggableNode = ({ type, label, icon }) => {
  const onDragStart = (event) => {
    event.target.style.cursor = 'grabbing';
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ nodeType: type }));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="flex h-16 w-[72px] shrink-0 cursor-grab flex-col items-center justify-center gap-1.5 rounded-lg border border-edge-muted bg-white transition-colors hover:border-accent hover:bg-accent-tint"
      onDragStart={onDragStart}
      onDragEnd={(event) => (event.target.style.cursor = 'grab')}
      draggable
      title={`Drag ${label} onto the canvas`}
    >
      <span className="flex h-5 min-w-[26px] items-center justify-center rounded bg-accent-tint px-1 text-[9px] font-bold tracking-wide text-accent">
        {icon}
      </span>
      <span className="text-[11px] leading-none text-ink">{label}</span>
    </div>
  );
};
