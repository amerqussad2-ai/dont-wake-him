# Realistic 3D asset register — DON'T WAKE HIM

All art here is redistributed in `fps/public/models/` in web-friendly **1K glTF** or texture formats. The source files are committed and validated before every build; the released game loads them from the first-party deployment and does not need access to external model hosts.

## Level 01 — The Bedroom

| Prop | Asset | Source |
|---|---|---|
| Actual bed and textured bedding | Vintage Day Bed | https://polyhaven.com/a/vintage_day_bed |
| Bedside table | Painted Wooden Nightstand | https://polyhaven.com/a/painted_wooden_nightstand |
| Interactive clock | Alarm Clock 01 | https://polyhaven.com/a/alarm_clock_01 |
| Drawer cabinet | Drawer Cabinet | https://polyhaven.com/a/drawer_cabinet |

## Level 02 — The Hotel Suite

| Prop | Asset | Source |
|---|---|---|
| Bed and linens | Vintage Day Bed | https://polyhaven.com/a/vintage_day_bed |
| Interactive TV | Television 02 | https://polyhaven.com/a/television_02 |
| Hotel dresser | Drawer Cabinet | https://polyhaven.com/a/drawer_cabinet |
| Desk lamp | Desk Lamp Arm 01 | https://polyhaven.com/a/desk_lamp_arm_01 |

## Level 03 — The Storm Cabin

| Prop | Asset | Source |
|---|---|---|
| Bed and worn quilt | Vintage Day Bed | https://polyhaven.com/a/vintage_day_bed |
| Bedside furniture | Classic Nightstand 01 | https://polyhaven.com/a/ClassicNightstand_01 |
| Antique drawers | Vintage Wooden Drawer 01 | https://polyhaven.com/a/vintage_wooden_drawer_01 |
| Oil lamp | Vintage Oil Lamp | https://polyhaven.com/a/vintage_oil_lamp |
| Woven storage | Wicker Basket 01 | https://polyhaven.com/a/wicker_basket_01 |

## Shared assets

- Human sleeper: **human_posed.glb** (reclining figure, based on Quaternius CC0). https://github.com/UMRAM-Bilkent/supine-human-model
- PBR floor: Wood Floor. https://polyhaven.com/a/wood_floor
- PBR wall: White Plaster 02. https://polyhaven.com/a/white_plaster_02
- Worn-wood surfaces: Wood Planks. https://polyhaven.com/a/wood_planks

## License and ethics

Poly Haven models and textures are CC0. The human figure source explicitly describes the released pose/model as CC0. Source links are kept for reproducibility and credit, and the game includes the **Powered by Poly Haven** API attribution.

Asset-fetched files are never acquired from PUBG, Call of Duty, or proprietary game packages. They are independent licensed assets with a realistic-inspired visual direction. AAA-level scanned characters, body animations and high-end photorealism require substantially larger authored/licensed production assets and further optimisation; this is not claimed to be equivalent.

## Build / acquisition process

- `node scripts/sync-assets.mjs`: verifies all vendored files and exits without a network request when complete.
- `DWH_FORCE_RESYNC=1 node scripts/sync-assets.mjs`: explicitly refreshes CC0 assets through the official API.
- GitHub Actions `Download licensed 3D game assets` commits the actual files to `fps/public/models`.
- GitHub Actions `Verify 3D game in browser` opens all three levels in real headless Chromium, validates art and tests E interactions.
- `npm run build` runs material checks, interaction tests and Vite.

The game uses fallbacks **only** if an imported asset unexpectedly fails in a browser, and the shipping quality gate requires a full set of verified models and PBR textures.
