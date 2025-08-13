import { System } from "./utils"

export const planetSystem: System = (game) => {
  game.state.planetBodies.push(
    game.matter.add
      .sprite(100, 100, "circle", undefined, {
        isStatic: true,
        shape: "circle",
      })
      .setScale(1, 1)
      .setTint(0x0000ff),
  )

  game.state.planetBodies.push(
    game.matter.add
      .sprite(300, 600, "square", undefined, { isStatic: true })
      .setScale(2, 2)
      .setTint(0x0000ff),
  )
  return (_time: number, delta: number) => {
    game.matter.world.getAllBodies().forEach((body) => {
      if (body.isStatic) {
        return // Skip static bodies and ground
      }
      const force = game.state.planetBodies.reduce(
        (acc, curr) => {
          if (curr.body === body) {
            return acc
          }
          const dist = Phaser.Math.Distance.Between(
            curr.x,
            curr.y,
            body.position.x,
            body.position.y,
          )

          const factor = (delta * 0.0005) / dist / dist

          acc.x += (curr.x - body.position.x) * factor
          acc.y += (curr.y - body.position.y) * factor
          return acc
        },
        { x: 0, y: 0 },
      )
      game.matter.body.applyForce(body, body.position, force)
    })
  }
}
