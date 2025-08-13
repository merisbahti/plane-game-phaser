import { GameObjects, Scene } from "phaser"

export type GameState = {
  player: Phaser.Physics.Matter.Sprite
  pointerPos: { x: number; y: number }
  keysDown?: Set<string>
  planetBodies: Array<Phaser.Physics.Matter.Sprite>
  activeExplosions: Array<Phaser.GameObjects.Sprite>
  addExplosion: (x: number, y: number) => void
  health: {
    get: (gameObject: GameObjects.GameObject) => number | null
    set: (gameObject: GameObjects.GameObject, health: number) => void
  }
}

export type System = (
  game: Scene & { state: GameState },
) => (time: number, delta: number) => void
