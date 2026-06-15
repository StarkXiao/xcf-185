import {
  GameState,
  WorkshopState,
  WorkshopRecipeState,
  WorkshopProductionStats,
  WorkshopProductionRecord,
  ProcessingType,
  WorkshopActiveJob,
  PetalType
} from '../../src/types';
import {
  WORKSHOP_RECIPES,
  WORKSHOP_MAX_RECORDS,
  WORKSHOP_MAX_ACTIVE_JOBS,
  INITIAL_WORKSHOP_STATE,
  INITIAL_GAME_STATE
} from '../../src/config/GameConfig';

export function createTestGameState(): GameState {
  return JSON.parse(JSON.stringify(INITIAL_GAME_STATE));
}

export function createTestWorkshopState(): WorkshopState {
  return JSON.parse(JSON.stringify(INITIAL_WORKSHOP_STATE));
}

export function unlockAllRecipes(workshop: WorkshopState): void {
  workshop.recipeStates.forEach(rs => {
    rs.isUnlocked = true;
  });
}

export function unlockRecipe(workshop: WorkshopState, recipeId: string): void {
  const rs = workshop.recipeStates.find(s => s.recipeId === recipeId);
  if (rs) rs.isUnlocked = true;
}

export function getRecipe(recipeId: string) {
  return WORKSHOP_RECIPES.find(r => r.id === recipeId)!;
}

export function createOfflineCompletedJob(recipeId: string, batchCount: number, hoursAgo: number = 1): WorkshopActiveJob {
  const recipe = getRecipe(recipeId);
  const safeBatch = Math.max(1, Math.min(batchCount, recipe.batchMax));
  return {
    id: `job_test_offline_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    recipeId,
    batchCount: safeBatch,
    startTime: Date.now() - recipe.processingTime * safeBatch - hoursAgo * 3600 * 1000,
    duration: recipe.processingTime * safeBatch,
    isUpgraded: false
  };
}

export function createOngoingJob(recipeId: string, batchCount: number, progressPct: number = 0.5): WorkshopActiveJob {
  const recipe = getRecipe(recipeId);
  const safeBatch = Math.max(1, Math.min(batchCount, recipe.batchMax));
  const duration = recipe.processingTime * safeBatch;
  return {
    id: `job_test_ongoing_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    recipeId,
    batchCount: safeBatch,
    startTime: Date.now() - duration * progressPct,
    duration,
    isUpgraded: false
  };
}

export function getEffectiveSuccessRate(workshop: WorkshopState, recipeId: string): number {
  const recipe = getRecipe(recipeId);
  const rs = workshop.recipeStates.find(s => s.recipeId === recipeId);
  const level = rs?.currentLevel || 1;
  return Math.min(1, recipe.successRate + (level - 1) * recipe.upgradeSuccessRateBonus);
}

export function getEffectiveOutputCount(workshop: WorkshopState, recipeId: string): number {
  const recipe = getRecipe(recipeId);
  const rs = workshop.recipeStates.find(s => s.recipeId === recipeId);
  const level = rs?.currentLevel || 1;
  return recipe.output.count + (level - 1) * recipe.upgradeOutputBonus;
}

export function settleJobIntoState(
  workshop: WorkshopState,
  job: WorkshopActiveJob,
  deterministicSeed: number = 42
): { totalOutput: number; successBatches: number } {
  const recipe = getRecipe(job.recipeId);
  const rate = getEffectiveSuccessRate(workshop, job.recipeId);
  const outputPerBatch = getEffectiveOutputCount(workshop, job.recipeId);

  let totalOutput = 0;
  let successBatches = 0;
  let seed = deterministicSeed;
  function seededRandom(): number {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  for (let i = 0; i < job.batchCount; i++) {
    if (seededRandom() <= rate) {
      totalOutput += outputPerBatch;
      successBatches++;
    }
  }

  const rs = workshop.recipeStates.find(s => s.recipeId === job.recipeId);
  if (rs) {
    rs.totalProduced += totalOutput;
    rs.totalBatchRuns += 1;
    rs.lastProducedAt = Date.now();
  }

  updateProductionStats(workshop, recipe, job.batchCount, totalOutput, job);

  const record: WorkshopProductionRecord = {
    id: `rec_test_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
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

  return { totalOutput, successBatches };
}

export function updateProductionStats(
  workshop: WorkshopState,
  recipe: any,
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

export function cloneWorkshopState(workshop: WorkshopState): WorkshopState {
  return JSON.parse(JSON.stringify(workshop));
}

export function validateOfflineCompletedJobSettlement(workshop: WorkshopState): string[] {
  const errors: string[] = [];
  const now = Date.now();

  workshop.activeJobs.forEach(job => {
    const recipe = getRecipe(job.recipeId);
    if (!recipe) {
      errors.push(`配方不存在: ${job.recipeId}`);
      return;
    }
    const elapsed = now - job.startTime;
    if (elapsed >= job.duration) {
      errors.push(
        `离线完成工单未被结算: job=${job.id} recipe=${job.recipeId} ` +
        `elapsed=${elapsed}ms duration=${job.duration}ms`
      );
    }
  });
  return errors;
}

export function validateOngoingJobContinuation(workshop: WorkshopState): string[] {
  const errors: string[] = [];
  const now = Date.now();

  workshop.activeJobs.forEach(job => {
    const recipe = getRecipe(job.recipeId);
    if (!recipe) return;
    const elapsed = now - job.startTime;
    if (elapsed < job.duration) {
      const expectedDuration = recipe.processingTime * job.batchCount;
      if (job.duration !== expectedDuration) {
        errors.push(`进行中工单时长不符: ${job.duration} vs ${expectedDuration}`);
      }
      const rs = workshop.recipeStates.find(s => s.recipeId === job.recipeId);
      if (!rs || !rs.isUnlocked) {
        errors.push(`进行中工单配方未解锁: ${job.recipeId}`);
      }
      if (workshop.activeJobs.filter(j => j.recipeId === job.recipeId).length > 1) {
        errors.push(`同配方重复工单: ${job.recipeId}`);
      }
      if (job.startTime > now) {
        errors.push(`工单起始时间在未来: ${job.id}`);
      }
    }
  });

  if (workshop.activeJobs.length > WORKSHOP_MAX_ACTIVE_JOBS) {
    errors.push(`活跃工单超限: ${workshop.activeJobs.length}`);
  }
  return errors;
}

export function validateBatchProductionStatsConsistency(workshop: WorkshopState): string[] {
  const errors: string[] = [];
  const stats = workshop.productionStats;

  if (stats.totalBatchOperations < 0) errors.push(`批量操作次数负`);
  if (stats.totalProcessed < 0) errors.push(`总加工次数负`);
  if (stats.totalOutput < 0) errors.push(`总产出次数负`);
  if (stats.totalBatchOperations > 0 && stats.totalProcessed < stats.totalBatchOperations) {
    errors.push(`totalProcessed < totalBatchOperations`);
  }
  if (stats.totalBatchOperations > 0) {
    const expectedAvg = stats.totalOutput / stats.totalBatchOperations;
    if (Math.abs(stats.averageOutputPerRun - expectedAvg) > 0.01) {
      errors.push(`平均产出不符: ${stats.averageOutputPerRun} vs ${expectedAvg}`);
    }
  } else if (stats.averageOutputPerRun !== 0) {
    errors.push(`无操作但平均产出非0`);
  }

  const recordsOutputSum = workshop.productionRecords.reduce((s, r) => s + r.resultCount, 0);
  if (stats.totalOutput !== recordsOutputSum) {
    errors.push(`产出与记录不符: ${stats.totalOutput} vs ${recordsOutputSum}`);
  }

  if (workshop.productionRecords.length > 0) {
    if (stats.totalBatchOperations !== workshop.productionRecords.length) {
      errors.push(`批次与记录条数不符: ${stats.totalBatchOperations} vs ${workshop.productionRecords.length}`);
    }
  }

  const typeSum = (stats.recipesByProcessingType[ProcessingType.REFINING] || 0) +
    (stats.recipesByProcessingType[ProcessingType.PURIFYING] || 0) +
    (stats.recipesByProcessingType[ProcessingType.ENHANCING] || 0);
  if (typeSum !== stats.totalBatchOperations) {
    errors.push(`类型分项合计不符: ${typeSum} vs ${stats.totalBatchOperations}`);
  }

  if (stats.peakBatchSize < 1 && stats.totalBatchOperations > 0) {
    errors.push(`peakBatchSize 异常: ${stats.peakBatchSize}`);
  }
  const recordsMax = workshop.productionRecords.reduce((m, r) => Math.max(m, r.batchCount), 0);
  if (recordsMax > stats.peakBatchSize && workshop.productionRecords.length > 0) {
    errors.push(`peakBatchSize < 记录中最大批量`);
  }
  return errors;
}

export function validateProductionRecordsPersistence(workshop: WorkshopState): string[] {
  const errors: string[] = [];

  if (!Array.isArray(workshop.productionRecords)) {
    errors.push(`productionRecords 不是数组`);
    return errors;
  }
  if (workshop.productionRecords.length > WORKSHOP_MAX_RECORDS) {
    errors.push(`记录超限: ${workshop.productionRecords.length}`);
  }

  workshop.productionRecords.forEach((r, i) => {
    if (!r.id) errors.push(`记录${i}无id`);
    if (!r.recipeId) errors.push(`记录${i}无recipeId`);
    if (typeof r.batchCount !== 'number' || r.batchCount < 1) errors.push(`记录${i} batchCount 异常`);
    if (typeof r.resultCount !== 'number' || r.resultCount < 0) errors.push(`记录${i} resultCount 异常`);
    if (typeof r.timestamp !== 'number' || r.timestamp <= 0) errors.push(`记录${i} timestamp 异常`);
    if (typeof r.processingTime !== 'number' || r.processingTime <= 0) errors.push(`记录${i} processingTime 异常`);
    if (r.recipeId) {
      const recipe = getRecipe(r.recipeId);
      if (recipe && r.batchCount > recipe.batchMax) {
        errors.push(`记录${i} batchCount 超上限`);
      }
    }
  });

  for (let i = 1; i < workshop.productionRecords.length; i++) {
    if (workshop.productionRecords[i].timestamp > workshop.productionRecords[i - 1].timestamp) {
      errors.push(`记录时序颠倒`);
      break;
    }
  }

  return errors;
}

export function runAllValidators(workshop: WorkshopState): { passed: boolean; errors: string[] } {
  const errors = [
    ...validateOfflineCompletedJobSettlement(workshop),
    ...validateOngoingJobContinuation(workshop),
    ...validateBatchProductionStatsConsistency(workshop),
    ...validateProductionRecordsPersistence(workshop)
  ];
  return { passed: errors.length === 0, errors };
}

export function setPetalCount(state: GameState, type: PetalType, count: number): void {
  state.petals[type] = count;
}

export function addPetals(state: GameState, type: PetalType, count: number): void {
  state.petals[type] = (state.petals[type] || 0) + count;
}
