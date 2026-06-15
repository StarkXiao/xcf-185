import { describe, it, expect } from 'vitest';
import {
  createTestWorkshopState,
  unlockAllRecipes,
  createOfflineCompletedJob,
  settleJobIntoState,
  validateProductionRecordsPersistence,
  runAllValidators,
  getRecipe
} from '../helpers/workshopTestHelpers';
import {
  WORKSHOP_MAX_RECORDS,
  WORKSHOP_RECIPES
} from '../../src/config/GameConfig';

describe('TC4: 生产记录持久化回归测试', () => {

  it('TC4.1 初始状态：productionRecords 为空数组，验证器通过', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    expect(Array.isArray(workshop.productionRecords)).toBe(true);
    expect(workshop.productionRecords.length).toBe(0);

    const errors = validateProductionRecordsPersistence(workshop);
    expect(errors.length, `初始状态验证错误: ${errors.join(', ')}`).toBe(0);
  });

  it('TC4.2 单次加工后：存在 1 条记录，字段齐全且值正确', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const recipeId = 'workshop_refine_moonlight';
    const recipe = getRecipe(recipeId);
    const batchCount = 3;
    const job = createOfflineCompletedJob(recipeId, batchCount, 1);

    const { totalOutput } = settleJobIntoState(workshop, job, 5);
    workshop.activeJobs = [];

    expect(workshop.productionRecords.length).toBe(1);
    const record = workshop.productionRecords[0];

    expect(typeof record.id, 'id 类型').toBe('string');
    expect(record.id.length, 'id 非空').toBeGreaterThan(0);
    expect(record.recipeId, 'recipeId').toBe(recipeId);
    expect(record.batchCount, 'batchCount').toBe(batchCount);
    expect(record.resultCount, 'resultCount').toBe(totalOutput);
    expect(record.resultType, 'resultType').toBe(recipe.output.type);
    expect(record.processingTime, 'processingTime').toBe(recipe.processingTime * batchCount);
    expect(record.timestamp, 'timestamp 非零').toBeGreaterThan(0);
    expect(typeof record.wasUpgraded, 'wasUpgraded').toBe('boolean');

    const errors = validateProductionRecordsPersistence(workshop);
    expect(errors.length, `验证错误: ${errors.join(', ')}`).toBe(0);
  });

  it('TC4.3 记录按时间降序排列（新→旧）', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const timestamps: number[] = [];
    for (let i = 0; i < 10; i++) {
      const recipe = WORKSHOP_RECIPES[i % WORKSHOP_RECIPES.length];
      const job = createOfflineCompletedJob(recipe.id, 2, i + 1);
      settleJobIntoState(workshop, job, i + 1);
      const now = Date.now();
      timestamps.push(workshop.productionRecords[0].timestamp);
      workshop.activeJobs = [];
    }

    for (let i = 1; i < workshop.productionRecords.length; i++) {
      expect(
        workshop.productionRecords[i].timestamp,
        `记录${i}应早于记录${i - 1}`
      ).toBeLessThanOrEqual(workshop.productionRecords[i - 1].timestamp);
    }

    const errors = validateProductionRecordsPersistence(workshop);
    expect(errors.length, `时序验证错误: ${errors.join(', ')}`).toBe(0);
  });

  it('TC4.4 超过 WORKSHOP_MAX_RECORDS 条记录：超出部分被截断', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const overCount = WORKSHOP_MAX_RECORDS + 15;
    for (let i = 0; i < overCount; i++) {
      const recipe = WORKSHOP_RECIPES[i % WORKSHOP_RECIPES.length];
      const job = createOfflineCompletedJob(recipe.id, 2, i + 1);
      settleJobIntoState(workshop, job, i * 5 + 3);
      workshop.activeJobs = [];
    }

    expect(workshop.productionRecords.length,
      `记录数应 ≤ ${WORKSHOP_MAX_RECORDS}，实际 ${workshop.productionRecords.length}`
    ).toBeLessThanOrEqual(WORKSHOP_MAX_RECORDS);

    const errors = validateProductionRecordsPersistence(workshop);
    expect(errors.length, `截断验证错误: ${errors.join(', ')}`).toBe(0);
  });

  it('TC4.5 记录数刚好达到上限 WORKSHOP_MAX_RECORDS：验证通过', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    for (let i = 0; i < WORKSHOP_MAX_RECORDS; i++) {
      const recipe = WORKSHOP_RECIPES[i % WORKSHOP_RECIPES.length];
      const job = createOfflineCompletedJob(recipe.id, 1 + (i % 4), i + 1);
      settleJobIntoState(workshop, job, i * 3 + 1);
      workshop.activeJobs = [];
    }

    expect(workshop.productionRecords.length).toBe(WORKSHOP_MAX_RECORDS);

    const errors = validateProductionRecordsPersistence(workshop);
    expect(errors.length, `满容量验证错误: ${errors.join(', ')}`).toBe(0);

    const { passed, errors: allErrors } = runAllValidators(workshop);
    expect(passed, `满容量全套验证失败: ${allErrors.join(', ')}`).toBe(true);
  });

  it('TC4.6 记录 batchCount 超过配方 batchMax → 验证器报错', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const recipeId = 'workshop_enhance_eternal';
    const recipe = getRecipe(recipeId);
    const job = createOfflineCompletedJob(recipeId, recipe.batchMax, 1);
    settleJobIntoState(workshop, job, 7);
    workshop.activeJobs = [];

    workshop.productionRecords[0].batchCount = recipe.batchMax + 999;

    const errors = validateProductionRecordsPersistence(workshop);
    expect(errors.length, '超上限 batchCount 应报错').toBeGreaterThan(0);
    expect(errors.some(e => e.includes('超上限')), '错误应包含"超上限"').toBe(true);
  });

  it('TC4.7 记录字段被篡改（timestamp=0、resultCount=-1）→ 验证器报错', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    const job = createOfflineCompletedJob('workshop_refine_moonlight', 2, 1);
    settleJobIntoState(workshop, job, 1);
    workshop.activeJobs = [];

    workshop.productionRecords[0].timestamp = 0;
    workshop.productionRecords[0].resultCount = -1;

    const errors = validateProductionRecordsPersistence(workshop);
    expect(errors.length, '非法字段应至少报2个错误').toBeGreaterThanOrEqual(2);
    expect(errors.some(e => e.includes('timestamp')), '包含 timestamp 错误').toBe(true);
    expect(errors.some(e => e.includes('resultCount')), '包含 resultCount 错误').toBe(true);
  });

  it('TC4.8 记录时序被颠倒（升序排列）→ 验证器报错', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    for (let i = 0; i < 5; i++) {
      const recipe = WORKSHOP_RECIPES[i];
      const job = createOfflineCompletedJob(recipe.id, 2, i + 1);
      settleJobIntoState(workshop, job, i + 1);
      workshop.productionRecords[0].timestamp = Date.now() - (4 - i) * 1000;
      workshop.activeJobs = [];
    }

    workshop.productionRecords = [...workshop.productionRecords].reverse();

    const errors = validateProductionRecordsPersistence(workshop);
    expect(errors.length, '时序颠倒应报错').toBeGreaterThan(0);
    expect(errors.some(e => e.includes('时序')), '错误应包含"时序"').toBe(true);
  });

  it('TC4.9 满记录后继续追加 → 旧记录被挤出，总容量仍等于上限，记录仍正确', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    for (let i = 0; i < WORKSHOP_MAX_RECORDS; i++) {
      const recipe = WORKSHOP_RECIPES[i % WORKSHOP_RECIPES.length];
      const job = createOfflineCompletedJob(recipe.id, 2, i + 1);
      settleJobIntoState(workshop, job, i + 1);
      workshop.activeJobs = [];
    }

    const oldestId = workshop.productionRecords[workshop.productionRecords.length - 1].id;
    const newestIdBefore = workshop.productionRecords[0].id;

    const newJob = createOfflineCompletedJob('workshop_refine_moonlight', 3, 1);
    settleJobIntoState(workshop, newJob, 101);
    workshop.activeJobs = [];

    const newestIdAfter = workshop.productionRecords[0].id;
    const oldestAfter = workshop.productionRecords[workshop.productionRecords.length - 1].id;

    expect(workshop.productionRecords.length, '记录容量不变').toBe(WORKSHOP_MAX_RECORDS);
    expect(newestIdAfter, '最新记录应为新插入的').not.toBe(newestIdBefore);
    expect(oldestAfter, '最旧记录应被挤出').not.toBe(oldestId);
  });

  it('TC4.10 多配方混合 20 条记录：持久化 + 全套回归验证通过', () => {
    const workshop = createTestWorkshopState();
    unlockAllRecipes(workshop);

    for (let i = 0; i < 20; i++) {
      const recipe = WORKSHOP_RECIPES[i % WORKSHOP_RECIPES.length];
      const batch = 1 + (i % recipe.batchMax);
      const job = createOfflineCompletedJob(recipe.id, batch, i + 1);
      settleJobIntoState(workshop, job, i * 11 + 7);
      workshop.activeJobs = [];
    }

    expect(workshop.productionRecords.length).toBe(20);

    const { passed, errors } = runAllValidators(workshop);
    expect(passed, `20条记录全套验证失败: ${errors.join(', ')}`).toBe(true);
  });
});
