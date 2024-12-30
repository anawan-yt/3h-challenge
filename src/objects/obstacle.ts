export default class Obstacle extends Phaser.GameObjects.Rectangle {
  private _level: number

  get level() {
    return this._level
  }

  set level(level: number) {
    this._level = level
  }

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, level: number) {
    super(scene, x, y, width, height, 0xffffff)
    this.setOrigin(0)
    this._level = level
  }
}
