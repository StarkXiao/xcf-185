import Phaser from 'phaser';
import { EventManager } from './EventManager';
import { SaveManager } from './SaveManager';
import { AudioContextType, AudioContextPreferences, TimeOfDay, WeatherType } from '../types';
import { AUDIO_CONTEXT_CONFIG, AUDIO_CONTEXT_CONFIG_EXTENDED } from '../config/GameConfig';

export class AudioManager {
  private static instance: AudioManager;
  private scene: Phaser.Scene | null = null;
  private bgmSound: Phaser.Sound.BaseSound | null = null;
  private fadingOutSound: Phaser.Sound.BaseSound | null = null;
  private sfxCache: Map<string, Phaser.Sound.BaseSound> = new Map();
  private currentContext: AudioContextType | null = null;
  private contextPreferences: Partial<Record<AudioContextType, AudioContextPreferences>> = {};
  private crossFadeTween: Phaser.Tweens.Tween | null = null;

  private constructor() {
    EventManager.getInstance().on('audio:play', ({ key, volume }) => {
      this.playSfx(key, volume);
    });

    EventManager.getInstance().on('settings:updated', () => {
      this.loadContextPreferences();
      if (this.currentContext) {
        this.switchContext(this.currentContext, true);
      }
    });

    EventManager.getInstance().on('time:changed', (data: any) => {
      this.updateBgmForEnvironment(data.timeOfDay, null);
    });

    EventManager.getInstance().on('weather:changed', (data: any) => {
      this.updateBgmForEnvironment(null, data.newWeather);
    });

    this.loadContextPreferences();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public setScene(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  private updateBgmForEnvironment(timeOfDay: TimeOfDay | null, weather: WeatherType | null): void {
    if (!this.currentContext || this.currentContext !== AudioContextType.EXPLORE) return;
    
    const config = AUDIO_CONTEXT_CONFIG_EXTENDED[this.currentContext];
    if (!config) return;

    let bgmKey = config.bgmKey;
    
    const state = SaveManager.getInstance().getGameState();
    const env = state.environment;
    
    const currentTime = timeOfDay || env?.time.timeOfDay;
    const currentWeather = weather || env?.weather.currentWeather;
    
    if (config.weatherVariations && currentWeather && config.weatherVariations[currentWeather]) {
      bgmKey = config.weatherVariations[currentWeather]!;
    } else if (config.timeVariations && currentTime && config.timeVariations[currentTime]) {
      bgmKey = config.timeVariations[currentTime]!;
    }
    
    if (this.bgmSound && bgmKey !== config.bgmKey) {
      const prefs = this.getEffectivePreferences(this.currentContext);
      this.crossFadeTo(bgmKey, prefs.volume, config.crossFadeDuration);
    }
  }

  public switchContext(context: AudioContextType, force: boolean = false): void {
    if (this.currentContext === context && !force) return;

    const previousContext = this.currentContext;
    this.currentContext = context;

    const config = AUDIO_CONTEXT_CONFIG_EXTENDED[context] || AUDIO_CONTEXT_CONFIG[context];
    if (!config) return;

    const prefs = this.getEffectivePreferences(context);

    if (!prefs.enabled) {
      this.stopBgm();
      EventManager.getInstance().emit('audio:context_changed', {
        context,
        previousContext
      });
      return;
    }

    const settings = SaveManager.getInstance().getSettings();
    if (settings.isMuted) {
      this.stopBgm();
      EventManager.getInstance().emit('audio:context_changed', {
        context,
        previousContext
      });
      return;
    }

    let bgmKey = config.bgmKey;
    
    if (context === AudioContextType.EXPLORE) {
      const extendedConfig = AUDIO_CONTEXT_CONFIG_EXTENDED[context];
      const state = SaveManager.getInstance().getGameState();
      const env = state.environment;
      
      if (extendedConfig && extendedConfig.weatherVariations && env?.weather.currentWeather) {
        const weatherBgm = extendedConfig.weatherVariations[env.weather.currentWeather];
        if (weatherBgm) {
          bgmKey = weatherBgm;
        }
      }
      
      if (bgmKey === config.bgmKey && extendedConfig && extendedConfig.timeVariations && env?.time.timeOfDay) {
        const timeBgm = extendedConfig.timeVariations[env.time.timeOfDay];
        if (timeBgm) {
          bgmKey = timeBgm;
        }
      }
    }

    this.crossFadeTo(bgmKey, prefs.volume, config.crossFadeDuration);

    EventManager.getInstance().emit('audio:context_changed', {
      context,
      previousContext
    });
  }

  public getCurrentContext(): AudioContextType | null {
    return this.currentContext;
  }

  private crossFadeTo(newBgmKey: string, targetVolume: number, duration: number): void {
    if (!this.scene) return;

    if (this.crossFadeTween) {
      this.crossFadeTween.stop();
      this.crossFadeTween = null;
    }

    if (this.fadingOutSound) {
      if ((this.fadingOutSound as Phaser.Sound.WebAudioSound).isPlaying) {
        (this.fadingOutSound as Phaser.Sound.WebAudioSound).stop();
      }
      this.fadingOutSound.destroy();
      this.fadingOutSound = null;
    }

    if (this.bgmSound && (this.bgmSound as Phaser.Sound.WebAudioSound).isPlaying) {
      this.fadingOutSound = this.bgmSound;
      const fadeOutSound = this.fadingOutSound;
      const fadeOutProxy = { vol: (fadeOutSound as Phaser.Sound.WebAudioSound).volume };

      this.scene.tweens.add({
        targets: fadeOutProxy,
        vol: 0,
        duration: duration,
        ease: 'Linear',
        onUpdate: () => {
          if (fadeOutSound && (fadeOutSound as Phaser.Sound.WebAudioSound).isPlaying) {
            (fadeOutSound as Phaser.Sound.WebAudioSound).setVolume(fadeOutProxy.vol);
          }
        },
        onComplete: () => {
          if (fadeOutSound && (fadeOutSound as Phaser.Sound.WebAudioSound).isPlaying) {
            (fadeOutSound as Phaser.Sound.WebAudioSound).stop();
          }
          fadeOutSound.destroy();
          if (this.fadingOutSound === fadeOutSound) {
            this.fadingOutSound = null;
          }
        }
      });

      this.bgmSound = null;
    }

    try {
      this.bgmSound = this.scene.sound.add(newBgmKey, {
        loop: true,
        volume: 0
      });
      this.bgmSound.play();

      const fadeInProxy = { vol: 0 };
      this.crossFadeTween = this.scene.tweens.add({
        targets: fadeInProxy,
        vol: targetVolume,
        duration: duration,
        ease: 'Cubic.Out',
        onUpdate: () => {
          if (this.bgmSound && (this.bgmSound as Phaser.Sound.WebAudioSound).isPlaying) {
            (this.bgmSound as Phaser.Sound.WebAudioSound).setVolume(fadeInProxy.vol);
          }
        }
      });
    } catch (error) {
      console.warn('Audio not available, using silent fallback');
    }
  }

  public playBgm(key: string): void {
    if (!this.scene) return;

    const settings = SaveManager.getInstance().getSettings();
    if (settings.isMuted) return;

    this.stopBgm();

    try {
      this.bgmSound = this.scene.sound.add(key, {
        loop: true,
        volume: settings.bgmVolume
      });
      this.bgmSound.play();
    } catch (error) {
      console.warn('Audio not available, using silent fallback');
    }
  }

  public stopBgm(): void {
    if (this.crossFadeTween) {
      this.crossFadeTween.stop();
      this.crossFadeTween = null;
    }

    if (this.bgmSound && (this.bgmSound as Phaser.Sound.WebAudioSound).isPlaying) {
      (this.bgmSound as Phaser.Sound.WebAudioSound).stop();
      this.bgmSound.destroy();
      this.bgmSound = null;
    }

    if (this.fadingOutSound) {
      if ((this.fadingOutSound as Phaser.Sound.WebAudioSound).isPlaying) {
        (this.fadingOutSound as Phaser.Sound.WebAudioSound).stop();
      }
      this.fadingOutSound.destroy();
      this.fadingOutSound = null;
    }
  }

  public playSfx(key: string, volume?: number): void {
    if (!this.scene) return;

    const settings = SaveManager.getInstance().getSettings();
    if (settings.isMuted) return;

    const sfxVolume = volume ?? settings.sfxVolume;

    try {
      const sfx = this.scene.sound.add(key, {
        volume: sfxVolume
      });
      sfx.play();
      sfx.once('complete', () => sfx.destroy());
    } catch (error) {
      console.warn('SFX not available:', key);
    }
  }

  public setBgmVolume(volume: number): void {
    SaveManager.getInstance().updateSettings({ bgmVolume: Math.max(0, Math.min(1, volume)) });
    if (this.bgmSound && this.currentContext) {
      const prefs = this.getEffectivePreferences(this.currentContext);
      const effectiveVolume = prefs.enabled ? prefs.volume : 0;
      (this.bgmSound as Phaser.Sound.WebAudioSound).setVolume(effectiveVolume);
    } else if (this.bgmSound) {
      (this.bgmSound as Phaser.Sound.WebAudioSound).setVolume(volume);
    }
  }

  public setSfxVolume(volume: number): void {
    SaveManager.getInstance().updateSettings({ sfxVolume: Math.max(0, Math.min(1, volume)) });
  }

  public setContextVolume(context: AudioContextType, volume: number): void {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    const config = AUDIO_CONTEXT_CONFIG_EXTENDED[context] || AUDIO_CONTEXT_CONFIG[context];
    const prefs = this.contextPreferences[context] || { volume: config.defaultVolume, enabled: true };
    this.contextPreferences[context] = { ...prefs, volume: clampedVolume };
    this.saveContextPreferences();

    if (this.currentContext === context && this.bgmSound) {
      (this.bgmSound as Phaser.Sound.WebAudioSound).setVolume(clampedVolume);
    }

    EventManager.getInstance().emit('audio:context_preference_updated', {
      context,
      preferences: this.contextPreferences[context]!
    });
  }

  public setContextEnabled(context: AudioContextType, enabled: boolean): void {
    const config = AUDIO_CONTEXT_CONFIG_EXTENDED[context] || AUDIO_CONTEXT_CONFIG[context];
    const prefs = this.contextPreferences[context] || { volume: config.defaultVolume, enabled: true };
    this.contextPreferences[context] = { ...prefs, enabled };
    this.saveContextPreferences();

    if (this.currentContext === context) {
      if (!enabled) {
        this.stopBgm();
      } else {
        this.switchContext(context);
      }
    }

    EventManager.getInstance().emit('audio:context_preference_updated', {
      context,
      preferences: this.contextPreferences[context]!
    });
  }

  public getContextPreferences(context: AudioContextType): AudioContextPreferences {
    return this.getEffectivePreferences(context);
  }

  private getEffectivePreferences(context: AudioContextType): AudioContextPreferences {
    const saved = this.contextPreferences[context];
    const config = AUDIO_CONTEXT_CONFIG_EXTENDED[context] || AUDIO_CONTEXT_CONFIG[context];
    if (saved) {
      return saved;
    }
    return { volume: config.defaultVolume, enabled: true };
  }

  private loadContextPreferences(): void {
    try {
      const settings = SaveManager.getInstance().getSettings();
      if (settings.audioContextPreferences) {
        this.contextPreferences = { ...settings.audioContextPreferences };
      }
    } catch (error) {
      this.contextPreferences = {};
    }
  }

  private saveContextPreferences(): void {
    SaveManager.getInstance().updateSettings({
      audioContextPreferences: { ...this.contextPreferences }
    });
  }

  public toggleMute(): boolean {
    const settings = SaveManager.getInstance().getSettings();
    const newMuted = !settings.isMuted;
    SaveManager.getInstance().updateSettings({ isMuted: newMuted });

    if (newMuted) {
      this.stopBgm();
    } else {
      if (this.currentContext) {
        this.switchContext(this.currentContext, true);
      } else {
        this.playBgm('bgm_main');
      }
    }

    return newMuted;
  }

  public isMuted(): boolean {
    return SaveManager.getInstance().getSettings().isMuted;
  }

  public destroy(): void {
    this.stopBgm();
    this.sfxCache.clear();
    this.scene = null;
    this.currentContext = null;
  }
}
