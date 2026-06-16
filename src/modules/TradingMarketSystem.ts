import Phaser from 'phaser';
import { 
  PetalType, 
  MarketItem, 
  MarketState, 
  MarketRarity, 
  MarketRefreshResult,
  MarketTransactionType,
  MarketTransaction,
  GameState
} from '../types';
import { 
  MARKET_CONFIG, 
  MARKET_ITEM_CONFIGS,
  PETAL_CONFIGS
} from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { EventManager } from '../managers/EventManager';

export class TradingMarketSystem {
  private scene: Phaser.Scene | null = null;
  private eventListeners: Array<{ event: string; callback: (data: any) => void }> = [];
  private priceUpdateTimer: number = 0;
  private restockTimer: number = 0;

  constructor(scene?: Phaser.Scene) {
    this.scene = scene || null;
    this.setupEventListeners();
  }

  public setScene(scene: Phaser.Scene): void {
    this.scene = scene;
  }

  private setupEventListeners(): void {
    const onPetalCollected = (data: { type: PetalType; count: number }) => {
      this.updateDemand(data.type, data.count);
    };
    EventManager.getInstance().on('petal:collected', onPetalCollected);
    this.eventListeners.push({ event: 'petal:collected', callback: onPetalCollected });

    const onSynthesisComplete = () => {
      this.adjustPricesAfterSynthesis();
    };
    EventManager.getInstance().on('synthesis:complete', onSynthesisComplete);
    this.eventListeners.push({ event: 'synthesis:complete', callback: onSynthesisComplete });
  }

  public getMarketState(): MarketState {
    const state = SaveManager.getInstance().getGameState();
    return state.marketState;
  }

  private saveMarketState(marketState: MarketState): void {
    const gameState = SaveManager.getInstance().getGameState();
    gameState.marketState = marketState;
    SaveManager.getInstance().saveGame(gameState);
  }

  public update(time: number, delta: number): void {
    this.priceUpdateTimer += delta;
    this.restockTimer += delta;

    if (this.priceUpdateTimer >= MARKET_CONFIG.priceUpdateIntervalMs) {
      this.priceUpdateTimer = 0;
      this.updateAllPrices();
    }

    if (this.restockTimer >= MARKET_CONFIG.autoRestockIntervalMs) {
      this.restockTimer = 0;
      this.autoRestock();
    }

    this.checkDailyReset();
  }

  public getItems(): MarketItem[] {
    return this.getMarketState().items;
  }

  public getItem(itemId: string): MarketItem | undefined {
    return this.getMarketState().items.find(item => item.id === itemId);
  }

  public getCurrency(): number {
    return this.getMarketState().currency;
  }

  public buyItem(itemId: string, quantity: number = 1): { success: boolean; message: string } {
    const marketState = this.getMarketState();
    const item = marketState.items.find(i => i.id === itemId);

    if (!item) {
      return { success: false, message: '商品不存在' };
    }

    if (item.stock < quantity) {
      return { success: false, message: '库存不足' };
    }

    if (marketState.todayPurchases + quantity > marketState.dailyPurchaseLimit) {
      EventManager.getInstance().emit('market:daily_limit_reached', {});
      return { success: false, message: '今日购买已达上限' };
    }

    const unitPrice = this.calculateFinalPrice(item);
    const totalPrice = unitPrice * quantity;

    if (marketState.currency < totalPrice) {
      return { success: false, message: '金币不足' };
    }

    const oldCurrency = marketState.currency;
    marketState.currency -= totalPrice;
    item.stock -= quantity;
    marketState.todayPurchases += quantity;
    marketState.totalTrades++;
    marketState.totalSpent += totalPrice;

    const gameState = SaveManager.getInstance().getGameState();
    gameState.petals[item.petalType] = (gameState.petals[item.petalType] || 0) + quantity;

    if (!gameState.unlockedPetals.includes(item.petalType)) {
      gameState.unlockedPetals.push(item.petalType);
      EventManager.getInstance().emit('collection:unlock', { 
        type: item.petalType, 
        category: this.getPetalCategory(item.petalType) 
      });
    }

    this.addTransaction(marketState, {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: MarketTransactionType.BUY,
      itemId: item.id,
      petalType: item.petalType,
      quantity,
      pricePerUnit: unitPrice,
      totalPrice,
      timestamp: Date.now(),
      success: true
    });

    this.updateReputation(marketState, quantity);
    this.recordPriceHistory(marketState, item.petalType, unitPrice);

    item.isNew = false;

    EventManager.getInstance().emit('market:item_purchased', {
      itemId: item.id,
      petalType: item.petalType,
      quantity,
      totalPrice
    });
    EventManager.getInstance().emit('market:currency_updated', {
      oldCurrency,
      newCurrency: marketState.currency
    });
    EventManager.getInstance().emit('audio:play', { key: 'sfx_market_buy', volume: 0.4 });

    this.checkLevelUp(marketState);
    this.saveMarketState(marketState);
    SaveManager.getInstance().saveGame(gameState);

    return { success: true, message: `成功购买 ${quantity} 个 ${PETAL_CONFIGS[item.petalType].name}` };
  }

  public sellPetal(petalType: PetalType, quantity: number = 1): { success: boolean; message: string } {
    const marketState = this.getMarketState();
    const gameState = SaveManager.getInstance().getGameState();

    if ((gameState.petals[petalType] || 0) < quantity) {
      return { success: false, message: '花瓣数量不足' };
    }

    const itemConfig = MARKET_ITEM_CONFIGS.find(c => c.petalType === petalType);
    if (!itemConfig) {
      return { success: false, message: '该花瓣无法出售' };
    }

    const rarityMultiplier = MARKET_CONFIG.rarityPriceMultipliers[itemConfig.rarity];
    const basePrice = Math.round(itemConfig.basePrice * rarityMultiplier);
    const sellPrice = Math.round(basePrice * MARKET_CONFIG.sellPriceRatio);
    const totalPrice = sellPrice * quantity;

    const oldCurrency = marketState.currency;
    gameState.petals[petalType] -= quantity;
    marketState.currency += totalPrice;
    marketState.totalTrades++;
    marketState.totalProfit += totalPrice;

    this.addTransaction(marketState, {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: MarketTransactionType.SELL,
      petalType,
      quantity,
      pricePerUnit: sellPrice,
      totalPrice,
      timestamp: Date.now(),
      success: true
    });

    this.updateReputation(marketState, quantity);

    EventManager.getInstance().emit('market:item_sold', {
      petalType,
      quantity,
      totalPrice
    });
    EventManager.getInstance().emit('market:currency_updated', {
      oldCurrency,
      newCurrency: marketState.currency
    });
    EventManager.getInstance().emit('audio:play', { key: 'sfx_market_sell', volume: 0.4 });

    this.checkLevelUp(marketState);
    this.saveMarketState(marketState);
    SaveManager.getInstance().saveGame(gameState);

    return { success: true, message: `成功出售 ${quantity} 个 ${PETAL_CONFIGS[petalType].name}，获得 ${totalPrice} 金币` };
  }

  public refreshItems(): { success: boolean; result: MarketRefreshResult; items?: MarketItem[] } {
    const marketState = this.getMarketState();
    const now = Date.now();

    if (now - marketState.lastRefreshTime < marketState.refreshCooldown) {
      EventManager.getInstance().emit('market:refresh_failed', { result: MarketRefreshResult.ON_COOLDOWN });
      return { success: false, result: MarketRefreshResult.ON_COOLDOWN };
    }

    if (marketState.currency < marketState.refreshCost) {
      EventManager.getInstance().emit('market:refresh_failed', { result: MarketRefreshResult.INSUFFICIENT_FUNDS });
      return { success: false, result: MarketRefreshResult.INSUFFICIENT_FUNDS };
    }

    const oldCurrency = marketState.currency;
    marketState.currency -= marketState.refreshCost;
    marketState.lastRefreshTime = now;
    marketState.refreshCost = Math.round(marketState.refreshCost * 1.1);
    marketState.items = this.generateNewItems();

    this.addTransaction(marketState, {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: MarketTransactionType.REFRESH,
      quantity: 1,
      pricePerUnit: marketState.refreshCost,
      totalPrice: marketState.refreshCost,
      timestamp: Date.now(),
      success: true
    });

    marketState.items.forEach(item => {
      if (item.isHot) {
        EventManager.getInstance().emit('market:hot_item_appeared', {
          itemId: item.id,
          petalType: item.petalType
        });
      }
    });

    EventManager.getInstance().emit('market:refresh_success', { items: marketState.items });
    EventManager.getInstance().emit('market:currency_updated', {
      oldCurrency,
      newCurrency: marketState.currency
    });
    EventManager.getInstance().emit('audio:play', { key: 'sfx_market_refresh', volume: 0.35 });

    this.saveMarketState(marketState);

    return { success: true, result: MarketRefreshResult.SUCCESS, items: marketState.items };
  }

  private generateNewItems(): MarketItem[] {
    const items: MarketItem[] = [];
    const availableConfigs = [...MARKET_ITEM_CONFIGS];
    const itemCount = Math.min(MARKET_CONFIG.itemSlotCount + Math.floor(this.getMarketState().marketLevel / 3), 12);
    
    for (let i = 0; i < itemCount && availableConfigs.length > 0; i++) {
      const totalWeight = availableConfigs.reduce((sum, config) => sum + config.spawnWeight, 0);
      let random = Math.random() * totalWeight;
      
      let selectedIndex = 0;
      for (let j = 0; j < availableConfigs.length; j++) {
        random -= availableConfigs[j].spawnWeight;
        if (random <= 0) {
          selectedIndex = j;
          break;
        }
      }
      
      const config = availableConfigs[selectedIndex];
      items.push(this.createMarketItem(config, i));
      availableConfigs.splice(selectedIndex, 1);
    }
    
    return items;
  }

  private createMarketItem(config: any, index: number): MarketItem {
    const rarityMultiplier = MARKET_CONFIG.rarityPriceMultipliers[config.rarity];
    const fluctuation = 1 + (Math.random() * 2 - 1) * MARKET_CONFIG.priceFluctuationRange;
    const basePrice = Math.round(config.basePrice * rarityMultiplier);
    const levelBonus = 1 + this.getMarketState().marketLevel * 0.02;
    
    return {
      id: `market_item_${Date.now()}_${index}`,
      petalType: config.petalType,
      rarity: config.rarity,
      basePrice: Math.round(basePrice * levelBonus),
      currentPrice: Math.round(basePrice * fluctuation * levelBonus),
      stock: Math.min(config.maxStock, Math.floor(Math.random() * config.maxStock) + 1),
      maxStock: config.maxStock,
      priceFluctuation: fluctuation,
      discount: Math.random() < 0.1 ? MARKET_CONFIG.newItemDiscount : 0,
      isHot: Math.random() < 0.15,
      isNew: true,
      restockTime: Date.now() + MARKET_CONFIG.autoRestockIntervalMs
    };
  }

  private calculateFinalPrice(item: MarketItem): number {
    let price = item.currentPrice;
    
    if (item.discount > 0) {
      price *= (1 - item.discount);
    }
    
    if (item.isHot) {
      price *= (1 + MARKET_CONFIG.hotItemBonus);
    }
    
    return Math.max(1, Math.round(price));
  }

  private updateAllPrices(): void {
    const marketState = this.getMarketState();
    
    marketState.items.forEach(item => {
      const oldPrice = item.currentPrice;
      const fluctuation = 1 + (Math.random() * 2 - 1) * MARKET_CONFIG.priceFluctuationRange * 0.5;
      const newPrice = Math.max(item.basePrice * 0.7, Math.min(item.basePrice * 1.5, item.currentPrice * fluctuation));
      
      item.currentPrice = Math.round(newPrice);
      item.priceFluctuation = newPrice / item.basePrice;
      
      if (Math.abs(oldPrice - item.currentPrice) > item.basePrice * 0.1) {
        EventManager.getInstance().emit('market:price_updated', {
          petalType: item.petalType,
          oldPrice,
          newPrice: item.currentPrice
        });
      }
      
      this.recordPriceHistory(marketState, item.petalType, item.currentPrice);
    });
    
    this.saveMarketState(marketState);
  }

  private updateDemand(petalType: PetalType, amount: number): void {
    const marketState = this.getMarketState();
    
    marketState.items.forEach(item => {
      if (item.petalType === petalType) {
        const demandFactor = 1 - Math.min(amount * 0.01, 0.1);
        item.currentPrice = Math.round(item.currentPrice * demandFactor);
      }
    });
  }

  private adjustPricesAfterSynthesis(): void {
    const marketState = this.getMarketState();
    const usedTypes = new Set<PetalType>();
    
    marketState.items.forEach(item => {
      if (usedTypes.has(item.petalType)) return;
      
      const demandFactor = 1 + (Math.random() * 0.1);
      item.currentPrice = Math.round(item.currentPrice * demandFactor);
      usedTypes.add(item.petalType);
    });
    
    this.saveMarketState(marketState);
  }

  private autoRestock(): void {
    const marketState = this.getMarketState();
    const now = Date.now();
    
    marketState.items.forEach(item => {
      if (item.stock < item.maxStock && now >= item.restockTime) {
        const restockAmount = Math.min(item.maxStock - item.stock, Math.ceil(item.maxStock * 0.5));
        item.stock += restockAmount;
        item.restockTime = now + MARKET_CONFIG.autoRestockIntervalMs;
        
        EventManager.getInstance().emit('market:item_restocked', {
          itemId: item.id,
          petalType: item.petalType,
          newStock: item.stock
        });
      }
    });
    
    this.saveMarketState(marketState);
  }

  private checkDailyReset(): void {
    const marketState = this.getMarketState();
    const today = new Date().toDateString();
    
    if (marketState.lastResetDay !== today) {
      marketState.todayPurchases = 0;
      marketState.lastResetDay = today;
      marketState.refreshCost = MARKET_CONFIG.baseRefreshCost;
      this.saveMarketState(marketState);
    }
  }

  private updateReputation(marketState: MarketState, tradeAmount: number): void {
    const oldReputation = marketState.reputation;
    marketState.reputation = Math.min(
      MARKET_CONFIG.maxReputation,
      marketState.reputation + tradeAmount * MARKET_CONFIG.reputationPerTrade
    );
    
    if (marketState.reputation !== oldReputation) {
      EventManager.getInstance().emit('market:reputation_updated', {
        oldReputation,
        newReputation: marketState.reputation
      });
    }
  }

  private checkLevelUp(marketState: MarketState): void {
    const newLevel = Math.floor(marketState.reputation / 100) + 1;
    if (newLevel > marketState.marketLevel) {
      const oldLevel = marketState.marketLevel;
      marketState.marketLevel = newLevel;
      marketState.dailyPurchaseLimit = MARKET_CONFIG.dailyPurchaseLimit + (newLevel - 1) * 5;
      
      EventManager.getInstance().emit('market:level_up', {
        oldLevel,
        newLevel
      });
      EventManager.getInstance().emit('audio:play', { key: 'sfx_level_up', volume: 0.5 });
    }
  }

  private addTransaction(marketState: MarketState, transaction: MarketTransaction): void {
    marketState.transactions.unshift(transaction);
    if (marketState.transactions.length > 50) {
      marketState.transactions = marketState.transactions.slice(0, 50);
    }
  }

  private recordPriceHistory(marketState: MarketState, petalType: PetalType, price: number): void {
    const history = marketState.priceHistories[petalType];
    if (history) {
      history.prices.push({ timestamp: Date.now(), price });
      if (history.prices.length > 20) {
        history.prices = history.prices.slice(-20);
      }
    }
  }

  private getPetalCategory(type: PetalType): 'normal' | 'mutation' | 'failed' {
    const mutationTypes = [
      PetalType.MOONLIGHT_SHIMMER,
      PetalType.STARLIGHT_BURST,
      PetalType.DEW_CRYSTAL,
      PetalType.GLOWING_EMBER,
      PetalType.DREAM_PHANTOM
    ];
    const failedTypes = [
      PetalType.FAILED_DUST,
      PetalType.FAILED_SLIME,
      PetalType.FAILED_ASH
    ];
    
    if (mutationTypes.includes(type)) return 'mutation';
    if (failedTypes.includes(type)) return 'failed';
    return 'normal';
  }

  public toggleFavorite(petalType: PetalType): void {
    const marketState = this.getMarketState();
    const index = marketState.favoritePetals.indexOf(petalType);
    
    if (index === -1) {
      marketState.favoritePetals.push(petalType);
    } else {
      marketState.favoritePetals.splice(index, 1);
    }
    
    this.saveMarketState(marketState);
  }

  public isFavorite(petalType: PetalType): boolean {
    return this.getMarketState().favoritePetals.includes(petalType);
  }

  public getTransactions(): MarketTransaction[] {
    return this.getMarketState().transactions;
  }

  public getPriceHistory(petalType: PetalType): { timestamp: number; price: number }[] {
    return this.getMarketState().priceHistories[petalType]?.prices || [];
  }

  public getRefreshCooldownRemaining(): number {
    const marketState = this.getMarketState();
    const elapsed = Date.now() - marketState.lastRefreshTime;
    return Math.max(0, marketState.refreshCooldown - elapsed);
  }

  public getRemainingDailyPurchases(): number {
    const marketState = this.getMarketState();
    return Math.max(0, marketState.dailyPurchaseLimit - marketState.todayPurchases);
  }

  public getSellPrice(petalType: PetalType): number {
    const itemConfig = MARKET_ITEM_CONFIGS.find(c => c.petalType === petalType);
    if (!itemConfig) return 0;
    
    const rarityMultiplier = MARKET_CONFIG.rarityPriceMultipliers[itemConfig.rarity];
    const basePrice = Math.round(itemConfig.basePrice * rarityMultiplier);
    return Math.round(basePrice * MARKET_CONFIG.sellPriceRatio);
  }

  public addCurrency(amount: number): void {
    const marketState = this.getMarketState();
    const oldCurrency = marketState.currency;
    marketState.currency += amount;
    
    EventManager.getInstance().emit('market:currency_updated', {
      oldCurrency,
      newCurrency: marketState.currency
    });
    
    this.saveMarketState(marketState);
  }

  public getStats(): {
    totalTrades: number;
    totalProfit: number;
    totalSpent: number;
    marketLevel: number;
    reputation: number;
  } {
    const marketState = this.getMarketState();
    return {
      totalTrades: marketState.totalTrades,
      totalProfit: marketState.totalProfit,
      totalSpent: marketState.totalSpent,
      marketLevel: marketState.marketLevel,
      reputation: marketState.reputation
    };
  }

  public openPanel(): void {
    EventManager.getInstance().emit('market:panel_opened', {});
    EventManager.getInstance().emit('audio:play', { key: 'sfx_panel_open', volume: 0.3 });
  }

  public destroy(): void {
    this.eventListeners.forEach(({ event, callback }) => {
      EventManager.getInstance().off(event as any, callback);
    });
    this.eventListeners = [];
    this.scene = null;
  }
}
