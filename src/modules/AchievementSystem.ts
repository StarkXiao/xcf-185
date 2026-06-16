import Phaser from 'phaser';
import {
  AchievementConditionType,
  AchievementConfig,
  AchievementState,
  PetalType,
  GalleryCategory,
  GalleryItem
} from '../types';
import {
  ACHIEVEMENT_CONFIGS,
  PETAL_CONFIGS,
  REGION_CONFIGS,
  GALLERY_ITEMS
} from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { EventManager } from '../managers/EventManager';

export class AchievementSystem {
  private scene: Phaser.Scene;
  private saveManager: SaveManager;
  private eventManager: EventManager;
  private eventListeners: Array<{ event: string; callback: (data: any) => void }> = [];
  private consecutiveNoFailureStreak: number = 0;
  private totalVisitorInteractions: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.saveManager = SaveManager.getInstance();
    this.eventManager = EventManager.getInstance();
  }

  public create(): void {
    this.setupEventListeners();
    this.initializeGalleryFromExistingData();
    this.checkAllAchievementsOnLoad();
  }

  private setupEventListeners(): void {
    this.addEventListener('petal:collected', (data: any) => this.handlePetalCollected(data));
    this.addEventListener('petal:unlocked', (data: any) => this.handlePetalUnlocked(data));
    this.addEventListener('synthesis:complete', (data: any) => this.handleSynthesisComplete(data));
    this.addEventListener('synthesis:failed', (data: any) => this.handleSynthesisFailed(data));
    this.addEventListener('region:unlocked', (data: any) => this.handleRegionUnlocked(data));
    this.addEventListener('mutation:discovered', (data: any) => this.handleMutationDiscovered(data));
    this.addEventListener('game:complete', () => this.handleGameComplete());
    this.addEventListener('visitor:interaction', () => this.handleVisitorInteraction());
    this.addEventListener('playtime:update', (data: any) => this.handlePlaytimeUpdate(data));
    this.addEventListener('gallery:view', () => this.saveManager.markGalleryViewed());
    this.addEventListener('achievement:view', () => this.saveManager.markAllAchievementsViewed());
  }

  private addEventListener(event: string, callback: (data: any) => void): void {
    this.eventManager.on(event as any, callback);
    this.eventListeners.push({ event, callback });
  }

  private handlePetalCollected(data: { petalType: PetalType; count: number; regionId?: string }): void {
    const state = this.saveManager.getGameState();
    
    this.updateAchievementsByCondition(AchievementConditionType.TOTAL_COLLECTED, state.totalCollected);
    this.updateAchievementsByCondition(AchievementConditionType.PETAL_COLLECTED, state.petals[data.petalType] || 0, data.petalType);
    
    if (state.consecutiveCollect && state.consecutiveCollect.count >= 1) {
      this.updateAchievementsByCondition(
        AchievementConditionType.CONSECUTIVE_COLLECT, 
        state.consecutiveCollect.count
      );
    }
    
    this.checkMidnightMoonlight(data.petalType);
    this.discoverPetalInGallery(data.petalType);
    
    this.consecutiveNoFailureStreak++;
    if (this.consecutiveNoFailureStreak >= 100) {
      this.saveManager.unlockAchievement('ach_hidden_perfect_day');
    }
  }

  private handlePetalUnlocked(data: { petalType: PetalType }): void {
    const state = this.saveManager.getGameState();
    
    this.updateAchievementsByCondition(AchievementConditionType.PETAL_UNLOCKED, state.unlockedPetals.length, data.petalType);
    
    const normalPetals = Object.values(PETAL_CONFIGS).filter(p => p.category === 'normal');
    const unlockedNormal = normalPetals.filter(p => state.unlockedPetals.includes(p.type));
    if (unlockedNormal.length >= normalPetals.length) {
      this.saveManager.unlockAchievement('ach_all_normal');
    }
    
    this.discoverPetalInGallery(data.petalType);
  }

  private handleSynthesisComplete(data: any): void {
    const state = this.saveManager.getGameState();
    this.updateAchievementsByCondition(AchievementConditionType.TOTAL_SYNTHESIZED, state.totalSynthesized);
    
    if (data.recipeId) {
      this.updateAchievementsByCondition(AchievementConditionType.RECIPE_SYNTHESIZED, 1, data.recipeId);
      this.discoverRecipeInGallery(data.recipeId);
    }
  }

  private handleSynthesisFailed(data: any): void {
    this.consecutiveNoFailureStreak = 0;
    
    const state = this.saveManager.getGameState();
    if (state.totalFailures === 1) {
      this.saveManager.unlockAchievement('ach_hidden_first_failure');
    }
    
    if (data.failedType) {
      this.discoverPetalInGallery(data.failedType);
    }
    
    const failedPetals = Object.values(PETAL_CONFIGS).filter(p => p.isFailed);
    const discoveredFailed = failedPetals.filter(p => state.discoveredFailures.includes(p.type));
    if (discoveredFailed.length >= failedPetals.length) {
      this.saveManager.unlockAchievement('ach_all_failed');
    }
  }

  private handleRegionUnlocked(data: { regionId: string }): void {
    this.updateAchievementsByCondition(AchievementConditionType.REGION_UNLOCKED, 1, data.regionId);
    this.discoverRegionInGallery(data.regionId);
    
    const state = this.saveManager.getGameState();
    const unlockedRegions = state.regionUnlockStates.filter(r => r.isUnlocked);
    if (unlockedRegions.length >= REGION_CONFIGS.length) {
      this.saveManager.unlockAchievement('ach_all_regions');
    }
  }

  private handleMutationDiscovered(data: { petalType: PetalType }): void {
    this.updateAchievementsByCondition(AchievementConditionType.MUTATION_DISCOVERED, 1, data.petalType);
    this.discoverPetalInGallery(data.petalType);
    
    const state = this.saveManager.getGameState();
    const mutationPetals = Object.values(PETAL_CONFIGS).filter(p => p.isMutation);
    const discoveredMutations = mutationPetals.filter(p => state.discoveredMutations.includes(p.type));
    if (discoveredMutations.length >= mutationPetals.length) {
      this.saveManager.unlockAchievement('ach_all_mutation');
    }
  }

  private handleGameComplete(): void {
    this.saveManager.unlockAchievement('ach_game_complete');
  }

  private handleVisitorInteraction(): void {
    this.totalVisitorInteractions++;
    this.updateAchievementsByCondition(AchievementConditionType.VISITOR_INTERACTIONS, this.totalVisitorInteractions);
  }

  private handlePlaytimeUpdate(data: { playTime: number }): void {
    this.updateAchievementsByCondition(AchievementConditionType.PLAY_TIME, Math.floor(data.playTime));
  }

  private checkMidnightMoonlight(petalType: PetalType): void {
    if (petalType !== PetalType.MOONLIGHT) return;
    
    const now = new Date();
    const hour = now.getHours();
    if (hour >= 0 && hour < 2) {
      this.saveManager.unlockAchievement('ach_hidden_moonlight_special');
    }
  }

  private updateAchievementsByCondition(
    conditionType: AchievementConditionType,
    currentCount: number,
    target?: string | PetalType
  ): void {
    const achievements = ACHIEVEMENT_CONFIGS.filter(config => {
      const state = this.saveManager.getAchievementState(config.id);
      if (!state || state.isUnlocked) return false;
      
      return config.conditions.some(cond => {
        if (cond.type !== conditionType) return false;
        if (target && cond.target && cond.target !== target) return false;
        return true;
      });
    });

    achievements.forEach(config => {
      this.saveManager.updateAchievementProgress(config.id, currentCount);
    });
  }

  private checkAllAchievementsOnLoad(): void {
    const state = this.saveManager.getGameState();
    
    this.updateAchievementsByCondition(AchievementConditionType.TOTAL_COLLECTED, state.totalCollected);
    this.updateAchievementsByCondition(AchievementConditionType.TOTAL_SYNTHESIZED, state.totalSynthesized);
    this.updateAchievementsByCondition(AchievementConditionType.PLAY_TIME, Math.floor(state.playTime));
    
    const normalPetals = Object.values(PETAL_CONFIGS).filter(p => p.category === 'normal');
    const unlockedNormal = normalPetals.filter(p => state.unlockedPetals.includes(p.type));
    if (unlockedNormal.length >= normalPetals.length) {
      this.saveManager.unlockAchievement('ach_all_normal');
    }
    
    const mutationPetals = Object.values(PETAL_CONFIGS).filter(p => p.isMutation);
    const discoveredMutations = mutationPetals.filter(p => state.discoveredMutations.includes(p.type));
    if (discoveredMutations.length >= mutationPetals.length) {
      this.saveManager.unlockAchievement('ach_all_mutation');
    }
    
    const failedPetals = Object.values(PETAL_CONFIGS).filter(p => p.isFailed);
    const discoveredFailed = failedPetals.filter(p => state.discoveredFailures.includes(p.type));
    if (discoveredFailed.length >= failedPetals.length) {
      this.saveManager.unlockAchievement('ach_all_failed');
    }
    
    const unlockedRegions = state.regionUnlockStates.filter(r => r.isUnlocked);
    if (unlockedRegions.length >= REGION_CONFIGS.length) {
      this.saveManager.unlockAchievement('ach_all_regions');
    }
    
    if (state.isCompleted) {
      this.saveManager.unlockAchievement('ach_game_complete');
    }
    
    if (state.totalFailures >= 1) {
      this.saveManager.unlockAchievement('ach_hidden_first_failure');
    }
  }

  private initializeGalleryFromExistingData(): void {
    const state = this.saveManager.getGameState();
    
    state.unlockedPetals.forEach(petalType => this.discoverPetalInGallery(petalType));
    state.discoveredMutations.forEach(petalType => this.discoverPetalInGallery(petalType));
    state.discoveredFailures.forEach(petalType => this.discoverPetalInGallery(petalType));
    state.unlockedRecipes.forEach(recipeId => this.discoverRecipeInGallery(recipeId));
    state.regionUnlockStates.filter(r => r.isUnlocked).forEach(r => this.discoverRegionInGallery(r.regionId));
  }

  private discoverPetalInGallery(petalType: PetalType): void {
    const petalConfig = Object.values(PETAL_CONFIGS).find(p => p.type === petalType);
    if (!petalConfig) return;

    let category: GalleryCategory;
    if (petalConfig.isMutation) {
      category = GalleryCategory.MUTATION;
    } else if (petalConfig.isFailed) {
      category = GalleryCategory.FAILED;
    } else {
      category = GalleryCategory.NORMAL;
    }
    
    const prefix = petalConfig.isMutation ? 'mutation_' : petalConfig.isFailed ? 'failed_' : 'petal_';
    this.saveManager.discoverGalleryItem(`${prefix}${petalType}`, category);
  }

  private discoverRecipeInGallery(recipeId: string): void {
    this.saveManager.discoverGalleryItem(`recipe_${recipeId}`, GalleryCategory.RECIPE);
  }

  private discoverRegionInGallery(regionId: string): void {
    this.saveManager.discoverGalleryItem(`region_${regionId}`, GalleryCategory.REGION);
  }

  public getAchievementsByCategory(category: string): { config: AchievementConfig; state: AchievementState | undefined }[] {
    return ACHIEVEMENT_CONFIGS
      .filter(config => config.category === category || category === 'all')
      .sort((a, b) => a.order - b.order)
      .map(config => ({
        config,
        state: this.saveManager.getAchievementState(config.id)
      }));
  }

  public getAchievementStats(): { total: number; unlocked: number; claimed: number } {
    const states = this.saveManager.getAchievementStates();
    return {
      total: ACHIEVEMENT_CONFIGS.length,
      unlocked: states.filter(s => s.isUnlocked).length,
      claimed: states.filter(s => s.isClaimed).length
    };
  }

  public getGalleryStats(): { total: number; discovered: number; byCategory: Record<string, { total: number; discovered: number }> } {
    const progress = this.saveManager.getGalleryProgress();
    const byCategory: Record<string, { total: number; discovered: number }> = {};
    
    Object.values(GalleryCategory).forEach(cat => {
      const items = GALLERY_ITEMS.filter(i => i.category === cat);
      byCategory[cat] = {
        total: items.length,
        discovered: items.filter(i => progress.discoveredItems.includes(i.id)).length
      };
    });

    return {
      total: GALLERY_ITEMS.length,
      discovered: progress.discoveredItems.length,
      byCategory
    };
  }

  public getGalleryItemsByCategory(category: GalleryCategory): { item: GalleryItem; isDiscovered: boolean }[] {
    const progress = this.saveManager.getGalleryProgress();
    return GALLERY_ITEMS
      .filter(i => i.category === category)
      .map(item => ({
        item,
        isDiscovered: progress.discoveredItems.includes(item.id)
      }));
  }

  public destroy(): void {
    this.eventListeners.forEach(({ event, callback }) => {
      this.eventManager.off(event as any, callback);
    });
    this.eventListeners = [];
  }
}
