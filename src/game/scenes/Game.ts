import { Scene } from "phaser";

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;

  state: {
    player: Phaser.Physics.Matter.Sprite;
    pointerPos: { x: number; y: number };
    keysDown?: Set<string>;
  };
  systems: Array<ReturnType<System>> = [];

  constructor() {
    super("Game");
  }

  create() {
    const input = this.input;
    this.camera = this.cameras.main;
    const camera = this.camera;
    this.state = {
      player: this.matter.add
        .sprite(100, 300, "square", undefined, {
          render: { lineColor: 0x00ffff },
        })
        .setScale(0.3, 0.1),
      get pointerPos() {
        return camera.getWorldPoint(
          input.activePointer.worldX,
          input.activePointer.worldY,
        );
      },
      keysDown: new Set<string>(),
    };

    this.systems = [bombSpawner, playerControls].map((system) => system(this));

    this.camera.setBackgroundColor(0xaaaaaa);
    // Create the circle with Matter physics

    const circle = this.matter.add.sprite(300, 100, "circle", undefined, {
      shape: "circle",
      render: { lineColor: 0x00ffff },
    });
    circle.setScale(0.5, 0.5); // Scale down the circle

    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      this.state.keysDown?.add(event.key);
    });
    this.input.keyboard?.on("keyup", (event: KeyboardEvent) => {
      this.state.keysDown?.delete(event.key);
    });

    this.matter.add
      .sprite(300, 500, "square", undefined, {
        render: { lineColor: 0x00ffff },
        isStatic: true,
      })
      .setOrigin(0.5, 0.5)
      .setScale(100, 0.1);
  }

  update(time: number, delta: number): void {
    this.camera.centerOn(this.state.player.x, this.state.player.y);

    this.systems.forEach((system) => system(time, delta));
  }
}

type System = (game: Game) => (time: number, delta: number) => void;
const bombSpawner: System = ({ state: { player, keysDown }, matter }) => {
  let lastSpawnTime = 0;
  const bombs: Array<Phaser.Physics.Matter.Sprite> = [];
  return (time: number, _delta: number) => {
    if (!keysDown?.has("b") || time - lastSpawnTime < 100) {
      return;
    }
    lastSpawnTime = time;
    const { x, y } = player;

    const angle = normalizeAngle(player.rotation); // Ensure angle is within [0, 2π]

    const playerHeight = player.displayHeight + 2;
    const spawnOnTop = angle < -Math.PI / 2 && angle > (-Math.PI * 3) / 2;
    const offsetX =
      Math.cos(angle + Math.PI / 2 + (spawnOnTop ? Math.PI : 0)) * playerHeight;

    const offsetY =
      Math.sin(angle + Math.PI / 2 + (spawnOnTop ? Math.PI : 0)) * playerHeight; // 90 degrees to the right

    const body = matter.add
      .sprite(
        x + offsetX,
        y + offsetY,
        "circle",

        undefined,
        {
          shape: "circle",
        },
      )
      .setScale(0.1, 0.1);

    const outpushSpeed = 30;

    body.setVelocity(
      (player.body?.velocity.x ?? 0) +
        outpushSpeed * Math.cos(angle + (spawnOnTop ? -1 : 1) * (Math.PI / 2)),
      (player.body?.velocity.y ?? 0) +
        outpushSpeed * Math.sin(angle + ((spawnOnTop ? -1 : 1) * Math.PI) / 2),
    );

    bombs.push(body);
  };
};

const playerControls: System = ({ state }) => {
  return (_time: number, delta: number) => {
    const { player, keysDown, pointerPos } = state;
    const angle = player.rotation;
    const { x: worldX, y: worldY } = pointerPos;

    const desiredAngle = Math.atan2(worldY - player.y, worldX - player.x);

    // slowly rotate the player towards the desired angle
    const angleDiff = normalizeAngle(desiredAngle - angle);

    const turnSpeed = 0.05; // Adjust this value to control the rotation speed
    player.setAngularVelocity(angleDiff * turnSpeed);

    const forceMagnitude = 0.00005 * delta; // Adjust this value to control the force applied

    if (keysDown?.has("z")) {
      const force = new Phaser.Math.Vector2(
        Math.cos(angle) * forceMagnitude,
        Math.sin(angle) * forceMagnitude,
      );
      player.applyForce(force);
    }
  };
};

export const normalizeAngle = (angle: number) => {
  if (angle > Math.PI) {
    return angle - 2 * Math.PI;
  } else if (angle < -Math.PI) {
    return angle + 2 * Math.PI;
  }
  return angle;
};
