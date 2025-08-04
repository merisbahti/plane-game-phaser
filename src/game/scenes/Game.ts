import { GameObjects, Scene } from "phaser";
import { GameState, System } from "./utils";
import { Collision } from "matter";

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
    healthSystem,
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
        .sprite(20, 20, "nighthawk", undefined, { isStatic: false })
        .setOrigin(0.5, 0.5)
        .setScale(0.5, 0.5),

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
        sprite.setScale(5, 5);

        sprite.on("animationcomplete", () => {
          sprite.destroy();
          this.state.activeExplosions = this.state.activeExplosions.filter(
            (x) => x !== sprite,
          );
        });
        sprite.play("kaboom-boom");
        this.state.activeExplosions.push(sprite);
      },
      health: {
        get: (gameObject: GameObjects.GameObject): number | null => {
          const healthData = gameObject.getData("health");
          if (typeof healthData === "number") {
            return healthData;
          }
          return null;
        },
        set: (gameObject: GameObjects.GameObject, health: number) => {
          gameObject.setData("health", health);
          if (health <= 0) {
            gameObject.destroy();
            return;
          }
        },
      },
    };
    this.state.health.set(this.state.player, 1000);
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

const healthSystem: System = (game) => {
  const bars: Array<GameObjects.GameObject> = [];
  return (_time: number, _delta: number) => {
    // draw health bars above all game objects
    bars.forEach((bar) => bar.destroy());
    bars.length = 0;
    game.children.each((gameObject) => {
      const healthData = game.state.health.get(gameObject);

      if (!healthData || !(gameObject instanceof GameObjects.Sprite)) {
        return;
      }

      if (healthData <= 0) {
        return; // Skip dead objects
      }

      const healthBarWidth = 50;
      const healthBarHeight = 5;

      const healthBarX =
        gameObject.getLeftCenter().x -
        ((healthData / 100) * healthBarWidth) / 2;
      const healthBarY =
        gameObject.getCenter().y - gameObject.displayHeight - 20;

      const healthBar = game.add.graphics();
      healthBar.fillStyle(0xff0000, 1);
      healthBar.fillRect(
        healthBarX,
        healthBarY,
        (healthData / 100) * healthBarWidth,
        healthBarHeight,
      );
      bars.push(healthBar);
    });
  };
};

const explosionSystem: System = ({ matter, state }) => {
  return (_time: number, _delta: number) => {
    state.activeExplosions.forEach((explosion) => {
      const { x: explosionX, y: explosionY } = explosion.getCenter();

      const radius = explosion.displayWidth;

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
        const gameObject = body.gameObject;
        const healthData = gameObject && state.health.get(gameObject);

        if (healthData && gameObject)
          state.health.set(gameObject, healthData - 10);

        // set velocity away from the bomb

        matter.body.applyForce(
          body,
          { x: explosionX, y: explosionY },
          {
            x: (body.position.x - explosionX) * 0.0005 * intensity,
            y: (body.position.y - explosionY) * 0.0005 * intensity,
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

    const body = game.matter.add
      .sprite(x, y, "square", undefined)
      .setScale(2, 2)
      .setTint(randomColor());
    game.state.health.set(body, 100);
    body.on("destroy", () => {
      game.state.addExplosion(body.x, body.y);
    });
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
    body.setOnCollide(
      (otherBody: Phaser.Types.Physics.Matter.MatterCollisionData) => {
        const gameObject = otherBody.bodyA.gameObject;
        const healthData = gameObject && state.health.get(gameObject);
        if (healthData) {
          state.health.set(gameObject, healthData - 50);
        }
        body.destroy();
      },
    );

    body.setVelocity(
      (player.body?.velocity.x ?? 0) + outpushSpeed * Math.cos(angle),
      (player.body?.velocity.y ?? 0) + outpushSpeed * Math.sin(angle),
    );
  };
};
const bombSpawner: System = ({ state, matter }) => {
  let lastSpawnTime = 0;
  const bombs: Array<Phaser.Physics.Matter.Sprite> = [];

  return (time: number, _delta: number) => {
    const { player, keysDown } = state;
    if (!keysDown?.has("b") || time - lastSpawnTime < 100) {
      return;
    }
    lastSpawnTime = time;
    const { x, y } = player;

    const angle = normalizeAngle(player.rotation); // Ensure angle is within [0, 2π]

    const playerHeight = player.displayHeight;
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
    body.setAngularSpeed(0.05);
    state.health.set(body, 1);
    body.on("destroy", () => {
      state.addExplosion(body.x, body.y);
    });
    body.setOnCollide(() => {
      body.destroy();
    });

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

    const forceMagnitude = 0.005 * delta; // Adjust this value to control the force applied

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
