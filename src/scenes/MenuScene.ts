import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';

export class MenuScene extends Phaser.Scene {
  private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private titleGlow: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('Menu');
  }

  create(): void {
    AudioManager.getInstance().setScene(this);
    AudioManager.getInstance().playBgm('bgm_menu');

    this.createBackground();
    this.createTitle();
    this.createButtons();
    this.createFloatingPetals();
  }

  private createBackground(): void {
    const gradient = this.textures.createCanvas('menu_bg', GAME_WIDTH, GAME_HEIGHT);
    const ctx = gradient.getContext();
    
    const bgGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    bgGradient.addColorStop(0, '#0a0514');
    bgGradient.addColorStop(0.3, '#1a0a2e');
    bgGradient.addColorStop(0.7, '#0d1a26');
    bgGradient.addColorStop(1, '#0d2818');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let i = 0; i < 100; i++) {
      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * GAME_HEIGHT * 0.7;
      const size = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.8 + 0.2;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }

    const forestGradient = ctx.createLinearGradient(0, GAME_HEIGHT * 0.6, 0, GAME_HEIGHT);
    forestGradient.addColorStop(0, 'rgba(13, 40, 24, 0)');
    forestGradient.addColorStop(0.5, 'rgba(13, 40, 24, 0.8)');
    forestGradient.addColorStop(1, 'rgba(10, 26, 18, 1)');
    ctx.fillStyle = forestGradient;
    ctx.fillRect(0, GAME_HEIGHT * 0.6, GAME_WIDTH, GAME_HEIGHT * 0.4);

    gradient.refresh();
    this.add.image(0, 0, 'menu_bg').setOrigin(0, 0);

    const fogGradient = this.textures.createCanvas('menu_fog', GAME_WIDTH, GAME_HEIGHT);
    const fogCtx = fogGradient.getContext();
    const fogGrad = fogCtx.createRadialGradient(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, 0,
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH
    );
    fogGrad.addColorStop(0, 'rgba(100, 50, 150, 0)');
    fogGrad.addColorStop(1, 'rgba(30, 10, 50, 0.4)');
    fogCtx.fillStyle = fogGrad;
    fogCtx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    fogGradient.refresh();

    this.add.image(0, 0, 'menu_fog').setOrigin(0, 0);
  }

  private createTitle(): void {
    const titleY = GAME_HEIGHT * 0.25;

    const mainTitle = this.add.text(GAME_WIDTH / 2, titleY, '梦境森林', {
      fontFamily: 'Arial',
      fontSize: '72px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.titleGlow = this.add.text(GAME_WIDTH / 2, titleY, '梦境森林', {
      fontFamily: 'Arial',
      fontSize: '72px',
      color: '#a8e6cf',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: this.titleGlow,
      alpha: { from: 0.3, to: 0.8 },
      scale: { from: 1, to: 1.05 },
      duration: 2500,
      yoyo: true,
      repeat: -1
    });

    const subtitle = this.add.text(GAME_WIDTH / 2, titleY + 80, '唤醒沉睡的恋人', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#a8e6cf',
      align: 'center'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: subtitle,
      alpha: { from: 0.6, to: 1 },
      duration: 2000,
      yoyo: true,
      repeat: -1
    });
  }

  private createButtons(): void {
    const startY = GAME_HEIGHT * 0.48;
    const hasSave = SaveManager.getInstance().hasSave();

    if (hasSave) {
      this.createButton('继续游戏', startY, () => {
        this.scene.start('Game', { continueGame: true });
      });
      this.createButton('新的开始', startY + 100, () => {
        SaveManager.getInstance().resetGame();
        this.scene.start('Game', { continueGame: false });
      });
    } else {
      this.createButton('开始游戏', startY, () => {
        SaveManager.getInstance().resetGame();
        this.scene.start('Game', { continueGame: false });
      });
    }

    const isMuted = AudioManager.getInstance().isMuted();
    const muteBtn = this.createButton(isMuted ? '🔇 开启音效' : '🔊 关闭音效', startY + 200, () => {
      const newMuted = AudioManager.getInstance().toggleMute();
      muteBtn.setText(newMuted ? '🔇 开启音效' : '🔊 关闭音效');
    }, 0x666666);
  }

  private createButton(text: string, y: number, callback: () => void, color: number = 0xff6b9d): Phaser.GameObjects.Text {
    const btnWidth = 300;
    const btnHeight = 70;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(color, 0.8);
    btnBg.fillRoundedRect((GAME_WIDTH - btnWidth) / 2, y - btnHeight / 2, btnWidth, btnHeight, 15);
    btnBg.lineStyle(3, 0xffffff, 0.5);
    btnBg.strokeRoundedRect((GAME_WIDTH - btnWidth) / 2, y - btnHeight / 2, btnWidth, btnHeight, 15);

    const glowTextureKey = `btn_glow_${color}_${y}`;
    if (!this.textures.exists(glowTextureKey)) {
      const glowCanvas = this.textures.createCanvas(glowTextureKey, 360, 360);
      const glowCtx = glowCanvas.getContext();
      const center = 180;
      const grad = glowCtx.createRadialGradient(center, center, 0, center, center, 180);
      grad.addColorStop(0, `rgba(${this.hexToRgb(color)}, 0.3)`);
      grad.addColorStop(1, `rgba(${this.hexToRgb(color)}, 0)`);
      glowCtx.fillStyle = grad;
      glowCtx.beginPath();
      glowCtx.arc(center, center, 180, 0, Math.PI * 2);
      glowCtx.fill();
      glowCanvas.refresh();
    }

    const btnGlow = this.add.image(GAME_WIDTH / 2, y, glowTextureKey).setBlendMode(Phaser.BlendModes.ADD);

    const btnText = this.add.text(GAME_WIDTH / 2, y, text, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const hitZone = this.add.zone(GAME_WIDTH / 2, y, btnWidth, btnHeight)
      .setInteractive({ useHandCursor: true });

    hitZone.on('pointerover', () => {
      this.tweens.add({
        targets: [btnBg, btnText, btnGlow],
        scale: 1.05,
        duration: 200
      });
    });

    hitZone.on('pointerout', () => {
      this.tweens.add({
        targets: [btnBg, btnText, btnGlow],
        scale: 1,
        duration: 200
      });
    });

    hitZone.on('pointerdown', () => {
      this.tweens.add({
        targets: [btnBg, btnText],
        scale: 0.95,
        duration: 100
      });
      AudioManager.getInstance().playSfx('sfx_click');
    });

    hitZone.on('pointerup', () => {
      this.tweens.add({
        targets: [btnBg, btnText],
        scale: 1,
        duration: 100,
        onComplete: callback
      });
    });

    this.tweens.add({
      targets: btnGlow,
      alpha: { from: 0.5, to: 1 },
      duration: 2000,
      yoyo: true,
      repeat: -1
    });

    return btnText;
  }

  private hexToRgb(hex: number): string {
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    return `${r}, ${g}, ${b}`;
  }

  private createFloatingPetals(): void {
    const petalColors = [0xa8e6cf, 0xffe66d, 0x88ccff, 0xff6b9d];
    
    this.particles = this.add.particles(0, 0, 'pixel_white', {
      x: { min: 0, max: GAME_WIDTH },
      y: { min: -50, max: GAME_HEIGHT },
      lifespan: { min: 4000, max: 8000 },
      speedY: { min: 10, max: 30 },
      speedX: { min: -15, max: 15 },
      scale: { start: 0, end: 3 },
      alpha: { start: 0, end: 0.8 },
      rotate: { min: 0, max: 360 },
      quantity: 1,
      frequency: 300,
      blendMode: 'ADD',
      tint: petalColors
    });
  }

  update(): void {}

  destroy(): void {
    if (this.particles) {
      this.particles.stop();
      this.particles.destroy();
    }
  }
}
