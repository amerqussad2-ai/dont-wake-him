import { mixPose, type Point, type RigPose } from "@/game/art/cutout/rig";
import { PRANKSTER_ATLAS_DATA } from "@/game/art/characters/atlasFrames.generated";
import type { CharacterPart } from "@/game/art/characters/rigLayout";

/**
 * The Prankster as a cut-out rig of the approved art (source-art pixels).
 * Joints, layering and the leg/hip/sleeve splits were set by hand against
 * the approved designs (V2b/V2c).
 */
export type PranksterPart = "hip" | "legL" | "legR" | "torso" | "armL" | "armR" | "head";
export type PranksterFacing = "front" | "back";
export type PranksterExpression = "smile" | "mischief" | "shocked";

/** Hair top to soles of the assembled art, in source pixels. */
export const PRANKSTER_SOURCE_HEIGHT = 911;
/** On-screen height in game pixels (chosen from the V2c bedroom comparison). */
export const PRANKSTER_DISPLAY_HEIGHT = 90;
export const PRANKSTER_DISPLAY_SCALE = PRANKSTER_DISPLAY_HEIGHT / PRANKSTER_SOURCE_HEIGHT;

type Layout = { frame: string; at: [number, number]; pivot: [number, number] };

const FRONT: Record<PranksterPart, Layout> = {
  hip: { frame: "pants_front_hip", at: [58, 470], pivot: [262, 500] },
  legL: { frame: "pants_front_L", at: [58, 470], pivot: [238, 510] },
  legR: { frame: "pants_front_R", at: [58, 470], pivot: [343, 510] },
  torso: { frame: "torso_front_body", at: [100, 220], pivot: [260, 515] },
  armL: { frame: "arm_front_left", at: [60, 248], pivot: [160, 278] },
  armR: { frame: "arm_front_right", at: [308, 248], pivot: [358, 278] },
  head: { frame: "head_front_smile", at: [160, 20], pivot: [270, 280] },
};

const BACK: Record<PranksterPart, Layout> = {
  hip: { frame: "pants_back_hip", at: [128, 470], pivot: [258, 500] },
  legL: { frame: "pants_back_L", at: [128, 470], pivot: [198, 510] },
  legR: { frame: "pants_back_R", at: [128, 470], pivot: [318, 510] },
  torso: { frame: "torso_back", at: [100, 205], pivot: [260, 515] },
  // Back view: only the lower sleeve, forearm and hand, tucked behind the torso's own sleeves.
  armL: { frame: "arm_alt_left_lower", at: [68, 215], pivot: [128, 400] },
  armR: { frame: "arm_alt_right_lower", at: [338, 236], pivot: [390, 430] },
  head: { frame: "head_back", at: [143, 30], pivot: [259, 280] },
};

/** The expression heads differ in size; these line their collars up. */
const HEAD_AT: Record<PranksterExpression, [number, number]> = {
  smile: [160, 20],
  mischief: [167, 23],
  shocked: [168, 23],
};

/** Draw order, back to front. From behind, the forearms go under the torso. */
const ORDER: Record<PranksterFacing, PranksterPart[]> = {
  front: ["hip", "legL", "legR", "torso", "armL", "armR", "head"],
  back: ["hip", "legL", "legR", "armL", "armR", "torso", "head"],
};

/** Midpoint between the soles; the back trousers are drawn 10 px lower. */
export const PRANKSTER_ANCHOR: Record<PranksterFacing, Point> = {
  front: { x: 260, y: 930 },
  back: { x: 262, y: 940 },
};

export function pranksterHeadFrame(facing: PranksterFacing, expression: PranksterExpression): CharacterPart<PranksterPart> {
  if (facing === "back") return pranksterParts("back").find((p) => p.name === "head")!;
  const [x, y] = HEAD_AT[expression];
  return { name: "head", frame: `head_front_${expression}`, at: { x, y }, pivot: { x: FRONT.head.pivot[0], y: FRONT.head.pivot[1] } };
}

export function pranksterParts(facing: PranksterFacing, expression: PranksterExpression = "smile"): CharacterPart<PranksterPart>[] {
  const layout = facing === "front" ? FRONT : BACK;
  return ORDER[facing].map((name) => {
    if (name === "head" && facing === "front") return pranksterHeadFrame(facing, expression);
    const l = layout[name];
    return { name, frame: l.frame, at: { x: l.at[0], y: l.at[1] }, pivot: { x: l.pivot[0], y: l.pivot[1] } };
  });
}

export const PRANKSTER_FRAMES = PRANKSTER_ATLAS_DATA.frames;

// --- Motion ---------------------------------------------------------------------

/** Source pixels per game pixel at 60 px; motion was tuned in these units. */
const K = PRANKSTER_SOURCE_HEIGHT / 60;
/** Leg length from hip joint to sole, for keeping the feet planted while crouched. */
const LEG_LENGTH = 420;

/** Idle: breathing that lifts the chest, shoulders and head. `phase` in radians. */
export function idlePose(phase: number): RigPose<PranksterPart> {
  const b = (1 - Math.cos(phase)) / 2;
  return {
    torso: { scaleX: 1 + 0.01 * b, scaleY: 1 + 0.025 * b },
    armL: { y: -0.6 * K * b },
    armR: { y: -0.6 * K * b },
    head: { y: -0.8 * K * b, x: 0.15 * K * Math.sin(phase * 0.5) },
  };
}

interface StrideStyle {
  /** How far a lifted foot rises (game px at 60). */
  lift: number;
  /** Body bounce (game px at 60). */
  bounce: number;
  /** Upper-body drop (game px at 60). */
  crouch: number;
  /** Leg shortening while crouched (bent knees), feet kept on the floor. */
  bend: number;
  /** Extra stance width per leg (game px at 60). */
  spread: number;
}

const WALK: StrideStyle = { lift: 1.0, bounce: 1.4, crouch: 0, bend: 0, spread: 0 };
const SNEAK: StrideStyle = { lift: 0.7, bounce: 0.4, crouch: 5, bend: 0.07, spread: 0.9 };

/** One stride per TAU of `phase`. `moving` = false holds the stance without stepping. */
function stridePose(phase: number, style: StrideStyle, moving: boolean): RigPose<PranksterPart> {
  const s = moving ? Math.sin(phase) : 0;
  const liftL = Math.max(0, s);
  const liftR = Math.max(0, -s);
  const passing = Math.abs(s);
  const body = -style.bounce * K * passing + style.crouch * K;
  const headLag = moving ? Math.abs(Math.sin(phase - 0.5)) : 0;
  const leg = (lift: number, side: -1 | 1) => {
    const scaleY = 1 - style.bend - 0.04 * lift;
    return { x: side * style.spread * K, y: LEG_LENGTH * style.bend - style.lift * K * lift, scaleY };
  };
  // Arms swing against the legs; while crouched they come up a little, ready to grab.
  const raise = style.crouch * 0.45 * K;
  return {
    legL: leg(liftL, -1),
    legR: leg(liftR, 1),
    torso: { y: body, scaleY: 0.985 + 0.015 * passing },
    armL: { y: body - 1.4 * style.lift * K * liftR + 0.6 * style.lift * K * liftL - raise, scaleY: 1 - 0.03 * liftR },
    armR: { y: body - 1.4 * style.lift * K * liftL + 0.6 * style.lift * K * liftR - raise, scaleY: 1 - 0.03 * liftL },
    head: { y: body - 0.5 * K * headLag + style.crouch * 0.15 * K },
  };
}

export const walkPose = (phase: number) => stridePose(phase, WALK, true);
export const sneakPose = (phase: number, moving: boolean) => stridePose(phase, SNEAK, moving);

export interface PranksterMotion {
  /** Breathing phase (radians). */
  breath: number;
  /** Stride phase (radians); one full step cycle per TAU. */
  stride: number;
  /** 0..1 blend toward walking. */
  walk: number;
  /** 0..1 blend toward the crouch. */
  sneak: number;
  /** Whether the feet are stepping. */
  moving: boolean;
}

export function pranksterPose(m: PranksterMotion): RigPose<PranksterPart> {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const upright = mixPose(idlePose(m.breath), walkPose(m.stride), clamp(m.walk));
  return mixPose(upright, sneakPose(m.stride, m.moving), clamp(m.sneak));
}
