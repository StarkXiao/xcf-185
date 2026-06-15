import Phaser from 'phaser';
import {
  GameState,
  RegionConfig,
  RegionUnlockState,
  RegionUnlockCondition,
  RegionUnlockConditionType,
  RegionEntrance,
  PetalType,
  Position
} from '../types';
import {
  REGION_CONFIGS,
  REGION_ENTRANCES,
  WORLD_WIDTH,
  WORLD_HEIGHT
} from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { EventManager } from '../managers/EventManager';

export class RegionUnlockSystem {
  private scene: Phaser.Scene;
  private regionConfigs: RegionConfig[] = REGION_CONFIGS;
  private entrances: RegionEntrance[] = REGION_ENTRANCES;
  private entranceVisuals: Map<string, Phaser.GameObjects.Container> = new Map();
  private lockedRegionOverlays: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private regionTimeStart: Map<string, number> = new Map();
  private eventListeners: Array<{ event: string; callback: (data: any) => void }> = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public create(): void {
    this.createRegionOverlays();
    this.createEntranceVisuals();
    this.setupEventListeners();
    this.initializeRegionTimeTracking();
    this.checkAllRegionUnlocks();
  }

  private initializeRegionTimeTracking(): void {
    const state = SaveManager.getInstance().getGameState();
    if (state.currentRegionId) {
      this.regionTimeStart.set(state.currentRegionId, Date.now());
    }
  }

  private setupEventListeners(): void {
    const onPetalCollected = () => this.checkAllRegionUnlocks();
    const onSynthesisComplete = () => this.checkAllRegionUnlocks();
    const onRegionUnlocked = () => this.refreshRegionVisuals();

    EventManager.getInstance().on('petal:collected', onPetalCollected);
    EventManager.getInstance().on('synthesis:complete', onSynthesisComplete);
    EventManager.getInstance().on('region:unlocked', onRegionUnlocked);

    this.eventListeners.push({ event: 'petal:collected', callback: onPetalCollected });
    this.eventListeners.push({ event: 'synthesis:complete', callback: onSynthesisComplete });
    this.eventListeners.push({ event: 'region:unlocked', callback: onRegionUnlocked });
  }

  private createRegionOverlays(): void {
    const state = SaveManager.getInstance().getGameState();
    this.regionConfigs.forEach(config => {
      const unlockState = state.regionUnlockStates.find(s => s.regionId === config.id);
      if (unlockState && !unlockState.isUnlocked) {
        this.createLockedOverlay(config);
      }
    });
  }

  private createLockedOverlay(config: RegionConfig): void {
    if (this.lockedRegionOverlays.has(config.id)) return;

    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(config.x, config.y, config.width, config.height);
    overlay.lineStyle(3, 0x666666, 0.8);
    overlay.strokeRect(config.x, config.y, config.width, config.height);
    overlay.setDepth(5);

    const centerX = config.x + config.width / 2;
    const centerY = config.y + config.height / 2;

    const lockIcon = this.scene.add.text(centerX, centerY - 30, '🔒', {
      fontSize: '48px',
      fontFamily: 'Arial, Microsoft YaHei, sans-serif'
    }).setOrigin(0.5).setDepth(6);

    const nameText = this.scene.add.text(centerX, centerY + 20, config.name, {
      fontSize: '20px',
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      color: '#888888'
    }).setOrigin(0.5).setDepth(6);

    const hintText = this.scene.add.text(centerX, centerY + 50, '未解锁', {
      fontSize: '14px',
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      color: '#666666'
    }).setOrigin(0.5).setDepth(6);

    const container = this.scene.add.container(0, 0, [overlay, lockIcon, nameText, hintText]);
    container.setScrollFactor(0);
    container.setData('regionId', config.id);
    container.setSize(config.width, config.height);
    container.setPosition(config.x, config.y);
    container.setDepth(5);

    this.lockedRegionOverlays.set(config.id, overlay);
  }

  private createEntranceVisuals(): void {
    this.entrances.forEach(entrance => {
      if (this.entranceVisuals.has(`${entrance.regionId}_${entrance.entranceX}_${entrance.entranceY}`)) {
        return;
      }

      const state = SaveManager.getInstance().getGameState();
      const unlockState = state.regionUnlockStates.find(s => s.regionId === entrance.regionId);
      const isUnlocked = unlockState?.isUnlocked ?? false;

      const graphics = this.scene.add.graphics();
      const color = isUnlocked ? 0xa8e6cf : 0x666666;
      graphics.fillStyle(color, isUnlocked ? 0.8 : 0.4);
      graphics.fillRoundedRect(
        entrance.entranceX - entrance.width / 2,
        entrance.entranceY - entrance.height / 2,
        entrance.width,
        entrance.height,
        8
      );

      const arrowText = this.scene.add.text(entrance.entranceX, entrance.entranceY, isUnlocked ? '→' : '🔒', {
        fontSize: '18px',
        fontFamily: 'Arial, Microsoft YaHei, sans-serif',
        color: '#ffffff'
      }).setOrigin(0.5).setDepth(11);

      const container = this.scene.add.container(0, 0, [graphics, arrowText]);
      container.setData('entrance', entrance);
      container.setData('regionId', entrance.regionId);
      container.setSize(entrance.width, entrance.height);
      container.setDepth(10);
      container.setInteractive(new Phaser.Geom.Rectangle(
        -entrance.width / 2,
        -entrance.height / 2,
        entrance.width,
        entrance.height
      ), Phaser.Geom.Rectangle.Contains);

      container.on('pointerdown', () => {
        this.handleEntranceClick(entrance);
      });

      this.entranceVisuals.set(`${entrance.regionId}_${entrance.entranceX}_${entrance.entranceY}`, container);
    });
  }

  private handleEntranceClick(entrance: RegionEntrance): void {
    const state = SaveManager.getInstance().getGameState();
    const unlockState = state.regionUnlockStates.find(s => s.regionId === entrance.regionId);

    if (!unlockState || !unlockState.isUnlocked) {
      const missingConditions = this.getMissingConditions(entrance.regionId);
      const regionConfig = this.regionConfigs.find(r => r.id === entrance.regionId);
      EventManager.getInstance().emit('region:locked_attempt', {
        regionId: entrance.regionId,
        regionName: regionConfig?.name || entrance.regionId,
        missingConditions
      });
      return;
    }

    EventManager.getInstance().emit('region:navigate_request', { regionId: entrance.regionId });
    this.teleportToRegion(entrance.regionId);
  }

  public teleportToRegion(regionId: string): boolean {
    const state = SaveManager.getInstance().getGameState();
    const unlockState = state.regionUnlockStates.find(s => s.regionId === regionId);
    const config = this.regionConfigs.find(r => r.id === regionId);

    if (!unlockState || !unlockState.isUnlocked || !config) {
      return false;
    }

    this.updateRegionTimeTracking(state.currentRegionId);

    const previousRegionId = state.currentRegionId;
    state.lastRegionId = previousRegionId;
    state.currentRegionId = regionId;

    if (!unlockState.firstVisitAt) {
      unlockState.firstVisitAt = Date.now();
    }
    unlockState.visitCount += 1;

    this.regionTimeStart.set(regionId, Date.now());

    SaveManager.getInstance().saveGame(state);

    EventManager.getInstance().emit('region:entered', {
      regionId,
      regionName: config.name,
      previousRegionId
    });

    const player = (this.scene as any).player as Phaser.Physics.Arcade.Sprite;
    if (player) {
      player.setPosition(config.entryPoint.x, config.entryPoint.y);
      SaveManager.getInstance().updatePlayerPosition(config.entryPoint.x, config.entryPoint.y);
    }

    return true;
  }

  private updateRegionTimeTracking(regionId: string | null): void {
    if (!regionId) return;

    const startTime = this.regionTimeStart.get(regionId);
    if (!startTime) return;

    const state = SaveManager.getInstance().getGameState();
    const unlockState = state.regionUnlockStates.find(s => s.regionId === regionId);
    if (unlockState) {
      unlockState.totalTimeSpent += Date.now() - startTime;
    }
    this.regionTimeStart.delete(regionId);
  }

  public checkAllRegionUnlocks(): void {
    const state = SaveManager.getInstance().getGameState();
    let hasUnlocked = false;

    state.regionUnlockStates.forEach(unlockState => {
      if (unlockState.isUnlocked) return;

      const config = this.regionConfigs.find(r => r.id === unlockState.regionId);
      if (!config) return;

      const allConditionsMet = config.unlockConditions.every(condition =>
        this.checkCondition(state, condition)
      );

      if (allConditionsMet) {
        this.unlockRegion(state, unlockState, config);
        hasUnlocked = true;
      }
    });

    if (hasUnlocked) {
      SaveManager.getInstance().saveGame(state);
    }
  }

  private checkCondition(state: GameState, condition: RegionUnlockCondition): boolean {
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
        const targetRegionState = state.regionUnlockStates.find(s => s.regionId === condition.target);
        return targetRegionState?.isUnlocked ?? false;

      case RegionUnlockConditionType.RECIPE_SYNTHESIZED:
        return state.synthesisRecords.some(r => r.recipeId === condition.target);

      case RegionUnlockConditionType.GOAL_COMPLETED:
        const targetGoal = state.goals.find(g => g.id === condition.target);
        return targetGoal?.status === 'completed' || targetGoal?.status === 'claimed';

      default:
        return false;
    }
  }

  private unlockRegion(state: GameState, unlockState: RegionUnlockState, config: RegionConfig): void {
    unlockState.isUnlocked = true;
    unlockState.unlockedAt = Date.now();

    EventManager.getInstance().emit('region:unlocked', {
      regionId: config.id,
      regionName: config.name
    });
  }

  public getMissingConditions(regionId: string): string[] {
    const state = SaveManager.getInstance().getGameState();
    const config = this.regionConfigs.find(r => r.id === regionId);
    if (!config) return [];

    return config.unlockConditions
      .filter(condition => !this.checkCondition(state, condition))
      .map(condition => condition.description);
  }

  public getConditionProgress(regionId: string, conditionIndex: number): { current: number; target: number } {
    const state = SaveManager.getInstance().getGameState();
    const config = this.regionConfigs.find(r => r.id === regionId);
    if (!config || !config.unlockConditions[conditionIndex]) {
      return { current: 0, target: 0 };
    }

    const condition = config.unlockConditions[conditionIndex];
    let target = condition.targetCount || 0;
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
        target = 1;
        break;
    }

    return { current, target };
  }

  public isRegionUnlocked(regionId: string): boolean {
    const state = SaveManager.getInstance().getGameState();
    const unlockState = state.regionUnlockStates.find(s => s.regionId === regionId);
    return unlockState?.isUnlocked ?? false;
  }

  public isPositionInLockedRegion(x: number, y: number): boolean {
    const state = SaveManager.getInstance().getGameState();
    for (const config of this.regionConfigs) {
      const unlockState = state.regionUnlockStates.find(s => s.regionId === config.id);
      if (unlockState?.isUnlocked) continue;

      if (x >= config.x && x <= config.x + config.width &&
          y >= config.y && y <= config.y + config.height) {
        return true;
      }
    }
    return false;
  }

  public findRegionAtPosition(x: number, y: number): RegionConfig | null {
    for (const config of this.regionConfigs) {
      if (x >= config.x && x <= config.x + config.width &&
          y >= config.y && y <= config.y + config.height) {
        return config;
      }
    }
    return null;
  }

  public clampToUnlockedRegion(x: number, y: number): Position {
    if (!this.isPositionInLockedRegion(x, y)) {
      return { x, y };
    }

    const state = SaveManager.getInstance().getGameState();
    let nearestX = x;
    let nearestY = y;
    let minDist = Infinity;

    for (const config of this.regionConfigs) {
      const unlockState = state.regionUnlockStates.find(s => s.regionId === config.id);
      if (!unlockState?.isUnlocked) continue;

      const clampedX = Phaser.Math.Clamp(x, config.x + 10, config.x + config.width - 10);
      const clampedY = Phaser.Math.Clamp(y, config.y + 10, config.y + config.height - 10);
      const dist = Phaser.Math.Distance.Between(x, y, clampedX, clampedY);

      if (dist < minDist) {
        minDist = dist;
        nearestX = clampedX;
        nearestY = clampedY;
      }
    }

    return { x: nearestX, y: nearestY };
  }

  private refreshRegionVisuals(): void {
    this.lockedRegionOverlays.forEach((overlay, regionId) => {
      if (this.isRegionUnlocked(regionId)) {
        overlay.destroy();
        this.lockedRegionOverlays.delete(regionId);
      }
    });

    this.entranceVisuals.forEach((container, key) => {
      const regionId = container.getData('regionId') as string;
      const graphics = container.list[0] as Phaser.GameObjects.Graphics;
      const arrowText = container.list[1] as Phaser.GameObjects.Text;
      const isUnlocked = this.isRegionUnlocked(regionId);

      if (graphics) {
        graphics.clear();
        const color = isUnlocked ? 0xa8e6cf : 0x666666;
        const entrance = container.getData('entrance') as RegionEntrance;
        graphics.fillStyle(color, isUnlocked ? 0.8 : 0.4);
        graphics.fillRoundedRect(
          -entrance.width / 2,
          -entrance.height / 2,
          entrance.width,
          entrance.height,
          8
        );
      }

      if (arrowText) {
        arrowText.setText(isUnlocked ? '→' : '🔒');
      }
    });
  }

  public getRegionConfig(regionId: string): RegionConfig | undefined {
    return this.regionConfigs.find(r => r.id === regionId);
  }

  public getAllRegionConfigs(): RegionConfig[] {
    return this.regionConfigs;
  }

  public update(time: number, delta: number): void {
    const state = SaveManager.getInstance().getGameState();
    if (state.currentRegionId && !this.regionTimeStart.has(state.currentRegionId)) {
      this.regionTimeStart.set(state.currentRegionId, Date.now());
    }
  }

  public destroy(): void {
    this.updateRegionTimeTracking(SaveManager.getInstance().getGameState().currentRegionId);

    this.eventListeners.forEach(({ event, callback }) => {
      EventManager.getInstance().off(event as keyof import('../types').GameEvents, callback);
    });
    this.eventListeners = [];

    this.entranceVisuals.forEach(container => container.destroy());
    this.entranceVisuals.clear();

    this.lockedRegionOverlays.forEach(overlay => overlay.destroy());
    this.lockedRegionOverlays.clear();

    this.regionTimeStart.clear();
  }
}
