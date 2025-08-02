import { Scene } from "phaser";

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;

  state: {
    player: Phaser.Physics.Matter.Sprite;
    bombs: Phaser.Physics.Matter.Sprite[];
    pointerPos: { x: number; y: number };
    keysDown?: Set<string>;
    bombsSpawner: ReturnType<typeof bombSpawner>;
  };

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
      bombs: [],
      keysDown: new Set<string>(),
      bombsSpawner: bombSpawner(),
    };

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
    updatePlayerAngle(this.state);
    playerThruster(this.state, delta);
    this.state.bombsSpawner(this, time, delta);
  }
}
const bombSpawner = () => {
  let lastSpawnTime = 0;
  return (
    { state: { player, bombs, keysDown }, matter }: Game,
    time: number,
    _delta: number,
  ) => {
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

const playerThruster = (state: Game["state"], delta: number) => {
  const angle = state.player.rotation;
  const forceMagnitude = 0.00005 * delta; // Adjust this value to control the force applied

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
