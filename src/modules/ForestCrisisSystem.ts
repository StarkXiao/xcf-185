import Phaser from 'phaser';
import {
  CrisisType,
  CrisisSeverity,
  CrisisStatus,
  ForestCrisisConfig,
  ForestCrisisInstance,
  ForestCrisisSettlement,
  ForestCrisisSystemState,
  CrisisPurifyCost,
  CrisisSpecialDrop,
  CrisisGlobalEffect,
  PetalType,
  StatusType
} from '../types';
import {
  FOREST_CRISIS_CONFIGS,
  CRISIS_REGION_MAP,
  CRISIS_CHECK_INTERVAL,
  MAX_CONCURRENT_CRISES,
  MAX_CRISIS_SETTLEMENTS,
  CRISIS_PURIFY_PROGRESS_PER_SECOND
} from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { EventManager } from '../managers/EventManager';

export class ForestCrisisSystem {
  private scene: Phaser.Scene;
  private crisisConfigs: ForestCrisisConfig[] = FOREST_CRISIS_CONFIGS;
  private eventListeners: Array<{ event: string; callback: (data: any) => void }> = [];
  private warningTimers: Map<string, Phaser.Time.TimerEvent> = new Map();
  private purifyTimers: Map<string, Phaser.Time.TimerEvent> = new Map();
  private crisisOverlays: Map<string, Phaser.GameObjects.Container> = new Map();
  private crisisCountdownTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private purifyBarGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private penaltyTimer: Phaser.Time.TimerEvent | null = null;
  private globalEffectOverlay: Phaser.GameObjects.Graphics | null = null;
  private popupContainer: Phaser.GameObjects.Container | null = null;
  private popupTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public create(): void {
    this.setupEventListeners();
    this.createGlobalEffectOverlay();
    this.restoreActiveCrises();
  }

  private setupEventListeners(): void {
    const onPetalCollected = () => {
      this.checkCrisisTrigger();
    };
    const onPlaytimeUpdate = () => {
      this.checkCrisisTrigger();
    };

    EventManager.getInstance().on('petal:collected', onPetalCollected);
    EventManager.getInstance().on('playtime:update', onPlaytimeUpdate);

    this.eventListeners.push({ event: 'petal:collected', callback: onPetalCollected });
    this.eventListeners.push({ event: 'playtime:update', callback: onPlaytimeUpdate });
  }

  private createGlobalEffectOverlay(): void {
    this.globalEffectOverlay = this.scene.add.graphics();
    this.globalEffectOverlay.setDepth(4);
    this.globalEffectOverlay.setScrollFactor(0);
    this.globalEffectOverlay.setAlpha(0);
  }

  private restoreActiveCrises(): void {
    const state = this.getCrisisState();
    state.activeCrises.forEach(instance => {
      if (instance.status === CrisisStatus.ACTIVE || instance.status === CrisisStatus.WARNING) {
        this.createCrisisOverlay(instance);
      }
      if (instance.status === CrisisStatus.PURIFYING) {
        this.createCrisisOverlay(instance);
        this.createPurifyBar(instance);
      }
    });
    this.applyGlobalEffects();
    if (state.activePenalty) {
      this.applyPenaltyVisuals();
    }
  }

  private getCrisisState(): ForestCrisisSystemState {
    return SaveManager.getInstance().getGameState().forestCrisisState;
  }

  private checkCrisisTrigger(): void {
    const gameState = SaveManager.getInstance().getGameState();
    const crisisState = gameState.forestCrisisState;

    const now = Date.now();
    if (now < crisisState.nextCrisisCheckTime) return;
    crisisState.nextCrisisCheckTime = now + CRISIS_CHECK_INTERVAL;

    if (crisisState.activeCrises.length >= MAX_CONCURRENT_CRISES) return;

    const eligibleConfigs = this.crisisConfigs.filter(config => {
      if (crisisState.activeCrises.some(c => c.crisisId === config.id)) return false;
      if (crisisState.resolvedCrises.includes(config.id)) return false;
      if (crisisState.failedCrises.includes(config.id)) return false;

      const meetsPlayTime = gameState.playTime >= config.triggerCondition.minPlayTime;
      const meetsCollected = gameState.totalCollected >= config.triggerCondition.minTotalCollected;
      const meetsCooldown = now - crisisState.lastCrisisTime >= config.triggerCondition.cooldown;

      return meetsPlayTime && meetsCollected && meetsCooldown;
    });

    if (eligibleConfigs.length === 0) return;

    const totalWeight = eligibleConfigs.reduce((sum, c) => {
      switch (c.severity) {
        case CrisisSeverity.MINOR: return sum + 4;
        case CrisisSeverity.MODERATE: return sum + 3;
        case CrisisSeverity.MAJOR: return sum + 2;
        case CrisisSeverity.CATASTROPHIC: return sum + 1;
        default: return sum;
      }
    }, 0);

    let random = Math.random() * totalWeight;
    let selectedConfig = eligibleConfigs[0];

    for (const config of eligibleConfigs) {
      const weight = (() => {
        switch (config.severity) {
          case CrisisSeverity.MINOR: return 4;
          case CrisisSeverity.MODERATE: return 3;
          case CrisisSeverity.MAJOR: return 2;
          case CrisisSeverity.CATASTROPHIC: return 1;
          default: return 1;
        }
      })();
      random -= weight;
      if (random <= 0) {
        selectedConfig = config;
        break;
      }
    }

    this.triggerCrisis(selectedConfig);
  }

  private triggerCrisis(config: ForestCrisisConfig): void {
    const gameState = SaveManager.getInstance().getGameState();
    const crisisState = gameState.forestCrisisState;
    const now = Date.now();
    const regionId = CRISIS_REGION_MAP[config.id] || 'moonlight_glade';

    const instance: ForestCrisisInstance = {
      crisisId: config.id,
      status: CrisisStatus.WARNING,
      startedAt: now,
      warningStartedAt: now,
      timeRemaining: config.warningDuration + config.duration,
      purifyProgress: 0,
      purifyTarget: 100,
      costsPaid: [],
      resolvedAt: 0,
      failedAt: 0,
      regionId
    };

    crisisState.activeCrises.push(instance);
    crisisState.totalCrisesTriggered += 1;
    crisisState.lastCrisisTime = now;

    SaveManager.getInstance().saveGame(gameState);

    EventManager.getInstance().emit('crisis:warning', {
      crisisId: config.id,
      crisisName: config.name,
      type: config.type,
      severity: config.severity,
      timeRemaining: config.warningDuration,
      regionId
    });

    this.showCrisisPopup(config, 'warning');

    SaveManager.getInstance().showStatusMessage(
      gameState,
      StatusType.WARNING,
      `${config.icon} 危机预警`,
      `${config.name} 即将来袭！${config.description}`,
      config.warningDuration
    );

    const warningTimer = this.scene.time.delayedCall(config.warningDuration, () => {
      this.activateCrisis(config, instance);
      this.warningTimers.delete(config.id);
    });
    this.warningTimers.set(config.id, warningTimer);

    this.createCrisisOverlay(instance);
  }

  private activateCrisis(config: ForestCrisisConfig, instance: ForestCrisisInstance): void {
    const gameState = SaveManager.getInstance().getGameState();
    const crisisState = gameState.forestCrisisState;
    const activeCrisis = crisisState.activeCrises.find(c => c.crisisId === config.id);

    if (!activeCrisis) return;

    activeCrisis.status = CrisisStatus.ACTIVE;
    activeCrisis.timeRemaining = config.duration;

    SaveManager.getInstance().saveGame(gameState);

    EventManager.getInstance().emit('crisis:active', {
      crisisId: config.id,
      crisisName: config.name,
      type: config.type,
      severity: config.severity,
      duration: config.duration,
      regionId: instance.regionId,
      globalEffect: config.globalEffect
    });

    this.showCrisisPopup(config, 'critical');

    SaveManager.getInstance().showStatusMessage(
      gameState,
      StatusType.ERROR,
      `${config.icon} 危机爆发`,
      config.globalEffect.description,
      6000
    );

    this.updateCrisisOverlay(activeCrisis);
    this.applyGlobalEffects();
  }

  public startPurify(crisisId: string): boolean {
    const gameState = SaveManager.getInstance().getGameState();
    const crisisState = gameState.forestCrisisState;
    const instance = crisisState.activeCrises.find(c => c.crisisId === crisisId);
    const config = this.crisisConfigs.find(c => c.id === crisisId);

    if (!instance || !config) return false;
    if (instance.status !== CrisisStatus.ACTIVE) return false;

    const canAfford = config.purifyCosts.every(cost => {
      const alreadyPaid = instance.costsPaid.find(p => p.petalType === cost.petalType);
      const paidCount = alreadyPaid ? alreadyPaid.count : 0;
      const remaining = cost.count - paidCount;
      return remaining <= 0 || (gameState.petals[cost.petalType] || 0) >= remaining;
    });

    if (!canAfford) return false;

    config.purifyCosts.forEach(cost => {
      const alreadyPaid = instance.costsPaid.find(p => p.petalType === cost.petalType);
      const paidCount = alreadyPaid ? alreadyPaid.count : 0;
      const remaining = cost.count - paidCount;
      if (remaining > 0) {
        SaveManager.getInstance().removePetals(cost.petalType, remaining);
        if (alreadyPaid) {
          alreadyPaid.count = cost.count;
        } else {
          instance.costsPaid.push({ petalType: cost.petalType, count: cost.count });
        }
      }
    });

    instance.status = CrisisStatus.PURIFYING;
    instance.purifyProgress = 0;
    instance.purifyTarget = 100;

    SaveManager.getInstance().saveGame(gameState);

    EventManager.getInstance().emit('crisis:purify_start', {
      crisisId,
      crisisName: config.name,
      purifyTime: config.purifyTime,
      costs: config.purifyCosts
    });

    this.createPurifyBar(instance);

    SaveManager.getInstance().showStatusMessage(
      gameState,
      StatusType.INFO,
      `${config.icon} 开始净化`,
      `消耗资源，正在净化${config.name}...`,
      3000
    );

    return true;
  }

  private createPurifyBar(instance: ForestCrisisInstance): void {
    const config = this.crisisConfigs.find(c => c.id === instance.crisisId);
    if (!config) return;

    const existing = this.purifyBarGraphics.get(instance.crisisId);
    if (existing) {
      existing.destroy();
    }

    const barWidth = 200;
    const barHeight = 12;
    const barX = this.scene.scale.width / 2;
    const barY = this.scene.scale.height / 2 + 80;

    const barContainer = this.scene.add.graphics();
    barContainer.setScrollFactor(0);
    barContainer.setDepth(200);
    this.purifyBarGraphics.set(instance.crisisId, barContainer);

    const updateBar = () => {
      const currentInstance = this.getCrisisState().activeCrises.find(c => c.crisisId === instance.crisisId);
      if (!currentInstance || currentInstance.status !== CrisisStatus.PURIFYING) {
        barContainer.destroy();
        this.purifyBarGraphics.delete(instance.crisisId);
        return;
      }

      const progress = currentInstance.purifyProgress / currentInstance.purifyTarget;
      barContainer.clear();

      barContainer.fillStyle(0x333333, 0.8);
      barContainer.fillRect(barX - barWidth / 2, barY, barWidth, barHeight);

      const fillColor = progress >= 0.8 ? 0x00ff88 : progress >= 0.5 ? 0x88ff00 : 0xffaa00;
      barContainer.fillStyle(fillColor, 0.9);
      barContainer.fillRect(barX - barWidth / 2, barY, barWidth * progress, barHeight);

      barContainer.lineStyle(2, 0xffffff, 0.6);
      barContainer.strokeRect(barX - barWidth / 2, barY, barWidth, barHeight);

      const labelText = this.scene.add.text(barX, barY - 10, `净化中 ${Math.floor(progress * 100)}%`, {
        fontSize: '12px',
        fontFamily: 'Arial, Microsoft YaHei, sans-serif',
        color: '#ffffff'
      }).setOrigin(0.5).setDepth(201).setScrollFactor(0);

      this.scene.time.delayedCall(200, () => {
        labelText.destroy();
      });
    };

    const purifyInterval = this.scene.time.addEvent({
      delay: 200,
      callback: updateBar,
      loop: true
    });

    this.purifyTimers.set(instance.crisisId, purifyInterval);
  }

  private resolveCrisis(config: ForestCrisisConfig, instance: ForestCrisisInstance): void {
    const gameState = SaveManager.getInstance().getGameState();
    const crisisState = gameState.forestCrisisState;
    const now = Date.now();

    const activeCrisis = crisisState.activeCrises.find(c => c.crisisId === config.id);
    if (!activeCrisis) return;

    activeCrisis.status = CrisisStatus.RESOLVED;
    activeCrisis.resolvedAt = now;

    crisisState.resolvedCrises.push(config.id);
    crisisState.totalCrisesResolved += 1;
    crisisState.activeCrises = crisisState.activeCrises.filter(c => c.crisisId !== config.id);

    const specialDropsGained = this.grantSpecialDrops(config);

    const settlement: ForestCrisisSettlement = {
      crisisId: config.id,
      crisisName: config.name,
      type: config.type,
      severity: config.severity,
      wasResolved: true,
      timeTaken: now - instance.startedAt,
      petalsLost: [],
      specialDropsGained,
      efficiencyPenalty: 0,
      penaltyDuration: 0,
      timestamp: now
    };

    crisisState.crisisSettlements.push(settlement);
    if (crisisState.crisisSettlements.length > MAX_CRISIS_SETTLEMENTS) {
      crisisState.crisisSettlements = crisisState.crisisSettlements.slice(-MAX_CRISIS_SETTLEMENTS);
    }

    SaveManager.getInstance().saveGame(gameState);

    this.cleanupCrisisVisuals(config.id);
    this.applyGlobalEffects();

    EventManager.getInstance().emit('crisis:resolved', {
      crisisId: config.id,
      crisisName: config.name,
      type: config.type,
      specialDrops: config.specialDrops,
      settlement
    });

    const dropsText = specialDropsGained.map(d => `${d.petalType}×${d.count}`).join(', ');
    SaveManager.getInstance().showStatusMessage(
      gameState,
      StatusType.SUCCESS,
      `${config.icon} 危机解除`,
      `${config.name}已被净化！获得：${dropsText || '无'}`,
      5000
    );

    this.dismissPopup();
  }

  private failCrisis(config: ForestCrisisConfig, instance: ForestCrisisInstance): void {
    const gameState = SaveManager.getInstance().getGameState();
    const crisisState = gameState.forestCrisisState;
    const now = Date.now();

    const activeCrisis = crisisState.activeCrises.find(c => c.crisisId === config.id);
    if (!activeCrisis) return;

    activeCrisis.status = CrisisStatus.FAILED;
    activeCrisis.failedAt = now;

    crisisState.failedCrises.push(config.id);
    crisisState.totalCrisesFailed += 1;
    crisisState.activeCrises = crisisState.activeCrises.filter(c => c.crisisId !== config.id);

    const petalsLost = this.applyFailurePenalty(gameState, config);

    crisisState.activePenalty = {
      efficiencyPenalty: config.failurePenalty.efficiencyPenalty,
      remainingDuration: config.failurePenalty.penaltyDuration
    };

    const settlement: ForestCrisisSettlement = {
      crisisId: config.id,
      crisisName: config.name,
      type: config.type,
      severity: config.severity,
      wasResolved: false,
      timeTaken: now - instance.startedAt,
      petalsLost,
      specialDropsGained: [],
      efficiencyPenalty: config.failurePenalty.efficiencyPenalty,
      penaltyDuration: config.failurePenalty.penaltyDuration,
      timestamp: now
    };

    crisisState.crisisSettlements.push(settlement);
    if (crisisState.crisisSettlements.length > MAX_CRISIS_SETTLEMENTS) {
      crisisState.crisisSettlements = crisisState.crisisSettlements.slice(-MAX_CRISIS_SETTLEMENTS);
    }

    SaveManager.getInstance().saveGame(gameState);

    this.cleanupCrisisVisuals(config.id);
    this.applyGlobalEffects();
    this.applyPenaltyVisuals();
    this.startPenaltyTimer(config.failurePenalty.penaltyDuration);

    EventManager.getInstance().emit('crisis:failed', {
      crisisId: config.id,
      crisisName: config.name,
      type: config.type,
      severity: config.severity,
      settlement
    });

    EventManager.getInstance().emit('crisis:penalty_applied', {
      efficiencyPenalty: config.failurePenalty.efficiencyPenalty,
      duration: config.failurePenalty.penaltyDuration
    });

    const lostText = petalsLost.map(d => `${d.petalType}×${d.count}`).join(', ');
    SaveManager.getInstance().showStatusMessage(
      gameState,
      StatusType.ERROR,
      `${config.icon} 危机失败`,
      `${config.name}未能净化！损失花瓣：${lostText || '无'}，效率降低${Math.floor(config.failurePenalty.efficiencyPenalty * 100)}%`,
      6000
    );

    this.showFailureSettlementPopup(config, settlement);
  }

  private grantSpecialDrops(config: ForestCrisisConfig): { petalType: PetalType; count: number }[] {
    const gained: { petalType: PetalType; count: number }[] = [];

    config.specialDrops.forEach(drop => {
      if (Math.random() <= drop.probability) {
        SaveManager.getInstance().addPetal(drop.petalType, drop.count);
        gained.push({ petalType: drop.petalType, count: drop.count });
      }
    });

    return gained;
  }

  private applyFailurePenalty(gameState: any, config: ForestCrisisConfig): { petalType: PetalType; count: number }[] {
    const lost: { petalType: PetalType; count: number }[] = [];
    const lossPercent = config.failurePenalty.petalLossPercent / 100;

    Object.entries(gameState.petals).forEach(([type, count]) => {
      const petalType = type as PetalType;
      const currentCount = count as number;
      if (currentCount > 0) {
        const lossAmount = Math.max(1, Math.floor(currentCount * lossPercent));
        if (lossAmount > 0) {
          SaveManager.getInstance().removePetals(petalType, lossAmount);
          lost.push({ petalType, count: lossAmount });
        }
      }
    });

    return lost;
  }

  private startPenaltyTimer(duration: number): void {
    if (this.penaltyTimer) {
      this.penaltyTimer.destroy();
    }

    this.penaltyTimer = this.scene.time.delayedCall(duration, () => {
      this.expirePenalty();
    });
  }

  private expirePenalty(): void {
    const gameState = SaveManager.getInstance().getGameState();
    const crisisState = gameState.forestCrisisState;
    crisisState.activePenalty = null;

    SaveManager.getInstance().saveGame(gameState);

    this.removePenaltyVisuals();

    EventManager.getInstance().emit('crisis:penalty_expired', {});

    SaveManager.getInstance().showStatusMessage(
      gameState,
      StatusType.SUCCESS,
      '⚖️ 惩罚结束',
      '危机带来的效率惩罚已消失',
      3000
    );
  }

  private applyGlobalEffects(): void {
    if (!this.globalEffectOverlay) return;

    const crisisState = this.getCrisisState();
    if (crisisState.activeCrises.length === 0) {
      this.scene.tweens.add({
        targets: this.globalEffectOverlay,
        alpha: 0,
        duration: 1000,
        ease: 'Cubic.InOut'
      });
      return;
    }

    const worstEffect = this.getWorstActiveGlobalEffect();
    if (!worstEffect) return;

    this.globalEffectOverlay.clear();
    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;

    this.globalEffectOverlay.fillStyle(0x330000, 0.15);
    this.globalEffectOverlay.fillRect(0, 0, gameWidth, gameHeight);

    const alpha = Math.min(0.3, crisisState.activeCrises.length * 0.1);
    this.scene.tweens.add({
      targets: this.globalEffectOverlay,
      alpha,
      duration: 1000,
      ease: 'Cubic.InOut'
    });
  }

  private applyPenaltyVisuals(): void {
    if (!this.globalEffectOverlay) return;

    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;

    this.globalEffectOverlay.fillStyle(0x440000, 0.2);
    this.globalEffectOverlay.fillRect(0, 0, gameWidth, gameHeight);

    this.scene.tweens.add({
      targets: this.globalEffectOverlay,
      alpha: 0.25,
      duration: 500,
      ease: 'Cubic.InOut'
    });
  }

  private removePenaltyVisuals(): void {
    this.applyGlobalEffects();
  }

  private getWorstActiveGlobalEffect(): CrisisGlobalEffect | null {
    const crisisState = this.getCrisisState();
    const activeEffects: CrisisGlobalEffect[] = [];

    crisisState.activeCrises.forEach(instance => {
      const config = this.crisisConfigs.find(c => c.id === instance.crisisId);
      if (config && (instance.status === CrisisStatus.ACTIVE || instance.status === CrisisStatus.PURIFYING)) {
        activeEffects.push(config.globalEffect);
      }
    });

    if (activeEffects.length === 0) return null;

    return activeEffects.reduce((worst, effect) => {
      return effect.spawnRateMultiplier < worst.spawnRateMultiplier ? effect : worst;
    });
  }

  public getCombinedGlobalEffect(): CrisisGlobalEffect | null {
    const crisisState = this.getCrisisState();
    const effects: CrisisGlobalEffect[] = [];

    crisisState.activeCrises.forEach(instance => {
      const config = this.crisisConfigs.find(c => c.id === instance.crisisId);
      if (config && (instance.status === CrisisStatus.ACTIVE || instance.status === CrisisStatus.PURIFYING)) {
        effects.push(config.globalEffect);
      }
    });

    if (effects.length === 0) return null;

    const combined: CrisisGlobalEffect = {
      spawnRateMultiplier: effects.reduce((m, e) => m * e.spawnRateMultiplier, 1),
      rareDropMultiplier: effects.reduce((m, e) => m * e.rareDropMultiplier, 1),
      collectRangePenalty: Math.min(effects.reduce((m, e) => m + e.collectRangePenalty, 0), 0.5),
      efficiencyPenalty: Math.min(effects.reduce((m, e) => m + e.efficiencyPenalty, 0), 0.5),
      description: effects.map(e => e.description).join('；')
    };

    return combined;
  }

  private createCrisisOverlay(instance: ForestCrisisInstance): void {
    const config = this.crisisConfigs.find(c => c.id === instance.crisisId);
    if (!config) return;

    if (this.crisisOverlays.has(config.id)) return;

    const gameWidth = this.scene.scale.width;
    const warningY = 60;

    const bg = this.scene.add.graphics();
    bg.fillStyle(config.color, 0.8);
    bg.fillRoundedRect(gameWidth / 2 - 150, warningY, 300, 50, 8);
    bg.lineStyle(2, 0xff4444, 0.8);
    bg.strokeRoundedRect(gameWidth / 2 - 150, warningY, 300, 50, 8);

    const iconText = this.scene.add.text(gameWidth / 2 - 130, warningY + 10, config.icon, {
      fontSize: '24px',
      fontFamily: 'Arial, Microsoft YaHei, sans-serif'
    });

    const nameText = this.scene.add.text(gameWidth / 2 - 95, warningY + 8, config.name, {
      fontSize: '14px',
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      color: '#ffffff'
    });

    const countdownText = this.scene.add.text(gameWidth / 2 - 95, warningY + 26, '', {
      fontSize: '12px',
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      color: '#ffaaaa'
    });
    this.crisisCountdownTexts.set(config.id, countdownText);

    const container = this.scene.add.container(0, 0, [bg, iconText, nameText, countdownText]);
    container.setScrollFactor(0);
    container.setDepth(150);
    this.crisisOverlays.set(config.id, container);
  }

  private updateCrisisOverlay(instance: ForestCrisisInstance): void {
    const countdownText = this.crisisCountdownTexts.get(instance.crisisId);
    if (countdownText) {
      const seconds = Math.ceil(instance.timeRemaining / 1000);
      const statusLabel = instance.status === CrisisStatus.WARNING ? '预警' :
        instance.status === CrisisStatus.PURIFYING ? '净化中' : '活跃';
      countdownText.setText(`${statusLabel} ${seconds}s`);
    }
  }

  private cleanupCrisisVisuals(crisisId: string): void {
    const container = this.crisisOverlays.get(crisisId);
    if (container) {
      container.destroy();
      this.crisisOverlays.delete(crisisId);
    }

    const countdown = this.crisisCountdownTexts.get(crisisId);
    if (countdown) {
      this.crisisCountdownTexts.delete(crisisId);
    }

    const purifyBar = this.purifyBarGraphics.get(crisisId);
    if (purifyBar) {
      purifyBar.destroy();
      this.purifyBarGraphics.delete(crisisId);
    }

    const purifyTimer = this.purifyTimers.get(crisisId);
    if (purifyTimer) {
      purifyTimer.destroy();
      this.purifyTimers.delete(crisisId);
    }

    const warningTimer = this.warningTimers.get(crisisId);
    if (warningTimer) {
      warningTimer.destroy();
      this.warningTimers.delete(crisisId);
    }
  }

  private showCrisisPopup(config: ForestCrisisConfig, urgency: 'warning' | 'critical'): void {
    this.dismissPopup();

    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;

    const bg = this.scene.add.graphics();
    const bgColor = urgency === 'critical' ? 0x660000 : 0x664400;
    bg.fillStyle(bgColor, 0.9);
    bg.fillRoundedRect(gameWidth / 2 - 160, gameHeight / 2 - 80, 320, 160, 12);
    bg.lineStyle(3, urgency === 'critical' ? 0xff0000 : 0xffaa00, 0.9);
    bg.strokeRoundedRect(gameWidth / 2 - 160, gameHeight / 2 - 80, 320, 160, 12);

    const icon = this.scene.add.text(gameWidth / 2, gameHeight / 2 - 55, config.icon, {
      fontSize: '36px',
      fontFamily: 'Arial, Microsoft YaHei, sans-serif'
    }).setOrigin(0.5);

    const title = this.scene.add.text(gameWidth / 2, gameHeight / 2 - 15, config.name, {
      fontSize: '18px',
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const desc = this.scene.add.text(gameWidth / 2, gameHeight / 2 + 15, config.description, {
      fontSize: '12px',
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      color: '#ffcccc',
      wordWrap: { width: 280 }
    }).setOrigin(0.5);

    const costText = config.purifyCosts.map(c => `${c.petalType}×${c.count}`).join(' ');
    const costLabel = this.scene.add.text(gameWidth / 2, gameHeight / 2 + 50, `净化消耗：${costText}`, {
      fontSize: '11px',
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      color: '#ffddaa'
    }).setOrigin(0.5);

    this.popupContainer = this.scene.add.container(0, 0, [bg, icon, title, desc, costLabel]);
    this.popupContainer.setScrollFactor(0);
    this.popupContainer.setDepth(300);
    this.popupContainer.setAlpha(0);

    EventManager.getInstance().emit('crisis:popup_alert', {
      crisisId: config.id,
      crisisName: config.name,
      icon: config.icon,
      description: config.description,
      urgency
    });

    this.popupTween = this.scene.tweens.add({
      targets: this.popupContainer,
      alpha: 1,
      duration: 300,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.scene.time.delayedCall(urgency === 'critical' ? 4000 : 5000, () => {
          this.dismissPopup();
        });
      }
    });
  }

  private showFailureSettlementPopup(config: ForestCrisisConfig, settlement: ForestCrisisSettlement): void {
    this.dismissPopup();

    const gameWidth = this.scene.scale.width;
    const gameHeight = this.scene.scale.height;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x330000, 0.95);
    bg.fillRoundedRect(gameWidth / 2 - 170, gameHeight / 2 - 100, 340, 200, 12);
    bg.lineStyle(3, 0xff4444, 0.9);
    bg.strokeRoundedRect(gameWidth / 2 - 170, gameHeight / 2 - 100, 340, 200, 12);

    const title = this.scene.add.text(gameWidth / 2, gameHeight / 2 - 75, `${config.icon} 危机失败结算`, {
      fontSize: '18px',
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      color: '#ff4444',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const nameLine = this.scene.add.text(gameWidth / 2, gameHeight / 2 - 45, config.name, {
      fontSize: '14px',
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      color: '#ffffff'
    }).setOrigin(0.5);

    const lostText = settlement.petalsLost.length > 0
      ? settlement.petalsLost.map(d => `${d.petalType}×${d.count}`).join(', ')
      : '无';
    const lostLine = this.scene.add.text(gameWidth / 2, gameHeight / 2 - 15, `损失花瓣：${lostText}`, {
      fontSize: '12px',
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      color: '#ffaaaa'
    }).setOrigin(0.5);

    const penaltyLine = this.scene.add.text(gameWidth / 2, gameHeight / 2 + 10,
      `效率惩罚：-${Math.floor(settlement.efficiencyPenalty * 100)}% 持续${Math.floor(settlement.penaltyDuration / 1000)}秒`, {
      fontSize: '12px',
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      color: '#ff8888'
    }).setOrigin(0.5);

    const timeLine = this.scene.add.text(gameWidth / 2, gameHeight / 2 + 35,
      `持续时间：${Math.floor(settlement.timeTaken / 1000)}秒`, {
      fontSize: '11px',
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      color: '#aaaaaa'
    }).setOrigin(0.5);

    const hint = this.scene.add.text(gameWidth / 2, gameHeight / 2 + 65, '下次请及时净化以避免损失', {
      fontSize: '11px',
      fontFamily: 'Arial, Microsoft YaHei, sans-serif',
      color: '#888888'
    }).setOrigin(0.5);

    this.popupContainer = this.scene.add.container(0, 0, [bg, title, nameLine, lostLine, penaltyLine, timeLine, hint]);
    this.popupContainer.setScrollFactor(0);
    this.popupContainer.setDepth(300);
    this.popupContainer.setAlpha(0);

    this.popupTween = this.scene.tweens.add({
      targets: this.popupContainer,
      alpha: 1,
      duration: 300,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.scene.time.delayedCall(6000, () => {
          this.dismissPopup();
        });
      }
    });
  }

  private dismissPopup(): void {
    if (this.popupTween) {
      this.popupTween.stop();
      this.popupTween = null;
    }
    if (this.popupContainer) {
      this.popupContainer.destroy();
      this.popupContainer = null;
    }
  }

  public update(time: number, delta: number): void {
    const gameState = SaveManager.getInstance().getGameState();
    const crisisState = gameState.forestCrisisState;

    if (crisisState.activeCrises.length === 0) return;

    const now = Date.now();
    const crisesToProcess = [...crisisState.activeCrises];

    crisesToProcess.forEach(instance => {
      const config = this.crisisConfigs.find(c => c.id === instance.crisisId);
      if (!config) return;

      instance.timeRemaining -= delta;

      if (instance.status === CrisisStatus.PURIFYING) {
        const progressDelta = (delta / 1000) * CRISIS_PURIFY_PROGRESS_PER_SECOND;
        instance.purifyProgress += progressDelta;

        EventManager.getInstance().emit('crisis:purify_progress', {
          crisisId: instance.crisisId,
          progress: instance.purifyProgress,
          target: instance.purifyTarget
        });

        if (instance.purifyProgress >= instance.purifyTarget) {
          this.resolveCrisis(config, instance);
          return;
        }
      }

      if (instance.timeRemaining <= 0) {
        this.failCrisis(config, instance);
        return;
      }

      this.updateCrisisOverlay(instance);
    });

    if (crisisState.activePenalty) {
      crisisState.activePenalty.remainingDuration -= delta;
      if (crisisState.activePenalty.remainingDuration <= 0) {
        crisisState.activePenalty = null;
        this.removePenaltyVisuals();
        EventManager.getInstance().emit('crisis:penalty_expired', {});
      }
    }

    SaveManager.getInstance().saveGame(gameState);
  }

  public canPurify(crisisId: string): boolean {
    const gameState = SaveManager.getInstance().getGameState();
    const crisisState = gameState.forestCrisisState;
    const instance = crisisState.activeCrises.find(c => c.crisisId === crisisId);
    const config = this.crisisConfigs.find(c => c.id === crisisId);

    if (!instance || !config) return false;
    if (instance.status !== CrisisStatus.ACTIVE) return false;

    return config.purifyCosts.every(cost => {
      return (gameState.petals[cost.petalType] || 0) >= cost.count;
    });
  }

  public getActiveCrises(): ForestCrisisInstance[] {
    return this.getCrisisState().activeCrises;
  }

  public getActivePenalty(): { efficiencyPenalty: number; remainingDuration: number } | null {
    return this.getCrisisState().activePenalty;
  }

  public getCrisisConfig(crisisId: string): ForestCrisisConfig | undefined {
    return this.crisisConfigs.find(c => c.id === crisisId);
  }

  public getAllCrisisConfigs(): ForestCrisisConfig[] {
    return this.crisisConfigs;
  }

  public getSpawnRateMultiplier(): number {
    const effect = this.getCombinedGlobalEffect();
    return effect ? effect.spawnRateMultiplier : 1.0;
  }

  public getRareDropMultiplier(): number {
    const effect = this.getCombinedGlobalEffect();
    return effect ? effect.rareDropMultiplier : 1.0;
  }

  public getEfficiencyPenalty(): number {
    const crisisEffect = this.getCombinedGlobalEffect();
    const penalty = this.getCrisisState().activePenalty;
    let total = 0;
    if (crisisEffect) total += crisisEffect.efficiencyPenalty;
    if (penalty) total += penalty.efficiencyPenalty;
    return Math.min(total, 0.6);
  }

  public getCollectRangePenalty(): number {
    const effect = this.getCombinedGlobalEffect();
    return effect ? effect.collectRangePenalty : 0;
  }

  public destroy(): void {
    this.eventListeners.forEach(({ event, callback }) => {
      EventManager.getInstance().off(event as any, callback);
    });
    this.eventListeners = [];

    this.warningTimers.forEach(timer => timer.destroy());
    this.warningTimers.clear();

    this.purifyTimers.forEach(timer => timer.destroy());
    this.purifyTimers.clear();

    if (this.penaltyTimer) {
      this.penaltyTimer.destroy();
    }

    this.crisisOverlays.forEach(container => container.destroy());
    this.crisisOverlays.clear();

    this.crisisCountdownTexts.clear();

    this.purifyBarGraphics.forEach(g => g.destroy());
    this.purifyBarGraphics.clear();

    if (this.globalEffectOverlay) {
      this.globalEffectOverlay.destroy();
    }

    this.dismissPopup();
  }
}
