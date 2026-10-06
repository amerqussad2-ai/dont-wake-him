# DON'T WAKE HIM

A stealth web game built with Next.js, TypeScript, Phaser and Tailwind CSS.

## Scripts

```bash
npm run dev        # start the dev server
npm run build      # production build
npm run lint       # ESLint
npm run typecheck  # TypeScript (no emit)
```

## Structure

```
src/
  app/            Next.js App Router (layout, page, global styles)
  components/     React components; Phaser is mounted client-only here
  game/
    art/          Code-generated textures (room, furniture, characters, FX, UI)
    audio/        AudioManager, level audio director, sound bank, placeholder synth
    config/       Phaser config, constants, theme, gameplay tuning
    levels/       Level data (layout, objects, noise values)
    scenes/       Phaser scenes
    systems/      Game systems (noise, sleep depth, objectives, ...)
    entities/     Game objects (sleeper, interactive items, ...)
    ui/           In-canvas UI (HUD, meters, ...)
    types/        Shared game types
    createGame.ts Phaser bootstrap
public/assets/
  images/         Sprites and textures
  audio/          Sound effects and music
```

## Controls (Level 1)

Move: WASD / arrow keys · Sneak: hold Shift · Interact: E / Space ·
Restart after a win or loss: R / Enter / click ·
Sound: M mute, - / + master volume (sound starts after the first key press or click)

All art is drawn in code at startup (`src/game/art/`); there are no image files.
All current sounds are generated placeholders (`src/game/audio/placeholderSounds.ts`);
swap recipes in `soundBank.ts` for real assets.

Phaser is only ever imported from `src/components/PhaserGame.tsx`, which is
loaded through `next/dynamic` with `ssr: false` in `GameClient.tsx`.
