import Phaser from 'phaser';
import { 
  WeatherType, 
  EnvironmentState,
  PetalType,
  StatusType
} from '../types';
import { 
  WEATHER_EFFECTS, 
  WEATHER_DURATION,
  SKY_COLORS,
  SEASON_EFFECTS,
  INITIAL_ENVIRONMENT,
  WORLD_WIDTH,
  WORLD_HEIGHT
} from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { EventManager } from '../managers/EventManager';

export class WeatherSystem {
  private scene: Phaser.Scene;
  private eventListeners: Array<{ event: string; callback: (data: any) => void }> = [];
  
  private rainParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private snowParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private fogOverlay: Phaser.GameObjects.Graphics | null = null;
  private auroraOverlay: Phaser.GameObjects.Graphics | null = null;
  private meteorParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private cloudLayers: Phaser.GameObjects.TileSprite[] = [];
  private windParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  
  private ambientSounds: Map<string, Phaser.Sound.BaseSound> = new Map();
  private weatherTransitionTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public create(): void {
    const state = SaveManager.getInstance().getGameState();
    if (!state.environment || !state.environment.weather) {
      state.environment = JSON.parse(JSON.stringify(INITIAL_ENVIRONMENT));
    }
    
    this.createWeatherEffects();
    this.setupEventListeners();
    this.applyWeather(state.environment.weather.currentWeather, true);
  }

  private createWeatherEffects(): void {
    this.createRainParticles();
    this.createSnowParticles();
    this.createFogOverlay();
    this.createAuroraOverlay();
    this.createMeteorParticles();
    this.createCloudLayers();
    this.createWindParticles();
    
    this.hideAllEffects();
  }

  private createRainParticles(): void {
    this.rainParticles = this.scene.add.particles(0, 0, 'pixel_white', {
      x: { min: 0, max: WORLD_WIDTH },
      y: -50,
      lifespan: 2000,
      speedY: { min: 400, max: 600 },
      speedX: { min: -50, max: 50 },
      scale: { start: 1, end: 0.5 },
      alpha: { start: 0.8, end: 0.3 },
      quantity: 10,
      frequency: 50,
      blendMode: 'ADD',
      follow: this.scene.cameras.main,
      followOffset: { x: -WORLD_WIDTH / 2, y: -WORLD_HEIGHT / 2 },
      tint: 0xaaddff,
      emitting: false
    }).setDepth(50);
  }

  private createSnowParticles(): void {
    this.snowParticles = this.scene.add.particles(0, 0, 'pixel_white', {
      x: { min: 0, max: WORLD_WIDTH },
      y: -50,
      lifespan: 8000,
      speedY: { min: 30, max: 80 },
      speedX: { min: -20, max: 20 },
      scale: { start: 2, end: 1 },
      alpha: { start: 0.9, end: 0.5 },
      quantity: 5,
      frequency: 150,
      blendMode: 'ADD',
      follow: this.scene.cameras.main,
      followOffset: { x: -WORLD_WIDTH / 2, y: -WORLD_HEIGHT / 2 },
      tint: 0xffffff,
      emitting: false
    }).setDepth(50);
  }

  private createFogOverlay(): void {
    this.fogOverlay = this.scene.add.graphics();
    this.fogOverlay.setDepth(100);
    this.fogOverlay.setScrollFactor(0);
    this.fogOverlay.setAlpha(0);
    this.updateFogOverlay(0.5);
  }

  private createAuroraOverlay(): void {
    this.auroraOverlay = this.scene.add.graphics();
    this.auroraOverlay.setDepth(95);
    this.auroraOverlay.setScrollFactor(0);
    this.auroraOverlay.setAlpha(0);
  }

  private createMeteorParticles(): void {
    this.meteorParticles = this.scene.add.particles(0, 0, 'pixel_yellow', {
      x: { min: 0, max: WORLD_WIDTH },
      y: -100,
      lifespan: 1500,
      speedY: { min: 500, max: 800 },
      speedX: { min: 200, max: 400 },
      scale: { start: 3, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 1,
      frequency: 2000,
      blendMode: 'ADD',
      follow: this.scene.cameras.main,
      followOffset: { x: -WORLD_WIDTH / 2, y: -WORLD_HEIGHT / 2 },
      tint: 0xffaa00,
      emitting: false
    }).setDepth(55);
  }

  private createCloudLayers(): void {
    for (let i = 0; i < 3; i++) {
      const cloudCanvas = this.scene.textures.createCanvas(`cloud_layer_${i}`, WORLD_WIDTH * 2, 200);
      const ctx = cloudCanvas.getContext();
      
      for (let j = 0; j < 20; j++) {
        const x = Math.random() * WORLD_WIDTH * 2;
        const y = Math.random() * 150 + 25;
        const size = 60 + Math.random() * 80;
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
        gradient.addColorStop(0, 'rgba(200, 200, 200, 0.4)');
        gradient.addColorStop(0.5, 'rgba(180, 180, 180, 0.2)');
        gradient.addColorStop(1, 'rgba(150, 150, 150, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
      cloudCanvas.refresh();
      
      const cloudLayer = this.scene.add.tileSprite(
        0, 100 + i * 80, 
        WORLD_WIDTH, 200, 
        `cloud_layer_${i}`
      ).setOrigin(0, 0).setScrollFactor(0.1 + i * 0.1).setDepth(-6 + i).setAlpha(0);
      
      this.cloudLayers.push(cloudLayer);
    }
  }

  private createWindParticles(): void {
    this.windParticles = this.scene.add.particles(0, 0, 'pixel_white', {
      x: -50,
      y: { min: 0, max: WORLD_HEIGHT },
      lifespan: 3000,
      speedX: { min: 200, max: 400 },
      speedY: { min: -30, max: 30 },
      scale: { start: 0.5, end: 0.2 },
      alpha: { start: 0.3, end: 0 },
      quantity: 3,
      frequency: 200,
      blendMode: 'ADD',
      follow: this.scene.cameras.main,
      followOffset: { x: -WORLD_WIDTH / 2, y: -WORLD_HEIGHT / 2 },
      tint: 0xdddddd,
      emitting: false
    }).setDepth(48);
  }

  private updateFogOverlay(density: number): void {
    if (!this.fogOverlay) return;
    
    this.fogOverlay.clear();
    
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;
    
    const layers = 5;
    for (let i = 0; i < layers; i++) {
      const alpha = density * (0.3 + i * 0.05);
      const y = (gameHeight / layers) * i;
      const height = gameHeight / layers + 10;
      
      this.fogOverlay.fillStyle(0xcccccc, alpha);
      this.fogOverlay.fillRect(0, y, gameWidth, height);
    }
    
    this.fogOverlay.fillStyle(0xaaaaaa, density * 0.2);
    this.fogOverlay.fillRect(0, 0, gameWidth, gameHeight);
  }

  private updateAuroraOverlay(intensity: number): void {
    if (!this.auroraOverlay) return;
    
    this.auroraOverlay.clear();
    
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;
    const time = Date.now() * 0.001;
    
    for (let i = 0; i < 5; i++) {
      const colors = [0x00ff88, 0x88ff00, 0x00ffcc, 0x8800ff, 0xff0088];
      const color = colors[i % colors.length];
      
      const alpha = intensity * 0.15 * (0.5 + Math.sin(time + i) * 0.5);
      
      const offsetY = Math.sin(time * 0.5 + i * 1.5) * 50;
      
      for (let layer = 0; layer < 3; layer++) {
        const layerAlpha = alpha * (1 - layer * 0.3);
        this.auroraOverlay.fillStyle(color, layerAlpha);
        
        this.auroraOverlay.beginPath();
        this.auroraOverlay.moveTo(0, gameHeight * 0.2 + offsetY + layer * 20);
        
        for (let x = 0; x <= gameWidth; x += 50) {
          const waveY = gameHeight * 0.2 + 
            Math.sin(x * 0.01 + time * 0.3 + i) * 30 + 
            Math.sin(x * 0.02 + time * 0.5 + i * 0.7) * 20 +
            offsetY + layer * 20;
          this.auroraOverlay.lineTo(x, waveY);
        }
        
        this.auroraOverlay.lineTo(gameWidth, gameHeight * 0.1 + layer * 20);
        this.auroraOverlay.lineTo(0, gameHeight * 0.1 + layer * 20);
        this.auroraOverlay.closePath();
        this.auroraOverlay.fill();
      }
    }
  }

  private setupEventListeners(): void {
    const onTimeChanged = (data: any) => {
      this.updateSkyColors();
    };
    EventManager.getInstance().on('time:changed', onTimeChanged);
    this.eventListeners.push({ event: 'time:changed', callback: onTimeChanged });

    const onSeasonChanged = (data: any) => {
      this.scheduleWeatherChange();
    };
    EventManager.getInstance().on('season:changed', onSeasonChanged);
    this.eventListeners.push({ event: 'season:changed', callback: onSeasonChanged });
  }

  private hideAllEffects(): void {
    if (this.rainParticles) this.rainParticles.stop();
    if (this.snowParticles) this.snowParticles.stop();
    if (this.meteorParticles) this.meteorParticles.stop();
    if (this.windParticles) this.windParticles.stop();
    if (this.fogOverlay) this.fogOverlay.setAlpha(0);
    if (this.auroraOverlay) this.auroraOverlay.setAlpha(0);
    
    this.cloudLayers.forEach(layer => layer.setAlpha(0));
    
    this.ambientSounds.forEach(sound => {
      if ((sound as Phaser.Sound.WebAudioSound).isPlaying) {
        (sound as Phaser.Sound.WebAudioSound).stop();
      }
    });
    this.ambientSounds.clear();
  }

  private applyWeather(weather: WeatherType, immediate: boolean = false): void {
    const state = SaveManager.getInstance().getGameState();
    const env = state.environment;
    const weatherEffect = WEATHER_EFFECTS[weather];
    
    this.hideAllEffects();
    
    const applyEffects = () => {
      switch (weather) {
        case WeatherType.RAIN:
          this.startRain(0.5);
          this.startAmbientSound('sfx_rain', 0.15);
          this.showClouds(0.6);
          break;
        case WeatherType.HEAVY_RAIN:
          this.startRain(1.0);
          this.startAmbientSound('sfx_rain', 0.3);
          this.showClouds(0.9);
          break;
        case WeatherType.SNOW:
          this.startSnow(0.7);
          this.showClouds(0.4);
          break;
        case WeatherType.FOG:
          this.startFog(0.7);
          this.showClouds(0.2);
          break;
        case WeatherType.CLOUDY:
          this.showClouds(0.5);
          break;
        case WeatherType.WINDY:
          this.startWind(0.6);
          this.startAmbientSound('sfx_wind', 0.2);
          this.showClouds(0.3);
          break;
        case WeatherType.STORM:
          this.startRain(1.2);
          this.startWind(1.0);
          this.showClouds(1.0);
          break;
        case WeatherType.AURORA:
          this.startAurora(0.8);
          break;
        case WeatherType.METEOR:
          this.startMeteor(1.0);
          break;
        case WeatherType.CLEAR:
        default:
          break;
      }
    };

    if (immediate) {
      applyEffects();
    } else {
      this.weatherTransitionTween = this.scene.tweens.add({
        targets: { progress: 0 },
        progress: 1,
        duration: 2000,
        ease: 'Cubic.InOut',
        onUpdate: (tween) => {
          const progress = tween.getValue();
          if (this.fogOverlay) {
            this.fogOverlay.setAlpha(progress * 0.3);
          }
        },
        onComplete: () => {
          applyEffects();
          this.scene.tweens.add({
            targets: { progress: 1 },
            progress: 0,
            duration: 2000,
            ease: 'Cubic.InOut',
            onUpdate: (tween) => {
              const progress = tween.getValue();
              if (this.fogOverlay && weather !== WeatherType.FOG) {
                this.fogOverlay.setAlpha(progress * 0.3);
              }
            }
          });
        }
      });
    }

    this.updateSkyColors();
    
    EventManager.getInstance().emit('audio:play', { key: 'sfx_weather_change', volume: 0.4 });
    
    if (weatherEffect.specialEvent) {
      EventManager.getInstance().emit('weather:special', {
        type: weather,
        description: weatherEffect.description
      });
      
      const state = SaveManager.getInstance().getGameState();
      if (!state.environmentStats.specialEventsWitnessed.includes(weather)) {
        state.environmentStats.specialEventsWitnessed.push(weather);
      }
      SaveManager.getInstance().saveGame(state);
    }
  }

  private startRain(intensity: number): void {
    if (!this.rainParticles) return;
    this.rainParticles.setQuantity(10 * intensity);
    this.rainParticles.setFrequency(50 / intensity);
    this.rainParticles.start();
  }

  private startSnow(intensity: number): void {
    if (!this.snowParticles) return;
    this.snowParticles.setQuantity(5 * intensity);
    this.snowParticles.setFrequency(150 / intensity);
    this.snowParticles.start();
  }

  private startFog(density: number): void {
    if (!this.fogOverlay) return;
    this.updateFogOverlay(density);
    this.scene.tweens.add({
      targets: this.fogOverlay,
      alpha: density * 0.8,
      duration: 3000,
      ease: 'Cubic.InOut'
    });
  }

  private startAurora(intensity: number): void {
    if (!this.auroraOverlay) return;
    this.scene.tweens.add({
      targets: this.auroraOverlay,
      alpha: intensity,
      duration: 2000,
      ease: 'Cubic.InOut'
    });
  }

  private startMeteor(intensity: number): void {
    if (!this.meteorParticles) return;
    this.meteorParticles.setQuantity(1 * intensity);
    this.meteorParticles.setFrequency(1000 / intensity);
    this.meteorParticles.start();
  }

  private startWind(intensity: number): void {
    if (!this.windParticles) return;
    this.windParticles.setQuantity(3 * intensity);
    this.windParticles.setFrequency(200 / intensity);
    this.windParticles.start();
  }

  private showClouds(alpha: number): void {
    this.cloudLayers.forEach((layer, i) => {
      this.scene.tweens.add({
        targets: layer,
        alpha: alpha * (0.5 + i * 0.2),
        duration: 2000,
        ease: 'Cubic.InOut'
      });
    });
  }

  private startAmbientSound(key: string, volume: number): void {
    try {
      const sound = this.scene.sound.add(key, {
        loop: true,
        volume: volume
      });
      sound.play();
      this.ambientSounds.set(key, sound);
    } catch (e) {
      console.warn('Ambient sound not available:', key);
    }
  }

  private updateSkyColors(): void {
    const state = SaveManager.getInstance().getGameState();
    const env = state.environment;
    
    if (!env || !env.time || !env.weather) return;
    
    const timeOfDay = env.time.timeOfDay;
    const weather = env.weather.currentWeather;
    const colors = SKY_COLORS[timeOfDay]?.[weather];
    
    if (colors && this.scene.renderer) {
      const r = ((colors.top >> 16) & 255) / 255;
      const g = ((colors.top >> 8) & 255) / 255;
      const b = (colors.top & 255) / 255;
      this.scene.cameras.main.setBackgroundColor(`rgb(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)})`);
    }
  }

  public update(time: number, delta: number): void {
    const state = SaveManager.getInstance().getGameState();
    const env = state.environment;
    
    if (!env || !env.weather) return;

    env.weather.weatherDuration -= delta;
    env.weather.nextWeatherChange -= delta;

    if (env.weather.weatherTransition > 0) {
      env.weather.weatherTransition -= delta;
    }

    if (env.weather.nextWeatherChange <= 0) {
      this.changeWeather(env);
    }

    this.updateWeatherEffects(time, delta, env);
  }

  private changeWeather(env: EnvironmentState): void {
    const seasonEffect = SEASON_EFFECTS[env.time.season];
    const weatherWeights = seasonEffect.weatherWeights;
    
    const availableWeathers = Object.entries(weatherWeights)
      .filter(([_, weight]) => weight && weight > 0)
      .map(([type, weight]) => ({ type: type as WeatherType, weight: weight as number }));
    
    if (availableWeathers.length === 0) {
      env.weather.nextWeatherChange = 30000;
      return;
    }

    const totalWeight = availableWeathers.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;
    
    let newWeather: WeatherType = WeatherType.CLEAR;
    for (const { type, weight } of availableWeathers) {
      random -= weight;
      if (random <= 0) {
        newWeather = type;
        break;
      }
    }

    if (newWeather === env.weather.currentWeather) {
      env.weather.nextWeatherChange = 30000 + Math.random() * 30000;
      return;
    }

    const oldWeather = env.weather.currentWeather;
    env.weather.targetWeather = newWeather;
    env.weather.weatherTransition = 2000;
    env.weather.currentWeather = newWeather;
    
    const duration = WEATHER_DURATION[newWeather];
    env.weather.weatherDuration = duration.min + Math.random() * (duration.max - duration.min);
    env.weather.nextWeatherChange = env.weather.weatherDuration;
    env.weather.weatherIntensity = 0.3 + Math.random() * 0.7;

    this.applyWeather(newWeather);

    EventManager.getInstance().emit('weather:changed', {
      oldWeather,
      newWeather,
      intensity: env.weather.weatherIntensity
    });

    const weatherEffect = WEATHER_EFFECTS[newWeather];
    const messageState = SaveManager.getInstance().getGameState();
    SaveManager.getInstance().showStatusMessage(
      messageState,
      weatherEffect.specialEvent ? StatusType.SUCCESS : StatusType.INFO,
      this.getWeatherIcon(newWeather) + ' 天气变化',
      weatherEffect.description,
      weatherEffect.specialEvent ? 8000 : 4000
    );
  }

  private updateWeatherEffects(time: number, delta: number, env: EnvironmentState): void {
    if (env.weather.currentWeather === WeatherType.FOG && this.fogOverlay) {
      this.updateFogOverlay(env.weather.weatherIntensity);
    }
    
    if (env.weather.currentWeather === WeatherType.AURORA && this.auroraOverlay) {
      this.updateAuroraOverlay(env.weather.weatherIntensity);
    }

    this.cloudLayers.forEach((layer, i) => {
      if (layer.alpha > 0) {
        layer.tilePositionX += env.windSpeed * 5 * (1 + i * 0.3);
      }
    });

    const windSpeed = env.windSpeed;
    if (this.rainParticles && this.rainParticles.active) {
      this.rainParticles.speedX = { min: -100 * windSpeed, max: -50 * windSpeed };
    }
    if (this.snowParticles && this.snowParticles.active) {
      this.snowParticles.speedX = { min: -30 * windSpeed, max: 30 * windSpeed };
    }
  }

  public scheduleWeatherChange(): void {
    const state = SaveManager.getInstance().getGameState();
    if (state.environment && state.environment.weather) {
      state.environment.weather.nextWeatherChange = 5000;
    }
  }

  public getCurrentWeatherEffect() {
    const state = SaveManager.getInstance().getGameState();
    return WEATHER_EFFECTS[state.environment.weather.currentWeather];
  }

  public getSpawnMultiplier(petalType: PetalType): number {
    const weatherEffect = this.getCurrentWeatherEffect();
    return weatherEffect.spawnWeightModifier[petalType] || 1;
  }

  public getRareDropBoost(): number {
    const weatherEffect = this.getCurrentWeatherEffect();
    return weatherEffect.rareDropBoost;
  }

  public getCurrentWeather(): WeatherType {
    const state = SaveManager.getInstance().getGameState();
    return state.environment.weather.currentWeather;
  }

  private getWeatherIcon(weather: WeatherType): string {
    const icons: Record<WeatherType, string> = {
      [WeatherType.CLEAR]: '☀️',
      [WeatherType.CLOUDY]: '☁️',
      [WeatherType.RAIN]: '🌧️',
      [WeatherType.HEAVY_RAIN]: '⛈️',
      [WeatherType.SNOW]: '❄️',
      [WeatherType.FOG]: '🌫️',
      [WeatherType.WINDY]: '💨',
      [WeatherType.STORM]: '🌩️',
      [WeatherType.AURORA]: '🌌',
      [WeatherType.METEOR]: '☄️'
    };
    return icons[weather];
  }

  public destroy(): void {
    this.eventListeners.forEach(({ event, callback }) => {
      EventManager.getInstance().off(event as any, callback);
    });
    this.eventListeners = [];

    if (this.weatherTransitionTween) {
      this.weatherTransitionTween.stop();
    }

    this.hideAllEffects();

    if (this.rainParticles) {
      this.rainParticles.stop();
      this.rainParticles.destroy();
    }
    if (this.snowParticles) {
      this.snowParticles.stop();
      this.snowParticles.destroy();
    }
    if (this.meteorParticles) {
      this.meteorParticles.stop();
      this.meteorParticles.destroy();
    }
    if (this.windParticles) {
      this.windParticles.stop();
      this.windParticles.destroy();
    }
    if (this.fogOverlay) {
      this.fogOverlay.destroy();
    }
    if (this.auroraOverlay) {
      this.auroraOverlay.destroy();
    }
    
    this.cloudLayers.forEach(layer => layer.destroy());
    this.cloudLayers = [];
    
    this.ambientSounds.forEach(sound => {
      if ((sound as Phaser.Sound.WebAudioSound).isPlaying) {
        (sound as Phaser.Sound.WebAudioSound).stop();
      }
      sound.destroy();
    });
    this.ambientSounds.clear();
  }
}
