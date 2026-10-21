"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Load the game engine only when a player starts. This keeps the title screen
// responsive and gives every play session a clear beginning.
const PhaserGame = dynamic(() => import("@/components/PhaserGame"), {
  ssr: false,
  loading: () => <div className="loading-game" role="status">SETTING THE SCENE<span>...</span></div>,
});

export default function GameClient() {
  const [started, setStarted] = useState(false);

  if (started) {
    return (
      <div className="playing-shell">
        <PhaserGame />
      </div>
    );
  }

  return (
    <section className="intro-shell" aria-labelledby="game-title">
      <div className="intro-stars" aria-hidden="true" />
      <header className="intro-header">
        <div className="brand-mark"><span className="brand-moon" aria-hidden="true">☾</span><span>DON&apos;T WAKE <b>HIM</b></span></div>
        <div className="header-tag"><span className="status-dot"/> THE BEDROOM · EPISODE 01</div>
      </header>

      <div className="intro-content">
        <div className="intro-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> THE QUIETEST CHAOS EVER</div>
          <h1 id="game-title">DON&apos;T<br />WAKE<br /><em>HIM<span className="period">.</span></em></h1>
          <p className="intro-lead">Three mischievous missions. One very light sleeper. <strong>How much trouble can you make without making a sound?</strong></p>
          <div className="intro-actions">
            <button type="button" className="start-button" onClick={() => setStarted(true)}>
              <span className="play-symbol" aria-hidden="true">▶</span><span>LET&apos;S SNEAK</span><span className="start-arrow" aria-hidden="true">↗</span>
            </button>
            <div className="start-side-note"><span className="note-wave" aria-hidden="true">◖◗</span> SOUND ON FOR<br /> THE BEST EXPERIENCE</div>
          </div>
          <div id="controls" className="how-label">THE SECRET TO SURVIVAL</div>
          <div className="controls-row" aria-label="Keyboard controls">
            <div className="control"><kbd>W A S D</kbd><span>MOVE</span></div>
            <div className="control"><kbd>SHIFT</kbd><span>SNEAK</span></div>
            <div className="control"><kbd>E</kbd><span>INTERACT</span></div>
          </div>
        </div>
        <div className="intro-picture" aria-hidden="true">
          <div className="halo-one" /><div className="halo-two"/>
          <div className="intro-artwork" />
          <div className="picture-label"><span className="picture-label-star">✦</span> A LOOK INSIDE THE NEW BEDROOM</div>
        </div>
      </div>

      <a className="scroll-cue" href="#controls" aria-label="Scroll down to see the keyboard controls"><span>⌄</span><small>SEE CONTROLS</small></a>
      <footer className="intro-footer">
        <span><span className="footer-diamond">◆</span> A LITTLE STEALTH. A LOT OF TROUBLE.</span>
        <span>BEST PLAYED WITH A KEYBOARD <span className="footer-divider">/</span> V 0.3 — BEDROOM EDITION</span>
      </footer>
    </section>
  );
}
