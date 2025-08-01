import { Scene } from "phaser";

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;
  msg_text: Phaser.GameObjects.Text;

  constructor() {
    super("Game");
  }

  create() {
    this.camera = this.cameras.main;
    this.camera.setBackgroundColor(0xaaaaaa);
    // Create the circle with Matter physics
    this.matter.add.sprite(300, 100, "circle", undefined, {
      shape: "circle",
      render: { lineColor: 0x00ffff },
    });
    this.matter.add.sprite(300, 100, "circle", undefined, {
      shape: "circle",
      render: { lineColor: 0x00ffff },
    });

    // Adjust rendering color and transparency

    this.input.on("pointerdown", (pointer: PointerEvent) => {
      this.matter.add.sprite(pointer.x, pointer.y, "circle", undefined, {
        shape: "circle",
        render: { lineColor: 0x00ffff, fillColor: 0x00ffff },
        scale: { x: 0.1, y: 0.1 },
      });
    });

    this.matter.add
      .sprite(300, 500, "square", undefined, {
        render: { lineColor: 0x00ffff },
        isStatic: true,
      })
      .setOrigin(0.5, 0.5);
  }

  update(time: number, delta: number): void {}
}
