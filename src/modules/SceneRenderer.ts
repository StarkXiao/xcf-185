import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT, GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';

export class SceneRenderer {
  private scene: Phaser.Scene;
  private backgroundLayers: Phaser.GameObjects.TileSprite[] = [];
  private fireflyParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private starParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private lightBeams: Phaser.GameObjects.Graphics[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public create(): void {
    this.createBackground();
    this.createStarfield();
    this.createFireflies();
    this.createLightBeams();
    this.createForestSilhouette();
  }

  private createBackground(): void {
    const gradientGraphics = this.scene.add.graphics();
    const gradient = this.scene.textures.createCanvas('bg_gradient', WORLD_WIDTH, WORLD_HEIGHT);
    const ctx = gradient.getContext();
    
    const bgGradient = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    bgGradient.addColorStop(0, '#0a0514');
    bgGradient.addColorStop(0.3, '#1a0a2e');
    bgGradient.addColorStop(0.6, '#0d1a26');
    bgGradient.addColorStop(1, '#0d2818');
    
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    gradient.refresh();
    
    const bg = this.scene.add.image(0, 0, 'bg_gradient')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(-10);

    const fogGradient = this.scene.textures.createCanvas('fog_gradient', WORLD_WIDTH, WORLD_HEIGHT);
    const fogCtx = fogGradient.getContext();
    const fogGrad = fogCtx.createRadialGradient(
      WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 0,
      WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH
    );
    fogGrad.addColorStop(0, 'rgba(100, 50, 150, 0)');
    fogGrad.addColorStop(1, 'rgba(30, 10, 50, 0.4)');
    fogCtx.fillStyle = fogGrad;
    fogCtx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    fogGradient.refresh();

    this.scene.add.image(0, 0, 'fog_gradient')
      .setOrigin(0, 0)
      .setScrollFactor(0.2)
      .setDepth(-5);
  }

  private createStarfield(): void {
    const starCanvas = this.scene.textures.createCanvas('stars', WORLD_WIDTH, WORLD_HEIGHT);
    const ctx = starCanvas.getContext();
    
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * WORLD_WIDTH;
      const y = Math.random() * WORLD_HEIGHT * 0.7;
      const size = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.8 + 0.2;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }
    starCanvas.refresh();

    this.scene.add.image(0, 0, 'stars')
      .setOrigin(0, 0)
      .setScrollFactor(0.1)
      .setDepth(-8);

    this.starParticles = this.scene.add.particles(0, 0, 'pixel_white', {
      x: { min: 0, max: WORLD_WIDTH },
      y: { min: 0, max: WORLD_HEIGHT * 0.5 },
      lifespan: { min: 2000, max: 4000 },
      speedY: { min: -5, max: 5 },
      speedX: { min: -10, max: 10 },
      scale: { start: 0, end: 2 },
      alpha: { start: 0, end: 0.8 },
      quantity: 1,
      blendMode: 'ADD',
      follow: this.scene.cameras.main,
      followOffset: { x: -GAME_WIDTH / 2, y: -GAME_HEIGHT / 2 }
    }).setDepth(-7);
  }

  private createFireflies(): void {
    this.fireflyParticles = this.scene.add.particles(0, 0, 'pixel_yellow', {
      x: { min: 0, max: WORLD_WIDTH },
      y: { min: WORLD_HEIGHT * 0.3, max: WORLD_HEIGHT },
      lifespan: { min: 3000, max: 6000 },
      speedY: { min: -20, max: 20 },
      speedX: { min: -30, max: 30 },
      scale: { start: 1, end: 3 },
      alpha: { start: 0.2, end: 0.8 },
      quantity: 2,
      frequency: 500,
      blendMode: 'ADD',
      gravityY: -5
    }).setDepth(5);
  }

  private createLightBeams(): void {
    for (let i = 0; i < 5; i++) {
      const beam = this.scene.add.graphics();
      const x = (WORLD_WIDTH / 6) * (i + 1);
      const width = 50 + Math.random() * 100;
      
      beam.fillGradientStyle(0x88ccff, 0x88ccff, 0x88ccff, 0x88ccff, 0.1, 0.1, 0, 0);
      beam.beginPath();
      beam.moveTo(x - width / 2, 0);
      beam.lineTo(x + width / 2, 0);
      beam.lineTo(x + width, WORLD_HEIGHT);
      beam.lineTo(x - width, WORLD_HEIGHT);
      beam.closePath();
      beam.fill();
      beam.setScrollFactor(0.3).setDepth(-6).setAlpha(0.15);
      
      this.lightBeams.push(beam);
    }
  }

  private createForestSilhouette(): void {
    const forestCanvas = this.scene.textures.createCanvas('forest_bg', WORLD_WIDTH, WORLD_HEIGHT);
    const ctx = forestCanvas.getContext();
    
    ctx.fillStyle = '#0a1a12';
    for (let x = 0; x < WORLD_WIDTH; x += 80) {
      const height = 200 + Math.random() * 300;
      const width = 60 + Math.random() * 40;
      this.drawTree(ctx, x, WORLD_HEIGHT - height, width, height);
    }
    forestCanvas.refresh();

    this.scene.add.image(0, 0, 'forest_bg')
      .setOrigin(0, 0)
      .setScrollFactor(0.4)
      .setDepth(-4);

    const forestMidCanvas = this.scene.textures.createCanvas('forest_mid', WORLD_WIDTH, WORLD_HEIGHT);
    const midCtx = forestMidCanvas.getContext();
    
    midCtx.fillStyle = '#0d2818';
    for (let x = 0; x < WORLD_WIDTH; x += 60) {
      const height = 250 + Math.random() * 350;
      const width = 70 + Math.random() * 50;
      this.drawTree(midCtx, x, WORLD_HEIGHT - height, width, height);
    }
    forestMidCanvas.refresh();

    this.scene.add.image(0, 0, 'forest_mid')
      .setOrigin(0, 0)
      .setScrollFactor(0.6)
      .setDepth(-3);

    const grassCanvas = this.scene.textures.createCanvas('grass_fg', WORLD_WIDTH, 200);
    const grassCtx = grassCanvas.getContext();
    
    for (let x = 0; x < WORLD_WIDTH; x += 15) {
      const height = 30 + Math.random() * 50;
      const sway = Math.sin(x * 0.1) * 10;
      
      grassCtx.beginPath();
      grassCtx.moveTo(x, 200);
      grassCtx.quadraticCurveTo(x + sway, 200 - height / 2, x + sway * 1.5, 200 - height);
      grassCtx.quadraticCurveTo(x + sway, 200 - height / 2, x + 5, 200);
      grassCtx.fillStyle = `hsl(${120 + Math.random() * 20}, 40%, ${15 + Math.random() * 10}%)`;
      grassCtx.fill();
    }
    grassCanvas.refresh();

    this.scene.add.image(0, WORLD_HEIGHT - 200, 'grass_fg')
      .setOrigin(0, 0)
      .setScrollFactor(1)
      .setDepth(10);
  }

  private drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    ctx.beginPath();
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width * 0.4, y + height);
    ctx.lineTo(x + width * 0.3, y + height * 0.6);
    ctx.lineTo(x - width * 0.1, y + height * 0.5);
    ctx.lineTo(x + width * 0.2, y + height * 0.4);
    ctx.lineTo(x - width * 0.2, y + height * 0.3);
    ctx.lineTo(x + width * 0.1, y + height * 0.15);
    ctx.lineTo(x + width * 0.3, y);
    ctx.lineTo(x + width * 0.5, y + height * 0.1);
    ctx.lineTo(x + width * 0.7, y);
    ctx.lineTo(x + width * 0.9, y + height * 0.15);
    ctx.lineTo(x + width * 0.6, y + height * 0.3);
    ctx.lineTo(x + width * 1.2, y + height * 0.4);
    ctx.lineTo(x + width * 0.9, y + height * 0.5);
    ctx.lineTo(x + width * 0.7, y + height * 0.6);
    ctx.lineTo(x + width * 0.6, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.closePath();
    ctx.fill();
  }

  public update(time: number, delta: number): void {
    this.lightBeams.forEach((beam, index) => {
      const sway = Math.sin(time * 0.0003 + index) * 0.02;
      beam.setAlpha(0.1 + Math.abs(sway) * 0.1);
    });
  }

  public destroy(): void {
    if (this.fireflyParticles) {
      this.fireflyParticles.stop();
      this.fireflyParticles.destroy();
    }
    if (this.starParticles) {
      this.starParticles.stop();
      this.starParticles.destroy();
    }
  }
}
