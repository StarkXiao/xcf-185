import { ControlSettings, TutorialState, TutorialGuideProgress } from '../types';
import { 
  SETTINGS_STORAGE_KEY, 
  TUTORIAL_STORAGE_KEY,
  getInitialControlSettings,
  getInitialTutorialState
} from '../config/GameConfig';
import { EventManager } from './EventManager';

export class SettingsManager {
  private static instance: SettingsManager;
  private controlSettings: ControlSettings;
  private tutorialState: TutorialState;
  private settingsHistory: ControlSettings[] = [];
  private maxHistorySize: number = 10;

  private constructor() {
    this.controlSettings = this.loadControlSettings();
    this.tutorialState = this.loadTutorialState();
  }

  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  private loadControlSettings(): ControlSettings {
    try {
      const data = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return { ...getInitialControlSettings(), ...parsed };
      }
    } catch (error) {
      console.error('Failed to load control settings:', error);
    }
    return getInitialControlSettings();
  }

  private loadTutorialState(): TutorialState {
    try {
      const data = localStorage.getItem(TUTORIAL_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        const initial = getInitialTutorialState();
        return {
          ...initial,
          ...parsed,
          guideProgress: parsed.guideProgress || initial.guideProgress,
          validationAttempts: parsed.validationAttempts || initial.validationAttempts
        };
      }
    } catch (error) {
      console.error('Failed to load tutorial state:', error);
    }
    return getInitialTutorialState();
  }

  public getControlSettings(): ControlSettings {
    return { ...this.controlSettings };
  }

  public updateControlSettings(settings: Partial<ControlSettings>): void {
    const previousSettings = { ...this.controlSettings };
    this.settingsHistory.push(previousSettings);
    if (this.settingsHistory.length > this.maxHistorySize) {
      this.settingsHistory.shift();
    }

    this.controlSettings = { ...this.controlSettings, ...settings };
    this.saveControlSettings();
    EventManager.getInstance().emit('settings:updated', { 
      settings: { ...this.controlSettings } 
    });
  }

  public canUndoSettings(): boolean {
    return this.settingsHistory.length > 0;
  }

  public undoSettings(): boolean {
    if (this.settingsHistory.length === 0) {
      return false;
    }

    const previousSettings = this.settingsHistory.pop()!;
    this.controlSettings = previousSettings;
    this.saveControlSettings();
    EventManager.getInstance().emit('settings:updated', { 
      settings: { ...this.controlSettings } 
    });
    return true;
  }

  public resetToDefault(): void {
    const previousSettings = { ...this.controlSettings };
    this.settingsHistory.push(previousSettings);
    if (this.settingsHistory.length > this.maxHistorySize) {
      this.settingsHistory.shift();
    }

    this.controlSettings = getInitialControlSettings();
    this.saveControlSettings();
    EventManager.getInstance().emit('settings:updated', { 
      settings: { ...this.controlSettings } 
    });
  }

  private saveControlSettings(): void {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.controlSettings));
    } catch (error) {
      console.error('Failed to save control settings:', error);
    }
  }

  public getTutorialState(): TutorialState {
    return {
      ...this.tutorialState,
      steps: JSON.parse(JSON.stringify(this.tutorialState.steps)),
      guideProgress: JSON.parse(JSON.stringify(this.tutorialState.guideProgress)),
      validationAttempts: { ...this.tutorialState.validationAttempts }
    };
  }

  public updateTutorialState(state: Partial<TutorialState>): void {
    if (state.steps) {
      this.tutorialState.steps = JSON.parse(JSON.stringify(state.steps));
    }
    if (state.currentStep !== undefined) {
      this.tutorialState.currentStep = state.currentStep;
    }
    if (state.completed !== undefined) {
      this.tutorialState.completed = state.completed;
    }
    if (state.dismissed !== undefined) {
      this.tutorialState.dismissed = state.dismissed;
    }
    if (state.activeGuideId !== undefined) {
      this.tutorialState.activeGuideId = state.activeGuideId;
    }
    if (state.guideProgress) {
      this.tutorialState.guideProgress = JSON.parse(JSON.stringify(state.guideProgress));
    }
    if (state.validationAttempts) {
      this.tutorialState.validationAttempts = { ...state.validationAttempts };
    }
    this.saveTutorialState();
  }

  public completeTutorialStep(stepId: string): void {
    const stepIndex = this.tutorialState.steps.findIndex(s => s.id === stepId);
    if (stepIndex !== -1 && !this.tutorialState.steps[stepIndex].completed) {
      this.tutorialState.steps[stepIndex].completed = true;
      
      if (stepIndex < this.tutorialState.steps.length - 1) {
        this.tutorialState.currentStep = stepIndex + 1;
        EventManager.getInstance().emit('tutorial:next', { 
          step: { ...this.tutorialState.steps[stepIndex + 1] } 
        });
      } else {
        this.tutorialState.completed = true;
        EventManager.getInstance().emit('tutorial:complete', {});
      }
      
      this.saveTutorialState();
    }
  }

  public setCurrentTutorialStep(stepIndex: number): void {
    if (stepIndex >= 0 && stepIndex < this.tutorialState.steps.length) {
      this.tutorialState.currentStep = stepIndex;
      this.saveTutorialState();
      EventManager.getInstance().emit('tutorial:next', { 
        step: { ...this.tutorialState.steps[stepIndex] } 
      });
    }
  }

  public dismissTutorial(): void {
    this.tutorialState.dismissed = true;
    this.tutorialState.completed = true;
    this.saveTutorialState();
  }

  public resetTutorial(): void {
    this.tutorialState = getInitialTutorialState();
    this.saveTutorialState();
    EventManager.getInstance().emit('tutorial:next', {
      step: { ...this.tutorialState.steps[0] }
    });
  }

  public getGuideProgress(guideId: string): TutorialGuideProgress | undefined {
    return this.tutorialState.guideProgress.find(p => p.guideId === guideId);
  }

  public isGuideCompleted(guideId: string): boolean {
    const progress = this.tutorialState.guideProgress.find(p => p.guideId === guideId);
    return progress ? progress.completedAt !== undefined : false;
  }

  public isStepCompleted(stepId: string): boolean {
    return this.tutorialState.steps.some(s => s.id === stepId && s.completed);
  }

  public isStepSkipped(stepId: string): boolean {
    return this.tutorialState.guideProgress.some(p => p.skippedSteps.includes(stepId));
  }

  public getValidationAttempts(stepId: string): number {
    return this.tutorialState.validationAttempts[stepId] || 0;
  }

  public incrementValidationAttempts(stepId: string): number {
    const current = this.tutorialState.validationAttempts[stepId] || 0;
    const next = current + 1;
    this.tutorialState.validationAttempts[stepId] = next;
    this.saveTutorialState();
    return next;
  }

  public clearValidationAttempts(stepId?: string): void {
    if (stepId) {
      delete this.tutorialState.validationAttempts[stepId];
    } else {
      this.tutorialState.validationAttempts = {};
    }
    this.saveTutorialState();
  }

  private saveTutorialState(): void {
    try {
      localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(this.tutorialState));
    } catch (error) {
      console.error('Failed to save tutorial state:', error);
    }
  }

  public resetAllSettings(): void {
    this.controlSettings = getInitialControlSettings();
    this.tutorialState = getInitialTutorialState();
    this.saveControlSettings();
    this.saveTutorialState();
  }
}
