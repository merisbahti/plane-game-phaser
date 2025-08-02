import { Scene } from "phaser";
import { GameState, System } from "./utils";

export class Game extends Scene {
  camera: Phaser.Cameras.Scene2D.Camera;
  background: Phaser.GameObjects.Image;

  state: GameState;
  initialSystems = [
    bombSpawner,
    playerControls,
    boxSpawner,
    cannonShooter,
    explosionSystem,
  ];
  updaters: Array<ReturnType<System>> = [];

  constructor() {
    super("Game");
  }

  create() {
    const input = this.input;
    this.camera = this.cameras.main;
    const game = this;

    const camera = this.camera;
    camera.setZoom(0.5);
    this.state = {
      player: this.matter.add
        .sprite(100, 300, "square", undefined, {
          render: { lineColor: 0x00ffff },
        })
        .setScale(0.6, 0.2)
        .setTint(0xaaff00),
      get pointerPos() {
        return camera.getWorldPoint(
          input.activePointer.worldX,
          input.activePointer.worldY,
        );
      },
      keysDown: new Set<string>(),
      planetBodies: [],
      activeExplosions: [],
      addExplosion: (x: number, y: number) => {
        const sprite = game.add.sprite(x, y, "kaboom");
        sprite.on("animationcomplete", () => {
          sprite.destroy();
          this.state.activeExplosions = this.state.activeExplosions.filter(
            (x) => x !== sprite,
          );
        });
        sprite.play("kaboom-boom");
        this.state.activeExplosions.push(sprite);
      },
    };

    this.updaters = this.initialSystems.map((system) => system(this));

    this.camera.setBackgroundColor(0xaaaaaa);
    // Create the circle with Matter physics

    this.matter.add
      .sprite(300, 500, "square", undefined, { isStatic: true })
      .setScale(100, 1);

    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      this.state.keysDown?.add(event.key);
    });
    this.input.keyboard?.on("keyup", (event: KeyboardEvent) => {
      this.state.keysDown?.delete(event.key);
    });
  }

  update(time: number, delta: number): void {
    this.camera.centerOn(this.state.player.x, this.state.player.y);

    this.updaters.forEach((system) => system(time, delta));
  }
}
// random nice color between 0x000000 and 0xffffff
const randomColor = () => {
  return 0xffffff / 2 + Math.floor((Math.random() * 0xffffff) / 2);
};

const explosionSystem: System = ({ matter, state }) => {
  return (time: number, _delta: number) => {
    state.activeExplosions.forEach((explosion) => {
      const { x: explosionX, y: explosionY } = explosion.getCenter();

      const radius = explosion.displayWidth * 2;
      const bodiesInRegion = matter.query.region(matter.world.getAllBodies(), {
        min: { x: explosionX - radius, y: explosionY - radius },
        max: { x: explosionX + radius, y: explosionY + radius },
      });
      const bodiesWithinRadius = bodiesInRegion.filter((body) => {
        const dx = body.position.x - explosionX;
        const dy = body.position.y - explosionY;
        return Math.sqrt(dx * dx + dy * dy) <= radius;
      });

      bodiesWithinRadius.forEach((body) => {
        if (body.isStatic) {
          return; // Skip static bodies and ground
        }

        const distance = Math.sqrt(
          (body.position.x - explosionX) ** 2 +
            (body.position.y - explosionY) ** 2,
        );
        const intensity = 1 - distance / radius;

        // set velocity away from the bomb

        matter.body.applyForce(
          body,
          { x: explosionX, y: explosionY },
          {
            x: (body.position.x - explosionX) * 0.0001 * intensity,
            y: (body.position.y - explosionY) * 0.0001 * intensity,
          },
        );
      });
    });
  };
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
        state.addExplosion(collidedBomb.x, collidedBomb.y);
        collidedBomb.destroy();
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
      .sprite(x + offsetX, y + offsetY, "square", undefined, {})
      .setScale(0.2, 0.05)
      .setTint(0x000000);
    body.rotation = state.player.rotation;

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

    const forceMagnitude = 0.0002 * delta; // Adjust this value to control the force applied

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
