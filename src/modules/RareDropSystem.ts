import Phaser from 'phaser';
import { 
  RareDropEvent, 
  PetalType, 
  TimeOfDay, 
  WeatherType, 
  SeasonType,
  EnvironmentState,
  StatusType
} from '../types';
import { 
  RARE_DROP_EVENTS, 
  TIME_EFFECTS, 
  WEATHER_EFFECTS,
  INITIAL_ENVIRONMENT,
  INITIAL_ENVIRONMENT_STATS,
  WORLD_WIDTH,
  WORLD_HEIGHT
} from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { EventManager } from '../managers/EventManager';
import { PetalSystem } from './PetalSystem';

export class RareDropSystem {
  private scene: Phaser.Scene;
  private petalSystem: PetalSystem | null = null;
  private eventListeners: Array<{ event: string; callback: (data: any) => void }> = [];
  
  private rareDropPetals: Map<string, Phaser.Physics.Arcade.Sprite> = new Map();
  private rareDropGlows: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private announcementTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  
  private checkTimer: number = 0;
  private readonly CHECK_INTERVAL: number = 5000;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public setPetalSystem(petalSystem: PetalSystem): void {
    this.petalSystem = petalSystem;
  }

  public create(): void {
    const state = SaveManager.getInstance().getGameState();
    if (!state.environment || !state.environment.time) {
      state.environment = JSON.parse(JSON.stringify(INITIAL_ENVIRONMENT));
    }
    
    if (!state.rareDropEvents || state.rareDropEvents.length === 0) {
      state.rareDropEvents = RARE_DROP_EVENTS.map(event => ({
        ...event,
        lastTriggered: 0,
        count: 0
      }));
    }
    
    if (!state.environmentStats) {
      state.environmentStats = JSON.parse(JSON.stringify(INITIAL_ENVIRONMENT_STATS));
    }
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const onTimeChanged = (data: any) => {
      this.checkRareDrops('time', data);
    };
    
    const onWeatherChanged = (data: any) => {
      this.checkRareDrops('weather', data);
    };
    
    const onSeasonChanged = (data: any) => {
      this.checkRareDrops('season', data);
    };
    
    const onPetalCollected = () => {
      const state = SaveManager.getInstance().getGameState();
      if (state.totalCollected > 0 && state.totalCollected % 100 === 0) {
        this.checkRareDrops('milestone', { totalCollected: state.totalCollected });
      }
    };
    
    EventManager.getInstance().on('time:changed', onTimeChanged);
    EventManager.getInstance().on('weather:changed', onWeatherChanged);
    EventManager.getInstance().on('season:changed', onSeasonChanged);
    EventManager.getInstance().on('petal:collected', onPetalCollected);
    
    this.eventListeners.push({ event: 'time:changed', callback: onTimeChanged });
    this.eventListeners.push({ event: 'weather:changed', callback: onWeatherChanged });
    this.eventListeners.push({ event: 'season:changed', callback: onSeasonChanged });
    this.eventListeners.push({ event: 'petal:collected', callback: onPetalCollected });
  }

  public update(time: number, delta: number): void {
    this.checkTimer += delta;
    
    if (this.checkTimer >= this.CHECK_INTERVAL) {
      this.checkTimer = 0;
      this.checkRareDrops('random', {});
      this.updateRareDropVisuals(delta);
    }
    
    this.updateRareDropAnimations(delta);
  }

  private checkRareDrops(triggerType: string, data: any): void {
    const state = SaveManager.getInstance().getGameState();
    const env = state.environment;
    
    if (!env) return;
    
    const now = Date.now();
    
    for (const eventConfig of state.rareDropEvents) {
      if (eventConfig.trigger !== triggerType) continue;
      
      if (!this.checkTriggerCondition(eventConfig, env, data)) continue;
      
      if (now - eventConfig.lastTriggered < eventConfig.cooldown) continue;
      
      if (eventConfig.count >= eventConfig.maxCount && eventConfig.maxCount > 0) continue;
      
      const probability = this.calculateAdjustedProbability(eventConfig, env);
      
      if (Math.random() < probability) {
        this.spawnRareDrop(eventConfig, env);
      }
    }
  }

  private checkTriggerCondition(event: RareDropEvent, env: EnvironmentState, data: any): boolean {
    switch (event.trigger) {
      case 'time':
        if (event.id === 'midnight_eternal') {
          return env.time.timeOfDay === TimeOfDay.MIDNIGHT;
        }
        if (event.id === 'fullmoon_shimmer') {
          return env.time.timeOfDay === TimeOfDay.NIGHT && env.time.isFullMoon;
        }
        if (event.id === 'dawn_wakeup') {
          return env.time.timeOfDay === TimeOfDay.DAWN;
        }
        return true;
        
      case 'weather':
        if (event.id === 'aurora_dream_phantom') {
          return env.weather.currentWeather === WeatherType.AURORA;
        }
        if (event.id === 'meteor_starburst') {
          return env.weather.currentWeather === WeatherType.METEOR;
        }
        if (event.id === 'storm_ember') {
          return env.weather.currentWeather === WeatherType.STORM;
        }
        if (event.id === 'snow_crystal') {
          return env.weather.currentWeather === WeatherType.SNOW;
        }
        if (event.id === 'fog_phantom') {
          return env.weather.currentWeather === WeatherType.FOG;
        }
        return true;
        
      case 'season':
        if (event.id === 'winter_eternal') {
          return env.time.season === SeasonType.WINTER;
        }
        if (event.id === 'autumn_dream') {
          return env.time.season === SeasonType.AUTUMN;
        }
        return true;
        
      case 'milestone':
        return data.totalCollected !== undefined;
        
      case 'random':
        return true;
        
      default:
        return false;
    }
  }

  private calculateAdjustedProbability(event: RareDropEvent, env: EnvironmentState): number {
    let probability = event.probability;
    
    const timeEffect = TIME_EFFECTS[env.time.timeOfDay];
    if (timeEffect && timeEffect.rareDropBoost) {
      probability *= timeEffect.rareDropBoost;
    }
    
    const weatherEffect = WEATHER_EFFECTS[env.weather.currentWeather];
    if (weatherEffect && weatherEffect.rareDropBoost) {
      probability *= weatherEffect.rareDropBoost;
    }
    
    const state = SaveManager.getInstance().getGameState();
    if (state.environmentStats) {
      const totalRareDrops = state.environmentStats.totalRareDrops;
      const luckBonus = Math.min(totalRareDrops * 0.01, 0.5);
      probability *= (1 + luckBonus);
    }
    
    return Math.min(probability, 1.0);
  }

  private spawnRareDrop(event: RareDropEvent, env: EnvironmentState): void {
    const state = SaveManager.getInstance().getGameState();
    
    event.lastTriggered = Date.now();
    event.count++;
    
    let spawnX: number, spawnY: number;
    if (event.id === 'meteor_starburst') {
      spawnX = Phaser.Math.Between(100, WORLD_WIDTH - 100);
      spawnY = 50;
    } else {
      spawnX = Phaser.Math.Between(100, WORLD_WIDTH - 100);
      spawnY = Phaser.Math.Between(200, WORLD_HEIGHT - 200);
    }
    
    this.createRareDropVisual(event, spawnX, spawnY);
    this.showAnnouncement(event);
    this.playRareDropSound(event);
    
    if (state.environmentStats) {
      state.environmentStats.totalRareDrops++;
      state.environmentStats.rareDropsFound.push({ ...event });
    }
    
    EventManager.getInstance().emit('raredrop:spawned', {
      event: event,
      x: spawnX,
      y: spawnY
    });
    
    if (event.rarity === 'legendary') {
      EventManager.getInstance().emit('status:show', {
        message: {
          id: `legendary_${Date.now()}`,
          type: StatusType.SUCCESS,
          title: '传说掉落',
          content: event.announcement,
          timestamp: Date.now(),
          duration: 5000,
          persistent: true
        }
      });
    }
    
    this.setupRareDropCollection(event, spawnX, spawnY);
  }

  private createRareDropVisual(event: RareDropEvent, x: number, y: number): void {
    const petalConfig = this.getPetalConfig(event.type);
    const color = petalConfig?.color || 0xffffff;
    const glowColor = petalConfig?.glowColor || 0xffff00;
    
    const glow = this.scene.add.graphics();
    glow.setPosition(x, y);
    glow.setDepth(100);
    this.createGlowEffect(glow, color, glowColor);
    this.rareDropGlows.set(event.id, glow);
    
    const petal = this.scene.physics.add.sprite(x, y, 'petal');
    petal.setTint(color);
    petal.setScale(1.5);
    petal.setDepth(101);
    petal.setData('rareDropEventId', event.id);
    petal.setData('petalType', event.type);
    petal.setData('isRareDrop', true);
    petal.setCollideWorldBounds(true);
    petal.setBounce(0.5, 0.5);
    
    if (event.id === 'meteor_starburst') {
      petal.setVelocity(0, 150);
    } else {
      petal.setVelocity(
        Phaser.Math.Between(-30, 30),
        Phaser.Math.Between(-30, 30)
      );
    }
    
    this.rareDropPetals.set(event.id, petal);
    
    this.scene.tweens.add({
      targets: petal,
      scale: { from: 0, to: 1.5 },
      rotation: { from: 0, to: Math.PI * 2 },
      duration: 800,
      ease: 'Elastic.Out'
    });
  }

  private createGlowEffect(graphics: Phaser.GameObjects.Graphics, color: number, glowColor: number): void {
    graphics.clear();
    
    for (let i = 0; i < 3; i++) {
      const radius = 30 + i * 15;
      const alpha = 0.3 - i * 0.1;
      graphics.fillStyle(glowColor, alpha);
      graphics.beginPath();
      graphics.arc(0, 0, radius, 0, Math.PI * 2);
      graphics.fill();
    }
    
    graphics.fillStyle(color, 0.8);
    graphics.beginPath();
    graphics.arc(0, 0, 20, 0, Math.PI * 2);
    graphics.fill();
  }

  private showAnnouncement(event: RareDropEvent): void {
    const centerX = this.scene.cameras.main.width / 2;
    const centerY = this.scene.cameras.main.height / 2;
    
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRoundedRect(-350, -50, 700, 100, 20);
    bg.setPosition(centerX, centerY - 200);
    bg.setDepth(200);
    bg.setScrollFactor(0);
    
    const text = this.scene.add.text(centerX, centerY - 200, event.announcement, {
      fontFamily: 'Arial Black',
      fontSize: '28px',
      color: this.getRarityColor(event.rarity),
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center'
    }).setOrigin(0.5).setDepth(201).setScrollFactor(0);
    
    this.announcementTexts.set(event.id, text);
    
    this.scene.tweens.add({
      targets: [bg, text],
      y: { from: centerY - 300, to: centerY - 200 },
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: 'Back.Out'
    });
    
    this.scene.time.delayedCall(3000, () => {
      this.scene.tweens.add({
        targets: [bg, text],
        alpha: 0,
        y: centerY - 300,
        duration: 500,
        ease: 'Back.In',
        onComplete: () => {
          bg.destroy();
          text.destroy();
          this.announcementTexts.delete(event.id);
        }
      });
    });
  }

  private getRarityColor(rarity: string): string {
    switch (rarity) {
      case 'legendary': return '#ffd700';
      case 'epic': return '#a855f7';
      case 'rare': return '#3b82f6';
      case 'uncommon': return '#22c55e';
      default: return '#ffffff';
    }
  }

  private playRareDropSound(event: RareDropEvent): void {
    let soundKey = 'sfx_rare_drop';
    if (event.rarity === 'legendary') {
      soundKey = 'sfx_special_event';
    }
    
    if (this.scene.sound.get(soundKey)) {
      this.scene.sound.play(soundKey, { volume: 0.7 });
    }
  }

  private setupRareDropCollection(event: RareDropEvent, x: number, y: number): void {
    const state = SaveManager.getInstance().getGameState();
    const player = (this.scene as any).player;
    
    if (!player) return;
    
    const checkCollection = () => {
      const petal = this.rareDropPetals.get(event.id);
      if (!petal || !petal.active) return;
      
      const distance = Phaser.Math.Distance.Between(
        player.x, player.y,
        petal.x, petal.y
      );
      
      const collectRange = 80;
      
      if (distance < collectRange) {
        this.collectRareDrop(event);
      }
    };
    
    const collectionCheck = this.scene.time.addEvent({
      delay: 100,
      callback: checkCollection,
      loop: true
    });
    
    this.scene.time.delayedCall(60000, () => {
      collectionCheck.remove();
      this.despawnRareDrop(event.id);
    });
  }

  private collectRareDrop(event: RareDropEvent): void {
    const petal = this.rareDropPetals.get(event.id);
    const glow = this.rareDropGlows.get(event.id);
    
    if (!petal || !petal.active) return;
    
    const state = SaveManager.getInstance().getGameState();
    state.petals[event.type] = (state.petals[event.type] || 0) + 1;
    state.totalCollected++;
    
    if (!state.unlockedPetals.includes(event.type)) {
      state.unlockedPetals.push(event.type);
    }
    
    this.playCollectSound(event);
    
    this.scene.tweens.add({
      targets: [petal, glow],
      scale: 0,
      alpha: 0,
      duration: 300,
      ease: 'Back.In',
      onComplete: () => {
        petal.destroy();
        glow?.destroy();
        this.rareDropPetals.delete(event.id);
        this.rareDropGlows.delete(event.id);
      }
    });
    
    this.createCollectEffect(petal.x, petal.y, event.type);
    
    EventManager.getInstance().emit('raredrop:collected', {
      event: event,
      type: event.type
    });
    
    EventManager.getInstance().emit('petal:collected', {
      type: event.type,
      count: 1,
      isRare: true
    });
  }

  private playCollectSound(event: RareDropEvent): void {
    let soundKey = 'sfx_collect';
    if (event.rarity === 'legendary') {
      soundKey = 'sfx_collect_legendary';
    } else if (event.rarity === 'epic') {
      soundKey = 'sfx_collect_rare';
    }
    
    if (this.scene.sound.get(soundKey)) {
      this.scene.sound.play(soundKey, { volume: 0.5 });
    }
  }

  private createCollectEffect(x: number, y: number, type: PetalType): void {
    const petalConfig = this.getPetalConfig(type);
    const color = petalConfig?.color || 0xffffff;
    
    const particles = this.scene.add.particles(x, y, 'pixel_white', {
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 600,
      quantity: 20,
      tint: color,
      blendMode: 'ADD',
      emitting: true
    }).setDepth(150);
    
    this.scene.time.delayedCall(600, () => {
      particles.destroy();
    });
    
    const text = this.scene.add.text(x, y - 30, '+1', {
      fontFamily: 'Arial Black',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(151);
    
    this.scene.tweens.add({
      targets: text,
      y: y - 80,
      alpha: 0,
      duration: 800,
      ease: 'Power2.Out',
      onComplete: () => text.destroy()
    });
  }

  private despawnRareDrop(eventId: string): void {
    const petal = this.rareDropPetals.get(eventId);
    const glow = this.rareDropGlows.get(eventId);
    
    if (petal && petal.active) {
      this.scene.tweens.add({
        targets: [petal, glow],
        alpha: 0,
        scale: 0,
        duration: 500,
        onComplete: () => {
          petal.destroy();
          glow?.destroy();
          this.rareDropPetals.delete(eventId);
          this.rareDropGlows.delete(eventId);
        }
      });
    }
  }

  private updateRareDropVisuals(delta: number): void {
    const time = Date.now() / 1000;
    
    this.rareDropGlows.forEach((glow, eventId) => {
      const petal = this.rareDropPetals.get(eventId);
      if (!petal) return;
      
      const event = this.getEventById(eventId);
      if (!event) return;
      
      const petalConfig = this.getPetalConfig(event.type);
      const color = petalConfig?.color || 0xffffff;
      const glowColor = petalConfig?.glowColor || 0xffff00;
      
      const pulseScale = 1 + Math.sin(time * 3) * 0.15;
      glow.setScale(pulseScale);
      
      this.createGlowEffect(glow, color, glowColor);
      glow.setPosition(petal.x, petal.y);
    });
  }

  private updateRareDropAnimations(delta: number): void {
    const time = Date.now() / 1000;
    
    this.rareDropPetals.forEach((petal) => {
      petal.rotation += delta * 0.002;
      
      const floatOffset = Math.sin(time * 2 + petal.x * 0.01) * 10;
      petal.setData('floatOffset', floatOffset);
    });
  }

  private getPetalConfig(type: PetalType): any {
    const PETAL_CONFIGS = (window as any).PETAL_CONFIGS;
    if (PETAL_CONFIGS) {
      return PETAL_CONFIGS.find((c: any) => c.type === type);
    }
    return null;
  }

  private getEventById(eventId: string): RareDropEvent | undefined {
    const state = SaveManager.getInstance().getGameState();
    return state.rareDropEvents.find(e => e.id === eventId);
  }

  public getSpawnMultiplier(type: PetalType): number {
    let multiplier = 1.0;
    
    const state = SaveManager.getInstance().getGameState();
    if (!state.environment) return multiplier;
    
    const env = state.environment;
    
    const timeEffect = TIME_EFFECTS[env.time.timeOfDay];
    if (timeEffect && timeEffect.spawnWeightModifier[type]) {
      multiplier *= timeEffect.spawnWeightModifier[type]!;
    }
    
    const weatherEffect = WEATHER_EFFECTS[env.weather.currentWeather];
    if (weatherEffect && weatherEffect.spawnWeightModifier[type]) {
      multiplier *= weatherEffect.spawnWeightModifier[type]!;
    }
    
    return multiplier;
  }

  public destroy(): void {
    this.eventListeners.forEach(listener => {
      EventManager.getInstance().off(listener.event as keyof import('../types').GameEvents, listener.callback);
    });
    this.eventListeners = [];
    
    this.rareDropPetals.forEach(petal => petal.destroy());
    this.rareDropGlows.forEach(glow => glow.destroy());
    this.announcementTexts.forEach(text => text.destroy());
    
    this.rareDropPetals.clear();
    this.rareDropGlows.clear();
    this.announcementTexts.clear();
  }
}
