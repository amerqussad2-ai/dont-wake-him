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
    config/       Phaser config, constants, theme
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

Phaser is only ever imported from `src/components/PhaserGame.tsx`, which is
loaded through `next/dynamic` with `ssr: false` in `GameClient.tsx`.
