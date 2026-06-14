import { GameState, SaveData, PetalType } from '../types';
import { 
  STORAGE_KEY as SAVE_KEY, 
  getInitialGameState, 
  getInitialSettings,
  SAVE_VERSION,
  INITIAL_GAME_STATE,
  RECIPE_UNLOCK_CONDITIONS,
  SYNTHESIS_RECIPES
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
    
    if (!saveData.version || saveData.version === '1.0.0') {
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

      saveData.gameState = {
        ...initialState,
        ...oldState,
        petals: migratedPetals,
        unlockedPetals: migratedUnlocked,
        totalMutations: oldState.totalMutations || 0,
        totalFailures: oldState.totalFailures || 0,
        unlockedRecipes: oldState.unlockedRecipes || unlockedRecipes,
        discoveredMutations: oldState.discoveredMutations || [],
        discoveredFailures: oldState.discoveredFailures || []
      };
      saveData.version = SAVE_VERSION;
    }

    if (saveData.version !== SAVE_VERSION) {
      saveData.version = SAVE_VERSION;
    }

    return saveData as SaveData;
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

    if (!state.unlockedPetals.includes(type)) {
      state.unlockedPetals.push(type);
      const config = this.getPetalCategory(type);
      EventManager.getInstance().emit('collection:unlock', { type, category: config });
    }

    this.checkRecipeUnlocks(state);

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

    if (!state.unlockedPetals.includes(type)) {
      state.unlockedPetals.push(type);
      EventManager.getInstance().emit('collection:unlock', { type, category: 'mutation' });
    }
    if (!state.discoveredMutations.includes(type)) {
      state.discoveredMutations.push(type);
    }

    this.checkRecipeUnlocks(state);
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
}
