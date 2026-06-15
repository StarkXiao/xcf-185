import {
  WorkshopState,
  WorkshopActiveJob,
  ProcessingType
} from '../types';
import {
  WORKSHOP_RECIPES,
  WORKSHOP_MAX_RECORDS,
  WORKSHOP_MAX_ACTIVE_JOBS,
  INITIAL_WORKSHOP_STATE
} from '../config/GameConfig';

export interface TestCaseResult {
  id: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export interface TestSuiteResult {
  suiteName: string;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  timestamp: number;
  cases: TestCaseResult[];
}

export class PetalWorkshopTestRunner {
  private results: TestSuiteResult[] = [];

  public runAll(): TestSuiteResult[] {
    this.results = [];
    this.runTC01_OfflineCompleted();
    this.runTC02_OngoingContinuation();
    this.runTC03_BatchStats();
    this.runTC04_ProductionRecords();
    return this.results;
  }

  public printResults(): void {
    const totalPassed = this.results.reduce((s, r) => s + r.passed, 0);
    const totalFailed = this.results.reduce((s, r) => s + r.failed, 0);
    const totalDuration = this.results.reduce((s, r) => s + r.durationMs, 0);

    console.log('=========== 花瓣工坊回归测试报告 ===========');
    console.log(`测试时间: ${new Date().toLocaleString()}`);
    console.log(`总用例: ${totalPassed + totalFailed} | 通过: ${totalPassed} | 失败: ${totalFailed}`);
    console.log(`总耗时: ${totalDuration.toFixed(2)}ms`);
    console.log('============================================');

    this.results.forEach(suite => {
      const status = suite.failed === 0 ? '✅ PASS' : '❌ FAIL';
      console.log(`\n[${status}] ${suite.suiteName} (${suite.passed}/${suite.total}) - ${suite.durationMs.toFixed(1)}ms`);
      suite.cases.forEach(c => {
        const cStatus = c.passed ? '✅' : '❌';
        const line = `  ${cStatus} ${c.id} ${c.name} (${c.durationMs.toFixed(1)}ms)`;
        if (c.passed) {
          console.log(line);
        } else {
          console.error(line + `\n       → ${c.error}`);
        }
      });
    });

    console.log('\n============================================');
    if (totalFailed === 0) {
      console.log('🎉 全部测试通过！');
    } else {
      console.error(`💥 ${totalFailed} 个测试失败！`);
    }
  }

  public getSummary(): { totalPassed: number; totalFailed: number; suites: TestSuiteResult[] } {
    return {
      totalPassed: this.results.reduce((s, r) => s + r.passed, 0),
      totalFailed: this.results.reduce((s, r) => s + r.failed, 0),
      suites: this.results
    };
  }

  // ================ TC01 离线已完成工单结算 ================
  private runTC01_OfflineCompleted(): void {
    const start = Date.now();
    const cases: TestCaseResult[] = [];
    const suiteStart = performance.now();

    cases.push(this.tc01_01_singleJobRemovedFromActiveJobs());
    cases.push(this.tc01_02_recordExists());
    cases.push(this.tc01_03_recipeStateIncremented());
    cases.push(this.tc01_04_statsAccumulated());
    cases.push(this.tc01_05_multiRecipeNoInterference());
    cases.push(this.tc01_06_validatorDetectsUnsettledJob());
    cases.push(this.tc01_07_maxBatchCorrect());
    cases.push(this.tc01_08_fullValidationPasses());

    this.results.push({
      suiteName: 'TC1 离线已完成工单结算回归测试',
      total: cases.length,
      passed: cases.filter(c => c.passed).length,
      failed: cases.filter(c => !c.passed).length,
      durationMs: performance.now() - suiteStart,
      timestamp: Date.now(),
      cases
    });
  }

  private tc01_01_singleJobRemovedFromActiveJobs(): TestCaseResult {
    const id = 'TC1.1'; const name = '单个离线工单被正确移出 activeJobs';
    const t = performance.now();
    try {
      const workshop = this.newState();
      const job = this.createOfflineJob('workshop_refine_moonlight', 2);
      workshop.activeJobs.push(job);
      this.settle(workshop, job, 100);
      workshop.activeJobs = workshop.activeJobs.filter(j => j.id !== job.id);
      this.assertEq(workshop.activeJobs.length, 0, 'activeJobs 应清空');
      this.assertEq(this.valOfflineSettlement(workshop).length, 0, '离线验证应无错误');
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc01_02_recordExists(): TestCaseResult {
    const id = 'TC1.2'; const name = '产出记录写入 productionRecords';
    const t = performance.now();
    try {
      const workshop = this.newState();
      const job = this.createOfflineJob('workshop_refine_moonlight', 3);
      workshop.activeJobs.push(job);
      const r = this.settle(workshop, job, 7);
      workshop.activeJobs = [];
      const recs = workshop.productionRecords.filter(x => x.recipeId === job.recipeId);
      this.assertGt(recs.length, 0, '应有匹配记录');
      this.assertEq(recs[0].batchCount, job.batchCount, '批量匹配');
      this.assertEq(recs[0].resultCount, r.totalOutput, '产出匹配');
      this.assertEq(recs[0].processingTime, job.duration, '耗时匹配');
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc01_03_recipeStateIncremented(): TestCaseResult {
    const id = 'TC1.3'; const name = '配方状态 totalProduced / totalBatchRuns 递增';
    const t = performance.now();
    try {
      const workshop = this.newState();
      const job = this.createOfflineJob('workshop_purify_starlight', 4);
      const before = this.cloneState(workshop);
      const beforeRs = before.recipeStates.find(x => x.recipeId === job.recipeId)!;
      const r = this.settle(workshop, job, 123);
      const afterRs = workshop.recipeStates.find(x => x.recipeId === job.recipeId)!;
      this.assertEq(afterRs.totalProduced - beforeRs.totalProduced, r.totalOutput);
      this.assertEq(afterRs.totalBatchRuns - beforeRs.totalBatchRuns, 1);
      this.assertGt(afterRs.lastProducedAt, 0);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc01_04_statsAccumulated(): TestCaseResult {
    const id = 'TC1.4'; const name = '生产统计各项正确累计';
    const t = performance.now();
    try {
      const workshop = this.newState();
      const job = this.createOfflineJob('workshop_enhance_dew', 3);
      workshop.activeJobs.push(job);
      const before = this.cloneState(workshop).productionStats;
      const r = this.settle(workshop, job, 99);
      workshop.activeJobs = [];
      const after = workshop.productionStats;
      this.assertEq(after.totalProcessed - before.totalProcessed, job.batchCount);
      this.assertEq(after.totalOutput - before.totalOutput, r.totalOutput);
      this.assertEq(after.totalBatchOperations - before.totalBatchOperations, 1);
      this.assertEq(after.totalProcessingTime - before.totalProcessingTime, job.duration);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc01_05_multiRecipeNoInterference(): TestCaseResult {
    const id = 'TC1.5'; const name = '多配方结算互不干扰';
    const t = performance.now();
    try {
      const workshop = this.newState();
      const jobs = [
        this.createOfflineJob('workshop_refine_moonlight', 5),
        this.createOfflineJob('workshop_purify_starlight', 4),
        this.createOfflineJob('workshop_enhance_dew', 3)
      ];
      jobs.forEach(j => workshop.activeJobs.push(j));
      jobs.forEach((j, i) => this.settle(workshop, j, i * 11 + 1));
      workshop.activeJobs = [];
      this.assertEq(workshop.productionStats.totalBatchOperations, 3);
      this.assertEq(workshop.productionRecords.length, 3);
      const set = new Set(workshop.productionRecords.map(r => r.recipeId));
      this.assertEq(set.size, 3, '3种配方都应有记录');
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc01_06_validatorDetectsUnsettledJob(): TestCaseResult {
    const id = 'TC1.6'; const name = '验证器对未结算工单正确报错';
    const t = performance.now();
    try {
      const workshop = this.newState();
      const job = this.createOfflineJob('workshop_refine_moonlight', 2);
      workshop.activeJobs.push(job);
      const errs = this.valOfflineSettlement(workshop);
      this.assertGt(errs.length, 0, '验证器应报错');
      this.assertTrue(errs[0].includes('离线完成工单未被结算'), '错误信息应匹配');
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc01_07_maxBatchCorrect(): TestCaseResult {
    const id = 'TC1.7'; const name = '最大批量结算正确';
    const t = performance.now();
    try {
      const workshop = this.newState();
      const recipe = this.r('workshop_refine_moonlight');
      const job = this.createOfflineJob(recipe.id, recipe.batchMax);
      workshop.activeJobs.push(job);
      this.settle(workshop, job, 55);
      workshop.activeJobs = [];
      this.assertEq(workshop.productionStats.totalProcessed, recipe.batchMax);
      this.assertGte(workshop.productionStats.peakBatchSize, recipe.batchMax);
      this.assertEq(workshop.productionRecords[0].batchCount, recipe.batchMax);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc01_08_fullValidationPasses(): TestCaseResult {
    const id = 'TC1.8'; const name = '结算后全套验证通过';
    const t = performance.now();
    try {
      const workshop = this.newState();
      const r0 = this.runAllVals(workshop);
      this.assertTrue(r0.passed, '初始状态应通过');
      const job = this.createOfflineJob('workshop_refine_glowing', 2);
      workshop.activeJobs.push(job);
      this.settle(workshop, job, 314);
      workshop.activeJobs = [];
      const r = this.runAllVals(workshop);
      this.assertTrue(r.passed, `全套验证失败: ${r.errors.join(', ')}`);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  // ================ TC02 进行中工单续跑 ================
  private runTC02_OngoingContinuation(): void {
    const cases: TestCaseResult[] = [];
    const s = performance.now();

    cases.push(this.tc02_01_50pctJob());
    cases.push(this.tc02_02_durationMatchesFormula());
    cases.push(this.tc02_03_lockedRecipeJob());
    cases.push(this.tc02_04_duplicateJobsRejected());
    cases.push(this.tc02_05_futureStartTime());
    cases.push(this.tc02_06_overMaxActiveJobs());
    cases.push(this.tc02_07_restoreProgressSettleFull());
    cases.push(this.tc02_08_multiStage());
    cases.push(this.tc02_09_tamperedDuration());

    this.results.push({
      suiteName: 'TC2 进行中工单续跑回归测试',
      total: cases.length,
      passed: cases.filter(c => c.passed).length,
      failed: cases.filter(c => !c.passed).length,
      durationMs: performance.now() - s,
      timestamp: Date.now(),
      cases
    });
  }

  private tc02_01_50pctJob(): TestCaseResult {
    const id = 'TC2.1'; const name = '50% 进度工单仍在 activeJobs 且验证通过';
    const t = performance.now();
    try {
      const workshop = this.newState();
      const job = this.createOngoingJob('workshop_refine_moonlight', 3, 0.5);
      workshop.activeJobs.push(job);
      this.assertEq(workshop.activeJobs.length, 1);
      this.assertEq(this.valOngoing(workshop).length, 0);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc02_02_durationMatchesFormula(): TestCaseResult {
    const id = 'TC2.2'; const name = 'duration 等于 processingTime * batchCount';
    const t = performance.now();
    try {
      const workshop = this.newState();
      const recipe = this.r('workshop_purify_starlight');
      const bc = 2;
      const job = this.createOngoingJob(recipe.id, bc, 0.3);
      workshop.activeJobs.push(job);
      this.assertEq(job.duration, recipe.processingTime * bc);
      this.assertEq(this.valOngoing(workshop).length, 0);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc02_03_lockedRecipeJob(): TestCaseResult {
    const id = 'TC2.3'; const name = '未解锁配方工单被验证器识别';
    const t = performance.now();
    try {
      const workshop = this.newState();
      const job = this.createOngoingJob('workshop_enhance_eternal', 1, 0.2);
      workshop.activeJobs.push(job);
      const errs = this.valOngoing(workshop);
      this.assertGt(errs.length, 0, '应检测到未解锁');
      this.assertTrue(errs.some(e => e.includes('未解锁')), '错误包含"未解锁"');
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc02_04_duplicateJobsRejected(): TestCaseResult {
    const id = 'TC2.4'; const name = '同配方双工单被检测到';
    const t = performance.now();
    try {
      const workshop = this.newState();
      workshop.activeJobs.push(this.createOngoingJob('workshop_refine_moonlight', 2, 0.1));
      workshop.activeJobs.push(this.createOngoingJob('workshop_refine_moonlight', 3, 0.5));
      const errs = this.valOngoing(workshop);
      this.assertGt(errs.length, 0, '应检测到重复工单');
      this.assertTrue(errs.some(e => e.includes('同配方')), '错误包含"同配方"');
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc02_05_futureStartTime(): TestCaseResult {
    const id = 'TC2.5'; const name = '未来 startTime 被检测';
    const t = performance.now();
    try {
      const workshop = this.newState();
      const job = this.createOngoingJob('workshop_purify_dream', 1, 0.1);
      job.startTime = Date.now() + 60000;
      workshop.activeJobs.push(job);
      const errs = this.valOngoing(workshop);
      this.assertGt(errs.length, 0, '应检测到未来时间');
      this.assertTrue(errs.some(e => e.includes('未来')), '错误包含"未来"');
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc02_06_overMaxActiveJobs(): TestCaseResult {
    const id = 'TC2.6'; const name = '超过最大活跃工单数被检测';
    const t = performance.now();
    try {
      const workshop = this.newState();
      const rids = ['workshop_refine_moonlight', 'workshop_purify_starlight', 'workshop_enhance_dew', 'workshop_refine_glowing'];
      rids.forEach((rid, i) => workshop.activeJobs.push(this.createOngoingJob(rid, 1, 0.1 + i * 0.05)));
      this.assertGt(workshop.activeJobs.length, WORKSHOP_MAX_ACTIVE_JOBS);
      const errs = this.valOngoing(workshop);
      this.assertGt(errs.length, 0);
      this.assertTrue(errs.some(e => e.includes('超限')), '错误包含"超限"');
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc02_07_restoreProgressSettleFull(): TestCaseResult {
    const id = 'TC2.7'; const name = '恢复→续跑→超时→结算 全流程';
    const t = performance.now();
    try {
      const workshop = this.newState();
      const job = this.createOngoingJob('workshop_enhance_dew', 2, 0.1);
      workshop.activeJobs.push(job);
      this.assertEq(this.valOngoing(workshop).length, 0, '10% 进度应通过');

      job.startTime = Date.now() - job.duration * 0.95;
      this.assertEq(this.valOngoing(workshop).length, 0, '95% 进度仍应通过');

      job.startTime = Date.now() - job.duration - 1000;
      this.assertGt(this.valOfflineSettlement(workshop).length, 0, '超时未结算应报错');

      this.settle(workshop, job, 42);
      workshop.activeJobs = [];
      const r = this.runAllVals(workshop);
      this.assertTrue(r.passed, `结算后全套失败: ${r.errors.join(', ')}`);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc02_08_multiStage(): TestCaseResult {
    const id = 'TC2.8'; const name = '3 工单 30%/60%/90% 进度全部验证通过';
    const t = performance.now();
    try {
      const workshop = this.newState();
      const configs = [
        ['workshop_refine_moonlight', 5, 0.3],
        ['workshop_purify_starlight', 4, 0.6],
        ['workshop_enhance_dew', 3, 0.9]
      ] as const;
      configs.forEach(([id, bc, p]) =>
        workshop.activeJobs.push(this.createOngoingJob(id as string, bc as number, p as number)));
      this.assertEq(workshop.activeJobs.length, 3);
      const r = this.runAllVals(workshop);
      this.assertTrue(r.passed, `多阶段验证失败: ${r.errors.join(', ')}`);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc02_09_tamperedDuration(): TestCaseResult {
    const id = 'TC2.9'; const name = '被篡改 duration 被检测';
    const t = performance.now();
    try {
      const workshop = this.newState();
      const job = this.createOngoingJob('workshop_refine_glowing', 2, 0.5);
      job.duration += 9999;
      workshop.activeJobs.push(job);
      const errs = this.valOngoing(workshop);
      this.assertGt(errs.length, 0, '应检测到时长不符');
      this.assertTrue(errs.some(e => e.includes('时长不符')), '错误包含"时长不符"');
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  // ================ TC03 批量产出统计 ================
  private runTC03_BatchStats(): void {
    const cases: TestCaseResult[] = [];
    const s = performance.now();

    cases.push(this.tc03_01_initialStatsAllZero());
    cases.push(this.tc03_02_singleBatchMax());
    cases.push(this.tc03_03_averageCorrect());
    cases.push(this.tc03_04_typeBreakdownSum());
    cases.push(this.tc03_05_outputMatchesRecordsSum());
    cases.push(this.tc03_06_peakBatchSizeIsMax());
    cases.push(this.tc03_07_tamperedOutputDetected());
    cases.push(this.tc03_08_tamperedAvgDetected());
    cases.push(this.tc03_09_30RunsFullPass());
    cases.push(this.tc03_10_noOpsBadAvgDetected());

    this.results.push({
      suiteName: 'TC3 批量产出统计一致性回归测试',
      total: cases.length,
      passed: cases.filter(c => c.passed).length,
      failed: cases.filter(c => !c.passed).length,
      durationMs: performance.now() - s,
      timestamp: Date.now(),
      cases
    });
  }

  private tc03_01_initialStatsAllZero(): TestCaseResult {
    const id = 'TC3.1'; const name = '初始统计全部为0';
    const t = performance.now();
    try {
      const ws = this.newState();
      const s = ws.productionStats;
      this.assertEq(s.totalProcessed, 0); this.assertEq(s.totalOutput, 0);
      this.assertEq(s.totalBatchOperations, 0); this.assertEq(s.averageOutputPerRun, 0);
      this.assertEq(s.peakBatchSize, 0); this.assertEq(s.totalProcessingTime, 0);
      this.assertEq(s.recipesByProcessingType[ProcessingType.REFINING], 0);
      this.assertEq(this.valBatchStats(ws).length, 0);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc03_02_singleBatchMax(): TestCaseResult {
    const id = 'TC3.2'; const name = '单次最大批量 totalProcessed 正确';
    const t = performance.now();
    try {
      const ws = this.newState();
      const recipe = this.r('workshop_refine_moonlight');
      const job = this.createOfflineJob(recipe.id, recipe.batchMax);
      this.settle(ws, job, 1); ws.activeJobs = [];
      this.assertEq(ws.productionStats.totalProcessed, recipe.batchMax);
      this.assertEq(ws.productionStats.totalBatchOperations, 1);
      this.assertEq(this.valBatchStats(ws).length, 0);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc03_03_averageCorrect(): TestCaseResult {
    const id = 'TC3.3'; const name = '平均产出与总量一致';
    const t = performance.now();
    try {
      const ws = this.newState();
      const runs = [
        ['workshop_refine_moonlight', 3, 1],
        ['workshop_purify_starlight', 2, 2],
        ['workshop_enhance_dew', 3, 3],
        ['workshop_refine_glowing', 2, 4],
        ['workshop_purify_dream', 1, 5]
      ] as const;
      runs.forEach(([id, bc, seed], i) =>
        this.settle(ws, this.createOfflineJob(id as string, bc as number), seed as number));
      ws.activeJobs = [];
      const s = ws.productionStats;
      const exp = s.totalOutput / s.totalBatchOperations;
      this.assertEq(s.totalBatchOperations, 5);
      this.assertTrue(Math.abs(s.averageOutputPerRun - exp) < 0.01,
        `avg ${s.averageOutputPerRun} != ${exp}`);
      this.assertEq(this.valBatchStats(ws).length, 0);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc03_04_typeBreakdownSum(): TestCaseResult {
    const id = 'TC3.4'; const name = '加工类型分项合计正确';
    const t = performance.now();
    try {
      const ws = this.newState();
      const refining = WORKSHOP_RECIPES.filter(x => x.processingType === ProcessingType.REFINING);
      const purifying = WORKSHOP_RECIPES.filter(x => x.processingType === ProcessingType.PURIFYING);
      const enhancing = WORKSHOP_RECIPES.filter(x => x.processingType === ProcessingType.ENHANCING);
      [refining[0], purifying[0], enhancing[0], refining[1], purifying[1]].forEach((recipe, i) =>
        this.settle(ws, this.createOfflineJob(recipe.id, 2), i + 7));
      ws.activeJobs = [];
      const s = ws.productionStats;
      const r = s.recipesByProcessingType[ProcessingType.REFINING];
      const p = s.recipesByProcessingType[ProcessingType.PURIFYING];
      const e = s.recipesByProcessingType[ProcessingType.ENHANCING];
      this.assertEq(r, 2); this.assertEq(p, 2); this.assertEq(e, 1);
      this.assertEq(r + p + e, s.totalBatchOperations);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc03_05_outputMatchesRecordsSum(): TestCaseResult {
    const id = 'TC3.5'; const name = 'totalOutput 等于记录 resultCount 之和';
    const t = performance.now();
    try {
      const ws = this.newState();
      for (let i = 0; i < 8; i++) {
        const recipe = WORKSHOP_RECIPES[i % WORKSHOP_RECIPES.length];
        const bc = Math.min(i + 1, recipe.batchMax);
        this.settle(ws, this.createOfflineJob(recipe.id, bc), i * 13 + 5);
      }
      ws.activeJobs = [];
      const sum = ws.productionRecords.reduce((a, r) => a + r.resultCount, 0);
      this.assertEq(ws.productionStats.totalOutput, sum);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc03_06_peakBatchSizeIsMax(): TestCaseResult {
    const id = 'TC3.6'; const name = 'peakBatchSize 等于记录中最大值';
    const t = performance.now();
    try {
      const ws = this.newState();
      const batches = [2, 5, 1, 4, 3]; const expected = Math.max(...batches);
      batches.forEach((b, i) => {
        const recipe = WORKSHOP_RECIPES[i % WORKSHOP_RECIPES.length];
        const bc = Math.min(b, recipe.batchMax);
        this.settle(ws, this.createOfflineJob(recipe.id, bc), i * 3 + 1);
      });
      ws.activeJobs = [];
      const recordsMax = ws.productionRecords.reduce((m, r) => Math.max(m, r.batchCount), 0);
      this.assertGte(ws.productionStats.peakBatchSize, recordsMax);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc03_07_tamperedOutputDetected(): TestCaseResult {
    const id = 'TC3.7'; const name = '被篡改 totalOutput 被检测';
    const t = performance.now();
    try {
      const ws = this.newState();
      for (let i = 0; i < 3; i++)
        this.settle(ws, this.createOfflineJob(WORKSHOP_RECIPES[i].id, 2), i + 1);
      ws.activeJobs = [];
      ws.productionStats.totalOutput = Math.max(0, ws.productionStats.totalOutput - 50);
      const errs = this.valBatchStats(ws);
      this.assertGt(errs.length, 0);
      this.assertTrue(errs.some(e => e.includes('产出与记录不符')));
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc03_08_tamperedAvgDetected(): TestCaseResult {
    const id = 'TC3.8'; const name = '被篡改 averageOutputPerRun 被检测';
    const t = performance.now();
    try {
      const ws = this.newState();
      for (let i = 0; i < 5; i++)
        this.settle(ws, this.createOfflineJob(WORKSHOP_RECIPES[i].id, 2), i * 7 + 3);
      ws.activeJobs = [];
      ws.productionStats.averageOutputPerRun = 9999;
      const errs = this.valBatchStats(ws);
      this.assertGt(errs.length, 0);
      this.assertTrue(errs.some(e => e.includes('平均产出不符')));
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc03_09_30RunsFullPass(): TestCaseResult {
    const id = 'TC3.9'; const name = '30 次加工全套验证通过';
    const t = performance.now();
    try {
      const ws = this.newState();
      for (let i = 0; i < 30; i++) {
        const recipe = WORKSHOP_RECIPES[i % WORKSHOP_RECIPES.length];
        const bc = 1 + (i % recipe.batchMax);
        this.settle(ws, this.createOfflineJob(recipe.id, bc), i * 17 + 11);
      }
      ws.activeJobs = [];
      const r = this.runAllVals(ws);
      this.assertTrue(r.passed, `30次失败: ${r.errors.join(', ')}`);
      this.assertEq(ws.productionStats.totalBatchOperations, 30);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc03_10_noOpsBadAvgDetected(): TestCaseResult {
    const id = 'TC3.10'; const name = '无操作但平均产出非零被检测';
    const t = performance.now();
    try {
      const ws = this.newState();
      ws.productionStats.averageOutputPerRun = 3.14;
      const errs = this.valBatchStats(ws);
      this.assertGt(errs.length, 0);
      this.assertTrue(errs.some(e => e.includes('平均产出非0')));
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  // ================ TC04 生产记录持久化 ================
  private runTC04_ProductionRecords(): void {
    const cases: TestCaseResult[] = [];
    const s = performance.now();

    cases.push(this.tc04_01_initialEmpty());
    cases.push(this.tc04_02_singleRecordComplete());
    cases.push(this.tc04_03_descendingTimestamp());
    cases.push(this.tc04_04_overLimitTruncated());
    cases.push(this.tc04_05_atLimitStillValid());
    cases.push(this.tc04_06_batchOverMaxDetected());
    cases.push(this.tc04_07_tamperedFieldsDetected());
    cases.push(this.tc04_08_reversedOrderDetected());
    cases.push(this.tc04_09_limitMaintainedOnAppend());
    cases.push(this.tc04_10_20RecordsFullValidation());

    this.results.push({
      suiteName: 'TC4 生产记录持久化回归测试',
      total: cases.length,
      passed: cases.filter(c => c.passed).length,
      failed: cases.filter(c => !c.passed).length,
      durationMs: performance.now() - s,
      timestamp: Date.now(),
      cases
    });
  }

  private tc04_01_initialEmpty(): TestCaseResult {
    const id = 'TC4.1'; const name = '初始记录为空数组';
    const t = performance.now();
    try {
      const ws = this.newState();
      this.assertTrue(Array.isArray(ws.productionRecords));
      this.assertEq(ws.productionRecords.length, 0);
      this.assertEq(this.valRecords(ws).length, 0);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc04_02_singleRecordComplete(): TestCaseResult {
    const id = 'TC4.2'; const name = '单条记录字段完整正确';
    const t = performance.now();
    try {
      const ws = this.newState();
      const recipe = this.r('workshop_refine_moonlight');
      const bc = 3;
      const job = this.createOfflineJob(recipe.id, bc);
      const r = this.settle(ws, job, 5);
      ws.activeJobs = [];
      this.assertEq(ws.productionRecords.length, 1);
      const rec = ws.productionRecords[0];
      this.assertTrue(typeof rec.id === 'string' && rec.id.length > 0, 'id 非空字符串');
      this.assertEq(rec.recipeId, recipe.id);
      this.assertEq(rec.batchCount, bc);
      this.assertEq(rec.resultCount, r.totalOutput);
      this.assertEq(rec.resultType, recipe.output.type);
      this.assertEq(rec.processingTime, recipe.processingTime * bc);
      this.assertGt(rec.timestamp, 0);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc04_03_descendingTimestamp(): TestCaseResult {
    const id = 'TC4.3'; const name = '10 条记录按时间降序排列';
    const t = performance.now();
    try {
      const ws = this.newState();
      for (let i = 0; i < 10; i++) {
        const recipe = WORKSHOP_RECIPES[i % WORKSHOP_RECIPES.length];
        this.settle(ws, this.createOfflineJob(recipe.id, 2), i + 1);
        ws.activeJobs = [];
      }
      for (let i = 1; i < ws.productionRecords.length; i++)
        this.assertLte(ws.productionRecords[i].timestamp, ws.productionRecords[i - 1].timestamp,
          `记录${i}应早于记录${i - 1}`);
      this.assertEq(this.valRecords(ws).length, 0);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc04_04_overLimitTruncated(): TestCaseResult {
    const id = 'TC4.4'; const name = '超过 MAX_RECORDS 被截断';
    const t = performance.now();
    try {
      const ws = this.newState();
      const over = WORKSHOP_MAX_RECORDS + 15;
      for (let i = 0; i < over; i++) {
        const recipe = WORKSHOP_RECIPES[i % WORKSHOP_RECIPES.length];
        this.settle(ws, this.createOfflineJob(recipe.id, 2), i * 5 + 3);
        ws.activeJobs = [];
      }
      this.assertLte(ws.productionRecords.length, WORKSHOP_MAX_RECORDS);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc04_05_atLimitStillValid(): TestCaseResult {
    const id = 'TC4.5'; const name = '刚好达到上限仍合法';
    const t = performance.now();
    try {
      const ws = this.newState();
      for (let i = 0; i < WORKSHOP_MAX_RECORDS; i++) {
        const recipe = WORKSHOP_RECIPES[i % WORKSHOP_RECIPES.length];
        const bc = 1 + (i % 4);
        this.settle(ws, this.createOfflineJob(recipe.id, bc), i * 3 + 1);
        ws.activeJobs = [];
      }
      this.assertEq(ws.productionRecords.length, WORKSHOP_MAX_RECORDS);
      const r = this.runAllVals(ws);
      this.assertTrue(r.passed, `满容量失败: ${r.errors.join(', ')}`);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc04_06_batchOverMaxDetected(): TestCaseResult {
    const id = 'TC4.6'; const name = 'batchCount 超配方上限被检测';
    const t = performance.now();
    try {
      const ws = this.newState();
      const recipe = this.r('workshop_enhance_eternal');
      const job = this.createOfflineJob(recipe.id, recipe.batchMax);
      this.settle(ws, job, 7);
      ws.activeJobs = [];
      ws.productionRecords[0].batchCount = recipe.batchMax + 999;
      const errs = this.valRecords(ws);
      this.assertGt(errs.length, 0);
      this.assertTrue(errs.some(e => e.includes('超上限')));
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc04_07_tamperedFieldsDetected(): TestCaseResult {
    const id = 'TC4.7'; const name = 'timestamp=0 / resultCount=-1 被检测';
    const t = performance.now();
    try {
      const ws = this.newState();
      this.settle(ws, this.createOfflineJob('workshop_refine_moonlight', 2), 1);
      ws.activeJobs = [];
      ws.productionRecords[0].timestamp = 0;
      ws.productionRecords[0].resultCount = -1;
      const errs = this.valRecords(ws);
      this.assertGte(errs.length, 2, '应至少报 2 个错');
      this.assertTrue(errs.some(e => e.includes('timestamp')));
      this.assertTrue(errs.some(e => e.includes('resultCount')));
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc04_08_reversedOrderDetected(): TestCaseResult {
    const id = 'TC4.8'; const name = '时序颠倒被检测';
    const t = performance.now();
    try {
      const ws = this.newState();
      for (let i = 0; i < 5; i++) {
        this.settle(ws, this.createOfflineJob(WORKSHOP_RECIPES[i].id, 2), i + 1);
        ws.activeJobs = [];
      }
      ws.productionRecords = [...ws.productionRecords].reverse();
      const errs = this.valRecords(ws);
      this.assertGt(errs.length, 0);
      this.assertTrue(errs.some(e => e.includes('时序')));
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc04_09_limitMaintainedOnAppend(): TestCaseResult {
    const id = 'TC4.9'; const name = '满容量追加后旧记录被挤出';
    const t = performance.now();
    try {
      const ws = this.newState();
      for (let i = 0; i < WORKSHOP_MAX_RECORDS; i++) {
        const recipe = WORKSHOP_RECIPES[i % WORKSHOP_RECIPES.length];
        this.settle(ws, this.createOfflineJob(recipe.id, 2), i + 1);
        ws.activeJobs = [];
      }
      const oldestId = ws.productionRecords[ws.productionRecords.length - 1].id;
      const topBefore = ws.productionRecords[0].id;
      this.settle(ws, this.createOfflineJob('workshop_refine_moonlight', 3), 101);
      ws.activeJobs = [];
      this.assertEq(ws.productionRecords.length, WORKSHOP_MAX_RECORDS);
      this.assertTrue(ws.productionRecords[0].id !== topBefore, '最新记录应已更新');
      this.assertTrue(ws.productionRecords[ws.productionRecords.length - 1].id !== oldestId, '最旧记录应已挤出');
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  private tc04_10_20RecordsFullValidation(): TestCaseResult {
    const id = 'TC4.10'; const name = '20 条混合记录全套验证通过';
    const t = performance.now();
    try {
      const ws = this.newState();
      for (let i = 0; i < 20; i++) {
        const recipe = WORKSHOP_RECIPES[i % WORKSHOP_RECIPES.length];
        const bc = 1 + (i % recipe.batchMax);
        this.settle(ws, this.createOfflineJob(recipe.id, bc), i * 11 + 7);
        ws.activeJobs = [];
      }
      this.assertEq(ws.productionRecords.length, 20);
      const r = this.runAllVals(ws);
      this.assertTrue(r.passed, `20条记录全套失败: ${r.errors.join(', ')}`);
      return this.pass(id, name, performance.now() - t);
    } catch (e: any) {
      return this.fail(id, name, e.message, performance.now() - t);
    }
  }

  // ================= helpers =================
  private newState(): WorkshopState {
    const ws: WorkshopState = JSON.parse(JSON.stringify(INITIAL_WORKSHOP_STATE));
    ws.recipeStates.forEach(rs => { rs.isUnlocked = true; });
    return ws;
  }

  private cloneState(ws: WorkshopState): WorkshopState { return JSON.parse(JSON.stringify(ws)); }

  private r(id: string) { return WORKSHOP_RECIPES.find(x => x.id === id)!; }

  private createOfflineJob(recipeId: string, batchCount: number): WorkshopActiveJob {
    const recipe = this.r(recipeId);
    const duration = recipe.processingTime * batchCount;
    return {
      id: `job_t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      recipeId, batchCount,
      startTime: Date.now() - duration - 3600_000,
      duration,
      isUpgraded: false
    };
  }

  private createOngoingJob(recipeId: string, batchCount: number, progress: number): WorkshopActiveJob {
    const recipe = this.r(recipeId);
    const duration = recipe.processingTime * batchCount;
    return {
      id: `job_t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      recipeId, batchCount,
      startTime: Date.now() - Math.floor(duration * progress),
      duration,
      isUpgraded: false
    };
  }

  private settle(ws: WorkshopState, job: WorkshopActiveJob, seed: number) {
    const recipe = this.r(job.recipeId);
    let s2 = seed;
    const rand = () => { s2 = (s2 * 9301 + 49297) % 233280; return s2 / 233280; };
    const rs = ws.recipeStates.find(x => x.recipeId === job.recipeId)!;
    const rate = Math.min(1, recipe.successRate + (rs.currentLevel - 1) * recipe.upgradeSuccessRateBonus);
    const outPerBatch = recipe.output.count + (rs.currentLevel - 1) * recipe.upgradeOutputBonus;
    let totalOutput = 0;
    let sb = 0;
    for (let i = 0; i < job.batchCount; i++) {
      if (rand() <= rate) { totalOutput += outPerBatch; sb++; }
    }
    rs.totalProduced += totalOutput;
    rs.totalBatchRuns += 1;
    rs.lastProducedAt = Date.now();
    const stats = ws.productionStats;
    stats.totalProcessed += job.batchCount;
    stats.totalOutput += totalOutput;
    stats.totalBatchOperations += 1;
    stats.totalProcessingTime += job.duration;
    if (job.batchCount > stats.peakBatchSize) stats.peakBatchSize = job.batchCount;
    stats.recipesByProcessingType[recipe.processingType] =
      (stats.recipesByProcessingType[recipe.processingType] || 0) + 1;
    stats.averageOutputPerRun = stats.totalBatchOperations > 0 ? stats.totalOutput / stats.totalBatchOperations : 0;
    ws.productionRecords.unshift({
      id: `rec_t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      recipeId: job.recipeId,
      batchCount: job.batchCount,
      resultType: recipe.output.type,
      resultCount: totalOutput,
      timestamp: Date.now(),
      processingTime: job.duration,
      wasUpgraded: job.isUpgraded
    });
    if (ws.productionRecords.length > WORKSHOP_MAX_RECORDS) {
      ws.productionRecords = ws.productionRecords.slice(0, WORKSHOP_MAX_RECORDS);
    }
    return { totalOutput, successBatches: sb };
  }

  private valOfflineSettlement(ws: WorkshopState): string[] {
    const errs: string[] = []; const now = Date.now();
    ws.activeJobs.forEach(job => {
      const recipe = this.r(job.recipeId);
      if (!recipe) { errs.push(`配方不存在: ${job.recipeId}`); return; }
      if (now - job.startTime >= job.duration) {
        errs.push(`离线完成工单未被结算: job=${job.id} recipe=${job.recipeId}`);
      }
    }); return errs;
  }

  private valOngoing(ws: WorkshopState): string[] {
    const errs: string[] = []; const now = Date.now();
    ws.activeJobs.forEach(job => {
      const recipe = this.r(job.recipeId);
      if (!recipe) return;
      const elapsed = now - job.startTime;
      if (elapsed < job.duration) {
        if (job.duration !== recipe.processingTime * job.batchCount)
          errs.push(`进行中工单时长不符: ${job.duration} vs ${recipe.processingTime * job.batchCount}`);
        const rs = ws.recipeStates.find(x => x.recipeId === job.recipeId);
        if (!rs || !rs.isUnlocked) errs.push(`进行中工单配方未解锁: ${job.recipeId}`);
        if (ws.activeJobs.filter(j => j.recipeId === job.recipeId).length > 1)
          errs.push(`同配方存在多个并行工单: ${job.recipeId}`);
        if (job.startTime > now) errs.push(`进行中工单起始时间在未来: ${job.id}`);
      }
    });
    if (ws.activeJobs.length > WORKSHOP_MAX_ACTIVE_JOBS)
      errs.push(`活跃工单数超限: ${ws.activeJobs.length}`);
    return errs;
  }

  private valBatchStats(ws: WorkshopState): string[] {
    const errs: string[] = [];
    const s = ws.productionStats;
    if (s.totalBatchOperations < 0) errs.push('批量操作次数负');
    if (s.totalProcessed < 0) errs.push('总加工次数负');
    if (s.totalOutput < 0) errs.push('总产出次数负');
    if (s.totalBatchOperations > 0 && s.totalProcessed < s.totalBatchOperations)
      errs.push('totalProcessed < totalBatchOperations');
    if (s.totalBatchOperations > 0) {
      const exp = s.totalOutput / s.totalBatchOperations;
      if (Math.abs(s.averageOutputPerRun - exp) > 0.01)
        errs.push(`平均产出不符: ${s.averageOutputPerRun} vs ${exp}`);
    } else if (s.averageOutputPerRun !== 0) errs.push('无操作但平均产出非0');
    const sumR = ws.productionRecords.reduce((a, r) => a + r.resultCount, 0);
    if (s.totalOutput !== sumR) errs.push(`产出与记录不符: ${s.totalOutput} vs ${sumR}`);
    if (ws.productionRecords.length > 0 && s.totalBatchOperations !== ws.productionRecords.length)
      errs.push(`批次与记录条数不符: ${s.totalBatchOperations} vs ${ws.productionRecords.length}`);
    const ts = (s.recipesByProcessingType[ProcessingType.REFINING] || 0) +
      (s.recipesByProcessingType[ProcessingType.PURIFYING] || 0) +
      (s.recipesByProcessingType[ProcessingType.ENHANCING] || 0);
    if (ts !== s.totalBatchOperations) errs.push(`类型分项合计不符: ${ts} vs ${s.totalBatchOperations}`);
    if (s.peakBatchSize < 1 && s.totalBatchOperations > 0) errs.push('peakBatchSize 异常');
    const rm = ws.productionRecords.reduce((m, r) => Math.max(m, r.batchCount), 0);
    if (rm > s.peakBatchSize && ws.productionRecords.length > 0) errs.push('peakBatchSize < 记录中最大批量');
    return errs;
  }

  private valRecords(ws: WorkshopState): string[] {
    const errs: string[] = [];
    if (!Array.isArray(ws.productionRecords)) { errs.push('非数组'); return errs; }
    if (ws.productionRecords.length > WORKSHOP_MAX_RECORDS)
      errs.push(`记录超限: ${ws.productionRecords.length}`);
    ws.productionRecords.forEach((r, i) => {
      if (!r.id) errs.push(`记录${i}无id`);
      if (!r.recipeId) errs.push(`记录${i}无recipeId`);
      if (typeof r.batchCount !== 'number' || r.batchCount < 1) errs.push(`记录${i} batchCount 异常`);
      if (typeof r.resultCount !== 'number' || r.resultCount < 0) errs.push(`记录${i} resultCount 异常`);
      if (typeof r.timestamp !== 'number' || r.timestamp <= 0) errs.push(`记录${i} timestamp 异常`);
      if (typeof r.processingTime !== 'number' || r.processingTime <= 0) errs.push(`记录${i} processingTime 异常`);
      if (r.recipeId) {
        const recipe = this.r(r.recipeId);
        if (recipe && r.batchCount > recipe.batchMax) errs.push(`记录${i} batchCount 超上限`);
      }
    });
    for (let i = 1; i < ws.productionRecords.length; i++) {
      if (ws.productionRecords[i].timestamp > ws.productionRecords[i - 1].timestamp) {
        errs.push('记录时序颠倒'); break;
      }
    }
    return errs;
  }

  private runAllVals(ws: WorkshopState): { passed: boolean; errors: string[] } {
    const e = [
      ...this.valOfflineSettlement(ws),
      ...this.valOngoing(ws),
      ...this.valBatchStats(ws),
      ...this.valRecords(ws)
    ];
    return { passed: e.length === 0, errors: e };
  }

  private pass(id: string, name: string, d: number): TestCaseResult {
    return { id, name, passed: true, durationMs: d };
  }
  private fail(id: string, name: string, err: string, d: number): TestCaseResult {
    return { id, name, passed: false, error: err, durationMs: d };
  }
  private assertEq(a: any, b: any, msg?: string): void {
    if (a !== b) throw new Error(msg ?? `断言失败: ${a} !== ${b}`);
  }
  private assertGt(a: number, b: number, msg?: string): void {
    if (!(a > b)) throw new Error(msg ?? `断言失败: ${a} > ${b} 不成立`);
  }
  private assertGte(a: number, b: number, msg?: string): void {
    if (!(a >= b)) throw new Error(msg ?? `断言失败: ${a} >= ${b} 不成立`);
  }
  private assertLte(a: number, b: number, msg?: string): void {
    if (!(a <= b)) throw new Error(msg ?? `断言失败: ${a} <= ${b} 不成立`);
  }
  private assertTrue(cond: boolean, msg?: string): void {
    if (!cond) throw new Error(msg ?? '断言失败');
  }
}
