import Phaser from 'phaser';
import { EventManager } from './EventManager';
import { SaveManager } from './SaveManager';

export class AudioManager {
  private static instance: AudioManager;
  private scene: Phaser.Scene | null = null;
  private bgmSound: Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound | null = null;
  private sfxCache: Map<string, Phaser.Sound.HTML5AudioSound | Phaser.Sound.WebAudioSound> = new Map();

  private constructor() {
    EventManager.getInstance().on('audio:play', ({ key, volume }) => {
      this.playSfx(key, volume);
    });
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
    if (this.bgmSound && this.bgmSound.isPlaying) {
      this.bgmSound.stop();
      this.bgmSound.destroy();
      this.bgmSound = null;
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
    if (this.bgmSound) {
      this.bgmSound.setVolume(volume);
    }
  }

  public setSfxVolume(volume: number): void {
    SaveManager.getInstance().updateSettings({ sfxVolume: Math.max(0, Math.min(1, volume)) });
  }

  public toggleMute(): boolean {
    const settings = SaveManager.getInstance().getSettings();
    const newMuted = !settings.isMuted;
    SaveManager.getInstance().updateSettings({ isMuted: newMuted });

    if (newMuted) {
      this.stopBgm();
    } else {
      this.playBgm('bgm_main');
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
  }
}
