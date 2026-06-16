import Phaser from 'phaser';
import {
  GameState,
  PetalType,
  EndingType,
  EndingRarity,
  EndingConfig,
  EndingCondition,
  EndingDialogueLine,
  EndingSettlementData,
  EndingEvaluationResult,
  EndingAwakeningState,
  EndingAnimationConfig,
  VisitorSpriteId,
  StatusType,
  TimeOfDay,
  WeatherType,
  ChapterStatus
} from '../types';
import {
  ENDING_CONFIGS,
  getEndingConfig,
  getInitialEndingAwakeningState,
  PETAL_CONFIGS,
  REGION_CONFIGS,
  STORY_CHAPTERS,
  SYNTHESIS_RECIPES
} from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { EventManager } from '../managers/EventManager';

export class EndingAwakeningSystem {
  private scene: Phaser.Scene;
  private eventListeners: Array<{ event: string; callback: (data: any) => void }> = [];
  private isShowingEnding: boolean = false;
  private currentDialogueIndex: number = 0;
  private endingDialogueContainer: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public create(): void {
    this.initializeEndingState();
    this.setupEventListeners();
  }

  private initializeEndingState(): void {
    const state = SaveManager.getInstance().getGameState();
    if (!state.endingAwakeningState) {
      state.endingAwakeningState = getInitialEndingAwakeningState();
      SaveManager.getInstance().saveGame(state);
    }
  }

  private setupEventListeners(): void {
    const onSynthesisComplete = (data: any) => this.trackSynthesisPath(data.recipeId);
    const onGameComplete = () => this.onWakeUpTriggered();
    const onChapterComplete = (data: any) => this.trackChapterCompletion(data.chapterId);
    const onPetalUnlocked = (data: any) => this.checkEndingProgress();
    const onRegionUnlocked = () => this.checkEndingProgress();
    const onMutation = () => this.checkEndingProgress();

    EventManager.getInstance().on('synthesis:complete', onSynthesisComplete);
    EventManager.getInstance().on('game:complete', onGameComplete);
    EventManager.getInstance().on('story:chapter_complete', onChapterComplete);
    EventManager.getInstance().on('collection:unlock', onPetalUnlocked);
    EventManager.getInstance().on('region:unlocked', onRegionUnlocked);
    EventManager.getInstance().on('synthesis:mutation', onMutation);

    this.eventListeners.push({ event: 'synthesis:complete', callback: onSynthesisComplete });
    this.eventListeners.push({ event: 'game:complete', callback: onGameComplete });
    this.eventListeners.push({ event: 'story:chapter_complete', callback: onChapterComplete });
    this.eventListeners.push({ event: 'collection:unlock', callback: onPetalUnlocked });
    this.eventListeners.push({ event: 'region:unlocked', callback: onRegionUnlocked });
    this.eventListeners.push({ event: 'synthesis:mutation', callback: onMutation });
  }

  private trackSynthesisPath(recipeId: string): void {
    const state = SaveManager.getInstance().getGameState();
    if (!state.endingAwakeningState) return;

    const tracking = state.endingAwakeningState.synthesisPathTracking;
    tracking.recipeUsageCount[recipeId] = (tracking.recipeUsageCount[recipeId] || 0) + 1;
    tracking.pathTimeline.push({ recipeId, timestamp: Date.now() });

    const maxPathLength = 50;
    if (tracking.pathTimeline.length > maxPathLength) {
      tracking.pathTimeline = tracking.pathTimeline.slice(-maxPathLength);
    }

    tracking.dominantPath = this.calculateDominantPath(tracking.recipeUsageCount);
    state.endingAwakeningState.endingScores['synthesis_path_dominant'] = tracking.dominantPath || 'recipe_1';

    SaveManager.getInstance().saveGame(state);
    this.checkEndingProgress();
  }

  private calculateDominantPath(usageCount: Record<string, number>): string | null {
    const pathGroups: Record<string, string[]> = {
      'recipe_1': ['recipe_1', 'recipe_7'],
      'recipe_2': ['recipe_2', 'recipe_8'],
      'recipe_3': ['recipe_3', 'recipe_9'],
      'recipe_4': ['recipe_4'],
      'recipe_5': ['recipe_5', 'recipe_10'],
      'recipe_6': ['recipe_6'],
      'recipe_11': ['recipe_11', 'recipe_12']
    };

    let maxPath = '';
    let maxCount = 0;

    Object.entries(pathGroups).forEach(([mainRecipe, relatedRecipes]) => {
      const count = relatedRecipes.reduce((sum, r) => sum + (usageCount[r] || 0), 0);
      if (count > maxCount) {
        maxCount = count;
        maxPath = mainRecipe;
      }
    });

    return maxCount > 0 ? maxPath : null;
  }

  private trackChapterCompletion(chapterId: string): void {
    const state = SaveManager.getInstance().getGameState();
    if (!state.endingAwakeningState) return;

    state.endingAwakeningState.chapterChoices[chapterId] = 'completed';
    SaveManager.getInstance().saveGame(state);
    this.checkEndingProgress();
  }

  private checkEndingProgress(): void {
    const state = SaveManager.getInstance().getGameState();
    if (!state.endingAwakeningState || state.endingAwakeningState.triggeredEndingId) return;

    ENDING_CONFIGS.forEach(config => {
      const allConditionsMet = config.conditions.every(c => this.checkEndingCondition(state, c));
      if (allConditionsMet && !state.endingAwakeningState!.unlockedEndings.includes(config.id)) {
        state.endingAwakeningState!.unlockedEndings.push(config.id);
        state.endingAwakeningState!.totalEndingsDiscovered = state.endingAwakeningState!.unlockedEndings.length;

        EventManager.getInstance().emit('ending:unlocked', {
          endingId: config.id,
          endingTitle: config.title
        });

        EventManager.getInstance().emit('status:show', {
          message: {
            id: `ending_unlock_${config.id}`,
            type: StatusType.SUCCESS,
            title: '🎭 新结局已解锁',
            content: `${config.icon} ${config.title} - ${config.unlockHint}`,
            timestamp: Date.now(),
            duration: 5000
          }
        });
      }
    });

    SaveManager.getInstance().saveGame(state);
  }

  public onWakeUpTriggered(): void {
    const state = SaveManager.getInstance().getGameState();
    if (state.endingAwakeningState?.triggeredEndingId) return;

    const evaluationResult = this.evaluateEnding();
    const endingConfig = getEndingConfig(evaluationResult.endingId);

    if (!endingConfig) return;

    state.endingAwakeningState!.triggeredEndingId = evaluationResult.endingId;
    state.endingAwakeningState!.triggeredAt = Date.now();

    if (!state.endingAwakeningState!.unlockedEndings.includes(evaluationResult.endingId)) {
      state.endingAwakeningState!.unlockedEndings.push(evaluationResult.endingId);
      state.endingAwakeningState!.totalEndingsDiscovered = state.endingAwakeningState!.unlockedEndings.length;
    }

    state.endingAwakeningState!.endingScores[evaluationResult.endingId] = evaluationResult.totalWeight;

    SaveManager.getInstance().saveGame(state);

    EventManager.getInstance().emit('ending:evaluated', {
      endingId: evaluationResult.endingId,
      endingTitle: endingConfig.title,
      scores: evaluationResult.evaluationScores
    });

    EventManager.getInstance().emit('ending:unlocked', {
      endingId: evaluationResult.endingId,
      endingTitle: endingConfig.title
    });
  }

  public evaluateEnding(): EndingEvaluationResult {
    const state = SaveManager.getInstance().getGameState();
    const evaluationScores: Record<EndingType, number> = {} as Record<EndingType, number>;

    ENDING_CONFIGS.forEach(config => {
      let totalWeight = 0;
      config.conditions.forEach(condition => {
        const met = this.checkEndingCondition(state, condition);
        if (met) {
          totalWeight += condition.weight;
        }
      });
      evaluationScores[config.id] = totalWeight;
    });

    const sortedEndings = ENDING_CONFIGS
      .map(config => ({
        id: config.id,
        score: evaluationScores[config.id],
        priority: config.priority
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.priority - b.priority;
      });

    const bestEndingId = sortedEndings[0].id;
    const bestConfig = getEndingConfig(bestEndingId)!;

    const matchedConditions = bestConfig.conditions.filter(c => this.checkEndingCondition(state, c));

    return {
      endingId: bestEndingId,
      endingTitle: bestConfig.title,
      matchedConditions,
      totalWeight: sortedEndings[0].score,
      evaluationScores
    };
  }

  private checkEndingCondition(state: GameState, condition: EndingCondition): boolean {
    const actualValue = this.getConditionActualValue(state, condition);
    const targetValue = condition.targetCount || 0;
    const comparator = condition.comparator || 'gte';

    switch (comparator) {
      case 'gte': return actualValue >= targetValue;
      case 'lte': return actualValue <= targetValue;
      case 'eq': return actualValue === targetValue;
      case 'gt': return actualValue > targetValue;
      case 'lt': return actualValue < targetValue;
      default: return actualValue >= targetValue;
    }
  }

  private getConditionActualValue(state: GameState, condition: EndingCondition): number {
    switch (condition.type) {
      case 'synthesis_path': {
        const dominantRecipe = state.endingAwakeningState?.synthesisPathTracking?.dominantPath;
        if (!dominantRecipe || !condition.target) return 0;
        const dominantTree = this.getRecipeTree(dominantRecipe);
        const targetTree = this.getRecipeTree(condition.target);
        return dominantTree === targetTree ? 100 : 0;
      }

      case 'chapter_completed': {
        const completedChapters = state.storyProgress.chapterStates.filter(
          s => s.status === ChapterStatus.COMPLETED || s.status === ChapterStatus.SETTLED
        ).length;
        return completedChapters;
      }

      case 'collection_completion': {
        const totalPetalTypes = Object.values(PetalType).filter(
          t => !t.startsWith('failed_')
        ).length;
        const unlockedNonFailed = state.unlockedPetals.filter(
          t => !t.startsWith('failed_')
        ).length;
        const completionPercent = totalPetalTypes > 0
          ? Math.round((unlockedNonFailed / totalPetalTypes) * 100)
          : 0;
        return completionPercent;
      }

      case 'mutation_discovered': {
        return state.discoveredMutations.length;
      }

      case 'visitor_affection': {
        const spriteId = condition.target as VisitorSpriteId;
        const spriteState = state.visitorSystem.sprites.find(s => s.spriteId === spriteId);
        if (!spriteState) return 0;
        return spriteState.level;
      }

      case 'synthesis_success_rate': {
        const totalAttempts = state.totalSynthesized + state.totalFailures;
        if (totalAttempts === 0) return 0;
        return Math.round((state.totalSynthesized / totalAttempts) * 100);
      }

      case 'failure_ratio': {
        const totalAttempts = state.totalSynthesized + state.totalFailures;
        if (totalAttempts === 0) return 0;
        return Math.round((state.totalFailures / totalAttempts) * 100);
      }

      case 'region_explored': {
        return state.regionUnlockStates.filter(s => s.isUnlocked).length;
      }

      default:
        return 0;
    }
  }

  private getRecipeTree(recipeId: string): string {
    if (['recipe_1', 'recipe_7'].includes(recipeId)) return 'recipe_1';
    if (['recipe_2', 'recipe_8'].includes(recipeId)) return 'recipe_2';
    if (['recipe_3', 'recipe_9'].includes(recipeId)) return 'recipe_3';
    if (['recipe_4'].includes(recipeId)) return 'recipe_4';
    if (['recipe_5', 'recipe_10'].includes(recipeId)) return 'recipe_5';
    if (['recipe_6'].includes(recipeId)) return 'recipe_6';
    if (['recipe_11', 'recipe_12'].includes(recipeId)) return 'recipe_11';
    return recipeId;
  }

  public generateSettlementData(): EndingSettlementData {
    const state = SaveManager.getInstance().getGameState();
    const evaluationResult = this.evaluateEnding();
    const endingConfig = getEndingConfig(evaluationResult.endingId);

    if (!endingConfig) {
      return this.createFallbackSettlement(state);
    }

    const baseScore = this.calculateBaseScore(state);
    const bonusScore = Math.floor(baseScore * (endingConfig.settlementBonus.scoreMultiplier - 1)) + endingConfig.settlementBonus.extraPoints;
    const finalScore = baseScore + bonusScore;

    const conditionAnalysis = this.analyzeConditions(state, endingConfig.conditions);
    const synthesisAnalysis = this.analyzeSynthesisPath(state);
    const chapterAnalysis = this.analyzeChapterProgress(state);
    const collectionAnalysis = this.analyzeCollectionProgress(state);
    const explorationAnalysis = this.analyzeExplorationProgress(state);
    const playStyleAnalysis = this.analyzePlayStyle(state);

    const settlementData: EndingSettlementData = {
      endingId: endingConfig.id,
      endingTitle: endingConfig.title,
      endingSubtitle: endingConfig.subtitle,
      endingDescription: endingConfig.description,
      endingRarity: endingConfig.rarity,
      endingIcon: endingConfig.icon,
      endingColor: endingConfig.color,
      animation: endingConfig.animation,
      dialogues: endingConfig.dialogues,
      evaluationResult,
      finalScore,
      baseScore,
      bonusScore,
      settlementBonus: endingConfig.settlementBonus,
      conditionScore: conditionAnalysis.metScore,
      maxConditionScore: conditionAnalysis.maxScore,
      metConditions: conditionAnalysis.met,
      partialConditions: conditionAnalysis.partial,
      missedConditions: conditionAnalysis.missed,
      synthesisPathAnalysis: synthesisAnalysis,
      chapterAnalysis,
      collectionAnalysis,
      explorationAnalysis,
      playStyleAnalysis,
      rewards: this.generateEndingRewards(endingConfig, finalScore),
      epilogueText: this.generateEpilogueText(endingConfig, state),
      timestamp: Date.now()
    };

    if (state.endingAwakeningState) {
      state.endingAwakeningState.endingSettlementHistory.push({
        endingId: endingConfig.id,
        timestamp: Date.now(),
        score: finalScore
      });

      if (!state.endingAwakeningState.viewedEndings.includes(endingConfig.id)) {
        state.endingAwakeningState.viewedEndings.push(endingConfig.id);
      }

      SaveManager.getInstance().saveGame(state);
    }

    return settlementData;
  }

  private analyzeConditions(state: GameState, conditions: EndingCondition[]) {
    const met: EndingSettlementData['metConditions'] = [];
    const partial: EndingSettlementData['partialConditions'] = [];
    const missed: EndingSettlementData['missedConditions'] = [];
    let metScore = 0;
    let maxScore = 0;

    conditions.forEach(condition => {
      const actualValue = this.getConditionActualValue(state, condition);
      const targetValue = condition.targetCount || 0;
      const progress = targetValue > 0 ? Math.min(100, Math.round((actualValue / targetValue) * 100)) : 0;
      maxScore += condition.weight;

      if (this.checkEndingCondition(state, condition)) {
        met.push({
          description: condition.description,
          actualValue,
          targetValue,
          weight: condition.weight
        });
        metScore += condition.weight;
      } else if (progress > 0) {
        partial.push({
          description: condition.description,
          actualValue,
          targetValue,
          progress,
          weight: condition.weight
        });
      } else {
        missed.push({
          description: condition.description,
          actualValue,
          targetValue,
          weight: condition.weight
        });
      }
    });

    return { met, partial, missed, metScore, maxScore };
  }

  private analyzeSynthesisPath(state: GameState): EndingSettlementData['synthesisPathAnalysis'] {
    const tracking = state.endingAwakeningState?.synthesisPathTracking;
    const recipeUsageCount = tracking?.recipeUsageCount || {};
    const recipesUsed = Object.keys(recipeUsageCount).filter(k => recipeUsageCount[k] > 0);

    let mostUsedRecipe: string | null = null;
    let maxCount = 0;
    Object.entries(recipeUsageCount).forEach(([recipeId, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostUsedRecipe = recipeId;
      }
    });

    const totalNormalSynthesis = state.synthesisRecords.filter(r => r.resultType === 'normal').length;
    const totalMutationSynthesis = state.synthesisRecords.filter(r => r.resultType === 'mutation').length;
    const totalFailures = state.synthesisRecords.filter(r => r.resultType === 'fail').length;
    const totalAttempts = totalNormalSynthesis + totalMutationSynthesis + totalFailures;

    return {
      recipesUsed,
      mostUsedRecipe,
      totalNormalSynthesis,
      totalMutationSynthesis,
      totalFailures,
      mutationRate: totalAttempts > 0 ? Math.round((totalMutationSynthesis / totalAttempts) * 100) : 0,
      successRate: totalAttempts > 0 ? Math.round(((totalNormalSynthesis + totalMutationSynthesis) / totalAttempts) * 100) : 0,
      preferredPath: tracking?.dominantPath || 'none'
    };
  }

  private analyzeChapterProgress(state: GameState): EndingSettlementData['chapterAnalysis'] {
    const completedChapters = state.storyProgress.chapterStates.filter(
      s => s.status === ChapterStatus.COMPLETED || s.status === ChapterStatus.SETTLED
    );
    const totalCount = STORY_CHAPTERS.length;
    const completedCount = completedChapters.length;

    const ratings: ('S' | 'A' | 'B' | 'C')[] = [];
    Object.values(state.storyProgress.bestChapterRatings).forEach(r => {
      if (r) ratings.push(r);
    });

    const ratingOrder: Record<string, number> = { 'S': 4, 'A': 3, 'B': 2, 'C': 1 };
    let averageRating: 'S' | 'A' | 'B' | 'C' | null = null;
    if (ratings.length > 0) {
      const avgScore = ratings.reduce((sum, r) => sum + ratingOrder[r], 0) / ratings.length;
      if (avgScore >= 3.5) averageRating = 'S';
      else if (avgScore >= 2.5) averageRating = 'A';
      else if (avgScore >= 1.5) averageRating = 'B';
      else averageRating = 'C';
    }

    const keyChoices = Object.entries(state.endingAwakeningState?.chapterChoices || {})
      .filter(([, choice]) => choice === 'completed')
      .map(([chapterId]) => {
        const chapter = STORY_CHAPTERS.find(c => c.id === chapterId);
        return chapter?.title || chapterId;
      });

    return {
      completedCount,
      totalCount,
      averageRating,
      totalStoryScore: state.storyProgress.totalStoryScore,
      keyChoices
    };
  }

  private analyzeCollectionProgress(state: GameState): EndingSettlementData['collectionAnalysis'] {
    const allPetalTypes = Object.values(PetalType);
    const totalPetalTypes = allPetalTypes.filter(t => !t.startsWith('failed_')).length;
    const unlockedPetalTypes = state.unlockedPetals.filter(t => !t.startsWith('failed_')).length;

    const normalTypes = allPetalTypes.filter(t => !t.startsWith('failed_') && PETAL_CONFIGS[t]?.category === 'normal');
    const mutationTypes = allPetalTypes.filter(t => PETAL_CONFIGS[t]?.category === 'mutation');

    const unlockedNormal = state.unlockedPetals.filter(t => normalTypes.includes(t)).length;
    const unlockedMutation = state.discoveredMutations.length;

    return {
      totalPetalTypes,
      unlockedPetalTypes,
      normalCompletion: normalTypes.length > 0 ? Math.round((unlockedNormal / normalTypes.length) * 100) : 0,
      mutationCompletion: mutationTypes.length > 0 ? Math.round((unlockedMutation / mutationTypes.length) * 100) : 0,
      overallCompletion: totalPetalTypes > 0 ? Math.round((unlockedPetalTypes / totalPetalTypes) * 100) : 0,
      rareDropsFound: state.environmentStats.totalRareDrops
    };
  }

  private analyzeExplorationProgress(state: GameState): EndingSettlementData['explorationAnalysis'] {
    const totalRegions = REGION_CONFIGS.length;
    const regionsUnlocked = state.regionUnlockStates.filter(s => s.isUnlocked).length;

    let mostVisitedRegion: string | null = null;
    let maxTime = 0;
    state.regionUnlockStates.forEach(regionState => {
      if (regionState.totalTimeSpent > maxTime) {
        maxTime = regionState.totalTimeSpent;
        mostVisitedRegion = regionState.regionId;
      }
    });

    if (mostVisitedRegion) {
      const regionConfig = REGION_CONFIGS.find(r => r.id === mostVisitedRegion);
      if (regionConfig) {
        mostVisitedRegion = regionConfig.name;
      }
    }

    return {
      regionsUnlocked,
      totalRegions,
      mostVisitedRegion,
      totalTimeSpent: state.playTime
    };
  }

  private analyzePlayStyle(state: GameState): EndingSettlementData['playStyleAnalysis'] {
    const playTime = state.playTime;
    const petalPerMinute = playTime > 0 ? Math.round((state.totalCollected / playTime) * 60 * 100) / 100 : 0;
    const synthesisPerMinute = playTime > 0 ? Math.round((state.totalSynthesized / playTime) * 60 * 100) / 100 : 0;

    const totalAttempts = state.totalSynthesized + state.totalFailures;
    const successRate = totalAttempts > 0 ? state.totalSynthesized / totalAttempts : 0;
    const mutationRate = totalAttempts > 0 ? state.totalMutations / totalAttempts : 0;

    let efficiencyRating: 'S' | 'A' | 'B' | 'C' | 'D';
    const efficiencyScore = petalPerMinute * 0.3 + synthesisPerMinute * 0.3 + successRate * 2 + mutationRate * 3;
    if (efficiencyScore >= 2.5) efficiencyRating = 'S';
    else if (efficiencyScore >= 1.8) efficiencyRating = 'A';
    else if (efficiencyScore >= 1.2) efficiencyRating = 'B';
    else if (efficiencyScore >= 0.6) efficiencyRating = 'C';
    else efficiencyRating = 'D';

    const weatherCounts: Record<string, number> = {};
    Object.entries(state.environmentStats.weatherExperience).forEach(([weather, count]) => {
      weatherCounts[weather] = count;
    });
    let preferredWeather: WeatherType | null = null;
    let maxWeatherCount = 0;
    Object.entries(weatherCounts).forEach(([weather, count]) => {
      if (count > maxWeatherCount) {
        maxWeatherCount = count;
        preferredWeather = weather as WeatherType;
      }
    });

    const timeCounts: Record<TimeOfDay, number> = {
      [TimeOfDay.DAWN]: Math.floor(state.playTime / 5),
      [TimeOfDay.DAY]: Math.floor(state.playTime / 4),
      [TimeOfDay.DUSK]: Math.floor(state.playTime / 6),
      [TimeOfDay.NIGHT]: Math.floor(state.playTime / 3),
      [TimeOfDay.MIDNIGHT]: Math.floor(state.playTime / 4)
    };
    let preferredTimeOfDay: TimeOfDay | null = null;
    let maxTimeCount = 0;
    Object.entries(timeCounts).forEach(([time, count]) => {
      if (count > maxTimeCount) {
        maxTimeCount = count;
        preferredTimeOfDay = time as TimeOfDay;
      }
    });

    return {
      playTime,
      petalPerMinute,
      synthesisPerMinute,
      efficiencyRating,
      preferredTimeOfDay,
      preferredWeather
    };
  }

  private calculateBaseScore(state: GameState): number {
    let score = 0;
    score += state.totalCollected * 2;
    score += state.totalSynthesized * 5;
    score += state.totalMutations * 10;
    score += state.discoveredMutations.length * 50;
    score += state.unlockedPetals.filter(t => !t.startsWith('failed_')).length * 20;

    const completedChapters = state.storyProgress.chapterStates.filter(
      s => s.status === ChapterStatus.COMPLETED || s.status === ChapterStatus.SETTLED
    ).length;
    score += completedChapters * 100;

    const exploredRegions = state.regionUnlockStates.filter(s => s.isUnlocked).length;
    score += exploredRegions * 30;

    const totalAttempts = state.totalSynthesized + state.totalFailures;
    if (totalAttempts > 0) {
      const successRate = state.totalSynthesized / totalAttempts;
      score += Math.floor(successRate * 200);
    }

    score += Math.floor(Math.max(0, 300 - state.playTime / 60) * 0.5);

    return score;
  }

  private createFallbackSettlement(state: GameState): EndingSettlementData {
    const fallbackConfig = ENDING_CONFIGS.find(c => c.id === EndingType.ETERNAL_SLUMBER)!;
    const baseScore = this.calculateBaseScore(state);
    return {
      endingId: EndingType.ETERNAL_SLUMBER,
      endingTitle: fallbackConfig.title,
      endingSubtitle: fallbackConfig.subtitle,
      endingDescription: fallbackConfig.description,
      endingRarity: EndingRarity.RARE,
      endingIcon: fallbackConfig.icon,
      endingColor: fallbackConfig.color,
      animation: fallbackConfig.animation,
      dialogues: fallbackConfig.dialogues,
      evaluationResult: {
        endingId: EndingType.ETERNAL_SLUMBER,
        endingTitle: fallbackConfig.title,
        matchedConditions: [],
        totalWeight: 0,
        evaluationScores: {
          [EndingType.DAWN_AWAKENING]: 0,
          [EndingType.MOONLIT_REUNION]: 0,
          [EndingType.ETERNAL_SLUMBER]: 0,
          [EndingType.DREAM_ECHO]: 0,
          [EndingType.FADING_LIGHT]: 0,
          [EndingType.TRUE_LOVE]: 0,
          [EndingType.MIRACLE_REUNION]: 0,
          [EndingType.FORBIDDEN_PATH]: 0
        }
      },
      finalScore: baseScore,
      baseScore,
      bonusScore: 0,
      settlementBonus: fallbackConfig.settlementBonus,
      conditionScore: 0,
      maxConditionScore: 100,
      metConditions: [],
      partialConditions: [],
      missedConditions: [],
      synthesisPathAnalysis: {
        recipesUsed: [],
        mostUsedRecipe: null,
        totalNormalSynthesis: 0,
        totalMutationSynthesis: 0,
        totalFailures: 0,
        mutationRate: 0,
        successRate: 0,
        preferredPath: 'none'
      },
      chapterAnalysis: {
        completedCount: 0,
        totalCount: STORY_CHAPTERS.length,
        averageRating: null,
        totalStoryScore: 0,
        keyChoices: []
      },
      collectionAnalysis: {
        totalPetalTypes: Object.values(PetalType).filter(t => !t.startsWith('failed_')).length,
        unlockedPetalTypes: 0,
        normalCompletion: 0,
        mutationCompletion: 0,
        overallCompletion: 0,
        rareDropsFound: 0
      },
      explorationAnalysis: {
        regionsUnlocked: 0,
        totalRegions: REGION_CONFIGS.length,
        mostVisitedRegion: null,
        totalTimeSpent: 0
      },
      playStyleAnalysis: {
        playTime: 0,
        petalPerMinute: 0,
        synthesisPerMinute: 0,
        efficiencyRating: 'D',
        preferredTimeOfDay: null,
        preferredWeather: null
      },
      rewards: [],
      epilogueText: '梦还在继续...',
      timestamp: Date.now()
    };
  }

  private generateEndingRewards(config: EndingConfig, finalScore: number): EndingSettlementData['rewards'] {
    const rewards: EndingSettlementData['rewards'] = [];

    rewards.push({
      type: 'inheritance_points',
      value: finalScore,
      description: `获得 ${finalScore} 继承点数，可用于下周目继承`
    });

    rewards.push({
      type: 'gallery_unlock',
      id: config.id,
      description: `解锁结局图鉴：${config.title}`
    });

    if (config.rarity === EndingRarity.LEGENDARY) {
      rewards.push({
        type: 'exclusive_title',
        id: `title_${config.id}`,
        description: `获得专属称号：${config.settlementBonus.title}`
      });
    }

    return rewards;
  }

  private generateEpilogueText(config: EndingConfig, state: GameState): string {
    const epilogues: Record<EndingType, string> = {
      [EndingType.DAWN_AWAKENING]: '当第一缕晨曦洒在你们紧握的手上，你知道所有的等待与付出都是值得的。梦境森林的每一片花瓣都在为你们祝福，这是最完美的结局。',
      [EndingType.MOONLIT_REUNION]: '银色的月光洒在恋人的脸上，她缓缓睁开双眼，映出你的倒影。月光见证了你们的重逢，这是属于月夜的奇迹。',
      [EndingType.ETERNAL_SLUMBER]: '你选择在花海中守候，四季轮转，花开花落。也许在某个轮回的尽头，你们终将再次相遇。等待，也是一种爱。',
      [EndingType.DREAM_ECHO]: '变异的力量打破了时空的边界，恋人的身影在梦与现实间徘徊。你知道，她的声音会永远回荡在你心中。',
      [EndingType.FADING_LIGHT]: '光芒渐渐黯淡，但你没有放弃。你知道，只要心中还有希望，梦境就不会真正终结。下一次，一定会成功。',
      [EndingType.TRUE_LOVE]: '穿越无数梦境，经历重重考验，你终于找到了唤醒她的方法。当四目相对的那一刻，整个世界都静止了。这就是真爱。',
      [EndingType.MIRACLE_REUNION]: '所有人都认为不可能，但你创造了奇迹。不仅唤醒了恋人，还治愈了梦境森林的创伤。你们的故事，将成为永恒的传说。',
      [EndingType.FORBIDDEN_PATH]: '你选择了一条不被理解的道路，使用了禁忌的力量。代价是巨大的，但你从未后悔。有些爱，值得付出一切。'
    };

    return epilogues[config.id] || config.description;
  }

  public showEndingSequence(settlementData: EndingSettlementData): void {
    if (this.isShowingEnding) return;
    this.isShowingEnding = true;

    EventManager.getInstance().emit('ending:animation_start', {
      endingId: settlementData.endingId,
      animation: settlementData.animation
    });

    this.playEndingAnimation(settlementData, () => {
      this.showEndingDialogues(settlementData, () => {
        this.showEndingTitle(settlementData, () => {
          this.isShowingEnding = false;
          EventManager.getInstance().emit('ending:animation_complete', {
            endingId: settlementData.endingId
          });
          EventManager.getInstance().emit('ending:triggered', {
            endingId: settlementData.endingId,
            settlementData
          });
        });
      });
    });
  }

  private playEndingAnimation(
    settlementData: EndingSettlementData,
    onComplete: () => void
  ): void {
    const { width, height } = this.scene.game.canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const anim = settlementData.animation;

    const overlay = this.scene.add.graphics().setDepth(90);
    overlay.fillStyle(anim.backgroundColor, 0);
    overlay.fillRect(0, 0, width, height);
    overlay.setScrollFactor(0);

    this.scene.tweens.add({
      targets: overlay,
      alpha: { from: 0, to: 1 },
      duration: 1500,
      ease: 'Cubic.In',
      onUpdate: (tween) => {
        const progress = tween.getValue();
        overlay.clear();
        overlay.fillStyle(anim.backgroundColor, progress);
        overlay.fillRect(0, 0, width, height);
      }
    });

    this.scene.time.delayedCall(800, () => {
      const particleEmitter = this.scene.add.particles(centerX, centerY, 'pixel_white', {
        lifespan: 2500,
        speed: anim.particleSpeed,
        angle: { min: 0, max: 360 },
        scale: { start: 4, end: 0 },
        alpha: { start: 1, end: 0 },
        quantity: anim.particleCount,
        frequency: 80,
        blendMode: 'ADD',
        tint: anim.particleColors
      });
      particleEmitter.setDepth(92).setScrollFactor(0);

      this.scene.time.delayedCall(3000, () => {
        particleEmitter.stop();
        this.scene.time.delayedCall(2500, () => particleEmitter.destroy());
      });
    });

    this.scene.time.delayedCall(1200, () => {
      this.playSpecialEffect(centerX, centerY, anim);
    });

    this.scene.time.delayedCall(1000, () => {
      const wakeupPetal = this.scene.add.image(centerX, centerY - 80, `petal_${PetalType.WAKEUP}`)
        .setDisplaySize(100 * anim.petalDisplayScale, 100 * anim.petalDisplayScale)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0)
        .setScale(0)
        .setDepth(95)
        .setScrollFactor(0);

      this.scene.tweens.add({
        targets: wakeupPetal,
        alpha: 1,
        scale: 1,
        duration: 2000,
        ease: 'Elastic.Out'
      });

      this.scene.tweens.add({
        targets: wakeupPetal,
        rotation: Math.PI * 2,
        duration: 4000,
        ease: 'Cubic.Out'
      });

      if (anim.cameraShake.duration > 0) {
        this.scene.time.delayedCall(1500, () => {
          this.scene.cameras.main.shake(anim.cameraShake.duration, anim.cameraShake.intensity);
        });
      }

      const fc = anim.flashColor;
      this.scene.cameras.main.flash(anim.flashDuration, fc.r, fc.g, fc.b);
    });

    this.scene.time.delayedCall(4000, () => {
      overlay.destroy();
      onComplete();
    });
  }

  private playSpecialEffect(x: number, y: number, anim: EndingAnimationConfig): void {
    const depth = 93;
    switch (anim.specialEffect) {
      case 'radiance': {
        for (let i = 0; i < 5; i++) {
          this.scene.time.delayedCall(i * 200, () => {
            const ring = this.scene.add.graphics().setDepth(depth).setScrollFactor(0);
            ring.lineStyle(4, anim.glowColor, 0.8 - i * 0.15);
            ring.strokeCircle(x, y, 50 + i * 60);
            this.scene.tweens.add({
              targets: ring,
              alpha: 0,
              scale: 2,
              duration: 2000,
              ease: 'Cubic.Out',
              onComplete: () => ring.destroy()
            });
          });
        }
        break;
      }
      case 'moonbeam': {
        const beam = this.scene.add.graphics().setDepth(depth).setScrollFactor(0);
        beam.fillStyle(0x88ccff, 0.3);
        beam.fillRect(x - 20, 0, 40, this.scene.game.canvas.height);
        this.scene.tweens.add({
          targets: beam,
          alpha: 0,
          duration: 3000,
          ease: 'Cubic.Out',
          onComplete: () => beam.destroy()
        });
        break;
      }
      case 'frost': {
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const crystalX = x + Math.cos(angle) * 120;
          const crystalY = y + Math.sin(angle) * 120;
          const crystal = this.scene.add.text(crystalX, crystalY, '❄️', {
            fontSize: '24px'
          }).setOrigin(0.5).setDepth(depth).setAlpha(0).setScrollFactor(0);
          this.scene.tweens.add({
            targets: crystal,
            alpha: { from: 0, to: 1 },
            scale: { from: 0, to: 1 },
            duration: 800,
            delay: i * 100,
            ease: 'Back.Out',
            onComplete: () => {
              this.scene.tweens.add({
                targets: crystal,
                alpha: 0,
                duration: 1500,
                delay: 500,
                onComplete: () => crystal.destroy()
              });
            }
          });
        }
        break;
      }
      case 'phantom': {
        for (let i = 0; i < 6; i++) {
          this.scene.time.delayedCall(i * 300, () => {
            const phantomX = x + (Math.random() - 0.5) * 200;
            const phantomY = y + (Math.random() - 0.5) * 200;
            const phantom = this.scene.add.circle(phantomX, phantomY, 30, anim.glowColor, 0.4)
              .setDepth(depth).setAlpha(0).setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD);
            this.scene.tweens.add({
              targets: phantom,
              alpha: { from: 0, to: 0.6 },
              scale: { from: 0.5, to: 2 },
              duration: 1500,
              ease: 'Cubic.Out',
              onComplete: () => {
                this.scene.tweens.add({
                  targets: phantom,
                  alpha: 0,
                  y: phantom.y - 100,
                  duration: 1000,
                  onComplete: () => phantom.destroy()
                });
              }
            });
          });
        }
        break;
      }
      case 'ember': {
        for (let i = 0; i < 15; i++) {
          this.scene.time.delayedCall(i * 150, () => {
            const emberX = x + (Math.random() - 0.5) * 300;
            const emberY = y + (Math.random() - 0.5) * 200;
            const ember = this.scene.add.circle(emberX, emberY, 4, 0xff6600, 0.8)
              .setDepth(depth).setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD);
            this.scene.tweens.add({
              targets: ember,
              y: emberY - 150,
              alpha: 0,
              duration: 2000,
              ease: 'Cubic.Out',
              onComplete: () => ember.destroy()
            });
          });
        }
        break;
      }
    }
  }

  private showEndingDialogues(
    settlementData: EndingSettlementData,
    onComplete: () => void
  ): void {
    const dialogues = settlementData.dialogues;
    if (dialogues.length === 0) {
      onComplete();
      return;
    }

    this.currentDialogueIndex = 0;
    this.createEndingDialogueUI(settlementData, dialogues, onComplete);
  }

  private createEndingDialogueUI(
    settlementData: EndingSettlementData,
    dialogues: EndingDialogueLine[],
    onComplete: () => void
  ): void {
    const { width, height } = this.scene.game.canvas;

    this.endingDialogueContainer = this.scene.add.container(0, 0);
    this.endingDialogueContainer.setDepth(150);
    this.endingDialogueContainer.setScrollFactor(0);

    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(0, 0, width, height);
    this.endingDialogueContainer.add(overlay);

    const boxWidth = width - 80;
    const boxHeight = 180;
    const boxX = 40;
    const boxY = height - 240;

    const dialogueBox = this.scene.add.graphics();
    dialogueBox.fillStyle(0x0a0514, 0.95);
    dialogueBox.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    dialogueBox.lineStyle(3, settlementData.endingColor, 0.6);
    dialogueBox.strokeRoundedRect(boxX, boxY, boxWidth, boxHeight, 20);
    this.endingDialogueContainer.add(dialogueBox);

    const speakerName = this.scene.add.text(boxX + 30, boxY + 30, '', {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '22px',
      color: `#${settlementData.endingColor.toString(16).padStart(6, '0')}`,
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.endingDialogueContainer.add(speakerName);

    const dialogueText = this.scene.add.text(boxX + 30, boxY + 65, '', {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      wordWrap: { width: boxWidth - 60 }
    }).setOrigin(0, 0);
    this.endingDialogueContainer.add(dialogueText);

    const hintText = this.scene.add.text(boxX + boxWidth - 30, boxY + boxHeight - 25, '点击继续 ▶', {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#888888'
    }).setOrigin(1, 0.5);
    this.endingDialogueContainer.add(hintText);

    this.scene.tweens.add({
      targets: hintText,
      alpha: { from: 0.5, to: 1 },
      duration: 800,
      yoyo: true,
      repeat: -1
    });

    const centerX = width / 2;
    const centerY = height / 2;
    const hitZone = this.scene.add.zone(centerX, centerY, width, height);
    hitZone.setInteractive({ useHandCursor: true });
    hitZone.on('pointerdown', () => {
      this.advanceEndingDialogue(settlementData, dialogues, speakerName, dialogueText, onComplete);
    });
    this.endingDialogueContainer.add(hitZone);

    this.showEndingDialogueLine(dialogues[0], speakerName, dialogueText, settlementData.endingId);
  }

  private showEndingDialogueLine(
    dialogue: EndingDialogueLine,
    speakerName: Phaser.GameObjects.Text,
    dialogueText: Phaser.GameObjects.Text,
    endingId: EndingType
  ): void {
    speakerName.setText(dialogue.speaker);
    dialogueText.setText('');

    EventManager.getInstance().emit('ending:dialogue_start', {
      endingId,
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

  private advanceEndingDialogue(
    settlementData: EndingSettlementData,
    dialogues: EndingDialogueLine[],
    speakerName: Phaser.GameObjects.Text,
    dialogueText: Phaser.GameObjects.Text,
    onComplete: () => void
  ): void {
    if (dialogueText.text !== dialogues[this.currentDialogueIndex].text) {
      dialogueText.setText(dialogues[this.currentDialogueIndex].text);
      return;
    }

    this.currentDialogueIndex++;

    if (this.currentDialogueIndex < dialogues.length) {
      const nextDelay = dialogues[this.currentDialogueIndex - 1].delay || 1000;
      this.scene.time.delayedCall(nextDelay, () => {
        this.showEndingDialogueLine(
          dialogues[this.currentDialogueIndex],
          speakerName,
          dialogueText,
          settlementData.endingId
        );
      });
    } else {
      this.onEndingDialogueEnd(settlementData.endingId, onComplete);
    }
  }

  private onEndingDialogueEnd(endingId: EndingType, onComplete: () => void): void {
    if (this.endingDialogueContainer) {
      this.endingDialogueContainer.destroy();
      this.endingDialogueContainer = null;
    }

    EventManager.getInstance().emit('ending:dialogue_end', { endingId });
    onComplete();
  }

  private showEndingTitle(
    settlementData: EndingSettlementData,
    onComplete: () => void
  ): void {
    const { width, height } = this.scene.game.canvas;
    const centerX = width / 2;
    const centerY = height / 2;

    const container = this.scene.add.container(0, 0);
    container.setDepth(150);
    container.setScrollFactor(0);

    const overlay = this.scene.add.graphics();
    overlay.fillStyle(settlementData.animation.backgroundColor, 0.9);
    overlay.fillRect(0, 0, width, height);
    container.add(overlay);

    const glowBg = this.scene.add.graphics();
    glowBg.fillStyle(settlementData.endingColor, 0.15);
    glowBg.fillCircle(centerX, centerY - 60, 120);
    container.add(glowBg);

    const iconText = this.scene.add.text(centerX, centerY - 120, settlementData.endingIcon, {
      fontFamily: 'Arial',
      fontSize: '64px'
    }).setOrigin(0.5).setAlpha(0);
    container.add(iconText);

    const titleText = this.scene.add.text(centerX, centerY - 40, settlementData.endingTitle, {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '42px',
      color: settlementData.animation.titleColor,
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);
    container.add(titleText);

    const titleGlow = this.scene.add.text(centerX, centerY - 40, settlementData.endingTitle, {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '42px',
      color: settlementData.animation.titleColor,
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    container.add(titleGlow);

    const subtitleText = this.scene.add.text(centerX, centerY + 10, settlementData.endingSubtitle, {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '20px',
      color: settlementData.animation.subtitleColor
    }).setOrigin(0.5).setAlpha(0);
    container.add(subtitleText);

    const descText = this.scene.add.text(centerX, centerY + 60, settlementData.endingDescription, {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '15px',
      color: '#cccccc',
      wordWrap: { width: width - 120 },
      align: 'center'
    }).setOrigin(0.5).setAlpha(0);
    container.add(descText);

    const rarityLabels: Record<EndingRarity, { text: string; color: string }> = {
      [EndingRarity.LEGENDARY]: { text: '✦ 传说结局 ✦', color: '#ffd700' },
      [EndingRarity.EPIC]: { text: '◆ 史诗结局 ◆', color: '#ff9ecb' },
      [EndingRarity.RARE]: { text: '◇ 稀有结局 ◇', color: '#88ccff' },
      [EndingRarity.UNCOMMON]: { text: '○ 罕见结局 ○', color: '#a8e6cf' },
      [EndingRarity.COMMON]: { text: '· 普通结局 ·', color: '#888888' }
    };

    const rarityInfo = rarityLabels[settlementData.endingRarity];
    const rarityText = this.scene.add.text(centerX, centerY + 140, rarityInfo.text, {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: rarityInfo.color,
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);
    container.add(rarityText);

    const scoreText = this.scene.add.text(centerX, centerY + 180,
      `最终得分: ${settlementData.finalScore}  (基础${settlementData.baseScore} + 加成${settlementData.bonusScore})`, {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#ffd700'
    }).setOrigin(0.5).setAlpha(0);
    container.add(scoreText);

    const bonusTitle = this.scene.add.text(centerX, centerY + 215,
      `称号: ${settlementData.settlementBonus.title}`, {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: settlementData.animation.titleColor,
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0);
    container.add(bonusTitle);

    const continueBtn = this.scene.add.graphics();
    const btnWidth = 200;
    const btnHeight = 50;
    const btnX = centerX - btnWidth / 2;
    const btnY = centerY + 260;

    continueBtn.fillStyle(settlementData.endingColor, 0.8);
    continueBtn.fillRoundedRect(btnX, btnY, btnWidth, btnHeight, 12);
    continueBtn.lineStyle(2, 0xffffff, 0.5);
    continueBtn.strokeRoundedRect(btnX, btnY, btnWidth, btnHeight, 12);
    container.add(continueBtn);

    const continueText = this.scene.add.text(centerX, btnY + btnHeight / 2, '查看结算', {
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add(continueText);

    const hitZone = this.scene.add.zone(centerX, btnY + btnHeight / 2, btnWidth, btnHeight);
    hitZone.setInteractive({ useHandCursor: true });
    hitZone.on('pointerdown', () => {
      this.scene.tweens.add({
        targets: container,
        alpha: 0,
        duration: 800,
        ease: 'Cubic.In',
        onComplete: () => {
          container.destroy();
          onComplete();
        }
      });
    });
    container.add(hitZone);

    this.scene.tweens.add({
      targets: iconText,
      alpha: 1,
      duration: 1000,
      delay: 200,
      ease: 'Cubic.Out'
    });

    this.scene.tweens.add({
      targets: [titleText, titleGlow],
      alpha: 1,
      duration: 1200,
      delay: 600,
      ease: 'Cubic.Out'
    });

    this.scene.tweens.add({
      targets: subtitleText,
      alpha: 1,
      duration: 1000,
      delay: 1200,
      ease: 'Cubic.Out'
    });

    this.scene.tweens.add({
      targets: descText,
      alpha: 1,
      duration: 1000,
      delay: 1800,
      ease: 'Cubic.Out'
    });

    this.scene.tweens.add({
      targets: rarityText,
      alpha: 1,
      duration: 800,
      delay: 2400,
      ease: 'Cubic.Out'
    });

    this.scene.tweens.add({
      targets: scoreText,
      alpha: 1,
      duration: 800,
      delay: 2800,
      ease: 'Cubic.Out'
    });

    this.scene.tweens.add({
      targets: bonusTitle,
      alpha: 1,
      duration: 800,
      delay: 3200,
      ease: 'Cubic.Out'
    });

    const fc = settlementData.animation.flashColor;
    this.scene.cameras.main.flash(settlementData.animation.flashDuration, fc.r, fc.g, fc.b);
  }

  public getUnlockedEndings(): EndingType[] {
    const state = SaveManager.getInstance().getGameState();
    return state.endingAwakeningState?.unlockedEndings || [];
  }

  public getViewedEndings(): EndingType[] {
    const state = SaveManager.getInstance().getGameState();
    return state.endingAwakeningState?.viewedEndings || [];
  }

  public getEndingEvaluationProgress(): Record<EndingType, { score: number; maxScore: number; conditions: { description: string; met: boolean; progress: number }[] }> {
    const state = SaveManager.getInstance().getGameState();
    const result: Record<EndingType, { score: number; maxScore: number; conditions: { description: string; met: boolean; progress: number }[] }> = {} as any;

    ENDING_CONFIGS.forEach(config => {
      const conditions = config.conditions.map(c => {
        const actualValue = this.getConditionActualValue(state, c);
        const targetValue = c.targetCount || 0;
        const progress = targetValue > 0 ? Math.min(100, Math.round((actualValue / targetValue) * 100)) : 0;
        return {
          description: c.description,
          met: this.checkEndingCondition(state, c),
          progress
        };
      });
      const score = config.conditions
        .filter(c => this.checkEndingCondition(state, c))
        .reduce((sum, c) => sum + c.weight, 0);
      const maxScore = config.conditions.reduce((sum, c) => sum + c.weight, 0);

      result[config.id] = { score, maxScore, conditions };
    });

    return result;
  }

  public getSynthesisPathTracking(): { recipeUsageCount: Record<string, number>; dominantPath: string | null } {
    const state = SaveManager.getInstance().getGameState();
    return state.endingAwakeningState?.synthesisPathTracking || {
      recipeUsageCount: {},
      dominantPath: null
    };
  }

  public update(time: number, delta: number): void {}

  public destroy(): void {
    this.eventListeners.forEach(({ event, callback }) => {
      EventManager.getInstance().off(event as keyof import('../types').GameEvents, callback);
    });
    this.eventListeners = [];

    if (this.endingDialogueContainer) {
      this.endingDialogueContainer.destroy();
      this.endingDialogueContainer = null;
    }

    this.isShowingEnding = false;
  }
}
