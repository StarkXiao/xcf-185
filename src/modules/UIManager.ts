import Phaser from 'phaser';
import { PetalType, GameState, GameEvents, SynthesisResultData, SynthesisResultType } from '../types';
import { PETAL_CONFIGS, GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { EventManager } from '../managers/EventManager';
import { SynthesisSystem } from './SynthesisSystem';
import { AudioManager } from '../managers/AudioManager';

type CollectionCategory = 'normal' | 'mutation' | 'failed';

export class UIManager {
  private scene: Phaser.Scene;
  private synthesisSystem: SynthesisSystem;
  private container: Phaser.GameObjects.Container | null = null;
  private petalCounters: Map<PetalType, Phaser.GameObjects.Text> = new Map();
  private synthesisPanel: Phaser.GameObjects.Container | null = null;
  private collectionPanel: Phaser.GameObjects.Container | null = null;
  private progressBar: Phaser.GameObjects.Graphics | null = null;
  private progressText: Phaser.GameObjects.Text | null = null;
  private toastText: Phaser.GameObjects.Text | null = null;
  private currentCollectionCategory: CollectionCategory = 'normal';
  private categoryTabButtons: Phaser.GameObjects.Container[] = [];
  private uiListeners: Array<{ event: keyof GameEvents; callback: (data: any) => void }> = [];

  constructor(scene: Phaser.Scene, synthesisSystem: SynthesisSystem) {
    this.scene = scene;
    this.synthesisSystem = synthesisSystem;
  }

  public create(): void {
    this.createPixelTextures();
    this.createMainUI();
    this.setupEventListeners();
  }

  private createPixelTextures(): void {
    const colors = [
      { key: 'pixel_white', color: 0xffffff },
      { key: 'pixel_yellow', color: 0xffee66 },
      { key: 'pixel_cyan', color: 0xa8e6cf },
      { key: 'pixel_pink', color: 0xff6b9d },
      { key: 'pixel_orange', color: 0xffaa00 },
      { key: 'pixel_gray', color: 0x888888 }
    ];

    colors.forEach(({ key, color }) => {
      if (!this.scene.textures.exists(key)) {
        const canvas = this.scene.textures.createCanvas(key, 4, 4);
        const ctx = canvas.getContext();
        ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
        ctx.fillRect(0, 0, 4, 4);
        canvas.refresh();
      }
    });
  }

  private createMainUI(): void {
    this.container = this.scene.add.container(0, 0).setDepth(100).setScrollFactor(0);
    
    this.createBottomBar();
    this.createSynthesisButton();
    this.createCollectionButton();
    this.createMuteButton();
    this.createProgressUI();
    this.createToast();
    this.updateUI();
  }

  private createBottomBar(): void {
    if (!this.container) return;

    const barHeight = 140;
    const barY = GAME_HEIGHT - barHeight;

    const barBg = this.scene.add.graphics();
    barBg.fillStyle(0x0a0514, 0.85);
    barBg.fillRoundedRect(20, barY, GAME_WIDTH - 40, barHeight - 20, 20);
    
    barBg.lineStyle(2, 0xa8e6cf, 0.3);
    barBg.strokeRoundedRect(20, barY, GAME_WIDTH - 40, barHeight - 20, 20);

    this.container.add(barBg);

    const basicPetals = [PetalType.MOONLIGHT, PetalType.STARLIGHT, PetalType.DEW];
    const advancedPetals = [PetalType.GLOWING, PetalType.DREAM, PetalType.ETERNAL, PetalType.WAKEUP];
    const mutationPetals = [PetalType.MOONLIGHT_SHIMMER, PetalType.STARLIGHT_BURST, PetalType.DEW_CRYSTAL];

    basicPetals.forEach((type, index) => {
      this.createPetalCounter(type, 40 + index * 95, barY + 45);
    });

    advancedPetals.forEach((type, index) => {
      this.createPetalCounter(type, 40 + index * 95, barY + 95);
    });

    mutationPetals.forEach((type, index) => {
      this.createPetalCounter(type, 40 + (index + 4) * 95, barY + 45);
    });
  }

  private createPetalCounter(type: PetalType, x: number, y: number): void {
    if (!this.container) return;

    const config = PETAL_CONFIGS[type];
    
    const petalIcon = this.scene.add.image(x, y, `petal_${type}`)
      .setDisplaySize(36, 36)
      .setBlendMode(config.isFailed ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);

    const countBg = this.scene.add.graphics();
    countBg.fillStyle(0x000000, 0.6);
    countBg.fillRoundedRect(x + 16, y - 10, 44, 22, 8);

    const countText = this.scene.add.text(x + 38, y, '0', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    this.petalCounters.set(type, countText);
    this.container.add([petalIcon, countBg, countText]);
  }

  private createSynthesisButton(): void {
    if (!this.container) return;

    const btnX = GAME_WIDTH - 80;
    const btnY = GAME_HEIGHT - 70;

    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(0xff6b9d, 0.8);
    btnBg.fillCircle(btnX, btnY, 40);
    
    btnBg.lineStyle(3, 0xffffff, 0.5);
    btnBg.strokeCircle(btnX, btnY, 40);

    const glowTextureKey = 'synth_btn_glow';
    if (!this.scene.textures.exists(glowTextureKey)) {
      const glowCanvas = this.scene.textures.createCanvas(glowTextureKey, 120, 120);
      const glowCtx = glowCanvas.getContext();
      const center = 60;
      const grad = glowCtx.createRadialGradient(center, center, 0, center, center, 60);
      grad.addColorStop(0, 'rgba(255, 107, 157, 0.4)');
      grad.addColorStop(1, 'rgba(255, 107, 157, 0)');
      glowCtx.fillStyle = grad;
      glowCtx.beginPath();
      glowCtx.arc(center, center, 60, 0, Math.PI * 2);
      glowCtx.fill();
      glowCanvas.refresh();
    }

    const btnGlow = this.scene.add.image(btnX, btnY, glowTextureKey).setBlendMode(Phaser.BlendModes.ADD);

    const btnText = this.scene.add.text(btnX, btnY, '合成', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    const button = this.scene.add.zone(btnX, btnY, 80, 80)
      .setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => {
      btnBg.setScale(0.9);
      EventManager.getInstance().emit('audio:play', { key: 'sfx_click', volume: 0.3 });
    });

    button.on('pointerup', () => {
      btnBg.setScale(1);
      this.toggleSynthesisPanel();
    });

    button.on('pointerout', () => {
      btnBg.setScale(1);
    });

    this.scene.tweens.add({
      targets: btnGlow,
      alpha: { from: 0.5, to: 1 },
      duration: 1500,
      yoyo: true,
      repeat: -1
    });

    this.container.add([btnGlow, btnBg, btnText, button]);
  }

  private createCollectionButton(): void {
    if (!this.container) return;

    const btnX = GAME_WIDTH - 80;
    const btnY = GAME_HEIGHT - 170;

    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(0xa8e6cf, 0.8);
    btnBg.fillCircle(btnX, btnY, 32);
    
    btnBg.lineStyle(2, 0xffffff, 0.5);
    btnBg.strokeCircle(btnX, btnY, 32);

    const btnText = this.scene.add.text(btnX, btnY, '图鉴', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    const button = this.scene.add.zone(btnX, btnY, 64, 64)
      .setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => btnBg.setScale(0.9));
    button.on('pointerup', () => {
      btnBg.setScale(1);
      this.toggleCollectionPanel();
      EventManager.getInstance().emit('audio:play', { key: 'sfx_click', volume: 0.3 });
    });
    button.on('pointerout', () => btnBg.setScale(1));

    this.container.add([btnBg, btnText, button]);
  }

  private createMuteButton(): void {
    if (!this.container) return;

    const isMuted = AudioManager.getInstance().isMuted();
    const btnX = 55;
    const btnY = 75;

    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(0x1a0a2e, 0.7);
    btnBg.fillCircle(btnX, btnY, 28);
    
    btnBg.lineStyle(2, 0xa8e6cf, 0.5);
    btnBg.strokeCircle(btnX, btnY, 28);

    const btnText = this.scene.add.text(btnX, btnY, isMuted ? '🔇' : '🔊', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    const button = this.scene.add.zone(btnX, btnY, 56, 56)
      .setInteractive({ useHandCursor: true });

    button.on('pointerup', () => {
      const newMuted = AudioManager.getInstance().toggleMute();
      btnText.setText(newMuted ? '🔇' : '🔊');
    });

    this.container.add([btnBg, btnText, button]);
  }

  private createProgressUI(): void {
    if (!this.container) return;

    const barX = 100;
    const barY = 65;
    const barWidth = GAME_WIDTH - 230;
    const barHeight = 18;

    const barBg = this.scene.add.graphics();
    barBg.fillStyle(0x000000, 0.5);
    barBg.fillRoundedRect(barX, barY - barHeight / 2, barWidth, barHeight, 10);
    
    barBg.lineStyle(2, 0xa8e6cf, 0.5);
    barBg.strokeRoundedRect(barX, barY - barHeight / 2, barWidth, barHeight, 10);

    this.progressBar = this.scene.add.graphics();
    
    this.progressText = this.scene.add.text(GAME_WIDTH / 2, barY, '唤醒进度 0%', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    this.container.add([barBg, this.progressBar, this.progressText]);
  }

  private createToast(): void {
    this.toastText = this.scene.add.text(GAME_WIDTH / 2, 150, '', {
      fontFamily: 'Arial',
      fontSize: '17px',
      color: '#ffffff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(200).setScrollFactor(0).setAlpha(0);
  }

  private setupEventListeners(): void {
    const onCollected = ({ type, count }: GameEvents['petal:collected']) => {
      this.updateUI();
      const config = PETAL_CONFIGS[type];
      const prefix = config.isMutation ? '✨ ' : config.isFailed ? '💨 ' : '';
      this.showToast(`${prefix}+${count} ${config.name}`);
    };
    EventManager.getInstance().on('petal:collected', onCollected);
    this.uiListeners.push({ event: 'petal:collected', callback: onCollected });

    const onSynthComplete = (data: GameEvents['synthesis:complete']) => {
      this.updateUI();
      if (data.resultType === SynthesisResultType.MUTATION) {
        const config = PETAL_CONFIGS[data.output];
        this.showToast(`🌟 变异成功！获得 ${config.name}`, 3500, 0xffaa00);
      } else if (data.resultType === SynthesisResultType.NORMAL) {
        const config = PETAL_CONFIGS[data.output];
        this.showToast(`合成成功！获得 ${config.name}`, 3000);
      }
    };
    EventManager.getInstance().on('synthesis:complete', onSynthComplete);
    this.uiListeners.push({ event: 'synthesis:complete', callback: onSynthComplete });

    const onSynthMutation = (data: GameEvents['synthesis:mutation']) => {
      const config = PETAL_CONFIGS[data.output];
      this.showToast(`🎉 稀有变异！${config.name} 诞生！`, 4000, 0xffdd00);
    };
    EventManager.getInstance().on('synthesis:mutation', onSynthMutation);
    this.uiListeners.push({ event: 'synthesis:mutation', callback: onSynthMutation });

    const onSynthFail = (data: GameEvents['synthesis:fail']) => {
      this.updateUI();
      if (data.output && data.count > 0) {
        const config = PETAL_CONFIGS[data.output];
        let msg = `合成失败...获得 ${config.name}`;
        if (data.returnedPetals && data.returnedPetals.length > 0) {
          const returned = data.returnedPetals.map(r => `${r.count}${PETAL_CONFIGS[r.type].name}`).join('、');
          msg += `，返还 ${returned}`;
        }
        this.showToast(msg, 3000, 0xff6b6b);
      }
    };
    EventManager.getInstance().on('synthesis:fail', onSynthFail);
    this.uiListeners.push({ event: 'synthesis:fail', callback: onSynthFail });

    const onCollectionUnlock = ({ type, category }: GameEvents['collection:unlock']) => {
      const config = PETAL_CONFIGS[type];
      const categoryText = category === 'mutation' ? '✨新变异' : category === 'failed' ? '💀新发现' : '🌸新解锁';
      this.showToast(`${categoryText}：${config.name}`, 3500, 
        category === 'mutation' ? 0xffaa00 : category === 'failed' ? 0x888888 : 0xa8e6cf);
    };
    EventManager.getInstance().on('collection:unlock', onCollectionUnlock);
    this.uiListeners.push({ event: 'collection:unlock', callback: onCollectionUnlock });

    const onRecipeUnlock = ({ recipeId }: GameEvents['synthesis:recipe_unlocked']) => {
      this.showToast(`📖 解锁新配方！`, 3000, 0xffdd33);
      if (this.synthesisPanel) {
        this.closeSynthesisPanel();
        this.openSynthesisPanel();
      }
    };
    EventManager.getInstance().on('synthesis:recipe_unlocked', onRecipeUnlock);
    this.uiListeners.push({ event: 'synthesis:recipe_unlocked', callback: onRecipeUnlock });

    const onSaveUpdate = (_data: GameEvents['save:update']) => {
      this.updateUI();
    };
    EventManager.getInstance().on('save:update', onSaveUpdate);
    this.uiListeners.push({ event: 'save:update', callback: onSaveUpdate });
  }

  private showToast(message: string, duration: number = 2000, color: number = 0xffffff): void {
    if (!this.toastText) return;

    this.toastText.setText(message);
    this.toastText.setColor(`#${color.toString(16).padStart(6, '0')}`);
    
    this.scene.tweens.killTweensOf(this.toastText);
    
    this.scene.tweens.add({
      targets: this.toastText,
      alpha: 1,
      y: 130,
      duration: 300,
      ease: 'Back.Out'
    });

    this.scene.tweens.add({
      targets: this.toastText,
      alpha: 0,
      y: 150,
      duration: 500,
      delay: Math.max(duration - 500, 0),
      ease: 'Cubic.In'
    });
  }

  private toggleSynthesisPanel(): void {
    if (this.synthesisPanel) {
      this.closeSynthesisPanel();
    } else {
      this.openSynthesisPanel();
    }
  }

  private openSynthesisPanel(): void {
    if (!this.container) return;

    this.synthesisPanel = this.scene.add.container(0, 0).setDepth(150).setScrollFactor(0);
    
    const panelBg = this.scene.add.graphics();
    panelBg.fillStyle(0x0a0514, 0.95);
    panelBg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.synthesisPanel.add(panelBg);

    const title = this.scene.add.text(GAME_WIDTH / 2, 90, '花瓣合成', {
      fontFamily: 'Arial',
      fontSize: '30px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.synthesisPanel.add(title);

    const state = SaveManager.getInstance().getGameState();
    const statsText = this.scene.add.text(GAME_WIDTH / 2, 130, 
      `合成: ${state.totalSynthesized} | 变异: ${state.totalMutations} | 失败: ${state.totalFailures}`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#a8e6cf',
      align: 'center'
    }).setOrigin(0.5);
    this.synthesisPanel.add(statsText);

    const recipes = this.synthesisSystem.getAllRecipes();
    
    const scrollMask = this.scene.add.graphics().setDepth(149);
    scrollMask.fillRect(0, 160, GAME_WIDTH, GAME_HEIGHT - 160);
    this.synthesisPanel.add(scrollMask);

    recipes.forEach((recipe, index) => {
      this.createRecipeCard(recipe, 50, 180 + index * 155);
    });

    const closeBtn = this.scene.add.text(GAME_WIDTH - 70, 75, '✕', {
      fontFamily: 'Arial',
      fontSize: '30px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerup', () => this.closeSynthesisPanel());
    this.synthesisPanel.add(closeBtn);

    this.synthesisPanel.setAlpha(0);
    this.scene.tweens.add({
      targets: this.synthesisPanel,
      alpha: 1,
      duration: 300
    });

    this.container.add(this.synthesisPanel);
  }

  private createRecipeCard(recipe: any, x: number, y: number): void {
    if (!this.synthesisPanel) return;

    const cardWidth = GAME_WIDTH - 100;
    const cardHeight = 135;
    const canSynth = this.synthesisSystem.canSynthesize(recipe.id);
    const state = SaveManager.getInstance().getGameState();
    const mutationChance = this.synthesisSystem.getMutationChance(recipe.id);
    const failChance = this.synthesisSystem.getFailChance(recipe.id);

    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(canSynth ? 0x1a0a2e : 0x0a0a0a, 0.8);
    cardBg.fillRoundedRect(x, y, cardWidth, cardHeight, 15);
    cardBg.lineStyle(2, canSynth ? 0xa8e6cf : 0x444444, canSynth ? 0.6 : 0.3);
    cardBg.strokeRoundedRect(x, y, cardWidth, cardHeight, 15);
    this.synthesisPanel.add(cardBg);

    let offsetX = x + 25;
    recipe.inputs.forEach((input: any, idx: number) => {
      const config = PETAL_CONFIGS[input.type];
      const hasEnough = (state.petals[input.type] || 0) >= input.count;

      const petalImg = this.scene.add.image(offsetX, y + 45, `petal_${input.type}`)
        .setDisplaySize(42, 42)
        .setBlendMode(config.isFailed ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD)
        .setAlpha(hasEnough ? 1 : 0.4);

      const countText = this.scene.add.text(offsetX, y + 82, 
        `${state.petals[input.type] || 0}/${input.count}`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: hasEnough ? '#a8e6cf' : '#ff6b6b',
        align: 'center'
      }).setOrigin(0.5);

      this.synthesisPanel.add([petalImg, countText]);

      if (idx < recipe.inputs.length - 1) {
        const plusText = this.scene.add.text(offsetX + 38, y + 45, '+', {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#ffffff'
        }).setOrigin(0.5);
        this.synthesisPanel.add(plusText);
      }
      offsetX += 85;
    });

    const arrowText = this.scene.add.text(offsetX + 15, y + 45, '→', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.synthesisPanel.add(arrowText);

    const outputConfig = PETAL_CONFIGS[recipe.output.type];
    const outputImg = this.scene.add.image(offsetX + 60, y + 45, `petal_${recipe.output.type}`)
      .setDisplaySize(50, 50)
      .setBlendMode(outputConfig.isFailed ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
    const outputName = this.scene.add.text(offsetX + 60, y + 82, outputConfig.name, {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.synthesisPanel.add([outputImg, outputName]);

    const chanceY = y + 108;
    if (mutationChance > 0 || failChance > 0) {
      const normalChance = Math.max(0, 100 - Math.round(mutationChance * 100) - Math.round(failChance * 100));
      const chanceText = this.scene.add.text(x + 25, chanceY,
        `成功${normalChance}% ${mutationChance > 0 ? `| 变异${Math.round(mutationChance * 100)}%` : ''} ${failChance > 0 ? `| 失败${Math.round(failChance * 100)}%` : ''}`,
        {
          fontFamily: 'Arial',
          fontSize: '11px',
          color: '#888888',
          align: 'left'
        }
      );
      this.synthesisPanel.add(chanceText);
    }

    if (canSynth) {
      const btnBg = this.scene.add.graphics();
      btnBg.fillStyle(0xff6b9d, 0.85);
      btnBg.fillRoundedRect(cardWidth - 115, y + 35, 90, 45, 10);

      const btnText = this.scene.add.text(cardWidth - 70, y + 57, '合成', {
        fontFamily: 'Arial',
        fontSize: '17px',
        color: '#ffffff',
        align: 'center'
      }).setOrigin(0.5);

      const btnZone = this.scene.add.zone(cardWidth - 70, y + 57, 90, 45)
        .setInteractive({ useHandCursor: true });

      btnZone.on('pointerup', () => {
        if (this.synthesisSystem.synthesize(recipe.id)) {
          this.closeSynthesisPanel();
        }
      });

      this.synthesisPanel.add([btnBg, btnText, btnZone]);
    }
  }

  private closeSynthesisPanel(): void {
    if (!this.synthesisPanel || !this.container) return;

    this.scene.tweens.add({
      targets: this.synthesisPanel,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        if (this.synthesisPanel) {
          this.container!.remove(this.synthesisPanel);
          this.synthesisPanel.destroy();
          this.synthesisPanel = null;
        }
      }
    });
  }

  private toggleCollectionPanel(): void {
    if (this.collectionPanel) {
      this.closeCollectionPanel();
    } else {
      this.openCollectionPanel();
    }
  }

  private openCollectionPanel(): void {
    if (!this.container) return;

    this.collectionPanel = this.scene.add.container(0, 0).setDepth(150).setScrollFactor(0);
    
    const panelBg = this.scene.add.graphics();
    panelBg.fillStyle(0x0a0514, 0.95);
    panelBg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.collectionPanel.add(panelBg);

    const title = this.scene.add.text(GAME_WIDTH / 2, 85, '花瓣图鉴', {
      fontFamily: 'Arial',
      fontSize: '30px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.collectionPanel.add(title);

    this.createCategoryTabs();

    const state = SaveManager.getInstance().getGameState();
    const totalTypes = Object.values(PetalType).length;
    const unlockedCount = state.unlockedPetals.length;
    const completionText = this.scene.add.text(GAME_WIDTH / 2, 125, 
      `收集进度: ${unlockedCount}/${totalTypes}`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#a8e6cf',
      align: 'center'
    }).setOrigin(0.5);
    this.collectionPanel.add(completionText);

    this.renderCollectionItems();

    const closeBtn = this.scene.add.text(GAME_WIDTH - 70, 75, '✕', {
      fontFamily: 'Arial',
      fontSize: '30px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerup', () => this.closeCollectionPanel());
    this.collectionPanel.add(closeBtn);

    this.collectionPanel.setAlpha(0);
    this.scene.tweens.add({
      targets: this.collectionPanel,
      alpha: 1,
      duration: 300
    });

    this.container.add(this.collectionPanel);
  }

  private createCategoryTabs(): void {
    if (!this.collectionPanel) return;

    const categories: { key: CollectionCategory; label: string; color: number }[] = [
      { key: 'normal', label: '普通花瓣', color: 0xa8e6cf },
      { key: 'mutation', label: '✨ 变异', color: 0xffaa00 },
      { key: 'failed', label: '💀 失败产物', color: 0x888888 }
    ];

    const tabWidth = 200;
    const tabHeight = 40;
    const startX = (GAME_WIDTH - categories.length * tabWidth) / 2;
    const tabY = 155;

    this.categoryTabButtons = [];

    categories.forEach((cat, index) => {
      const tabContainer = this.scene.add.container(0, 0);
      const tabX = startX + index * tabWidth;
      const isActive = this.currentCollectionCategory === cat.key;

      const tabBg = this.scene.add.graphics();
      tabBg.fillStyle(isActive ? cat.color : 0x1a0a2e, isActive ? 0.8 : 0.5);
      tabBg.fillRoundedRect(tabX, tabY, tabWidth - 8, tabHeight, 10);
      tabBg.lineStyle(2, cat.color, isActive ? 0.8 : 0.3);
      tabBg.strokeRoundedRect(tabX, tabY, tabWidth - 8, tabHeight, 10);

      const tabText = this.scene.add.text(tabX + (tabWidth - 8) / 2, tabY + tabHeight / 2, cat.label, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: isActive ? '#ffffff' : `#${cat.color.toString(16).padStart(6, '0')}`,
        align: 'center'
      }).setOrigin(0.5);

      tabContainer.add([tabBg, tabText]);

      const zone = this.scene.add.zone(tabX + (tabWidth - 8) / 2, tabY + tabHeight / 2, tabWidth - 8, tabHeight)
        .setInteractive({ useHandCursor: true });

      zone.on('pointerup', () => {
        this.currentCollectionCategory = cat.key;
        EventManager.getInstance().emit('audio:play', { key: 'sfx_click', volume: 0.3 });
        this.refreshCollectionPanel();
      });

      tabContainer.add(zone);
      this.collectionPanel!.add(tabContainer);
      this.categoryTabButtons.push(tabContainer);
    });
  }

  private refreshCollectionPanel(): void {
    if (!this.collectionPanel) return;

    this.categoryTabButtons.forEach(btn => btn.destroy());
    this.categoryTabButtons = [];
    
    const itemsToRemove: Phaser.GameObjects.GameObject[] = [];
    this.collectionPanel.iterate((child) => {
      if ((child as any)._isCollectionItem) {
        itemsToRemove.push(child);
      }
    });
    itemsToRemove.forEach(item => {
      this.collectionPanel!.remove(item);
      item.destroy();
    });

    this.createCategoryTabs();
    this.renderCollectionItems();
  }

  private renderCollectionItems(): void {
    if (!this.collectionPanel) return;

    const state = SaveManager.getInstance().getGameState();
    const allPetals = Object.values(PetalType).filter(type => {
      const config = PETAL_CONFIGS[type];
      return config.category === this.currentCollectionCategory;
    });
    
    allPetals.forEach((type, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const px = 100 + col * 185;
      const py = 235 + row * 185;

      this.createCollectionItem(type, px, py, state);
    });
  }

  private createCollectionItem(type: PetalType, x: number, y: number, state: GameState): void {
    if (!this.collectionPanel) return;

    const config = PETAL_CONFIGS[type];
    const unlocked = state.unlockedPetals.includes(type);
    const count = state.petals[type] || 0;

    const itemContainer = this.scene.add.container(0, 0);
    (itemContainer as any)._isCollectionItem = true;

    const itemBg = this.scene.add.graphics();
    const borderColor = unlocked ? config.color : 0x333333;
    itemBg.fillStyle(unlocked ? 0x1a0a2e : 0x0a0a0a, 0.8);
    itemBg.fillRoundedRect(x - 75, y - 85, 150, 170, 15);
    itemBg.lineStyle(2, borderColor, unlocked ? 0.6 : 0.3);
    itemBg.strokeRoundedRect(x - 75, y - 85, 150, 170, 15);

    const petalImg = this.scene.add.image(x, y - 25, `petal_${type}`)
      .setDisplaySize(65, 65)
      .setBlendMode(unlocked && !config.isFailed ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL)
      .setAlpha(unlocked ? 1 : 0.2);

    const nameText = this.scene.add.text(x, y + 35, unlocked ? config.name : '???', {
      fontFamily: 'Arial',
      fontSize: '15px',
      color: unlocked ? '#ffffff' : '#666666',
      align: 'center',
      wordWrap: { width: 130 }
    }).setOrigin(0.5);

    const countText = this.scene.add.text(x, y + 60, unlocked ? `拥有: ${count}` : '未解锁', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: unlocked ? (config.isMutation ? '#ffaa00' : config.isFailed ? '#888888' : '#a8e6cf') : '#444444',
      align: 'center'
    }).setOrigin(0.5);

    if (unlocked && (config.isMutation || config.isFailed)) {
      const tagColor = config.isMutation ? '#ffaa00' : '#888888';
      const tagText = this.scene.add.text(x, y - 70, config.isMutation ? '✨变异' : '💀失败', {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: tagColor,
        align: 'center',
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(0.5);
      itemContainer.add(tagText);
    }

    itemContainer.add([itemBg, petalImg, nameText, countText]);
    this.collectionPanel.add(itemContainer);
  }

  private closeCollectionPanel(): void {
    if (!this.collectionPanel || !this.container) return;

    this.scene.tweens.add({
      targets: this.collectionPanel,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        if (this.collectionPanel) {
          this.container!.remove(this.collectionPanel);
          this.collectionPanel.destroy();
          this.collectionPanel = null;
          this.categoryTabButtons = [];
        }
      }
    });
  }

  public updateUI(): void {
    const state = SaveManager.getInstance().getGameState();

    this.petalCounters.forEach((text, type) => {
      const count = state.petals[type] || 0;
      text.setText(count.toString());
    });

    this.updateProgressBar(state);
  }

  private updateProgressBar(state: GameState): void {
    if (!this.progressBar || !this.progressText) return;

    const barX = 100;
    const barY = 65;
    const barWidth = GAME_WIDTH - 230;
    const barHeight = 18;

    const totalPetals = Object.values(PetalType).length;
    const unlockedCount = state.unlockedPetals.length;
    const progress = (unlockedCount / totalPetals) * 100;

    this.progressBar.clear();
    const fillWidth = Math.max(0, (barWidth - 4) * (progress / 100));

    this.progressBar.fillGradientStyle(
      0xa8e6cf, 0xff6b9d,
      0xa8e6cf, 0xff6b9d,
      1, 1, 1, 1
    );
    this.progressBar.fillRoundedRect(barX + 2, barY - barHeight / 2 + 2, fillWidth, barHeight - 4, 8);

    this.progressText.setText(`收集进度 ${Math.floor(progress)}%`);
  }

  public destroy(): void {
    this.uiListeners.forEach(({ event, callback }) => {
      EventManager.getInstance().off(event, callback);
    });
    this.uiListeners = [];
    if (this.container) {
      this.container.destroy();
    }
  }
}
