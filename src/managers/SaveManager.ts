import { 
  GameState, 
  SaveData, 
  PetalType, 
  Goal, 
  GoalType, 
  GoalStatus, 
  ResourceTrendPoint, 
  SynthesisRecord,
  StatusMessage,
  StatusType,
  SynthesisResultData,
  SynthesisResultType
} from '../types';
import { 
  STORAGE_KEY as SAVE_KEY, 
  getInitialGameState, 
  getInitialSettings,
  SAVE_VERSION,
  INITIAL_GAME_STATE,
  RECIPE_UNLOCK_CONDITIONS,
  SYNTHESIS_RECIPES,
  INITIAL_GOALS,
  MAX_RESOURCE_TREND_POINTS,
  MAX_SYNTHESIS_RECORDS,
  MAX_STATUS_MESSAGES,
  PETAL_CONFIGS
} from '../config/GameConfig';
import { EventManager } from './EventManager';

export class SaveManager {
  private static instance: SaveManager;
  private currentSave: SaveData | null = null;

  private constructor() {}

  public static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager();
    }
    return SaveManager.instance;
  }

  public hasSave(): boolean {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      return data !== null;
    } catch {
      return false;
    }
  }

  private migrateSaveData(saveData: any): SaveData {
    const initialState = getInitialGameState();
    
    if (!saveData.version || saveData.version === '1.0.0' || saveData.version === '2.0.0') {
      const oldState = saveData.gameState || {};
      
      const migratedPetals: Record<PetalType, number> = { ...initialState.petals };
      if (oldState.petals) {
        Object.keys(oldState.petals).forEach((key) => {
          if (key in migratedPetals) {
            migratedPetals[key as PetalType] = oldState.petals[key];
          }
        });
      }

      const migratedUnlocked: PetalType[] = [...initialState.unlockedPetals];
      if (oldState.unlockedPetals) {
        oldState.unlockedPetals.forEach((type: PetalType) => {
          if (!migratedUnlocked.includes(type)) {
            migratedUnlocked.push(type);
          }
        });
      }

      const unlockedRecipes = this.computeUnlockedRecipes(migratedPetals);

      const migratedGoals = this.migrateGoals(oldState.goals, migratedPetals);

      saveData.gameState = {
        ...initialState,
        ...oldState,
        petals: migratedPetals,
        unlockedPetals: migratedUnlocked,
        totalMutations: oldState.totalMutations || 0,
        totalFailures: oldState.totalFailures || 0,
        unlockedRecipes: oldState.unlockedRecipes || unlockedRecipes,
        discoveredMutations: oldState.discoveredMutations || [],
        discoveredFailures: oldState.discoveredFailures || [],
        resourceTrend: oldState.resourceTrend || [],
        synthesisRecords: oldState.synthesisRecords || [],
        goals: migratedGoals,
        activeStatusMessages: oldState.activeStatusMessages || [],
        lastSaveTime: oldState.lastSaveTime || 0
      };
      saveData.version = SAVE_VERSION;
    }

    if (saveData.version !== SAVE_VERSION) {
      saveData.version = SAVE_VERSION;
    }

    return saveData as SaveData;
  }

  private migrateGoals(oldGoals: Goal[] | undefined, petals: Record<PetalType, number>): Goal[] {
    if (oldGoals && oldGoals.length > 0) {
      const existingIds = new Set(oldGoals.map(g => g.id));
      const mergedGoals = [...oldGoals];
      INITIAL_GOALS.forEach(g => {
        if (!existingIds.has(g.id)) {
          mergedGoals.push(JSON.parse(JSON.stringify(g)));
        }
      });
      return this.refreshGoalsProgress(mergedGoals, petals);
    }
    return JSON.parse(JSON.stringify(INITIAL_GOALS));
  }

  private computeUnlockedRecipes(petals: Record<PetalType, number>): string[] {
    const unlocked: string[] = ['recipe_1', 'recipe_7'];
    
    Object.entries(RECIPE_UNLOCK_CONDITIONS).forEach(([recipeId, condition]) => {
      const meetsCondition = condition.petals.every(
        p => (petals[p.type] || 0) >= p.count
      );
      if (meetsCondition && !unlocked.includes(recipeId)) {
        unlocked.push(recipeId);
      }
    });

    return unlocked;
  }

  public loadSave(): SaveData | null {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        const migrated = this.migrateSaveData(parsed);
        this.currentSave = migrated;
        this.saveGame(migrated.gameState);
        return this.currentSave;
      }
    } catch (error) {
      console.error('Failed to load save:', error);
    }
    return null;
  }

  public getGameState(): GameState {
    if (this.currentSave) {
      return this.currentSave.gameState;
    }
    const save = this.loadSave();
    if (save) {
      return save.gameState;
    }
    return getInitialGameState();
  }

  public getSettings() {
    if (this.currentSave) {
      return this.currentSave.settings;
    }
    const save = this.loadSave();
    if (save) {
      return save.settings;
    }
    return getInitialSettings();
  }

  public saveGame(gameState: GameState): void {
    const settings = this.getSettings();
    const saveData: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      gameState: { ...gameState },
      settings: { ...settings }
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      this.currentSave = saveData;
      gameState.lastSaveTime = Date.now();
      EventManager.getInstance().emit('save:update', { state: gameState });
    } catch (error) {
      console.error('Failed to save game:', error);
    }
  }

  public updateSettings(settings: Partial<SaveData['settings']>): void {
    const currentSettings = this.getSettings();
    const gameState = this.getGameState();
    const newSettings = { ...currentSettings, ...settings };

    const saveData: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      gameState: { ...gameState },
      settings: newSettings
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      this.currentSave = saveData;
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  }

  public resetGame(): GameState {
    const settings = this.getSettings();
    const newGameState = getInitialGameState();

    const saveData: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      gameState: newGameState,
      settings: { ...settings }
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      this.currentSave = saveData;
    } catch (error) {
      console.error('Failed to reset game:', error);
    }

    return newGameState;
  }

  public addPetal(type: PetalType, count: number = 1): GameState {
    const state = this.getGameState();
    state.petals[type] = (state.petals[type] || 0) + count;
    state.totalCollected += count;

    let wasUnlocked = state.unlockedPetals.includes(type);
    if (!wasUnlocked) {
      state.unlockedPetals.push(type);
      const config = this.getPetalCategory(type);
      EventManager.getInstance().emit('collection:unlock', { type, category: config });
    }

    this.checkRecipeUnlocks(state);
    this.updateGoalsForPetalCollection(state, type, count);
    if (!wasUnlocked) {
      this.updateGoalsForPetalUnlock(state, type);
    }

    if (type === PetalType.WAKEUP) {
      state.hasWakeUp = true;
      state.isCompleted = true;
    }

    this.saveGame(state);
    return state;
  }

  private getPetalCategory(type: PetalType): 'normal' | 'mutation' | 'failed' {
    const mutationTypes = [
      PetalType.MOONLIGHT_SHIMMER,
      PetalType.STARLIGHT_BURST,
      PetalType.DEW_CRYSTAL,
      PetalType.GLOWING_EMBER,
      PetalType.DREAM_PHANTOM
    ];
    const failedTypes = [
      PetalType.FAILED_DUST,
      PetalType.FAILED_SLIME,
      PetalType.FAILED_ASH
    ];
    
    if (mutationTypes.includes(type)) return 'mutation';
    if (failedTypes.includes(type)) return 'failed';
    return 'normal';
  }

  public addMutationPetal(type: PetalType, count: number = 1): GameState {
    const state = this.getGameState();
    state.petals[type] = (state.petals[type] || 0) + count;
    state.totalCollected += count;
    state.totalMutations += 1;

    let wasUnlocked = state.unlockedPetals.includes(type);
    if (!wasUnlocked) {
      state.unlockedPetals.push(type);
      EventManager.getInstance().emit('collection:unlock', { type, category: 'mutation' });
    }
    if (!state.discoveredMutations.includes(type)) {
      state.discoveredMutations.push(type);
    }

    this.checkRecipeUnlocks(state);
    this.updateGoalsForPetalCollection(state, type, count);
    if (!wasUnlocked) {
      this.updateGoalsForPetalUnlock(state, type);
    }

    this.saveGame(state);
    return state;
  }

  public addFailedPetal(type: PetalType, count: number = 1): GameState {
    const state = this.getGameState();
    state.petals[type] = (state.petals[type] || 0) + count;
    state.totalFailures += 1;

    if (!state.unlockedPetals.includes(type)) {
      state.unlockedPetals.push(type);
      EventManager.getInstance().emit('collection:unlock', { type, category: 'failed' });
    }
    if (!state.discoveredFailures.includes(type)) {
      state.discoveredFailures.push(type);
    }

    this.saveGame(state);
    return state;
  }

  private checkRecipeUnlocks(state: GameState): void {
    Object.entries(RECIPE_UNLOCK_CONDITIONS).forEach(([recipeId, condition]) => {
      if (!state.unlockedRecipes.includes(recipeId)) {
        const meetsCondition = condition.petals.every(
          p => (state.petals[p.type] || 0) >= p.count
        );
        if (meetsCondition) {
          state.unlockedRecipes.push(recipeId);
          EventManager.getInstance().emit('synthesis:recipe_unlocked', { recipeId });
          this.updateGoalsForRecipeUnlock(state, recipeId);
        }
      }
    });
  }

  public removePetals(type: PetalType, count: number): GameState {
    const state = this.getGameState();
    if (state.petals[type] >= count) {
      state.petals[type] -= count;
      this.saveGame(state);
    }
    return state;
  }

  public updatePlayTime(delta: number): GameState {
    const state = this.getGameState();
    state.playTime += delta;
    this.saveGame(state);
    return state;
  }

  public incrementSynthesized(): GameState {
    const state = this.getGameState();
    state.totalSynthesized += 1;
    this.updateGoalsForSynthesis(state, 'any');
    this.saveGame(state);
    return state;
  }

  public updatePlayerPosition(x: number, y: number): void {
    const state = this.getGameState();
    state.playerX = x;
    state.playerY = y;
  }

  public isRecipeUnlocked(recipeId: string): boolean {
    const state = this.getGameState();
    return state.unlockedRecipes.includes(recipeId);
  }

  public getDiscoveredMutations(): PetalType[] {
    return this.getGameState().discoveredMutations;
  }

  public getDiscoveredFailures(): PetalType[] {
    return this.getGameState().discoveredFailures;
  }

  // === Resource Trend ===
  public addTrendPoint(): GameState {
    const state = this.getGameState();
    const point: ResourceTrendPoint = {
      timestamp: Date.now(),
      totalCollected: state.totalCollected,
      totalSynthesized: state.totalSynthesized,
      totalMutations: state.totalMutations,
      totalFailures: state.totalFailures,
      petalCounts: { ...state.petals }
    };
    
    state.resourceTrend.push(point);
    if (state.resourceTrend.length > MAX_RESOURCE_TREND_POINTS) {
      state.resourceTrend = state.resourceTrend.slice(-MAX_RESOURCE_TREND_POINTS);
    }

    EventManager.getInstance().emit('trend:updated', { point });
    this.saveGame(state);
    return state;
  }

  public getResourceTrend(): ResourceTrendPoint[] {
    return this.getGameState().resourceTrend;
  }

  // === Synthesis Records ===
  public addSynthesisRecord(
    recipeId: string,
    resultData: SynthesisResultData,
    returnedPetals?: { type: PetalType; count: number }[]
  ): GameState {
    const state = this.getGameState();
    const recipe = SYNTHESIS_RECIPES.find(r => r.id === recipeId);
    const outputConfig = PETAL_CONFIGS[resultData.output];

    const record: SynthesisRecord = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      recipeId,
      recipeName: recipe ? this.getRecipeName(recipe) : recipeId,
      resultType: resultData.resultType,
      inputs: recipe ? recipe.inputs.map(i => ({ ...i })) : [],
      output: { type: resultData.output, count: resultData.count },
      returnedPetals: returnedPetals || resultData.returnedPetals
    };

    state.synthesisRecords.unshift(record);
    if (state.synthesisRecords.length > MAX_SYNTHESIS_RECORDS) {
      state.synthesisRecords = state.synthesisRecords.slice(0, MAX_SYNTHESIS_RECORDS);
    }

    EventManager.getInstance().emit('synthesis:record_added', { record });
    this.saveGame(state);
    return state;
  }

  private getRecipeName(recipe: any): string {
    const inputNames = recipe.inputs
      .map((i: any) => `${PETAL_CONFIGS[i.type].name}×${i.count}`)
      .join(' + ');
    const outputName = PETAL_CONFIGS[recipe.output.type].name;
    return `${inputNames} → ${outputName}`;
  }

  public getSynthesisRecords(): SynthesisRecord[] {
    return this.getGameState().synthesisRecords;
  }

  // === Goal System ===
  public getGoals(): Goal[] {
    return this.getGameState().goals;
  }

  public getActiveGoals(): Goal[] {
    return this.getGameState().goals
      .filter(g => g.status === GoalStatus.PENDING || g.status === GoalStatus.IN_PROGRESS)
      .sort((a, b) => a.priority - b.priority);
  }

  public getCompletedGoals(): Goal[] {
    return this.getGameState().goals
      .filter(g => g.status === GoalStatus.COMPLETED || g.status === GoalStatus.CLAIMED)
      .sort((a, b) => a.priority - b.priority);
  }

  private refreshGoalsProgress(goals: Goal[], petals: Record<PetalType, number>): Goal[] {
    return goals.map(goal => {
      if (goal.status === GoalStatus.COMPLETED || goal.status === GoalStatus.CLAIMED) {
        return goal;
      }
      return this.calculateGoalProgress(goal, petals, 
        { totalCollected: 0, totalSynthesized: 0 },
        { unlockedPetals: [], unlockedRecipes: [] }
      );
    });
  }

  private calculateGoalProgress(
    goal: Goal,
    petals: Record<PetalType, number>,
    totals: { totalCollected: number; totalSynthesized: number },
    unlocks: { unlockedPetals: PetalType[]; unlockedRecipes: string[] }
  ): Goal {
    let currentCount = goal.currentCount;
    let newStatus = goal.status;

    switch (goal.type) {
      case GoalType.COLLECT_PETAL:
        currentCount = petals[goal.target as PetalType] || 0;
        break;
      case GoalType.TOTAL_COLLECTED:
        currentCount = totals.totalCollected;
        break;
      case GoalType.TOTAL_SYNTHESIZED:
        currentCount = totals.totalSynthesized;
        break;
      case GoalType.UNLOCK_PETAL:
        currentCount = unlocks.unlockedPetals.includes(goal.target as PetalType) ? 1 : 0;
        break;
      case GoalType.UNLOCK_RECIPE:
        currentCount = unlocks.unlockedRecipes.includes(goal.target as string) ? 1 : 0;
        break;
      case GoalType.SYNTHESIZE_RECIPE:
        break;
    }

    if (currentCount >= goal.targetCount) {
      newStatus = GoalStatus.COMPLETED;
    } else if (currentCount > 0 || newStatus === GoalStatus.IN_PROGRESS) {
      newStatus = GoalStatus.IN_PROGRESS;
    }

    return { ...goal, currentCount, status: newStatus };
  }

  private updateGoal(
    state: GameState,
    goalId: string,
    progressFn: (goal: Goal) => { current: number; completed: boolean }
  ): void {
    const goalIndex = state.goals.findIndex(g => g.id === goalId);
    if (goalIndex === -1) return;

    const goal = state.goals[goalIndex];
    if (goal.status === GoalStatus.COMPLETED || goal.status === GoalStatus.CLAIMED) return;

    const result = progressFn(goal);
    let newStatus: GoalStatus = goal.status;

    if (result.completed) {
      newStatus = GoalStatus.COMPLETED;
      EventManager.getInstance().emit('goal:completed', { goal: { ...goal, currentCount: result.current, status: newStatus } });
      this.showStatusMessage(
        state,
        StatusType.SUCCESS,
        '🎯 目标完成',
        goal.title,
        4000
      );
    } else if (result.current > 0) {
      newStatus = GoalStatus.IN_PROGRESS;
    }

    state.goals[goalIndex] = { ...goal, currentCount: result.current, status: newStatus };
    EventManager.getInstance().emit('goal:progress', { 
      goalId, 
      current: result.current, 
      target: goal.targetCount 
    });
  }

  private updateGoalsForPetalCollection(state: GameState, type: PetalType, count: number): void {
    state.goals.forEach(goal => {
      if (goal.status === GoalStatus.COMPLETED || goal.status === GoalStatus.CLAIMED) return;

      if (goal.type === GoalType.COLLECT_PETAL && goal.target === type) {
        this.updateGoal(state, goal.id, () => ({
          current: state.petals[type],
          completed: state.petals[type] >= goal.targetCount
        }));
      }
      if (goal.type === GoalType.TOTAL_COLLECTED) {
        this.updateGoal(state, goal.id, () => ({
          current: state.totalCollected,
          completed: state.totalCollected >= goal.targetCount
        }));
      }
    });
  }

  private updateGoalsForPetalUnlock(state: GameState, type: PetalType): void {
    state.goals.forEach(goal => {
      if (goal.status === GoalStatus.COMPLETED || goal.status === GoalStatus.CLAIMED) return;

      if (goal.type === GoalType.UNLOCK_PETAL && goal.target === type) {
        this.updateGoal(state, goal.id, () => ({
          current: 1,
          completed: true
        }));
      }
    });
  }

  private updateGoalsForRecipeUnlock(state: GameState, recipeId: string): void {
    state.goals.forEach(goal => {
      if (goal.status === GoalStatus.COMPLETED || goal.status === GoalStatus.CLAIMED) return;

      if (goal.type === GoalType.UNLOCK_RECIPE && goal.target === recipeId) {
        this.updateGoal(state, goal.id, () => ({
          current: 1,
          completed: true
        }));
      }
    });
  }

  private updateGoalsForSynthesis(state: GameState, recipeId: string): void {
    state.goals.forEach(goal => {
      if (goal.status === GoalStatus.COMPLETED || goal.status === GoalStatus.CLAIMED) return;

      if (goal.type === GoalType.SYNTHESIZE_RECIPE && 
          (goal.target === 'any' || goal.target === recipeId)) {
        const newCurrent = goal.currentCount + 1;
        this.updateGoal(state, goal.id, () => ({
          current: newCurrent,
          completed: newCurrent >= goal.targetCount
        }));
      }
      if (goal.type === GoalType.TOTAL_SYNTHESIZED) {
        this.updateGoal(state, goal.id, () => ({
          current: state.totalSynthesized,
          completed: state.totalSynthesized >= goal.targetCount
        }));
      }
    });
  }

  public claimGoal(goalId: string): GameState {
    const state = this.getGameState();
    const goalIndex = state.goals.findIndex(g => g.id === goalId);
    if (goalIndex === -1) return state;

    const goal = state.goals[goalIndex];
    if (goal.status !== GoalStatus.COMPLETED) return state;

    state.goals[goalIndex] = { ...goal, status: GoalStatus.CLAIMED };
    EventManager.getInstance().emit('goal:claimed', { goal: state.goals[goalIndex] });
    this.saveGame(state);
    return state;
  }

  // === Status Messages ===
  public showStatusMessage(
    state: GameState,
    type: StatusType,
    title: string,
    content?: string,
    duration: number = 3000,
    persistent: boolean = false
  ): StatusMessage {
    const message: StatusMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      title,
      content,
      timestamp: Date.now(),
      duration,
      persistent
    };

    state.activeStatusMessages.push(message);
    if (state.activeStatusMessages.length > MAX_STATUS_MESSAGES) {
      state.activeStatusMessages = state.activeStatusMessages.slice(-MAX_STATUS_MESSAGES);
    }

    EventManager.getInstance().emit('status:show', { message });
    return message;
  }

  public dismissStatusMessage(state: GameState, messageId: string): void {
    const idx = state.activeStatusMessages.findIndex(m => m.id === messageId);
    if (idx !== -1) {
      state.activeStatusMessages.splice(idx, 1);
      EventManager.getInstance().emit('status:dismiss', { id: messageId });
    }
  }

  public clearExpiredStatusMessages(): GameState {
    const state = this.getGameState();
    const now = Date.now();
    const before = state.activeStatusMessages.length;
    state.activeStatusMessages = state.activeStatusMessages.filter(
      m => m.persistent || (now - m.timestamp) < m.duration
    );
    if (state.activeStatusMessages.length !== before) {
      this.saveGame(state);
    }
    return state;
  }
}
