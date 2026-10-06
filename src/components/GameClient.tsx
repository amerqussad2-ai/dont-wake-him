"use client";

import dynamic from "next/dynamic";

// Phaser touches `window` on import, so it must never be loaded during SSR.
const PhaserGame = dynamic(() => import("@/components/PhaserGame"), {
  ssr: false,
});

export default function GameClient() {
  return <PhaserGame />;
}
