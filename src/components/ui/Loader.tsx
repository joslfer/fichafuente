import React from "react";

// Loader animado estilo loader--9
export function Loader({ className = "" }: { className?: string }) {
  return (
    <div className={`loader loader--9 ${className}`}></div>
  );
}
