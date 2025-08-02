import { Scene } from "phaser";

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;

  state: {
    player: Phaser.Physics.Matter.Sprite;
    pointerPos: { x: number; y: number };
    keysDown?: Set<string>;
  };

  constructor() {
    super("Game");
  }

  create() {
    this.state = {
      player: this.matter.add
        .sprite(100, 300, "square", undefined, {
          render: { lineColor: 0x00ffff },
        })
        .setScale(1, 0.5),
      pointerPos: { x: 0, y: 0 },
      keysDown: new Set<string>(),
    };
    this.camera = this.cameras.main;

    this.camera.setBackgroundColor(0xaaaaaa);
    // Create the circle with Matter physics

    const circle = this.matter.add.sprite(300, 100, "circle", undefined, {
      shape: "circle",
      render: { lineColor: 0x00ffff },
    });
    circle.setScale(0.5, 0.5); // Scale down the circle

    // Adjust rendering color and transparency
    this.input.on("pointermove", ({ worldX, worldY }: Phaser.Input.Pointer) => {
      console.log("Pointer moved:", worldX, worldY);
      this.state.pointerPos = { x: worldX, y: worldY };
    });

    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      this.state.keysDown?.add(event.key);
    });
    this.input.keyboard?.on("keyup", (event: KeyboardEvent) => {
      this.state.keysDown?.delete(event.key);
    });

    this.input.on("down", (pointer: InputEvent) => {
      console.log("Key down:", pointer);
    });

    this.matter.add
      .sprite(300, 500, "square", undefined, {
        render: { lineColor: 0x00ffff },
        isStatic: true,
      })
      .setOrigin(0.5, 0.5)
      .setScale(100, 0.1);
  }

  update(_time: number, delta: number): void {
    this.camera.centerOn(this.state.player.x, this.state.player.y);
    updatePlayerAngle(this.state);
    playerThruster(this.state, delta);
  }
}
const playerThruster = (state: Game["state"], delta: number) => {
  const angle = state.player.rotation;
  const forceMagnitude = 0.001 * delta; // Adjust this value to control the force applied

  if (state.keysDown?.has("z")) {
    const force = new Phaser.Math.Vector2(
      Math.cos(angle) * forceMagnitude,
      Math.sin(angle) * forceMagnitude,
    );
    state.player.applyForce(force);
  }
};

const updatePlayerAngle = (state: Game["state"]) => {
  const { x: worldX, y: worldY } = state.pointerPos;

  const desiredAngle = Math.atan2(
    worldY - state.player.y,
    worldX - state.player.x,
  );

  const angle = state.player.rotation;
  // slowly rotate the player towards the desired angle
  const angleDiff = normalizeAngle(desiredAngle - angle);

  const turnSpeed = 0.05; // Adjust this value to control the rotation speed
  state.player.setAngularVelocity(angleDiff * turnSpeed);
};

export const normalizeAngle = (angle: number) => {
  if (angle > Math.PI) {
    return angle - 2 * Math.PI;
  } else if (angle < -Math.PI) {
    return angle + 2 * Math.PI;
  }
  return angle;
};
