import { GameState, SaveData, PetalType } from '../types';
import { STORAGE_KEY as SAVE_KEY, getInitialGameState, getInitialSettings } from '../config/GameConfig';
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

  public loadSave(): SaveData | null {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      if (data) {
        this.currentSave = JSON.parse(data);
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
      version: '1.0.0',
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
      version: '1.0.0',
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
      version: '1.0.0',
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
    }

    if (type === PetalType.WAKEUP) {
      state.hasWakeUp = true;
      state.isCompleted = true;
    }

    this.saveGame(state);
    return state;
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
}
