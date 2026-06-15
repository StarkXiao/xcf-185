import Phaser from 'phaser';
import {
  PetalType,
  WorkshopRecipe,
  WorkshopState,
  WorkshopRecipeState,
  WorkshopActiveJob,
  WorkshopProductionRecord,
  WorkshopProductionStats,
  ProcessingType
} from '../types';
import {
  WORKSHOP_RECIPES,
  WORKSHOP_MAX_RECORDS,
  WORKSHOP_MAX_ACTIVE_JOBS,
  PETAL_CONFIGS
} from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { EventManager } from '../managers/EventManager';

export class PetalWorkshopSystem {
  private scene: Phaser.Scene;
  private recipes: WorkshopRecipe[] = [];
  private eventListeners: Array<{ event: string; callback: (data: any) => void }> = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.recipes = [...WORKSHOP_RECIPES];
  }

  public create(): void {
    const onPetalCollected = (data: { type: PetalType; count: number }) => {
      this.checkRecipeUnlocks(data.type);
    };
    EventManager.getInstance().on('petal:collected', onPetalCollected);
    this.eventListeners.push({ event: 'petal:collected', callback: onPetalCollected });

    this.checkAllRecipeUnlocks();
    this.validateWorkshopState();
    this.restoreActiveJobs();
  }

  private checkAllRecipeUnlocks(): void {
    const state = SaveManager.getInstance().getGameState();
    const workshop = state.workshopState;
    let hasUnlock = false;

    this.recipes.forEach(recipe => {
      const recipeState = workshop.recipeStates.find(rs => rs.recipeId === recipe.id);
      if (recipeState && !recipeState.isUnlocked) {
        const unlocked = recipe.unlockCondition.every(cond => 
          (state.petals[cond.type] || 0) >= cond.count
        );
        if (unlocked) {
          recipeState.isUnlocked = true;
          hasUnlock = true;
          EventManager.getInstance().emit('workshop:recipe_unlocked', { recipeId: recipe.id });
        }
      }
    });

    if (hasUnlock) {
      SaveManager.getInstance().saveGame(state);
    }
  }

  private checkRecipeUnlocks(petalType: PetalType): void {
    const state = SaveManager.getInstance().getGameState();
    const workshop = state.workshopState;
    let hasUnlock = false;

    this.recipes.forEach(recipe => {
      const needsThisPetal = recipe.unlockCondition.some(c => c.type === petalType);
      if (!needsThisPetal) return;

      const recipeState = workshop.recipeStates.find(rs => rs.recipeId === recipe.id);
      if (recipeState && !recipeState.isUnlocked) {
        const unlocked = recipe.unlockCondition.every(cond => 
          (state.petals[cond.type] || 0) >= cond.count
        );
        if (unlocked) {
          recipeState.isUnlocked = true;
          hasUnlock = true;
          EventManager.getInstance().emit('workshop:recipe_unlocked', { recipeId: recipe.id });
        }
      }
    });

    if (hasUnlock) {
      SaveManager.getInstance().saveGame(state);
    }
  }

  private validateWorkshopState(): void {
    const state = SaveManager.getInstance().getGameState();
    const workshop = state.workshopState;
    let hasFix = false;

    if (!workshop.recipeStates || !Array.isArray(workshop.recipeStates)) {
      workshop.recipeStates = WORKSHOP_RECIPES.map(recipe => ({
        recipeId: recipe.id,
        isUnlocked: recipe.unlockCondition.length === 0,
        currentLevel: 1,
        totalProduced: 0,
        totalBatchRuns: 0,
        lastProducedAt: 0
      }));
      hasFix = true;
    } else {
      const existingIds = new Set(workshop.recipeStates.map(rs => rs.recipeId));
      WORKSHOP_RECIPES.forEach(recipe => {
        if (!existingIds.has(recipe.id)) {
          workshop.recipeStates.push({
            recipeId: recipe.id,
            isUnlocked: false,
            currentLevel: 1,
            totalProduced: 0,
            totalBatchRuns: 0,
            lastProducedAt: 0
          });
          hasFix = true;
        }
      });

      workshop.recipeStates = workshop.recipeStates.filter(rs => {
        const recipe = this.recipes.find(r => r.id === rs.recipeId);
        if (!recipe) return false;
        if (typeof rs.currentLevel !== 'number' || rs.currentLevel < 1 || rs.currentLevel > 5) {
          rs.currentLevel = 1;
          hasFix = true;
        }
        if (typeof rs.totalProduced !== 'number' || rs.totalProduced < 0) {
          rs.totalProduced = 0;
          hasFix = true;
        }
        if (typeof rs.totalBatchRuns !== 'number' || rs.totalBatchRuns < 0) {
          rs.totalBatchRuns = 0;
          hasFix = true;
        }
        return true;
      });
    }

    if (!workshop.activeJobs || !Array.isArray(workshop.activeJobs)) {
      workshop.activeJobs = [];
      hasFix = true;
    } else {
      const now = Date.now();
      const seenRecipeIds = new Set<string>();
      const validJobs: WorkshopActiveJob[] = [];

      workshop.activeJobs.forEach(job => {
        const recipe = this.recipes.find(r => r.id === job.recipeId);
        if (!recipe) return;
        if (typeof job.batchCount !== 'number' || job.batchCount < 1 || job.batchCount > recipe.batchMax) return;
        if (typeof job.startTime !== 'number' || job.startTime <= 0) return;
        if (typeof job.duration !== 'number' || job.duration <= 0) return;

        if (job.startTime > now) {
          job.startTime = now - job.duration;
          hasFix = true;
        }

        const recipeState = workshop.recipeStates.find(rs => rs.recipeId === job.recipeId);
        if (!recipeState || !recipeState.isUnlocked) return;

        const expectedDuration = recipe.processingTime * job.batchCount;
        if (job.duration !== expectedDuration) {
          job.duration = expectedDuration;
          hasFix = true;
        }

        if (seenRecipeIds.has(job.recipeId)) return;
        seenRecipeIds.add(job.recipeId);

        validJobs.push(job);
      });

      if (validJobs.length !== workshop.activeJobs.length) {
        workshop.activeJobs = validJobs;
        hasFix = true;
      }
      if (workshop.activeJobs.length > WORKSHOP_MAX_ACTIVE_JOBS) {
        workshop.activeJobs = workshop.activeJobs.slice(0, WORKSHOP_MAX_ACTIVE_JOBS);
        hasFix = true;
      }
    }

    if (!workshop.productionStats || typeof workshop.productionStats !== 'object') {
      workshop.productionStats = {
        totalProcessed: 0,
        totalOutput: 0,
        totalBatchOperations: 0,
        totalUpgrades: 0,
        averageOutputPerRun: 0,
        recipesByProcessingType: {
          [ProcessingType.REFINING]: 0,
          [ProcessingType.PURIFYING]: 0,
          [ProcessingType.ENHANCING]: 0
        },
        peakBatchSize: 0,
        totalProcessingTime: 0
      };
      hasFix = true;
    } else {
      const stats = workshop.productionStats;
      if (typeof stats.totalProcessed !== 'number' || stats.totalProcessed < 0) { stats.totalProcessed = 0; hasFix = true; }
      if (typeof stats.totalOutput !== 'number' || stats.totalOutput < 0) { stats.totalOutput = 0; hasFix = true; }
      if (typeof stats.totalBatchOperations !== 'number' || stats.totalBatchOperations < 0) { stats.totalBatchOperations = 0; hasFix = true; }
      if (typeof stats.totalUpgrades !== 'number' || stats.totalUpgrades < 0) { stats.totalUpgrades = 0; hasFix = true; }
      if (typeof stats.peakBatchSize !== 'number' || stats.peakBatchSize < 0) { stats.peakBatchSize = 0; hasFix = true; }
      if (typeof stats.totalProcessingTime !== 'number' || stats.totalProcessingTime < 0) { stats.totalProcessingTime = 0; hasFix = true; }
      if (!stats.recipesByProcessingType || typeof stats.recipesByProcessingType !== 'object') {
        stats.recipesByProcessingType = {
          [ProcessingType.REFINING]: 0,
          [ProcessingType.PURIFYING]: 0,
          [ProcessingType.ENHANCING]: 0
        };
        hasFix = true;
      } else {
        [ProcessingType.REFINING, ProcessingType.PURIFYING, ProcessingType.ENHANCING].forEach(type => {
          if (typeof stats.recipesByProcessingType[type] !== 'number' || stats.recipesByProcessingType[type] < 0) {
            stats.recipesByProcessingType[type] = 0;
            hasFix = true;
          }
        });
      }
      if (stats.totalBatchOperations > 0) {
        const expectedAvg = stats.totalOutput / stats.totalBatchOperations;
        if (Math.abs(stats.averageOutputPerRun - expectedAvg) > 0.1) {
          stats.averageOutputPerRun = expectedAvg;
          hasFix = true;
        }
      } else if (stats.averageOutputPerRun !== 0) {
        stats.averageOutputPerRun = 0;
        hasFix = true;
      }
    }

    if (!workshop.productionRecords || !Array.isArray(workshop.productionRecords)) {
      workshop.productionRecords = [];
      hasFix = true;
    } else if (workshop.productionRecords.length > WORKSHOP_MAX_RECORDS) {
      workshop.productionRecords = workshop.productionRecords.slice(0, WORKSHOP_MAX_RECORDS);
      hasFix = true;
    }

    if (hasFix) {
      SaveManager.getInstance().saveGame(state);
    }
  }

  private restoreActiveJobs(): void {
    const state = SaveManager.getInstance().getGameState();
    const workshop = state.workshopState;
    const now = Date.now();

    const completedJobs: WorkshopActiveJob[] = [];
    const ongoingJobs: WorkshopActiveJob[] = [];

    workshop.activeJobs.forEach(job => {
      const elapsed = now - job.startTime;
      if (elapsed >= job.duration) {
        completedJobs.push(job);
      } else {
        ongoingJobs.push(job);
      }
    });

    workshop.activeJobs = ongoingJobs;

    completedJobs.forEach(job => {
      this.settleOfflineCompletedJob(job);
    });

    ongoingJobs.forEach(job => {
      const recipe = this.recipes.find(r => r.id === job.recipeId);
      if (!recipe) return;

      const elapsed = now - job.startTime;
      const remaining = job.duration - elapsed;

      const progress = elapsed / job.duration;
      this.playProcessingAnimationResume(recipe, job, progress);

      this.scene.time.delayedCall(remaining, () => {
        this.completeProcessing(job.id);
      });
    });

    if (completedJobs.length > 0 || ongoingJobs.length > 0) {
      SaveManager.getInstance().saveGame(state);
    }
  }

  private settleOfflineCompletedJob(job: WorkshopActiveJob): void {
    const state = SaveManager.getInstance().getGameState();
    const workshop = state.workshopState;
    const recipe = this.recipes.find(r => r.id === job.recipeId);
    if (!recipe) return;

    const effectiveSuccessRate = this.getEffectiveSuccessRate(job.recipeId);
    const effectiveOutput = this.getEffectiveOutputCount(job.recipeId);

    let totalOutput = 0;
    for (let i = 0; i < job.batchCount; i++) {
      if (Math.random() <= effectiveSuccessRate) {
        totalOutput += effectiveOutput;
      }
    }

    if (totalOutput > 0) {
      SaveManager.getInstance().addPetal(recipe.output.type, totalOutput);
    }

    const recipeState = workshop.recipeStates.find(rs => rs.recipeId === job.recipeId);
    if (recipeState) {
      recipeState.totalProduced += totalOutput;
      recipeState.totalBatchRuns += 1;
      recipeState.lastProducedAt = Date.now();
    }

    this.updateProductionStats(workshop, recipe, job.batchCount, totalOutput, job);

    const record: WorkshopProductionRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      recipeId: job.recipeId,
      batchCount: job.batchCount,
      resultType: recipe.output.type,
      resultCount: totalOutput,
      timestamp: Date.now(),
      processingTime: job.duration,
      wasUpgraded: job.isUpgraded
    };

    workshop.productionRecords.unshift(record);
    if (workshop.productionRecords.length > WORKSHOP_MAX_RECORDS) {
      workshop.productionRecords = workshop.productionRecords.slice(0, WORKSHOP_MAX_RECORDS);
    }

    if (totalOutput > 0) {
      EventManager.getInstance().emit('workshop:processing_complete', {
        recipeId: job.recipeId,
        batchCount: job.batchCount,
        outputType: recipe.output.type,
        outputCount: totalOutput
      });
      if (job.batchCount > 1) {
        EventManager.getInstance().emit('workshop:batch_complete', {
          recipeId: job.recipeId,
          totalBatches: job.batchCount,
          totalOutput: totalOutput
        });
      }
    }

    EventManager.getInstance().emit('workshop:stats_updated', { stats: workshop.productionStats });
  }

  public canProcess(recipeId: string, batchCount: number = 1): boolean {
    const recipe = this.recipes.find(r => r.id === recipeId);
    if (!recipe) return false;

    const state = SaveManager.getInstance().getGameState();
    const recipeState = state.workshopState.recipeStates.find(rs => rs.recipeId === recipeId);
    if (!recipeState || !recipeState.isUnlocked) return false;

    if (batchCount < 1 || batchCount > recipe.batchMax) return false;

    const workshop = state.workshopState;
    if (workshop.activeJobs.length >= WORKSHOP_MAX_ACTIVE_JOBS) return false;

    const existingJob = workshop.activeJobs.find(j => j.recipeId === recipeId);
    if (existingJob) return false;

    return recipe.inputs.every(input => 
      (state.petals[input.type] || 0) >= input.count * batchCount
    );
  }

  public startProcessing(recipeId: string, batchCount: number = 1): boolean {
    if (!this.canProcess(recipeId, batchCount)) return false;

    const recipe = this.recipes.find(r => r.id === recipeId)!;
    const state = SaveManager.getInstance().getGameState();
    const workshop = state.workshopState;
    const recipeState = workshop.recipeStates.find(rs => rs.recipeId === recipeId)!;

    recipe.inputs.forEach(input => {
      SaveManager.getInstance().removePetals(input.type, input.count * batchCount);
    });

    const effectiveSuccessRate = this.getEffectiveSuccessRate(recipeId);
    const totalDuration = recipe.processingTime * batchCount;

    const job: WorkshopActiveJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      recipeId,
      batchCount,
      startTime: Date.now(),
      duration: totalDuration,
      isUpgraded: recipeState.currentLevel > 1
    };

    workshop.activeJobs.push(job);

    SaveManager.getInstance().saveGame(state);

    EventManager.getInstance().emit('workshop:processing_start', { recipeId, batchCount });
    EventManager.getInstance().emit('audio:play', { key: 'sfx_synthesis', volume: 0.4 });

    this.playProcessingAnimation(recipe, batchCount, job);

    this.scene.time.delayedCall(totalDuration, () => {
      this.completeProcessing(job.id);
    });

    return true;
  }

  private getEffectiveSuccessRate(recipeId: string): number {
    const recipe = this.recipes.find(r => r.id === recipeId);
    if (!recipe) return 0;

    const state = SaveManager.getInstance().getGameState();
    const recipeState = state.workshopState.recipeStates.find(rs => rs.recipeId === recipeId);
    const level = recipeState?.currentLevel || 1;

    return Math.min(1, recipe.successRate + (level - 1) * recipe.upgradeSuccessRateBonus);
  }

  private getEffectiveOutputCount(recipeId: string): number {
    const recipe = this.recipes.find(r => r.id === recipeId);
    if (!recipe) return 0;

    const state = SaveManager.getInstance().getGameState();
    const recipeState = state.workshopState.recipeStates.find(rs => rs.recipeId === recipeId);
    const level = recipeState?.currentLevel || 1;

    return recipe.output.count + (level - 1) * recipe.upgradeOutputBonus;
  }

  private completeProcessing(jobId: string): void {
    const state = SaveManager.getInstance().getGameState();
    const workshop = state.workshopState;

    const jobIndex = workshop.activeJobs.findIndex(j => j.id === jobId);
    if (jobIndex === -1) return;

    const job = workshop.activeJobs[jobIndex];
    const recipe = this.recipes.find(r => r.id === job.recipeId);
    if (!recipe) return;

    workshop.activeJobs.splice(jobIndex, 1);

    const effectiveSuccessRate = this.getEffectiveSuccessRate(job.recipeId);
    const effectiveOutput = this.getEffectiveOutputCount(job.recipeId);

    let totalOutput = 0;
    let successCount = 0;

    for (let i = 0; i < job.batchCount; i++) {
      if (Math.random() <= effectiveSuccessRate) {
        totalOutput += effectiveOutput;
        successCount++;
      }
    }

    if (totalOutput > 0) {
      SaveManager.getInstance().addPetal(recipe.output.type, totalOutput);
    }

    const recipeState = workshop.recipeStates.find(rs => rs.recipeId === job.recipeId);
    if (recipeState) {
      recipeState.totalProduced += totalOutput;
      recipeState.totalBatchRuns += 1;
      recipeState.lastProducedAt = Date.now();
    }

    this.updateProductionStats(workshop, recipe, job.batchCount, totalOutput, job);

    const record: WorkshopProductionRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      recipeId: job.recipeId,
      batchCount: job.batchCount,
      resultType: recipe.output.type,
      resultCount: totalOutput,
      timestamp: Date.now(),
      processingTime: job.duration,
      wasUpgraded: job.isUpgraded
    };

    workshop.productionRecords.unshift(record);
    if (workshop.productionRecords.length > WORKSHOP_MAX_RECORDS) {
      workshop.productionRecords = workshop.productionRecords.slice(0, WORKSHOP_MAX_RECORDS);
    }

    if (totalOutput > 0) {
      const outputConfig = PETAL_CONFIGS[recipe.output.type];
      EventManager.getInstance().emit('workshop:processing_complete', {
        recipeId: job.recipeId,
        batchCount: job.batchCount,
        outputType: recipe.output.type,
        outputCount: totalOutput
      });

      if (job.batchCount > 1) {
        EventManager.getInstance().emit('workshop:batch_complete', {
          recipeId: job.recipeId,
          totalBatches: job.batchCount,
          totalOutput: totalOutput
        });
      }

      EventManager.getInstance().emit('audio:play', { key: 'sfx_synthesis', volume: 0.5 });
      this.playCompletionAnimation(recipe, totalOutput);
    } else {
      EventManager.getInstance().emit('audio:play', { key: 'sfx_synthesis_fail', volume: 0.4 });
      this.playFailAnimation(recipe);
    }

    EventManager.getInstance().emit('workshop:stats_updated', { stats: workshop.productionStats });
    SaveManager.getInstance().saveGame(state);
  }

  private updateProductionStats(
    workshop: WorkshopState,
    recipe: WorkshopRecipe,
    batchCount: number,
    totalOutput: number,
    job: WorkshopActiveJob
  ): void {
    const stats = workshop.productionStats;

    stats.totalProcessed += batchCount;
    stats.totalOutput += totalOutput;
    stats.totalBatchOperations += 1;
    stats.totalProcessingTime += job.duration;

    if (batchCount > stats.peakBatchSize) {
      stats.peakBatchSize = batchCount;
    }

    stats.recipesByProcessingType[recipe.processingType] = 
      (stats.recipesByProcessingType[recipe.processingType] || 0) + 1;

    stats.averageOutputPerRun = stats.totalBatchOperations > 0
      ? stats.totalOutput / stats.totalBatchOperations
      : 0;
  }

  public canUpgradeRecipe(recipeId: string): boolean {
    const recipe = this.recipes.find(r => r.id === recipeId);
    if (!recipe) return false;

    const state = SaveManager.getInstance().getGameState();
    const recipeState = state.workshopState.recipeStates.find(rs => rs.recipeId === recipeId);
    if (!recipeState || !recipeState.isUnlocked) return false;

    if (recipeState.currentLevel >= 5) return false;

    const upgradeMultiplier = recipeState.currentLevel;
    return recipe.upgradeCost.every(input => 
      (state.petals[input.type] || 0) >= input.count * upgradeMultiplier
    );
  }

  public upgradeRecipe(recipeId: string): boolean {
    if (!this.canUpgradeRecipe(recipeId)) return false;

    const recipe = this.recipes.find(r => r.id === recipeId)!;
    const state = SaveManager.getInstance().getGameState();
    const recipeState = state.workshopState.recipeStates.find(rs => rs.recipeId === recipeId)!;

    const upgradeMultiplier = recipeState.currentLevel;
    recipe.upgradeCost.forEach(input => {
      SaveManager.getInstance().removePetals(input.type, input.count * upgradeMultiplier);
    });

    recipeState.currentLevel += 1;
    state.workshopState.productionStats.totalUpgrades += 1;

    EventManager.getInstance().emit('workshop:recipe_upgrade', {
      recipeId,
      newLevel: recipeState.currentLevel
    });
    EventManager.getInstance().emit('audio:play', { key: 'sfx_synthesis_mutation', volume: 0.5 });
    EventManager.getInstance().emit('workshop:stats_updated', { stats: state.workshopState.productionStats });

    this.playUpgradeAnimation(recipe, recipeState.currentLevel);

    SaveManager.getInstance().saveGame(state);
    return true;
  }

  public getRecipe(recipeId: string): WorkshopRecipe | undefined {
    return this.recipes.find(r => r.id === recipeId);
  }

  public getUnlockedRecipes(): WorkshopRecipe[] {
    const state = SaveManager.getInstance().getGameState();
    return this.recipes.filter(recipe => {
      const rs = state.workshopState.recipeStates.find(s => s.recipeId === recipe.id);
      return rs && rs.isUnlocked;
    });
  }

  public getRecipeState(recipeId: string): WorkshopRecipeState | undefined {
    const state = SaveManager.getInstance().getGameState();
    return state.workshopState.recipeStates.find(rs => rs.recipeId === recipeId);
  }

  public getActiveJobs(): WorkshopActiveJob[] {
    return SaveManager.getInstance().getGameState().workshopState.activeJobs;
  }

  public getProductionStats(): WorkshopProductionStats {
    return SaveManager.getInstance().getGameState().workshopState.productionStats;
  }

  public getProductionRecords(): WorkshopProductionRecord[] {
    return SaveManager.getInstance().getGameState().workshopState.productionRecords;
  }

  public getJobProgress(jobId: string): number {
    const state = SaveManager.getInstance().getGameState();
    const job = state.workshopState.activeJobs.find(j => j.id === jobId);
    if (!job) return 0;

    const elapsed = Date.now() - job.startTime;
    return Math.min(1, elapsed / job.duration);
  }

  public update(time: number, delta: number): void {
    this.checkAllRecipeUnlocks();
  }

  private playProcessingAnimation(recipe: WorkshopRecipe, batchCount: number, job: WorkshopActiveJob): void {
    const camera = this.scene.cameras.main;
    const centerX = camera.scrollX + camera.width / 2;
    const centerY = camera.scrollY + camera.height / 2;

    const colorMap: Record<ProcessingType, number> = {
      [ProcessingType.REFINING]: 0xff9900,
      [ProcessingType.PURIFYING]: 0x66ddff,
      [ProcessingType.ENHANCING]: 0xff66cc
    };
    const color = colorMap[recipe.processingType];

    const circle = this.scene.add.graphics().setDepth(70);
    for (let i = 0; i < 3; i++) {
      circle.lineStyle(3 - i, color, 0.6 - i * 0.15);
      circle.beginPath();
      circle.arc(centerX, centerY, 60 + i * 20, 0, Math.PI * 2);
      circle.strokePath();
    }

    this.scene.tweens.add({
      targets: circle,
      rotation: Math.PI * 4 * batchCount,
      alpha: { from: 0.8, to: 0.3 },
      duration: recipe.processingTime * batchCount,
      ease: 'Linear',
      onComplete: () => circle.destroy()
    });

    const batchSize = this.scene.add.text(centerX, centerY - 40, `×${batchCount}`, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: `#${color.toString(16).padStart(6, '0')}`,
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(71).setScrollFactor(0).setAlpha(0);

    this.scene.tweens.add({
      targets: batchSize,
      alpha: 1,
      duration: 400,
      ease: 'Back.Out'
    });

    this.scene.tweens.add({
      targets: batchSize,
      alpha: 0,
      y: centerY - 60,
      duration: 600,
      delay: recipe.processingTime * batchCount - 600,
      ease: 'Cubic.In',
      onComplete: () => batchSize.destroy()
    });

    const progressBg = this.scene.add.graphics().setDepth(72).setScrollFactor(0);
    const progressBar = this.scene.add.graphics().setDepth(73).setScrollFactor(0);
    const barWidth = 120;
    const barHeight = 8;
    const barX = centerX - barWidth / 2;
    const barY = centerY + 50;

    progressBg.fillStyle(0x000000, 0.6);
    progressBg.fillRoundedRect(barX, barY, barWidth, barHeight, 4);

    const proxy = { progress: 0 };
    this.scene.tweens.add({
      targets: proxy,
      progress: 1,
      duration: recipe.processingTime * batchCount,
      ease: 'Linear',
      onUpdate: () => {
        progressBar.clear();
        progressBar.fillStyle(color, 0.9);
        progressBar.fillRoundedRect(barX, barY, barWidth * proxy.progress, barHeight, 4);
      },
      onComplete: () => {
        progressBg.destroy();
        progressBar.destroy();
      }
    });
  }

  private playProcessingAnimationResume(recipe: WorkshopRecipe, job: WorkshopActiveJob, startProgress: number): void {
    const camera = this.scene.cameras.main;
    const centerX = camera.scrollX + camera.width / 2;
    const centerY = camera.scrollY + camera.height / 2;

    const colorMap: Record<ProcessingType, number> = {
      [ProcessingType.REFINING]: 0xff9900,
      [ProcessingType.PURIFYING]: 0x66ddff,
      [ProcessingType.ENHANCING]: 0xff66cc
    };
    const color = colorMap[recipe.processingType];

    const remainingDuration = job.duration * (1 - startProgress);
    if (remainingDuration <= 0) return;

    const circle = this.scene.add.graphics().setDepth(70);
    for (let i = 0; i < 3; i++) {
      circle.lineStyle(3 - i, color, 0.6 - i * 0.15);
      circle.beginPath();
      circle.arc(centerX, centerY, 60 + i * 20, 0, Math.PI * 2);
      circle.strokePath();
    }
    circle.rotation = Math.PI * 4 * job.batchCount * startProgress;

    this.scene.tweens.add({
      targets: circle,
      rotation: Math.PI * 4 * job.batchCount,
      alpha: { from: 0.8, to: 0.3 },
      duration: remainingDuration,
      ease: 'Linear',
      onComplete: () => circle.destroy()
    });

    const batchSize = this.scene.add.text(centerX, centerY - 40, `×${job.batchCount}`, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: `#${color.toString(16).padStart(6, '0')}`,
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(71).setScrollFactor(0).setAlpha(0.8);

    this.scene.tweens.add({
      targets: batchSize,
      alpha: 0,
      y: centerY - 60,
      duration: Math.min(600, remainingDuration),
      delay: Math.max(0, remainingDuration - 600),
      ease: 'Cubic.In',
      onComplete: () => batchSize.destroy()
    });

    const progressBg = this.scene.add.graphics().setDepth(72).setScrollFactor(0);
    const progressBar = this.scene.add.graphics().setDepth(73).setScrollFactor(0);
    const barWidth = 120;
    const barHeight = 8;
    const barX = centerX - barWidth / 2;
    const barY = centerY + 50;

    progressBg.fillStyle(0x000000, 0.6);
    progressBg.fillRoundedRect(barX, barY, barWidth, barHeight, 4);

    const proxy = { progress: startProgress };
    this.scene.tweens.add({
      targets: proxy,
      progress: 1,
      duration: remainingDuration,
      ease: 'Linear',
      onUpdate: () => {
        progressBar.clear();
        progressBar.fillStyle(color, 0.9);
        progressBar.fillRoundedRect(barX, barY, barWidth * proxy.progress, barHeight, 4);
      },
      onComplete: () => {
        progressBg.destroy();
        progressBar.destroy();
      }
    });
  }

  private playCompletionAnimation(recipe: WorkshopRecipe, totalOutput: number): void {
    const camera = this.scene.cameras.main;
    const centerX = camera.scrollX + camera.width / 2;
    const centerY = camera.scrollY + camera.height / 2;

    const outputConfig = PETAL_CONFIGS[recipe.output.type];

    const particles = this.scene.add.particles(centerX, centerY, 'pixel_white', {
      lifespan: 1200,
      speed: { min: 80, max: 250 },
      angle: { min: 0, max: 360 },
      scale: { start: 3, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 20 + totalOutput * 3,
      blendMode: 'ADD',
      tint: outputConfig.glowColor
    });

    this.scene.time.delayedCall(1200, () => particles.destroy());

    const resultText = this.scene.add.text(centerX, centerY + 20, `+${totalOutput} ${outputConfig.name}`, {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: `#${outputConfig.color.toString(16).padStart(6, '0')}`,
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(80).setScrollFactor(0).setAlpha(0);

    this.scene.tweens.add({
      targets: resultText,
      alpha: 1,
      y: centerY,
      duration: 400,
      ease: 'Back.Out'
    });

    this.scene.tweens.add({
      targets: resultText,
      alpha: 0,
      y: centerY - 30,
      duration: 800,
      delay: 2000,
      ease: 'Cubic.In',
      onComplete: () => resultText.destroy()
    });

    if (totalOutput >= recipe.output.count * 2) {
      camera.flash(300, 255, 255, 200);
    }
  }

  private playFailAnimation(recipe: WorkshopRecipe): void {
    const camera = this.scene.cameras.main;
    const centerX = camera.scrollX + camera.width / 2;
    const centerY = camera.scrollY + camera.height / 2;

    const particles = this.scene.add.particles(centerX, centerY, 'pixel_white', {
      lifespan: 1500,
      speed: { min: 40, max: 120 },
      angle: { min: 180, max: 360 },
      gravityY: 150,
      scale: { start: 4, end: 1 },
      alpha: { start: 0.7, end: 0 },
      quantity: 15,
      blendMode: 'NORMAL',
      tint: 0x666666
    });

    this.scene.time.delayedCall(1500, () => particles.destroy());
    camera.shake(150, 0.008);
  }

  private playUpgradeAnimation(recipe: WorkshopRecipe, newLevel: number): void {
    const camera = this.scene.cameras.main;
    const centerX = camera.scrollX + camera.width / 2;
    const centerY = camera.scrollY + camera.height / 2;

    const colorMap: Record<ProcessingType, number> = {
      [ProcessingType.REFINING]: 0xff9900,
      [ProcessingType.PURIFYING]: 0x66ddff,
      [ProcessingType.ENHANCING]: 0xff66cc
    };
    const color = colorMap[recipe.processingType];

    const ring = this.scene.add.graphics().setDepth(75);
    this.scene.tweens.add({
      targets: { radius: 0, alpha: 1 },
      radius: 150,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.Out',
      onUpdate: (_tween, target) => {
        ring.clear();
        ring.lineStyle(4, color, target.alpha as number);
        ring.beginPath();
        ring.arc(centerX, centerY, target.radius as number, 0, Math.PI * 2);
        ring.strokePath();
      },
      onComplete: () => ring.destroy()
    });

    const upgradeParticles = this.scene.add.particles(centerX, centerY, 'pixel_white', {
      lifespan: 1000,
      speed: { min: 120, max: 350 },
      angle: { min: 0, max: 360 },
      scale: { start: 4, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 30,
      blendMode: 'ADD',
      tint: color
    });

    this.scene.time.delayedCall(1000, () => upgradeParticles.destroy());

    const levelText = this.scene.add.text(centerX, centerY - 30, `Lv.${newLevel}`, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(80).setScrollFactor(0).setAlpha(0).setScale(0);

    this.scene.tweens.add({
      targets: levelText,
      alpha: 1,
      scale: 1,
      duration: 500,
      ease: 'Elastic.Out'
    });

    this.scene.tweens.add({
      targets: levelText,
      alpha: 0,
      y: centerY - 60,
      duration: 600,
      delay: 1800,
      ease: 'Cubic.In',
      onComplete: () => levelText.destroy()
    });

    camera.flash(200, 255, 255, 150);
  }

  public getUpgradeCost(recipeId: string): { type: PetalType; count: number }[] | null {
    const recipe = this.recipes.find(r => r.id === recipeId);
    if (!recipe) return null;

    const recipeState = this.getRecipeState(recipeId);
    if (!recipeState) return null;

    const multiplier = recipeState.currentLevel;
    return recipe.upgradeCost.map(input => ({
      type: input.type,
      count: input.count * multiplier
    }));
  }

  public getMaxBatchForRecipe(recipeId: string): number {
    const recipe = this.recipes.find(r => r.id === recipeId);
    if (!recipe) return 0;

    const state = SaveManager.getInstance().getGameState();
    const minAffordable = recipe.inputs.reduce((min, input) => {
      const available = state.petals[input.type] || 0;
      const batches = Math.floor(available / input.count);
      return Math.min(min, batches);
    }, Infinity);

    return Math.min(recipe.batchMax, minAffordable);
  }

  public destroy(): void {
    this.eventListeners.forEach(({ event, callback }) => {
      EventManager.getInstance().off(event as any, callback);
    });
    this.eventListeners = [];
  }
}
