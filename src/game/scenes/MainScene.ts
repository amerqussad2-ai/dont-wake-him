import * as Phaser from "phaser";

import { GAME_HEIGHT, GAME_WIDTH } from "@/game/config/constants";
import { Colors, Fonts } from "@/game/config/theme";
import { SceneKeys } from "@/game/types";

/** Temporary placeholder scene: dark bedroom backdrop and title only. */
export class MainScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Main);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(Colors.bedroomBackground);

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, "DON'T WAKE HIM", {
        fontFamily: Fonts.primary,
        fontSize: "32px",
        color: Colors.title,
      })
      .setOrigin(0.5)
      .setAlpha(0.85);
  }
}
