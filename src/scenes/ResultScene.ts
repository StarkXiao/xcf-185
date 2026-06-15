import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PETAL_CONFIGS, EFFICIENCY_RATING, RARITY_CONFIG, VISITOR_SPRITE_CONFIGS, getChapterConfig } from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { PetalType, InheritanceOption, InheritanceType, ReviewData, AudioContextType, AffectionLevel, VisitorSpriteId, ChapterStatus, ChapterReviewData } from '../types';

export class ResultScene extends Phaser.Scene {
  private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private reviewData!: ReviewData;
  private currentPanelIndex: number = 0;
  private totalPanels: number = 7;
  private scrollContainer!: Phaser.GameObjects.Container;
  private inheritanceOptions: InheritanceOption[] = [];
  private inheritanceUIRefs: Map<number, { cardBg: Phaser.GameObjects.Graphics; costText: Phaser.GameObjects.Text; costBg: Phaser.GameObjects.Graphics }> = new Map();
  private availablePoints: number = 0;
  private selectedInheritance: InheritanceType[] = [];
  private chapterReviewData: ChapterReviewData[] = [];
  private panelTitles: string[] = ['本局统计', '效率分析', '关键节点', '稀有产出', '访客精灵', '章节回顾', '继承策略'];

  constructor() {
    super('Result');
  }

  create(): void {
    AudioManager.getInstance().setScene(this);
    AudioManager.getInstance().switchContext(AudioContextType.COMPLETE);
    AudioManager.getInstance().playSfx('sfx_wakeup', 0.8);

    this.reviewData = SaveManager.getInstance().getReviewData();
    this.inheritanceOptions = this.reviewData.inheritanceOptions;
    this.availablePoints = SaveManager.getInstance().calculateAvailablePoints();
    this.chapterReviewData = this.getChapterReviewData();

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
    const centerY = GAME_HEIGHT * 0.25;

    const wakeupPetal = this.add.image(centerX, centerY, `petal_${PetalType.WAKEUP}`)
      .setDisplaySize(120, 120)
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

    this.particles = this.add.particles(centerX, centerY, 'pixel_white', {
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
      fontSize: '42px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);

    const titleGlow = this.add.text(centerX, centerY + 80, '恋人已苏醒', {
      fontFamily: 'Arial',
      fontSize: '42px',
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

    const subtitle = this.add.text(centerX, centerY + 130, '在梦境森林中，你们终于重逢', {
      fontFamily: 'Arial',
      fontSize: '18px',
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

    const scoreText = this.add.text(centerX, centerY + 170, `总分: ${this.reviewData.totalScore}`, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);

    this.tweens.add({
      targets: scoreText,
      alpha: 1,
      duration: 1000,
      delay: 3000,
      ease: 'Cubic.Out'
    });

    this.time.delayedCall(3500, () => {
      this.createReviewPanels();
    });
  }

  private createReviewPanels(): void {
    const panelStartY = GAME_HEIGHT * 0.42;
    const panelHeight = GAME_HEIGHT * 0.42;

    this.scrollContainer = this.add.container(0, panelStartY).setAlpha(0);

    this.createPanelIndicators();

    this.createBasicStatsPanel(0);
    this.createEfficiencyPanel(1);
    this.createMilestonesPanel(2);
    this.createRareDropsPanel(3);
    this.createVisitorSpritePanel(4);
    this.createChapterReviewPanel(5);
    this.createInheritancePanel(6);

    this.tweens.add({
      targets: this.scrollContainer,
      alpha: 1,
      duration: 800,
      ease: 'Cubic.Out'
    });

    this.createNavigationButtons();
    this.createBottomButtons(panelStartY + panelHeight + 20);
  }

  private createPanelIndicators(): void {
    const indicatorY = -30;
    const indicatorSpacing = 15;
    const totalWidth = (this.panelTitles.length - 1) * indicatorSpacing;
    const startX = GAME_WIDTH / 2 - totalWidth / 2;

    this.panelTitles.forEach((title, index) => {
      const indicator = this.add.circle(startX + index * indicatorSpacing, indicatorY, 4, 0x888888).setAlpha(0.5);
      indicator.setData('index', index);
      
      if (index === 0) {
        indicator.setFillStyle(0xff6b9d, 1);
        indicator.setScale(1.3);
      }

      this.scrollContainer.add(indicator);

      indicator.setInteractive({ useHandCursor: true });
      indicator.on('pointerdown', () => {
        this.switchToPanel(index);
      });
    });
  }

  private updatePanelIndicators(): void {
    this.scrollContainer.each((child: Phaser.GameObjects.GameObject) => {
      const arcChild = child as Phaser.GameObjects.Arc;
      if (child.type === 'Arc' && typeof arcChild.getData === 'function' && arcChild.getData('index') !== undefined) {
        const idx = arcChild.getData('index') as number;
        if (idx === this.currentPanelIndex) {
          arcChild.setFillStyle(0xff6b9d, 1);
          arcChild.setScale(1.3);
        } else {
          arcChild.setFillStyle(0x888888, 0.5);
          arcChild.setScale(1);
        }
      }
    });
  }

  private createBasicStatsPanel(panelIndex: number): void {
    const state = SaveManager.getInstance().getGameState();
    const panelX = panelIndex * GAME_WIDTH;
    const panelY = 0;
    const panelWidth = GAME_WIDTH - 60;
    const contentWidth = panelWidth - 40;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a0514, 0.9);
    panelBg.fillRoundedRect(30, panelY, panelWidth, 420, 20);
    panelBg.lineStyle(3, 0xa8e6cf, 0.5);
    panelBg.strokeRoundedRect(30, panelY, panelWidth, 420, 20);

    const panelTitle = this.add.text(GAME_WIDTH / 2, panelY + 35, '本局统计', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}分${secs}秒`;
    };

    const stats = [
      { label: '游戏时长', value: formatTime(state.playTime), color: '#a8e6cf', icon: '⏱️' },
      { label: '收集花瓣', value: `${state.totalCollected}朵`, color: '#ffe66d', icon: '🌸' },
      { label: '合成次数', value: `${state.totalSynthesized}次`, color: '#ff6b9d', icon: '⚗️' },
      { label: '变异次数', value: `${state.totalMutations}次`, color: '#c8a2ff', icon: '✨' },
      { label: '失败次数', value: `${state.totalFailures}次`, color: '#ff8888', icon: '💔' },
      { label: '解锁花瓣', value: `${state.unlockedPetals.length}/${Object.values(PetalType).length}种`, color: '#88ccff', icon: '📖' }
    ];

    stats.forEach((stat, index) => {
      const rowY = panelY + 80 + index * 52;
      
      const iconText = this.add.text(50, rowY, stat.icon, {
        fontFamily: 'Arial',
        fontSize: '20px'
      }).setOrigin(0, 0.5);

      const labelText = this.add.text(85, rowY, stat.label, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#888888'
      }).setOrigin(0, 0.5);

      const valueText = this.add.text(GAME_WIDTH - 50, rowY, stat.value, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: stat.color,
        fontStyle: 'bold'
      }).setOrigin(1, 0.5);

      this.scrollContainer.add([panelBg, panelTitle, iconText, labelText, valueText]);
    });

    const petalIconsContainer = this.add.container(GAME_WIDTH / 2, panelY + 385);
    
    state.unlockedPetals.forEach((type, index) => {
      const config = PETAL_CONFIGS[type];
      const spacing = 48;
      const startX = -(state.unlockedPetals.length - 1) * spacing / 2;
      
      const petalIcon = this.add.image(startX + index * spacing, 0, `petal_${type}`)
        .setDisplaySize(40, 40)
        .setBlendMode(Phaser.BlendModes.ADD);
      
      petalIconsContainer.add(petalIcon);
    });

    this.scrollContainer.add(petalIconsContainer);
  }

  private createEfficiencyPanel(panelIndex: number): void {
    const efficiency = this.reviewData.efficiencyStats;
    const panelX = panelIndex * GAME_WIDTH;
    const panelY = 0;
    const panelWidth = GAME_WIDTH - 60;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a0514, 0.9);
    panelBg.fillRoundedRect(30, panelY, panelWidth, 420, 20);
    panelBg.lineStyle(3, 0xffd700, 0.5);
    panelBg.strokeRoundedRect(30, panelY, panelWidth, 420, 20);

    const panelTitle = this.add.text(GAME_WIDTH / 2, panelY + 35, '效率分析', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const ratingConfig = EFFICIENCY_RATING[efficiency.efficiencyRating];
    const ratingText = this.add.text(GAME_WIDTH / 2, panelY + 85, efficiency.efficiencyRating, {
      fontFamily: 'Arial',
      fontSize: '64px',
      color: ratingConfig.color,
      fontStyle: 'bold'
    }).setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD);

    const ratingLabel = this.add.text(GAME_WIDTH / 2, panelY + 130, ratingConfig.label, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: ratingConfig.color
    }).setOrigin(0.5);

    const scoreText = this.add.text(GAME_WIDTH / 2, panelY + 160, `效率得分: ${efficiency.totalEfficiencyScore}分`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#aaaaaa'
    }).setOrigin(0.5);

    const efficiencyStats = [
      { label: '收集效率', value: `${efficiency.petalPerMinute}/分钟`, color: '#a8e6cf', icon: '🌸' },
      { label: '合成效率', value: `${efficiency.synthesisPerMinute}/分钟`, color: '#ff6b9d', icon: '⚗️' },
      { label: '合成成功率', value: `${efficiency.successRate}%`, color: '#ffe66d', icon: '✅' },
      { label: '变异触发率', value: `${efficiency.mutationRate}%`, color: '#c8a2ff', icon: '✨' },
      { label: '平均合成耗时', value: `${efficiency.avgSynthesisTime}秒`, color: '#88ccff', icon: '⏱️' }
    ];

    efficiencyStats.forEach((stat, index) => {
      const rowY = panelY + 200 + index * 42;
      
      const iconText = this.add.text(50, rowY, stat.icon, {
        fontFamily: 'Arial',
        fontSize: '18px'
      }).setOrigin(0, 0.5);

      const labelText = this.add.text(85, rowY, stat.label, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#888888'
      }).setOrigin(0, 0.5);

      const valueText = this.add.text(GAME_WIDTH - 50, rowY, stat.value, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: stat.color,
        fontStyle: 'bold'
      }).setOrigin(1, 0.5);

      this.scrollContainer.add([panelBg, panelTitle, ratingText, ratingLabel, scoreText, iconText, labelText, valueText]);
    });
  }

  private createMilestonesPanel(panelIndex: number): void {
    const milestones = this.reviewData.milestones;
    const panelX = panelIndex * GAME_WIDTH;
    const panelY = 0;
    const panelWidth = GAME_WIDTH - 60;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a0514, 0.9);
    panelBg.fillRoundedRect(30, panelY, panelWidth, 420, 20);
    panelBg.lineStyle(3, 0xc8a2ff, 0.5);
    panelBg.strokeRoundedRect(30, panelY, panelWidth, 420, 20);

    const panelTitle = this.add.text(GAME_WIDTH / 2, panelY + 35, '关键节点', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.scrollContainer.add([panelBg, panelTitle]);

    const timelineContainer = this.add.container(0, 0);
    const timelineMask = this.add.graphics();
    timelineMask.fillRect(30, panelY + 60, panelWidth, 350);
    timelineContainer.setMask(timelineMask.createGeometryMask());

    const timelineContent = this.add.container(0, 0);
    timelineContainer.add(timelineContent);

    const formatPlayTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      if (mins > 0) {
        return `${mins}分${secs}秒`;
      }
      return `${secs}秒`;
    };

    const milestoneY = 0;
    const milestoneSpacing = 75;

    milestones.forEach((milestone, index) => {
      const itemY = panelY + 100 + index * milestoneSpacing;
      
      const iconBg = this.add.circle(70, itemY, 22, milestone.color, 0.3);
      iconBg.setStrokeStyle(2, milestone.color, 0.8);

      const iconText = this.add.text(70, itemY, milestone.icon, {
        fontFamily: 'Arial',
        fontSize: '20px'
      }).setOrigin(0.5);

      const titleText = this.add.text(110, itemY - 12, milestone.title, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      const descText = this.add.text(110, itemY + 12, milestone.description, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#888888'
      }).setOrigin(0, 0.5);

      const timeText = this.add.text(GAME_WIDTH - 50, itemY, formatPlayTime(milestone.playTimeAt), {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#aaaaaa'
      }).setOrigin(1, 0.5);

      if (index < milestones.length - 1) {
        const connectorLine = this.add.line(0, 0, 70, itemY + 25, 70, itemY + milestoneSpacing - 25, 0x666666, 0.3);
        connectorLine.setLineWidth(2);
        timelineContent.add(connectorLine);
      }

      timelineContent.add([iconBg, iconText, titleText, descText, timeText]);
    });

    const totalHeight = milestones.length * milestoneSpacing + 40;
    if (totalHeight > 350) {
      let isDragging = false;
      let startY = 0;
      let contentY = 0;
      const maxScroll = Math.max(0, totalHeight - 350);

      const scrollBg = this.add.zone(GAME_WIDTH / 2, panelY + 235, panelWidth, 350);
      scrollBg.setInteractive();

      scrollBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        isDragging = true;
        startY = pointer.y - contentY;
      });

      scrollBg.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (isDragging) {
          contentY = pointer.y - startY;
          contentY = Math.max(-maxScroll, Math.min(0, contentY));
          timelineContent.y = contentY;
        }
      });

      scrollBg.on('pointerup', () => {
        isDragging = false;
      });

      scrollBg.on('pointerout', () => {
        isDragging = false;
      });

      this.scrollContainer.add(scrollBg);
    }

    this.scrollContainer.add([timelineContainer, timelineMask]);
  }

  private createRareDropsPanel(panelIndex: number): void {
    const rareDrops = this.reviewData.rareDrops;
    const panelX = panelIndex * GAME_WIDTH;
    const panelY = 0;
    const panelWidth = GAME_WIDTH - 60;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a0514, 0.9);
    panelBg.fillRoundedRect(30, panelY, panelWidth, 420, 20);
    panelBg.lineStyle(3, 0xffd700, 0.5);
    panelBg.strokeRoundedRect(30, panelY, panelWidth, 420, 20);

    const panelTitle = this.add.text(GAME_WIDTH / 2, panelY + 35, '稀有产出', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.scrollContainer.add([panelBg, panelTitle]);

    if (rareDrops.length === 0) {
      const noRareText = this.add.text(GAME_WIDTH / 2, panelY + 230, '暂无稀有产出', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#666666'
      }).setOrigin(0.5);
      this.scrollContainer.add(noRareText);
      return;
    }

    const container = this.add.container(0, 0);
    const mask = this.add.graphics();
    mask.fillRect(30, panelY + 60, panelWidth, 350);
    container.setMask(mask.createGeometryMask());

    const content = this.add.container(0, 0);
    container.add(content);

    const cols = 2;
    const cardWidth = (panelWidth - 60) / cols;
    const cardHeight = 150;
    const cardSpacingX = 20;
    const startX = 50;

    rareDrops.forEach((drop, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const cardX = startX + col * (cardWidth + cardSpacingX);
      const cardY = panelY + 80 + row * (cardHeight + 20);

      const rarityConfig = RARITY_CONFIG[drop.rarity];

      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x1a0a2e, 0.9);
      cardBg.fillRoundedRect(cardX, cardY, cardWidth, cardHeight, 12);
      cardBg.lineStyle(2, rarityConfig.glowColor, 0.6);
      cardBg.strokeRoundedRect(cardX, cardY, cardWidth, cardHeight, 12);

      const petalImage = this.add.image(cardX + cardWidth / 2, cardY + 45, `petal_${drop.type}`)
        .setDisplaySize(50, 50)
        .setBlendMode(Phaser.BlendModes.ADD);

      const rarityLabel = this.add.text(cardX + cardWidth / 2, cardY + 85, rarityConfig.label, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: rarityConfig.color,
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const nameText = this.add.text(cardX + cardWidth / 2, cardY + 105, drop.name, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const countText = this.add.text(cardX + cardWidth / 2, cardY + 125, `×${drop.count}`, {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#aaaaaa'
      }).setOrigin(0.5);

      const glow = this.add.graphics();
      glow.lineStyle(1, rarityConfig.glowColor, 0.3);
      glow.strokeRoundedRect(cardX - 2, cardY - 2, cardWidth + 4, cardHeight + 4, 14);

      content.add([cardBg, petalImage, rarityLabel, nameText, countText, glow]);
    });

    const totalHeight = Math.ceil(rareDrops.length / cols) * (cardHeight + 20);
    if (totalHeight > 350) {
      let isDragging = false;
      let startY = 0;
      let contentY = 0;
      const maxScroll = Math.max(0, totalHeight - 350);

      const scrollBg = this.add.zone(GAME_WIDTH / 2, panelY + 235, panelWidth, 350);
      scrollBg.setInteractive();

      scrollBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        isDragging = true;
        startY = pointer.y - contentY;
      });

      scrollBg.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (isDragging) {
          contentY = pointer.y - startY;
          contentY = Math.max(-maxScroll, Math.min(0, contentY));
          content.y = contentY;
        }
      });

      scrollBg.on('pointerup', () => {
        isDragging = false;
      });

      scrollBg.on('pointerout', () => {
        isDragging = false;
      });

      this.scrollContainer.add(scrollBg);
    }

    this.scrollContainer.add([container, mask]);
  }

  private createVisitorSpritePanel(panelIndex: number): void {
    const panelX = panelIndex * GAME_WIDTH;
    const panelY = 0;
    const panelWidth = GAME_WIDTH - 60;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a0514, 0.9);
    panelBg.fillRoundedRect(30, panelY, panelWidth, 420, 20);
    panelBg.lineStyle(3, 0xffaa00, 0.5);
    panelBg.strokeRoundedRect(30, panelY, panelWidth, 420, 20);

    const container = this.add.container(panelX, panelY);
    container.add(panelBg);

    const title = this.add.text(GAME_WIDTH / 2, 40, '🧚 访客精灵', {
      fontFamily: 'Arial',
      fontSize: '26px',
      color: '#ffaa00',
      align: 'center'
    }).setOrigin(0.5);
    container.add(title);

    const gameState = SaveManager.getInstance().getGameState();
    const visitorState = gameState.visitorSystem;

    let totalVisits = 0;
    let totalOrdersFulfilled = 0;
    let totalRewardsClaimed = 0;
    let unlockedCount = 0;
    let soulmateCount = 0;
    let highestAffection = 0;
    let highestAffectionId: VisitorSpriteId | null = null;

    visitorState.sprites.forEach(s => {
      totalVisits += s.totalVisits;
      totalOrdersFulfilled += s.totalOrdersFulfilled;
      totalRewardsClaimed += s.rewards.filter(r => r.claimed).length;
      if (s.unlocked) unlockedCount++;
      if (s.level === AffectionLevel.SOULMATE) soulmateCount++;
      if (s.affection > highestAffection) {
        highestAffection = s.affection;
        highestAffectionId = s.spriteId;
      }
    });

    const summaryY = 85;
    const summaryItems = [
      { label: '解锁精灵', value: `${unlockedCount}/${visitorState.sprites.length}` },
      { label: '总来访次数', value: `${totalVisits}` },
      { label: '完成订单', value: `${totalOrdersFulfilled}` },
      { label: '领取奖励', value: `${totalRewardsClaimed}` },
      { label: '灵魂伴侣', value: `${soulmateCount}` },
    ];

    summaryItems.forEach((item, idx) => {
      const row = idx % 3;
      const col = Math.floor(idx / 3);
      const x = 70 + col * 280;
      const y = summaryY + row * 35;

      const label = this.add.text(x, y, item.label, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#888888'
      }).setOrigin(0, 0.5);
      container.add(label);

      const val = this.add.text(x + 120, y, item.value, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      container.add(val);
    });

    const dividerY = summaryY + 120;
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x333333, 0.5);
    divider.beginPath();
    divider.moveTo(50, dividerY);
    divider.lineTo(GAME_WIDTH - 50, dividerY);
    divider.strokePath();
    container.add(divider);

    const listTitle = this.add.text(GAME_WIDTH / 2, dividerY + 25, '精灵详情', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    container.add(listTitle);

    const unlockedSprites = visitorState.sprites.filter(s => s.unlocked);
    let spriteY = dividerY + 55;

    unlockedSprites.forEach((spriteState, idx) => {
      const config = VISITOR_SPRITE_CONFIGS[spriteState.spriteId];
      const cardY = spriteY + idx * 42;

      if (cardY + 40 > 420) return;

      const cardBg = this.add.graphics();
      cardBg.fillStyle(config.color, 0.1);
      cardBg.fillRoundedRect(50, cardY, GAME_WIDTH - 100, 36, 8);
      cardBg.lineStyle(1, config.color, 0.3);
      cardBg.strokeRoundedRect(50, cardY, GAME_WIDTH - 100, 36, 8);
      container.add(cardBg);

      const icon = this.add.text(70, cardY + 18, config.appearance, {
        fontFamily: 'Arial',
        fontSize: '18px'
      }).setOrigin(0, 0.5);
      container.add(icon);

      const name = this.add.text(100, cardY + 10, config.name, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      container.add(name);

      const levelTitle = config.levelTitles[spriteState.level];
      const levelText = this.add.text(100, cardY + 28, levelTitle, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: `#${config.color.toString(16).padStart(6, '0')}`
      }).setOrigin(0, 0.5);
      container.add(levelText);

      const affectionText = this.add.text(GAME_WIDTH - 140, cardY + 10, `好感: ${spriteState.affection}`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#cccccc'
      }).setOrigin(0, 0.5);
      container.add(affectionText);

      const visitText = this.add.text(GAME_WIDTH - 140, cardY + 28, `${spriteState.totalVisits}次 / ${spriteState.totalOrdersFulfilled}单`, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#888888'
      }).setOrigin(0, 0.5);
      container.add(visitText);

      const rewardCount = spriteState.rewards.filter(r => r.claimed).length;
      const totalRewards = spriteState.rewards.length;
      const rewardText = this.add.text(GAME_WIDTH - 50, cardY + 18, `${rewardCount}/${totalRewards}`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: rewardCount === totalRewards ? '#a8e6cf' : '#ffaa00',
        align: 'right'
      }).setOrigin(1, 0.5);
      container.add(rewardText);
    });

    if (highestAffectionId) {
      const config = VISITOR_SPRITE_CONFIGS[highestAffectionId];
      const bestLabel = this.add.text(GAME_WIDTH / 2, 400, `最亲密: ${config.name} (好感 ${highestAffection})`, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ffaa00',
        align: 'center'
      }).setOrigin(0.5);
      container.add(bestLabel);
    }

    const mask = this.add.graphics();
    mask.fillStyle(0x000000, 0);
    mask.fillRect(panelX, panelY, GAME_WIDTH, 420);

    this.scrollContainer.add([container, mask]);
  }

  private getChapterReviewData(): ChapterReviewData[] {
    const state = SaveManager.getInstance().getGameState();
    if (!state.storyProgress) return [];
    
    return state.storyProgress.chapterStates.map(chapterState => {
      const config = getChapterConfig(chapterState.chapterId);
      const bestRating = state.storyProgress.bestChapterRatings[chapterState.chapterId] || null;
      
      return {
        chapterId: chapterState.chapterId,
        chapterTitle: config?.title || chapterState.chapterId,
        status: chapterState.status,
        rating: bestRating,
        playTime: chapterState.playTimeInChapter,
        goalsCompleted: chapterState.goals.filter(g => g.completed).length,
        totalGoals: chapterState.goals.length,
        completedAt: chapterState.completedAt
      };
    }).sort((a, b) => {
      const configA = getChapterConfig(a.chapterId);
      const configB = getChapterConfig(b.chapterId);
      return (configA?.order || 0) - (configB?.order || 0);
    });
  }

  private createChapterReviewPanel(panelIndex: number): void {
    const state = SaveManager.getInstance().getGameState();
    const panelX = panelIndex * GAME_WIDTH;
    const panelY = 0;
    const panelWidth = GAME_WIDTH - 60;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a0514, 0.9);
    panelBg.fillRoundedRect(30, panelY, panelWidth, 420, 20);
    panelBg.lineStyle(3, 0xff6b9d, 0.5);
    panelBg.strokeRoundedRect(30, panelY, panelWidth, 420, 20);

    const panelTitle = this.add.text(GAME_WIDTH / 2, panelY + 35, '章节回顾', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const totalScore = state.storyProgress?.totalStoryScore || 0;
    const scoreText = this.add.text(GAME_WIDTH / 2, panelY + 70, `总剧情分: ${totalScore}`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffd700'
    }).setOrigin(0.5);

    this.scrollContainer.add([panelBg, panelTitle, scoreText]);

    const container = this.add.container(0, 0);
    const mask = this.add.graphics();
    mask.fillRect(30, panelY + 95, panelWidth, 315);
    container.setMask(mask.createGeometryMask());

    const content = this.add.container(0, 0);
    container.add(content);

    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}分${secs}秒`;
    };

    const statusText: Record<ChapterStatus, string> = {
      [ChapterStatus.LOCKED]: '🔒 未解锁',
      [ChapterStatus.IN_PROGRESS]: '⏳ 进行中',
      [ChapterStatus.COMPLETED]: '✅ 已完成',
      [ChapterStatus.SETTLED]: '🏆 已结算'
    };

    const ratingColors: Record<string, string> = {
      'S': '#ffd700', 'A': '#ff6b9d', 'B': '#88ccff', 'C': '#a8e6cf'
    };

    this.chapterReviewData.forEach((data, index) => {
      const config = getChapterConfig(data.chapterId);
      const cardX = 50;
      const cardY = panelY + 105 + index * 95;
      const cardWidth = panelWidth - 40;
      const cardHeight = 85;

      const isCompleted = data.status === ChapterStatus.COMPLETED || data.status === ChapterStatus.SETTLED;
      const isInProgress = data.status === ChapterStatus.IN_PROGRESS;

      const cardBg = this.add.graphics();
      cardBg.fillStyle(isCompleted ? 0x1a2a1a : (isInProgress ? 0x1a1a2a : 0x1a0a1a), 0.9);
      cardBg.fillRoundedRect(cardX, cardY, cardWidth, cardHeight, 12);
      cardBg.lineStyle(2, isCompleted ? 0xa8e6cf : (isInProgress ? 0x88ccff : 0x333333), 0.6);
      cardBg.strokeRoundedRect(cardX, cardY, cardWidth, cardHeight, 12);

      const configIcon = config?.icon || '📖';
      const iconText = this.add.text(cardX + 20, cardY + cardHeight / 2, configIcon, {
        fontFamily: 'Arial',
        fontSize: '28px'
      }).setOrigin(0, 0.5);

      const chapterNum = config?.order || index + 1;
      const titleText = this.add.text(cardX + 65, cardY + 25, `${chapterNum}. ${data.chapterTitle}`, {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      const statusLabel = statusText[data.status] || data.status;
      const statusColor = isCompleted ? '#a8e6cf' : (isInProgress ? '#88ccff' : '#666666');
      const statusTextObj = this.add.text(cardX + 65, cardY + 50, statusLabel, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: statusColor
      }).setOrigin(0, 0.5);

      const goalsText = this.add.text(cardX + cardWidth - 140, cardY + 25, 
        `目标: ${data.goalsCompleted}/${data.totalGoals}`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#888888'
      }).setOrigin(1, 0.5);

      const timeText = this.add.text(cardX + cardWidth - 140, cardY + 50, 
        `用时: ${formatTime(data.playTime)}`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#888888'
      }).setOrigin(1, 0.5);

      if (data.rating && isCompleted) {
        const ratingColor = ratingColors[data.rating] || '#888888';
        const ratingGlow = this.add.graphics();
        ratingGlow.fillStyle(parseInt(ratingColor.slice(1), 16), 0.2);
        ratingGlow.fillCircle(cardX + cardWidth - 40, cardY + cardHeight / 2, 20);
        
        const ratingText = this.add.text(cardX + cardWidth - 40, cardY + cardHeight / 2, data.rating, {
          fontFamily: 'Arial',
          fontSize: '28px',
          color: ratingColor,
          fontStyle: 'bold'
        }).setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD);
        
        content.add([ratingGlow, ratingText]);
      }

      if (isInProgress && !isCompleted) {
        const progressBarBg = this.add.graphics();
        progressBarBg.fillStyle(0x333333, 0.5);
        progressBarBg.fillRoundedRect(cardX + 65, cardY + 68, cardWidth - 150, 8, 4);
        
        const progress = data.totalGoals > 0 ? data.goalsCompleted / data.totalGoals : 0;
        const progressBar = this.add.graphics();
        progressBar.fillStyle(0x88ccff, 0.8);
        progressBar.fillRoundedRect(cardX + 65, cardY + 68, (cardWidth - 150) * progress, 8, 4);
        
        content.add([progressBarBg, progressBar]);
      }

      content.add([cardBg, iconText, titleText, statusTextObj, goalsText, timeText]);
    });

    const totalHeight = this.chapterReviewData.length * 95 + 20;
    if (totalHeight > 315) {
      let isDragging = false;
      let startY = 0;
      let contentY = 0;
      const maxScroll = Math.max(0, totalHeight - 315);

      const scrollBg = this.add.zone(GAME_WIDTH / 2, panelY + 250, panelWidth, 315);
      scrollBg.setInteractive();

      scrollBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        isDragging = true;
        startY = pointer.y - contentY;
      });

      scrollBg.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (isDragging) {
          contentY = pointer.y - startY;
          contentY = Math.max(-maxScroll, Math.min(0, contentY));
          content.y = contentY;
        }
      });

      scrollBg.on('pointerup', () => { isDragging = false; });
      scrollBg.on('pointerout', () => { isDragging = false; });

      this.scrollContainer.add(scrollBg);
    }

    this.scrollContainer.add([container, mask]);
  }

  private createInheritancePanel(panelIndex: number): void {
    const panelX = panelIndex * GAME_WIDTH;
    const panelY = 0;
    const panelWidth = GAME_WIDTH - 60;

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a0514, 0.9);
    panelBg.fillRoundedRect(30, panelY, panelWidth, 420, 20);
    panelBg.lineStyle(3, 0xff6b9d, 0.5);
    panelBg.strokeRoundedRect(30, panelY, panelWidth, 420, 20);

    const panelTitle = this.add.text(GAME_WIDTH / 2, panelY + 35, '继承策略', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const pointsText = this.add.text(GAME_WIDTH / 2, panelY + 70, `可用点数: ${this.availablePoints} / ${SaveManager.getInstance().getMaxInheritancePoints()}`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffd700'
    }).setOrigin(0.5);

    this.scrollContainer.add([panelBg, panelTitle, pointsText]);

    const container = this.add.container(0, 0);
    const mask = this.add.graphics();
    mask.fillRect(30, panelY + 90, panelWidth, 320);
    container.setMask(mask.createGeometryMask());

    const content = this.add.container(0, 0);
    container.add(content);

    const cardWidth = panelWidth - 40;
    const cardHeight = 85;

    this.inheritanceOptions.forEach((option, index) => {
      const cardX = 50;
      const cardY = panelY + 100 + index * (cardHeight + 10);

      const isSelected = this.selectedInheritance.includes(option.id);
      const canAfford = this.availablePoints >= option.cost || isSelected;

      const cardBg = this.add.graphics();
      cardBg.fillStyle(isSelected ? 0x2a1a4e : 0x1a0a2e, 0.9);
      cardBg.fillRoundedRect(cardX, cardY, cardWidth, cardHeight, 12);
      cardBg.lineStyle(2, isSelected ? 0xff6b9d : 0x666666, isSelected ? 0.8 : 0.5);
      cardBg.strokeRoundedRect(cardX, cardY, cardWidth, cardHeight, 12);

      const iconText = this.add.text(cardX + 25, cardY + cardHeight / 2, option.icon, {
        fontFamily: 'Arial',
        fontSize: '28px'
      }).setOrigin(0, 0.5);

      const nameText = this.add.text(cardX + 70, cardY + 25, option.name, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);

      const descText = this.add.text(cardX + 70, cardY + 50, option.description, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#888888'
      }).setOrigin(0, 0.5);

      const costBg = this.add.graphics();
      const costColor = isSelected ? 0xff6b9d : (canAfford ? 0xffd700 : 0x666666);
      costBg.fillStyle(costColor, 0.2);
      costBg.fillRoundedRect(cardX + cardWidth - 80, cardY + 25, 70, 35, 8);
      costBg.lineStyle(1, costColor, 0.5);
      costBg.strokeRoundedRect(cardX + cardWidth - 80, cardY + 25, 70, 35, 8);

      const costText = this.add.text(cardX + cardWidth - 45, cardY + 42, `${option.cost}点`, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: isSelected ? '#ff6b9d' : (canAfford ? '#ffd700' : '#666666'),
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const hitZone = this.add.zone(cardX + cardWidth / 2, cardY + cardHeight / 2, cardWidth, cardHeight);
      hitZone.setInteractive({ useHandCursor: true });

      hitZone.on('pointerover', () => {
        if (canAfford || isSelected) {
          this.tweens.add({
            targets: [cardBg],
            scale: 1.02,
            duration: 200
          });
        }
      });

      hitZone.on('pointerout', () => {
        this.tweens.add({
          targets: [cardBg],
          scale: 1,
          duration: 200
        });
      });

      hitZone.on('pointerdown', () => {
        AudioManager.getInstance().playSfx('sfx_click');
        this.toggleInheritanceOption(option, index);
      });

      content.add([cardBg, iconText, nameText, descText, costBg, costText, hitZone]);
      this.inheritanceUIRefs.set(index, { cardBg, costText, costBg });
    });

    const totalHeight = this.inheritanceOptions.length * (cardHeight + 10) + 20;
    if (totalHeight > 320) {
      let isDragging = false;
      let startY = 0;
      let contentY = 0;
      const maxScroll = Math.max(0, totalHeight - 320);

      const scrollBg = this.add.zone(GAME_WIDTH / 2, panelY + 250, panelWidth, 320);
      scrollBg.setInteractive();

      scrollBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        isDragging = true;
        startY = pointer.y - contentY;
      });

      scrollBg.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (isDragging) {
          contentY = pointer.y - startY;
          contentY = Math.max(-maxScroll, Math.min(0, contentY));
          content.y = contentY;
        }
      });

      scrollBg.on('pointerup', () => {
        isDragging = false;
      });

      scrollBg.on('pointerout', () => {
        isDragging = false;
      });

      this.scrollContainer.add(scrollBg);
    }

    this.scrollContainer.add([container, mask]);
  }

  private toggleInheritanceOption(option: InheritanceOption, index: number): void {
    const isSelected = this.selectedInheritance.includes(option.id);

    if (isSelected) {
      this.selectedInheritance = this.selectedInheritance.filter(id => id !== option.id);
      this.availablePoints += option.cost;
      option.selected = false;
    } else {
      if (this.availablePoints >= option.cost) {
        this.selectedInheritance.push(option.id);
        this.availablePoints -= option.cost;
        option.selected = true;
      } else {
        return;
      }
    }

    this.updateInheritanceUI();
  }

  private updateInheritanceUI(): void {
    this.scrollContainer.each((child: Phaser.GameObjects.GameObject) => {
      if (child.type === 'Text') {
        const textChild = child as Phaser.GameObjects.Text;
        if (textChild.text && textChild.text.includes('可用点数')) {
          textChild.setText(`可用点数: ${this.availablePoints} / ${SaveManager.getInstance().getMaxInheritancePoints()}`);
        }
      }
    });

    this.inheritanceOptions.forEach((option, index) => {
      const uiRef = this.inheritanceUIRefs.get(index);
      if (!uiRef) return;

      const { cardBg, costText, costBg } = uiRef;
      const isSelected = option.selected;
      const canAfford = this.availablePoints >= option.cost || isSelected;

      cardBg.clear();
      cardBg.fillStyle(isSelected ? 0x2a1a4e : 0x1a0a2e, 0.9);
      cardBg.fillRoundedRect(50, 100 + index * 95, 610, 85, 12);
      cardBg.lineStyle(2, isSelected ? 0xff6b9d : 0x666666, isSelected ? 0.8 : 0.5);
      cardBg.strokeRoundedRect(50, 100 + index * 95, 610, 85, 12);

      costBg.clear();
      const costColor = isSelected ? 0xff6b9d : (canAfford ? 0xffd700 : 0x666666);
      costBg.fillStyle(costColor, 0.2);
      costBg.fillRoundedRect(580, 125, 70, 35, 8);
      costBg.lineStyle(1, costColor, 0.5);
      costBg.strokeRoundedRect(580, 125, 70, 35, 8);

      costText.setColor(isSelected ? '#ff6b9d' : (canAfford ? '#ffd700' : '#666666'));
    });
  }

  private createNavigationButtons(): void {
    const prevBtn = this.createNavButton(60, GAME_HEIGHT * 0.78, '◀', () => {
      if (this.currentPanelIndex > 0) {
        this.switchToPanel(this.currentPanelIndex - 1);
      }
    });

    const nextBtn = this.createNavButton(GAME_WIDTH - 60, GAME_HEIGHT * 0.78, '▶', () => {
      if (this.currentPanelIndex < this.totalPanels - 1) {
        this.switchToPanel(this.currentPanelIndex + 1);
      }
    });

    this.tweens.add({
      targets: [prevBtn, nextBtn],
      alpha: 1,
      duration: 800,
      delay: 500,
      ease: 'Cubic.Out'
    });
  }

  private createNavButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setAlpha(0);

    const bg = this.add.circle(0, 0, 25, 0x2a1a4e, 0.8);
    bg.setStrokeStyle(2, 0xa8e6cf, 0.6);

    const btnText = this.add.text(0, 0, text, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.add([bg, btnText]);

    const hitZone = this.add.zone(0, 0, 50, 50).setInteractive({ useHandCursor: true });
    hitZone.on('pointerdown', () => {
      AudioManager.getInstance().playSfx('sfx_click');
      callback();
    });

    return container;
  }

  private switchToPanel(index: number): void {
    if (index < 0 || index >= this.totalPanels) return;

    this.currentPanelIndex = index;

    this.tweens.add({
      targets: this.scrollContainer,
      x: -index * GAME_WIDTH,
      duration: 400,
      ease: 'Cubic.InOut',
      onUpdate: () => {
        this.updatePanelIndicators();
      }
    });
  }

  private createBottomButtons(y: number): void {
    const btnWidth = 220;
    const btnHeight = 60;
    const spacing = 20;

    const restartBtn = this.createButton(
      GAME_WIDTH / 2 - btnWidth / 2 - spacing / 2,
      y,
      btnWidth,
      btnHeight,
      '继承并再玩',
      0xff6b9d,
      () => {
        SaveManager.getInstance().applyInheritance(this.selectedInheritance);
        this.scene.start('Game', { continueGame: false, useInheritance: true });
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
        delay: 1000 + index * 200,
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
      fontSize: '18px',
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
