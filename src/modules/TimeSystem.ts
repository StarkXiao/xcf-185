import Phaser from 'phaser';
import { 
  TimeOfDay, 
  SeasonType, 
  TimeState,
  EnvironmentState,
  StatusType,
  WeatherType
} from '../types';
import { 
  TIME_CONFIG, 
  TIME_EFFECTS, 
  SEASON_EFFECTS,
  INITIAL_ENVIRONMENT
} from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { EventManager } from '../managers/EventManager';

export class TimeSystem {
  private scene: Phaser.Scene;
  private eventListeners: Array<{ event: string; callback: (data: any) => void }> = [];
  private moonPhases: number = 8;
  private thunderTimer: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public create(): void {
    const state = SaveManager.getInstance().getGameState();
    if (!state.environment || !state.environment.time) {
      state.environment = JSON.parse(JSON.stringify(INITIAL_ENVIRONMENT));
    }
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const onWeatherChanged = (data: any) => {
      if (data.newWeather === WeatherType.STORM || data.newWeather === WeatherType.HEAVY_RAIN) {
        this.thunderTimer = 3000 + Math.random() * 5000;
      }
    };
    EventManager.getInstance().on('weather:changed', onWeatherChanged);
    this.eventListeners.push({ event: 'weather:changed', callback: onWeatherChanged });
  }

  public update(time: number, delta: number): void {
    const state = SaveManager.getInstance().getGameState();
    const env = state.environment;
    
    if (!env || !env.time) return;

    const timeDelta = delta * TIME_CONFIG.TIME_SPEED_MULTIPLIER;
    env.time.gameTime += timeDelta;

    const dayProgress = (env.time.gameTime - env.time.dayStartTime) / TIME_CONFIG.DAY_DURATION;
    env.time.timeProgress = dayProgress;

    const newTimeOfDay = this.getTimeOfDay(dayProgress);
    if (newTimeOfDay !== env.time.timeOfDay) {
      this.onTimeOfDayChanged(env.time.timeOfDay, newTimeOfDay, env);
      env.time.timeOfDay = newTimeOfDay;
    }

    if (dayProgress >= 1) {
      this.onNewDay(env);
    }

    this.updateEnvironmentParams(env);
    this.updateThunderEffects(delta, env);
    this.updateEnvironmentStats(env, delta);
  }

  private getTimeOfDay(progress: number): TimeOfDay {
    if (progress >= TIME_CONFIG.MIDNIGHT_START) return TimeOfDay.MIDNIGHT;
    if (progress >= TIME_CONFIG.NIGHT_START) return TimeOfDay.NIGHT;
    if (progress >= TIME_CONFIG.DUSK_START) return TimeOfDay.DUSK;
    if (progress >= TIME_CONFIG.DAY_START) return TimeOfDay.DAY;
    return TimeOfDay.DAWN;
  }

  private onTimeOfDayChanged(oldTime: TimeOfDay, newTime: TimeOfDay, env: EnvironmentState): void {
    const timeEffect = TIME_EFFECTS[newTime];
    
    EventManager.getInstance().emit('time:changed', {
      timeOfDay: newTime,
      dayCount: env.time.dayCount,
      season: env.time.season
    });

    if (newTime === TimeOfDay.DAWN) {
      EventManager.getInstance().emit('audio:play', { key: 'sfx_time_dawn', volume: 0.5 });
    } else if (newTime === TimeOfDay.NIGHT) {
      EventManager.getInstance().emit('audio:play', { key: 'sfx_time_night', volume: 0.5 });
    }

    const state = SaveManager.getInstance().getGameState();
    SaveManager.getInstance().showStatusMessage(
      state,
      timeEffect.lightLevel > 0.5 ? StatusType.INFO : StatusType.SUCCESS,
      this.getTimeIcon(newTime) + ' ' + this.getTimeName(newTime),
      timeEffect.description,
      4000
    );
  }

  private onNewDay(env: EnvironmentState): void {
    env.time.dayStartTime = env.time.gameTime;
    env.time.dayCount++;
    env.time.moonPhase = (env.time.moonPhase + 1) % this.moonPhases;
    env.time.isFullMoon = env.time.moonPhase === Math.floor(this.moonPhases / 2);

    if (env.time.dayCount % TIME_CONFIG.SEASON_DURATION === 0) {
      this.onSeasonChanged(env);
    }

    env.time.isMeteorShower = Math.random() < TIME_CONFIG.METEOR_SHOWER_CHANCE;

    EventManager.getInstance().emit('time:newday', {
      dayCount: env.time.dayCount,
      season: env.time.season,
      isFullMoon: env.time.isFullMoon
    });

    const state = SaveManager.getInstance().getGameState();
    state.environmentStats.totalDaysPlayed++;
    SaveManager.getInstance().saveGame(state);
  }

  private onSeasonChanged(env: EnvironmentState): void {
    const oldSeason = env.time.season;
    const seasons = [SeasonType.SPRING, SeasonType.SUMMER, SeasonType.AUTUMN, SeasonType.WINTER];
    const currentIndex = seasons.indexOf(oldSeason);
    const newSeason = seasons[(currentIndex + 1) % seasons.length];
    env.time.season = newSeason;

    EventManager.getInstance().emit('season:changed', {
      oldSeason,
      newSeason
    });

    const seasonEffect = SEASON_EFFECTS[newSeason];
    const state = SaveManager.getInstance().getGameState();
    SaveManager.getInstance().showStatusMessage(
      state,
      StatusType.SUCCESS,
      '🍃 季节变换',
      seasonEffect.description,
      6000
    );
  }

  private updateEnvironmentParams(env: EnvironmentState): void {
    const timeEffect = TIME_EFFECTS[env.time.timeOfDay];
    const weatherEffect = env.weather.currentWeather;
    const seasonEffect = SEASON_EFFECTS[env.time.season];

    env.ambientLight = timeEffect.lightLevel;

    const temperatureBySeason: Record<SeasonType, number> = {
      [SeasonType.SPRING]: 20,
      [SeasonType.SUMMER]: 30,
      [SeasonType.AUTUMN]: 15,
      [SeasonType.WINTER]: 5
    };

    const weatherTempMod: Record<WeatherType, number> = {
      [WeatherType.CLEAR]: 3,
      [WeatherType.CLOUDY]: 0,
      [WeatherType.RAIN]: -3,
      [WeatherType.HEAVY_RAIN]: -5,
      [WeatherType.SNOW]: -8,
      [WeatherType.FOG]: -2,
      [WeatherType.WINDY]: -4,
      [WeatherType.STORM]: -6,
      [WeatherType.AURORA]: 0,
      [WeatherType.METEOR]: 2
    };

    env.temperature = temperatureBySeason[env.time.season] + 
      (weatherTempMod[weatherEffect as WeatherType] || 0) +
      Math.sin(env.time.timeProgress * Math.PI) * 3;

    const windSpeedByWeather: Record<WeatherType, number> = {
      [WeatherType.CLEAR]: 0.1,
      [WeatherType.CLOUDY]: 0.2,
      [WeatherType.RAIN]: 0.4,
      [WeatherType.HEAVY_RAIN]: 0.6,
      [WeatherType.SNOW]: 0.3,
      [WeatherType.FOG]: 0.05,
      [WeatherType.WINDY]: 0.8,
      [WeatherType.STORM]: 1.0,
      [WeatherType.AURORA]: 0.15,
      [WeatherType.METEOR]: 0.2
    };

    env.windSpeed = windSpeedByWeather[weatherEffect as WeatherType] || 0.2;

    const fogDensityByWeather: Record<WeatherType, number> = {
      [WeatherType.CLEAR]: 0.05,
      [WeatherType.CLOUDY]: 0.15,
      [WeatherType.RAIN]: 0.2,
      [WeatherType.HEAVY_RAIN]: 0.3,
      [WeatherType.SNOW]: 0.25,
      [WeatherType.FOG]: 0.6,
      [WeatherType.WINDY]: 0.1,
      [WeatherType.STORM]: 0.2,
      [WeatherType.AURORA]: 0.1,
      [WeatherType.METEOR]: 0.08
    };

    env.fogDensity = fogDensityByWeather[weatherEffect as WeatherType] || 0.1;

    const skyColors = {
      top: 0x0a0514,
      bottom: 0x1a0a2e,
      fog: 0x0d1a26
    };

    env.skyColor = skyColors.bottom;

    EventManager.getInstance().emit('environment:updated', { environment: env });
  }

  private updateThunderEffects(delta: number, env: EnvironmentState): void {
    if (env.weather.currentWeather !== WeatherType.STORM && env.weather.currentWeather !== WeatherType.HEAVY_RAIN) {
      return;
    }

    this.thunderTimer -= delta;
    if (this.thunderTimer <= 0) {
      if (Math.random() < 0.3) {
        EventManager.getInstance().emit('audio:play', { key: 'sfx_thunder', volume: 0.6 });
        this.thunderTimer = 5000 + Math.random() * 10000;
      } else {
        this.thunderTimer = 3000 + Math.random() * 5000;
      }
    }
  }

  private updateEnvironmentStats(env: EnvironmentState, delta: number): void {
    const state = SaveManager.getInstance().getGameState();
    
    if (env.time.timeOfDay === TimeOfDay.NIGHT || 
        env.time.timeOfDay === TimeOfDay.MIDNIGHT) {
      state.environmentStats.nightsPlayed += delta / 1000;
    }

    const currentWeather = env.weather.currentWeather;
    if (state.environmentStats.weatherExperience[currentWeather] !== undefined) {
      state.environmentStats.weatherExperience[currentWeather] += delta / 1000;
    }
  }

  public getCurrentTimeEffect() {
    const state = SaveManager.getInstance().getGameState();
    return TIME_EFFECTS[state.environment.time.timeOfDay];
  }

  public getCurrentSeasonEffect() {
    const state = SaveManager.getInstance().getGameState();
    return SEASON_EFFECTS[state.environment.time.season];
  }

  public getSpawnMultiplier(petalType: any): number {
    const timeEffect = this.getCurrentTimeEffect();
    const seasonEffect = this.getCurrentSeasonEffect();
    
    const timeMod = timeEffect.spawnWeightModifier[petalType] || 1;
    const seasonMod = seasonEffect.spawnWeightModifier[petalType] || 1;
    
    return timeMod * seasonMod;
  }

  public getRareDropBoost(): number {
    const timeEffect = this.getCurrentTimeEffect();
    const seasonEffect = this.getCurrentSeasonEffect();
    return timeEffect.rareDropBoost * seasonEffect.rareDropBoost;
  }

  public isFullMoon(): boolean {
    const state = SaveManager.getInstance().getGameState();
    return state.environment.time.isFullMoon;
  }

  public getSeason(): SeasonType {
    const state = SaveManager.getInstance().getGameState();
    return state.environment.time.season;
  }

  public getTimeOfDayState(): TimeOfDay {
    const state = SaveManager.getInstance().getGameState();
    return state.environment.time.timeOfDay;
  }

  public getDayCount(): number {
    const state = SaveManager.getInstance().getGameState();
    return state.environment.time.dayCount;
  }

  private getTimeIcon(time: TimeOfDay): string {
    const icons: Record<TimeOfDay, string> = {
      [TimeOfDay.DAWN]: '🌅',
      [TimeOfDay.DAY]: '☀️',
      [TimeOfDay.DUSK]: '🌇',
      [TimeOfDay.NIGHT]: '🌙',
      [TimeOfDay.MIDNIGHT]: '🌟'
    };
    return icons[time];
  }

  private getTimeName(time: TimeOfDay): string {
    const names: Record<TimeOfDay, string> = {
      [TimeOfDay.DAWN]: '黎明',
      [TimeOfDay.DAY]: '正午',
      [TimeOfDay.DUSK]: '黄昏',
      [TimeOfDay.NIGHT]: '夜幕',
      [TimeOfDay.MIDNIGHT]: '午夜'
    };
    return names[time];
  }

  public destroy(): void {
    this.eventListeners.forEach(({ event, callback }) => {
      EventManager.getInstance().off(event as any, callback);
    });
    this.eventListeners = [];
  }
}
