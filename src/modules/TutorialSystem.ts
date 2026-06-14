import Phaser from 'phaser';
import { TutorialStep, GameEvents } from '../types';
import { SettingsManager } from '../managers/SettingsManager';
import { EventManager } from '../managers/EventManager';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';

type EventListenerEntry = {
  event: keyof GameEvents;
  callback: (data: any) => void;
};

export class TutorialSystem {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private currentStep: TutorialStep | null = null;
  private isActive: boolean = false;
  private highlightGraphics: Phaser.GameObjects.Graphics | null = null;
  private uiListeners: EventListenerEntry[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public create(): void {
    const tutorialState = SettingsManager.getInstance().getTutorialState();
    
    if (!tutorialState.completed && !tutorialState.dismissed) {
      this.isActive = true;
      this.currentStep = tutorialState.steps[tutorialState.currentStep] || tutorialState.steps[0];
      this.createTutorialUI();
      this.setupEventListeners();
      this.showCurrentStep();
    }
  }

  private createTutorialUI(): void {
    this.container = this.scene.add.container(0, 0).setDepth(300).setScrollFactor(0);

    this.overlay = this.scene.add.graphics();
    this.overlay.fillStyle(0x000000, 0.7);
    this.overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT), Phaser.Geom.Rectangle.Contains);
    
    this.container.add(this.overlay);

    this.highlightGraphics = this.scene.add.graphics();
    this.container.add(this.highlightGraphics);
  }

  private setupEventListeners(): void {
    const onPetalCollected = () => {
      if (this.isActive && this.currentStep?.actionRequired === 'collect') {
        this.completeCurrentStep();
      }
    };
    EventManager.getInstance().on('petal:collected', onPetalCollected);
    this.uiListeners.push({ event: 'petal:collected', callback: onPetalCollected });

    const onRangeUpdated = () => {
      if (this.isActive && this.currentStep?.id === 'tutorial_range') {
        this.completeCurrentStep();
      }
    };
    EventManager.getInstance().on('collectRange:updated', onRangeUpdated);
    this.uiListeners.push({ event: 'collectRange:updated', callback: onRangeUpdated });

    const onGoalComplete = () => {
      if (this.isActive && this.currentStep?.id === 'tutorial_goal') {
        this.completeCurrentStep();
      }
    };
    EventManager.getInstance().on('goal:completed', onGoalComplete);
    this.uiListeners.push({ event: 'goal:completed', callback: onGoalComplete });

    const onTutorialNext = (data: { step: TutorialStep }) => {
      this.currentStep = data.step;
      this.showCurrentStep();
    };
    EventManager.getInstance().on('tutorial:next', onTutorialNext);
    this.uiListeners.push({ event: 'tutorial:next', callback: onTutorialNext });

    const onTutorialComplete = () => {
      this.hide();
    };
    EventManager.getInstance().on('tutorial:complete', onTutorialComplete);
    this.uiListeners.push({ event: 'tutorial:complete', callback: onTutorialComplete });
  }

  private showCurrentStep(): void {
    if (!this.currentStep || !this.container) return;

    this.container.removeAll(true);
    this.createTutorialUI();

    if (this.currentStep.targetArea) {
      this.createHighlight(this.currentStep.targetArea);
    } else if (this.currentStep.highlightElement) {
      this.highlightElement(this.currentStep.highlightElement);
    }

    this.createTutorialCard();
  }

  private createHighlight(area: { x: number; y: number; width: number; height: number }): void {
    if (!this.highlightGraphics || !this.overlay) return;

    this.highlightGraphics.clear();
    
    this.overlay.clear();
    this.overlay.fillStyle(0x000000, 0.7);
    this.overlay.beginPath();
    
    this.overlay.moveTo(0, 0);
    this.overlay.lineTo(GAME_WIDTH, 0);
    this.overlay.lineTo(GAME_WIDTH, GAME_HEIGHT);
    this.overlay.lineTo(0, GAME_HEIGHT);
    this.overlay.closePath();
    
    this.overlay.moveTo(area.x, area.y);
    this.overlay.lineTo(area.x, area.y + area.height);
    this.overlay.lineTo(area.x + area.width, area.y + area.height);
    this.overlay.lineTo(area.x + area.width, area.y);
    this.overlay.closePath();
    
    this.overlay.fillPath();

    this.highlightGraphics.lineStyle(3, 0xffd93d, 1);
    this.highlightGraphics.strokeRoundedRect(area.x, area.y, area.width, area.height, 10);

    this.scene.tweens.add({
      targets: this.highlightGraphics,
      alpha: { from: 0.5, to: 1 },
      duration: 1000,
      yoyo: true,
      repeat: -1
    });

    const glow = this.scene.add.graphics();
    glow.lineStyle(6, 0xffd93d, 0.3);
    glow.strokeRoundedRect(area.x - 5, area.y - 5, area.width + 10, area.height + 10, 15);
    this.container?.add(glow);

    this.scene.tweens.add({
      targets: glow,
      scale: { from: 1, to: 1.1 },
      alpha: { from: 0.5, to: 0 },
      duration: 1500,
      repeat: -1
    });
  }

  private highlightElement(elementId: string): void {
    let area: { x: number; y: number; width: number; height: number } | null = null;

    switch (elementId) {
      case 'synthesis_button':
        area = {
          x: GAME_WIDTH - 120,
          y: GAME_HEIGHT - 110,
          width: 80,
          height: 80
        };
        break;
      case 'collection_button':
        area = {
          x: GAME_WIDTH - 112,
          y: GAME_HEIGHT - 202,
          width: 64,
          height: 64
        };
        break;
      case 'joystick_area':
        area = {
          x: 20,
          y: GAME_HEIGHT * 0.7,
          width: GAME_WIDTH - 40,
          height: GAME_HEIGHT * 0.3
        };
        break;
    }

    if (area) {
      this.createHighlight(area);
    }
  }

  private createTutorialCard(): void {
    if (!this.container || !this.currentStep) return;

    const cardWidth = GAME_WIDTH - 80;
    const cardHeight = 200;
    const cardX = 40;
    const cardY = GAME_HEIGHT - cardHeight - 80;

    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(0x1a0a2e, 0.95);
    cardBg.fillRoundedRect(cardX, cardY, cardWidth, cardHeight, 20);
    cardBg.lineStyle(3, 0xffd93d, 0.8);
    cardBg.strokeRoundedRect(cardX, cardY, cardWidth, cardHeight, 20);
    this.container.add(cardBg);

    const state = SettingsManager.getInstance().getTutorialState();
    const stepNumber = state.currentStep + 1;
    const totalSteps = state.steps.length;
    
    const progressBg = this.scene.add.graphics();
    progressBg.fillStyle(0x333333, 0.5);
    progressBg.fillRoundedRect(cardX + 20, cardY + 20, cardWidth - 40, 6, 3);
    
    const progressWidth = ((stepNumber) / totalSteps) * (cardWidth - 40);
    progressBg.fillStyle(0xffd93d, 1);
    progressBg.fillRoundedRect(cardX + 20, cardY + 20, progressWidth, 6, 3);
    this.container.add(progressBg);

    const stepText = this.scene.add.text(
      cardX + cardWidth / 2,
      cardY + 45,
      `${stepNumber} / ${totalSteps}`,
      {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#ffd93d'
      }
    ).setOrigin(0.5);
    this.container.add(stepText);

    const titleText = this.scene.add.text(
      cardX + 30,
      cardY + 70,
      this.currentStep.title,
      {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0, 0);
    this.container.add(titleText);

    const contentText = this.scene.add.text(
      cardX + 30,
      cardY + 105,
      this.currentStep.content,
      {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#aaaaaa',
        wordWrap: { width: cardWidth - 60 }
      }
    ).setOrigin(0, 0);
    this.container.add(contentText);

    if (this.currentStep.actionRequired === 'click') {
      const hintText = this.scene.add.text(
        cardX + cardWidth / 2,
        cardY + cardHeight - 30,
        '👆 点击高亮区域继续',
        {
          fontFamily: 'Arial',
          fontSize: '13px',
          color: '#ffd93d'
        }
      ).setOrigin(0.5);
      this.container.add(hintText);

      this.scene.tweens.add({
        targets: hintText,
        alpha: { from: 0.5, to: 1 },
        duration: 1000,
        yoyo: true,
        repeat: -1
      });
    } else if (this.currentStep.actionRequired === 'move') {
      const hintText = this.scene.add.text(
        cardX + cardWidth / 2,
        cardY + cardHeight - 30,
        '👆 点击屏幕任意位置移动',
        {
          fontFamily: 'Arial',
          fontSize: '13px',
          color: '#ffd93d'
        }
      ).setOrigin(0.5);
      this.container.add(hintText);

      this.scene.tweens.add({
        targets: hintText,
        alpha: { from: 0.5, to: 1 },
        duration: 1000,
        yoyo: true,
        repeat: -1
      });
    } else if (this.currentStep.actionRequired === 'collect') {
      const hintText = this.scene.add.text(
        cardX + cardWidth / 2,
        cardY + cardHeight - 30,
        '🌸 靠近花瓣自动收集',
        {
          fontFamily: 'Arial',
          fontSize: '13px',
          color: '#ffd93d'
        }
      ).setOrigin(0.5);
      this.container.add(hintText);

      this.scene.tweens.add({
        targets: hintText,
        alpha: { from: 0.5, to: 1 },
        duration: 1000,
        yoyo: true,
        repeat: -1
      });
    } else {
      const nextButtonBg = this.scene.add.graphics();
      nextButtonBg.fillStyle(0xffd93d, 0.9);
      nextButtonBg.fillRoundedRect(cardX + cardWidth - 120, cardY + cardHeight - 50, 100, 36, 18);
      this.container.add(nextButtonBg);

      const nextButtonText = this.scene.add.text(
        cardX + cardWidth - 70,
        cardY + cardHeight - 32,
        '下一步',
        {
          fontFamily: 'Arial',
          fontSize: '15px',
          color: '#1a0a2e',
          fontStyle: 'bold'
        }
      ).setOrigin(0.5);
      this.container.add(nextButtonText);

      const nextButtonZone = this.scene.add.zone(
        cardX + cardWidth - 70,
        cardY + cardHeight - 32,
        100,
        36
      ).setInteractive({ useHandCursor: true });
      
      nextButtonZone.on('pointerup', () => {
        this.completeCurrentStep();
        EventManager.getInstance().emit('audio:play', { key: 'sfx_click', volume: 0.3 });
      });
      
      this.container.add(nextButtonZone);
    }

    const skipButton = this.scene.add.text(
      cardX + 50,
      cardY + cardHeight - 32,
      '跳过教程',
      {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#888888'
      }
    ).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    
    skipButton.on('pointerup', () => {
      this.dismiss();
      EventManager.getInstance().emit('audio:play', { key: 'sfx_click', volume: 0.3 });
    });
    this.container.add(skipButton);

    cardBg.setAlpha(0);
    titleText.setAlpha(0);
    contentText.setAlpha(0);
    
    this.scene.tweens.add({
      targets: [cardBg, titleText, contentText],
      alpha: 1,
      duration: 300,
      ease: 'Cubic.Out'
    });

    cardBg.setY(cardY + 50);
    this.scene.tweens.add({
      targets: cardBg,
      y: cardY,
      duration: 400,
      ease: 'Back.Out'
    });
  }

  private completeCurrentStep(): void {
    if (!this.currentStep) return;
    SettingsManager.getInstance().completeTutorialStep(this.currentStep.id);
  }

  public notifyPlayerMoved(): void {
    if (this.isActive && this.currentStep?.actionRequired === 'move') {
      this.completeCurrentStep();
    }
  }

  public notifySynthesisClicked(): void {
    if (this.isActive && this.currentStep?.highlightElement === 'synthesis_button') {
      this.completeCurrentStep();
    }
  }

  private dismiss(): void {
    SettingsManager.getInstance().dismissTutorial();
    this.hide();
  }

  private hide(): void {
    this.isActive = false;
    
    if (this.container) {
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.container?.destroy();
          this.container = null;
        }
      });
    }

    this.uiListeners.forEach(({ event, callback }) => {
      EventManager.getInstance().off(event, callback);
    });
    this.uiListeners = [];
  }

  public show(): void {
    if (!this.isActive) {
      const tutorialState = SettingsManager.getInstance().getTutorialState();
      this.isActive = true;
      this.currentStep = tutorialState.steps[tutorialState.currentStep] || tutorialState.steps[0];
      this.createTutorialUI();
      this.setupEventListeners();
      this.showCurrentStep();
    }
  }

  public update(time: number, delta: number): void {
    if (!this.isActive) return;
  }

  public destroy(): void {
    if (this.container) {
      this.container.destroy();
    }
    if (this.highlightGraphics) {
      this.highlightGraphics.destroy();
    }

    this.uiListeners.forEach(({ event, callback }) => {
      EventManager.getInstance().off(event, callback);
    });
    this.uiListeners = [];
  }
}
