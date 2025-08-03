import { GameObjects, Scene } from "phaser";

export type GameState = {
  player: Phaser.Physics.Matter.Sprite;
  pointerPos: { x: number; y: number };
  keysDown?: Set<string>;
  planetBodies: Array<Phaser.Physics.Matter.Sprite>;
  activeExplosions: Array<Phaser.GameObjects.Sprite>;
  addExplosion: (x: number, y: number) => void;
  health: {
    all: Map<GameObjects.GameObject, number>;
    get: (object: GameObjects.GameObject) => {
      health: number;
    };
  };
};

export type System = (
  game: Scene & { state: GameState },
) => (time: number, delta: number) => void;
