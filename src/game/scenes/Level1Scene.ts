import * as Phaser from "phaser";

import { NoiseTuning, PlayerTuning } from "@/game/config/gameplay";
import { Colors, Fonts, Palette } from "@/game/config/theme";
import { InteractiveObject } from "@/game/entities/InteractiveObject";
import { Player } from "@/game/entities/Player";
import { Sleeper } from "@/game/entities/Sleeper";
import { level1 } from "@/game/levels/level1";
import { KeyboardControls } from "@/game/systems/KeyboardControls";
import { NoiseSystem } from "@/game/systems/NoiseSystem";
import { ObjectiveSystem } from "@/game/systems/ObjectiveSystem";
import { SleepSystem } from "@/game/systems/SleepSystem";
import {
  SceneKeys,
  type GameOverData,
  type LevelCompleteData,
  type LoseReason,
  type Rect,
} from "@/game/types";
import { Hud } from "@/game/ui/Hud";

/** Level 1 — The Bedroom. Wires the level data, entities, systems and HUD together. */
export class Level1Scene extends Phaser.Scene {
  private readonly level = level1;

  private noise!: NoiseSystem;
  private sleep!: SleepSystem;
  private objectives!: ObjectiveSystem;
  private controls!: KeyboardControls;
  private player!: Player;
  private sleeper!: Sleeper;
  private objects!: InteractiveObject[];
  private hud!: Hud;

  private ended = false;
  private elapsed = 0;
  private alarmRemaining: number | null = null;
  private lastBumpAt = Number.NEGATIVE_INFINITY;
  private focused: InteractiveObject | null = null;

  constructor() {
    super(SceneKeys.Level1);
  }

  create(): void {
    // Scenes are reused on restart, so reset all run state here.
    this.ended = false;
    this.elapsed = 0;
    this.alarmRemaining = this.level.alarmSeconds;
    this.lastBumpAt = Number.NEGATIVE_INFINITY;
    this.focused = null;

    this.noise = new NoiseSystem();
    this.sleep = new SleepSystem();
    this.objectives = new ObjectiveSystem(this.level.interactables);
    this.controls = new KeyboardControls(this);

    this.drawRoom();
    const solids = this.physics.add.staticGroup();
    this.sleeper = new Sleeper(this, this.level.bed);
    this.addSolid(solids, this.level.bed);
    for (const piece of this.level.furniture) {
      this.drawFurniture(piece, piece.color, piece.label);
      this.addSolid(solids, piece);
    }

    this.objects = this.level.interactables.map((def) => {
      if (def.solid) this.addSolid(solids, def.area);
      return new InteractiveObject(this, def);
    });

    const { room, playerStart } = this.level;
    this.physics.world.setBounds(room.x, room.y, room.width, room.height);
    this.player = new Player(this, playerStart.x, playerStart.y);
    this.physics.add.collider(this.player.body, solids, () => this.onBump());

    this.hud = new Hud(this, this.level.name);
    this.hud.setObjectives(this.objectives.list);
    this.hud.setPrompt("Complete every objective without waking him. Hold Shift to sneak.");
  }

  update(_time: number, delta: number): void {
    if (this.ended) return;
    const dt = delta / 1000;
    this.elapsed += dt;

    const input = this.controls.read();
    const movement = this.player.update(input);
    if (movement === "walking") this.makeNoise(NoiseTuning.walkPerSecond * dt);
    if (movement === "sneaking") this.makeNoise(NoiseTuning.sneakPerSecond * dt);

    this.sleep.update(dt);
    this.noise.update(dt);
    this.updateAlarm(dt);
    this.updateFocus();

    if (input.interact && this.focused && this.isAvailable(this.focused)) {
      this.interact(this.focused);
    }

    this.sleeper.update(this.noise.level, this.sleep.depth);
    this.hud.update(this.noise.level, this.sleep.depth, this.alarmRemaining);

    if (this.noise.isMaxed) this.lose("noise");
  }

  /** Applies noise scaled by how lightly he is sleeping; returns the scaled amount. */
  private makeNoise(base: number): number {
    const amount = base * this.sleep.noiseMultiplier;
    this.noise.add(amount);
    this.sleep.disturb(amount);
    return amount;
  }

  private onBump(): void {
    const now = this.time.now;
    if (now - this.lastBumpAt < NoiseTuning.bumpCooldownMs) return;
    this.lastBumpAt = now;
    const amount = this.makeNoise(NoiseTuning.bump);
    this.showNoisePopup(this.player.x, this.player.y - 24, amount, "bump");
  }

  private updateAlarm(dt: number): void {
    if (this.alarmRemaining === null) return;
    this.alarmRemaining = Math.max(0, this.alarmRemaining - dt);
    if (this.alarmRemaining === 0) {
      this.noise.fill();
      this.lose("alarm");
    }
  }

  /** Highlights the closest unused object in range and shows its prompt. */
  private updateFocus(): void {
    let closest: InteractiveObject | null = null;
    let best: number = PlayerTuning.interactRange;
    for (const obj of this.objects) {
      if (obj.isUsed) continue;
      const d = obj.distanceTo(this.player.x, this.player.y);
      if (d <= best) {
        best = d;
        closest = obj;
      }
    }

    if (closest !== this.focused) {
      this.focused?.setHighlighted(false);
      closest?.setHighlighted(true);
      this.focused = closest;
    }

    if (!closest) {
      // Keep the opening hint up for a few seconds.
      if (this.elapsed > 4) this.hud.setPrompt(null);
      return;
    }
    const def = closest.definition;
    if (!this.isAvailable(closest)) {
      this.hud.setPrompt(def.lockedHint ?? "Not yet.");
    } else {
      const estimate = Math.round(def.noise * this.sleep.noiseMultiplier);
      this.hud.setPrompt(
        `[E] ${def.action} ${def.label.toLowerCase()}   ·   noise ≈ ${estimate}`,
      );
    }
  }

  private isAvailable(obj: InteractiveObject): boolean {
    const { requires } = obj.definition;
    return !obj.isUsed && (!requires || this.objectives.isComplete(requires));
  }

  private interact(obj: InteractiveObject): void {
    const def = obj.definition;
    const amount = this.makeNoise(def.noise);
    this.showNoisePopup(obj.shape.x, obj.shape.y - 20, amount);

    obj.markUsed();
    this.objectives.complete(def.id);
    this.hud.setObjectives(this.objectives.list);
    if (def.id === "alarm") this.alarmRemaining = null;

    this.focused = null;
    this.hud.setPrompt(null);

    if (this.noise.isMaxed) this.lose("noise");
    else if (this.objectives.allComplete) this.win();
  }

  private lose(reason: LoseReason): void {
    if (this.ended) return;
    this.ended = true;
    this.player.freeze();
    this.sleeper.wake();
    this.hud.update(this.noise.level, this.sleep.depth, this.alarmRemaining);
    this.hud.setPrompt(null);
    this.cameras.main.shake(300, 0.01);
    this.time.delayedCall(900, () => {
      const data: GameOverData = { reason };
      this.scene.launch(SceneKeys.GameOver, data);
      this.scene.pause();
    });
  }

  private win(): void {
    this.ended = true;
    this.player.freeze();
    this.hud.update(this.noise.level, this.sleep.depth, this.alarmRemaining);
    this.time.delayedCall(500, () => {
      const data: LevelCompleteData = {
        timeSeconds: this.elapsed,
        peakNoise: this.noise.peak,
      };
      this.scene.launch(SceneKeys.LevelComplete, data);
      this.scene.pause();
    });
  }

  private addSolid(group: Phaser.Physics.Arcade.StaticGroup, rect: Rect): void {
    group.add(
      this.add.zone(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
        rect.width,
        rect.height,
      ),
    );
  }

  private drawRoom(): void {
    const { room } = this.level;
    const right = room.x + room.width;
    this.add
      .rectangle(room.x, room.y, room.width, room.height, Palette.floor)
      .setOrigin(0)
      .setStrokeStyle(12, Palette.wall);
    this.add.rectangle(760, 560, 300, 180, Palette.rug);
    this.add.rectangle(640, room.y, 180, 10, Palette.window);
    this.add.rectangle(right, 600, 10, 90, Palette.door);
    this.add
      .text(right - 16, 545, "door", {
        fontFamily: Fonts.primary,
        fontSize: "12px",
        color: Colors.mutedText,
      })
      .setOrigin(1, 0.5);
  }

  private drawFurniture(rect: Rect, color: number, label?: string): void {
    this.add
      .rectangle(
        rect.x + rect.width / 2,
        rect.y + rect.height / 2,
        rect.width,
        rect.height,
        color,
      )
      .setStrokeStyle(2, 0x000000, 0.3);
    if (label) {
      this.add
        .text(rect.x + rect.width / 2, rect.y + rect.height - 4, label, {
          fontFamily: Fonts.primary,
          fontSize: "11px",
          color: Colors.mutedText,
        })
        .setOrigin(0.5, 1);
    }
  }

  /** Expanding ring plus a floating "+N" so the player sees what each action cost. */
  private showNoisePopup(x: number, y: number, amount: number, prefix = ""): void {
    const ring = this.add.circle(x, y + 20, 10).setStrokeStyle(2, Palette.noiseMid);
    this.tweens.add({
      targets: ring,
      scale: 4 + amount / 5,
      alpha: 0,
      duration: 600,
      onComplete: () => ring.destroy(),
    });

    const text = this.add
      .text(x, y, `${prefix ? `${prefix} ` : ""}+${Math.round(amount)}`, {
        fontFamily: Fonts.primary,
        fontSize: "18px",
        fontStyle: "bold",
        color: amount > 25 ? Colors.danger : Colors.warning,
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy(),
    });
  }
}
