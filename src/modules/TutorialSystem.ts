import Phaser from 'phaser';
import {
  TutorialStep,
  TutorialState,
  TutorialCondition,
  TutorialConditionType,
  TutorialValidation,
  TutorialValidationType,
  TutorialSkipConfig,
  TutorialGuideProgress,
  GameEvents,
  PetalType
} from '../types';
import { SettingsManager } from '../managers/SettingsManager';
import { SaveManager } from '../managers/SaveManager';
import { EventManager } from '../managers/EventManager';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';

type EventListenerEntry = {
  event: keyof GameEvents;
  callback: (data: any) => void;
};

interface ValidationContext {
  elementId?: string;
  petalType?: string;
  petalCount?: number;
  recipeId?: string;
  areaX?: number;
  areaY?: number;
  tapCount?: number;
  elapsedMs?: number;
}

export class TutorialSystem {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private overlay: Phaser.GameObjects.Graphics | null = null;
  private currentStep: TutorialStep | null = null;
  private isActive: boolean = false;
  private highlightGraphics: Phaser.GameObjects.Graphics | null = null;
  private uiListeners: EventListenerEntry[] = [];
  private validationTimer: Phaser.Time.TimerEvent | null = null;
  private stepDelayTimer: Phaser.Time.TimerEvent | null = null;
  private skipConfirmVisible: boolean = false;
  private currentStepUnlocked: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public create(): void {
    const tutorialState = SettingsManager.getInstance().getTutorialState();

    if (!tutorialState.completed && !tutorialState.dismissed) {
      this.isActive = true;
      const stepIndex = this.findCurrentStepIndex(tutorialState);
      this.currentStep = tutorialState.steps[stepIndex] || tutorialState.steps[0];
      this.currentStepUnlocked = this.isStepUnlocked(this.currentStep);
      SettingsManager.getInstance().setCurrentTutorialStep(stepIndex);
      this.createTutorialUI();
      this.setupEventListeners();
      this.showStepContent();
    }
  }

  private findCurrentStepIndex(tutorialState: TutorialState): number {
    for (let i = tutorialState.currentStep; i < tutorialState.steps.length; i++) {
      if (!tutorialState.steps[i].completed) {
        return i;
      }
    }
    return Math.min(tutorialState.currentStep, tutorialState.steps.length - 1);
  }

  private isStepUnlocked(step: TutorialStep): boolean {
    if (!step.unlockCondition) return true;
    return this.checkCondition(step.unlockCondition);
  }

  private checkCondition(condition: TutorialCondition): boolean {
    const gameState = SaveManager.getInstance().getGameState();
    const tutorialState = SettingsManager.getInstance().getTutorialState();

    switch (condition.type) {
      case TutorialConditionType.PETAL_COUNT:
        if (condition.target) {
          return (gameState.petals[condition.target as any] || 0) >= (condition.count || 0);
        }
        return false;

      case TutorialConditionType.PETAL_UNLOCKED:
        if (condition.target) {
          return gameState.unlockedPetals.includes(condition.target as any);
        }
        return false;

      case TutorialConditionType.RECIPE_UNLOCKED:
        if (condition.target) {
          return gameState.unlockedRecipes.includes(condition.target as string);
        }
        return false;

      case TutorialConditionType.TOTAL_COLLECTED:
        return gameState.totalCollected >= (condition.count || 0);

      case TutorialConditionType.TOTAL_SYNTHESIZED:
        return gameState.totalSynthesized >= (condition.count || 0);

      case TutorialConditionType.STEP_COMPLETED:
        if (condition.target) {
          const step = tutorialState.steps.find(s => s.id === condition.target);
          return step ? step.completed : false;
        }
        return false;

      case TutorialConditionType.GAME_PLAYTIME:
        return gameState.playTime >= (condition.count || 0);

      default:
        return true;
    }
  }

  private validateInteraction(step: TutorialStep, context: ValidationContext): boolean {
    if (!step.validation) return true;

    const validation = step.validation;

    switch (validation.type) {
      case TutorialValidationType.CLICK_ELEMENT:
        if (!validation.target || !context.elementId) return false;
        return context.elementId === validation.target;

      case TutorialValidationType.COLLECT_PETAL:
        if (validation.target) {
          return context.petalType === validation.target;
        }
        return !!context.petalType && (context.petalCount || 0) > 0;

      case TutorialValidationType.MOVE_TO_AREA:
        if (step.targetArea) {
          if (context.areaX === undefined || context.areaY === undefined) return false;
          const area = step.targetArea;
          const tolerance = validation.tolerance || 0;
          return (
            context.areaX >= area.x - tolerance &&
            context.areaX <= area.x + area.width + tolerance &&
            context.areaY >= area.y - tolerance &&
            context.areaY <= area.y + area.height + tolerance
          );
        }
        return true;

      case TutorialValidationType.SYNTHESIZE_RECIPE:
        if (validation.target && context.recipeId) {
          return context.recipeId === validation.target;
        }
        return !!context.recipeId;

      case TutorialValidationType.TAP_COUNT:
        const tapCount = context.tapCount || 0;
        const requiredCount = validation.count || 1;
        return tapCount >= requiredCount;

      case TutorialValidationType.WAIT_DURATION:
        const elapsed = context.elapsedMs || 0;
        const required = validation.duration || 1000;
        return elapsed >= required;

      default:
        return true;
    }
  }

  private handleValidationFailure(step: TutorialStep): void {
    const tutorialState = SettingsManager.getInstance().getTutorialState();
    const currentAttempts = tutorialState.validationAttempts[step.id] || 0;
    const newAttempts = currentAttempts + 1;

    SettingsManager.getInstance().updateTutorialState({
      validationAttempts: {
        ...tutorialState.validationAttempts,
        [step.id]: newAttempts
      }
    });

    EventManager.getInstance().emit('tutorial:validation_failed', {
      stepId: step.id,
      attempts: newAttempts,
      message: step.failureMessage
    });

    if (step.retryOnFail !== false) {
      this.showValidationFeedback(step.failureMessage || '操作不正确，请重试', false);
    }
  }

  private showValidationFeedback(message: string, isSuccess: boolean): void {
    if (!this.container) return;

    const feedbackY = GAME_HEIGHT * 0.3;
    const feedbackText = this.scene.add.text(
      GAME_WIDTH / 2,
      feedbackY,
      message,
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: isSuccess ? '#4ade80' : '#f87171',
        backgroundColor: isSuccess ? '#064e3b' : '#7f1d1d',
        padding: { x: 16, y: 8 }
      }
    ).setOrigin(0.5).setDepth(310);
    this.container.add(feedbackText);

    this.scene.tweens.add({
      targets: feedbackText,
      alpha: 0,
      y: feedbackY - 30,
      duration: 2000,
      ease: 'Cubic.Out',
      onComplete: () => {
        feedbackText.destroy();
      }
    });
  }

  private trySkipCurrentStep(): void {
    if (!this.currentStep) return;

    const skipConfig: TutorialSkipConfig = this.currentStep.skipConfig || { allowed: false };

    if (!skipConfig.allowed) return;

    if (skipConfig.confirmRequired && !this.skipConfirmVisible) {
      this.showSkipConfirmation(skipConfig);
      return;
    }

    this.skipConfirmVisible = false;
    const tutorialState = SettingsManager.getInstance().getTutorialState();
    const guideId = tutorialState.activeGuideId;

    this.recordStepSkipped(this.currentStep.id);

    EventManager.getInstance().emit('tutorial:step_skipped', {
      stepId: this.currentStep.id,
      skipToStepId: skipConfig.skipToStepId,
      guideId
    });

    if (skipConfig.skipToStepId) {
      const targetIndex = tutorialState.steps.findIndex(s => s.id === skipConfig.skipToStepId);
      if (targetIndex !== -1) {
        SettingsManager.getInstance().setCurrentTutorialStep(targetIndex);
        this.currentStep = tutorialState.steps[targetIndex];
        this.currentStepUnlocked = this.isStepUnlocked(this.currentStep);
        this.showStepContent();
        return;
      }
    }

    this.advanceToNextStep();
  }

  private showSkipConfirmation(skipConfig: TutorialSkipConfig): void {
    this.skipConfirmVisible = true;
    if (!this.container) return;

    const confirmWidth = 300;
    const confirmHeight = 140;
    const confirmX = (GAME_WIDTH - confirmWidth) / 2;
    const confirmY = GAME_HEIGHT * 0.25;

    const confirmBg = this.scene.add.graphics();
    confirmBg.fillStyle(0x1a0a2e, 0.98);
    confirmBg.fillRoundedRect(confirmX, confirmY, confirmWidth, confirmHeight, 16);
    confirmBg.lineStyle(2, 0xffd93d, 0.6);
    confirmBg.strokeRoundedRect(confirmX, confirmY, confirmWidth, confirmHeight, 16);
    this.container.add(confirmBg);

    const confirmText = this.scene.add.text(
      GAME_WIDTH / 2,
      confirmY + 30,
      skipConfig.confirmMessage || '确定跳过此步骤？',
      {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: '#ffffff',
        wordWrap: { width: confirmWidth - 40 },
        align: 'center'
      }
    ).setOrigin(0.5, 0);
    this.container.add(confirmText);

    const yesBtn = this.scene.add.text(
      GAME_WIDTH / 2 - 60,
      confirmY + confirmHeight - 40,
      '确定跳过',
      {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#f87171',
        backgroundColor: '#7f1d1d',
        padding: { x: 12, y: 6 }
      }
    ).setOrigin(0.5).setInteractive({ useHandCursor: true });
    yesBtn.on('pointerup', () => {
      this.skipConfirmVisible = false;
      this.trySkipCurrentStep();
      EventManager.getInstance().emit('audio:play', { key: 'sfx_click', volume: 0.3 });
    });
    this.container.add(yesBtn);

    const noBtn = this.scene.add.text(
      GAME_WIDTH / 2 + 60,
      confirmY + confirmHeight - 40,
      '继续教程',
      {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#4ade80',
        backgroundColor: '#064e3b',
        padding: { x: 12, y: 6 }
      }
    ).setOrigin(0.5).setInteractive({ useHandCursor: true });
    noBtn.on('pointerup', () => {
      this.skipConfirmVisible = false;
      this.container?.remove(confirmBg, true);
      this.container?.remove(confirmText, true);
      this.container?.remove(yesBtn, true);
      this.container?.remove(noBtn, true);
      EventManager.getInstance().emit('audio:play', { key: 'sfx_click', volume: 0.3 });
    });
    this.container.add(noBtn);
  }

  private recordStepSkipped(stepId: string): void {
    const tutorialState = SettingsManager.getInstance().getTutorialState();
    const guideId = tutorialState.activeGuideId;

    if (guideId) {
      const progressIndex = tutorialState.guideProgress.findIndex(p => p.guideId === guideId);
      if (progressIndex !== -1) {
        const progress = { ...tutorialState.guideProgress[progressIndex] };
        if (!progress.skippedSteps.includes(stepId)) {
          progress.skippedSteps.push(stepId);
        }
        const updatedProgress = [...tutorialState.guideProgress];
        updatedProgress[progressIndex] = progress;
        SettingsManager.getInstance().updateTutorialState({
          guideProgress: updatedProgress
        });
      }
    }
  }

  private recordStepCompleted(stepId: string): void {
    const tutorialState = SettingsManager.getInstance().getTutorialState();
    const guideId = tutorialState.activeGuideId;

    if (guideId) {
      const progressIndex = tutorialState.guideProgress.findIndex(p => p.guideId === guideId);
      if (progressIndex !== -1) {
        const progress = { ...tutorialState.guideProgress[progressIndex] };
        if (!progress.completedSteps.includes(stepId)) {
          progress.completedSteps.push(stepId);
        }
        const updatedProgress = [...tutorialState.guideProgress];
        updatedProgress[progressIndex] = progress;
        SettingsManager.getInstance().updateTutorialState({
          guideProgress: updatedProgress
        });
      }
    }
  }

  private advanceToNextStep(): void {
    const tutorialState = SettingsManager.getInstance().getTutorialState();
    const currentIndex = tutorialState.steps.findIndex(s => s.id === this.currentStep?.id);
    const nextIndex = currentIndex + 1;

    if (nextIndex < tutorialState.steps.length) {
      const nextStep = tutorialState.steps[nextIndex];
      if (!nextStep.completed) {
        SettingsManager.getInstance().setCurrentTutorialStep(nextIndex);
        this.currentStep = nextStep;
        this.currentStepUnlocked = this.isStepUnlocked(nextStep);
        this.showStepContent();
      } else {
        SettingsManager.getInstance().setCurrentTutorialStep(nextIndex);
        this.currentStep = nextStep;
        this.currentStepUnlocked = true;
        this.advanceToNextStep();
      }
    } else {
      this.completeAllSteps();
    }
  }

  private completeAllSteps(): void {
    const tutorialState = SettingsManager.getInstance().getTutorialState();
    const guideId = tutorialState.activeGuideId;

    if (guideId) {
      const progressIndex = tutorialState.guideProgress.findIndex(p => p.guideId === guideId);
      if (progressIndex !== -1) {
        const updatedProgress = [...tutorialState.guideProgress];
        updatedProgress[progressIndex] = {
          ...updatedProgress[progressIndex],
          completedAt: Date.now()
        };
        SettingsManager.getInstance().updateTutorialState({
          guideProgress: updatedProgress
        });
      }

      EventManager.getInstance().emit('tutorial:guide_completed', {
        guideId,
        completedSteps: tutorialState.guideProgress.find(p => p.guideId === guideId)?.completedSteps || [],
        skippedSteps: tutorialState.guideProgress.find(p => p.guideId === guideId)?.skippedSteps || []
      });
    }

    this.hide();
  }

  public startGuide(guideId: string, steps: TutorialStep[]): void {
    const tutorialState = SettingsManager.getInstance().getTutorialState();

    const existingProgress = tutorialState.guideProgress.find(p => p.guideId === guideId);
    if (existingProgress && existingProgress.completedAt) return;

    const guideProgress: TutorialGuideProgress = existingProgress || {
      guideId,
      completedSteps: [],
      skippedSteps: [],
      startedAt: Date.now()
    };

    if (!existingProgress) {
      SettingsManager.getInstance().updateTutorialState({
        activeGuideId: guideId,
        guideProgress: [...tutorialState.guideProgress, guideProgress],
        steps,
        currentStep: 0,
        completed: false,
        dismissed: false
      });
    } else {
      SettingsManager.getInstance().updateTutorialState({
        activeGuideId: guideId,
        steps,
        currentStep: 0,
        completed: false,
        dismissed: false
      });
    }

    EventManager.getInstance().emit('tutorial:guide_started', { guideId });

    this.isActive = true;
    const updatedState = SettingsManager.getInstance().getTutorialState();
    const stepIndex = this.findCurrentStepIndex(updatedState);
    this.currentStep = updatedState.steps[stepIndex] || updatedState.steps[0];
    this.currentStepUnlocked = this.isStepUnlocked(this.currentStep);
    SettingsManager.getInstance().setCurrentTutorialStep(stepIndex);
    this.createTutorialUI();
    this.setupEventListeners();
    this.showStepContent();
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
    const onPetalCollected = (data: { type: string; count: number }) => {
      if (this.isActive && this.currentStep?.actionRequired === 'collect' && this.currentStepUnlocked) {
        const context: ValidationContext = {
          petalType: data.type,
          petalCount: data.count
        };
        if (this.validateInteraction(this.currentStep, context)) {
          EventManager.getInstance().emit('tutorial:validation_passed', {
            stepId: this.currentStep.id,
            guideId: SettingsManager.getInstance().getTutorialState().activeGuideId
          });
          this.completeCurrentStep();
        } else if (this.currentStep.validation) {
          this.handleValidationFailure(this.currentStep);
        }
      }
      this.recheckUnlockConditions();
    };
    EventManager.getInstance().on('petal:collected', onPetalCollected);
    this.uiListeners.push({ event: 'petal:collected', callback: onPetalCollected });

    const onRangeUpdated = () => {
      if (this.isActive && this.currentStep?.id === 'tutorial_range' && this.currentStepUnlocked) {
        if (this.currentStep.validation) {
          const context: ValidationContext = {};
          if (this.validateInteraction(this.currentStep, context)) {
            EventManager.getInstance().emit('tutorial:validation_passed', {
              stepId: this.currentStep.id,
              guideId: SettingsManager.getInstance().getTutorialState().activeGuideId
            });
            this.completeCurrentStep();
          } else {
            this.handleValidationFailure(this.currentStep);
          }
        } else {
          this.completeCurrentStep();
        }
      }
    };
    EventManager.getInstance().on('collectRange:updated', onRangeUpdated);
    this.uiListeners.push({ event: 'collectRange:updated', callback: onRangeUpdated });

    const onGoalComplete = (data: { goal: { id: string } }) => {
      if (this.isActive && this.currentStep?.id === 'tutorial_goal' && this.currentStepUnlocked) {
        const context: ValidationContext = {};
        if (this.currentStep.validation) {
          if (this.validateInteraction(this.currentStep, context)) {
            EventManager.getInstance().emit('tutorial:validation_passed', {
              stepId: this.currentStep.id,
              guideId: SettingsManager.getInstance().getTutorialState().activeGuideId
            });
            this.completeCurrentStep();
          } else {
            this.handleValidationFailure(this.currentStep);
          }
        } else {
          this.completeCurrentStep();
        }
      }
    };
    EventManager.getInstance().on('goal:completed', onGoalComplete);
    this.uiListeners.push({ event: 'goal:completed', callback: onGoalComplete });

    const onSynthesisButtonClicked = () => {
      if (this.isActive &&
          this.currentStep?.actionRequired === 'click' &&
          this.currentStep?.highlightElement === 'synthesis_button' &&
          this.currentStepUnlocked) {
        const context: ValidationContext = {
          elementId: 'synthesis_button'
        };
        if (this.currentStep.validation) {
          if (this.validateInteraction(this.currentStep, context)) {
            EventManager.getInstance().emit('tutorial:validation_passed', {
              stepId: this.currentStep.id,
              guideId: SettingsManager.getInstance().getTutorialState().activeGuideId
            });
            this.completeCurrentStep();
          } else {
            this.handleValidationFailure(this.currentStep);
          }
        } else {
          this.completeCurrentStep();
        }
      }
    };
    EventManager.getInstance().on('synthesis:button_clicked', onSynthesisButtonClicked);
    this.uiListeners.push({ event: 'synthesis:button_clicked', callback: onSynthesisButtonClicked });

    const onSynthesisComplete = (data: { recipeId: string }) => {
      if (this.isActive && this.currentStep?.actionRequired === 'synthesize' && this.currentStepUnlocked) {
        const context: ValidationContext = {
          recipeId: data.recipeId
        };
        if (this.currentStep.validation) {
          if (this.validateInteraction(this.currentStep, context)) {
            EventManager.getInstance().emit('tutorial:validation_passed', {
              stepId: this.currentStep.id,
              guideId: SettingsManager.getInstance().getTutorialState().activeGuideId
            });
            this.completeCurrentStep();
          } else {
            this.handleValidationFailure(this.currentStep);
          }
        } else {
          this.completeCurrentStep();
        }
      }
      this.recheckUnlockConditions();
    };
    EventManager.getInstance().on('synthesis:complete', onSynthesisComplete);
    this.uiListeners.push({ event: 'synthesis:complete', callback: onSynthesisComplete });

    const onTutorialNext = (data: { step: TutorialStep }) => {
      this.currentStep = data.step;
      this.currentStepUnlocked = this.isStepUnlocked(data.step);
      this.showStepContent();
    };
    EventManager.getInstance().on('tutorial:next', onTutorialNext);
    this.uiListeners.push({ event: 'tutorial:next', callback: onTutorialNext });

    const onTutorialComplete = () => {
      this.hide();
    };
    EventManager.getInstance().on('tutorial:complete', onTutorialComplete);
    this.uiListeners.push({ event: 'tutorial:complete', callback: onTutorialComplete });

    const onRecipeUnlockedConditionCheck = () => {
      this.recheckUnlockConditions();
    };
    EventManager.getInstance().on('synthesis:recipe_unlocked', onRecipeUnlockedConditionCheck);
    this.uiListeners.push({ event: 'synthesis:recipe_unlocked', callback: onRecipeUnlockedConditionCheck });
  }

  private recheckUnlockConditions(): void {
    if (!this.isActive || !this.currentStep) return;

    const tutorialState = SettingsManager.getInstance().getTutorialState();
    const currentIndex = tutorialState.steps.findIndex(s => s.id === this.currentStep?.id);

    for (let i = currentIndex + 1; i < tutorialState.steps.length; i++) {
      const step = tutorialState.steps[i];
      if (step.completed) continue;
      if (step.unlockCondition) {
        const met = this.checkCondition(step.unlockCondition);
        EventManager.getInstance().emit('tutorial:condition_check', {
          stepId: step.id,
          conditionType: step.unlockCondition.type,
          met
        });
        if (met) {
          EventManager.getInstance().emit('tutorial:step_unlocked', {
            stepId: step.id,
            guideId: tutorialState.activeGuideId
          });
        }
      }
    }

    if (!this.currentStepUnlocked && this.currentStep.unlockCondition) {
      const nowUnlocked = this.checkCondition(this.currentStep.unlockCondition);
      if (nowUnlocked) {
        this.currentStepUnlocked = true;
        EventManager.getInstance().emit('tutorial:step_unlocked', {
          stepId: this.currentStep.id,
          guideId: tutorialState.activeGuideId
        });
        this.showStepContent();
      }
    }
  }

  private showStepContent(): void {
    if (!this.currentStep) return;

    if (!this.currentStepUnlocked) {
      this.showLockedStepUI(this.currentStep);
      return;
    }

    if (this.currentStep.delayMs && this.currentStep.delayMs > 0) {
      this.showDelayIndicator();
      this.stepDelayTimer = this.scene.time.delayedCall(this.currentStep.delayMs, () => {
        this.showCurrentStep();
      });
    } else {
      this.showCurrentStep();
    }
  }

  private showLockedStepUI(step: TutorialStep): void {
    if (!this.container) return;

    this.container.removeAll(true);
    this.createTutorialUI();

    const cardWidth = GAME_WIDTH - 80;
    const cardHeight = 200;
    const cardX = 40;
    const cardY = GAME_HEIGHT - cardHeight - 80;

    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(0x1a0a2e, 0.95);
    cardBg.fillRoundedRect(cardX, cardY, cardWidth, cardHeight, 20);
    cardBg.lineStyle(3, 0x666666, 0.6);
    cardBg.strokeRoundedRect(cardX, cardY, cardWidth, cardHeight, 20);
    this.container.add(cardBg);

    const lockIcon = this.scene.add.text(
      cardX + cardWidth / 2,
      cardY + 45,
      '🔒 即将解锁',
      {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffd93d',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
    this.container.add(lockIcon);

    const titleText = this.scene.add.text(
      cardX + cardWidth / 2,
      cardY + 85,
      step.title,
      {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#aaaaaa'
      }
    ).setOrigin(0.5);
    this.container.add(titleText);

    const conditionDesc = this.getConditionDescription(step.unlockCondition!);
    const conditionText = this.scene.add.text(
      cardX + cardWidth / 2,
      cardY + 120,
      `解锁条件: ${conditionDesc}`,
      {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#888888',
        wordWrap: { width: cardWidth - 40 },
        align: 'center'
      }
    ).setOrigin(0.5);
    this.container.add(conditionText);

    const progressInfo = this.getConditionProgress(step.unlockCondition!);
    if (progressInfo) {
      const progressText = this.scene.add.text(
        cardX + cardWidth / 2,
        cardY + 155,
        progressInfo,
        {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: '#ffd93d',
          fontStyle: 'bold'
        }
      ).setOrigin(0.5);
      this.container.add(progressText);
    }

    const skipAllowed = step.skipConfig?.allowed ?? false;
    if (skipAllowed) {
      const skipButton = this.scene.add.text(
        cardX + cardWidth / 2,
        cardY + cardHeight - 30,
        '跳过此步骤',
        {
          fontFamily: 'Arial',
          fontSize: '13px',
          color: '#888888'
        }
      ).setOrigin(0.5).setInteractive({ useHandCursor: true });

      skipButton.on('pointerup', () => {
        this.trySkipCurrentStep();
        EventManager.getInstance().emit('audio:play', { key: 'sfx_click', volume: 0.3 });
      });
      this.container.add(skipButton);
    }
  }

  private getConditionDescription(condition: TutorialCondition): string {
    switch (condition.type) {
      case TutorialConditionType.PETAL_COUNT:
        return `收集 ${condition.count || 0} 朵${this.getPetalName(condition.target)}花瓣`;
      case TutorialConditionType.PETAL_UNLOCKED:
        return `解锁${this.getPetalName(condition.target)}花瓣`;
      case TutorialConditionType.RECIPE_UNLOCKED:
        return `解锁配方 ${condition.target || ''}`;
      case TutorialConditionType.TOTAL_COLLECTED:
        return `累计收集 ${condition.count || 0} 朵花瓣`;
      case TutorialConditionType.TOTAL_SYNTHESIZED:
        return `累计合成 ${condition.count || 0} 次`;
      case TutorialConditionType.STEP_COMPLETED:
        return `完成步骤 ${condition.target || ''}`;
      case TutorialConditionType.GAME_PLAYTIME:
        return `游戏时长达到 ${condition.count || 0} 秒`;
      default:
        return '未知条件';
    }
  }

  private getPetalName(type?: string | PetalType): string {
    if (!type) return '';
    const names: Record<string, string> = {
      'moonlight': '月光',
      'starlight': '星光',
      'dew': '露珠',
      'glowing': '荧光',
      'dream': '梦境',
      'eternal': '永恒',
      'wakeup': '唤醒'
    };
    return names[type as string] || type;
  }

  private getConditionProgress(condition: TutorialCondition): string | null {
    const gameState = SaveManager.getInstance().getGameState();
    const tutorialState = SettingsManager.getInstance().getTutorialState();

    switch (condition.type) {
      case TutorialConditionType.PETAL_COUNT:
        if (condition.target && condition.count) {
          const current = gameState.petals[condition.target as any] || 0;
          return `${current} / ${condition.count}`;
        }
        return null;

      case TutorialConditionType.TOTAL_COLLECTED:
        if (condition.count) {
          return `${gameState.totalCollected} / ${condition.count}`;
        }
        return null;

      case TutorialConditionType.TOTAL_SYNTHESIZED:
        if (condition.count) {
          return `${gameState.totalSynthesized} / ${condition.count}`;
        }
        return null;

      case TutorialConditionType.GAME_PLAYTIME:
        if (condition.count) {
          return `${Math.floor(gameState.playTime)} / ${condition.count} 秒`;
        }
        return null;

      case TutorialConditionType.STEP_COMPLETED:
        if (condition.target) {
          const step = tutorialState.steps.find(s => s.id === condition.target);
          return step?.completed ? '✅ 已完成' : '⏳ 未完成';
        }
        return null;

      default:
        return null;
    }
  }

  private showDelayIndicator(): void {
    if (!this.container) return;

    const indicator = this.scene.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT * 0.4,
      '准备中...',
      {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffd93d'
      }
    ).setOrigin(0.5).setDepth(310);
    this.container.add(indicator);

    this.scene.tweens.add({
      targets: indicator,
      alpha: { from: 0.3, to: 1 },
      duration: 500,
      yoyo: true,
      repeat: -1
    });
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

    const progressWidth = (stepNumber / totalSteps) * (cardWidth - 40);
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

    const optionalBadge = this.currentStep.isOptional
      ? ' [可选]'
      : '';
    const titleText = this.scene.add.text(
      cardX + 30,
      cardY + 70,
      this.currentStep.title + optionalBadge,
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

    const hintMessages: Record<string, string> = {
      'click': '👆 点击高亮区域继续',
      'move': '👆 点击屏幕任意位置移动',
      'collect': '🌸 靠近花瓣自动收集',
      'synthesize': '⚗️ 完成一次合成操作'
    };

    if (this.currentStep.actionRequired && hintMessages[this.currentStep.actionRequired]) {
      const hintText = this.scene.add.text(
        cardX + cardWidth / 2,
        cardY + cardHeight - 30,
        hintMessages[this.currentStep.actionRequired],
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
        if (this.currentStep?.validation) {
          const context: ValidationContext = { elementId: 'next_button' };
          if (!this.validateInteraction(this.currentStep, context)) {
            this.handleValidationFailure(this.currentStep);
            return;
          }
        }
        this.completeCurrentStep();
        EventManager.getInstance().emit('audio:play', { key: 'sfx_click', volume: 0.3 });
      });

      this.container.add(nextButtonZone);
    }

    const skipAllowed = this.currentStep.skipConfig?.allowed ?? true;
    const skipLabel = skipAllowed ? '跳过教程' : '';
    if (skipLabel) {
      const skipButton = this.scene.add.text(
        cardX + 50,
        cardY + cardHeight - 32,
        skipLabel,
        {
          fontFamily: 'Arial',
          fontSize: '13px',
          color: '#888888'
        }
      ).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });

      skipButton.on('pointerup', () => {
        const skipConfig = this.currentStep?.skipConfig;
        if (skipConfig && skipConfig.allowed) {
          this.trySkipCurrentStep();
        } else {
          this.dismiss();
        }
        EventManager.getInstance().emit('audio:play', { key: 'sfx_click', volume: 0.3 });
      });
      this.container.add(skipButton);
    }

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

    if (this.currentStep.successMessage) {
      this.showValidationFeedback(this.currentStep.successMessage, true);
    }

    this.recordStepCompleted(this.currentStep.id);
    SettingsManager.getInstance().completeTutorialStep(this.currentStep.id);
  }

  public notifyPlayerMoved(x?: number, y?: number): void {
    if (!this.isActive || !this.currentStep) return;

    if (this.currentStep.actionRequired === 'move' && this.currentStepUnlocked) {
      const context: ValidationContext = {
        areaX: x,
        areaY: y
      };
      if (this.currentStep.validation) {
        if (this.validateInteraction(this.currentStep, context)) {
          EventManager.getInstance().emit('tutorial:validation_passed', {
            stepId: this.currentStep.id,
            guideId: SettingsManager.getInstance().getTutorialState().activeGuideId
          });
          this.completeCurrentStep();
        } else {
          this.handleValidationFailure(this.currentStep);
        }
      } else {
        this.completeCurrentStep();
      }
    }
  }

  public notifySynthesisClicked(): void {
    if (this.isActive &&
        this.currentStep?.highlightElement === 'synthesis_button' &&
        this.currentStepUnlocked) {
      const context: ValidationContext = {
        elementId: 'synthesis_button'
      };
      if (this.currentStep.validation) {
        if (this.validateInteraction(this.currentStep, context)) {
          EventManager.getInstance().emit('tutorial:validation_passed', {
            stepId: this.currentStep.id,
            guideId: SettingsManager.getInstance().getTutorialState().activeGuideId
          });
          this.completeCurrentStep();
        } else {
          this.handleValidationFailure(this.currentStep);
        }
      } else {
        this.completeCurrentStep();
      }
    }
  }

  private dismiss(): void {
    SettingsManager.getInstance().dismissTutorial();
    this.hide();
  }

  private hide(): void {
    this.isActive = false;

    if (this.stepDelayTimer) {
      this.stepDelayTimer.remove(false);
      this.stepDelayTimer = null;
    }

    if (this.validationTimer) {
      this.validationTimer.remove(false);
      this.validationTimer = null;
    }

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
      const stepIndex = this.findCurrentStepIndex(tutorialState);
      this.currentStep = tutorialState.steps[stepIndex] || tutorialState.steps[0];
      this.currentStepUnlocked = this.isStepUnlocked(this.currentStep);
      SettingsManager.getInstance().setCurrentTutorialStep(stepIndex);
      this.createTutorialUI();
      this.setupEventListeners();
      this.showStepContent();
    }
  }

  public update(time: number, delta: number): void {
    if (!this.isActive) return;
  }

  public destroy(): void {
    if (this.stepDelayTimer) {
      this.stepDelayTimer.remove(false);
      this.stepDelayTimer = null;
    }
    if (this.validationTimer) {
      this.validationTimer.remove(false);
      this.validationTimer = null;
    }
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
