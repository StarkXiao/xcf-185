import { describe, it, expect, beforeEach } from 'vitest';
import {
  createTestWorkshopState,
  unlockAllRecipes,
  unlockRecipe,
  createOngoingJob,
  validateOngoingJobContinuation,
  validateOfflineCompletedJobSettlement,
  runAllValidators,
  settleJobIntoState,
  getRecipe,
  cloneWorkshopState
} from '../helpers/workshopTestHelpers';
import { WORKSHOP_MAX_ACTIVE_JOBS } from '../../src/config/GameConfig';

describe('TC2: 进行中工单续跑回归测试', () => {

  it('TC2.1 50%进度进行中工单：保留在 activeJobs 中，续跑验证器通过', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const job = createOngoingJob('workshop_refine_moonlight', 3, 0.5);
    workshop.activeJobs.push(job);

    expect(workshop.activeJobs.length).toBe(1);
    const errors = validateOngoingJobContinuation(workshop);
    expect(errors.length, `进行中工单验证错误: ${errors.join(', ')}`).toBe(0);
  });

  it('TC2.2 进行中工单 duration === processingTime * batchCount', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const recipeId = 'workshop_purify_starlight';
    const recipe = getRecipe(recipeId);
    const batchCount = 2;
    const job = createOngoingJob(recipeId, batchCount, 0.3);

    workshop.activeJobs.push(job);

    const expectedDuration = recipe.processingTime * batchCount;
    expect(job.duration, `duration 应为 ${expectedDuration}`).toBe(expectedDuration);

    const errors = validateOngoingJobContinuation(workshop);
    expect(errors.length, '验证不应报错').toBe(0);
  });

  it('TC2.3 进行中工单配方未解锁 → 验证器报错', () => {
    const workshop = createTestWorkshopState();

    const recipeId = 'workshop_enhance_eternal';
    unlockRecipe(workshop, 'workshop_refine_moonlight');

    const job = createOngoingJob(recipeId, 1, 0.2);
    workshop.activeJobs.push(job);

    const errors = validateOngoingJobContinuation(workshop);
    expect(errors.length, '未解锁配方应有验证错误').toBeGreaterThan(0);
    expect(errors.some(e => e.includes('未解锁')), '错误信息应包含"未解锁"').toBe(true);
  });

  it('TC2.4 同配方双并行工单 → 验证器报错', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const recipeId = 'workshop_refine_moonlight';
    const job1 = createOngoingJob(recipeId, 2, 0.1);
    const job2 = createOngoingJob(recipeId, 3, 0.5);
    workshop.activeJobs.push(job1, job2);

    const errors = validateOngoingJobContinuation(workshop);
    expect(errors.length, '并行重复工单应有验证错误').toBeGreaterThan(0);
    expect(errors.some(e => e.includes('同配方')), '错误应包含"同配方"').toBe(true);
  });

  it('TC2.5 工单 startTime 在未来 → 验证器报错', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const job = createOngoingJob('workshop_purify_dream', 1, 0.1);
    job.startTime = Date.now() + 60000;
    workshop.activeJobs.push(job);

    const errors = validateOngoingJobContinuation(workshop);
    expect(errors.length, '未来起始时间应有错误').toBeGreaterThan(0);
    expect(errors.some(e => e.includes('未来')), '错误应包含"未来"').toBe(true);
  });

  it('TC2.6 活跃工单数超 WORKSHOP_MAX_ACTIVE_JOBS → 验证器报错', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const recipeIds = [
      'workshop_refine_moonlight',
      'workshop_purify_starlight',
      'workshop_enhance_dew',
      'workshop_refine_glowing'
    ];
    recipeIds.forEach((rid, idx) => {
      workshop.activeJobs.push(createOngoingJob(rid, 1, 0.1 + idx * 0.05));
    });

    expect(workshop.activeJobs.length).toBeGreaterThan(WORKSHOP_MAX_ACTIVE_JOBS);
    const errors = validateOngoingJobContinuation(workshop);
    expect(errors.length, '超上限工单应有错误').toBeGreaterThan(0);
    expect(errors.some(e => e.includes('超限')), '错误应包含"超限"').toBe(true);
  });

  it('TC2.7 工单续跑：恢复→修改进度→等待"完成"→结算，全流程验证', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const recipeId = 'workshop_enhance_dew';
    const job = createOngoingJob(recipeId, 2, 0.1);
    workshop.activeJobs.push(job);

    const preCheck = validateOngoingJobContinuation(workshop);
    expect(preCheck.length, '恢复阶段验证应通过').toBe(0);

    const start = Date.now();
    const simulatedProgress = 0.95;
    job.startTime = start - job.duration * simulatedProgress;

    const midCheck = validateOngoingJobContinuation(workshop);
    expect(midCheck.length, '95%进度仍应视为进行中').toBe(0);

    job.startTime = start - job.duration - 1000;
    const expiredPreSettle = validateOfflineCompletedJobSettlement(workshop);
    expect(expiredPreSettle.length, '超时但未结算前验证应报错').toBeGreaterThan(0);

    settleJobIntoState(workshop, job, 42);
    workshop.activeJobs = workshop.activeJobs.filter(j => j.id !== job.id);

    const { passed, errors } = runAllValidators(workshop);
    expect(passed, `结算后全套验证失败: ${errors.join(', ')}`).toBe(true);
  });

  it('TC2.8 多工单多阶段恢复场景（30%/60%/90%）验证器全部通过', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const recipes = [
      { id: 'workshop_refine_moonlight', batch: 5, progress: 0.3 },
      { id: 'workshop_purify_starlight', batch: 4, progress: 0.6 },
      { id: 'workshop_enhance_dew', batch: 3, progress: 0.9 }
    ];
    recipes.forEach(r => {
      workshop.activeJobs.push(createOngoingJob(r.id, r.batch, r.progress));
    });

    expect(workshop.activeJobs.length).toBe(3);
    const errors = validateOngoingJobContinuation(workshop);
    expect(errors.length, `多阶段工单验证错误: ${errors.join(', ')}`).toBe(0);

    const { passed, errors: allErrors } = runAllValidators(workshop);
    expect(passed, `全套验证失败: ${allErrors.join(', ')}`).toBe(true);
  });

  it('TC2.9 工单 duration 被篡改 → 验证器报错并定位原因', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const job = createOngoingJob('workshop_refine_glowing', 2, 0.5);
    job.duration = job.duration + 9999;
    workshop.activeJobs.push(job);

    const errors = validateOngoingJobContinuation(workshop);
    expect(errors.length, '被篡改的 duration 应报错').toBeGreaterThan(0);
    expect(errors.some(e => e.includes('时长不符')), '错误应包含"时长不符"').toBe(true);
  });
});
