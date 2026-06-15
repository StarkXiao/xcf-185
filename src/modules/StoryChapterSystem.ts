import Phaser from 'phaser';
import {
  GameState,
  ChapterConfig,
  ChapterState,
  ChapterStatus,
  ChapterGoalType,
  ChapterGoal,
  ChapterDialogue,
  ChapterReward,
  ChapterSettlementData,
  ChapterReviewData,
  PetalType,
  StatusType
} from '../types';
import {
  STORY_CHAPTERS,
  getChapterConfig,
  getNextChapterId,
  getInitialStoryProgressState
} from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { EventManager } from '../managers/EventManager';

export class StoryChapterSystem {
  private scene: Phaser.Scene;
  private eventListeners: Array<{ event: string; callback: (data: any) => void }> = [];
  private isShowingDialogue: boolean = false;
  private currentDialogueIndex: number = 0;
  private currentDialogueType: 'start' | 'complete' = 'start';
  private dialogueContainer: Phaser.GameObjects.Container | null = null;
  private chapterTimeStart: Map<string, number> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public create(): void {
    this.initializeStoryProgress();
    this.setupEventListeners();
    this.initializeChapterTimeTracking();
    this.checkChapterStartDialogue();
  }

  private initializeStoryProgress(): void {
    const state = SaveManager.getInstance().getGameState();
    if (!state.storyProgress) {
      state.storyProgress = getInitialStoryProgressState();
      SaveManager.getInstance().saveGame(state);
    }
  }

  private initializeChapterTimeTracking(): void {
    const state = SaveManager.getInstance().getGameState();
    if (state.storyProgress.currentChapterId) {
      this.chapterTimeStart.set(state.storyProgress.currentChapterId, Date.now());
    }
  }

  private setupEventListeners(): void {
    const onPetalCollected = (data: any) => this.updateGoalsForPetalCollection(data.type, data.count);
    const onSynthesisComplete = (data: any) => this.updateGoalsForSynthesis(data.recipeId);
    const onMutation = (data: any) => this.updateGoalsForMutationDiscovery(data.output);
    const onRegionUnlocked = (data: any) => this.updateGoalsForRegionUnlock(data.regionId);
    const onPetalUnlocked = (data: any) => this.updateGoalsForPetalUnlock(data.type);

    EventManager.getInstance().on('petal:collected', onPetalCollected);
    EventManager.getInstance().on('synthesis:complete', onSynthesisComplete);
    EventManager.getInstance().on('synthesis:mutation', onMutation);
    EventManager.getInstance().on('region:unlocked', onRegionUnlocked);
    EventManager.getInstance().on('collection:unlock', onPetalUnlocked);

    this.eventListeners.push({ event: 'petal:collected', callback: onPetalCollected });
    this.eventListeners.push({ event: 'synthesis:complete', callback: onSynthesisComplete });
    this.eventListeners.push({ event: 'synthesis:mutation', callback: onMutation });
    this.eventListeners.push({ event: 'region:unlocked', callback: onRegionUnlocked });
    this.eventListeners.push({ event: 'collection:unlock', callback: onPetalUnlocked });
  }

  private checkChapterStartDialogue(): void {
    const state = SaveManager.getInstance().getGameState();
    const currentChapterId = state.storyProgress.currentChapterId;
    if (!currentChapterId) return;

    const chapterState = this.getChapterState(currentChapterId);
    const chapterConfig = getChapterConfig(currentChapterId);
    
    if (!chapterState || !chapterConfig) return;

    if (chapterState.dialoguesViewed.length === 0 && chapterConfig.startDialogue.length > 0) {
      this.showDialogue(currentChapterId, 'start');
    }
  }

  public getChapterState(chapterId: string): ChapterState | undefined {
    const state = SaveManager.getInstance().getGameState();
    return state.storyProgress.chapterStates.find(s => s.chapterId === chapterId);
  }

  public getCurrentChapterConfig(): ChapterConfig | undefined {
    const state = SaveManager.getInstance().getGameState();
    if (!state.storyProgress.currentChapterId) return undefined;
    return getChapterConfig(state.storyProgress.currentChapterId);
  }

  public getCurrentChapterState(): ChapterState | undefined {
    const state = SaveManager.getInstance().getGameState();
    if (!state.storyProgress.currentChapterId) return undefined;
    return this.getChapterState(state.storyProgress.currentChapterId);
  }

  public isChapterUnlocked(chapterId: string): boolean {
    const chapterState = this.getChapterState(chapterId);
    return chapterState?.status !== ChapterStatus.LOCKED;
  }

  public canStartChapter(chapterId: string): boolean {
    const chapterConfig = getChapterConfig(chapterId);
    if (!chapterConfig) return false;

    const state = SaveManager.getInstance().getGameState();
    
    if (!chapterConfig.unlockCondition) return true;

    switch (chapterConfig.unlockCondition.type) {
      case 'chapter_completed':
        if (!chapterConfig.unlockCondition.targetChapterId) return false;
        const targetState = this.getChapterState(chapterConfig.unlockCondition.targetChapterId);
        return targetState?.status === ChapterStatus.SETTLED || 
               targetState?.status === ChapterStatus.COMPLETED;
      case 'play_time':
        return state.playTime >= (chapterConfig.unlockCondition.targetCount || 0);
      case 'total_collected':
        return state.totalCollected >= (chapterConfig.unlockCondition.targetCount || 0);
      default:
        return true;
    }
  }

  public startChapter(chapterId: string): boolean {
    if (!this.canStartChapter(chapterId)) return false;

    const state = SaveManager.getInstance().getGameState();
    const chapterState = this.getChapterState(chapterId);
    const chapterConfig = getChapterConfig(chapterId);
    
    if (!chapterState || !chapterConfig) return false;

    this.updateChapterTimeTracking(state.storyProgress.currentChapterId);

    state.storyProgress.currentChapterId = chapterId;
    chapterState.status = ChapterStatus.IN_PROGRESS;
    chapterState.startedAt = Date.now();
    chapterState.currentGoalIndex = 0;

    this.chapterTimeStart.set(chapterId, Date.now());

    SaveManager.getInstance().saveGame(state);

    EventManager.getInstance().emit('story:chapter_start', {
      chapterId,
      chapterTitle: chapterConfig.title
    });

    if (chapterConfig.startDialogue.length > 0) {
      this.showDialogue(chapterId, 'start');
    }

    return true;
  }

  private updateGoalsForPetalCollection(type: PetalType, count: number): void {
    const state = SaveManager.getInstance().getGameState();
    const currentChapterId = state.storyProgress.currentChapterId;
    if (!currentChapterId) return;

    const chapterState = this.getChapterState(currentChapterId);
    if (!chapterState || chapterState.status !== ChapterStatus.IN_PROGRESS) return;

    chapterState.petalsCollectedInChapter[type] = (chapterState.petalsCollectedInChapter[type] || 0) + count;

    chapterState.goals.forEach((goal, index) => {
      if (goal.completed) return;

      let shouldUpdate = false;
      let currentCount = goal.currentCount;

      switch (goal.type) {
        case ChapterGoalType.COLLECT_PETAL:
          if (goal.target === type) {
            currentCount = Math.min(goal.currentCount + count, goal.targetCount);
            shouldUpdate = true;
          }
          break;
        case ChapterGoalType.TOTAL_COLLECTED:
          currentCount = Math.min(state.totalCollected, goal.targetCount);
          shouldUpdate = true;
          break;
      }

      if (shouldUpdate) {
        this.updateGoal(currentChapterId, index, currentCount);
      }
    });

    SaveManager.getInstance().saveGame(state);
  }

  private updateGoalsForSynthesis(recipeId: string): void {
    const state = SaveManager.getInstance().getGameState();
    const currentChapterId = state.storyProgress.currentChapterId;
    if (!currentChapterId) return;

    const chapterState = this.getChapterState(currentChapterId);
    if (!chapterState || chapterState.status !== ChapterStatus.IN_PROGRESS) return;

    chapterState.synthesesInChapter += 1;

    chapterState.goals.forEach((goal, index) => {
      if (goal.completed) return;

      let shouldUpdate = false;
      let currentCount = goal.currentCount;

      switch (goal.type) {
        case ChapterGoalType.SYNTHESIZE_RECIPE:
          if (goal.target === 'any' || goal.target === recipeId) {
            currentCount = Math.min(goal.currentCount + 1, goal.targetCount);
            shouldUpdate = true;
          }
          break;
        case ChapterGoalType.TOTAL_SYNTHESIZED:
          currentCount = Math.min(state.totalSynthesized, goal.targetCount);
          shouldUpdate = true;
          break;
      }

      if (shouldUpdate) {
        this.updateGoal(currentChapterId, index, currentCount);
      }
    });

    SaveManager.getInstance().saveGame(state);
  }

  private updateGoalsForMutationDiscovery(type: PetalType): void {
    const state = SaveManager.getInstance().getGameState();
    const currentChapterId = state.storyProgress.currentChapterId;
    if (!currentChapterId) return;

    const chapterState = this.getChapterState(currentChapterId);
    if (!chapterState || chapterState.status !== ChapterStatus.IN_PROGRESS) return;

    chapterState.goals.forEach((goal, index) => {
      if (goal.completed) return;

      if (goal.type === ChapterGoalType.DISCOVER_MUTATION) {
        const currentCount = Math.min(state.discoveredMutations.length, goal.targetCount);
        if (currentCount > goal.currentCount) {
          this.updateGoal(currentChapterId, index, currentCount);
        }
      }
    });

    SaveManager.getInstance().saveGame(state);
  }

  private updateGoalsForRegionUnlock(regionId: string): void {
    const state = SaveManager.getInstance().getGameState();
    const currentChapterId = state.storyProgress.currentChapterId;
    if (!currentChapterId) return;

    const chapterState = this.getChapterState(currentChapterId);
    if (!chapterState || chapterState.status !== ChapterStatus.IN_PROGRESS) return;

    chapterState.goals.forEach((goal, index) => {
      if (goal.completed) return;

      if (goal.type === ChapterGoalType.UNLOCK_REGION && goal.target === regionId) {
        this.updateGoal(currentChapterId, index, 1);
      }
    });

    SaveManager.getInstance().saveGame(state);
  }

  private updateGoalsForPetalUnlock(type: PetalType): void {
    const state = SaveManager.getInstance().getGameState();
    const currentChapterId = state.storyProgress.currentChapterId;
    if (!currentChapterId) return;

    const chapterState = this.getChapterState(currentChapterId);
    if (!chapterState || chapterState.status !== ChapterStatus.IN_PROGRESS) return;

    chapterState.goals.forEach((goal, index) => {
      if (goal.completed) return;

      if (goal.type === ChapterGoalType.UNLOCK_PETAL && goal.target === type) {
        this.updateGoal(currentChapterId, index, 1);
      }
    });

    SaveManager.getInstance().saveGame(state);
  }

  private updateGoal(chapterId: string, goalIndex: number, currentCount: number): void {
    const state = SaveManager.getInstance().getGameState();
    const chapterState = this.getChapterState(chapterId);
    if (!chapterState) return;

    const goal = chapterState.goals[goalIndex];
    if (!goal) return;

    const wasCompleted = goal.completed;
    goal.currentCount = currentCount;
    goal.completed = currentCount >= goal.targetCount;

    EventManager.getInstance().emit('story:goal_progress', {
      chapterId,
      goalId: goal.id,
      current: currentCount,
      target: goal.targetCount
    });

    if (goal.completed && !wasCompleted) {
      EventManager.getInstance().emit('story:goal_complete', { chapterId, goal });
      EventManager.getInstance().emit('status:show', {
        message: {
          id: `goal_complete_${goal.id}`,
          type: StatusType.SUCCESS,
          title: '🎯 章节目标完成',
          content: `${goal.title} - ${goal.description}`,
          timestamp: Date.now(),
          duration: 4000
        }
      });

      const nextIncompleteIndex = chapterState.goals.findIndex(g => !g.completed);
      if (nextIncompleteIndex !== -1) {
        chapterState.currentGoalIndex = nextIncompleteIndex;
      }

      this.checkChapterCompletion(chapterId);
    }
  }

  private checkChapterCompletion(chapterId: string): void {
    const chapterState = this.getChapterState(chapterId);
    const chapterConfig = getChapterConfig(chapterId);
    if (!chapterState || !chapterConfig) return;

    const allGoalsCompleted = chapterState.goals.every(g => g.completed);
    if (!allGoalsCompleted) return;

    chapterState.status = ChapterStatus.COMPLETED;
    chapterState.completedAt = Date.now();

    this.updateChapterTimeTracking(chapterId);

    this.unlockSpecialRecipes(chapterId);

    EventManager.getInstance().emit('story:chapter_complete', {
      chapterId,
      chapterTitle: chapterConfig.title
    });

    if (chapterConfig.completeDialogue.length > 0) {
      this.showDialogue(chapterId, 'complete');
    } else {
      this.showChapterSettlement(chapterId);
    }

    this.checkAllChaptersComplete();
  }

  private unlockSpecialRecipes(chapterId: string): void {
    const state = SaveManager.getInstance().getGameState();
    const chapterState = this.getChapterState(chapterId);
    if (!chapterState) return;

    chapterState.specialRecipes.forEach(recipe => {
      if (!recipe.isUnlocked) {
        recipe.isUnlocked = true;
        if (!state.unlockedRecipes.includes(recipe.recipeId)) {
          state.unlockedRecipes.push(recipe.recipeId);
          EventManager.getInstance().emit('story:special_recipe_unlocked', {
            chapterId,
            recipeId: recipe.recipeId
          });
          EventManager.getInstance().emit('synthesis:recipe_unlocked', {
            recipeId: recipe.recipeId
          });
        }
      }
    });

    SaveManager.getInstance().saveGame(state);
  }

  public showDialogue(chapterId: string, dialogueType: 'start' | 'complete'): void {
    const chapterConfig = getChapterConfig(chapterId);
    if (!chapterConfig) return;

    const dialogues = dialogueType === 'start' 
      ? chapterConfig.startDialogue 
      : chapterConfig.completeDialogue;

    if (dialogues.length === 0) return;

    this.isShowingDialogue = true;
    this.currentDialogueIndex = 0;
    this.currentDialogueType = dialogueType;

    this.createDialogueUI(chapterId, dialogues);
  }

  private createDialogueUI(chapterId: string, dialogues: ChapterDialogue[]): void {
    const { width, height } = this.scene.game.canvas;
    const centerX = width / 2;
    const centerY = height / 2;

    this.dialogueContainer = this.scene.add.container(0, 0);
    this.dialogueContainer.setDepth(100);
    this.dialogueContainer.setScrollFactor(0);

    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);
    this.dialogueContainer.add(overlay);

    const dialogueBox = this.scene.add.graphics();
    const boxWidth = width - 80;
    const boxHeight = 200;
    const boxX = 40;
    const boxY = height - 260;
    
    dialogueBox.fillStyle(0x0a0514, 0.95);
    dialogueBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    dialogueBox.lineStyle(3, 0xff6b9d, 0.6);
    dialogueBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    this.dialogueContainer.add(dialogueBox);

    const speakerName = this.scene.add.text(boxX + 30, boxY + 30, '', {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: '#ff6b9d',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.dialogueContainer.add(speakerName);

    const dialogueText = this.scene.add.text(boxX + 30, boxY + 70, '', {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      wordWrap: { width: boxWidth - 60 }
    }).setOrigin(0, 0);
    this.dialogueContainer.add(dialogueText);

    const hintText = this.scene.add.text(boxX + boxWidth - 30, boxY + boxHeight - 25, '点击继续 ▶', {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#888888'
    }).setOrigin(1, 0.5);
    this.dialogueContainer.add(hintText);

    this.scene.tweens.add({
      targets: hintText,
      alpha: { from: 0.5, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    const hitZone = this.scene.add.zone(centerX, centerY, width, height);
    hitZone.setInteractive({ useHandCursor: true });
    hitZone.on('pointerdown', () => this.advanceDialogue(chapterId, dialogues, speakerName, dialogueText));
    this.dialogueContainer.add(hitZone);

    this.showDialogueLine(dialogues[0], speakerName, dialogueText);
  }

  private showDialogueLine(
    dialogue: ChapterDialogue,
    speakerName: Phaser.GameObjects.Text,
    dialogueText: Phaser.GameObjects.Text
  ): void {
    const state = SaveManager.getInstance().getGameState();
    const currentChapterId = state.storyProgress.currentChapterId;
    const chapterState = currentChapterId ? this.getChapterState(currentChapterId) : null;

    if (chapterState && !chapterState.dialoguesViewed.includes(dialogue.id)) {
      chapterState.dialoguesViewed.push(dialogue.id);
    }

    speakerName.setText(dialogue.speaker);
    dialogueText.setText('');

    if (dialogue.speakerIcon) {
      speakerName.setText(`${dialogue.speakerIcon} ${dialogue.speaker}`);
    }

    EventManager.getInstance().emit('story:dialogue_start', {
      chapterId: state.storyProgress.currentChapterId || '',
      dialogue
    });

    let charIndex = 0;
    const fullText = dialogue.text;
    
    this.scene.time.addEvent({
      callback: () => {
        if (charIndex < fullText.length) {
          dialogueText.setText(fullText.substr(0, charIndex + 1));
          charIndex++;
        }
      },
      delay: 50,
      repeat: fullText.length - 1
    });
  }

  private advanceDialogue(
    chapterId: string,
    dialogues: ChapterDialogue[],
    speakerName: Phaser.GameObjects.Text,
    dialogueText: Phaser.GameObjects.Text
  ): void {
    if (dialogueText.text !== dialogues[this.currentDialogueIndex].text) {
      dialogueText.setText(dialogues[this.currentDialogueIndex].text);
      return;
    }

    this.currentDialogueIndex++;

    if (this.currentDialogueIndex < dialogues.length) {
      const nextDelay = dialogues[this.currentDialogueIndex - 1].delay || 1000;
      this.scene.time.delayedCall(nextDelay, () => {
        this.showDialogueLine(dialogues[this.currentDialogueIndex], speakerName, dialogueText);
      });
    } else {
      this.onDialogueEnd(chapterId);
    }
  }

  private onDialogueEnd(chapterId: string): void {
    this.isShowingDialogue = false;

    if (this.dialogueContainer) {
      this.dialogueContainer.destroy();
      this.dialogueContainer = null;
    }

    EventManager.getInstance().emit('story:dialogue_end', { chapterId });

    const chapterState = this.getChapterState(chapterId);
    if (chapterState?.status === ChapterStatus.COMPLETED) {
      this.showChapterSettlement(chapterId);
    }

    const state = SaveManager.getInstance().getGameState();
    SaveManager.getInstance().saveGame(state);
  }

  public showChapterSettlement(chapterId: string): void {
    const settlementData = this.calculateSettlementData(chapterId);
    
    EventManager.getInstance().emit('story:chapter_settled', {
      chapterId,
      settlementData
    });

    this.createSettlementUI(chapterId, settlementData);
  }

  private calculateSettlementData(chapterId: string): ChapterSettlementData {
    const state = SaveManager.getInstance().getGameState();
    const chapterState = this.getChapterState(chapterId);
    const chapterConfig = getChapterConfig(chapterId);

    if (!chapterState || !chapterConfig) {
      return {
        chapterId,
        chapterTitle: '',
        playTime: 0,
        goalsCompleted: 0,
        totalGoals: 0,
        petalsCollected: {} as Record<PetalType, number>,
        synthesesCompleted: 0,
        rewards: [],
        rating: 'C',
        score: 0
      };
    }

    const goalsCompleted = chapterState.goals.filter(g => g.completed).length;
    const totalGoals = chapterState.goals.length;
    const goalRatio = goalsCompleted / totalGoals;
    
    const playTime = chapterState.playTimeInChapter;
    const expectedPlayTime = 300;
    const timeBonus = Math.max(0, 1 - playTime / expectedPlayTime) * 0.2;

    let score = Math.floor(goalRatio * 80 + timeBonus * 100);
    score = Math.min(100, Math.max(0, score));

    let rating: 'S' | 'A' | 'B' | 'C';
    if (score >= 90) rating = 'S';
    else if (score >= 75) rating = 'A';
    else if (score >= 60) rating = 'B';
    else rating = 'C';

    return {
      chapterId,
      chapterTitle: chapterConfig.title,
      playTime,
      goalsCompleted,
      totalGoals,
      petalsCollected: { ...chapterState.petalsCollectedInChapter },
      synthesesCompleted: chapterState.synthesesInChapter,
      rewards: chapterConfig.rewards,
      rating,
      score
    };
  }

  private createSettlementUI(chapterId: string, data: ChapterSettlementData): void {
    const { width, height } = this.scene.game.canvas;
    const centerX = width / 2;
    const centerY = height / 2;

    const container = this.scene.add.container(0, 0);
    container.setDepth(150);
    container.setScrollFactor(0);

    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, width, height);
    container.add(overlay);

    const panel = this.scene.add.graphics();
    const panelWidth = width - 100;
    const panelHeight = 500;
    const panelX = 50;
    const panelY = centerY - panelHeight / 2;

    panel.fillStyle(0x0a0514, 0.95);
    panel.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 24);
    panel.lineStyle(4, 0xffd700, 0.6);
    panel.strokeRoundedRect(panelX, panelY, panelWidth, panelHeight, 24);
    container.add(panel);

    const ratingColors: Record<string, number> = { 'S': 0xffd700, 'A': 0xff6b9d, 'B': 0x88ccff, 'C': 0xa8e6cf };
    const ratingGlow = this.scene.add.graphics();
    ratingGlow.fillStyle(ratingColors[data.rating], 0.15);
    ratingGlow.fillCircle(centerX, panelY + 80, 60);
    container.add(ratingGlow);

    const ratingText = this.scene.add.text(centerX, panelY + 80, data.rating, {
      fontFamily: 'Arial',
      fontSize: '72px',
      color: `#${ratingColors[data.rating].toString(16).padStart(6, '0')}`,
      fontStyle: 'bold'
    }).setOrigin(0.5).setBlendMode(Phaser.BlendModes.ADD);
    container.add(ratingText);

    const titleText = this.scene.add.text(centerX, panelY + 150, `🎉 ${data.chapterTitle} 完成！`, {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(titleText);

    const scoreText = this.scene.add.text(centerX, panelY + 185, `得分: ${data.score}分`, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffd700'
    }).setOrigin(0.5);
    container.add(scoreText);

    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}分${secs}秒`;
    };

    const stats = [
      { label: '章节用时', value: formatTime(data.playTime), icon: '⏱️' },
      { label: '目标完成', value: `${data.goalsCompleted}/${data.totalGoals}`, icon: '🎯' },
      { label: '收集花瓣', value: `${Object.values(data.petalsCollected).reduce((a, b) => a + b, 0)}朵`, icon: '🌸' },
      { label: '合成次数', value: `${data.synthesesCompleted}次`, icon: '⚗️' }
    ];

    stats.forEach((stat, index) => {
      const rowY = panelY + 230 + index * 45;
      
      const icon = this.scene.add.text(panelX + 40, rowY, stat.icon, {
        fontFamily: 'Arial',
        fontSize: '20px'
      }).setOrigin(0, 0.5);
      
      const label = this.scene.add.text(panelX + 75, rowY, stat.label, {
        fontFamily: 'Arial, Microsoft YaHei, sans-serif',
        fontSize: '16px',
        color: '#888888'
      }).setOrigin(0, 0.5);
      
      const value = this.scene.add.text(panelX + panelWidth - 40, rowY, stat.value, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5);
      
      container.add([icon, label, value]);
    });

    const rewardsLabel = this.scene.add.text(centerX, panelY + 420, '🎁 奖励已发放', {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#a8e6cf'
    }).setOrigin(0.5);
    container.add(rewardsLabel);

    const rewardsText = this.scene.add.text(centerX, panelY + 445, 
      data.rewards.map(r => r.description).join('  '), {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#ffd700',
      align: 'center'
    }).setOrigin(0.5);
    container.add(rewardsText);

    const continueBtn = this.scene.add.graphics();
    const btnWidth = 200;
    const btnHeight = 50;
    const btnX = centerX - btnWidth / 2;
    const btnY = panelY + panelHeight + 20;

    continueBtn.fillStyle(0xff6b9d, 0.8);
    continueBtn.fillRoundedRect(btnX, btnY, btnWidth, btnHeight, 12);
    continueBtn.lineStyle(2, 0xffffff, 0.5);
    continueBtn.strokeRoundedRect(btnX, btnY, btnWidth, btnHeight, 12);
    container.add(continueBtn);

    const continueText = this.scene.add.text(centerX, btnY + btnHeight / 2, '继续', {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(continueText);

    const hitZone = this.scene.add.zone(centerX, btnY + btnHeight / 2, btnWidth, btnHeight);
    hitZone.setInteractive({ useHandCursor: true });
    hitZone.on('pointerdown', () => {
      this.applyChapterRewards(chapterId, data);
      container.destroy();
      
      const nextChapterId = getNextChapterId(chapterId);
      if (nextChapterId && this.canStartChapter(nextChapterId)) {
        this.startChapter(nextChapterId);
      } else {
        const state = SaveManager.getInstance().getGameState();
        if (state.storyProgress.allChaptersCompleted) {
          EventManager.getInstance().emit('game:complete', {
            playTime: state.playTime,
            totalCollected: state.totalCollected
          });
          this.scene.scene.start('Result');
        }
      }
    });
    container.add(hitZone);

    this.scene.tweens.add({
      targets: container,
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: 'Cubic.Out'
    });

    this.scene.cameras.main.flash(1000, 255, 255, 255);
  }

  private applyChapterRewards(chapterId: string, settlementData: ChapterSettlementData): void {
    const state = SaveManager.getInstance().getGameState();
    const chapterState = this.getChapterState(chapterId);
    const chapterConfig = getChapterConfig(chapterId);
    
    if (!chapterState || !chapterConfig) return;

    chapterState.status = ChapterStatus.SETTLED;
    chapterState.settledAt = Date.now();

    const bestRating = state.storyProgress.bestChapterRatings[chapterId];
    if (!bestRating || 
        ['S', 'A', 'B', 'C'].indexOf(settlementData.rating) < ['S', 'A', 'B', 'C'].indexOf(bestRating)) {
      state.storyProgress.bestChapterRatings[chapterId] = settlementData.rating;
    }

    state.storyProgress.totalStoryScore += settlementData.score;

    chapterConfig.rewards.forEach(reward => {
      this.applyReward(reward);
      EventManager.getInstance().emit('story:reward_claimed', { chapterId, reward });
    });

    SaveManager.getInstance().saveGame(state);
  }

  private applyReward(reward: ChapterReward): void {
    const state = SaveManager.getInstance().getGameState();

    switch (reward.type) {
      case 'petal':
        if (reward.petalType && reward.count) {
          state.petals[reward.petalType] = (state.petals[reward.petalType] || 0) + reward.count;
          state.totalCollected += reward.count;
          if (!state.unlockedPetals.includes(reward.petalType)) {
            state.unlockedPetals.push(reward.petalType);
          }
        }
        break;
      case 'recipe':
        if (reward.recipeId && !state.unlockedRecipes.includes(reward.recipeId)) {
          state.unlockedRecipes.push(reward.recipeId);
          EventManager.getInstance().emit('synthesis:recipe_unlocked', { recipeId: reward.recipeId });
        }
        break;
      case 'efficiency_boost':
        if (reward.boostAmount) {
          state.efficiencyBoost = (state.efficiencyBoost || 0) + reward.boostAmount;
        }
        break;
    }
  }

  private checkAllChaptersComplete(): void {
    const state = SaveManager.getInstance().getGameState();
    const allCompleted = STORY_CHAPTERS.every(chapter => {
      const chapterState = this.getChapterState(chapter.id);
      return chapterState && 
             (chapterState.status === ChapterStatus.COMPLETED || 
              chapterState.status === ChapterStatus.SETTLED);
    });

    if (allCompleted && !state.storyProgress.allChaptersCompleted) {
      state.storyProgress.allChaptersCompleted = true;
      EventManager.getInstance().emit('story:all_complete', {
        totalScore: state.storyProgress.totalStoryScore
      });
    }
  }

  private updateChapterTimeTracking(chapterId: string | null): void {
    if (!chapterId) return;

    const startTime = this.chapterTimeStart.get(chapterId);
    if (!startTime) return;

    const state = SaveManager.getInstance().getGameState();
    const chapterState = this.getChapterState(chapterId);
    if (chapterState) {
      const deltaSeconds = Math.floor((Date.now() - startTime) / 1000);
      chapterState.playTimeInChapter += deltaSeconds;
    }
    this.chapterTimeStart.delete(chapterId);
  }

  public getChapterReviewData(): ChapterReviewData[] {
    return STORY_CHAPTERS.map(config => {
      const state = SaveManager.getInstance().getGameState();
      const chapterState = this.getChapterState(config.id);
      const bestRating = state.storyProgress.bestChapterRatings[config.id] || null;
      
      return {
        chapterId: config.id,
        chapterTitle: config.title,
        status: chapterState?.status || ChapterStatus.LOCKED,
        rating: bestRating,
        playTime: chapterState?.playTimeInChapter || 0,
        goalsCompleted: chapterState?.goals.filter(g => g.completed).length || 0,
        totalGoals: chapterState?.goals.length || config.goals.length,
        completedAt: chapterState?.completedAt
      };
    });
  }

  public getCurrentChapterProgress(): { current: number; total: number; percentage: number } | null {
    const currentState = this.getCurrentChapterState();
    if (!currentState) return null;

    const completed = currentState.goals.filter(g => g.completed).length;
    const total = currentState.goals.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { current: completed, total, percentage };
  }

  public getAllChapters(): ChapterConfig[] {
    return [...STORY_CHAPTERS].sort((a, b) => a.order - b.order);
  }

  public update(time: number, delta: number): void {
    const state = SaveManager.getInstance().getGameState();
    if (state.storyProgress.currentChapterId && !this.chapterTimeStart.has(state.storyProgress.currentChapterId)) {
      this.chapterTimeStart.set(state.storyProgress.currentChapterId, Date.now());
    }
  }

  public destroy(): void {
    const state = SaveManager.getInstance().getGameState();
    this.updateChapterTimeTracking(state.storyProgress.currentChapterId);

    this.eventListeners.forEach(({ event, callback }) => {
      EventManager.getInstance().off(event as keyof import('../types').GameEvents, callback);
    });
    this.eventListeners = [];

    if (this.dialogueContainer) {
      this.dialogueContainer.destroy();
      this.dialogueContainer = null;
    }

    this.chapterTimeStart.clear();
  }
}
