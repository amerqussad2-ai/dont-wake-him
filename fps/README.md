# DON'T WAKE HIM 3D

An independent first-person 3D edition of the original Phaser prototype, built with Babylon.js and Vite. The original 2D project in the repository root remains intact.

## Development

```bash
cd fps
npm install
npm run dev
npm run build
```

## Three playable levels

1. **The Bedroom** — Silence the alarm, retrieve the brass key and unlock the drawer. 125 seconds.
2. **The Hotel Suite** — Turn off the television, collect the access card and open the briefcase. 108 seconds.
3. **The Storm Cabin** — Turn off the radio, retrieve the old key and open the lockbox. 94 seconds.

Each level features distinct textures, lighting and environmental props, three objectives, increased wake sensitivity, and an exit requirement. Finishing a level unlocks the next in localStorage.

## Controls

Desktop: WASD/arrows move; mouse look (click to lock pointer); hold Shift to sneak; E interact; Escape pause. Touch: directional buttons and SNEAK / USE; drag on the 3D view to look.

## Assets and visual fidelity

The present prototype uses **procedural 3D assets**, wood/fabric textures, PBR lighting, shadow maps and a stylized sleeper. It is a prototype and **not photorealistic**. Licensed/commissioned character GLB models, facial animations and detailed furniture assets would be needed for the next visual-quality jump. Sounds are synthesized placeholders.

## Deployment

Create a **separate** Vercel project connected to this repository and configure root directory **fps**, framework Vite, build command `npm run build`, output `dist`. Do not change the existing Next.js/Phaser Vercel project.
