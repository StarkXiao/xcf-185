import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PETAL_CONFIGS } from '../config/GameConfig';
import { AudioManager } from '../managers/AudioManager';
import { PetalType } from '../types';

export class PreloaderScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressFill!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private percentText!: Phaser.GameObjects.Text;

  constructor() {
    super('Preloader');
  }

  preload(): void {
    this.createLoadingUI();
    this.loadAssets();

    this.load.on('progress', (value: number) => {
      this.updateProgress(value);
    });

    this.load.on('complete', () => {
      this.scene.start('Menu');
    });
  }

  private createLoadingUI(): void {
    const bgGradient = this.textures.createCanvas('preload_bg', GAME_WIDTH, GAME_HEIGHT);
    const ctx = bgGradient.getContext();
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, '#0a0514');
    gradient.addColorStop(0.5, '#1a0a2e');
    gradient.addColorStop(1, '#0d2818');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bgGradient.refresh();

    this.add.image(0, 0, 'preload_bg').setOrigin(0, 0);

    for (let i = 0; i < 50; i++) {
      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * GAME_HEIGHT;
      const size = Math.random() * 2 + 1;
      this.add.circle(x, y, size, 0xffffff, Math.random() * 0.5 + 0.2);
    }

    const barWidth = 400;
    const barHeight = 20;
    const barX = (GAME_WIDTH - barWidth) / 2;
    const barY = GAME_HEIGHT / 2 + 50;

    this.progressBar = this.add.graphics();
    this.progressBar.fillStyle(0x000000, 0.5);
    this.progressBar.fillRoundedRect(barX, barY, barWidth, barHeight, 10);
    this.progressBar.lineStyle(2, 0xa8e6cf, 0.8);
    this.progressBar.strokeRoundedRect(barX, barY, barWidth, barHeight, 10);

    this.progressFill = this.add.graphics();

    this.loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, '梦境加载中...', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5);

    this.percentText = this.add.text(GAME_WIDTH / 2, barY + 40, '0%', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#a8e6cf'
    }).setOrigin(0.5);

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, '梦境森林', {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const titleGlow = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, '梦境森林', {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: '#a8e6cf',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: titleGlow,
      alpha: { from: 0.3, to: 0.8 },
      duration: 2000,
      yoyo: true,
      repeat: -1
    });
  }

  private loadAssets(): void {
    this.load.audio('bgm_main', this.createSilentAudio());
    this.load.audio('bgm_menu', this.createSilentAudio());
    this.load.audio('bgm_explore', this.createSilentAudio());
    this.load.audio('bgm_synthesis', this.createSilentAudio());
    this.load.audio('bgm_complete', this.createSilentAudio());
    this.load.audio('sfx_collect', this.createSilentAudio());
    this.load.audio('sfx_click', this.createSilentAudio());
    this.load.audio('sfx_synthesis_start', this.createSilentAudio());
    this.load.audio('sfx_synthesis_complete', this.createSilentAudio());
    this.load.audio('sfx_synthesis_mutation', this.createSilentAudio());
    this.load.audio('sfx_synthesis_fail', this.createSilentAudio());
    this.load.audio('sfx_wakeup', this.createSilentAudio());
  }

  private createSilentAudio(): string {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < buffer.length; i++) {
      data[i] = 0;
    }
    
    const wav = this.bufferToWav(buffer);
    const blob = new Blob([wav], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  private bufferToWav(buffer: AudioBuffer): ArrayBuffer {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    
    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;
    
    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);
    
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);
    
    const channelData: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channelData.push(buffer.getChannelData(i));
    }
    
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  }

  private updateProgress(value: number): void {
    const barWidth = 400;
    const barHeight = 20;
    const barX = (GAME_WIDTH - barWidth) / 2;
    const barY = GAME_HEIGHT / 2 + 50;

    this.progressFill.clear();
    const fillWidth = Math.max(0, (barWidth - 4) * value);

    this.progressFill.fillGradientStyle(
      0xa8e6cf, 0xff6b9d,
      0xa8e6cf, 0xff6b9d,
      1, 1, 1, 1
    );
    this.progressFill.fillRoundedRect(barX + 2, barY + 2, fillWidth, barHeight - 4, 8);

    this.percentText.setText(`${Math.round(value * 100)}%`);
  }

  create(): void {
    AudioManager.getInstance().setScene(this);
    this.createGlobalTextures();
    this.createPetalTextures();
  }

  private createGlobalTextures(): void {
    const pixelColors = [
      { key: 'pixel_white', color: '#ffffff' },
      { key: 'pixel_yellow', color: '#ffee66' },
      { key: 'pixel_cyan', color: '#a8e6cf' },
      { key: 'pixel_pink', color: '#ff6b9d' }
    ];

    pixelColors.forEach(({ key, color }) => {
      if (this.textures.exists(key)) return;
      const canvas = this.textures.createCanvas(key, 4, 4);
      const ctx = canvas.getContext();
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 4, 4);
      canvas.refresh();
    });
  }

  private createPetalTextures(): void {
    Object.values(PetalType).forEach(type => {
      const textureKey = `petal_${type}`;
      if (this.textures.exists(textureKey)) return;
      this.createPetalTexture(type);
    });
  }

  private createPetalTexture(type: PetalType): void {
    const config = PETAL_CONFIGS[type];
    const size = 32 + config.level * 8;
    const textureKey = `petal_${type}`;
    
    const canvas = this.textures.createCanvas(textureKey, size * 2, size * 2);
    const ctx = canvas.getContext();
    const centerX = size;
    const centerY = size;

    const hexToRgb = (hex: number): string => {
      const r = (hex >> 16) & 255;
      const g = (hex >> 8) & 255;
      const b = hex & 255;
      return `${r}, ${g}, ${b}`;
    };

    const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size * 1.5);
    glowGradient.addColorStop(0, `rgba(${hexToRgb(config.glowColor)}, 0.8)`);
    glowGradient.addColorStop(0.5, `rgba(${hexToRgb(config.glowColor)}, 0.3)`);
    glowGradient.addColorStop(1, `rgba(${hexToRgb(config.glowColor)}, 0)`);
    
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, size * 1.5, 0, Math.PI * 2);
    ctx.fill();

    const petalColor = `#${config.color.toString(16).padStart(6, '0')}`;
    const petalGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size);
    petalGradient.addColorStop(0, '#ffffff');
    petalGradient.addColorStop(0.3, petalColor);
    petalGradient.addColorStop(1, `rgba(${hexToRgb(config.color)}, 0.5)`);

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
}
