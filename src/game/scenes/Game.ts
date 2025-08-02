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
        .setScale(0.3, 0.1)
        .setTint(0xaaff00),
      get pointerPos() {
        return camera.getWorldPoint(
          input.activePointer.worldX,
          input.activePointer.worldY,
        );
      },
      keysDown: new Set<string>(),
    };

    this.systems = [bombSpawner, playerControls, boxSpawner, cannonShooter].map(
      (system) => system(this),
    );

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
        isStatic: true,
      })
      .setOrigin(0.5, 0.5)
      .setScale(100, 1)
      .setTint(0x008800);
  }

  update(time: number, delta: number): void {
    this.camera.centerOn(this.state.player.x, this.state.player.y);

    this.systems.forEach((system) => system(time, delta));
  }
}
// random nice color between 0x000000 and 0xffffff
const randomColor = () => {
  return 0xffffff / 2 + Math.floor((Math.random() * 0xffffff) / 2);
};

const boxSpawner: System = (game) => {
  let lastSpawnTime = 0;

  return (time: number, _delta: number) => {
    const {
      keysDown,
      pointerPos: { x, y },
    } = game.state;

    if (!keysDown?.has("x") || time - lastSpawnTime < 100) {
      return;
    }
    lastSpawnTime = time;

    game.matter.add
      .sprite(x, y, "square", undefined)
      .setScale(0.5, 0.5)
      .setTint(randomColor());
  };
};

type System = (game: Game) => (time: number, delta: number) => void;

const cannonShooter: System = ({ state, matter }) => {
  let lastSpawnTime = 0;

  return (time: number, _delta: number) => {
    const { player, keysDown } = state;
    if (!keysDown?.has("c") || time - lastSpawnTime < 100) {
      return;
    }
    lastSpawnTime = time;
    const { x, y } = player;

    const angle = normalizeAngle(player.rotation); // Ensure angle is within [0, 2π]

    const playerWidth = player.displayWidth + 2;

    const offsetX = Math.cos(angle) * playerWidth;

    const offsetY = Math.sin(angle) * playerWidth; // 90 degrees to the right

    const body = matter.add
      .sprite(x + offsetX, y + offsetY, "circle", undefined, {
        shape: "circle",
      })
      .setScale(0.1, 0.1)
      .setTint(0xffff00);

    const outpushSpeed = 30;

    body.setVelocity(
      (player.body?.velocity.x ?? 0) + outpushSpeed * Math.cos(angle),
      (player.body?.velocity.y ?? 0) + outpushSpeed * Math.sin(angle),
    );
  };
};
const bombSpawner: System = ({ state, matter }) => {
  let lastSpawnTime = 0;
  const bombs: Array<Phaser.Physics.Matter.Sprite> = [];
  matter.world.on(
    "collisionstart",
    (event: MatterJS.IEventCollision<MatterJS.Engine>) => {
      const collidedBodies = event.pairs.flatMap(({ bodyA, bodyB }) => [
        bodyA,
        bodyB,
      ]);

      const collidedBombs = bombs.filter(
        (bomb) => bomb.body && collidedBodies.includes(bomb.body),
      );

      if (collidedBombs.length === 0) {
        return;
      }

      for (const collidedBomb of collidedBombs) {
        const radius = 400;
        const { x: bombX, y: bombY } = collidedBomb;

        const bodiesInRegion = matter.query.region(
          matter.world.getAllBodies(),
          {
            min: { x: bombX - radius, y: bombY - radius },
            max: { x: bombX + radius, y: bombY + radius },
          },
        );
        const bodiesWithinRadius = bodiesInRegion.filter((body) => {
          const dx = body.position.x - bombX;
          const dy = body.position.y - bombY;
          return Math.sqrt(dx * dx + dy * dy) <= radius;
        });

        collidedBomb.destroy();

        bodiesWithinRadius.forEach((body) => {
          if (body.isStatic) {
            return; // Skip static bodies and ground
          }

          const distance = Math.sqrt(
            (body.position.x - bombX) ** 2 + (body.position.y - bombY) ** 2,
          );
          const intensity = 1 - distance / radius;

          // set velocity away from the bomb

          matter.body.setVelocity(body, {
            x: (body.position.x - bombX) * 0.1 * intensity,
            y: (body.position.y - bombY) * 0.1 * intensity,
          });
        });
      }
    },
  );
  return (time: number, _delta: number) => {
    const { player, keysDown } = state;
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
      .sprite(x + offsetX, y + offsetY, "circle", undefined, {
        shape: "circle",
      })
      .setScale(0.1, 0.1)
      .setTint(0x000000);

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
