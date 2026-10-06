import * as Phaser from "phaser";

export interface ControlState {
  /** Normalised movement direction (-1..1 per axis). */
  moveX: number;
  moveY: number;
  sneak: boolean;
  /** True only on the frame the interact key was pressed. */
  interact: boolean;
}

type KeyName =
  | "up"
  | "down"
  | "left"
  | "right"
  | "w"
  | "a"
  | "s"
  | "d"
  | "shift"
  | "e"
  | "space";

/** Reads keyboard input. Kept separate so touch controls can provide the same state later. */
export class KeyboardControls {
  private readonly keys: Record<KeyName, Phaser.Input.Keyboard.Key>;

  constructor(scene: Phaser.Scene) {
    const keyboard = scene.input.keyboard;
    if (!keyboard) throw new Error("Keyboard input is not available");
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = keyboard.addKeys({
      up: K.UP,
      down: K.DOWN,
      left: K.LEFT,
      right: K.RIGHT,
      w: K.W,
      a: K.A,
      s: K.S,
      d: K.D,
      shift: K.SHIFT,
      e: K.E,
      space: K.SPACE,
    }) as Record<KeyName, Phaser.Input.Keyboard.Key>;
  }

  read(): ControlState {
    const k = this.keys;
    const x = Number(k.right.isDown || k.d.isDown) - Number(k.left.isDown || k.a.isDown);
    const y = Number(k.down.isDown || k.s.isDown) - Number(k.up.isDown || k.w.isDown);
    const length = Math.hypot(x, y) || 1;
    return {
      moveX: x / length,
      moveY: y / length,
      sneak: k.shift.isDown,
      interact:
        Phaser.Input.Keyboard.JustDown(k.e) || Phaser.Input.Keyboard.JustDown(k.space),
    };
  }
}
