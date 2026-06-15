import Phaser from 'phaser';
import { PetalType, PetalObject, Region, RegionHeat, ConsecutiveCollect, SpawnAdjustment } from '../types';
import { 
  PETAL_CONFIGS, 
  PETAL_SPAWN_INTERVAL, 
  MAX_PETALS_ON_SCREEN,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  REGIONS,
  HEAT_CONFIG,
  DECAY_CONFIG,
  BALANCE_CONFIG,
  TIME_EFFECTS,
  WEATHER_EFFECTS,
  SEASON_EFFECTS
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
  private player: Phaser.Physics.Arcade.Sprite | null = null;
  private manualCollectRange: number = 150;
  private efficiencyBoost: number = 0;
  private heatDecayTimer: number = 0;
  private decayRecoveryTimer: number = 0;
  private regionVisuals: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private heatIndicator: Phaser.GameObjects.Text | null = null;
  private decayIndicator: Phaser.GameObjects.Text | null = null;
  private currentSpawnAdjustments: SpawnAdjustment[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public setAutoCollectEnabled(enabled: boolean): void {
    this.autoCollectEnabled = enabled;
  }

  public setPlayer(player: Phaser.Physics.Arcade.Sprite | null): void {
    this.player = player;
  }

  public setEfficiencyBoost(boost: number): void {
    this.efficiencyBoost = boost;
  }

  public create(): void {
    this.createPetalTextures();
    this.petalGroup = this.scene.physics.add.group({
      allowGravity: false,
      immovable: false
    });

    this.createCollectParticles();
    this.createRegionVisuals();
    this.createStatusIndicators();
    this.spawnInitialPetals();
    this.setupSettingsListener();
    this.setupManualCollectInput();
  }

  private setupManualCollectInput(): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.autoCollectEnabled || !this.player) return;

      for (let i = this.petalPool.length - 1; i >= 0; i--) {
        const petal = this.petalPool[i];
        if (!petal.active || petal.isCollecting) continue;

        const clickDist = Phaser.Math.Distance.Between(
          petal.x, petal.y, pointer.worldX, pointer.worldY);
        const clickRadius = Math.max(petal.displayWidth, petal.displayHeight) * 0.8;

        if (clickDist < clickRadius) {
          const playerDist = Phaser.Math.Distance.Between(
            petal.x, petal.y, this.player.x, this.player.y);

          if (playerDist < this.manualCollectRange) {
            this.collectPetal(petal, this.player);
          } else {
            this.showManualCollectHint(petal.x, petal.y);
          }
          break;
        }
      }
    });
  }

  private showManualCollectHint(x: number, y: number): void {
    const hint = this.scene.add.text(x, y - 40, '距离太远', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ff6b6b',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(200).setScrollFactor(0);

    const screenX = this.scene.cameras.main.worldView.x + x;
    const screenY = this.scene.cameras.main.worldView.y + y;
    hint.x = screenX;
    hint.y = screenY - 40;

    this.scene.tweens.add({
      targets: hint,
      y: screenY - 70,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.Out',
      onComplete: () => hint.destroy()
    });
  }

  private createRegionVisuals(): void {
    REGIONS.forEach(region => {
      const graphics = this.scene.add.graphics();
      graphics.setDepth(5);
      graphics.setAlpha(0.15);
      
      const r = (region.color >> 16) & 255;
      const g = (region.color >> 8) & 255;
      const b = region.color & 255;
      
      graphics.fillStyle(region.color, 0.15);
      graphics.fillRoundedRect(region.x, region.y, region.width, region.height, 20);
      graphics.lineStyle(2, region.color, 0.3);
      graphics.strokeRoundedRect(region.x, region.y, region.width, region.height, 20);
      
      const label = this.scene.add.text(
        region.x + region.width / 2,
        region.y + 25,
        region.name,
        {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: `rgb(${r}, ${g}, ${b})`,
          align: 'center'
        }
      ).setOrigin(0.5).setDepth(6).setAlpha(0.6);
      
      this.regionVisuals.set(region.id, graphics);
    });
  }

  private createStatusIndicators(): void {
    this.heatIndicator = this.scene.add.text(20, 200, '', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffd93d',
      align: 'left',
      stroke: '#000000',
      strokeThickness: 2
    }).setDepth(100).setScrollFactor(0).setAlpha(0.9);

    this.decayIndicator = this.scene.add.text(20, 220, '', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ff6b6b',
      align: 'left',
      stroke: '#000000',
      strokeThickness: 2
    }).setDepth(100).setScrollFactor(0).setAlpha(0.9);
  }

  private getRegionAtPosition(x: number, y: number): Region | null {
    for (const region of REGIONS) {
      if (x >= region.x && x <= region.x + region.width &&
          y >= region.y && y <= region.y + region.height) {
        return region;
      }
    }
    return null;
  }

  private updateRegionHeat(regionId: string, isCollect: boolean = true): void {
    const state = SaveManager.getInstance().getGameState();
    const regionHeat = state.regionHeats.find(r => r.regionId === regionId);
    
    if (!regionHeat) return;

    if (isCollect) {
      regionHeat.currentHeat = Math.min(
        HEAT_CONFIG.maxHeat,
        regionHeat.currentHeat + HEAT_CONFIG.heatIncreasePerCollect
      );
      regionHeat.collectCount++;
      regionHeat.lastCollectTime = Date.now();
    }

    this.updateRegionVisual(regionId, regionHeat.currentHeat);
  }

  private updateRegionVisual(regionId: string, heat: number): void {
    const graphics = this.regionVisuals.get(regionId);
    if (!graphics) return;

    const region = REGIONS.find(r => r.id === regionId);
    if (!region) return;

    const heatRatio = Math.min(heat / HEAT_CONFIG.maxHeat, 1);
    graphics.setAlpha(0.1 + heatRatio * 0.25);
    
    graphics.clear();
    graphics.fillStyle(region.color, 0.1 + heatRatio * 0.25);
    graphics.fillRoundedRect(region.x, region.y, region.width, region.height, 20);
    graphics.lineStyle(2 + heatRatio * 3, region.color, 0.3 + heatRatio * 0.4);
    graphics.strokeRoundedRect(region.x, region.y, region.width, region.height, 20);
  }

  private updateConsecutiveCollect(petalType: PetalType): ConsecutiveCollect | null {
    const state = SaveManager.getInstance().getGameState();
    const now = Date.now();

    if (!state.consecutiveCollect) {
      state.consecutiveCollect = {
        petalType,
        count: 1,
        lastCollectTime: now,
        currentDecay: 0
      };
    } else {
      if (state.consecutiveCollect.petalType === petalType) {
        if (now - state.consecutiveCollect.lastCollectTime < DECAY_CONFIG.resetTimeWindow) {
          state.consecutiveCollect.count++;
          state.consecutiveCollect.lastCollectTime = now;
          
          if (state.consecutiveCollect.count >= DECAY_CONFIG.decayStartThreshold) {
            const decaySteps = state.consecutiveCollect.count - DECAY_CONFIG.decayStartThreshold + 1;
            state.consecutiveCollect.currentDecay = Math.min(
              DECAY_CONFIG.maxDecay,
              decaySteps * DECAY_CONFIG.decayPerCollect
            );
          }
        } else {
          state.consecutiveCollect = {
            petalType,
            count: 1,
            lastCollectTime: now,
            currentDecay: 0
          };
        }
      } else {
        state.consecutiveCollect = {
          petalType,
          count: 1,
          lastCollectTime: now,
          currentDecay: 0
        };
      }
    }

    return state.consecutiveCollect;
  }

  private getBalanceMultiplier(petalType: PetalType): number {
    const config = PETAL_CONFIGS[petalType];
    const level = config.level;
    
    if (level >= 7) return 1 - BALANCE_CONFIG.level7Reduction;
    if (level >= 6) return 1 - BALANCE_CONFIG.level6Reduction;
    if (level >= 5) return 1 - BALANCE_CONFIG.level5Reduction;
    if (level >= 4) return 1 - BALANCE_CONFIG.level4Reduction;
    if (level >= 3) return 1 - BALANCE_CONFIG.level3Reduction;
    
    return 1;
  }

  private calculateSpawnAdjustments(): SpawnAdjustment[] {
    const state = SaveManager.getInstance().getGameState();
    const adjustments: SpawnAdjustment[] = [];
    const spawnableTypes = Object.values(PetalType).filter(type => PETAL_CONFIGS[type].spawnWeight > 0);

    const env = state.environment;

    spawnableTypes.forEach(type => {
      const config = PETAL_CONFIGS[type];
      let heatMultiplier = 1;
      
      state.regionHeats.forEach(regionHeat => {
        const region = REGIONS.find(r => r.id === regionHeat.regionId);
        if (region && region.preferredPetals.includes(type)) {
          const heatBonus = (regionHeat.currentHeat - region.baseHeat) * HEAT_CONFIG.heatBonusWeight;
          heatMultiplier = Math.max(heatMultiplier, 1 + heatBonus);
        }
      });

      if (config.level >= 5 && heatMultiplier > 1) {
        heatMultiplier = 1 + (heatMultiplier - 1) * BALANCE_CONFIG.heatBoostForRare;
      }

      let decayMultiplier = 1;
      if (state.consecutiveCollect && state.consecutiveCollect.petalType === type) {
        decayMultiplier = 1 - state.consecutiveCollect.currentDecay * DECAY_CONFIG.decayPenaltyWeight;
      }

      const balanceMultiplier = this.getBalanceMultiplier(type);
      
      let timeMultiplier = 1;
      let weatherMultiplier = 1;
      let seasonMultiplier = 1;
      
      if (env) {
        const timeEffect = TIME_EFFECTS[env.time.timeOfDay];
        if (timeEffect && timeEffect.spawnWeightModifier[type]) {
          timeMultiplier = timeEffect.spawnWeightModifier[type]!;
        }
        
        const weatherEffect = WEATHER_EFFECTS[env.weather.currentWeather];
        if (weatherEffect && weatherEffect.spawnWeightModifier[type]) {
          weatherMultiplier = weatherEffect.spawnWeightModifier[type]!;
        }
        
        const seasonEffect = SEASON_EFFECTS[env.time.season];
        if (seasonEffect && seasonEffect.spawnWeightModifier[type]) {
          seasonMultiplier = seasonEffect.spawnWeightModifier[type]!;
        }
      }
      
      const finalWeight = Math.max(
        BALANCE_CONFIG.minSpawnWeight,
        config.spawnWeight * heatMultiplier * decayMultiplier * balanceMultiplier * timeMultiplier * weatherMultiplier * seasonMultiplier
      );

      adjustments.push({
        type,
        heatMultiplier,
        decayMultiplier,
        timeMultiplier,
        weatherMultiplier,
        seasonMultiplier,
        finalWeight
      });
    });

    this.currentSpawnAdjustments = adjustments;
    return adjustments;
  }

  private getRandomPetalType(): PetalType {
    const adjustments = this.calculateSpawnAdjustments();
    const totalWeight = adjustments.reduce((sum, adj) => sum + adj.finalWeight, 0);
    let random = Math.random() * totalWeight;

    for (const adj of adjustments) {
      random -= adj.finalWeight;
      if (random <= 0) {
        return adj.type;
      }
    }
    
    return PetalType.MOONLIGHT;
  }

  private updateStatusIndicators(): void {
    const state = SaveManager.getInstance().getGameState();
    
    if (this.player) {
      const playerRegion = this.getRegionAtPosition(this.player.x, this.player.y);
      if (playerRegion) {
        const regionHeat = state.regionHeats.find(r => r.regionId === playerRegion.id);
        if (regionHeat && regionHeat.currentHeat > 1.1) {
          const heatPercent = Math.round((regionHeat.currentHeat - 1) * 100);
          this.heatIndicator?.setText(`🔥 ${playerRegion.name}热度 +${heatPercent}%`);
        } else {
          this.heatIndicator?.setText('');
        }
      } else {
        this.heatIndicator?.setText('');
      }
    }

    if (state.consecutiveCollect && state.consecutiveCollect.currentDecay > 0) {
      const config = PETAL_CONFIGS[state.consecutiveCollect.petalType];
      const decayPercent = Math.round(state.consecutiveCollect.currentDecay * 100);
      this.decayIndicator?.setText(`⚠️ ${config.name}连采衰减 -${decayPercent}%`);
    } else {
      this.decayIndicator?.setText('');
    }
  }

  private processHeatDecay(delta: number): void {
    this.heatDecayTimer += delta;
    if (this.heatDecayTimer >= HEAT_CONFIG.heatDecayInterval) {
      this.heatDecayTimer = 0;
      const state = SaveManager.getInstance().getGameState();
      
      state.regionHeats.forEach(regionHeat => {
        const region = REGIONS.find(r => r.id === regionHeat.regionId);
        if (!region) return;

        if (regionHeat.currentHeat > region.baseHeat) {
          regionHeat.currentHeat = Math.max(
            region.baseHeat,
            regionHeat.currentHeat - HEAT_CONFIG.heatDecayAmount
          );
          this.updateRegionVisual(regionHeat.regionId, regionHeat.currentHeat);
        }
      });
    }
  }

  private processDecayRecovery(delta: number): void {
    this.decayRecoveryTimer += delta;
    if (this.decayRecoveryTimer >= DECAY_CONFIG.decayRecoveryInterval) {
      this.decayRecoveryTimer = 0;
      const state = SaveManager.getInstance().getGameState();
      
      if (state.consecutiveCollect && state.consecutiveCollect.currentDecay > 0) {
        const now = Date.now();
        if (now - state.consecutiveCollect.lastCollectTime > DECAY_CONFIG.resetTimeWindow) {
          state.consecutiveCollect.currentDecay = Math.max(
            0,
            state.consecutiveCollect.currentDecay - DECAY_CONFIG.decayRecoveryRate
          );
          
          if (state.consecutiveCollect.currentDecay <= 0) {
            state.consecutiveCollect = null;
          }
        }
      }
    }
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

    const region = this.getRegionAtPosition(x, y);
    const regionHeat = region 
      ? SaveManager.getInstance().getGameState().regionHeats.find(r => r.regionId === region.id)
      : null;

    const adjustment = this.currentSpawnAdjustments.find(a => a.type === type);

    const petal = this.petalGroup.get(x, y, `petal_${type}`) as PetalObject;
    if (!petal) return;

    petal.petalType = type;
    petal.isCollecting = false;
    petal.floatOffset = Math.random() * Math.PI * 2;
    petal.regionId = region?.id;
    petal.spawnTime = Date.now();
    petal.heatBonus = adjustment?.heatMultiplier && adjustment.heatMultiplier > 1 
      ? (adjustment.heatMultiplier - 1) * 100 
      : 0;
    petal.decayPenalty = adjustment?.decayMultiplier && adjustment.decayMultiplier < 1
      ? (1 - adjustment.decayMultiplier) * 100
      : 0;
    
    petal.setActive(true);
    petal.setVisible(true);
    petal.setSize(30, 30);
    
    let baseSize = 40 + config.level * 5;
    if (petal.heatBonus > 0) {
      baseSize *= 1 + Math.min(petal.heatBonus / 200, 0.3);
    }
    if (petal.decayPenalty > 0) {
      baseSize *= 1 - Math.min(petal.decayPenalty / 200, 0.2);
    }
    
    petal.setDisplaySize(baseSize, baseSize);
    petal.setDepth(15);
    petal.setBlendMode(Phaser.BlendModes.ADD);

    if (petal.heatBonus > 10) {
      const pulseTween = this.scene.tweens.add({
        targets: petal,
        scale: { 
          from: baseSize / (40 + config.level * 5), 
          to: (baseSize / (40 + config.level * 5)) * 1.15 
        },
        alpha: { from: 1, to: 0.85 },
        duration: 800 + (200 - Math.min(petal.heatBonus, 200)),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      (petal as any)._pulseTween = pulseTween;
    }

    if (petal.decayPenalty > 10) {
      petal.setAlpha(0.85 - Math.min(petal.decayPenalty / 300, 0.3));
      petal.setTint(0xcccccc);
    }
    
    this.petalPool.push(petal);
    EventManager.getInstance().emit('petal:spawned', { 
      type, x, y, 
      regionId: region?.id,
      heatBonus: petal.heatBonus,
      decayPenalty: petal.decayPenalty
    });
  }

  public update(time: number, delta: number, player: Phaser.Physics.Arcade.Sprite | null, collectRange: number = 80, attractRange: number = 150): void {
    if (player !== this.player) {
      this.player = player;
    }
    
    const adjustedInterval = this.efficiencyBoost > 0 
      ? PETAL_SPAWN_INTERVAL / (1 + this.efficiencyBoost) 
      : PETAL_SPAWN_INTERVAL;
    
    this.spawnTimer += delta;
    if (this.spawnTimer >= adjustedInterval && this.petalGroup && this.petalGroup.getLength() < MAX_PETALS_ON_SCREEN) {
      this.spawnPetal();
      this.spawnTimer = 0;
    }

    this.processHeatDecay(delta);
    this.processDecayRecovery(delta);
    this.updateStatusIndicators();

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

        if (this.autoCollectEnabled && distance < collectRange) {
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
    const region = petal.regionId ? this.getRegionAtPosition(petal.x, petal.y) : null;

    if (this.collectParticles) {
      this.collectParticles.setParticleTint(config.glowColor);
      this.collectParticles.emitParticleAt(petal.x, petal.y);
    }

    if (region) {
      this.updateRegionHeat(region.id, true);
    }

    const consecutiveInfo = this.updateConsecutiveCollect(type);

    let collectBonus = '';
    if (petal.heatBonus && petal.heatBonus > 0) {
      collectBonus += `🔥+${Math.round(petal.heatBonus)}% `;
    }
    if (consecutiveInfo && consecutiveInfo.currentDecay > 0) {
      collectBonus += `⚠️-${Math.round(consecutiveInfo.currentDecay * 100)}%`;
    }

    if ((petal as any)._pulseTween) {
      (petal as any)._pulseTween.stop();
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
        petal.clearTint();
        
        const state = SaveManager.getInstance().addPetal(type, 1);
        
        EventManager.getInstance().emit('petal:collected', { 
          type, 
          count: 1,
          regionId: region?.id,
          heatBonus: petal.heatBonus || 0,
          decayPenalty: petal.decayPenalty || 0,
          consecutiveCount: consecutiveInfo?.count || 0,
          collectBonus
        });
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
    
    this.petalPool.forEach(petal => {
      if ((petal as any)._pulseTween) {
        (petal as any)._pulseTween.stop();
      }
    });
    
    if (this.petalGroup) {
      this.petalGroup.destroy();
    }
    this.petalPool = [];
    
    this.regionVisuals.forEach(graphics => {
      graphics.destroy();
    });
    this.regionVisuals.clear();
    
    if (this.heatIndicator) {
      this.heatIndicator.destroy();
    }
    if (this.decayIndicator) {
      this.decayIndicator.destroy();
    }
  }
}
