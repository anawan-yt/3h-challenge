import GameScene from './scenes/game-scene'
export const GRAVITY = 1600

export const GameConfig: Phaser.Types.Core.GameConfig = {
  title: '3h challenge',
  version: '1.0.0',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540,
  },
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
      gravity: {
        x: 0,
        y: GRAVITY,
      },
    },
  },
  type: Phaser.AUTO,
  pixelArt: true,
  roundPixels: false,
  antialias: false,
  backgroundColor: '#000000',
  scene: [GameScene],
}
