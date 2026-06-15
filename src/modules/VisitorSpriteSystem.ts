import Phaser from 'phaser';
import {
  PetalType,
  VisitorSpriteId,
  VisitorSpriteConfig,
  VisitorSpriteState,
  VisitorSystemState,
  VisitorOrder,
  VisitorOrderStatus,
  AffectionLevel,
  VisitorReward,
  StatusType
} from '../types';
import {
  VISITOR_SPRITE_CONFIGS,
  VISITOR_SYSTEM_CONFIG,
  PETAL_CONFIGS
} from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { EventManager } from '../managers/EventManager';

export class VisitorSpriteSystem {
  private scene: Phaser.Scene;
  private visitTimer: number = 0;
  private orderCheckTimer: number = 0;
  private visitorDisplay: Phaser.GameObjects.Container | null = null;
  private orderDisplay: Phaser.GameObjects.Container | null = null;
  private dialogueBubble: Phaser.GameObjects.Container | null = null;
  private isInitialized: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public create(): void {
    this.scheduleNextVisit();
    this.isInitialized = true;

    this.checkSpriteUnlocks();
  }

  public update(time: number, delta: number): void {
    if (!this.isInitialized) return;

    const state = SaveManager.getInstance().getGameState();
    const visitorState = state.visitorSystem;

    if (!visitorState.activeVisitor) {
      this.visitTimer += delta;
      const nextVisit = visitorState.nextVisitTime;
      if (nextVisit > 0 && this.visitTimer >= nextVisit) {
        this.triggerRandomVisit();
        this.visitTimer = 0;
      }
    } else {
      const elapsed = Date.now() - visitorState.visitorArrivedAt;
      if (elapsed >= visitorState.visitDuration) {
        this.visitorDeparture();
      }
    }

    if (visitorState.activeOrder && visitorState.activeOrder.status === VisitorOrderStatus.PENDING) {
      const orderElapsed = Date.now() - visitorState.activeOrder.placedAt;
      if (orderElapsed >= visitorState.activeOrder.timeLimit) {
        this.expireOrder();
      }
    }

    this.checkSpriteUnlocks();
  }

  private scheduleNextVisit(): void {
    const state = SaveManager.getInstance().getGameState();
    const { MIN_VISIT_INTERVAL, MAX_VISIT_INTERVAL } = VISITOR_SYSTEM_CONFIG;
    const interval = MIN_VISIT_INTERVAL + Math.random() * (MAX_VISIT_INTERVAL - MIN_VISIT_INTERVAL);
    state.visitorSystem.nextVisitTime = interval;
    this.visitTimer = 0;
    SaveManager.getInstance().saveGame(state);
  }

  private triggerRandomVisit(): void {
    const state = SaveManager.getInstance().getGameState();
    const visitorState = state.visitorSystem;

    if (visitorState.activeVisitor) return;

    const unlockedSprites = visitorState.sprites.filter(s => s.unlocked);
    if (unlockedSprites.length === 0) return;

    const totalWeight = unlockedSprites.reduce((sum, s) => {
      const config = VISITOR_SPRITE_CONFIGS[s.spriteId];
      return sum + config.visitWeight;
    }, 0);

    let rand = Math.random() * totalWeight;
    let selectedSprite: VisitorSpriteState | null = null;

    for (const sprite of unlockedSprites) {
      const config = VISITOR_SPRITE_CONFIGS[sprite.spriteId];
      rand -= config.visitWeight;
      if (rand <= 0) {
        selectedSprite = sprite;
        break;
      }
    }

    if (!selectedSprite) {
      selectedSprite = unlockedSprites[unlockedSprites.length - 1];
    }

    const spriteIndex = visitorState.sprites.findIndex(s => s.spriteId === selectedSprite!.spriteId);
    visitorState.sprites[spriteIndex].totalVisits += 1;
    visitorState.sprites[spriteIndex].lastVisitTime = Date.now();
    visitorState.activeVisitor = selectedSprite.spriteId;
    visitorState.visitorArrivedAt = Date.now();
    visitorState.totalVisitorInteractions += 1;

    const isReturning = selectedSprite.totalVisits > 1;

    SaveManager.getInstance().saveGame(state);

    EventManager.getInstance().emit('visitor:arrived', {
      spriteId: selectedSprite.spriteId,
      isReturning
    });

    this.showVisitorDisplay(selectedSprite.spriteId);

    const config = VISITOR_SPRITE_CONFIGS[selectedSprite.spriteId];
    const greetMsg = config.dialogue.greet[Math.floor(Math.random() * config.dialogue.greet.length)];
    this.showDialogueBubble(greetMsg, config.color);

    this.maybePlaceOrder(selectedSprite.spriteId);
  }

  private visitorDeparture(): void {
    const state = SaveManager.getInstance().getGameState();
    const visitorState = state.visitorSystem;

    if (!visitorState.activeVisitor) return;

    const spriteId = visitorState.activeVisitor;
    visitorState.activeVisitor = null;
    visitorState.visitorArrivedAt = 0;

    SaveManager.getInstance().saveGame(state);

    EventManager.getInstance().emit('visitor:left', { spriteId });

    this.hideVisitorDisplay();
    this.hideDialogueBubble();
    this.scheduleNextVisit();
  }

  private maybePlaceOrder(spriteId: VisitorSpriteId): void {
    const state = SaveManager.getInstance().getGameState();
    const visitorState = state.visitorSystem;

    if (visitorState.activeOrder) return;

    const spriteState = visitorState.sprites.find(s => s.spriteId === spriteId);
    if (!spriteState) return;

    const config = VISITOR_SPRITE_CONFIGS[spriteId];
    const timeSinceLastOrder = Date.now() - spriteState.lastOrderTime;
    if (timeSinceLastOrder < config.orderCooldown && spriteState.totalOrdersPlaced > 0) return;

    if (Math.random() > 0.6) return;

    const order = this.generateOrder(spriteId);
    if (!order) return;

    visitorState.activeOrder = order;
    const spriteIndex = visitorState.sprites.findIndex(s => s.spriteId === spriteId);
    visitorState.sprites[spriteIndex].totalOrdersPlaced += 1;
    visitorState.sprites[spriteIndex].lastOrderTime = Date.now();

    SaveManager.getInstance().saveGame(state);

    EventManager.getInstance().emit('visitor:order_placed', { order });

    const orderMsg = config.dialogue.orderPlace[Math.floor(Math.random() * config.dialogue.orderPlace.length)];
    this.showDialogueBubble(orderMsg, config.color);
  }

  private generateOrder(spriteId: VisitorSpriteId): VisitorOrder | null {
    const config = VISITOR_SPRITE_CONFIGS[spriteId];
    const state = SaveManager.getInstance().getGameState();
    const affectionLevel = this.getSpriteState(spriteId)?.level || AffectionLevel.STRANGER;

    const preferredPetals = config.preferredPetals.filter(p =>
      state.unlockedPetals.includes(p) || PETAL_CONFIGS[p].level <= 2
    );

    if (preferredPetals.length === 0) return null;

    const levelMultiplier = 1 + affectionLevel * 0.3;
    const petals: { type: PetalType; count: number }[] = [];

    const mainPetal = preferredPetals[Math.floor(Math.random() * preferredPetals.length)];
    const mainCount = Math.min(Math.ceil((1 + Math.random() * 2) * levelMultiplier), 10);
    petals.push({ type: mainPetal, count: mainCount });

    if (affectionLevel >= AffectionLevel.FRIEND && Math.random() > 0.5) {
      const secondPetal = preferredPetals[Math.floor(Math.random() * preferredPetals.length)];
      const secondCount = Math.min(Math.ceil(1 + Math.random() * levelMultiplier), 5);
      if (secondPetal !== mainPetal) {
        petals.push({ type: secondPetal, count: secondCount });
      }
    }

    const isPreferred = petals.every(p => config.preferredPetals.includes(p.type));

    const timeLimitBase = VISITOR_SYSTEM_CONFIG.ORDER_BASE_TIME_LIMIT;
    const timeLimit = timeLimitBase + affectionLevel * 15000;

    const affectionReward = VISITOR_SYSTEM_CONFIG.ORDER_AFFECTION_REWARD_BASE +
      (isPreferred ? VISITOR_SYSTEM_CONFIG.ORDER_AFFECTION_REWARD_PREFERRED_BONUS : 0) +
      affectionLevel * 3;

    return {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      spriteId,
      petals,
      timeLimit,
      placedAt: Date.now(),
      status: VisitorOrderStatus.PENDING,
      affectionReward,
      isPreferred
    };
  }

  public fulfillOrder(): boolean {
    const state = SaveManager.getInstance().getGameState();
    const visitorState = state.visitorSystem;

    if (!visitorState.activeOrder || visitorState.activeOrder.status !== VisitorOrderStatus.PENDING) {
      return false;
    }

    const order = visitorState.activeOrder;

    const canFulfill = order.petals.every(p =>
      (state.petals[p.type] || 0) >= p.count
    );

    if (!canFulfill) return false;

    order.petals.forEach(p => {
      SaveManager.getInstance().removePetals(p.type, p.count);
    });

    order.status = VisitorOrderStatus.FULFILLED;

    const spriteIndex = visitorState.sprites.findIndex(s => s.spriteId === order.spriteId);
    visitorState.sprites[spriteIndex].totalOrdersFulfilled += 1;

    this.addAffection(order.spriteId, order.affectionReward);

    const spriteId = order.spriteId;
    visitorState.activeOrder = null;

    const config = VISITOR_SPRITE_CONFIGS[spriteId];
    const fulfillMsg = config.dialogue.orderFulfill[Math.floor(Math.random() * config.dialogue.orderFulfill.length)];
    this.showDialogueBubble(fulfillMsg, config.color);

    SaveManager.getInstance().saveGame(state);

    EventManager.getInstance().emit('visitor:order_fulfilled', {
      order,
      spriteId,
      affectionGain: order.affectionReward
    });

    this.discoverPreference(spriteId, order.petals.map(p => p.type));

    return true;
  }

  private expireOrder(): void {
    const state = SaveManager.getInstance().getGameState();
    const visitorState = state.visitorSystem;

    if (!visitorState.activeOrder) return;

    const order = visitorState.activeOrder;
    order.status = VisitorOrderStatus.EXPIRED;

    const spriteIndex = visitorState.sprites.findIndex(s => s.spriteId === order.spriteId);
    visitorState.sprites[spriteIndex].totalOrdersExpired += 1;
    visitorState.activeOrder = null;

    SaveManager.getInstance().saveGame(state);

    EventManager.getInstance().emit('visitor:order_expired', {
      order,
      spriteId: order.spriteId
    });
  }

  private addAffection(spriteId: VisitorSpriteId, amount: number): void {
    const state = SaveManager.getInstance().getGameState();
    const visitorState = state.visitorSystem;

    const spriteIndex = visitorState.sprites.findIndex(s => s.spriteId === spriteId);
    if (spriteIndex === -1) return;

    const spriteState = visitorState.sprites[spriteIndex];
    const oldLevel = spriteState.level;

    spriteState.affection += amount;

    const config = VISITOR_SPRITE_CONFIGS[spriteId];
    let newLevel: AffectionLevel = AffectionLevel.STRANGER;
    for (let i = config.affectionThresholds.length - 1; i >= 0; i--) {
      if (spriteState.affection >= config.affectionThresholds[i]) {
        newLevel = i as AffectionLevel;
        break;
      }
    }

    spriteState.level = newLevel;

    if (newLevel > oldLevel) {
      this.checkRewardUnlocks(spriteId, newLevel);

      const dialogue = config.dialogue.affectionUp[Math.floor(Math.random() * config.dialogue.affectionUp.length)];
      this.showDialogueBubble(dialogue, config.color);

      EventManager.getInstance().emit('visitor:affection_up', {
        spriteId,
        oldLevel,
        newLevel,
        affection: spriteState.affection
      });
    }

    SaveManager.getInstance().saveGame(state);
  }

  private discoverPreference(spriteId: VisitorSpriteId, petalTypes: PetalType[]): void {
    const config = VISITOR_SPRITE_CONFIGS[spriteId];
    const state = SaveManager.getInstance().getGameState();
    const visitorState = state.visitorSystem;
    const spriteIndex = visitorState.sprites.findIndex(s => s.spriteId === spriteId);
    if (spriteIndex === -1) return;

    const spriteState = visitorState.sprites[spriteIndex];

    petalTypes.forEach(petalType => {
      if (Math.random() > VISITOR_SYSTEM_CONFIG.PREFERENCE_DISCOVERY_CHANCE) return;

      if (config.preferredPetals.includes(petalType)) {
        if (!spriteState.discoveredPreferences.includes(petalType)) {
          spriteState.discoveredPreferences.push(petalType);
          EventManager.getInstance().emit('visitor:preference_discovered', {
            spriteId,
            petalType,
            isPreference: true
          });
        }
      } else if (config.dislikedPetals.includes(petalType)) {
        if (!spriteState.discoveredDislikes.includes(petalType)) {
          spriteState.discoveredDislikes.push(petalType);
          EventManager.getInstance().emit('visitor:preference_discovered', {
            spriteId,
            petalType,
            isPreference: false
          });
        }
      }
    });

    SaveManager.getInstance().saveGame(state);
  }

  private checkRewardUnlocks(spriteId: VisitorSpriteId, newLevel: AffectionLevel): void {
    const state = SaveManager.getInstance().getGameState();
    const visitorState = state.visitorSystem;
    const spriteIndex = visitorState.sprites.findIndex(s => s.spriteId === spriteId);
    if (spriteIndex === -1) return;

    const spriteState = visitorState.sprites[spriteIndex];

    spriteState.rewards.forEach((reward, idx) => {
      if (reward.affectionLevel <= newLevel && !reward.claimed) {
        EventManager.getInstance().emit('visitor:reward_unlocked', {
          spriteId,
          reward
        });
      }
    });
  }

  public claimReward(spriteId: VisitorSpriteId, rewardId: string): boolean {
    const state = SaveManager.getInstance().getGameState();
    const visitorState = state.visitorSystem;
    const spriteIndex = visitorState.sprites.findIndex(s => s.spriteId === spriteId);
    if (spriteIndex === -1) return false;

    const spriteState = visitorState.sprites[spriteIndex];
    const rewardIndex = spriteState.rewards.findIndex(r => r.id === rewardId);
    if (rewardIndex === -1) return false;

    const reward = spriteState.rewards[rewardIndex];
    if (reward.claimed) return false;
    if (reward.affectionLevel > spriteState.level) return false;

    reward.claimed = true;
    this.applyReward(state, reward);

    SaveManager.getInstance().saveGame(state);

    EventManager.getInstance().emit('visitor:reward_claimed', {
      spriteId,
      reward
    });

    const config = VISITOR_SPRITE_CONFIGS[spriteId];
    const rewardMsg = config.dialogue.reward[Math.floor(Math.random() * config.dialogue.reward.length)];
    this.showDialogueBubble(rewardMsg, config.color);

    return true;
  }

  private applyReward(state: import('../types').GameState, reward: VisitorReward): void {
    switch (reward.type) {
      case 'petal':
        if (reward.petalType && reward.count) {
          state.petals[reward.petalType] = (state.petals[reward.petalType] || 0) + reward.count;
          state.totalCollected += reward.count;
          if (!state.unlockedPetals.includes(reward.petalType)) {
            state.unlockedPetals.push(reward.petalType);
          }
          EventManager.getInstance().emit('petal:collected', {
            type: reward.petalType,
            count: reward.count
          });
        }
        break;
      case 'recipe':
        if (reward.recipeId && !state.unlockedRecipes.includes(reward.recipeId)) {
          state.unlockedRecipes.push(reward.recipeId);
          EventManager.getInstance().emit('synthesis:recipe_unlocked', {
            recipeId: reward.recipeId
          });
        }
        break;
      case 'efficiency':
        if (reward.efficiencyBoost) {
          state.efficiencyBoost = (state.efficiencyBoost || 0) + reward.efficiencyBoost;
        }
        break;
    }
  }

  private checkSpriteUnlocks(): void {
    const state = SaveManager.getInstance().getGameState();
    const visitorState = state.visitorSystem;
    const playTime = state.playTime;

    let changed = false;

    Object.values(VisitorSpriteId).forEach(spriteId => {
      const config = VISITOR_SPRITE_CONFIGS[spriteId];
      const spriteIndex = visitorState.sprites.findIndex(s => s.spriteId === spriteId);
      if (spriteIndex === -1) return;

      const spriteState = visitorState.sprites[spriteIndex];
      if (!spriteState.unlocked && playTime >= config.minPlayTime) {
        spriteState.unlocked = true;
        changed = true;

        EventManager.getInstance().emit('status:show', {
          message: {
            id: `visitor_unlock_${spriteId}`,
            type: StatusType.SUCCESS,
            title: '🧚 新精灵出现',
            content: `${config.name} - ${config.title} 来到了梦境森林`,
            timestamp: Date.now(),
            duration: 5000
          }
        });
      }
    });

    if (changed) {
      SaveManager.getInstance().saveGame(state);
    }
  }

  public canFulfillOrder(): boolean {
    const state = SaveManager.getInstance().getGameState();
    const order = state.visitorSystem.activeOrder;
    if (!order || order.status !== VisitorOrderStatus.PENDING) return false;

    return order.petals.every(p =>
      (state.petals[p.type] || 0) >= p.count
    );
  }

  public getActiveVisitor(): VisitorSpriteId | null {
    return SaveManager.getInstance().getGameState().visitorSystem.activeVisitor;
  }

  public getActiveOrder(): VisitorOrder | null {
    return SaveManager.getInstance().getGameState().visitorSystem.activeOrder;
  }

  public getSpriteState(spriteId: VisitorSpriteId): VisitorSpriteState | undefined {
    return SaveManager.getInstance().getGameState().visitorSystem.sprites.find(s => s.spriteId === spriteId);
  }

  public getVisitorSystemState(): VisitorSystemState {
    return SaveManager.getInstance().getGameState().visitorSystem;
  }

  public getOrderTimeRemaining(): number {
    const order = this.getActiveOrder();
    if (!order || order.status !== VisitorOrderStatus.PENDING) return 0;
    return Math.max(0, order.timeLimit - (Date.now() - order.placedAt));
  }

  public getVisitorTimeRemaining(): number {
    const state = SaveManager.getInstance().getGameState();
    if (!state.visitorSystem.activeVisitor) return 0;
    return Math.max(0, state.visitorSystem.visitDuration - (Date.now() - state.visitorSystem.visitorArrivedAt));
  }

  private showVisitorDisplay(spriteId: VisitorSpriteId): void {
    this.hideVisitorDisplay();

    const config = VISITOR_SPRITE_CONFIGS[spriteId];
    const x = GAME_WIDTH - 100;
    const y = 220;

    this.visitorDisplay = this.scene.add.container(x, y).setDepth(95).setScrollFactor(0);

    const bg = this.scene.add.graphics();
    bg.fillStyle(config.color, 0.2);
    bg.fillCircle(0, 0, 35);
    bg.lineStyle(3, config.color, 0.8);
    bg.strokeCircle(0, 0, 35);

    const icon = this.scene.add.text(0, 0, config.appearance, {
      fontFamily: 'Arial',
      fontSize: '28px'
    }).setOrigin(0.5);

    const nameText = this.scene.add.text(0, 38, config.name, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    this.visitorDisplay.add([bg, icon, nameText]);

    const glowTextureKey = `visitor_glow_${spriteId}`;
    if (!this.scene.textures.exists(glowTextureKey)) {
      const glowCanvas = this.scene.textures.createCanvas(glowTextureKey, 100, 100);
      const glowCtx = glowCanvas.getContext();
      const r = (config.glowColor >> 16) & 255;
      const g = (config.glowColor >> 8) & 255;
      const b = config.glowColor & 255;
      const grad = glowCtx.createRadialGradient(50, 50, 0, 50, 50, 50);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.4)`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      glowCtx.fillStyle = grad;
      glowCtx.beginPath();
      glowCtx.arc(50, 50, 50, 0, Math.PI * 2);
      glowCtx.fill();
      glowCanvas.refresh();
    }

    const glow = this.scene.add.image(0, 0, glowTextureKey).setBlendMode(Phaser.BlendModes.ADD);
    this.visitorDisplay.add(glow);

    this.scene.tweens.add({
      targets: this.visitorDisplay,
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: 'Back.Out'
    });

    this.scene.tweens.add({
      targets: glow,
      scale: { from: 0.8, to: 1.2 },
      alpha: { from: 0.6, to: 1 },
      duration: 1500,
      yoyo: true,
      repeat: -1
    });

    const hitZone = this.scene.add.zone(x, y, 70, 70)
      .setDepth(96)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });

    hitZone.on('pointerup', () => {
      EventManager.getInstance().emit('visitor:panel_opened', {});
    });

    this.visitorDisplay.setData('hitZone', hitZone);
  }

  private hideVisitorDisplay(): void {
    if (this.visitorDisplay) {
      const hitZone = this.visitorDisplay.getData('hitZone') as Phaser.GameObjects.Zone;
      if (hitZone) hitZone.destroy();

      this.scene.tweens.add({
        targets: this.visitorDisplay,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.visitorDisplay?.destroy();
          this.visitorDisplay = null;
        }
      });
    }
  }

  private showDialogueBubble(message: string, color: number): void {
    this.hideDialogueBubble();

    const x = GAME_WIDTH / 2;
    const y = 200;

    this.dialogueBubble = this.scene.add.container(x, y).setDepth(97).setScrollFactor(0);

    const text = this.scene.add.text(0, 0, message, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3,
      wordWrap: { width: 280 }
    }).setOrigin(0.5);

    const bg = this.scene.add.graphics();
    const padding = 16;
    const width = Math.min(text.width + padding * 2, 320);
    const height = text.height + padding * 2;

    bg.fillStyle(0x0a0514, 0.9);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
    bg.lineStyle(2, color, 0.7);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);

    this.dialogueBubble.add([bg, text]);

    this.scene.tweens.add({
      targets: this.dialogueBubble,
      alpha: { from: 0, to: 1 },
      y: { from: y + 10, to: y },
      duration: 300,
      ease: 'Back.Out'
    });

    this.scene.time.delayedCall(4000, () => {
      this.hideDialogueBubble();
    });
  }

  private hideDialogueBubble(): void {
    if (this.dialogueBubble) {
      this.scene.tweens.add({
        targets: this.dialogueBubble,
        alpha: 0,
        duration: 300,
        onComplete: () => {
          this.dialogueBubble?.destroy();
          this.dialogueBubble = null;
        }
      });
    }
  }

  public getVisitorStats(): {
    totalVisits: number;
    totalOrdersFulfilled: number;
    totalRewardsClaimed: number;
    highestAffectionSprite: VisitorSpriteId | null;
    maxAffection: number;
    unlockedCount: number;
    soulmateCount: number;
  } {
    const state = SaveManager.getInstance().getGameState().visitorSystem;

    let totalVisits = 0;
    let totalOrdersFulfilled = 0;
    let totalRewardsClaimed = 0;
    let highestAffectionSprite: VisitorSpriteId | null = null;
    let maxAffection = 0;
    let unlockedCount = 0;
    let soulmateCount = 0;

    state.sprites.forEach(s => {
      totalVisits += s.totalVisits;
      totalOrdersFulfilled += s.totalOrdersFulfilled;
      totalRewardsClaimed += s.rewards.filter(r => r.claimed).length;
      if (s.unlocked) unlockedCount++;
      if (s.level === AffectionLevel.SOULMATE) soulmateCount++;
      if (s.affection > maxAffection) {
        maxAffection = s.affection;
        highestAffectionSprite = s.spriteId;
      }
    });

    return {
      totalVisits,
      totalOrdersFulfilled,
      totalRewardsClaimed,
      highestAffectionSprite,
      maxAffection,
      unlockedCount,
      soulmateCount
    };
  }

  public destroy(): void {
    this.hideVisitorDisplay();
    this.hideDialogueBubble();
    this.isInitialized = false;
  }
}

const GAME_WIDTH = 750;
