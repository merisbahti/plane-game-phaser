import { Scene } from "phaser";

export type GameState = {
  player: Phaser.Physics.Matter.Sprite;
  pointerPos: { x: number; y: number };
  keysDown?: Set<string>;
  planetBodies: Array<Phaser.Physics.Matter.Sprite>;
  activeExplosions: Array<Phaser.Physics.Matter.Sprite>;
};

export type System = (
  game: Scene & { state: GameState },
) => (time: number, delta: number) => void;
