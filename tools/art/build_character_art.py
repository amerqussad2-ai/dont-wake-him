#!/usr/bin/env python3
"""Builds the character atlases for DON'T WAKE HIM from the owner-approved art parts.

Input: the `parts/` folder of the approved art pack (dont_wake_him_v2b_art_parts.zip),
with `prankster/*.png` and `sleeper/*.png`. Nothing here draws new characters: every
frame is the approved art, cleaned, cropped, split or re-composed (see each step).

Outputs (paths relative to the repository root):
  public/assets/images/characters/prankster.png + .json   Phaser JSON-hash atlas
  public/assets/images/characters/sleeper.png + .json
  src/game/art/characters/atlasFrames.generated.ts        frame offsets in source pixels

Usage: python3 tools/art/build_character_art.py <parts dir> [repo root]
Needs Python 3 and Pillow. Not part of the web build; re-run only when the art changes.
"""
import json
import math
import os
import sys
from collections import deque

from PIL import Image, ImageChops, ImageDraw, ImageFilter

# Texture pixels per source pixel. The Prankster is drawn 90 px tall in game (source
# assembly: 911 px) and the Sleeper at 0.24 game px per source px; both atlases are
# authored at 1.5x game size so they stay sharp under the camera zoom.
PRANKSTER_SCALE = 1.5 * 90 / 911
SLEEPER_SCALE = 1.5 * 0.24
# The top-down blanket is authored at 2x game size, i.e. 0.48 px per Sleeper source px.
BLANKET_SOURCE_SCALE = 2 * 0.24

PRANKSTER_FRAMES = [
    "pants_front_hip", "pants_front_L", "pants_front_R", "pants_back_hip", "pants_back_L", "pants_back_R",
    "torso_front_body", "torso_back", "arm_front_left", "arm_front_right", "arm_alt_left_lower",
    "arm_alt_right_lower", "head_front_smile", "head_front_mischief", "head_front_shocked", "head_back",
]
SLEEPER_FRAMES = [
    "head_sleepy", "head_snoring", "head_peeking", "head_annoyed", "head_startled",
    "arm_over_head", "blanket_topdown", "snore_bubble", "z_2", "z_3",
]

# Detached pieces of neighbouring artwork caught in the extraction.
DEBRIS = {"prankster/arm_front_left", "prankster/arm_front_right", "prankster/head_front_shocked"}


# --- Cleanup -------------------------------------------------------------------------

def components(alpha, threshold=128):
    """8-connected opaque regions, largest first, as lists of (x, y)."""
    w, h = alpha.size
    px = alpha.load()
    seen = bytearray(w * h)
    found = []
    for y in range(h):
        for x in range(w):
            if px[x, y] >= threshold and not seen[y * w + x]:
                queue = deque([(x, y)])
                seen[y * w + x] = 1
                region = []
                while queue:
                    cx, cy = queue.popleft()
                    region.append((cx, cy))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and px[nx, ny] >= threshold:
                                seen[ny * w + nx] = 1
                                queue.append((nx, ny))
                found.append(region)
    return sorted(found, key=len, reverse=True)


def keep_main_body(im):
    """Drops detached debris, keeping the largest region and its soft edge."""
    mask = Image.new("L", im.size, 0)
    mp = mask.load()
    for x, y in components(im.getchannel("A"))[0]:
        mp[x, y] = 255
    mask = mask.filter(ImageFilter.MaxFilter(9))
    out = im.copy()
    out.putalpha(ImageChops.multiply(im.getchannel("A"), mask))
    return out


def solid_interior(im):
    """The extraction left interiors at 91-99% opacity; stacked parts would ghost. Edges keep their AA."""
    out = im.copy()
    out.putalpha(im.getchannel("A").point(lambda v: 255 if v >= 232 else v))
    return out


# --- Derivatives (crops, splits and re-compositions of approved art) ------------------

def crop_rows(im, y0, y1, feather=0):
    out = Image.new("RGBA", im.size)
    out.paste(im.crop((0, y0, im.width, y1)), (0, y0))
    px = out.load()
    for i in range(feather):  # fade a cut edge so a sliver never shows as a hard line
        for x in range(out.width):
            r, g, b, a = px[x, y0 + i]
            px[x, y0 + i] = (r, g, b, a * (i + 1) // (feather + 1))
    return out


def split_legs(im, crotch_x):
    """Left/right legs of one-piece trousers, cut along the gap between the legs."""
    alpha = im.getchannel("A").load()
    w, h = im.size
    left, right = Image.new("RGBA", im.size), Image.new("RGBA", im.size)
    for y in range(h):
        solid = [alpha[x, y] >= 128 for x in range(w)]
        xs = [x for x in range(w) if solid[x]]
        cut = crotch_x
        if xs:
            best, x = None, xs[0]
            while x <= xs[-1]:
                if not solid[x]:
                    s = x
                    while x <= xs[-1] and not solid[x]:
                        x += 1
                    if best is None or x - s > best[1] - best[0]:
                        best = (s, x)
                x += 1
            if best and best[1] - best[0] >= 3:
                cut = (best[0] + best[1]) // 2
        left.paste(im.crop((0, y, cut, y + 1)), (0, y))
        right.paste(im.crop((cut, y, w, y + 1)), (cut, y))
    return left, right


def without_side_sleeves(torso):
    """Front torso minus its baked-in sleeves, which the separate front arms draw."""
    out = torso.copy()
    px = out.load()
    for y in range(90, out.height):
        for x in range(out.width):
            if x < 58 or x > 280:
                px[x, y] = (0, 0, 0, 0)
    return out


def split_snore_letters(head):
    """head_snoring has a "Zzz" drawn in; returns (clean head, [letter images])."""
    boxes = [(316, 0, 352, 52), (283, 30, 328, 77), (307, 82, 351, 127)]
    alpha = head.getchannel("A")
    all_letters = Image.new("L", head.size, 0)
    letters = []
    for box in boxes:
        m = Image.new("L", head.size, 0)
        m.paste(alpha.crop(box).point(lambda v: 255 if v >= 128 else 0), box[:2])
        m = m.filter(ImageFilter.MaxFilter(7))
        all_letters = ImageChops.lighter(all_letters, m)
        letter = head.copy()
        letter.putalpha(ImageChops.multiply(alpha, m))
        letters.append(letter.crop(letter.getbbox()))
    clean = head.copy()
    clean.putalpha(ImageChops.subtract(alpha, all_letters))
    return clean, letters


def top_down_blanket(art):
    """Re-composes the approved front-view blanket as seen from above, at 2x game size:
    its own fabric (folds and colours), its white sheet fold and its outline colour."""
    W, H, FOLD, PAD = 428, 458, 40, 12
    outline = (16, 14, 30, 255)

    # Fabric: two crops of the approved duvet (one mirrored) stacked with feathered seams.
    fab = art.crop((40, 125, 340, 280)).convert("RGB")
    fab = fab.resize((W, round(fab.height * W / fab.width)), Image.LANCZOS)
    fab2 = fab.transpose(Image.FLIP_LEFT_RIGHT)
    body_h, feather = H - FOLD, 60
    body = Image.new("RGB", (W, body_h))
    y, i = 0, 0
    while y < body_h:
        tile = fab if i % 2 == 0 else fab2
        layer = Image.new("RGB", (W, body_h))
        layer.paste(tile, (0, y))
        m = Image.new("L", (W, body_h), 0)
        m.paste(255, (0, y + (feather if i else 0), W, min(body_h, y + tile.height)))
        if i:
            m.paste(Image.linear_gradient("L").resize((W, feather)), (0, y))
        body = Image.composite(layer, body, m)
        y += fab.height - feather
        i += 1

    # Top-down shading: the body underneath (lighter ridge), draping sides, darker hem.
    shade = Image.new("L", (W, body_h))
    sp = shade.load()
    for yy in range(body_h):
        for xx in range(W):
            u = (xx - W / 2) / (W / 2)
            v = yy / body_h
            k = 1.06 - 0.30 * max(0.0, abs(u) - 0.55) / 0.45
            k *= 1.0 - 0.18 * max(0.0, v - 0.82) / 0.18
            k *= 1.0 + 0.05 * math.exp(-((u / 0.33) ** 2)) * math.sin(math.pi * min(1, v * 1.15))
            sp[xx, yy] = max(0, min(255, round(k * 200)))
    body = Image.merge("RGB", [ImageChops.multiply(c, shade).point(lambda p: min(255, p * 255 // 200)) for c in body.split()])

    # Sheet fold: the approved white fold band, flattened across the width.
    band = art.crop((110, 24, 250, 72)).convert("RGB").resize((W, FOLD), Image.LANCZOS)
    sheet = Image.new("RGB", (W, H))
    sheet.paste(band, (0, 0))
    sheet.paste(body, (0, FOLD))
    shadow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(shadow).rectangle((0, FOLD, W, FOLD + 10), fill=90)
    shadow = shadow.filter(ImageFilter.GaussianBlur(4))
    shadow.paste(0, (0, 0, W, FOLD))
    sheet = Image.composite(Image.new("RGB", (W, H), (10, 40, 90)), sheet, shadow)

    # Shape and outline (inset so the line is drawn on every side).
    shape = Image.new("L", (W * 4, H * 4), 0)
    ImageDraw.Draw(shape).rounded_rectangle((8, 8, W * 4 - 9, H * 4 - 9), radius=22 * 4, fill=255)
    shape = shape.resize((W, H), Image.LANCZOS)
    edge = ImageChops.subtract(shape, shape.filter(ImageFilter.MinFilter(9)))
    line = Image.new("L", (W, H), 0)
    ImageDraw.Draw(line).rectangle((0, FOLD - 2, W, FOLD + 1), fill=230)
    line = ImageChops.multiply(line, shape)
    img = sheet.convert("RGBA")
    img = Image.composite(Image.new("RGBA", (W, H), outline), img, ImageChops.lighter(edge, line))
    img.putalpha(shape)

    # Soft shadow margin, like the room's other furniture.
    canvas = Image.new("RGBA", (W + 2 * PAD, H + 2 * PAD), (0, 0, 0, 0))
    drop = Image.new("L", canvas.size, 0)
    drop.paste(shape.point(lambda a: a * 120 // 255), (PAD, PAD + 5))
    canvas.putalpha(drop.filter(ImageFilter.GaussianBlur(6)))
    canvas.alpha_composite(img, (PAD, PAD))
    return canvas


# --- Packing -------------------------------------------------------------------------

def scaled(im, factor):
    w, h = max(1, round(im.width * factor)), max(1, round(im.height * factor))
    return im.convert("RGBa").resize((w, h), Image.LANCZOS).convert("RGBA")  # premultiplied: no dark fringes


def pack(frames, scale, max_width):
    """frames: {name: (image, source px per source-art px)}. Returns (sheet, atlas json frames, offsets)."""
    items = []
    for name, (im, source_scale) in frames.items():
        factor = scale / source_scale
        tex = scaled(im, factor)
        box = tex.getchannel("A").getbbox()
        crop = tex.crop(box)
        # Offset and size in source-art pixels (what the game's layouts are written in).
        offset = {
            "x": round(box[0] / scale, 2),
            "y": round(box[1] / scale, 2),
            "width": round(crop.width / scale, 2),
            "height": round(crop.height / scale, 2),
        }
        items.append((name, crop, offset))
    items.sort(key=lambda it: it[1].height, reverse=True)
    pad, x, y, row_h, placed = 2, 2, 2, 0, []
    for name, crop, offset in items:
        if x + crop.width + pad > max_width:
            x, y, row_h = 2, y + row_h + pad, 0
        placed.append((name, crop, offset, x, y))
        x += crop.width + pad
        row_h = max(row_h, crop.height)
    height = y + row_h + 2
    sheet = Image.new("RGBA", (max_width, height), (0, 0, 0, 0))
    json_frames, offsets = {}, {}
    for name, crop, offset, fx, fy in sorted(placed):
        sheet.paste(crop, (fx, fy))
        w, h = crop.size
        json_frames[name] = {
            "frame": {"x": fx, "y": fy, "w": w, "h": h},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h},
            "sourceSize": {"w": w, "h": h},
        }
        offsets[name] = offset
    return sheet, json_frames, offsets


def write_atlas(out_dir, name, sheet, json_frames):
    sheet.save(os.path.join(out_dir, f"{name}.png"), optimize=True)
    data = {
        "frames": json_frames,
        "meta": {
            "app": "tools/art/build_character_art.py",
            "image": f"{name}.png",
            "format": "RGBA8888",
            "size": {"w": sheet.width, "h": sheet.height},
            "scale": "1",
        },
    }
    with open(os.path.join(out_dir, f"{name}.json"), "w") as f:
        json.dump(data, f, indent=1, sort_keys=True)
        f.write("\n")


def ts_frames(offsets):
    lines = []
    for name in sorted(offsets):
        o = offsets[name]
        lines.append(f'    {name}: {{ x: {o["x"]}, y: {o["y"]}, width: {o["width"]}, height: {o["height"]} }},')
    return "\n".join(lines)


def main(parts_dir, repo):
    load = lambda ch, n: Image.open(os.path.join(parts_dir, ch, f"{n}.png")).convert("RGBA")
    clean = lambda ch, n: solid_interior(keep_main_body(load(ch, n)) if f"{ch}/{n}" in DEBRIS else load(ch, n))

    p = {}
    for n in ("pants_front", "pants_back", "torso_front", "torso_back", "arm_front_left", "arm_front_right",
              "arm_alt_left", "arm_alt_right", "head_front_smile", "head_front_mischief", "head_front_shocked", "head_back"):
        p[n] = clean("prankster", n)
    p["pants_front_L"], p["pants_front_R"] = split_legs(p["pants_front"], 232)
    p["pants_back_L"], p["pants_back_R"] = split_legs(p["pants_back"], 128)
    p["pants_front_hip"] = crop_rows(p["pants_front"], 0, 125)
    p["pants_back_hip"] = crop_rows(p["pants_back"], 0, 130)
    p["torso_front_body"] = without_side_sleeves(p["torso_front"])
    p["arm_alt_left_lower"] = crop_rows(p["arm_alt_left"], 168, 340, feather=12)
    p["arm_alt_right_lower"] = crop_rows(p["arm_alt_right"], 168, 344, feather=12)

    s = {}
    for n in ("head_sleepy", "head_peeking", "head_annoyed", "head_startled", "arm_over_head", "snore_bubble"):
        s[n] = (clean("sleeper", n), 1.0)
    snoring, letters = split_snore_letters(clean("sleeper", "head_snoring"))
    s["head_snoring"] = (snoring, 1.0)
    s["z_2"], s["z_3"] = (letters[1], 1.0), (letters[2], 1.0)
    s["blanket_topdown"] = (top_down_blanket(load("sleeper", "blanket")), BLANKET_SOURCE_SCALE)

    out_dir = os.path.join(repo, "public", "assets", "images", "characters")
    os.makedirs(out_dir, exist_ok=True)
    p_sheet, p_json, p_off = pack({n: (p[n], 1.0) for n in PRANKSTER_FRAMES}, PRANKSTER_SCALE, 512)
    s_sheet, s_json, s_off = pack({n: s[n] for n in SLEEPER_FRAMES}, SLEEPER_SCALE, 1024)
    write_atlas(out_dir, "prankster", p_sheet, p_json)
    write_atlas(out_dir, "sleeper", s_sheet, s_json)

    ts = f"""// Generated by tools/art/build_character_art.py from the approved art parts. Do not edit by hand.
//
// For each atlas frame: where its (trimmed) image starts inside the original art part, and its
// size, in source-art pixels. `textureScale` is atlas pixels per source-art pixel.

export interface AtlasFrameData {{
  x: number;
  y: number;
  width: number;
  height: number;
}}

export const PRANKSTER_ATLAS_DATA = {{
  textureScale: {round(PRANKSTER_SCALE, 6)},
  frames: {{
{ts_frames(p_off)}
  }},
}} as const satisfies {{ textureScale: number; frames: Record<string, AtlasFrameData> }};

export const SLEEPER_ATLAS_DATA = {{
  textureScale: {round(SLEEPER_SCALE, 6)},
  frames: {{
{ts_frames(s_off)}
  }},
}} as const satisfies {{ textureScale: number; frames: Record<string, AtlasFrameData> }};
"""
    ts_path = os.path.join(repo, "src", "game", "art", "characters", "atlasFrames.generated.ts")
    os.makedirs(os.path.dirname(ts_path), exist_ok=True)
    with open(ts_path, "w") as f:
        f.write(ts)
    print(f"prankster atlas {p_sheet.size}, sleeper atlas {s_sheet.size}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else os.getcwd())
