import Phaser from 'phaser';
import { PetalType, GameState, GameEvents } from '../types';
import { PETAL_CONFIGS, GAME_WIDTH, GAME_HEIGHT } from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { EventManager } from '../managers/EventManager';
import { SynthesisSystem } from './SynthesisSystem';
import { AudioManager } from '../managers/AudioManager';

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
      { key: 'pixel_pink', color: 0xff6b9d }
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

    basicPetals.forEach((type, index) => {
      this.createPetalCounter(type, 60 + index * 110, barY + 45);
    });

    advancedPetals.forEach((type, index) => {
      this.createPetalCounter(type, 60 + index * 110, barY + 95);
    });
  }

  private createPetalCounter(type: PetalType, x: number, y: number): void {
    if (!this.container) return;

    const config = PETAL_CONFIGS[type];
    
    const petalIcon = this.scene.add.image(x, y, `petal_${type}`)
      .setDisplaySize(40, 40)
      .setBlendMode(Phaser.BlendModes.ADD);

    const countBg = this.scene.add.graphics();
    countBg.fillStyle(0x000000, 0.6);
    countBg.fillRoundedRect(x + 20, y - 10, 50, 24, 8);

    const countText = this.scene.add.text(x + 45, y, '0', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    this.petalCounters.set(type, countText);
    this.container.add([petalIcon, countBg, countText]);
  }

  private createSynthesisButton(): void {
    if (!this.container) return;

    const btnX = GAME_WIDTH - 100;
    const btnY = GAME_HEIGHT - 70;

    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(0xff6b9d, 0.8);
    btnBg.fillCircle(btnX, btnY, 45);
    
    btnBg.lineStyle(3, 0xffffff, 0.5);
    btnBg.strokeCircle(btnX, btnY, 45);

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
      fontSize: '18px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    const button = this.scene.add.zone(btnX, btnY, 90, 90)
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

    const btnX = GAME_WIDTH - 100;
    const btnY = GAME_HEIGHT - 180;

    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(0xa8e6cf, 0.8);
    btnBg.fillCircle(btnX, btnY, 35);
    
    btnBg.lineStyle(2, 0xffffff, 0.5);
    btnBg.strokeCircle(btnX, btnY, 35);

    const btnText = this.scene.add.text(btnX, btnY, '图鉴', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    const button = this.scene.add.zone(btnX, btnY, 70, 70)
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
    const btnX = 60;
    const btnY = 80;

    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(0x1a0a2e, 0.7);
    btnBg.fillCircle(btnX, btnY, 30);
    
    btnBg.lineStyle(2, 0xa8e6cf, 0.5);
    btnBg.strokeCircle(btnX, btnY, 30);

    const btnText = this.scene.add.text(btnX, btnY, isMuted ? '🔇' : '🔊', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    const button = this.scene.add.zone(btnX, btnY, 60, 60)
      .setInteractive({ useHandCursor: true });

    button.on('pointerup', () => {
      const newMuted = AudioManager.getInstance().toggleMute();
      btnText.setText(newMuted ? '🔇' : '🔊');
    });

    this.container.add([btnBg, btnText, button]);
  }

  private createProgressUI(): void {
    if (!this.container) return;

    const barX = 120;
    const barY = 70;
    const barWidth = GAME_WIDTH - 260;
    const barHeight = 20;

    const barBg = this.scene.add.graphics();
    barBg.fillStyle(0x000000, 0.5);
    barBg.fillRoundedRect(barX, barY - barHeight / 2, barWidth, barHeight, 10);
    
    barBg.lineStyle(2, 0xa8e6cf, 0.5);
    barBg.strokeRoundedRect(barX, barY - barHeight / 2, barWidth, barHeight, 10);

    this.progressBar = this.scene.add.graphics();
    
    this.progressText = this.scene.add.text(GAME_WIDTH / 2, barY, '唤醒进度 0%', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    this.container.add([barBg, this.progressBar, this.progressText]);
  }

  private createToast(): void {
    this.toastText = this.scene.add.text(GAME_WIDTH / 2, 150, '', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setDepth(200).setScrollFactor(0).setAlpha(0);
  }

  private setupEventListeners(): void {
    const onCollected = ({ type, count }: GameEvents['petal:collected']) => {
      this.updateUI();
      const config = PETAL_CONFIGS[type];
      this.showToast(`+${count} ${config.name}`);
    };
    EventManager.getInstance().on('petal:collected', onCollected);
    this.uiListeners.push({ event: 'petal:collected', callback: onCollected });

    const onSynthComplete = ({ output }: GameEvents['synthesis:complete']) => {
      this.updateUI();
      const config = PETAL_CONFIGS[output];
      this.showToast(`合成成功！获得 ${config.name}`, 3000);
    };
    EventManager.getInstance().on('synthesis:complete', onSynthComplete);
    this.uiListeners.push({ event: 'synthesis:complete', callback: onSynthComplete });

    const onSynthFail = ({ reason }: GameEvents['synthesis:fail']) => {
      this.showToast(reason, 2000, 0xff6b6b);
    };
    EventManager.getInstance().on('synthesis:fail', onSynthFail);
    this.uiListeners.push({ event: 'synthesis:fail', callback: onSynthFail });

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
      delay: duration - 500,
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

    const title = this.scene.add.text(GAME_WIDTH / 2, 100, '花瓣合成', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.synthesisPanel.add(title);

    const recipes = this.synthesisSystem.getAllRecipes();
    recipes.forEach((recipe, index) => {
      this.createRecipeCard(recipe, 50, 180 + index * 160);
    });

    const closeBtn = this.scene.add.text(GAME_WIDTH - 80, 80, '✕', {
      fontFamily: 'Arial',
      fontSize: '32px',
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
    const cardHeight = 140;
    const canSynth = this.synthesisSystem.canSynthesize(recipe.id);
    const state = SaveManager.getInstance().getGameState();

    const cardBg = this.scene.add.graphics();
    cardBg.fillStyle(canSynth ? 0x1a0a2e : 0x0a0a0a, 0.8);
    cardBg.fillRoundedRect(x, y, cardWidth, cardHeight, 15);
    cardBg.lineStyle(2, canSynth ? 0xa8e6cf : 0x444444, canSynth ? 0.6 : 0.3);
    cardBg.strokeRoundedRect(x, y, cardWidth, cardHeight, 15);
    this.synthesisPanel.add(cardBg);

    let offsetX = x + 30;
    recipe.inputs.forEach((input: any, idx: number) => {
      const config = PETAL_CONFIGS[input.type];
      const hasEnough = (state.petals[input.type] || 0) >= input.count;

      const petalImg = this.scene.add.image(offsetX, y + cardHeight / 2, `petal_${input.type}`)
        .setDisplaySize(50, 50)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(hasEnough ? 1 : 0.4);

      const countText = this.scene.add.text(offsetX, y + cardHeight - 30, 
        `${state.petals[input.type] || 0}/${input.count}`, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: hasEnough ? '#a8e6cf' : '#ff6b6b',
        align: 'center'
      }).setOrigin(0.5);

      this.synthesisPanel.add([petalImg, countText]);

      if (idx < recipe.inputs.length - 1) {
        const plusText = this.scene.add.text(offsetX + 45, y + cardHeight / 2, '+', {
          fontFamily: 'Arial',
          fontSize: '24px',
          color: '#ffffff'
        }).setOrigin(0.5);
        this.synthesisPanel.add(plusText);
      }
      offsetX += 100;
    });

    const arrowText = this.scene.add.text(offsetX + 20, y + cardHeight / 2, '→', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.synthesisPanel.add(arrowText);

    const outputConfig = PETAL_CONFIGS[recipe.output.type];
    const outputImg = this.scene.add.image(offsetX + 80, y + cardHeight / 2, `petal_${recipe.output.type}`)
      .setDisplaySize(60, 60)
      .setBlendMode(Phaser.BlendModes.ADD);
    const outputName = this.scene.add.text(offsetX + 80, y + cardHeight - 30, outputConfig.name, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.synthesisPanel.add([outputImg, outputName]);

    if (canSynth) {
      const btnBg = this.scene.add.graphics();
      btnBg.fillStyle(0xff6b9d, 0.8);
      btnBg.fillRoundedRect(cardWidth - 130, y + 45, 100, 50, 10);

      const btnText = this.scene.add.text(cardWidth - 80, y + 70, '合成', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
        align: 'center'
      }).setOrigin(0.5);

      const btnZone = this.scene.add.zone(cardWidth - 80, y + 70, 100, 50)
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

    const title = this.scene.add.text(GAME_WIDTH / 2, 100, '花瓣图鉴', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.collectionPanel.add(title);

    const state = SaveManager.getInstance().getGameState();
    const allPetals = Object.values(PetalType);
    
    allPetals.forEach((type, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const px = 100 + col * 180;
      const py = 220 + row * 200;

      this.createCollectionItem(type, px, py, state);
    });

    const closeBtn = this.scene.add.text(GAME_WIDTH - 80, 80, '✕', {
      fontFamily: 'Arial',
      fontSize: '32px',
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

  private createCollectionItem(type: PetalType, x: number, y: number, state: GameState): void {
    if (!this.collectionPanel) return;

    const config = PETAL_CONFIGS[type];
    const unlocked = state.unlockedPetals.includes(type);
    const count = state.petals[type] || 0;

    const itemBg = this.scene.add.graphics();
    itemBg.fillStyle(unlocked ? 0x1a0a2e : 0x0a0a0a, 0.8);
    itemBg.fillRoundedRect(x - 70, y - 80, 140, 160, 15);
    itemBg.lineStyle(2, unlocked ? config.color : 0x333333, unlocked ? 0.6 : 0.3);
    itemBg.strokeRoundedRect(x - 70, y - 80, 140, 160, 15);

    const petalImg = this.scene.add.image(x, y - 20, `petal_${type}`)
      .setDisplaySize(70, 70)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(unlocked ? 1 : 0.2);

    const nameText = this.scene.add.text(x, y + 40, unlocked ? config.name : '???', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: unlocked ? '#ffffff' : '#666666',
      align: 'center'
    }).setOrigin(0.5);

    const countText = this.scene.add.text(x, y + 65, `拥有: ${count}`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: unlocked ? '#a8e6cf' : '#444444',
      align: 'center'
    }).setOrigin(0.5);

    this.collectionPanel.add([itemBg, petalImg, nameText, countText]);
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

    const barX = 120;
    const barY = 70;
    const barWidth = GAME_WIDTH - 260;
    const barHeight = 20;

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

    this.progressText.setText(`唤醒进度 ${Math.floor(progress)}%`);
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
