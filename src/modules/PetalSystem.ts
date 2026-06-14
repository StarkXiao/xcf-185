import Phaser from 'phaser';
import { PetalType, PetalObject } from '../types';
import { 
  PETAL_CONFIGS, 
  PETAL_SPAWN_INTERVAL, 
  MAX_PETALS_ON_SCREEN,
  WORLD_WIDTH,
  WORLD_HEIGHT
} from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { EventManager } from '../managers/EventManager';
import { SettingsManager } from '../managers/SettingsManager';

export class PetalSystem {
  private scene: Phaser.Scene;
  private petalGroup: Phaser.Physics.Arcade.Group | null = null;
  private petalPool: PetalObject[] = [];
  private spawnTimer: number = 0;
  private collectParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private autoCollectEnabled: boolean = true;
  private eventListeners: Array<{ event: string; callback: (data: any) => void }> = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public setAutoCollectEnabled(enabled: boolean): void {
    this.autoCollectEnabled = enabled;
  }

  public create(): void {
    this.createPetalTextures();
    this.petalGroup = this.scene.physics.add.group({
      allowGravity: false,
      immovable: false
    });

    this.createCollectParticles();
    this.spawnInitialPetals();
    this.setupSettingsListener();
  }

  private setupSettingsListener(): void {
    const settings = SettingsManager.getInstance().getControlSettings();
    this.autoCollectEnabled = settings.autoCollectEnabled;

    const onSettingsUpdated = (data: { settings: any }) => {
      this.autoCollectEnabled = data.settings.autoCollectEnabled;
    };
    EventManager.getInstance().on('settings:updated', onSettingsUpdated);
    this.eventListeners.push({ event: 'settings:updated', callback: onSettingsUpdated });
  }

  private createPetalTextures(): void {
    Object.values(PetalType).forEach(type => {
      const textureKey = `petal_${type}`;
      if (!this.scene.textures.exists(textureKey)) {
        this.createPetalTexture(type);
      }
    });
  }

  private createPetalTexture(type: PetalType): void {
    const config = PETAL_CONFIGS[type];
    const size = 32 + config.level * 8;
    const textureKey = `petal_${type}`;
    
    const canvas = this.scene.textures.createCanvas(textureKey, size * 2, size * 2);
    const ctx = canvas.getContext();
    const centerX = size;
    const centerY = size;

    const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size * 1.5);
    glowGradient.addColorStop(0, `rgba(${this.hexToRgb(config.glowColor)}, 0.8)`);
    glowGradient.addColorStop(0.5, `rgba(${this.hexToRgb(config.glowColor)}, 0.3)`);
    glowGradient.addColorStop(1, `rgba(${this.hexToRgb(config.glowColor)}, 0)`);
    
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, size * 1.5, 0, Math.PI * 2);
    ctx.fill();

    const petalColor = `#${config.color.toString(16).padStart(6, '0')}`;
    const petalGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size);
    petalGradient.addColorStop(0, '#ffffff');
    petalGradient.addColorStop(0.3, petalColor);
    petalGradient.addColorStop(1, `rgba(${this.hexToRgb(config.color)}, 0.5)`);

    const petalCount = 5 + config.level;
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const petalLength = size * 0.8;
      const petalWidth = size * 0.3;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(petalWidth, -petalLength * 0.3, 0, -petalLength);
      ctx.quadraticCurveTo(-petalWidth, -petalLength * 0.3, 0, 0);
      ctx.fillStyle = petalGradient;
      ctx.fill();
      
      ctx.restore();
    }

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(centerX, centerY, size * 0.2, 0, Math.PI * 2);
    ctx.fill();

    canvas.refresh();
  }

  private hexToRgb(hex: number): string {
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    return `${r}, ${g}, ${b}`;
  }

  private createCollectParticles(): void {
    this.collectParticles = this.scene.add.particles(0, 0, 'pixel_white', {
      lifespan: 600,
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 4, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 8,
      blendMode: 'ADD',
      emitting: false
    }).setDepth(50);
  }

  private spawnInitialPetals(): void {
    for (let i = 0; i < 8; i++) {
      this.spawnPetal();
    }
  }

  private spawnPetal(): void {
    if (!this.petalGroup) return;

    const type = this.getRandomPetalType();
    const config = PETAL_CONFIGS[type];
    
    const padding = 100;
    const x = padding + Math.random() * (WORLD_WIDTH - padding * 2);
    const y = padding + Math.random() * (WORLD_HEIGHT - padding * 2);

    const petal = this.petalGroup.get(x, y, `petal_${type}`) as PetalObject;
    if (!petal) return;

    petal.petalType = type;
    petal.isCollecting = false;
    petal.floatOffset = Math.random() * Math.PI * 2;
    
    petal.setActive(true);
    petal.setVisible(true);
    petal.setSize(30, 30);
    petal.setDisplaySize(40 + config.level * 5, 40 + config.level * 5);
    petal.setDepth(15);
    petal.setBlendMode(Phaser.BlendModes.ADD);
    
    this.petalPool.push(petal);
    EventManager.getInstance().emit('petal:spawned', { type, x, y });
  }

  private getRandomPetalType(): PetalType {
    const spawnableTypes = Object.values(PetalType).filter(type => PETAL_CONFIGS[type].spawnWeight > 0);
    const totalWeight = spawnableTypes.reduce((sum, type) => sum + PETAL_CONFIGS[type].spawnWeight, 0);
    let random = Math.random() * totalWeight;

    for (const type of spawnableTypes) {
      random -= PETAL_CONFIGS[type].spawnWeight;
      if (random <= 0) {
        return type;
      }
    }
    return PetalType.MOONLIGHT;
  }

  public update(time: number, delta: number, player: Phaser.Physics.Arcade.Sprite | null, collectRange: number = 80, attractRange: number = 150): void {
    this.spawnTimer += delta;
    if (this.spawnTimer >= PETAL_SPAWN_INTERVAL && this.petalGroup && this.petalGroup.getLength() < MAX_PETALS_ON_SCREEN) {
      this.spawnPetal();
      this.spawnTimer = 0;
    }

    this.updatePetals(time, delta, player, collectRange, attractRange);
  }

  private updatePetals(time: number, delta: number, player: Phaser.Physics.Arcade.Sprite | null, collectRange: number, attractRange: number): void {
    const alive: PetalObject[] = [];

    this.petalPool.forEach((petal) => {
      if (!petal.active) return;

      if (petal.isCollecting) {
        alive.push(petal);
        return;
      }

      const floatY = Math.sin(time * 0.002 + petal.floatOffset) * 5;
      const floatX = Math.cos(time * 0.0015 + petal.floatOffset) * 3;
      petal.y += floatY * 0.016;
      petal.x += floatX * 0.016;
      
      petal.rotation += 0.005;

      if (player) {
        const distance = Phaser.Math.Distance.Between(petal.x, petal.y, player.x, player.y);

        if (distance < collectRange) {
          this.collectPetal(petal, player);
        } else if (this.autoCollectEnabled && distance < attractRange) {
          const angle = Phaser.Math.Angle.Between(petal.x, petal.y, player.x, player.y);
          const speed = (1 - distance / attractRange) * 150;
          petal.x += Math.cos(angle) * speed * 0.016;
          petal.y += Math.sin(angle) * speed * 0.016;
        }
      }

      alive.push(petal);
    });

    this.petalPool = alive;
  }

  private collectPetal(petal: PetalObject, player: Phaser.Physics.Arcade.Sprite): void {
    if (petal.isCollecting) return;
    petal.isCollecting = true;

    const type = petal.petalType;
    const config = PETAL_CONFIGS[type];

    if (this.collectParticles) {
      this.collectParticles.setParticleTint(config.glowColor);
      this.collectParticles.emitParticleAt(petal.x, petal.y);
    }

    this.scene.tweens.add({
      targets: petal,
      x: player.x,
      y: player.y,
      scale: 0,
      alpha: 0,
      duration: 300,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        petal.setActive(false);
        petal.setVisible(false);
        
        const state = SaveManager.getInstance().addPetal(type, 1);
        EventManager.getInstance().emit('petal:collected', { type, count: 1 });
        EventManager.getInstance().emit('audio:play', { key: 'sfx_collect', volume: 0.3 });
      }
    });
  }

  public spawnSynthesisResult(type: PetalType, x: number, y: number, isMutation: boolean = false): void {
    if (!this.petalGroup) return;

    const config = PETAL_CONFIGS[type];
    const petal = this.petalGroup.get(x, y, `petal_${type}`) as PetalObject;
    if (!petal) return;

    petal.petalType = type;
    petal.isCollecting = false;
    petal.floatOffset = Math.random() * Math.PI * 2;
    
    petal.setActive(true);
    petal.setVisible(true);
    petal.setSize(30, 30);
    
    const baseSize = 60 + config.level * 10;
    const sizeMultiplier = isMutation ? 1.3 : config.isFailed ? 0.7 : 1;
    petal.setDisplaySize(baseSize * sizeMultiplier, baseSize * sizeMultiplier);
    petal.setDepth(60);
    
    if (config.isFailed) {
      petal.setBlendMode(Phaser.BlendModes.NORMAL);
    } else {
      petal.setBlendMode(Phaser.BlendModes.ADD);
    }
    
    petal.setAlpha(0);
    petal.setScale(0);

    if (isMutation) {
      this.scene.tweens.add({
        targets: petal,
        alpha: 1,
        scale: 1,
        duration: 800,
        ease: 'Elastic.out'
      });
      
      this.scene.tweens.add({
        targets: petal,
        scale: { from: 1, to: 1.1 },
        yoyo: true,
        repeat: 3,
        duration: 300,
        delay: 800
      });
    } else if (config.isFailed) {
      this.scene.tweens.add({
        targets: petal,
        alpha: { from: 0, to: 0.8 },
        scale: 1,
        duration: 400,
        ease: 'Cubic.out'
      });
      
      this.scene.tweens.add({
        targets: petal,
        y: y + 30,
        alpha: 0.6,
        duration: 600,
        delay: 400,
        ease: 'Cubic.In'
      });
    } else {
      this.scene.tweens.add({
        targets: petal,
        alpha: 1,
        scale: 1,
        duration: 500,
        ease: 'Elastic.out'
      });
    }

    this.petalPool.push(petal);

    if (this.collectParticles) {
      if (isMutation) {
        const colors = [0xffaa00, 0xff6600, config.glowColor];
        colors.forEach((color, i) => {
          this.scene.time.delayedCall(i * 100, () => {
            this.collectParticles!.setParticleTint(color);
            this.collectParticles!.emitParticleAt(x, y, 15);
          });
        });
      } else if (config.isFailed) {
        this.collectParticles.setParticleTint(0x666666);
        this.collectParticles.emitParticleAt(x, y, 10);
      } else {
        this.collectParticles.setParticleTint(config.glowColor);
        this.collectParticles.emitParticleAt(x, y, 20);
      }
    }
  }

  public getPetalGroup(): Phaser.Physics.Arcade.Group | null {
    return this.petalGroup;
  }

  public destroy(): void {
    this.eventListeners.forEach(({ event, callback }) => {
      EventManager.getInstance().off(event as any, callback);
    });
    this.eventListeners = [];
    
    if (this.collectParticles) {
      this.collectParticles.stop();
      this.collectParticles.destroy();
    }
    if (this.petalGroup) {
      this.petalGroup.destroy();
    }
    this.petalPool = [];
  }
}
