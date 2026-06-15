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
  SynthesisResultType,
  EfficiencyStats,
  KeyMilestone,
  RareDrop,
  InheritanceType,
  InheritanceOption,
  InheritanceData,
  ReviewData,
  SaveValidationResult,
  SaveBackupInfo,
  MigrationResult,
  SaveBackupData,
  CollectionTask,
  CollectionTaskStatus,
  CollectionTaskChain,
  CommissionConditionType,
  DailyReward,
  DailyRewardState,
  EnvironmentState,
  EnvironmentStats,
  RareDropEvent
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
  PETAL_CONFIGS,
  MILESTONE_CONFIG,
  RARITY_CONFIG,
  INHERITANCE_OPTIONS,
  EFFICIENCY_RATING,
  MAX_INHERITANCE_POINTS,
  PETAL_RESERVE_RATIO,
  EFFICIENCY_BOOST_RATIO,
  COLLECT_RANGE_GROWTH,
  BACKUP_STORAGE_KEY,
  AUTO_BACKUP_KEY,
  MAX_BACKUP_COUNT,
  MAX_AUTO_BACKUP_COUNT,
  AUTO_BACKUP_INTERVAL,
  INITIAL_COLLECTION_TASKS,
  INITIAL_COLLECTION_TASK_CHAINS,
  INITIAL_COMMISSION_TASKS,
  INITIAL_COMMISSION_TASK_CHAINS,
  INITIAL_RED_DOT_STATE,
  DAILY_REWARDS,
  INITIAL_DAILY_REWARD_STATE,
  INITIAL_ENVIRONMENT,
  INITIAL_ENVIRONMENT_STATS,
  RARE_DROP_EVENTS,
  INITIAL_VISITOR_SYSTEM_STATE,
  getInitialRegionUnlockStates,
  getDefaultCurrentRegionId
} from '../config/GameConfig';
import { EventManager } from './EventManager';

type MigrationFn = (saveData: any) => { data: any; warnings: string[] };

export class SaveManager {
  private static instance: SaveManager;
  private currentSave: SaveData | null = null;
  private migrationMap: Map<string, MigrationFn> = new Map();
  private lastAutoBackupTime: number = 0;

  private constructor() {
    this.initMigrationMap();
  }

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

  private initMigrationMap(): void {
    this.migrationMap.set('1.0.0', this.migrateFrom1_0_0.bind(this));
    this.migrationMap.set('2.0.0', this.migrateFrom2_0_0.bind(this));
    this.migrationMap.set('3.0.0', this.migrateFrom3_0_0.bind(this));
    this.migrationMap.set('4.0.0', this.migrateFrom4_0_0.bind(this));
    this.migrationMap.set('4.1.0', this.migrateFrom4_1_0.bind(this));
    this.migrationMap.set('5.0.0', this.migrateFrom5_0_0.bind(this));
    this.migrationMap.set('5.1.0', this.migrateFrom5_1_0.bind(this));
    this.migrationMap.set('5.2.0', this.migrateFrom5_2_0.bind(this));
  }

  private getVersionOrder(): string[] {
    return ['1.0.0', '2.0.0', '3.0.0', '4.0.0', '4.1.0', '5.0.0', '5.1.0', '5.2.0', '5.3.0'];
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }
    return 0;
  }

  private migrateSaveData(saveData: any): SaveData {
    const fromVersion = saveData.version || '1.0.0';
    const warnings: string[] = [];
    let currentData = JSON.parse(JSON.stringify(saveData));

    if (this.compareVersions(fromVersion, SAVE_VERSION) >= 0) {
      return saveData as SaveData;
    }

    const versionOrder = this.getVersionOrder();
    const startIndex = versionOrder.indexOf(fromVersion);
    const endIndex = versionOrder.indexOf(SAVE_VERSION);

    if (startIndex === -1) {
      currentData = this.fallbackMigration(currentData);
      warnings.push(`未知版本 ${fromVersion}，使用兜底迁移`);
    } else {
      for (let i = startIndex; i < endIndex && i < versionOrder.length - 1; i++) {
        const currentVersion = versionOrder[i];
        const migrationFn = this.migrationMap.get(currentVersion);
        if (migrationFn) {
          try {
            const result = migrationFn(currentData);
            currentData = result.data;
            warnings.push(...result.warnings);
          } catch (e) {
            warnings.push(`从 ${currentVersion} 迁移时出错: ${e}`);
            currentData = this.fallbackMigration(currentData);
            break;
          }
        }
      }
    }

    currentData.version = SAVE_VERSION;
    const finalData = this.fillDefaultFields(currentData);

    const result: MigrationResult = {
      success: true,
      fromVersion,
      toVersion: SAVE_VERSION,
      warnings
    };
    EventManager.getInstance().emit('save:migration_completed', { result });

    return finalData as SaveData;
  }

  private fallbackMigration(saveData: any): any {
    const initialState = getInitialGameState();
    const oldState = saveData.gameState || {};
    const migratedPetals: Record<string, number> = { ...initialState.petals };
    if (oldState.petals) {
      Object.keys(oldState.petals).forEach((key) => {
        if (key in migratedPetals) {
          migratedPetals[key] = oldState.petals[key];
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
    const unlockedRecipes = oldState.unlockedRecipes || this.computeUnlockedRecipes(migratedPetals as Record<PetalType, number>);
    const migratedGoals = this.migrateGoals(oldState.goals, migratedPetals as Record<PetalType, number>);
    const migratedCollectionTasks = oldState.collectionTasks || JSON.parse(JSON.stringify(initialState.collectionTasks));
    const migratedCollectionTaskChains = oldState.collectionTaskChains || JSON.parse(JSON.stringify(initialState.collectionTaskChains));
    const migratedCommissionTasks = oldState.commissionTasks || JSON.parse(JSON.stringify(initialState.commissionTasks));
    const migratedCommissionTaskChains = oldState.commissionTaskChains || JSON.parse(JSON.stringify(initialState.commissionTaskChains));
    const oldRedDot = oldState.redDotState || {};
    const defaultRedDot = JSON.parse(JSON.stringify(initialState.redDotState));
    const migratedRedDotState = {
      ...defaultRedDot,
      ...oldRedDot
    };
    if (!Array.isArray(migratedRedDotState.commissionNewUnlocks)) migratedRedDotState.commissionNewUnlocks = [];
    if (!Array.isArray(migratedRedDotState.claimableCommissions)) migratedRedDotState.claimableCommissions = [];
    if (!Array.isArray(migratedRedDotState.claimableCommissionChains)) migratedRedDotState.claimableCommissionChains = [];
    if (typeof migratedRedDotState.lastViewedCommission !== 'number') migratedRedDotState.lastViewedCommission = 0;
    return {
      ...saveData,
      gameState: {
        ...initialState,
        ...oldState,
        petals: migratedPetals,
        unlockedPetals: migratedUnlocked,
        totalMutations: oldState.totalMutations || 0,
        totalFailures: oldState.totalFailures || 0,
        unlockedRecipes,
        discoveredMutations: oldState.discoveredMutations || [],
        discoveredFailures: oldState.discoveredFailures || [],
        resourceTrend: oldState.resourceTrend || [],
        synthesisRecords: oldState.synthesisRecords || [],
        goals: migratedGoals,
        activeStatusMessages: oldState.activeStatusMessages || [],
        lastSaveTime: oldState.lastSaveTime || 0,
        collectionTasks: migratedCollectionTasks,
        collectionTaskChains: migratedCollectionTaskChains,
        commissionTasks: migratedCommissionTasks,
        commissionTaskChains: migratedCommissionTaskChains,
        redDotState: migratedRedDotState,
        regionHeats: oldState.regionHeats || initialState.regionHeats,
        consecutiveCollect: oldState.consecutiveCollect || null,
        dailyRewardState: oldState.dailyRewardState || initialState.dailyRewardState,
        environment: oldState.environment || JSON.parse(JSON.stringify(INITIAL_ENVIRONMENT)),
        environmentStats: oldState.environmentStats || JSON.parse(JSON.stringify(INITIAL_ENVIRONMENT_STATS)),
        rareDropEvents: oldState.rareDropEvents || RARE_DROP_EVENTS.map(event => ({
          ...event,
          lastTriggered: 0,
          count: 0
        })),
        regionUnlockStates: oldState.regionUnlockStates || getInitialRegionUnlockStates(),
        currentRegionId: oldState.currentRegionId || getDefaultCurrentRegionId(),
        lastRegionId: oldState.lastRegionId === undefined ? null : oldState.lastRegionId
      }
    };
  }

  private fillDefaultFields(saveData: any): any {
    const initialState = getInitialGameState();
    const initialSettings = getInitialSettings();
    const oldState = saveData.gameState || {};
    const oldSettings = saveData.settings || {};

    const mergedRedDot = {
      ...initialState.redDotState,
      ...(oldState.redDotState || {})
    };
    if (!Array.isArray(mergedRedDot.commissionNewUnlocks)) mergedRedDot.commissionNewUnlocks = [];
    if (!Array.isArray(mergedRedDot.claimableCommissions)) mergedRedDot.claimableCommissions = [];
    if (!Array.isArray(mergedRedDot.claimableCommissionChains)) mergedRedDot.claimableCommissionChains = [];
    if (typeof mergedRedDot.lastViewedCommission !== 'number') mergedRedDot.lastViewedCommission = 0;

    saveData.gameState = { ...initialState, ...oldState, redDotState: mergedRedDot };
    saveData.settings = { ...initialSettings, ...oldSettings };
    if (!saveData.timestamp) {
      saveData.timestamp = Date.now();
    }
    return saveData;
  }

  private migrateFrom1_0_0(saveData: any): { data: any; warnings: string[] } {
    const warnings: string[] = [];
    const result = this.fallbackMigration(saveData);
    warnings.push('从 1.0.0 版本迁移，已应用默认字段填充');
    return { data: result, warnings };
  }

  private migrateFrom2_0_0(saveData: any): { data: any; warnings: string[] } {
    const warnings: string[] = [];
    const result = this.fallbackMigration(saveData);
    warnings.push('从 2.0.0 版本迁移，已应用默认字段填充');
    return { data: result, warnings };
  }

  private migrateFrom3_0_0(saveData: any): { data: any; warnings: string[] } {
    const warnings: string[] = [];
    const result = this.fallbackMigration(saveData);
    warnings.push('从 3.0.0 版本迁移，已应用默认字段填充');
    return { data: result, warnings };
  }

  private migrateFrom4_0_0(saveData: any): { data: any; warnings: string[] } {
    const warnings: string[] = [];
    const initialState = getInitialGameState();
    if (saveData.gameState) {
      if (saveData.gameState.efficiencyBoost === undefined) {
        saveData.gameState.efficiencyBoost = initialState.efficiencyBoost || 0;
        warnings.push('新增字段 efficiencyBoost 已设为默认值');
      }
    }
    return { data: saveData, warnings };
  }

  private migrateFrom4_1_0(saveData: any): { data: any; warnings: string[] } {
    const warnings: string[] = [];
    const initialState = getInitialGameState();
    if (saveData.gameState) {
      if (!saveData.gameState.environment) {
        saveData.gameState.environment = JSON.parse(JSON.stringify(INITIAL_ENVIRONMENT));
        warnings.push('新增字段 environment 已设为默认值');
      }
      if (!saveData.gameState.environmentStats) {
        saveData.gameState.environmentStats = JSON.parse(JSON.stringify(INITIAL_ENVIRONMENT_STATS));
        warnings.push('新增字段 environmentStats 已设为默认值');
      }
      if (!saveData.gameState.rareDropEvents || saveData.gameState.rareDropEvents.length === 0) {
        saveData.gameState.rareDropEvents = RARE_DROP_EVENTS.map(event => ({
          ...event,
          lastTriggered: 0,
          count: 0
        }));
        warnings.push('新增字段 rareDropEvents 已设为默认值');
      }
    }
    return { data: saveData, warnings };
  }

  private migrateFrom5_0_0(saveData: any): { data: any; warnings: string[] } {
    const warnings: string[] = [];
    if (saveData.gameState) {
      if (!saveData.gameState.commissionTasks || !Array.isArray(saveData.gameState.commissionTasks)) {
        saveData.gameState.commissionTasks = JSON.parse(JSON.stringify(INITIAL_COMMISSION_TASKS));
        warnings.push('新增字段 commissionTasks 已设为默认值');
      }
      if (!saveData.gameState.commissionTaskChains || !Array.isArray(saveData.gameState.commissionTaskChains)) {
        saveData.gameState.commissionTaskChains = JSON.parse(JSON.stringify(INITIAL_COMMISSION_TASK_CHAINS));
        warnings.push('新增字段 commissionTaskChains 已设为默认值');
      }
      if (!saveData.gameState.redDotState) {
        saveData.gameState.redDotState = JSON.parse(JSON.stringify(INITIAL_RED_DOT_STATE));
        warnings.push('新增字段 redDotState 已设为默认值');
      } else {
        const defaultRedDot = JSON.parse(JSON.stringify(INITIAL_RED_DOT_STATE));
        if (!Array.isArray(saveData.gameState.redDotState.commissionNewUnlocks)) {
          saveData.gameState.redDotState.commissionNewUnlocks = defaultRedDot.commissionNewUnlocks;
          warnings.push('redDotState.commissionNewUnlocks 已补齐');
        }
        if (!Array.isArray(saveData.gameState.redDotState.claimableCommissions)) {
          saveData.gameState.redDotState.claimableCommissions = defaultRedDot.claimableCommissions;
          warnings.push('redDotState.claimableCommissions 已补齐');
        }
        if (!Array.isArray(saveData.gameState.redDotState.claimableCommissionChains)) {
          saveData.gameState.redDotState.claimableCommissionChains = defaultRedDot.claimableCommissionChains;
          warnings.push('redDotState.claimableCommissionChains 已补齐');
        }
        if (typeof saveData.gameState.redDotState.lastViewedCommission !== 'number') {
          saveData.gameState.redDotState.lastViewedCommission = 0;
          warnings.push('redDotState.lastViewedCommission 已补齐');
        }
      }
      saveData.gameState.collectionTasks?.forEach((task: any, idx: number) => {
        if (!task.conditions) {
          saveData.gameState.collectionTasks[idx] = {
            ...task,
            conditions: []
          };
        }
      });
      saveData.gameState.commissionTasks?.forEach((task: any, idx: number) => {
        if (!task.conditions) {
          saveData.gameState.commissionTasks[idx] = {
            ...task,
            conditions: []
          };
          warnings.push(`commissionTask[${task.id}] 缺少 conditions 字段，已补齐`);
        }
      });
    }
    return { data: saveData, warnings };
  }

  private migrateFrom5_1_0(saveData: any): { data: any; warnings: string[] } {
    const warnings: string[] = [];
    if (saveData.gameState) {
      if (!saveData.gameState.visitorSystem) {
        saveData.gameState.visitorSystem = JSON.parse(JSON.stringify(INITIAL_VISITOR_SYSTEM_STATE));
        warnings.push('新增字段 visitorSystem 已设为默认值');
      } else {
        const defaultVisitorSystem = JSON.parse(JSON.stringify(INITIAL_VISITOR_SYSTEM_STATE));
        if (!saveData.gameState.visitorSystem.sprites || !Array.isArray(saveData.gameState.visitorSystem.sprites)) {
          saveData.gameState.visitorSystem.sprites = defaultVisitorSystem.sprites;
          warnings.push('visitorSystem.sprites 已补齐');
        } else {
          const existingIds = new Set(saveData.gameState.visitorSystem.sprites.map((s: any) => s.spriteId));
          defaultVisitorSystem.sprites.forEach((defaultSprite: any) => {
            if (!existingIds.has(defaultSprite.spriteId)) {
              saveData.gameState.visitorSystem.sprites.push(defaultSprite);
              warnings.push(`visitorSystem.sprites 新增 ${defaultSprite.spriteId}`);
            }
          });
        }
        if (typeof saveData.gameState.visitorSystem.totalVisitorInteractions !== 'number') {
          saveData.gameState.visitorSystem.totalVisitorInteractions = 0;
        }
        if (typeof saveData.gameState.visitorSystem.nextVisitTime !== 'number') {
          saveData.gameState.visitorSystem.nextVisitTime = 0;
        }
      }
    }
    return { data: saveData, warnings };
  }

  private migrateFrom5_2_0(saveData: any): { data: any; warnings: string[] } {
    const warnings: string[] = [];
    if (saveData.gameState) {
      if (!saveData.gameState.regionUnlockStates || !Array.isArray(saveData.gameState.regionUnlockStates)) {
        saveData.gameState.regionUnlockStates = getInitialRegionUnlockStates();
        warnings.push('新增字段 regionUnlockStates 已设为默认值');
      } else {
        const defaultStates = getInitialRegionUnlockStates();
        const existingIds = new Set(saveData.gameState.regionUnlockStates.map((s: any) => s.regionId));
        defaultStates.forEach(defaultState => {
          if (!existingIds.has(defaultState.regionId)) {
            saveData.gameState.regionUnlockStates.push({ ...defaultState });
            warnings.push(`regionUnlockStates 新增 ${defaultState.regionId}`);
          }
        });
        saveData.gameState.regionUnlockStates.forEach((state: any, idx: number) => {
          if (typeof state.isUnlocked !== 'boolean') {
            saveData.gameState.regionUnlockStates[idx].isUnlocked = true;
          }
          if (typeof state.visitCount !== 'number') {
            saveData.gameState.regionUnlockStates[idx].visitCount = 0;
          }
          if (typeof state.totalTimeSpent !== 'number') {
            saveData.gameState.regionUnlockStates[idx].totalTimeSpent = 0;
          }
        });
      }
      if (!saveData.gameState.currentRegionId) {
        saveData.gameState.currentRegionId = getDefaultCurrentRegionId();
        warnings.push('新增字段 currentRegionId 已设为默认值');
      }
      if (saveData.gameState.lastRegionId === undefined) {
        saveData.gameState.lastRegionId = null;
        warnings.push('新增字段 lastRegionId 已设为默认值');
      }
    }
    return { data: saveData, warnings };
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
    const recovered = this.loadSaveWithRecovery();
    if (recovered) {
      this.saveGame(recovered.gameState);
      return recovered;
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

      this.checkAutoBackup();
    } catch (error) {
      console.error('Failed to save game:', error);
      EventManager.getInstance().emit('save:error', { message: '游戏存档失败' });
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
      EventManager.getInstance().emit('settings:updated', { settings: newSettings });
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
      this.addNewUnlockRedDot(state, type);
    }

    this.checkRecipeUnlocks(state);
    this.updateGoalsForPetalCollection(state, type, count);
    this.updateCollectionTasksForPetal(state, type, count);
    this.updateCommissionTasksForCollect(state, type, count);
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
    const wasDiscovered = state.discoveredMutations.includes(type);
    if (!wasUnlocked) {
      state.unlockedPetals.push(type);
      EventManager.getInstance().emit('collection:unlock', { type, category: 'mutation' });
      this.addNewUnlockRedDot(state, type);
    }
    if (!state.discoveredMutations.includes(type)) {
      state.discoveredMutations.push(type);
    }

    this.checkRecipeUnlocks(state);
    this.updateGoalsForPetalCollection(state, type, count);
    this.updateCollectionTasksForPetal(state, type, count);
    this.updateCommissionTasksForCollect(state, type, count);
    if (!wasDiscovered && state.discoveredMutations.includes(type)) {
      this.updateCommissionTasksForMutationDiscover(state);
    }
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

    let wasUnlocked = state.unlockedPetals.includes(type);
    if (!wasUnlocked) {
      state.unlockedPetals.push(type);
      EventManager.getInstance().emit('collection:unlock', { type, category: 'failed' });
      this.addNewUnlockRedDot(state, type);
    }
    if (!state.discoveredFailures.includes(type)) {
      state.discoveredFailures.push(type);
    }

    this.updateCollectionTasksForPetal(state, type, count);
    this.updateCommissionTasksForCollect(state, type, count);

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
    this.updateCommissionTasksForTotalSynthesize(state);
    this.saveGame(state);
    return state;
  }

  public updateCommissionForSynthesizeOutput(type: PetalType, count: number = 1): GameState {
    const state = this.getGameState();
    this.updateCommissionTasksForSynthesizeOutput(state, type, count);
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

  // === Collection Task Chain System ===

  private updateCollectionTasksForPetal(state: GameState, type: PetalType, count: number): void {
    state.collectionTasks.forEach((task, index) => {
      if (task.status === CollectionTaskStatus.LOCKED || 
          task.status === CollectionTaskStatus.COMPLETED ||
          task.status === CollectionTaskStatus.CLAIMED) {
        return;
      }

      if (task.targetPetalType === type) {
        const newCount = Math.min(task.currentCount + count, task.targetCount);
        const wasCompleted = task.currentCount >= task.targetCount;
        const isNowCompleted = newCount >= task.targetCount;

        state.collectionTasks[index] = {
          ...task,
          currentCount: newCount,
          status: isNowCompleted ? CollectionTaskStatus.COMPLETED : CollectionTaskStatus.IN_PROGRESS
        };

        EventManager.getInstance().emit('collectiontask:progress', {
          taskId: task.id,
          current: newCount,
          target: task.targetCount
        });

        if (isNowCompleted && !wasCompleted) {
          EventManager.getInstance().emit('collectiontask:completed', { 
            task: state.collectionTasks[index] 
          });
          this.addClaimableTaskRedDot(state, task.id);
          this.showStatusMessage(
            state,
            StatusType.SUCCESS,
            '🎯 收集任务完成',
            `${task.title} - ${task.description}`,
            4000
          );
          this.checkTaskUnlock(state, task.chainId, task.order);
        }
      }
    });

    this.checkChainCompletion(state);
  }

  private checkTaskUnlock(state: GameState, chainId: string, completedOrder: number): void {
    const chain = state.collectionTaskChains.find(c => c.id === chainId);
    if (!chain) return;

    const nextTaskId = chain.tasks.find((taskId, idx) => {
      const task = state.collectionTasks.find(t => t.id === taskId);
      return task && task.order === completedOrder + 1 && 
             task.status === CollectionTaskStatus.LOCKED;
    });

    if (nextTaskId) {
      const taskIndex = state.collectionTasks.findIndex(t => t.id === nextTaskId);
      if (taskIndex !== -1) {
        state.collectionTasks[taskIndex] = {
          ...state.collectionTasks[taskIndex],
          status: CollectionTaskStatus.IN_PROGRESS
        };
        const task = state.collectionTasks[taskIndex];
        this.showStatusMessage(
          state,
          StatusType.INFO,
          '🔓 新任务解锁',
          `${task.title} - ${task.description}`,
          3500
        );
      }
    }
  }

  private checkChainCompletion(state: GameState): void {
    state.collectionTaskChains.forEach((chain, chainIndex) => {
      if (chain.isChainComplete) return;

      const allTasksCompleted = chain.tasks.every(taskId => {
        const task = state.collectionTasks.find(t => t.id === taskId);
        return task && (task.status === CollectionTaskStatus.COMPLETED || 
                       task.status === CollectionTaskStatus.CLAIMED);
      });

      if (allTasksCompleted) {
        state.collectionTaskChains[chainIndex] = {
          ...chain,
          isChainComplete: true
        };
        EventManager.getInstance().emit('collectionchain:completed', { 
          chain: state.collectionTaskChains[chainIndex] 
        });
        this.addClaimableChainRedDot(state, chain.id);
        this.showStatusMessage(
          state,
          StatusType.SUCCESS,
          '🏆 收集链完成',
          `${chain.icon} ${chain.title} - 全部任务完成！`,
          5000
        );
      }
    });
  }

  public claimCollectionTask(taskId: string): GameState {
    const state = this.getGameState();
    const taskIndex = state.collectionTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return state;

    const task = state.collectionTasks[taskIndex];
    if (task.status !== CollectionTaskStatus.COMPLETED) return state;

    state.collectionTasks[taskIndex] = { ...task, status: CollectionTaskStatus.CLAIMED };
    this.applyTaskReward(state, task);
    this.removeClaimableTaskRedDot(state, taskId);

    EventManager.getInstance().emit('collectiontask:claimed', { 
      task: state.collectionTasks[taskIndex] 
    });

    this.showStatusMessage(
      state,
      StatusType.SUCCESS,
      '🎁 奖励已领取',
      task.reward.description,
      3000
    );

    this.saveGame(state);
    return state;
  }

  public claimCollectionChain(chainId: string): GameState {
    const state = this.getGameState();
    const chainIndex = state.collectionTaskChains.findIndex(c => c.id === chainId);
    if (chainIndex === -1) return state;

    const chain = state.collectionTaskChains[chainIndex];
    if (!chain.isChainComplete || chain.chainClaimed) return state;

    state.collectionTaskChains[chainIndex] = { ...chain, chainClaimed: true };
    if (chain.chainReward) {
      this.applyTaskReward(state, chain.chainReward);
    }
    this.removeClaimableChainRedDot(state, chainId);

    EventManager.getInstance().emit('collectionchain:claimed', { 
      chain: state.collectionTaskChains[chainIndex] 
    });

    this.showStatusMessage(
      state,
      StatusType.SUCCESS,
      '🏆 收集链奖励已领取',
      chain.chainReward?.description || '恭喜完成全部收集！',
      4000
    );

    this.saveGame(state);
    return state;
  }

  // === Commission Tasks ===
  private updateCommissionTasksForCollect(state: GameState, type: PetalType, count: number): void {
    this.updateCommissionTasks(state, task => {
      if (!task.conditions || task.conditions.length === 0) {
        return task.targetPetalType === type;
      }
      return task.conditions.some(cond => 
        cond.type === CommissionConditionType.COLLECT_PETAL && cond.targetPetalType === type
      );
    }, count);
  }

  private updateCommissionTasksForSynthesizeOutput(state: GameState, type: PetalType, count: number): void {
    this.updateCommissionTasks(state, task => {
      if (!task.conditions || task.conditions.length === 0) return false;
      return task.conditions.some(cond => 
        cond.type === CommissionConditionType.SYNTHESIZE_OUTPUT && cond.targetPetalType === type
      );
    }, count);
  }

  private updateCommissionTasksForTotalSynthesize(state: GameState): void {
    state.commissionTasks.forEach((task, index) => {
      if (task.status === CollectionTaskStatus.LOCKED || 
          task.status === CollectionTaskStatus.COMPLETED ||
          task.status === CollectionTaskStatus.CLAIMED) {
        return;
      }

      if (!task.conditions || task.conditions.length === 0) return;

      const matched = task.conditions.some(cond => 
        cond.type === CommissionConditionType.TOTAL_SYNTHESIZED
      );

      if (!matched) return;

      const targetCond = task.conditions.find(cond => 
        cond.type === CommissionConditionType.TOTAL_SYNTHESIZED
      );
      if (!targetCond) return;

      const newCount = Math.min(state.totalSynthesized, targetCond.targetCount);
      const wasCompleted = task.currentCount >= targetCond.targetCount;
      const isNowCompleted = newCount >= targetCond.targetCount;

      state.commissionTasks[index] = {
        ...task,
        currentCount: newCount,
        targetCount: targetCond.targetCount,
        status: isNowCompleted ? CollectionTaskStatus.COMPLETED : CollectionTaskStatus.IN_PROGRESS
      };

      EventManager.getInstance().emit('commission:progress', {
        taskId: task.id,
        current: newCount,
        target: targetCond.targetCount
      });

      if (isNowCompleted && !wasCompleted) {
        this.completeCommissionTask(state, index);
      }
    });

    this.checkCommissionChainCompletion(state);
  }

  private updateCommissionTasksForMutationDiscover(state: GameState): void {
    state.commissionTasks.forEach((task, index) => {
      if (task.status === CollectionTaskStatus.LOCKED || 
          task.status === CollectionTaskStatus.COMPLETED ||
          task.status === CollectionTaskStatus.CLAIMED) {
        return;
      }

      if (!task.conditions || task.conditions.length === 0) return;

      const matched = task.conditions.some(cond => 
        cond.type === CommissionConditionType.DISCOVER_MUTATION
      );

      if (!matched) return;

      const targetCond = task.conditions.find(cond => 
        cond.type === CommissionConditionType.DISCOVER_MUTATION
      );
      if (!targetCond) return;

      const newCount = Math.min(state.discoveredMutations.length, targetCond.targetCount);
      const wasCompleted = task.currentCount >= targetCond.targetCount;
      const isNowCompleted = newCount >= targetCond.targetCount;

      state.commissionTasks[index] = {
        ...task,
        currentCount: newCount,
        targetCount: targetCond.targetCount,
        status: isNowCompleted ? CollectionTaskStatus.COMPLETED : CollectionTaskStatus.IN_PROGRESS
      };

      EventManager.getInstance().emit('commission:progress', {
        taskId: task.id,
        current: newCount,
        target: targetCond.targetCount
      });

      if (isNowCompleted && !wasCompleted) {
        this.completeCommissionTask(state, index);
      }
    });

    this.checkCommissionChainCompletion(state);
  }

  private updateCommissionTasks(
    state: GameState, 
    matchFn: (task: CollectionTask) => boolean,
    count: number
  ): void {
    state.commissionTasks.forEach((task, index) => {
      if (task.status === CollectionTaskStatus.LOCKED || 
          task.status === CollectionTaskStatus.COMPLETED ||
          task.status === CollectionTaskStatus.CLAIMED) {
        return;
      }

      if (!matchFn(task)) return;

      const newCount = Math.min(task.currentCount + count, task.targetCount);
      const wasCompleted = task.currentCount >= task.targetCount;
      const isNowCompleted = newCount >= task.targetCount;

      state.commissionTasks[index] = {
        ...task,
        currentCount: newCount,
        status: isNowCompleted ? CollectionTaskStatus.COMPLETED : CollectionTaskStatus.IN_PROGRESS
      };

      EventManager.getInstance().emit('commission:progress', {
        taskId: task.id,
        current: newCount,
        target: task.targetCount
      });

      if (isNowCompleted && !wasCompleted) {
        this.completeCommissionTask(state, index);
      }
    });

    this.checkCommissionChainCompletion(state);
  }

  private completeCommissionTask(state: GameState, taskIndex: number): void {
    const task = state.commissionTasks[taskIndex];
    EventManager.getInstance().emit('commission:completed', { task });
    this.addClaimableCommissionRedDot(state, task.id);
    this.showStatusMessage(
      state,
      StatusType.SUCCESS,
      '📜 委托任务完成',
      `${task.title} - ${task.description}`,
      4000
    );
    this.checkCommissionTaskUnlock(state, task.chainId, task.order);
  }

  private checkCommissionTaskUnlock(state: GameState, chainId: string, completedOrder: number): void {
    const chain = state.commissionTaskChains.find(c => c.id === chainId);
    if (!chain) return;

    const nextTaskId = chain.tasks.find((taskId, idx) => {
      const task = state.commissionTasks.find(t => t.id === taskId);
      return task && task.order === completedOrder + 1 && 
             task.status === CollectionTaskStatus.LOCKED;
    });

    if (nextTaskId) {
      const taskIndex = state.commissionTasks.findIndex(t => t.id === nextTaskId);
      if (taskIndex !== -1) {
        state.commissionTasks[taskIndex] = {
          ...state.commissionTasks[taskIndex],
          status: CollectionTaskStatus.IN_PROGRESS
        };
        const task = state.commissionTasks[taskIndex];
        this.addNewCommissionUnlockRedDot(state, task.id);
        this.showStatusMessage(
          state,
          StatusType.INFO,
          '🔓 新委托解锁',
          `${task.title} - ${task.description}`,
          3500
        );
      }
    }
  }

  private checkCommissionChainCompletion(state: GameState): void {
    state.commissionTaskChains.forEach((chain, chainIndex) => {
      if (chain.isChainComplete) return;

      const allTasksCompleted = chain.tasks.every(taskId => {
        const task = state.commissionTasks.find(t => t.id === taskId);
        return task && (task.status === CollectionTaskStatus.COMPLETED || 
                       task.status === CollectionTaskStatus.CLAIMED);
      });

      if (allTasksCompleted) {
        state.commissionTaskChains[chainIndex] = {
          ...chain,
          isChainComplete: true
        };
        EventManager.getInstance().emit('commissionchain:completed', { 
          chain: state.commissionTaskChains[chainIndex] 
        });
        this.addClaimableCommissionChainRedDot(state, chain.id);
        this.showStatusMessage(
          state,
          StatusType.SUCCESS,
          '🏆 委托链完成',
          `${chain.icon} ${chain.title} - 全部委托完成！`,
          5000
        );
      }
    });
  }

  public claimCommissionTask(taskId: string): GameState {
    const state = this.getGameState();
    const taskIndex = state.commissionTasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return state;

    const task = state.commissionTasks[taskIndex];
    if (task.status !== CollectionTaskStatus.COMPLETED) return state;

    state.commissionTasks[taskIndex] = { ...task, status: CollectionTaskStatus.CLAIMED };
    this.applyTaskReward(state, task.reward);
    this.removeClaimableCommissionRedDot(state, taskId);

    EventManager.getInstance().emit('commission:claimed', { 
      task: state.commissionTasks[taskIndex] 
    });

    this.showStatusMessage(
      state,
      StatusType.SUCCESS,
      '🎁 委托奖励已领取',
      task.reward.description,
      3000
    );

    this.saveGame(state);
    return state;
  }

  public claimCommissionChain(chainId: string): GameState {
    const state = this.getGameState();
    const chainIndex = state.commissionTaskChains.findIndex(c => c.id === chainId);
    if (chainIndex === -1) return state;

    const chain = state.commissionTaskChains[chainIndex];
    if (!chain.isChainComplete || chain.chainClaimed) return state;

    state.commissionTaskChains[chainIndex] = { ...chain, chainClaimed: true };
    if (chain.chainReward) {
      this.applyTaskReward(state, chain.chainReward);
    }
    this.removeClaimableCommissionChainRedDot(state, chainId);

    EventManager.getInstance().emit('commissionchain:claimed', { 
      chain: state.commissionTaskChains[chainIndex] 
    });

    this.showStatusMessage(
      state,
      StatusType.SUCCESS,
      '🏆 委托链奖励已领取',
      chain.chainReward?.description || '恭喜完成全部委托！',
      4000
    );

    this.saveGame(state);
    return state;
  }

  public getCommissionTasks(): CollectionTask[] {
    const state = this.getGameState();
    if (!state.commissionTasks || !Array.isArray(state.commissionTasks)) {
      return JSON.parse(JSON.stringify(INITIAL_COMMISSION_TASKS));
    }
    return state.commissionTasks;
  }

  public getCommissionTaskChains(): CollectionTaskChain[] {
    const state = this.getGameState();
    if (!state.commissionTaskChains || !Array.isArray(state.commissionTaskChains)) {
      return JSON.parse(JSON.stringify(INITIAL_COMMISSION_TASK_CHAINS));
    }
    return state.commissionTaskChains;
  }

  public viewCommissionPanel(): void {
    const state = this.getGameState();
    state.redDotState.lastViewedCommission = Date.now();
    state.redDotState.commissionNewUnlocks = [];
    this.saveGame(state);
    EventManager.getInstance().emit('reddot:updated', {});
  }

  // === Red Dot for Commission ===
  private addClaimableCommissionRedDot(state: GameState, taskId: string): void {
    if (!state.redDotState.claimableCommissions.includes(taskId)) {
      state.redDotState.claimableCommissions.push(taskId);
      EventManager.getInstance().emit('reddot:updated', {});
    }
  }

  private removeClaimableCommissionRedDot(state: GameState, taskId: string): void {
    state.redDotState.claimableCommissions = 
      state.redDotState.claimableCommissions.filter(id => id !== taskId);
    EventManager.getInstance().emit('reddot:updated', {});
  }

  private addClaimableCommissionChainRedDot(state: GameState, chainId: string): void {
    if (!state.redDotState.claimableCommissionChains.includes(chainId)) {
      state.redDotState.claimableCommissionChains.push(chainId);
      EventManager.getInstance().emit('reddot:updated', {});
    }
  }

  private removeClaimableCommissionChainRedDot(state: GameState, chainId: string): void {
    state.redDotState.claimableCommissionChains = 
      state.redDotState.claimableCommissionChains.filter(id => id !== chainId);
    EventManager.getInstance().emit('reddot:updated', {});
  }

  private addNewCommissionUnlockRedDot(state: GameState, taskId: string): void {
    if (!state.redDotState.commissionNewUnlocks.includes(taskId)) {
      state.redDotState.commissionNewUnlocks.push(taskId);
      EventManager.getInstance().emit('reddot:updated', {});
    }
  }

  private applyTaskReward(state: GameState, reward: any): void {
    switch (reward.type) {
      case 'petal':
        if (reward.petalType && reward.count) {
          state.petals[reward.petalType] = (state.petals[reward.petalType] || 0) + reward.count;
          state.totalCollected += reward.count;
          EventManager.getInstance().emit('petal:collected', { 
            type: reward.petalType, 
            count: reward.count 
          });
        }
        break;
      case 'unlock_recipe':
        if (reward.recipeId && !state.unlockedRecipes.includes(reward.recipeId)) {
          state.unlockedRecipes.push(reward.recipeId);
          EventManager.getInstance().emit('synthesis:recipe_unlocked', { 
            recipeId: reward.recipeId 
          });
        }
        break;
      case 'goal_progress':
        state.goals.forEach((goal, idx) => {
          if (goal.status === GoalStatus.PENDING || goal.status === GoalStatus.IN_PROGRESS) {
            const bonus = Math.floor(goal.targetCount * 0.1);
            const newCount = Math.min(goal.currentCount + bonus, goal.targetCount);
            state.goals[idx] = {
              ...goal,
              currentCount: newCount,
              status: newCount >= goal.targetCount ? GoalStatus.COMPLETED : goal.status
            };
          }
        });
        break;
    }
  }

  // === Red Dot System ===

  private addNewUnlockRedDot(state: GameState, type: PetalType): void {
    if (!state.redDotState.collectionNewUnlocks.includes(type)) {
      state.redDotState.collectionNewUnlocks.push(type);
      EventManager.getInstance().emit('reddot:updated', {});
    }
  }

  private addClaimableTaskRedDot(state: GameState, taskId: string): void {
    if (!state.redDotState.claimableTasks.includes(taskId)) {
      state.redDotState.claimableTasks.push(taskId);
      EventManager.getInstance().emit('reddot:updated', {});
    }
  }

  private addClaimableChainRedDot(state: GameState, chainId: string): void {
    if (!state.redDotState.claimableChains.includes(chainId)) {
      state.redDotState.claimableChains.push(chainId);
      EventManager.getInstance().emit('reddot:updated', {});
    }
  }

  private removeClaimableTaskRedDot(state: GameState, taskId: string): void {
    const idx = state.redDotState.claimableTasks.indexOf(taskId);
    if (idx !== -1) {
      state.redDotState.claimableTasks.splice(idx, 1);
      EventManager.getInstance().emit('reddot:updated', {});
    }
  }

  private removeClaimableChainRedDot(state: GameState, chainId: string): void {
    const idx = state.redDotState.claimableChains.indexOf(chainId);
    if (idx !== -1) {
      state.redDotState.claimableChains.splice(idx, 1);
      EventManager.getInstance().emit('reddot:updated', {});
    }
  }

  public clearCollectionNewUnlockRedDot(state: GameState, type: PetalType): void {
    const idx = state.redDotState.collectionNewUnlocks.indexOf(type);
    if (idx !== -1) {
      state.redDotState.collectionNewUnlocks.splice(idx, 1);
      EventManager.getInstance().emit('reddot:updated', {});
      this.saveGame(state);
    }
  }

  public clearAllCollectionRedDots(state: GameState): void {
    state.redDotState.collectionNewUnlocks = [];
    state.redDotState.lastViewedCollection = Date.now();
    EventManager.getInstance().emit('reddot:updated', {});
    this.saveGame(state);
  }

  public hasCollectionRedDots(): boolean {
    const state = this.getGameState();
    return state.redDotState.collectionNewUnlocks.length > 0 ||
           state.redDotState.claimableTasks.length > 0 ||
           state.redDotState.claimableChains.length > 0;
  }

  public getCollectionTasks(): CollectionTask[] {
    return this.getGameState().collectionTasks;
  }

  public getCollectionTaskChains(): CollectionTaskChain[] {
    return this.getGameState().collectionTaskChains;
  }

  public getTasksByChainId(chainId: string): CollectionTask[] {
    return this.getGameState().collectionTasks
      .filter(t => t.chainId === chainId)
      .sort((a, b) => a.order - b.order);
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

  // === Review & Efficiency Stats ===
  public calculateEfficiencyStats(): EfficiencyStats {
    const state = this.getGameState();
    const playTimeMinutes = state.playTime / 60;

    const petalPerMinute = playTimeMinutes > 0 ? state.totalCollected / playTimeMinutes : 0;
    const synthesisPerMinute = playTimeMinutes > 0 ? state.totalSynthesized / playTimeMinutes : 0;
    
    const totalSynthesisAttempts = state.totalSynthesized + state.totalFailures;
    const successRate = totalSynthesisAttempts > 0 
      ? (state.totalSynthesized / totalSynthesisAttempts) * 100 
      : 0;
    
    const mutationRate = totalSynthesisAttempts > 0 
      ? (state.totalMutations / totalSynthesisAttempts) * 100 
      : 0;

    const avgSynthesisTime = state.totalSynthesized > 0 
      ? state.playTime / state.totalSynthesized 
      : 0;

    const petalScore = Math.min(petalPerMinute / 3, 1) * 30;
    const synthesisScore = Math.min(synthesisPerMinute / 0.5, 1) * 25;
    const successScore = (successRate / 100) * 25;
    const mutationScore = Math.min(mutationRate / 15, 1) * 20;

    const totalEfficiencyScore = Math.round(petalScore + synthesisScore + successScore + mutationScore);

    let efficiencyRating: EfficiencyStats['efficiencyRating'] = 'D';
    if (totalEfficiencyScore >= EFFICIENCY_RATING.S.minScore) efficiencyRating = 'S';
    else if (totalEfficiencyScore >= EFFICIENCY_RATING.A.minScore) efficiencyRating = 'A';
    else if (totalEfficiencyScore >= EFFICIENCY_RATING.B.minScore) efficiencyRating = 'B';
    else if (totalEfficiencyScore >= EFFICIENCY_RATING.C.minScore) efficiencyRating = 'C';

    return {
      petalPerMinute: Number(petalPerMinute.toFixed(2)),
      synthesisPerMinute: Number(synthesisPerMinute.toFixed(2)),
      successRate: Number(successRate.toFixed(1)),
      mutationRate: Number(mutationRate.toFixed(1)),
      avgSynthesisTime: Number(avgSynthesisTime.toFixed(1)),
      totalEfficiencyScore,
      efficiencyRating
    };
  }

  public generateMilestones(): KeyMilestone[] {
    const state = this.getGameState();
    const milestones: KeyMilestone[] = [];
    const now = Date.now();

    const addMilestone = (
      id: string,
      type: KeyMilestone['type'],
      configKey: keyof typeof MILESTONE_CONFIG,
      description: string,
      playTimeAt: number
    ) => {
      const config = MILESTONE_CONFIG[configKey];
      milestones.push({
        id,
        type,
        title: config.title,
        description,
        timestamp: now,
        playTimeAt,
        icon: config.icon,
        color: config.color
      });
    };

    if (state.totalCollected > 0) {
      addMilestone('first_collect', 'collect', 'firstCollect', '收集到第一朵花瓣', 0);
    }

    if (state.totalSynthesized > 0) {
      const firstSynthesisTime = state.synthesisRecords.length > 0
        ? this.estimatePlayTimeAt(state.synthesisRecords[state.synthesisRecords.length - 1].timestamp)
        : state.playTime * 0.3;
      addMilestone('first_synthesis', 'synthesize', 'firstSynthesis', '完成第一次花瓣合成', firstSynthesisTime);
    }

    if (state.totalMutations > 0) {
      const mutationRecord = state.synthesisRecords.find(r => r.resultType === SynthesisResultType.MUTATION);
      const mutationTime = mutationRecord
        ? this.estimatePlayTimeAt(mutationRecord.timestamp)
        : state.playTime * 0.5;
      addMilestone('first_mutation', 'mutation', 'firstMutation', '发现首次变异花瓣', mutationTime);
    }

    const unlockTimes = this.estimateUnlockTimes(state);
    
    if (state.unlockedPetals.includes(PetalType.STARLIGHT)) {
      addMilestone('unlock_starlight', 'unlock', 'unlockStarlight', '解锁星光花瓣', unlockTimes.get(PetalType.STARLIGHT) || state.playTime * 0.2);
    }
    if (state.unlockedPetals.includes(PetalType.DEW)) {
      addMilestone('unlock_dew', 'unlock', 'unlockDew', '解锁露珠花瓣', unlockTimes.get(PetalType.DEW) || state.playTime * 0.35);
    }
    if (state.unlockedPetals.includes(PetalType.GLOWING)) {
      addMilestone('unlock_glowing', 'unlock', 'unlockGlowing', '解锁荧光花瓣', unlockTimes.get(PetalType.GLOWING) || state.playTime * 0.5);
    }
    if (state.unlockedPetals.includes(PetalType.DREAM)) {
      addMilestone('unlock_dream', 'unlock', 'unlockDream', '解锁梦境花瓣', unlockTimes.get(PetalType.DREAM) || state.playTime * 0.65);
    }
    if (state.unlockedPetals.includes(PetalType.ETERNAL)) {
      addMilestone('unlock_eternal', 'unlock', 'unlockEternal', '解锁永恒花瓣', unlockTimes.get(PetalType.ETERNAL) || state.playTime * 0.8);
    }
    if (state.unlockedPetals.includes(PetalType.WAKEUP)) {
      addMilestone('unlock_wakeup', 'unlock', 'unlockWakeup', '合成唤醒之花', state.playTime);
    }

    if (state.totalCollected >= 50) {
      const collect50Time = state.playTime * (50 / state.totalCollected);
      addMilestone('collect_50', 'collect', 'collect50', '累计收集50朵花瓣', collect50Time);
    }
    if (state.totalCollected >= 100) {
      const collect100Time = state.playTime * (100 / state.totalCollected);
      addMilestone('collect_100', 'collect', 'collect100', '累计收集100朵花瓣', collect100Time);
    }
    if (state.totalSynthesized >= 10) {
      const synthesis10Time = state.playTime * (10 / Math.max(state.totalSynthesized, 1));
      addMilestone('synthesis_10', 'synthesize', 'synthesis10', '完成10次成功合成', synthesis10Time);
    }

    if (state.isCompleted) {
      addMilestone('complete_game', 'complete', 'completeGame', '成功唤醒恋人，通关游戏', state.playTime);
    }

    return milestones.sort((a, b) => a.playTimeAt - b.playTimeAt);
  }

  private estimatePlayTimeAt(timestamp: number): number {
    const state = this.getGameState();
    const startTime = state.lastSaveTime - state.playTime * 1000;
    return Math.max(0, (timestamp - startTime) / 1000);
  }

  private estimateUnlockTimes(state: GameState): Map<PetalType, number> {
    const unlockTimes = new Map<PetalType, number>();
    const baseTime = state.playTime / Math.max(state.unlockedPetals.length, 1);
    
    state.unlockedPetals.forEach((type, index) => {
      unlockTimes.set(type, baseTime * (index + 0.5));
    });
    
    return unlockTimes;
  }

  public findRareDrops(): RareDrop[] {
    const state = this.getGameState();
    const rareDrops: RareDrop[] = [];

    const rarePetalTypes: { type: PetalType; rarity: RareDrop['rarity'] }[] = [
      { type: PetalType.WAKEUP, rarity: 'legendary' },
      { type: PetalType.ETERNAL, rarity: 'epic' },
      { type: PetalType.DREAM, rarity: 'epic' },
      { type: PetalType.DREAM_PHANTOM, rarity: 'epic' },
      { type: PetalType.GLOWING_EMBER, rarity: 'rare' },
      { type: PetalType.DEW_CRYSTAL, rarity: 'rare' },
      { type: PetalType.STARLIGHT_BURST, rarity: 'rare' },
      { type: PetalType.MOONLIGHT_SHIMMER, rarity: 'uncommon' },
      { type: PetalType.GLOWING, rarity: 'uncommon' }
    ];

    rarePetalTypes.forEach(({ type, rarity }) => {
      const count = state.petals[type] || 0;
      if (count > 0) {
        const config = PETAL_CONFIGS[type];
        rareDrops.push({
          type,
          name: config.name,
          count,
          rarity,
          obtainedAt: Date.now(),
          description: config.description
        });
      }
    });

    const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3 };
    return rareDrops.sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity]);
  }

  public calculateTotalScore(): number {
    const state = this.getGameState();
    const efficiency = this.calculateEfficiencyStats();
    
    const completionBonus = state.isCompleted ? 500 : 0;
    const collectScore = state.totalCollected * 2;
    const synthesisScore = state.totalSynthesized * 10;
    const mutationScore = state.totalMutations * 25;
    const unlockScore = state.unlockedPetals.length * 50;
    const efficiencyBonus = efficiency.totalEfficiencyScore * 2;
    const speedBonus = state.isCompleted ? Math.max(0, 1000 - state.playTime) : 0;

    return Math.round(
      completionBonus +
      collectScore +
      synthesisScore +
      mutationScore +
      unlockScore +
      efficiencyBonus +
      speedBonus
    );
  }

  // === Inheritance System ===
  public getInheritanceOptions(): InheritanceOption[] {
    return INHERITANCE_OPTIONS.map(opt => ({
      ...opt,
      selected: false
    }));
  }

  public getMaxInheritancePoints(): number {
    return MAX_INHERITANCE_POINTS;
  }

  public calculateAvailablePoints(): number {
    const efficiency = this.calculateEfficiencyStats();
    const ratingBonus: Record<string, number> = { S: 3, A: 2, B: 1, C: 0, D: 0 };
    return MAX_INHERITANCE_POINTS + (ratingBonus[efficiency.efficiencyRating] || 0);
  }

  public applyInheritance(selectedOptions: InheritanceType[]): GameState {
    const previousState = this.getGameState();
    const newState = getInitialGameState();

    selectedOptions.forEach(optionType => {
      switch (optionType) {
        case InheritanceType.PETAL_RESERVE:
          Object.entries(previousState.petals).forEach(([type, count]) => {
            const reserved = Math.floor(count * PETAL_RESERVE_RATIO);
            if (reserved > 0) {
              newState.petals[type as PetalType] = reserved;
              if (!newState.unlockedPetals.includes(type as PetalType)) {
                newState.unlockedPetals.push(type as PetalType);
              }
            }
          });
          break;

        case InheritanceType.UNLOCKED_RECIPES:
          newState.unlockedRecipes = [...previousState.unlockedRecipes];
          break;

        case InheritanceType.DISCOVERED_MUTATIONS:
          newState.discoveredMutations = [...previousState.discoveredMutations];
          break;

        case InheritanceType.COLLECTION_PROGRESS:
          newState.unlockedPetals = [...previousState.unlockedPetals];
          break;

        case InheritanceType.EFFICIENCY_BOOST:
          newState.efficiencyBoost = EFFICIENCY_BOOST_RATIO;
          break;

        case InheritanceType.GOAL_PROGRESS:
          previousState.goals.forEach((prevGoal, index) => {
            if (index < newState.goals.length) {
              newState.goals[index].currentCount = prevGoal.currentCount;
              if (prevGoal.status === GoalStatus.COMPLETED || prevGoal.status === GoalStatus.CLAIMED) {
                newState.goals[index].status = prevGoal.status;
              }
            }
          });
          break;

        case InheritanceType.ENVIRONMENT_STATS:
          if (previousState.environmentStats) {
            newState.environmentStats = JSON.parse(JSON.stringify(previousState.environmentStats));
            newState.environmentStats.totalDaysPlayed = 0;
            newState.environmentStats.nightsPlayed = 0;
          }
          break;
      }
    });

    EventManager.getInstance().emit('inheritance:apply', {
      data: {
        selectedOptions,
        inheritedPetals: newState.petals,
        inheritedRecipes: newState.unlockedRecipes,
        efficiencyBoost: (newState as any).efficiencyBoost || 0
      }
    });

    this.saveGame(newState);
    return newState;
  }

  public getReviewData(): ReviewData {
    return {
      efficiencyStats: this.calculateEfficiencyStats(),
      milestones: this.generateMilestones(),
      rareDrops: this.findRareDrops(),
      inheritanceOptions: this.getInheritanceOptions(),
      totalScore: this.calculateTotalScore()
    };
  }

  // ========== 数据校验 ==========

  public validateSave(saveData?: SaveData): SaveValidationResult {
    const data = saveData || this.currentSave;
    const errors: string[] = [];
    const warnings: string[] = [];
    let fixed = false;
    const initialState = getInitialGameState();

    if (!data) {
      return { valid: false, errors: ['无存档数据'], warnings: [], fixed: false };
    }

    if (!data.version) {
      errors.push('存档缺少版本号');
    }

    if (!data.gameState) {
      errors.push('存档缺少游戏状态');
      return { valid: false, errors, warnings, fixed: false };
    }

    const state = data.gameState;

    if (typeof state.totalCollected !== 'number' || state.totalCollected < 0) {
      errors.push('totalCollected 数据无效');
    }

    if (typeof state.totalSynthesized !== 'number' || state.totalSynthesized < 0) {
      errors.push('totalSynthesized 数据无效');
    }

    if (typeof state.playTime !== 'number' || state.playTime < 0) {
      warnings.push('playTime 数据异常');
    }

    if (!state.petals || typeof state.petals !== 'object') {
      errors.push('petals 数据缺失');
    } else {
      const petalTypes = Object.values(PetalType);
      let petalSum = 0;
      for (const type of petalTypes) {
        const count = state.petals[type];
        if (typeof count !== 'number' || count < 0) {
          warnings.push(`花瓣 ${type} 数量异常，已重置为0`);
          state.petals[type] = 0;
          fixed = true;
        }
        petalSum += state.petals[type] || 0;
      }

      if (state.totalCollected > 0 && petalSum > state.totalCollected * 10) {
        warnings.push('花瓣总数与收集数比例异常');
      }
    }

    if (!state.unlockedPetals || !Array.isArray(state.unlockedPetals)) {
      warnings.push('unlockedPetals 数据异常，已重置');
      state.unlockedPetals = [PetalType.MOONLIGHT];
      fixed = true;
    }

    if (!state.unlockedRecipes || !Array.isArray(state.unlockedRecipes)) {
      warnings.push('unlockedRecipes 数据异常，已重置');
      state.unlockedRecipes = ['recipe_1', 'recipe_7'];
      fixed = true;
    }

    if (!state.goals || !Array.isArray(state.goals) || state.goals.length === 0) {
      warnings.push('goals 数据异常，已重置为默认目标');
      state.goals = JSON.parse(JSON.stringify(INITIAL_GOALS));
      fixed = true;
    }

    if (state.totalMutations > state.totalSynthesized) {
      warnings.push('变异次数超过成功合成次数');
    }

    if (state.totalFailures > state.totalSynthesized + state.totalMutations) {
      warnings.push('失败次数异常');
    }

    if (state.isCompleted && !state.hasWakeUp) {
      warnings.push('游戏已通关但未获得唤醒之花');
    }

    if (state.resourceTrend && state.resourceTrend.length > MAX_RESOURCE_TREND_POINTS) {
      warnings.push(`资源趋势数据超过上限，已裁剪`);
      state.resourceTrend = state.resourceTrend.slice(-MAX_RESOURCE_TREND_POINTS);
      fixed = true;
    }

    if (state.synthesisRecords && state.synthesisRecords.length > MAX_SYNTHESIS_RECORDS) {
      warnings.push(`合成记录超过上限，已裁剪`);
      state.synthesisRecords = state.synthesisRecords.slice(0, MAX_SYNTHESIS_RECORDS);
      fixed = true;
    }

    if (state.activeStatusMessages && state.activeStatusMessages.length > MAX_STATUS_MESSAGES) {
      warnings.push(`状态消息超过上限，已裁剪`);
      state.activeStatusMessages = state.activeStatusMessages.slice(-MAX_STATUS_MESSAGES);
      fixed = true;
    }

    if (!state.collectionTasks || !Array.isArray(state.collectionTasks)) {
      warnings.push('collectionTasks 数据异常，已重置');
      state.collectionTasks = JSON.parse(JSON.stringify(INITIAL_COLLECTION_TASKS));
      fixed = true;
    }

    if (!state.collectionTaskChains || !Array.isArray(state.collectionTaskChains)) {
      warnings.push('collectionTaskChains 数据异常，已重置');
      state.collectionTaskChains = JSON.parse(JSON.stringify(INITIAL_COLLECTION_TASK_CHAINS));
      fixed = true;
    }

    if (!state.redDotState) {
      warnings.push('redDotState 数据异常，已重置');
      state.redDotState = JSON.parse(JSON.stringify(INITIAL_RED_DOT_STATE));
      fixed = true;
    } else {
      const defaultRedDot = JSON.parse(JSON.stringify(INITIAL_RED_DOT_STATE));
      if (!Array.isArray(state.redDotState.commissionNewUnlocks)) {
        state.redDotState.commissionNewUnlocks = defaultRedDot.commissionNewUnlocks;
        warnings.push('redDotState.commissionNewUnlocks 数据异常，已重置');
        fixed = true;
      }
      if (!Array.isArray(state.redDotState.claimableCommissions)) {
        state.redDotState.claimableCommissions = defaultRedDot.claimableCommissions;
        warnings.push('redDotState.claimableCommissions 数据异常，已重置');
        fixed = true;
      }
      if (!Array.isArray(state.redDotState.claimableCommissionChains)) {
        state.redDotState.claimableCommissionChains = defaultRedDot.claimableCommissionChains;
        warnings.push('redDotState.claimableCommissionChains 数据异常，已重置');
        fixed = true;
      }
      if (typeof state.redDotState.lastViewedCommission !== 'number') {
        state.redDotState.lastViewedCommission = 0;
        warnings.push('redDotState.lastViewedCommission 数据异常，已重置');
        fixed = true;
      }
    }

    if (!state.commissionTasks || !Array.isArray(state.commissionTasks)) {
      warnings.push('commissionTasks 数据异常，已重置');
      state.commissionTasks = JSON.parse(JSON.stringify(INITIAL_COMMISSION_TASKS));
      fixed = true;
    }

    if (!state.commissionTaskChains || !Array.isArray(state.commissionTaskChains)) {
      warnings.push('commissionTaskChains 数据异常，已重置');
      state.commissionTaskChains = JSON.parse(JSON.stringify(INITIAL_COMMISSION_TASK_CHAINS));
      fixed = true;
    }

    if (!state.dailyRewardState) {
      warnings.push('dailyRewardState 数据异常，已重置');
      state.dailyRewardState = JSON.parse(JSON.stringify(INITIAL_DAILY_REWARD_STATE));
      fixed = true;
    }

    if (!state.regionHeats || !Array.isArray(state.regionHeats) || state.regionHeats.length === 0) {
      warnings.push('regionHeats 数据异常，已重置');
      state.regionHeats = JSON.parse(JSON.stringify(initialState.regionHeats));
      fixed = true;
    }

    if (!state.environment) {
      warnings.push('environment 数据异常，已重置');
      state.environment = JSON.parse(JSON.stringify(INITIAL_ENVIRONMENT));
      fixed = true;
    } else {
      if (!state.environment.time) {
        warnings.push('environment.time 数据异常，已重置');
        state.environment.time = JSON.parse(JSON.stringify(INITIAL_ENVIRONMENT.time));
        fixed = true;
      }
      if (!state.environment.weather) {
        warnings.push('environment.weather 数据异常，已重置');
        state.environment.weather = JSON.parse(JSON.stringify(INITIAL_ENVIRONMENT.weather));
        fixed = true;
      }
    }

    if (!state.environmentStats) {
      warnings.push('environmentStats 数据异常，已重置');
      state.environmentStats = JSON.parse(JSON.stringify(INITIAL_ENVIRONMENT_STATS));
      fixed = true;
    } else {
      if (typeof state.environmentStats.totalDaysPlayed !== 'number' || state.environmentStats.totalDaysPlayed < 0) {
        warnings.push('environmentStats.totalDaysPlayed 数据异常，已重置');
        state.environmentStats.totalDaysPlayed = 0;
        fixed = true;
      }
      if (typeof state.environmentStats.nightsPlayed !== 'number' || state.environmentStats.nightsPlayed < 0) {
        warnings.push('environmentStats.nightsPlayed 数据异常，已重置');
        state.environmentStats.nightsPlayed = 0;
        fixed = true;
      }
      if (typeof state.environmentStats.totalRareDrops !== 'number' || state.environmentStats.totalRareDrops < 0) {
        warnings.push('environmentStats.totalRareDrops 数据异常，已重置');
        state.environmentStats.totalRareDrops = 0;
        fixed = true;
      }
      if (!state.environmentStats.weatherExperience || typeof state.environmentStats.weatherExperience !== 'object') {
        warnings.push('environmentStats.weatherExperience 数据异常，已重置');
        state.environmentStats.weatherExperience = JSON.parse(JSON.stringify(INITIAL_ENVIRONMENT_STATS.weatherExperience));
        fixed = true;
      }
      if (!state.environmentStats.specialEventsWitnessed || !Array.isArray(state.environmentStats.specialEventsWitnessed)) {
        warnings.push('environmentStats.specialEventsWitnessed 数据异常，已重置');
        state.environmentStats.specialEventsWitnessed = [];
        fixed = true;
      }
      if (!state.environmentStats.rareDropsFound || !Array.isArray(state.environmentStats.rareDropsFound)) {
        warnings.push('environmentStats.rareDropsFound 数据异常，已重置');
        state.environmentStats.rareDropsFound = [];
        fixed = true;
      }
    }

    if (!state.rareDropEvents || !Array.isArray(state.rareDropEvents) || state.rareDropEvents.length === 0) {
      warnings.push('rareDropEvents 数据异常，已重置');
      state.rareDropEvents = RARE_DROP_EVENTS.map(event => ({
        ...event,
        lastTriggered: 0,
        count: 0
      }));
      fixed = true;
    }

    const valid = errors.length === 0;

    if (warnings.length > 0 || errors.length > 0) {
      EventManager.getInstance().emit('save:validation_warning', {
        result: { valid, errors, warnings, fixed }
      });
    }

    return { valid, errors, warnings, fixed };
  }

  public validateAndRepairSave(): SaveValidationResult {
    const result = this.validateSave();
    if (result.fixed && this.currentSave) {
      this.saveGame(this.currentSave.gameState);
    }
    return result;
  }

  // ========== 每日奖励系统 ==========

  private getTodayDateString(): string {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
  }

  private getYesterdayDateString(): string {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
  }

  public checkDailyLogin(): DailyRewardState {
    const state = this.getGameState();
    const today = this.getTodayDateString();
    const yesterday = this.getYesterdayDateString();

    if (!state.dailyRewardState) {
      state.dailyRewardState = JSON.parse(JSON.stringify(INITIAL_DAILY_REWARD_STATE));
    }

    const rewardState = state.dailyRewardState;

    if (rewardState.lastLoginDate === today) {
      return rewardState;
    }

    if (rewardState.lastLoginDate === yesterday) {
      rewardState.consecutiveDays = Math.min(rewardState.consecutiveDays + 1, 7);
    } else {
      rewardState.consecutiveDays = 1;
      rewardState.claimedDays = [];
    }

    rewardState.lastLoginDate = today;
    rewardState.todayClaimed = false;

    this.saveGame(state);

    EventManager.getInstance().emit('dailylogin:checked', { state: rewardState });

    return rewardState;
  }

  public getDailyRewardState(): DailyRewardState {
    const state = this.getGameState();
    if (!state.dailyRewardState) {
      return JSON.parse(JSON.stringify(INITIAL_DAILY_REWARD_STATE));
    }
    return { ...state.dailyRewardState };
  }

  public getDailyRewards(): DailyReward[] {
    return DAILY_REWARDS.map(r => ({ ...r }));
  }

  public canClaimTodayReward(): boolean {
    const rewardState = this.getDailyRewardState();
    const today = this.getTodayDateString();
    return rewardState.lastLoginDate === today && !rewardState.todayClaimed;
  }

  public claimDailyReward(): { success: boolean; reward?: DailyReward; message: string } {
    const state = this.getGameState();
    const rewardState = state.dailyRewardState;
    const today = this.getTodayDateString();

    if (!rewardState || rewardState.lastLoginDate !== today || rewardState.todayClaimed) {
      return { success: false, message: '今日奖励已领取或无法领取' };
    }

    const dayToClaim = rewardState.consecutiveDays;
    const reward = DAILY_REWARDS.find(r => r.day === dayToClaim);

    if (!reward) {
      return { success: false, message: '奖励配置错误' };
    }

    if (reward.type === 'petal' && reward.petalType && reward.count) {
      state.petals[reward.petalType] = (state.petals[reward.petalType] || 0) + reward.count;
      state.totalCollected += reward.count;

      if (!state.unlockedPetals.includes(reward.petalType)) {
        state.unlockedPetals.push(reward.petalType);
      }
    }

    rewardState.todayClaimed = true;
    if (!rewardState.claimedDays.includes(dayToClaim)) {
      rewardState.claimedDays.push(dayToClaim);
    }

    state.dailyRewardState = rewardState;
    this.saveGame(state);

    EventManager.getInstance().emit('dailyreward:claimed', { reward, day: dayToClaim });

    return { success: true, reward, message: `领取成功：${reward.description}` };
  }

  // ========== 备份系统 ==========

  private getBackups(): SaveBackupData[] {
    try {
      const data = localStorage.getItem(BACKUP_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load backups:', e);
    }
    return [];
  }

  private saveBackups(backups: SaveBackupData[]): void {
    try {
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backups));
    } catch (e) {
      console.error('Failed to save backups:', e);
      EventManager.getInstance().emit('save:error', { message: '保存备份失败：存储空间不足' });
    }
  }

  public createBackup(label?: string): SaveBackupInfo | null {
    try {
      const currentData = this.currentSave;
      if (!currentData) {
        return null;
      }

      const backup: SaveBackupData = {
        version: currentData.version,
        timestamp: Date.now(),
        gameState: JSON.parse(JSON.stringify(currentData.gameState)),
        settings: { ...currentData.settings },
        label
      };

      const backups = this.getBackups();
      backups.unshift(backup);

      if (backups.length > MAX_BACKUP_COUNT) {
        backups.length = MAX_BACKUP_COUNT;
      }

      this.saveBackups(backups);

      EventManager.getInstance().emit('save:backup_created', { label, isAuto: false });

      return {
        version: backup.version,
        timestamp: backup.timestamp,
        label: backup.label,
        size: JSON.stringify(backup).length,
        isAuto: false
      };
    } catch (e) {
      console.error('Failed to create backup:', e);
      EventManager.getInstance().emit('save:error', { message: '创建备份失败' });
      return null;
    }
  }

  public createAutoBackup(): void {
    try {
      const currentData = this.currentSave;
      if (!currentData) return;

      const backup: SaveBackupData = {
        version: currentData.version,
        timestamp: Date.now(),
        gameState: JSON.parse(JSON.stringify(currentData.gameState)),
        settings: { ...currentData.settings },
        isAuto: true
      } as SaveBackupData & { isAuto: boolean };

      let autoBackups: SaveBackupData[] = [];
      try {
        const data = localStorage.getItem(AUTO_BACKUP_KEY);
        if (data) {
          autoBackups = JSON.parse(data);
        }
      } catch (e) {
        console.error('Failed to load auto backups:', e);
      }

      autoBackups.unshift(backup);
      if (autoBackups.length > MAX_AUTO_BACKUP_COUNT) {
        autoBackups.length = MAX_AUTO_BACKUP_COUNT;
      }

      localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(autoBackups));
      this.lastAutoBackupTime = Date.now();

      EventManager.getInstance().emit('save:backup_created', { label: '自动备份', isAuto: true });
    } catch (e) {
      console.error('Failed to create auto backup:', e);
    }
  }

  public getBackupList(): SaveBackupInfo[] {
    const backups = this.getBackups();
    const autoBackups = this.getAutoBackups();
    const allBackups = [...autoBackups.map(b => ({ ...b, isAuto: true })), ...backups.map(b => ({ ...b, isAuto: false }))];
    
    return allBackups
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(b => ({
        version: b.version,
        timestamp: b.timestamp,
        label: b.label,
        size: JSON.stringify(b).length,
        isAuto: (b as any).isAuto || false
      }));
  }

  private getAutoBackups(): SaveBackupData[] {
    try {
      const data = localStorage.getItem(AUTO_BACKUP_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load auto backups:', e);
    }
    return [];
  }

  public restoreBackup(index: number, isAuto: boolean = false): boolean {
    try {
      let backups: SaveBackupData[];
      if (isAuto) {
        backups = this.getAutoBackups();
      } else {
        backups = this.getBackups();
      }

      if (index < 0 || index >= backups.length) {
        return false;
      }

      const backup = backups[index];
      const migrated = this.migrateSaveData(backup);
      const validation = this.validateSave(migrated);

      if (!validation.valid) {
        EventManager.getInstance().emit('save:error', { message: '备份数据校验失败，无法恢复' });
        return false;
      }

      this.createBackup('恢复前备份');

      this.currentSave = migrated;
      this.saveGame(migrated.gameState);

      EventManager.getInstance().emit('save:backup_restored', { label: backup.label });

      return true;
    } catch (e) {
      console.error('Failed to restore backup:', e);
      EventManager.getInstance().emit('save:error', { message: '恢复备份失败' });
      return false;
    }
  }

  public deleteBackup(index: number, isAuto: boolean = false): boolean {
    try {
      if (isAuto) {
        const autoBackups = this.getAutoBackups();
        if (index >= 0 && index < autoBackups.length) {
          autoBackups.splice(index, 1);
          localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(autoBackups));
          return true;
        }
      } else {
        const backups = this.getBackups();
        if (index >= 0 && index < backups.length) {
          backups.splice(index, 1);
          this.saveBackups(backups);
          return true;
        }
      }
      return false;
    } catch (e) {
      console.error('Failed to delete backup:', e);
      return false;
    }
  }

  public clearAllBackups(): void {
    try {
      localStorage.removeItem(BACKUP_STORAGE_KEY);
      localStorage.removeItem(AUTO_BACKUP_KEY);
    } catch (e) {
      console.error('Failed to clear backups:', e);
    }
  }

  // ========== 导入/导出 ==========

  public exportSave(): string | null {
    try {
      const saveData = this.currentSave;
      if (!saveData) return null;
      return btoa(encodeURIComponent(JSON.stringify(saveData)));
    } catch (e) {
      console.error('Failed to export save:', e);
      EventManager.getInstance().emit('save:error', { message: '导出存档失败' });
      return null;
    }
  }

  public importSave(encodedData: string): boolean {
    try {
      const decoded = decodeURIComponent(atob(encodedData));
      const parsed = JSON.parse(decoded);

      if (!parsed.gameState || !parsed.version) {
        EventManager.getInstance().emit('save:error', { message: '导入数据格式无效' });
        return false;
      }

      const migrated = this.migrateSaveData(parsed);
      const validation = this.validateSave(migrated);

      if (!validation.valid) {
        EventManager.getInstance().emit('save:error', { message: '导入数据校验失败' });
        return false;
      }

      this.createBackup('导入前备份');

      this.currentSave = migrated;
      this.saveGame(migrated.gameState);

      EventManager.getInstance().emit('save:backup_restored', { label: '导入存档' });

      return true;
    } catch (e) {
      console.error('Failed to import save:', e);
      EventManager.getInstance().emit('save:error', { message: '导入存档失败：数据格式错误' });
      return false;
    }
  }

  // ========== 异常恢复 ==========

  public tryRecoverFromError(): SaveData | null {
    const autoBackups = this.getAutoBackups();
    if (autoBackups.length > 0) {
      const latest = autoBackups[0];
      try {
        const migrated = this.migrateSaveData(latest);
        const validation = this.validateSave(migrated);
        if (validation.valid) {
          this.currentSave = migrated;
          this.saveGame(migrated.gameState);
          EventManager.getInstance().emit('save:backup_restored', { label: '自动恢复' });
          return migrated;
        }
      } catch (e) {
        console.error('Auto backup recovery failed:', e);
      }
    }

    const manualBackups = this.getBackups();
    for (const backup of manualBackups) {
      try {
        const migrated = this.migrateSaveData(backup);
        const validation = this.validateSave(migrated);
        if (validation.valid) {
          this.currentSave = migrated;
          this.saveGame(migrated.gameState);
          EventManager.getInstance().emit('save:backup_restored', { label: backup.label || '备份恢复' });
          return migrated;
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  }

  public loadSaveWithRecovery(): SaveData | null {
    try {
      const data = localStorage.getItem(SAVE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        const migrated = this.migrateSaveData(parsed);
        const validation = this.validateSave(migrated);

        if (validation.valid) {
          this.currentSave = migrated;
          if (validation.fixed) {
            this.saveGame(migrated.gameState);
          }
          return this.currentSave;
        }

        if (validation.errors.length > 0) {
          console.warn('Save validation errors, attempting recovery:', validation.errors);
          const recovered = this.tryRecoverFromError();
          if (recovered) {
            return recovered;
          }
        }
      }
    } catch (error) {
      console.error('Failed to load save, attempting recovery:', error);
      const recovered = this.tryRecoverFromError();
      if (recovered) {
        return recovered;
      }
    }
    return null;
  }

  // ========== 设置回滚 ==========

  public resetSettings(): void {
    const gameState = this.getGameState();
    const defaultSettings = getInitialSettings();
    
    const saveData: SaveData = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      gameState: { ...gameState },
      settings: defaultSettings
    };

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      if (this.currentSave) {
        this.currentSave.settings = defaultSettings;
      }
      EventManager.getInstance().emit('settings:updated', { settings: defaultSettings });
    } catch (error) {
      console.error('Failed to reset settings:', error);
    }
  }

  // ========== 自动备份触发 ==========

  public checkAutoBackup(): void {
    const now = Date.now();
    if (now - this.lastAutoBackupTime >= AUTO_BACKUP_INTERVAL) {
      this.createAutoBackup();
    }
  }

  public getLastAutoBackupTime(): number {
    return this.lastAutoBackupTime;
  }
}
