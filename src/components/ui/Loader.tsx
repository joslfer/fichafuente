import React from "react";

// Loader animado estilo loader--9
export function Loader({ className = "" }: { className?: string }) {
  return (
    <i className={`loader loader--6 ${className}`}></i>
  );
}
