import { GRAVITY } from '../config'
import Obstacle from '../objects/obstacle'

interface IObstacle {
  x: number
  y: number
  width?: number
  height?: number
}

interface Level {
  obstacles: IObstacle[]
}

const levels: Level[] = [
  {
    obstacles: [
      { x: 400, y: 180 },
      { x: 600, y: 180 },
    ],
  },
  {
    obstacles: [
      { x: 600, y: 220 },
      { x: 400, y: 220 },
      { x: 160, y: 220 },
    ],
  },
  {
    obstacles: [
      { x: 300, y: 180 },
      { x: 500, y: 160 },
      { x: 600, y: 180 },
    ],
  },
  {
    obstacles: [
      { x: 700, y: 220, height: 10 },
      { x: 680, y: 220 },
      { x: 560, y: 220 },
      { x: 540, y: 220, height: 10 },
      { x: 300, y: 240, width: 100 },
      { x: 220, y: 220 },
    ],
  },
  {
    obstacles: [
      { x: 360, y: 180 },
      { x: 440, y: 160 },
      { x: 500, y: 180 },
      { x: 600, y: 180, width: 40 },
    ],
  },
  {
    obstacles: [
      { x: 660, y: 220, height: 30 },
      { x: 640, y: 220 },
      { x: 520, y: 240, width: 60 },
      { x: 400, y: 220 },
      { x: 180, y: 220 },
    ],
  },
  {
    obstacles: [
      { x: 200, y: 160 },
      { x: 300, y: 180 },
      { x: 360, y: 160 },
      { x: 460, y: 170, height: 30 },
      { x: 540, y: 160, width: 60 },
      { x: 640, y: 180 },
    ],
  },
  {
    obstacles: [
      { x: 600, y: 220, height: 10 },
      { x: 480, y: 220, height: 20 },
      { x: 360, y: 220, height: 30 },
      { x: 240, y: 220, height: 20 },
    ],
  },
]

let deathCount = 0
const [startX, startY] = [160, 140]
const VELOCITY = 200
const JUMP_BUFFERING_TIME = 200

export default class GameScene extends Phaser.Scene {
  private hasStarted!: boolean
  private obstacles!: Phaser.Physics.Arcade.StaticGroup
  private isInverted: boolean = false
  private currentLevel = 0
  private player!: Phaser.GameObjects.Rectangle
  private isPlaying: boolean = false
  private emitter!: Phaser.GameObjects.Particles.ParticleEmitter
  private deathText!: Phaser.GameObjects.BitmapText
  private levelText!: Phaser.GameObjects.BitmapText
  private sfxHit!: Phaser.Sound.NoAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound
  private sfxWin!: Phaser.Sound.NoAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound
  private sfxJump!: Phaser.Sound.NoAudioSound | Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound
  private btnPlay!: Phaser.GameObjects.Image
  private jumpBuffering!: number

  preload() {
    this.load.setBaseURL('assets')
    this.load.bitmapFont('font', 'fonts/pixel.png', 'fonts/pixel.xml')

    const graphics = this.make.graphics()
    graphics.fillStyle(0xffffff, 1)
    graphics.fillRect(0, 0, 6, 6)
    graphics.generateTexture('particle', 6, 6)
    graphics.clear()

    graphics.fillStyle(0xffffff, 1)
    graphics.fillRect(0, 0, 40, 40)
    graphics.fillStyle(0x000000, 1)
    graphics.beginPath()
    graphics.moveTo(10, 10)
    graphics.lineTo(10, 30)
    graphics.lineTo(30, 20)
    graphics.closePath()
    graphics.fillPath()
    graphics.generateTexture('btnPlay', 40, 40)

    graphics.destroy()

    this.load.audio('hit', 'audio/hit.wav')
    this.load.audio('jump', 'audio/jump.wav')
    this.load.audio('win', 'audio/win.wav')
  }

  create() {
    this.hasStarted = false
    this.isInverted = false
    this.currentLevel = 0
    this.isPlaying = true
    this.jumpBuffering = 0
    const platform = this.add.rectangle(160, 200, 640, 20, 0xffffff)
    platform.setOrigin(0)
    this.physics.add.existing(platform, true)

    this.emitter = this.add.particles(0, 0, 'particle', {
      lifespan: 300,
      speedX: { min: -200, max: 200 },
      speedY: { min: -200, max: 200 },
      scale: { start: 1, end: 0 },
      emitting: false,
      quantity: 10,
    })

    this.sfxHit = this.sound.add('hit')
    this.sfxWin = this.sound.add('win')
    this.sfxJump = this.sound.add('jump')

    this.player = this.add.rectangle(startX, startY, 20, 20, 0xffffff)
    this.player.setOrigin(0)

    this.obstacles = this.physics.add.staticGroup({
      classType: Obstacle,
    })

    this.createLevel(this.currentLevel)
    this.createLevel(this.currentLevel + 1)

    const triggerRight = this.add.rectangle(800, 220, 160, 20, 0xffffff, 0)
    triggerRight.setOrigin(0)
    this.physics.add.existing(triggerRight, true)

    const triggerLeft = this.add.rectangle(0, 180, 160, 20, 0xffffff, 0)
    triggerLeft.setOrigin(0)
    this.physics.add.existing(triggerLeft, true)

    this.physics.add.collider(platform, this.player)

    this.input.on('pointerdown', this.jump, this)
    this.input.keyboard?.on('keydown-SPACE', this.jump, this)
    this.input.keyboard?.on('keydown-UP', this.jump, this)

    this.physics.add.overlap(this.player, this.obstacles, () => {
      this.emitter.emitParticleAt(this.player.x, this.player.y)
      this.restart()
    })

    this.physics.add.overlap(this.player, triggerRight, () => {
      if (this.isInverted) return
      this.handleTrigger()
    })

    this.physics.add.overlap(this.player, triggerLeft, () => {
      if (!this.isInverted) return
      this.handleTrigger()
    })

    this.deathText = this.add.bitmapText(20, 20, 'font', `Morts: ${deathCount}`, 16)
    this.levelText = this.add.bitmapText(20, 44, 'font', `Niveau: ${this.currentLevel + 1}/${levels.length}`, 16)

    this.btnPlay = this.add.image(480, 420, 'btnPlay')

    this.add.bitmapText(480, 480, 'font', 'Cliquer pour sauter (ESPACE / UP KEY)', 16).setOrigin(0.5)
  }

  update(time: number) {
    if (
      (this.player.body as Phaser.Physics.Arcade.Body)?.blocked[this.isInverted ? 'up' : 'down'] &&
      time - this.jumpBuffering < JUMP_BUFFERING_TIME
    ) {
      this.jump()
    }
  }

  jump() {
    if (!this.hasStarted) {
      this.physics.add.existing(this.player)
      const body = this.player.body as Phaser.Physics.Arcade.Body
      body.setVelocityX(VELOCITY)
      this.hasStarted = true
      this.btnPlay.setVisible(false)
      return
    }

    const body = this.player.body as Phaser.Physics.Arcade.Body

    if (!body.blocked[this.isInverted ? 'up' : 'down']) {
      this.jumpBuffering = this.time.now
      return
    }

    this.jumpBuffering = 0
    body.setVelocityY(this.isInverted ? 400 : -400)
    this.sfxJump.play()
  }

  handleTrigger() {
    if (!this.isPlaying) return

    this.isInverted = !this.isInverted
    this.currentLevel++

    if (this.currentLevel < levels.length) {
      this.levelText.setText(`Niveau: ${this.currentLevel + 1}/${levels.length}`)
    }
    this.eraseLevel(this.currentLevel - 1)

    if (this.currentLevel >= levels.length) {
      this.win()
      return
    }

    if (this.currentLevel < levels.length - 1) {
      this.createLevel(this.currentLevel + 1)
    }

    this.physics.world.gravity.y = GRAVITY * (this.isInverted ? -1 : 1)
    ;(this.player.body as Phaser.Physics.Arcade.Body).setVelocityX(VELOCITY * (this.isInverted ? -1 : 1))
  }

  eraseLevel(level: number) {
    this.obstacles
      .getChildren()
      .filter((object) => (object as Obstacle).level === level)
      .forEach((object) => {
        const obstacle = object as Obstacle
        obstacle.destroy()
      })
  }

  createLevel(level: number) {
    const levelData = levels[level]
    for (let i = 0; i < levelData.obstacles.length; i++) {
      const { x, y, width = 20, height = 20 } = levelData.obstacles[i]
      const obstacle = this.obstacles.get(x, y)
      obstacle.width = width
      obstacle.height = height
      obstacle.body.setSize(width, height)
      obstacle.level = level
    }
  }

  win() {
    this.sfxWin.play()
    this.isPlaying = false
    this.physics.world.gravity.y = GRAVITY
    this.player.setPosition(this.scale.width / 2 - 10, 80)
    ;(this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0)
  }

  restart() {
    deathCount++
    this.currentLevel = 0
    this.sfxHit.play()
    this.deathText.setText(`Morts: ${deathCount}`)
    this.levelText.setText(`Niveau: ${this.currentLevel + 1}/${levels.length}`)
    this.player.setPosition(startX, startY)
    this.physics.world.gravity.y = GRAVITY
    ;(this.player.body as Phaser.Physics.Arcade.Body).setVelocityX(VELOCITY)

    this.isInverted = false
    this.isPlaying = true
    this.jumpBuffering = 0
    this.obstacles.clear(true, true)

    this.createLevel(this.currentLevel)
    this.createLevel(this.currentLevel + 1)
  }
}
