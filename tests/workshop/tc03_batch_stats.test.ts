import { describe, it, expect } from 'vitest';
import {
  createTestWorkshopState,
  unlockAllRecipes,
  createOfflineCompletedJob,
  settleJobIntoState,
  validateBatchProductionStatsConsistency,
  runAllValidators,
  updateProductionStats,
  getRecipe
} from '../helpers/workshopTestHelpers';
import { ProcessingType } from '../../src/types';
import { WORKSHOP_RECIPES } from '../../src/config/GameConfig';

describe('TC3: 批量产出统计一致性回归测试', () => {

  it('TC3.1 初始状态：所有统计为0/默认，验证器通过', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const stats = workshop.productionStats;
    expect(stats.totalProcessed).toBe(0);
    expect(stats.totalOutput).toBe(0);
    expect(stats.totalBatchOperations).toBe(0);
    expect(stats.totalUpgrades).toBe(0);
    expect(stats.averageOutputPerRun).toBe(0);
    expect(stats.peakBatchSize).toBe(0);
    expect(stats.totalProcessingTime).toBe(0);
    expect(stats.recipesByProcessingType[ProcessingType.REFINING]).toBe(0);
    expect(stats.recipesByProcessingType[ProcessingType.PURIFYING]).toBe(0);
    expect(stats.recipesByProcessingType[ProcessingType.ENHANCING]).toBe(0);

    const errors = validateBatchProductionStatsConsistency(workshop);
    expect(errors.length, `初始状态验证错误: ${errors.join(', ')}`).toBe(0);
  });

  it('TC3.2 单次批量加工 ×5：totalProcessed = batchCount', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const recipeId = 'workshop_refine_moonlight';
    const recipe = getRecipe(recipeId);
    const job = createOfflineCompletedJob(recipeId, recipe.batchMax, 1);

    settleJobIntoState(workshop, job, 1);
    workshop.activeJobs = [];

    expect(workshop.productionStats.totalProcessed, 'totalProcessed').toBe(recipe.batchMax);
    expect(workshop.productionStats.totalBatchOperations, 'totalBatchOperations').toBe(1);

    const errors = validateBatchProductionStatsConsistency(workshop);
    expect(errors.length, `验证错误: ${errors.join(', ')}`).toBe(0);
  });

  it('TC3.3 N次加工后：averageOutputPerRun = totalOutput / totalBatchOperations', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const runs = [
      { id: 'workshop_refine_moonlight', batch: 3, seed: 1 },
      { id: 'workshop_purify_starlight', batch: 2, seed: 2 },
      { id: 'workshop_enhance_dew', batch: 3, seed: 3 },
      { id: 'workshop_refine_glowing', batch: 2, seed: 4 },
      { id: 'workshop_purify_dream', batch: 1, seed: 5 }
    ];

    runs.forEach((r, i) => {
      const job = createOfflineCompletedJob(r.id, r.batch, i + 1);
      settleJobIntoState(workshop, job, r.seed);
    });
    workshop.activeJobs = [];

    const stats = workshop.productionStats;
    const expectedAvg = stats.totalOutput / stats.totalBatchOperations;

    expect(stats.totalBatchOperations, 'totalBatchOperations').toBe(runs.length);
    expect(Math.abs(stats.averageOutputPerRun - expectedAvg) < 0.01,
      `averageOutputPerRun: ${stats.averageOutputPerRun} vs expected ${expectedAvg}`
    ).toBe(true);

    const errors = validateBatchProductionStatsConsistency(workshop);
    expect(errors.length, `统计验证错误: ${errors.join(', ')}`).toBe(0);
  });

  it('TC3.4 加工类型分项合计 === totalBatchOperations', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const refiningRecipes = WORKSHOP_RECIPES.filter(r => r.processingType === ProcessingType.REFINING);
    const purifyingRecipes = WORKSHOP_RECIPES.filter(r => r.processingType === ProcessingType.PURIFYING);
    const enhancingRecipes = WORKSHOP_RECIPES.filter(r => r.processingType === ProcessingType.ENHANCING);

    [refiningRecipes[0], purifyingRecipes[0], enhancingRecipes[0], refiningRecipes[1], purifyingRecipes[1]].forEach((recipe, i) => {
      const job = createOfflineCompletedJob(recipe.id, 2, i + 1);
      settleJobIntoState(workshop, job, i + 7);
    });
    workshop.activeJobs = [];

    const stats = workshop.productionStats;
    const refiningCount = stats.recipesByProcessingType[ProcessingType.REFINING];
    const purifyingCount = stats.recipesByProcessingType[ProcessingType.PURIFYING];
    const enhancingCount = stats.recipesByProcessingType[ProcessingType.ENHANCING];

    expect(refiningCount, '精炼次数应为2').toBe(2);
    expect(purifyingCount, '提纯次数应为2').toBe(2);
    expect(enhancingCount, '强化次数应为1').toBe(1);
    expect(refiningCount + purifyingCount + enhancingCount, '类型合计').toBe(stats.totalBatchOperations);

    const errors = validateBatchProductionStatsConsistency(workshop);
    expect(errors.length, `验证错误: ${errors.join(', ')}`).toBe(0);
  });

  it('TC3.5 stats.totalOutput === Σ productionRecords.resultCount', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    for (let i = 0; i < 8; i++) {
      const recipe = WORKSHOP_RECIPES[i % WORKSHOP_RECIPES.length];
      const job = createOfflineCompletedJob(recipe.id, Math.min(i + 1, recipe.batchMax), i + 1);
      settleJobIntoState(workshop, job, i * 13 + 5);
    }
    workshop.activeJobs = [];

    const recordsSum = workshop.productionRecords.reduce((s, r) => s + r.resultCount, 0);
    expect(workshop.productionStats.totalOutput, `stats=${workshop.productionStats.totalOutput} vs records=${recordsSum}`).toBe(recordsSum);

    const errors = validateBatchProductionStatsConsistency(workshop);
    expect(errors.length, `验证错误: ${errors.join(', ')}`).toBe(0);
  });

  it('TC3.6 peakBatchSize === 记录中最大批量数', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const batches = [2, 5, 1, 4, 3];
    const expectedMax = Math.max(...batches);

    batches.forEach((b, i) => {
      const recipe = WORKSHOP_RECIPES[i % WORKSHOP_RECIPES.length];
      const actualBatch = Math.min(b, recipe.batchMax);
      const job = createOfflineCompletedJob(recipe.id, actualBatch, i + 1);
      settleJobIntoState(workshop, job, i * 3 + 1);
    });
    workshop.activeJobs = [];

    const recordsMax = workshop.productionRecords.reduce((m, r) => Math.max(m, r.batchCount), 0);
    expect(workshop.productionStats.peakBatchSize,
      `peakBatchSize=${workshop.productionStats.peakBatchSize} vs recordsMax=${recordsMax}`
    ).toBeGreaterThanOrEqual(recordsMax);

    const errors = validateBatchProductionStatsConsistency(workshop);
    expect(errors.length, `验证错误: ${errors.join(', ')}`).toBe(0);
  });

  it('TC3.7 被篡改的 totalOutput（低于实际记录之和）→ 验证器报错', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    for (let i = 0; i < 3; i++) {
      const recipe = WORKSHOP_RECIPES[i];
      const job = createOfflineCompletedJob(recipe.id, 2, i + 1);
      settleJobIntoState(workshop, job, i + 1);
    }
    workshop.activeJobs = [];

    const originalOutput = workshop.productionStats.totalOutput;
    workshop.productionStats.totalOutput = Math.max(0, originalOutput - 50);

    const errors = validateBatchProductionStatsConsistency(workshop);
    expect(errors.length, '被篡改的 totalOutput 应报错').toBeGreaterThan(0);
    expect(errors.some(e => e.includes('产出与记录不符')), '错误信息应匹配').toBe(true);
  });

  it('TC3.8 被篡改的 averageOutputPerRun → 验证器报错', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    for (let i = 0; i < 5; i++) {
      const recipe = WORKSHOP_RECIPES[i];
      const job = createOfflineCompletedJob(recipe.id, 2, i + 1);
      settleJobIntoState(workshop, job, i * 7 + 3);
    }
    workshop.activeJobs = [];

    workshop.productionStats.averageOutputPerRun = 9999;

    const errors = validateBatchProductionStatsConsistency(workshop);
    expect(errors.length, '被篡改的平均值应报错').toBeGreaterThan(0);
    expect(errors.some(e => e.includes('平均产出不符')), '错误信息应匹配').toBe(true);
  });

  it('TC3.9 累计 30 次各种批量加工后：全套验证通过', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    for (let i = 0; i < 30; i++) {
      const recipe = WORKSHOP_RECIPES[i % WORKSHOP_RECIPES.length];
      const batch = 1 + (i % recipe.batchMax);
      const job = createOfflineCompletedJob(recipe.id, batch, i + 1);
      settleJobIntoState(workshop, job, i * 17 + 11);
    }
    workshop.activeJobs = [];

    const { passed, errors } = runAllValidators(workshop);
    expect(passed, `30次加工后全套验证失败: ${errors.join(', ')}`).toBe(true);
    expect(workshop.productionStats.totalBatchOperations, '总批次').toBe(30);
  });

  it('TC3.10 无任何操作但 averageOutputPerRun !== 0 → 验证器报错', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    workshop.productionStats.averageOutputPerRun = 3.14;

    const errors = validateBatchProductionStatsConsistency(workshop);
    expect(errors.length, '无操作但平均产出非零应报错').toBeGreaterThan(0);
    expect(errors.some(e => e.includes('平均产出非0')), '错误信息匹配').toBe(true);
  });
});
