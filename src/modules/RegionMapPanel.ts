import Phaser from 'phaser';
import {
  RegionConfig,
  RegionUnlockState,
  RegionUnlockCondition,
  RegionUnlockConditionType,
  PetalType
} from '../types';
import {
  REGION_CONFIGS,
  GAME_WIDTH,
  GAME_HEIGHT,
  formatPlayTime
} from '../config/GameConfig';
import { EventManager } from '../managers/EventManager';
import { SaveManager } from '../managers/SaveManager';

type RegionCardData = {
  config: RegionConfig;
  container: Phaser.GameObjects.Container;
  thumbnail: Phaser.GameObjects.Graphics;
  nameText: Phaser.GameObjects.Text;
  difficultyText: Phaser.GameObjects.Text;
  statusText: Phaser.GameObjects.Text;
  iconText: Phaser.GameObjects.Text;
  conditionPanel: Phaser.GameObjects.Container | null;
};

export class RegionMapPanel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private panelBg: Phaser.GameObjects.Graphics | null = null;
  private titleText: Phaser.GameObjects.Text | null = null;
  private closeButton: Phaser.GameObjects.Container | null = null;
  private regionCards: Map<string, RegionCardData> = new Map();
  private isOpen: boolean = false;
  private isAnimating: boolean = false;
  private selectedLockedRegion: string | null = null;

  private readonly PANEL_WIDTH = GAME_WIDTH - 60;
  private readonly PANEL_HEIGHT = GAME_HEIGHT - 200;
  private readonly PANEL_X = 30;
  private readonly PANEL_Y = 100;
  private readonly CARD_COLS = 2;
  private readonly CARD_ROWS = 3;
  private readonly CARD_WIDTH = (this.PANEL_WIDTH - 80) / this.CARD_COLS;
  private readonly CARD_HEIGHT = (this.PANEL_HEIGHT - 180) / this.CARD_ROWS;
  private readonly CARD_START_X = 40;
  private readonly CARD_START_Y = 100;
  private readonly CARD_GAP_X = 20;
  private readonly CARD_GAP_Y = 20;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public create(): void {
    this.createPanel();
    this.createTitle();
    this.createCloseButton();
    this.createRegionCards();
    this.hidePanelInstant();
  }

  private createPanel(): void {
    this.container = this.scene.add.container(0, 0).setDepth(200).setScrollFactor(0);

    this.panelBg = this.scene.add.graphics();
    this.panelBg.fillStyle(0x1a1033, 0.92);
    this.panelBg.fillRoundedRect(
      this.PANEL_X,
      this.PANEL_Y,
      this.PANEL_WIDTH,
      this.PANEL_HEIGHT,
      28
    );
    this.panelBg.lineStyle(2, 0xa8e6cf, 0.4);
    this.panelBg.strokeRoundedRect(
      this.PANEL_X,
      this.PANEL_Y,
      this.PANEL_WIDTH,
      this.PANEL_HEIGHT,
      28
    );

    const innerGlow = this.scene.add.graphics();
    innerGlow.lineStyle(1, 0xff9ecb, 0.15);
    innerGlow.strokeRoundedRect(
      this.PANEL_X + 6,
      this.PANEL_Y + 6,
      this.PANEL_WIDTH - 12,
      this.PANEL_HEIGHT - 12,
      22
    );

    this.container.add([this.panelBg, innerGlow]);
  }

  private createTitle(): void {
    if (!this.container) return;

    const titleBg = this.scene.add.graphics();
    titleBg.fillStyle(0xc8a2ff, 0.15);
    titleBg.fillRoundedRect(this.PANEL_X + 40, this.PANEL_Y + 25, this.PANEL_WIDTH - 160, 50, 16);

    this.titleText = this.scene.add.text(
      this.PANEL_X + this.PANEL_WIDTH / 2 - 60,
      this.PANEL_Y + 50,
      '🗺️  梦境地图',
      {
        fontFamily: 'Arial, Microsoft YaHei, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    this.container.add([titleBg, this.titleText]);
  }

  private createCloseButton(): void {
    if (!this.container) return;

    const btnX = this.PANEL_X + this.PANEL_WIDTH - 55;
    const btnY = this.PANEL_Y + 50;

    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(0xff6b9d, 0.7);
    btnBg.fillCircle(0, 0, 22);
    btnBg.lineStyle(2, 0xffffff, 0.4);
    btnBg.strokeCircle(0, 0, 22);

    const btnText = this.scene.add.text(0, 0, '✕', {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.closeButton = this.scene.add.container(btnX, btnY, [btnBg, btnText]);
    this.closeButton.setSize(44, 44);
    this.closeButton.setInteractive(
      new Phaser.Geom.Circle(0, 0, 22),
      Phaser.Geom.Circle.Contains
    );

    this.closeButton.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0xff88b5, 0.9);
      btnBg.fillCircle(0, 0, 22);
      btnBg.lineStyle(2, 0xffffff, 0.6);
      btnBg.strokeCircle(0, 0, 22);
    });

    this.closeButton.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0xff6b9d, 0.7);
      btnBg.fillCircle(0, 0, 22);
      btnBg.lineStyle(2, 0xffffff, 0.4);
      btnBg.strokeCircle(0, 0, 22);
    });

    this.closeButton.on('pointerdown', () => {
      this.closePanel();
    });

    this.container.add(this.closeButton);
  }

  private createRegionCards(): void {
    if (!this.container) return;

    REGION_CONFIGS.forEach((config, index) => {
      const col = index % this.CARD_COLS;
      const row = Math.floor(index / this.CARD_COLS);

      const cardX = this.PANEL_X + this.CARD_START_X + col * (this.CARD_WIDTH + this.CARD_GAP_X);
      const cardY = this.PANEL_Y + this.CARD_START_Y + row * (this.CARD_HEIGHT + this.CARD_GAP_Y);

      const cardContainer = this.createRegionCard(config, cardX, cardY);
      this.container.add(cardContainer);
    });
  }

  private createRegionCard(config: RegionConfig, x: number, y: number): Phaser.GameObjects.Container {
    const state = SaveManager.getInstance().getGameState();
    const unlockState = state.regionUnlockStates.find(s => s.regionId === config.id);
    const isUnlocked = unlockState?.isUnlocked ?? false;
    const isCurrentRegion = state.currentRegionId === config.id;

    const cardBg = this.scene.add.graphics();
    const baseColor = isUnlocked ? config.color : 0x444444;
    const alpha = isUnlocked ? 0.3 : 0.15;

    cardBg.fillStyle(baseColor, alpha);
    cardBg.fillRoundedRect(0, 0, this.CARD_WIDTH, this.CARD_HEIGHT, 16);
    cardBg.lineStyle(2, isCurrentRegion ? 0xffee66 : (isUnlocked ? 0xa8e6cf : 0x666666), isCurrentRegion ? 0.9 : 0.5);
    cardBg.strokeRoundedRect(0, 0, this.CARD_WIDTH, this.CARD_HEIGHT, 16);

    if (isCurrentRegion) {
      const pulseRing = this.scene.add.graphics();
      pulseRing.lineStyle(2, 0xffee66, 0.3);
      pulseRing.strokeRoundedRect(-3, -3, this.CARD_WIDTH + 6, this.CARD_HEIGHT + 6, 18);
    }

    const thumbnail = this.scene.add.graphics();
    const thumbX = 12;
    const thumbY = 12;
    const thumbW = this.CARD_WIDTH - 24;
    const thumbH = this.CARD_HEIGHT * 0.45;

    thumbnail.fillStyle(config.color, isUnlocked ? 0.6 : 0.2);
    thumbnail.fillRoundedRect(thumbX, thumbY, thumbW, thumbH, 10);
    thumbnail.lineStyle(1, 0xffffff, isUnlocked ? 0.25 : 0.1);
    thumbnail.strokeRoundedRect(thumbX, thumbY, thumbW, thumbH, 10);

    const iconText = this.scene.add.text(
      thumbX + thumbW / 2,
      thumbY + thumbH / 2,
      isUnlocked ? config.navigationIcon : '🔒',
      {
        fontFamily: 'Arial, Microsoft YaHei, sans-serif',
        fontSize: isUnlocked ? '32px' : '28px'
      }
    ).setOrigin(0.5);

    const nameText = this.scene.add.text(
      this.CARD_WIDTH / 2,
      thumbY + thumbH + 22,
      config.name,
      {
        fontFamily: 'Arial, Microsoft YaHei, sans-serif',
        fontSize: '15px',
        color: isUnlocked ? '#ffffff' : '#888888',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    const difficultyLabel = this.getDifficultyLabel(config.difficulty);
    const difficultyColor = this.getDifficultyColor(config.difficulty);
    const difficultyText = this.scene.add.text(
      this.CARD_WIDTH / 2,
      thumbY + thumbH + 42,
      `难度：${difficultyLabel}`,
      {
        fontFamily: 'Arial, Microsoft YaHei, sans-serif',
        fontSize: '12px',
        color: isUnlocked ? difficultyColor : '#666666'
      }
    ).setOrigin(0.5);

    let statusLabel = '';
    let statusColor = '';
    if (isCurrentRegion) {
      statusLabel = '📍 当前所在';
      statusColor = '#ffee66';
    } else if (isUnlocked) {
      statusLabel = '✅ 已解锁';
      statusColor = '#a8e6cf';
    } else {
      statusLabel = '🔒 未解锁';
      statusColor = '#888888';
    }

    const statusText = this.scene.add.text(
      this.CARD_WIDTH / 2,
      thumbY + thumbH + 60,
      statusLabel,
      {
        fontFamily: 'Arial, Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: statusColor
      }
    ).setOrigin(0.5);

    const cardContainer = this.scene.add.container(x, y, [
      cardBg,
      thumbnail,
      iconText,
      nameText,
      difficultyText,
      statusText
    ]);

    cardContainer.setSize(this.CARD_WIDTH, this.CARD_HEIGHT);
    cardContainer.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, this.CARD_WIDTH, this.CARD_HEIGHT),
      Phaser.Geom.Rectangle.Contains
    );

    cardContainer.on('pointerover', () => {
      cardBg.clear();
      cardBg.fillStyle(baseColor, alpha + 0.15);
      cardBg.fillRoundedRect(0, 0, this.CARD_WIDTH, this.CARD_HEIGHT, 16);
      cardBg.lineStyle(2, isCurrentRegion ? 0xffee66 : 0xff9ecb, 0.8);
      cardBg.strokeRoundedRect(0, 0, this.CARD_WIDTH, this.CARD_HEIGHT, 16);
    });

    cardContainer.on('pointerout', () => {
      cardBg.clear();
      cardBg.fillStyle(baseColor, alpha);
      cardBg.fillRoundedRect(0, 0, this.CARD_WIDTH, this.CARD_HEIGHT, 16);
      cardBg.lineStyle(2, isCurrentRegion ? 0xffee66 : (isUnlocked ? 0xa8e6cf : 0x666666), isCurrentRegion ? 0.9 : 0.5);
      cardBg.strokeRoundedRect(0, 0, this.CARD_WIDTH, this.CARD_HEIGHT, 16);
    });

    cardContainer.on('pointerdown', () => {
      this.handleRegionClick(config.id);
    });

    const cardData: RegionCardData = {
      config,
      container: cardContainer,
      thumbnail,
      nameText,
      difficultyText,
      statusText,
      iconText,
      conditionPanel: null
    };

    this.regionCards.set(config.id, cardData);

    return cardContainer;
  }

  private handleRegionClick(regionId: string): void {
    const state = SaveManager.getInstance().getGameState();
    const unlockState = state.regionUnlockStates.find(s => s.regionId === regionId);
    const isUnlocked = unlockState?.isUnlocked ?? false;

    if (isUnlocked) {
      EventManager.getInstance().emit('region:navigate_request', { regionId });
      this.closePanel();
    } else {
      this.showUnlockConditions(regionId);
    }
  }

  private showUnlockConditions(regionId: string): void {
    this.hideAllConditionPanels();
    this.selectedLockedRegion = regionId;

    const cardData = this.regionCards.get(regionId);
    if (!cardData || !this.container) return;

    const config = cardData.config;
    const state = SaveManager.getInstance().getGameState();

    const panelX = cardData.container.x;
    const panelY = cardData.container.y + this.CARD_HEIGHT + 8;
    const panelW = this.CARD_WIDTH;
    const panelH = Math.min(config.unlockConditions.length * 36 + 50, this.CARD_HEIGHT * 1.2);

    const conditionPanel = this.scene.add.container(panelX, panelY);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x2a1a4a, 0.95);
    bg.fillRoundedRect(0, 0, panelW, panelH, 12);
    bg.lineStyle(2, 0xc8a2ff, 0.5);
    bg.strokeRoundedRect(0, 0, panelW, panelH, 12);

    const title = this.scene.add.text(panelW / 2, 18, '🔓 解锁条件', {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#c8a2ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const items: Phaser.GameObjects.Text[] = [title];

    config.unlockConditions.forEach((condition, idx) => {
      const isMet = this.checkCondition(state, condition);
      const progress = this.getConditionProgress(state, condition);
      const yOffset = 40 + idx * 36;

      const checkbox = this.scene.add.text(14, yOffset, isMet ? '✅' : '⬜', {
        fontFamily: 'Arial, Microsoft YaHei, sans-serif',
        fontSize: '14px'
      });

      let progressStr = '';
      if (progress.target > 1) {
        if (condition.type === RegionUnlockConditionType.PLAY_TIME) {
          progressStr = ` (${formatPlayTime(Math.min(progress.current, progress.target))}/${formatPlayTime(progress.target)})`;
        } else {
          progressStr = ` (${Math.min(progress.current, progress.target)}/${progress.target})`;
        }
      }

      const condText = this.scene.add.text(36, yOffset, condition.description + progressStr, {
        fontFamily: 'Arial, Microsoft YaHei, sans-serif',
        fontSize: '11px',
        color: isMet ? '#a8e6cf' : '#aaaaaa',
        wordWrap: { width: panelW - 50 }
      });

      items.push(checkbox, condText);
    });

    conditionPanel.add([bg, ...items]);
    conditionPanel.setDepth(201);

    cardData.conditionPanel = conditionPanel;
    this.container.add(conditionPanel);
  }

  private hideAllConditionPanels(): void {
    this.regionCards.forEach(cardData => {
      if (cardData.conditionPanel) {
        cardData.conditionPanel.destroy();
        cardData.conditionPanel = null;
      }
    });
    this.selectedLockedRegion = null;
  }

  private checkCondition(state: any, condition: RegionUnlockCondition): boolean {
    switch (condition.type) {
      case RegionUnlockConditionType.PETAL_COLLECTED:
        return (state.petals[condition.target as PetalType] || 0) >= (condition.targetCount || 0);
      case RegionUnlockConditionType.PETAL_UNLOCKED:
        return state.unlockedPetals.includes(condition.target as PetalType);
      case RegionUnlockConditionType.TOTAL_COLLECTED:
        return state.totalCollected >= (condition.targetCount || 0);
      case RegionUnlockConditionType.TOTAL_SYNTHESIZED:
        return state.totalSynthesized >= (condition.targetCount || 0);
      case RegionUnlockConditionType.PLAY_TIME:
        return state.playTime >= (condition.targetCount || 0);
      case RegionUnlockConditionType.REGION_UNLOCKED:
        const targetRegion = state.regionUnlockStates.find((s: RegionUnlockState) => s.regionId === condition.target);
        return targetRegion?.isUnlocked ?? false;
      case RegionUnlockConditionType.RECIPE_SYNTHESIZED:
        return state.synthesisRecords.some((r: any) => r.recipeId === condition.target);
      case RegionUnlockConditionType.GOAL_COMPLETED:
        const goal = state.goals.find((g: any) => g.id === condition.target);
        return goal?.status === 'completed' || goal?.status === 'claimed';
      default:
        return false;
    }
  }

  private getConditionProgress(state: any, condition: RegionUnlockCondition): { current: number; target: number } {
    const target = condition.targetCount || 0;
    let current = 0;

    switch (condition.type) {
      case RegionUnlockConditionType.PETAL_COLLECTED:
        current = state.petals[condition.target as PetalType] || 0;
        break;
      case RegionUnlockConditionType.TOTAL_COLLECTED:
        current = state.totalCollected;
        break;
      case RegionUnlockConditionType.TOTAL_SYNTHESIZED:
        current = state.totalSynthesized;
        break;
      case RegionUnlockConditionType.PLAY_TIME:
        current = state.playTime;
        break;
      case RegionUnlockConditionType.PETAL_UNLOCKED:
      case RegionUnlockConditionType.REGION_UNLOCKED:
      case RegionUnlockConditionType.RECIPE_SYNTHESIZED:
      case RegionUnlockConditionType.GOAL_COMPLETED:
        current = this.checkCondition(state, condition) ? 1 : 0;
        return { current, target: 1 };
    }

    return { current, target };
  }

  private getDifficultyLabel(difficulty: string): string {
    switch (difficulty) {
      case 'easy': return '简单';
      case 'medium': return '中等';
      case 'hard': return '困难';
      case 'legendary': return '传说';
      default: return '未知';
    }
  }

  private getDifficultyColor(difficulty: string): string {
    switch (difficulty) {
      case 'easy': return '#a8e6cf';
      case 'medium': return '#ffe66d';
      case 'hard': return '#ff9ecb';
      case 'legendary': return '#ffd700';
      default: return '#ffffff';
    }
  }

  public openPanel(): void {
    if (this.isOpen || this.isAnimating || !this.container) return;

    this.isAnimating = true;
    EventManager.getInstance().emit('region:map_opened', {});

    this.refreshPanel();
    this.container.setVisible(true);
    this.container.setAlpha(0);
    this.container.setScale(0.9);

    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scale: 1,
      duration: 350,
      ease: Phaser.Math.Easing.Back.Out,
      onComplete: () => {
        this.isOpen = true;
        this.isAnimating = false;
      }
    });
  }

  public closePanel(): void {
    if (!this.isOpen || this.isAnimating || !this.container) return;

    this.isAnimating = true;
    this.hideAllConditionPanels();

    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scale: 0.9,
      duration: 250,
      ease: Phaser.Math.Easing.Back.In,
      onComplete: () => {
        this.container?.setVisible(false);
        this.isOpen = false;
        this.isAnimating = false;
      }
    });
  }

  private hidePanelInstant(): void {
    if (!this.container) return;
    this.container.setVisible(false);
    this.container.setAlpha(0);
    this.isOpen = false;
  }

  public refreshPanel(): void {
    const state = SaveManager.getInstance().getGameState();

    this.regionCards.forEach((cardData, regionId) => {
      const unlockState = state.regionUnlockStates.find(s => s.regionId === regionId);
      const isUnlocked = unlockState?.isUnlocked ?? false;
      const isCurrentRegion = state.currentRegionId === regionId;
      const config = cardData.config;

      const cardBg = cardData.container.list[0] as Phaser.GameObjects.Graphics;
      const baseColor = isUnlocked ? config.color : 0x444444;
      const alpha = isUnlocked ? 0.3 : 0.15;

      cardBg.clear();
      cardBg.fillStyle(baseColor, alpha);
      cardBg.fillRoundedRect(0, 0, this.CARD_WIDTH, this.CARD_HEIGHT, 16);
      cardBg.lineStyle(2, isCurrentRegion ? 0xffee66 : (isUnlocked ? 0xa8e6cf : 0x666666), isCurrentRegion ? 0.9 : 0.5);
      cardBg.strokeRoundedRect(0, 0, this.CARD_WIDTH, this.CARD_HEIGHT, 16);

      const thumbColor = isUnlocked ? 0.6 : 0.2;
      cardData.thumbnail.clear();
      cardData.thumbnail.fillStyle(config.color, thumbColor);
      cardData.thumbnail.fillRoundedRect(12, 12, this.CARD_WIDTH - 24, this.CARD_HEIGHT * 0.45, 10);
      cardData.thumbnail.lineStyle(1, 0xffffff, isUnlocked ? 0.25 : 0.1);
      cardData.thumbnail.strokeRoundedRect(12, 12, this.CARD_WIDTH - 24, this.CARD_HEIGHT * 0.45, 10);

      cardData.iconText.setText(isUnlocked ? config.navigationIcon : '🔒');
      cardData.nameText.setColor(isUnlocked ? '#ffffff' : '#888888');

      const difficultyColor = isUnlocked ? this.getDifficultyColor(config.difficulty) : '#666666';
      cardData.difficultyText.setColor(difficultyColor);

      let statusLabel = '';
      let statusColor = '';
      if (isCurrentRegion) {
        statusLabel = '📍 当前所在';
        statusColor = '#ffee66';
      } else if (isUnlocked) {
        statusLabel = '✅ 已解锁';
        statusColor = '#a8e6cf';
      } else {
        statusLabel = '🔒 未解锁';
        statusColor = '#888888';
      }
      cardData.statusText.setText(statusLabel);
      cardData.statusText.setColor(statusColor);
    });

    if (this.selectedLockedRegion) {
      this.showUnlockConditions(this.selectedLockedRegion);
    }
  }

  public destroy(): void {
    this.hideAllConditionPanels();
    this.regionCards.clear();

    if (this.container) {
      this.container.destroy();
      this.container = null;
    }

    this.panelBg = null;
    this.titleText = null;
    this.closeButton = null;
    this.isOpen = false;
    this.isAnimating = false;
    this.selectedLockedRegion = null;
  }
}
