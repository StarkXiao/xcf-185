import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PETAL_CONFIGS } from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { PetalType } from '../types';

export class ResultScene extends Phaser.Scene {
  private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor() {
    super('Result');
  }

  create(): void {
    AudioManager.getInstance().setScene(this);
    AudioManager.getInstance().playSfx('sfx_wakeup', 0.8);

    this.createBackground();
    this.createWakeUpAnimation();
  }

  private createBackground(): void {
    const gradient = this.textures.createCanvas('result_bg', GAME_WIDTH, GAME_HEIGHT);
    const ctx = gradient.getContext();
    
    const bgGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    bgGradient.addColorStop(0, '#1a0a2e');
    bgGradient.addColorStop(0.3, '#2a1a4e');
    bgGradient.addColorStop(0.7, '#1a3a4e');
    bgGradient.addColorStop(1, '#1a4a3e');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let i = 0; i < 150; i++) {
      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * GAME_HEIGHT;
      const size = Math.random() * 3 + 1;
      const alpha = Math.random() * 0.8 + 0.2;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }

    gradient.refresh();
    this.add.image(0, 0, 'result_bg').setOrigin(0, 0);

    const lightGradient = this.textures.createCanvas('result_light', GAME_WIDTH, GAME_HEIGHT);
    const lightCtx = lightGradient.getContext();
    const lightGrad = lightCtx.createRadialGradient(
      GAME_WIDTH / 2, GAME_HEIGHT * 0.4, 0,
      GAME_WIDTH / 2, GAME_HEIGHT * 0.4, GAME_WIDTH * 0.8
    );
    lightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    lightGrad.addColorStop(0.3, 'rgba(255, 200, 230, 0.2)');
    lightGrad.addColorStop(0.6, 'rgba(200, 150, 255, 0.1)');
    lightGrad.addColorStop(1, 'rgba(100, 50, 150, 0)');
    lightCtx.fillStyle = lightGrad;
    lightCtx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    lightGradient.refresh();

    const lightImage = this.add.image(0, 0, 'result_light').setOrigin(0, 0).setAlpha(0);
    
    this.tweens.add({
      targets: lightImage,
      alpha: 1,
      duration: 2000,
      ease: 'Cubic.Out'
    });
  }

  private createWakeUpAnimation(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT * 0.4;

    const wakeupPetal = this.add.image(centerX, centerY - 100, `petal_${PetalType.WAKEUP}`)
      .setDisplaySize(150, 150)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setScale(0);

    this.tweens.add({
      targets: wakeupPetal,
      alpha: 1,
      scale: 1,
      duration: 1500,
      delay: 500,
      ease: 'Elastic.Out'
    });

    this.tweens.add({
      targets: wakeupPetal,
      rotation: Math.PI * 4,
      duration: 3000,
      delay: 500,
      ease: 'Cubic.Out'
    });

    this.particles = this.add.particles(centerX, centerY - 100, 'pixel_white', {
      lifespan: 2000,
      speed: { min: 50, max: 150 },
      angle: { min: 0, max: 360 },
      scale: { start: 0, end: 4 },
      alpha: { start: 1, end: 0 },
      quantity: 5,
      frequency: 100,
      blendMode: 'ADD',
      tint: [0xffffff, 0xff6b9d, 0xa8e6cf, 0xffd93d],
      delay: 1000
    });

    this.cameras.main.flash(1000, 255, 255, 255);

    const title = this.add.text(centerX, centerY + 80, '恋人已苏醒', {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);

    const titleGlow = this.add.text(centerX, centerY + 80, '恋人已苏醒', {
      fontFamily: 'Arial',
      fontSize: '48px',
      color: '#ff6b9d',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: [title, titleGlow],
      alpha: 1,
      duration: 1000,
      delay: 2000,
      ease: 'Cubic.Out'
    });

    const subtitle = this.add.text(centerX, centerY + 140, '在梦境森林中，你们终于重逢', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#a8e6cf',
      align: 'center'
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: subtitle,
      alpha: 1,
      duration: 1000,
      delay: 2500,
      ease: 'Cubic.Out'
    });

    this.time.delayedCall(3000, () => {
      this.createStatsPanel();
    });
  }

  private createStatsPanel(): void {
    const state = SaveManager.getInstance().getGameState();
    const panelY = GAME_HEIGHT * 0.65;
    const panelWidth = GAME_WIDTH - 80;
    const panelHeight = 400;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a0514, 0.9);
    panelBg.fillRoundedRect(40, panelY, panelWidth, panelHeight, 20);
    panelBg.lineStyle(3, 0xa8e6cf, 0.5);
    panelBg.strokeRoundedRect(40, panelY, panelWidth, panelHeight, 20);
    panelBg.setAlpha(0);

    const statsTitle = this.add.text(GAME_WIDTH / 2, panelY + 40, '游戏统计', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);

    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}分${secs}秒`;
    };

    const stats = [
      { label: '游戏时长', value: formatTime(state.playTime), color: '#a8e6cf' },
      { label: '收集花瓣', value: `${state.totalCollected}朵`, color: '#ffe66d' },
      { label: '合成次数', value: `${state.totalSynthesized}次`, color: '#ff6b9d' },
      { label: '解锁花瓣', value: `${state.unlockedPetals.length}/${Object.values(PetalType).length}种`, color: '#88ccff' }
    ];

    const statTexts: Phaser.GameObjects.Text[] = [];
    stats.forEach((stat, index) => {
      const labelText = this.add.text(80, panelY + 100 + index * 60, stat.label, {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#888888'
      }).setOrigin(0, 0.5).setAlpha(0);

      const valueText = this.add.text(GAME_WIDTH - 80, panelY + 100 + index * 60, stat.value, {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: stat.color,
        fontStyle: 'bold'
      }).setOrigin(1, 0.5).setAlpha(0);

      statTexts.push(labelText, valueText);
    });

    this.tweens.add({
      targets: [panelBg, statsTitle, ...statTexts],
      alpha: 1,
      duration: 800,
      delay: this.tweens.stagger(100),
      ease: 'Cubic.Out'
    });

    const petalIconsContainer = this.add.container(GAME_WIDTH / 2, panelY + 340).setAlpha(0);
    
    state.unlockedPetals.forEach((type, index) => {
      const config = PETAL_CONFIGS[type];
      const spacing = 60;
      const startX = -(state.unlockedPetals.length - 1) * spacing / 2;
      
      const petalIcon = this.add.image(startX + index * spacing, 0, `petal_${type}`)
        .setDisplaySize(45, 45)
        .setBlendMode(Phaser.BlendModes.ADD);
      
      petalIconsContainer.add(petalIcon);
    });

    this.tweens.add({
      targets: petalIconsContainer,
      alpha: 1,
      duration: 800,
      delay: 1500,
      ease: 'Cubic.Out'
    });

    this.createButtons(panelY + panelHeight + 30);
  }

  private createButtons(y: number): void {
    const btnWidth = 260;
    const btnHeight = 65;
    const spacing = 30;

    const restartBtn = this.createButton(
      GAME_WIDTH / 2 - btnWidth / 2 - spacing / 2,
      y,
      btnWidth,
      btnHeight,
      '再玩一次',
      0xff6b9d,
      () => {
        SaveManager.getInstance().resetGame();
        this.scene.start('Game', { continueGame: false });
      }
    );

    const menuBtn = this.createButton(
      GAME_WIDTH / 2 + btnWidth / 2 + spacing / 2,
      y,
      btnWidth,
      btnHeight,
      '返回主菜单',
      0x666666,
      () => {
        this.scene.start('Menu');
      }
    );

    [restartBtn, menuBtn].forEach((btn, index) => {
      this.tweens.add({
        targets: btn,
        alpha: 1,
        y: '+=20',
        duration: 600,
        delay: 2000 + index * 200,
        ease: 'Back.Out'
      });
    });
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    text: string,
    color: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y + 20).setAlpha(0);

    const btnBg = this.add.graphics();
    btnBg.fillStyle(color, 0.8);
    btnBg.fillRoundedRect(0, 0, width, height, 12);
    btnBg.lineStyle(2, 0xffffff, 0.5);
    btnBg.strokeRoundedRect(0, 0, width, height, 12);

    const btnText = this.add.text(width / 2, height / 2, text, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([btnBg, btnText]);

    const hitZone = this.add.zone(x, y, width, height)
      .setInteractive({ useHandCursor: true });

    hitZone.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scale: 1.05,
        duration: 200
      });
    });

    hitZone.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 200
      });
    });

    hitZone.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scale: 0.95,
        duration: 100
      });
      AudioManager.getInstance().playSfx('sfx_click');
    });

    hitZone.on('pointerup', () => {
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 100,
        onComplete: callback
      });
    });

    return container;
  }

  destroy(): void {
    if (this.particles) {
      this.particles.stop();
      this.particles.destroy();
    }
  }
}
