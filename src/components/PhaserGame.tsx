"use client";

import { useEffect, useRef } from "react";

import { createGame } from "@/game/createGame";

/** Mounts the Phaser game into a container div and destroys it on unmount. */
export default function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const game = createGame(container);
    return () => {
      game.destroy(true);
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full" />;
}
