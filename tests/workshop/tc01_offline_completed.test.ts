import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestWorkshopState,
  unlockAllRecipes,
  createOfflineCompletedJob,
  settleJobIntoState,
  validateOfflineCompletedJobSettlement,
  runAllValidators,
  cloneWorkshopState,
  getRecipe
} from '../helpers/workshopTestHelpers';
import { WORKSHOP_RECIPES, WORKSHOP_MAX_ACTIVE_JOBS } from '../../src/config/GameConfig';

describe('TC1: 离线已完成工单结算回归测试', () => {
  beforeEach(() => {
  });

  it('TC1.1 单个离线完成工单：被结算后 activeJobs 中不存在该工单', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const recipeId = 'workshop_refine_moonlight';
    const job = createOfflineCompletedJob(recipeId, 2, 2);
    workshop.activeJobs.push(job);

    expect(workshop.activeJobs.length).toBe(1);
    expect(workshop.activeJobs[0].id).toBe(job.id);

    settleJobIntoState(workshop, job, 100);

    workshop.activeJobs = workshop.activeJobs.filter(j => j.id !== job.id);

    const errors = validateOfflineCompletedJobSettlement(workshop);
    expect(errors.length, `离线工单结算验证错误: ${errors.join(', ')}`).toBe(0);
    expect(workshop.activeJobs.length, 'activeJobs 应为空').toBe(0);
  });

  it('TC1.2 单个离线完成工单：productionRecords 中存在对应产出记录', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const recipeId = 'workshop_refine_moonlight';
    const job = createOfflineCompletedJob(recipeId, 3, 1);
    workshop.activeJobs.push(job);

    const { totalOutput } = settleJobIntoState(workshop, job, 7);
    workshop.activeJobs = workshop.activeJobs.filter(j => j.id !== job.id);

    const matchingRecords = workshop.productionRecords.filter(r => r.recipeId === recipeId);
    expect(matchingRecords.length, '应存在对应 productionRecord').toBeGreaterThanOrEqual(1);
    const lastRecord = matchingRecords[0];
    expect(lastRecord.batchCount, '记录批量数应匹配').toBe(job.batchCount);
    expect(lastRecord.resultCount, '记录产出数应匹配').toBe(totalOutput);
    expect(lastRecord.processingTime, '记录耗时应匹配').toBe(job.duration);
  });

  it('TC1.3 单个离线完成工单：配方状态 totalProduced / totalBatchRuns 正确递增', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const recipeId = 'workshop_purify_starlight';
    const job = createOfflineCompletedJob(recipeId, 4, 3);
    const rsBefore = JSON.parse(JSON.stringify(workshop.recipeStates.find(r => r.recipeId === recipeId)!));

    const { totalOutput } = settleJobIntoState(workshop, job, 123);
    workshop.activeJobs = workshop.activeJobs.filter(j => j.id !== job.id);

    const rsAfter = workshop.recipeStates.find(r => r.recipeId === recipeId)!;
    expect(rsAfter.totalProduced - rsBefore.totalProduced, 'totalProduced 增量').toBe(totalOutput);
    expect(rsAfter.totalBatchRuns - rsBefore.totalBatchRuns, 'totalBatchRuns 增量').toBe(1);
    expect(rsAfter.lastProducedAt, 'lastProducedAt 应被更新').toBeGreaterThan(0);
  });

  it('TC1.4 单个离线完成工单：productionStats 各项累计正确', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const recipeId = 'workshop_enhance_dew';
    const job = createOfflineCompletedJob(recipeId, 3, 5);
    workshop.activeJobs.push(job);

    const statsBefore = JSON.parse(JSON.stringify(workshop.productionStats));
    const { totalOutput } = settleJobIntoState(workshop, job, 99);
    workshop.activeJobs = workshop.activeJobs.filter(j => j.id !== job.id);
    const statsAfter = workshop.productionStats;

    expect(statsAfter.totalProcessed - statsBefore.totalProcessed, 'totalProcessed').toBe(job.batchCount);
    expect(statsAfter.totalOutput - statsBefore.totalOutput, 'totalOutput').toBe(totalOutput);
    expect(statsAfter.totalBatchOperations - statsBefore.totalBatchOperations, 'totalBatchOperations').toBe(1);
    expect(statsAfter.totalProcessingTime - statsBefore.totalProcessingTime, 'totalProcessingTime').toBe(job.duration);
  });

  it('TC1.5 多配方离线完成工单：全部正确结算且不互相干扰', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const jobs = [
      createOfflineCompletedJob('workshop_refine_moonlight', 5, 1),
      createOfflineCompletedJob('workshop_purify_starlight', 4, 2),
      createOfflineCompletedJob('workshop_enhance_dew', 3, 3)
    ];
    jobs.forEach(j => workshop.activeJobs.push(j));
    expect(workshop.activeJobs.length).toBe(3);

    jobs.forEach((job, idx) => {
      settleJobIntoState(workshop, job, idx * 11 + 1);
    });
    workshop.activeJobs = [];

    const { passed, errors } = runAllValidators(workshop);
    expect(passed, `多配方结算验证失败: ${errors.join(', ')}`).toBe(true);
    expect(workshop.productionStats.totalBatchOperations, '总批量操作次数').toBe(3);
    expect(workshop.productionRecords.length, '记录条数').toBe(3);

    const recipesCovered = new Set(workshop.productionRecords.map(r => r.recipeId));
    expect(recipesCovered.size).toBe(3);
  });

  it('TC1.6 离线完成工单验证器对未结算工单能正确报错', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const job = createOfflineCompletedJob('workshop_refine_moonlight', 2, 1);
    workshop.activeJobs.push(job);

    const errors = validateOfflineCompletedJobSettlement(workshop);
    expect(errors.length, '验证器对未结算工单应报错').toBeGreaterThan(0);
    expect(errors[0], '错误内容应包含"离线完成工单未被结算"').toContain('离线完成工单未被结算');
  });

  it('TC1.7 最大批量(×5)离线完成工单：统计与记录计算正确', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const recipeId = 'workshop_refine_moonlight';
    const recipe = getRecipe(recipeId);
    const job = createOfflineCompletedJob(recipeId, recipe.batchMax, 1);

    const statsBefore = JSON.parse(JSON.stringify(workshop.productionStats));
    const { totalOutput } = settleJobIntoState(workshop, job, 55);
    workshop.activeJobs = workshop.activeJobs.filter(j => j.id !== job.id);
    const statsAfter = workshop.productionStats;

    expect(statsAfter.totalProcessed - statsBefore.totalProcessed, 'totalProcessed 应为 batchMax').toBe(recipe.batchMax);
    expect(statsAfter.peakBatchSize, `peakBatchSize 至少应为 ${recipe.batchMax}`).toBeGreaterThanOrEqual(recipe.batchMax);
    const record = workshop.productionRecords[0];
    expect(record.batchCount, `记录批量应为 ${recipe.batchMax}`).toBe(recipe.batchMax);
  });

  it('TC1.8 工单结算前后：全套回归验证通过', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const { passed: p0 } = runAllValidators(workshop);
    expect(p0, '初始状态应通过校验').toBe(true);

    const job = createOfflineCompletedJob('workshop_refine_glowing', 2, 1);
    workshop.activeJobs.push(job);
    settleJobIntoState(workshop, job, 314);
    workshop.activeJobs = [];

    const { passed, errors } = runAllValidators(workshop);
    expect(passed, `结算后全套验证失败: ${errors.join(', ')}`).toBe(true);
  });
});
