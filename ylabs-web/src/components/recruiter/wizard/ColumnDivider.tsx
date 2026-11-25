import React, { useRef } from "react";

export function ColumnDivider({
  dividerIndex,
  leftRatio,
  onDrag,
}: {
  dividerIndex: 1 | 2;
  leftRatio: number;
  onDrag: (index: 1 | 2, clientX: number, containerWidth: number) => void;
}) {
  const isDraggingRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const parent = (e.currentTarget as HTMLElement).parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    onDrag(dividerIndex, e.clientX - rect.left, rect.width);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize column ${dividerIndex}`}
      tabIndex={0}
      data-rz={dividerIndex}
      className="rz"
      style={{ left: `${leftRatio * 100}%` }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
