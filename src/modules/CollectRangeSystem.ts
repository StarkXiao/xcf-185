import Phaser from 'phaser';
import { calculateCollectRange, COLLECT_RANGE_GROWTH } from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { EventManager } from '../managers/EventManager';

export class CollectRangeSystem {
  private scene: Phaser.Scene;
  private rangeIndicator: Phaser.GameObjects.Graphics | null = null;
  private attractRangeIndicator: Phaser.GameObjects.Graphics | null = null;
  private progressRing: Phaser.GameObjects.Graphics | null = null;
  private currentRange: number = COLLECT_RANGE_GROWTH.baseRange;
  private currentLevel: number = 1;
  private currentProgress: number = 0;
  private lastCollectedCount: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public create(): void {
    const state = SaveManager.getInstance().getGameState();
    const { range, level, progress } = calculateCollectRange(state.totalCollected);
    this.currentRange = range;
    this.currentLevel = level;
    this.currentProgress = progress;
    this.lastCollectedCount = state.totalCollected;

    this.createRangeIndicator();
    this.setupEventListeners();
  }

  private createRangeIndicator(): void {
    this.rangeIndicator = this.scene.add.graphics();
    this.rangeIndicator.setDepth(14);
    this.updateRangeVisual();

    this.attractRangeIndicator = this.scene.add.graphics();
    this.attractRangeIndicator.setDepth(13);
    this.updateAttractRangeVisual();

    this.progressRing = this.scene.add.graphics();
    this.progressRing.setDepth(15);
    this.updateProgressRing();
  }

  private updateRangeVisual(): void {
    if (!this.rangeIndicator) return;

    this.rangeIndicator.clear();
    
    const alpha = 0.15 + Math.sin(this.scene.time.now * 0.003) * 0.05;
    this.rangeIndicator.lineStyle(2, 0xa8e6cf, 0.6);
    this.rangeIndicator.fillStyle(0xa8e6cf, alpha);
    this.rangeIndicator.beginPath();
    this.rangeIndicator.arc(0, 0, this.currentRange, 0, Math.PI * 2);
    this.rangeIndicator.fill();
    this.rangeIndicator.stroke();

    this.rangeIndicator.lineStyle(1, 0xffffff, 0.3);
    this.rangeIndicator.beginPath();
    this.rangeIndicator.arc(0, 0, this.currentRange * 0.9, 0, Math.PI * 2);
    this.rangeIndicator.stroke();
  }

  private updateAttractRangeVisual(): void {
    if (!this.attractRangeIndicator) return;

    this.attractRangeIndicator.clear();
    
    const attractRange = this.currentRange * 2;
    this.attractRangeIndicator.lineStyle(1, 0x88ccff, 0.2);
    this.attractRangeIndicator.fillStyle(0x88ccff, 0.05);
    this.attractRangeIndicator.beginPath();
    this.attractRangeIndicator.arc(0, 0, attractRange, 0, Math.PI * 2);
    this.attractRangeIndicator.fill();
    this.attractRangeIndicator.stroke();
  }

  private updateProgressRing(): void {
    if (!this.progressRing) return;

    this.progressRing.clear();
    
    const ringRadius = this.currentRange + 15;
    const ringWidth = 6;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (this.currentProgress * Math.PI * 2);

    this.progressRing.lineStyle(ringWidth, 0x333333, 0.5);
    this.progressRing.beginPath();
    this.progressRing.arc(0, 0, ringRadius, 0, Math.PI * 2);
    this.progressRing.stroke();

    if (this.currentProgress > 0) {
      const gradientColors = [0xff6b9d, 0xffd93d, 0xa8e6cf];
      const colorIndex = Math.min(Math.floor(this.currentLevel / 3), gradientColors.length - 1);
      
      this.progressRing.lineStyle(ringWidth, gradientColors[colorIndex], 0.9);
      this.progressRing.beginPath();
      this.progressRing.arc(0, 0, ringRadius, startAngle, endAngle);
      this.progressRing.stroke();
    }
  }

  private setupEventListeners(): void {
    const onCollected = () => {
      this.updateRange();
    };
    EventManager.getInstance().on('petal:collected', onCollected);
  }

  public updateRange(): void {
    const state = SaveManager.getInstance().getGameState();
    const { range, level, progress } = calculateCollectRange(state.totalCollected);

    if (level !== this.currentLevel) {
      this.playLevelUpEffect();
    }

    this.currentRange = range;
    this.currentLevel = level;
    this.currentProgress = progress;

    this.updateRangeVisual();
    this.updateAttractRangeVisual();
    this.updateProgressRing();

    if (this.currentLevel >= COLLECT_RANGE_GROWTH.maxLevel) {
      this.currentProgress = 1;
    }

    EventManager.getInstance().emit('collectRange:updated', { 
      range: this.currentRange, 
      level: this.currentLevel 
    });

    this.lastCollectedCount = state.totalCollected;
  }

  private playLevelUpEffect(): void {
    const centerX = this.scene.cameras.main.worldView.x + this.scene.cameras.main.width / 2;
    const centerY = this.scene.cameras.main.worldView.y + this.scene.cameras.main.height / 2;

    const levelUpText = this.scene.add.text(centerX, centerY - 50, 
      `吸附范围 Lv.${this.currentLevel}!`, {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffd93d',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(200).setScrollFactor(0);

    this.scene.tweens.add({
      targets: levelUpText,
      y: centerY - 100,
      alpha: 0,
      scale: 1.5,
      duration: 1500,
      ease: 'Cubic.Out',
      onComplete: () => levelUpText.destroy()
    });

    for (let i = 0; i < 20; i++) {
      const particle = this.scene.add.circle(centerX, centerY, 5, 0xffd93d, 1)
        .setDepth(199).setScrollFactor(0);
      
      const angle = (i / 20) * Math.PI * 2;
      const distance = 100 + Math.random() * 100;
      
      this.scene.tweens.add({
        targets: particle,
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0,
        duration: 800,
        ease: 'Cubic.Out',
        onComplete: () => particle.destroy()
      });
    }

    const ring = this.scene.add.graphics().setDepth(198).setScrollFactor(0);
    ring.lineStyle(4, 0xffd93d, 0.8);
    ring.beginPath();
    ring.arc(centerX, centerY, 20, 0, Math.PI * 2);
    ring.stroke();

    this.scene.tweens.add({
      targets: ring,
      scale: 5,
      alpha: 0,
      duration: 600,
      ease: 'Cubic.Out',
      onComplete: () => ring.destroy()
    });

    EventManager.getInstance().emit('audio:play', { key: 'sfx_collect', volume: 0.5 });
  }

  public updatePosition(x: number, y: number): void {
    if (this.rangeIndicator) {
      this.rangeIndicator.setPosition(x, y);
    }
    if (this.attractRangeIndicator) {
      this.attractRangeIndicator.setPosition(x, y);
    }
    if (this.progressRing) {
      this.progressRing.setPosition(x, y);
    }
  }

  public update(time: number, delta: number): void {
    this.updateRangeVisual();
    this.updateProgressRing();
  }

  public getCurrentRange(): number {
    return this.currentRange;
  }

  public getAttractRange(): number {
    return this.currentRange * 2;
  }

  public getCurrentLevel(): number {
    return this.currentLevel;
  }

  public getProgress(): number {
    return this.currentProgress;
  }

  public destroy(): void {
    if (this.rangeIndicator) {
      this.rangeIndicator.destroy();
    }
    if (this.attractRangeIndicator) {
      this.attractRangeIndicator.destroy();
    }
    if (this.progressRing) {
      this.progressRing.destroy();
    }
  }
}
