import * as Phaser from "phaser";

import { getAudio } from "@/game/audio";
import { LevelAudio } from "@/game/audio/LevelAudio";
import { GAME_HEIGHT, GAME_WIDTH } from "@/game/config/constants";
import { FeelTuning, NoiseTuning, PlayerTuning } from "@/game/config/gameplay";
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
  LevelEvents,
  SceneKeys,
  type GameOverData,
  type HudStartData,
  type Level1StartData,
  type LevelCompleteData,
  type LevelTick,
  type LoseReason,
  type Rect,
} from "@/game/types";
import { burst, floatText, noiseRing } from "@/game/ui/effects";

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
  private levelAudio!: LevelAudio;

  private introDone = false;
  private introTimer: Phaser.Time.TimerEvent | null = null;
  private ended = false;
  private elapsed = 0;
  private alarmRemaining: number | null = null;
  private alarmUrgent = false;
  private lastBumpAt = Number.NEGATIVE_INFINITY;
  private focused: InteractiveObject | null = null;
  private prompt: string | null = null;

  constructor() {
    super(SceneKeys.Level1);
  }

  create(data: Level1StartData = {}): void {
    // Scenes are reused on restart, so reset all run state here.
    this.introDone = false;
    this.introTimer = null;
    this.ended = false;
    this.elapsed = 0;
    this.alarmRemaining = this.level.alarmSeconds;
    this.alarmUrgent = false;
    this.lastBumpAt = Number.NEGATIVE_INFINITY;
    this.focused = null;
    this.prompt = null;

    this.noise = new NoiseSystem();
    this.sleep = new SleepSystem();
    this.objectives = new ObjectiveSystem(this.level.interactables);
    this.controls = new KeyboardControls(this);
    const sound = new LevelAudio(getAudio(this));
    this.levelAudio = sound;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => sound.dispose());

    this.drawRoom();
    const solids = this.physics.add.staticGroup();
    const bedX = this.level.bed.x + this.level.bed.width / 2;
    this.sleeper = new Sleeper(this, this.level.bed, {
      breath: (phase, stage, snoring, ms) => sound.breath(phase, stage, snoring, ms, bedX),
      stirred: (stage) => sound.stirred(stage, bedX),
      fidget: (stage) => sound.fidget(stage, bedX),
      wakeBeat: (beat) => sound.wakeBeat(beat, bedX),
    });
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

    const quickStart = Boolean(data.quickStart);
    const hudData: HudStartData = {
      events: this.events,
      levelNumber: 1,
      levelName: this.level.name,
      objectives: this.objectives.list,
      quickStart,
    };
    this.scene.launch(SceneKeys.Hud, hudData);
    this.levelAudio.start(!quickStart);
    this.playIntro(quickStart);
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.sleeper.update(this.noise.level, this.sleep.depth, dt);
    this.emitTick();
    if (!this.introDone || this.ended) return;
    this.elapsed += dt;

    const input = this.controls.read();
    const { movement, stepped } = this.player.update(input, dt);
    if (movement === "walking") this.makeNoise(NoiseTuning.walkPerSecond * dt);
    if (movement === "sneaking") this.makeNoise(NoiseTuning.sneakPerSecond * dt);
    if (stepped) {
      this.showFootstep(movement === "sneaking");
      this.levelAudio.step(movement === "sneaking", this.player.speedRatio, this.player.x);
    }

    this.sleep.update(dt);
    this.noise.update(dt);
    this.updateAlarm(dt);
    if (this.ended) return;
    this.levelAudio.update(dt, this.noise.level, this.alarmRemaining);
    this.updateFocus();

    if (input.interact && this.focused) {
      if (this.isAvailable(this.focused)) this.interact(this.focused);
      else {
        this.focused.deny();
        this.levelAudio.deny();
      }
    }

    if (this.noise.isMaxed) this.lose("noise");
  }

  // --- Intro --------------------------------------------------------------

  /** Fades in on the sleeper, then pans and zooms to the player. */
  private playIntro(quickStart: boolean): void {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    if (quickStart) {
      cam.setZoom(FeelTuning.cameraZoom);
      cam.centerOn(this.player.x, this.player.y);
      cam.fadeIn(350);
      this.introTimer = this.time.delayedCall(500, () => this.finishIntro());
      return;
    }

    const head = this.sleeper.headPosition;
    cam.setZoom(1.6);
    cam.centerOn(head.x + 60, head.y + 60);
    cam.fadeIn(900);
    const panStart = this.time.delayedCall(1700, () => {
      cam.pan(this.player.x, this.player.y, 1100, "Sine.easeInOut");
      cam.zoomTo(FeelTuning.cameraZoom, 1100, "Sine.easeInOut");
    });
    this.introTimer = this.time.delayedCall(1700 + 1100, () => this.finishIntro());
    this.events.once(LevelEvents.IntroDone, () => panStart.remove());
    this.input.keyboard?.once("keydown", () => this.finishIntro());
  }

  private finishIntro(): void {
    if (this.introDone || this.ended) return;
    this.introDone = true;
    this.introTimer?.remove();

    const cam = this.cameras.main;
    cam.panEffect.reset();
    cam.zoomEffect.reset();
    cam.setZoom(FeelTuning.cameraZoom);
    cam.startFollow(this.player.body, false, FeelTuning.cameraLerp, FeelTuning.cameraLerp);

    this.events.emit(LevelEvents.IntroDone);
    this.setPrompt("Complete every objective without waking him. Hold Shift to sneak.");
  }

  // --- Noise --------------------------------------------------------------

  /** Applies noise scaled by how lightly he is sleeping; returns the scaled amount. */
  private makeNoise(base: number): number {
    const amount = base * this.sleep.noiseMultiplier;
    this.noise.add(amount);
    this.sleep.disturb(amount);
    return amount;
  }

  /** Visual feedback for a single loud noise: rings, floating text, shake, HUD kick. */
  private noiseFeedback(x: number, y: number, amount: number, prefix = ""): void {
    const color = amount > 25 ? Palette.noiseHigh : Palette.noiseMid;
    noiseRing(this, x, y, 30 + amount * 2.5, color, 700);
    noiseRing(this, x, y, 18 + amount * 1.5, color, 500, 0.6);
    floatText(
      this,
      x,
      y - 24,
      `${prefix}+${Math.round(amount)}`,
      amount > 25 ? Colors.danger : Colors.warning,
      amount > 25 ? 22 : 18,
    );
    this.cameras.main.shake(120 + amount * 5, Math.min(0.012, 0.0015 + amount * 0.0002));
    this.events.emit(LevelEvents.NoiseBurst, amount);
  }

  private showFootstep(sneaking: boolean): void {
    const y = this.player.y + PlayerTuning.size / 2;
    if (sneaking) noiseRing(this, this.player.x, y, 12, Palette.sleep, 400, 0.25);
    else noiseRing(this, this.player.x, y, 28, Palette.noiseMid, 450, 0.45);
  }

  private onBump(): void {
    if (!this.introDone || this.ended) return;
    const now = this.time.now;
    if (now - this.lastBumpAt < NoiseTuning.bumpCooldownMs) return;
    this.lastBumpAt = now;
    const amount = this.makeNoise(NoiseTuning.bump);
    this.noiseFeedback(this.player.x, this.player.y, amount, "bump ");
    this.levelAudio.bump(this.player.x);
  }

  private updateAlarm(dt: number): void {
    if (this.alarmRemaining === null) return;
    this.alarmRemaining = Math.max(0, this.alarmRemaining - dt);

    if (!this.alarmUrgent && this.alarmRemaining <= FeelTuning.alarmUrgentSeconds) {
      this.alarmUrgent = true;
      this.alarmObject()?.setUrgent(true);
    }
    if (this.alarmRemaining === 0) {
      this.ringAlarm();
      this.noise.fill();
      this.lose("alarm");
    }
  }

  private ringAlarm(): void {
    const clock = this.alarmObject();
    if (!clock) return;
    const { x, y } = clock.shape;
    this.levelAudio.alarmRing(x);
    for (let i = 0; i < 4; i++) {
      this.time.delayedCall(i * 160, () => noiseRing(this, x, y, 140, Palette.noiseHigh, 700));
    }
    floatText(this, x, y - 30, "RIIING!", Colors.danger, 26);
    this.tweens.add({ targets: clock.shape, angle: 12, duration: 40, yoyo: true, repeat: 10 });
  }

  private alarmObject(): InteractiveObject | undefined {
    return this.objects.find((o) => o.definition.id === "alarm");
  }

  // --- Interaction --------------------------------------------------------

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
      this.focused?.setFocus("none");
      if (closest) this.levelAudio.focus(!this.isAvailable(closest));
    }
    this.focused = closest;

    if (!closest) {
      // Keep the opening hint up for a few seconds.
      if (this.elapsed > 4) this.setPrompt(null);
      return;
    }
    const def = closest.definition;
    if (!this.isAvailable(closest)) {
      closest.setFocus("locked");
      this.setPrompt(def.lockedHint ?? "Not yet.");
    } else {
      closest.setFocus("available");
      const estimate = Math.round(def.noise * this.sleep.noiseMultiplier);
      this.setPrompt(`[E] ${def.action} ${def.label.toLowerCase()}   ·   noise ≈ ${estimate}`);
    }
  }

  private isAvailable(obj: InteractiveObject): boolean {
    const { requires } = obj.definition;
    return !obj.isUsed && (!requires || this.objectives.isComplete(requires));
  }

  private interact(obj: InteractiveObject): void {
    const def = obj.definition;
    const amount = this.makeNoise(def.noise);
    this.noiseFeedback(obj.shape.x, obj.shape.y, amount);
    this.levelAudio.interact(def.effect, obj.shape.x);

    obj.markUsed(this.player);
    this.objectives.complete(def.id);
    this.events.emit(LevelEvents.ObjectiveComplete, this.objectives.list, def.id);
    this.levelAudio.objectiveComplete(this.objectives.completedCount);
    if (def.id === "alarm") this.alarmRemaining = null;

    this.focused = null;
    this.setPrompt(null);

    if (this.noise.isMaxed) this.lose("noise");
    else if (this.objectives.allComplete) this.win();
  }

  // --- Endings ------------------------------------------------------------

  /** He wakes up: camera rushes to him, he sits up, then the Game Over overlay. */
  private lose(reason: LoseReason): void {
    if (this.ended) return;
    this.ended = true;
    this.player.freeze();
    this.focused?.setFocus("none");
    this.setPrompt(null);
    this.emitTick();
    this.events.emit(LevelEvents.Ended, reason);
    this.levelAudio.lose();

    const cam = this.cameras.main;
    const head = this.sleeper.headPosition;
    cam.stopFollow();
    cam.shake(450, 0.012);
    cam.pan(head.x + 40, head.y + 60, 700, "Cubic.easeOut");
    cam.zoomTo(1.5, 700, "Cubic.easeOut");

    const duration = this.sleeper.wake();
    this.time.delayedCall(duration + 250, () => {
      const data: GameOverData = { reason };
      this.scene.launch(SceneKeys.GameOver, data);
      this.scene.pause();
    });
  }

  /** All done: a little celebration, then the Level Complete overlay. */
  private win(): void {
    this.ended = true;
    this.player.freeze();
    this.emitTick();
    this.events.emit(LevelEvents.Ended, "win");
    this.levelAudio.win();

    const sprite = this.player.sprite;
    this.time.delayedCall(350, () => {
      burst(this, sprite.x, sprite.y, Palette.noiseLow, 16, 60);
      this.tweens.add({
        targets: sprite,
        y: sprite.y - 16,
        scaleX: 0.85,
        scaleY: 1.2,
        duration: 180,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    });
    this.cameras.main.zoomTo(1, 1200, "Sine.easeInOut");

    this.time.delayedCall(1200, () => {
      const data: LevelCompleteData = {
        timeSeconds: this.elapsed,
        peakNoise: this.noise.peak,
      };
      this.scene.launch(SceneKeys.LevelComplete, data);
      this.scene.pause();
    });
  }

  // --- Helpers ------------------------------------------------------------

  private emitTick(): void {
    const tick: LevelTick = {
      noise: this.noise.level,
      sleepDepth: this.sleep.depth,
      alarmSeconds: this.alarmRemaining,
    };
    this.events.emit(LevelEvents.Tick, tick);
  }

  private setPrompt(text: string | null): void {
    if (text === this.prompt) return;
    this.prompt = text;
    this.events.emit(LevelEvents.Prompt, text);
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
    // Fill the whole canvas so camera movement never reveals empty space.
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, Palette.wall).setOrigin(0);
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
}
