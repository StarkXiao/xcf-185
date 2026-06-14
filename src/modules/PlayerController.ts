import Phaser from 'phaser';
import { PLAYER_SPEED, WORLD_WIDTH, WORLD_HEIGHT, PETAL_COLLECT_RANGE } from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { SettingsManager } from '../managers/SettingsManager';
import { EventManager } from '../managers/EventManager';
import { Position, Obstacle } from '../types';
import { PathfindingSystem } from './PathfindingSystem';
import { ObstacleSystem } from './ObstacleSystem';
import { CollectRangeSystem } from './CollectRangeSystem';
import { TutorialSystem } from './TutorialSystem';

export class PlayerController {
  private scene: Phaser.Scene;
  private player: Phaser.Physics.Arcade.Sprite | null = null;
  private playerGlow: Phaser.GameObjects.Graphics | null = null;
  private trailParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private touchStartX = 0;
  private touchStartY = 0;
  private isMoving = false;
  private moveTargetX = 0;
  private moveTargetY = 0;
  private joystickGraphics: Phaser.GameObjects.Graphics | null = null;
  private joystickBase: Phaser.Geom.Circle | null = null;
  private joystickKnob: Phaser.Geom.Circle | null = null;
  private joystickActive = false;
  
  private pathfindingSystem: PathfindingSystem;
  private obstacleSystem: ObstacleSystem;
  private collectRangeSystem: CollectRangeSystem;
  private tutorialSystem: TutorialSystem;
  private currentPath: Position[] = [];
  private currentPathIndex = 0;
  private pathPreviewGraphics: Phaser.GameObjects.Graphics | null = null;
  private targetIndicator: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.pathfindingSystem = new PathfindingSystem();
    this.obstacleSystem = new ObstacleSystem(scene);
    this.collectRangeSystem = new CollectRangeSystem(scene);
    this.tutorialSystem = new TutorialSystem(scene);
  }

  public create(): void {
    const state = SaveManager.getInstance().getGameState();
    const startX = state.playerX || WORLD_WIDTH / 2;
    const startY = state.playerY || WORLD_HEIGHT / 2;

    this.obstacleSystem.create();
    this.pathfindingSystem.setObstacles(this.obstacleSystem.getObstacles());

    this.createPlayerSprite(startX, startY);
    this.createPlayerGlow(startX, startY);
    this.createTrailParticles();
    
    this.collectRangeSystem.create();
    this.tutorialSystem.create();
    
    this.setupInput();
    this.setupCamera();
    this.setupWorldBounds();
    this.setupPhysicsCollisions();
    this.createPathPreview();
    this.createTargetIndicator();
  }

  private createPlayerSprite(x: number, y: number): void {
    const playerCanvas = this.scene.textures.createCanvas('player_sprite', 64, 64);
    const ctx = playerCanvas.getContext();
    
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, '#a8e6cf');
    gradient.addColorStop(0.6, '#88ccff');
    gradient.addColorStop(1, 'rgba(136, 204, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(32, 32, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#a8e6cf';
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const px = 32 + Math.cos(angle) * 22;
      const py = 32 + Math.sin(angle) * 22;
      ctx.beginPath();
      ctx.ellipse(px, py, 8, 4, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    
    playerCanvas.refresh();

    this.player = this.scene.physics.add.sprite(x, y, 'player_sprite')
      .setSize(40, 40)
      .setDisplaySize(50, 50)
      .setDepth(20)
      .setCollideWorldBounds(true);

    this.player.setBounce(0.2);
    this.player.setDrag(300);
    this.player.setMaxVelocity(PLAYER_SPEED, PLAYER_SPEED);
  }

  private createPlayerGlow(x: number, y: number): void {
    const glowTextureKey = 'player_glow_texture';
    if (!this.scene.textures.exists(glowTextureKey)) {
      const glowCanvas = this.scene.textures.createCanvas(glowTextureKey, 160, 160);
      const glowCtx = glowCanvas.getContext();
      const center = 80;
      const grad = glowCtx.createRadialGradient(center, center, 0, center, center, 80);
      grad.addColorStop(0, 'rgba(168, 230, 207, 0.3)');
      grad.addColorStop(1, 'rgba(168, 230, 207, 0)');
      glowCtx.fillStyle = grad;
      glowCtx.beginPath();
      glowCtx.arc(center, center, 80, 0, Math.PI * 2);
      glowCtx.fill();
      glowCanvas.refresh();
    }

    this.playerGlow = this.scene.add.graphics() as unknown as Phaser.GameObjects.Graphics;
    const glowImage = this.scene.add.image(x, y, glowTextureKey)
      .setDepth(19)
      .setData('isPlayerGlow', true);
    
    (this as any)._glowImage = glowImage;
    (this.playerGlow as any)._glowImage = glowImage;
  }

  private createTrailParticles(): void {
    this.trailParticles = this.scene.add.particles(0, 0, 'pixel_cyan', {
      lifespan: 500,
      speed: { min: 10, max: 30 },
      angle: { min: 0, max: 360 },
      scale: { start: 2, end: 0 },
      alpha: { start: 0.8, end: 0 },
      quantity: 2,
      blendMode: 'ADD',
      follow: this.player
    }).setDepth(18);
  }

  private setupInput(): void {
    const settings = SettingsManager.getInstance().getControlSettings();
    
    this.cursors = this.scene.input.keyboard?.createCursorKeys() || null;

    const wasdKeys = this.scene.input.keyboard?.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D
    }, true);
    
    if (wasdKeys) {
      Object.assign(this.cursors, wasdKeys);
    }

    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (settings.joystickEnabled && pointer.y > (this.scene.game.config.height as number) * 0.7) {
        this.startJoystick(pointer);
      } else {
        this.currentPath = [];
        this.findPath(pointer.worldX, pointer.worldY);
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.joystickActive && pointer.isDown) {
        this.updateJoystick(pointer);
      }
    });

    this.scene.input.on('pointerup', () => {
      this.joystickActive = false;
      if (this.joystickGraphics) {
        this.joystickGraphics.clear();
      }
    });
  }

  private startJoystick(pointer: Phaser.Input.Pointer): void {
    this.joystickActive = true;
    this.touchStartX = pointer.x;
    this.touchStartY = pointer.y;
    
    const size = 60;
    this.joystickBase = new Phaser.Geom.Circle(this.touchStartX, this.touchStartY, size);
    this.joystickKnob = new Phaser.Geom.Circle(this.touchStartX, this.touchStartY, size * 0.4);

    if (!this.joystickGraphics) {
      this.joystickGraphics = this.scene.add.graphics().setDepth(100).setScrollFactor(0);
    }
    this.joystickGraphics.clear();
    this.joystickGraphics.fillStyle(0xffffff, 0.2);
    this.joystickGraphics.fillCircleShape(this.joystickBase);
    this.joystickGraphics.fillStyle(0xa8e6cf, 0.5);
    this.joystickGraphics.fillCircleShape(this.joystickKnob);
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    if (!this.joystickBase || !this.joystickKnob || !this.joystickGraphics || !this.player) return;

    const dx = pointer.x - this.touchStartX;
    const dy = pointer.y - this.touchStartY;
    const distance = Math.min(Math.sqrt(dx * dx + dy * dy), 60);
    const angle = Math.atan2(dy, dx);

    this.joystickKnob.x = this.touchStartX + Math.cos(angle) * distance;
    this.joystickKnob.y = this.touchStartY + Math.sin(angle) * distance;

    this.joystickGraphics.clear();
    this.joystickGraphics.fillStyle(0xffffff, 0.2);
    this.joystickGraphics.fillCircleShape(this.joystickBase);
    this.joystickGraphics.fillStyle(0xa8e6cf, 0.5);
    this.joystickGraphics.fillCircleShape(this.joystickKnob);

    const normalizedDistance = distance / 60;
    const velocityX = Math.cos(angle) * PLAYER_SPEED * normalizedDistance;
    const velocityY = Math.sin(angle) * PLAYER_SPEED * normalizedDistance;

    this.player.setVelocity(velocityX, velocityY);
  }

  private setupCamera(): void {
    this.scene.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.scene.cameras.main.startFollow(this.player!, true, 0.1, 0.1);
    this.scene.cameras.main.setZoom(1);
    this.scene.cameras.main.fadeIn(1000, 0, 0, 0);
  }

  private setupWorldBounds(): void {
    this.scene.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  private setupPhysicsCollisions(): void {
    const obstacleGroup = this.obstacleSystem.getObstacleGroup();
    if (obstacleGroup && this.player) {
      this.scene.physics.add.collider(this.player, obstacleGroup);
    }
  }

  private createPathPreview(): void {
    const settings = SettingsManager.getInstance().getControlSettings();
    if (!settings.showPathPreview) return;

    this.pathPreviewGraphics = this.scene.add.graphics().setDepth(12).setScrollFactor(0);
  }

  private createTargetIndicator(): void {
    this.targetIndicator = this.scene.add.graphics().setDepth(16);
  }

  private updatePathPreview(): void {
    if (!this.pathPreviewGraphics) return;
    
    const settings = SettingsManager.getInstance().getControlSettings();
    if (!settings.showPathPreview || this.currentPath.length === 0) {
      this.pathPreviewGraphics.clear();
      return;
    }

    this.pathPreviewGraphics.clear();
    
    const camera = this.scene.cameras.main;
    const offsetX = -camera.scrollX;
    const offsetY = -camera.scrollY;

    this.pathPreviewGraphics.lineStyle(3, 0xffd93d, 0.6);
    this.pathPreviewGraphics.beginPath();
    
    this.currentPath.forEach((point, index) => {
      const screenX = point.x + offsetX;
      const screenY = point.y + offsetY;
      
      if (index === 0) {
        this.pathPreviewGraphics!.moveTo(screenX, screenY);
      } else {
        this.pathPreviewGraphics!.lineTo(screenX, screenY);
      }
    });
    this.pathPreviewGraphics.strokePath();

    this.currentPath.forEach((point, index) => {
      if (index % 3 === 0 || index === this.currentPath.length - 1) {
        const screenX = point.x + offsetX;
        const screenY = point.y + offsetY;
        
        this.pathPreviewGraphics!.fillStyle(0xffd93d, 0.8);
        this.pathPreviewGraphics!.beginPath();
        this.pathPreviewGraphics!.arc(screenX, screenY, 4, 0, Math.PI * 2);
        this.pathPreviewGraphics!.fill();
      }
    });
  }

  private updateTargetIndicator(): void {
    if (!this.targetIndicator) return;
    
    if (!this.isMoving || this.currentPath.length === 0) {
      this.targetIndicator.clear();
      return;
    }

    this.targetIndicator.clear();
    
    const target = this.currentPath[this.currentPath.length - 1];
    const pulse = 1 + Math.sin(this.scene.time.now * 0.005) * 0.2;
    
    this.targetIndicator.lineStyle(2, 0xffd93d, 0.8);
    this.targetIndicator.beginPath();
    this.targetIndicator.arc(target.x, target.y, 20 * pulse, 0, Math.PI * 2);
    this.targetIndicator.stroke();
    
    this.targetIndicator.fillStyle(0xffd93d, 0.3);
    this.targetIndicator.beginPath();
    this.targetIndicator.arc(target.x, target.y, 15 * pulse, 0, Math.PI * 2);
    this.targetIndicator.fill();
  }

  public update(time: number, delta: number): void {
    if (!this.player) return;

    this.handleKeyboardInput();
    this.handlePointMove();
    this.handlePathMovement(delta);
    this.updatePlayerGlow();
    this.updatePlayerAnimation(time);
    this.updatePathPreview();
    this.updateTargetIndicator();
    
    this.obstacleSystem.update(time, delta);
    this.collectRangeSystem.updatePosition(this.player.x, this.player.y);
    this.collectRangeSystem.update(time, delta);
    this.tutorialSystem.update(time, delta);

    SaveManager.getInstance().updatePlayerPosition(this.player.x, this.player.y);
  }

  private handleKeyboardInput(): void {
    if (!this.cursors || !this.player || this.joystickActive) return;

    let velocityX = 0;
    let velocityY = 0;

    if (this.cursors.left?.isDown || (this.cursors as any).left?.isDown) {
      velocityX = -PLAYER_SPEED;
    } else if (this.cursors.right?.isDown || (this.cursors as any).right?.isDown) {
      velocityX = PLAYER_SPEED;
    }

    if (this.cursors.up?.isDown || (this.cursors as any).up?.isDown) {
      velocityY = -PLAYER_SPEED;
    } else if (this.cursors.down?.isDown || (this.cursors as any).down?.isDown) {
      velocityY = PLAYER_SPEED;
    }

    if (velocityX !== 0 || velocityY !== 0) {
      this.isMoving = false;
      this.player.setVelocity(velocityX, velocityY);
    }
  }

  private handlePathMovement(delta: number): void {
    if (!this.player || this.currentPath.length === 0 || this.joystickActive) return;
    if (this.currentPathIndex >= this.currentPath.length) {
      this.currentPath = [];
      this.isMoving = false;
      this.player.setVelocity(0, 0);
      return;
    }

    const target = this.currentPath[this.currentPathIndex];
    const dx = target.x - this.player.x;
    const dy = target.y - this.player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 10) {
      this.currentPathIndex++;
      if (this.currentPathIndex >= this.currentPath.length) {
        this.currentPath = [];
        this.isMoving = false;
        this.player.setVelocity(0, 0);
      }
      return;
    }

    const settings = SettingsManager.getInstance().getControlSettings();
    let newPos = { x: this.player.x, y: this.player.y };

    if (settings.autoPathEnabled) {
      newPos = this.obstacleSystem.avoidObstacles(
        { x: this.player.x, y: this.player.y },
        target,
        delta
      );
    } else {
      const angle = Math.atan2(dy, dx);
      const speed = Math.min(PLAYER_SPEED * (delta / 1000), distance);
      newPos.x += Math.cos(angle) * speed;
      newPos.y += Math.sin(angle) * speed;
    }

    const velocityX = (newPos.x - this.player.x) * (1000 / delta);
    const velocityY = (newPos.y - this.player.y) * (1000 / delta);
    this.player.setVelocity(velocityX, velocityY);
  }

  private handlePointMove(): void {
    if (!this.player || !this.isMoving || this.joystickActive) return;
    if (this.currentPath.length > 0) return;

    const dx = this.moveTargetX - this.player.x;
    const dy = this.moveTargetY - this.player.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
      this.isMoving = false;
      this.player.setVelocity(0, 0);
      return;
    }

    const angle = Math.atan2(dy, dx);
    const speed = Math.min(PLAYER_SPEED, distance * 2);
    this.player.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
  }

  private findPath(targetX: number, targetY: number): void {
    if (!this.player) return;

    const settings = SettingsManager.getInstance().getControlSettings();
    
    if (settings.autoPathEnabled) {
      const path = this.pathfindingSystem.findPath(
        { x: this.player.x, y: this.player.y },
        { x: targetX, y: targetY }
      );

      if (path && path.length > 0) {
        this.currentPath = path;
        this.currentPathIndex = 1;
        this.isMoving = true;
        this.tutorialSystem.notifyPlayerMoved();
        EventManager.getInstance().emit('path:found', { path });
      } else {
        this.currentPath = [];
        this.moveTargetX = targetX;
        this.moveTargetY = targetY;
        this.isMoving = true;
        EventManager.getInstance().emit('path:blocked', { target: { x: targetX, y: targetY } });
      }
    } else {
      this.moveTargetX = targetX;
      this.moveTargetY = targetY;
      this.isMoving = true;
    }
  }

  private updatePlayerGlow(): void {
    if (!this.player) return;
    const glowImage = (this as any)._glowImage;
    if (glowImage) {
      glowImage.x = this.player.x;
      glowImage.y = this.player.y;
    }
  }

  private updatePlayerAnimation(time: number): void {
    if (!this.player) return;

    const pulse = 1 + Math.sin(time * 0.003) * 0.1;
    this.player.setScale(pulse);

    const isMoving = Math.abs(this.player.body.velocity.x) > 10 || Math.abs(this.player.body.velocity.y) > 10;
    if (this.trailParticles) {
      this.trailParticles.setQuantity(isMoving ? 3 : 0);
    }
  }

  public getPlayer(): Phaser.Physics.Arcade.Sprite | null {
    return this.player;
  }

  public getCollectRange(): number {
    return this.collectRangeSystem.getCurrentRange();
  }

  public getAttractRange(): number {
    return this.collectRangeSystem.getAttractRange();
  }

  public getObstacleSystem(): ObstacleSystem {
    return this.obstacleSystem;
  }

  public getCollectRangeSystem(): CollectRangeSystem {
    return this.collectRangeSystem;
  }

  public getTutorialSystem(): TutorialSystem {
    return this.tutorialSystem;
  }

  public getObstacles(): Obstacle[] {
    return this.obstacleSystem.getObstacles();
  }

  public destroy(): void {
    if (this.trailParticles) {
      this.trailParticles.stop();
      this.trailParticles.destroy();
    }
    if (this.joystickGraphics) {
      this.joystickGraphics.destroy();
    }
    if (this.pathPreviewGraphics) {
      this.pathPreviewGraphics.destroy();
    }
    if (this.targetIndicator) {
      this.targetIndicator.destroy();
    }
    this.obstacleSystem.destroy();
    this.collectRangeSystem.destroy();
    this.tutorialSystem.destroy();
  }
}
