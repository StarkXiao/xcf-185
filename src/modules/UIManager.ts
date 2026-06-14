import Phaser from 'phaser';
import { 
  PetalType, 
  GameState, 
  GameEvents, 
  SynthesisResultData, 
  SynthesisResultType,
  Goal,
  GoalStatus,
  GoalType,
  ResourceTrendPoint,
  SynthesisRecord,
  StatusMessage,
  StatusType,
  QuickEntryType
} from '../types';
import { 
  PETAL_CONFIGS, 
  GAME_WIDTH, 
  GAME_HEIGHT,
  DEFAULT_QUICK_ENTRIES,
  SYNTHESIS_RECIPES
} from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { EventManager } from '../managers/EventManager';
import { SynthesisSystem } from './SynthesisSystem';
import { AudioManager } from '../managers/AudioManager';

type CollectionCategory = 'normal' | 'mutation' | 'failed';
type InfoTabType = 'trend' | 'records' | 'goals' | 'shortcuts';

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

  private infoCenterPanel: Phaser.GameObjects.Container | null = null;
  private currentInfoTab: InfoTabType = 'trend';
  private infoTabButtons: Phaser.GameObjects.Container[] = [];
  private statusContainer: Phaser.GameObjects.Container | null = null;
  private statusMessageItems: Map<string, Phaser.GameObjects.Container> = new Map();
  private miniGoalContainer: Phaser.GameObjects.Container | null = null;
  private miniTrendContainer: Phaser.GameObjects.Container | null = null;

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
      { key: 'pixel_gray', color: 0x888888 },
      { key: 'pixel_green', color: 0x66cc66 },
      { key: 'pixel_red', color: 0xff6666 },
      { key: 'pixel_purple', color: 0xc8a2ff }
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
    this.createInfoCenterButton();
    this.createMiniGoalDisplay();
    this.createMiniTrendDisplay();
    this.createStatusContainer();
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

  private createInfoCenterButton(): void {
    if (!this.container) return;

    const btnX = 55;
    const btnY = 145;

    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(0xc8a2ff, 0.8);
    btnBg.fillCircle(btnX, btnY, 28);
    
    btnBg.lineStyle(2, 0xffffff, 0.5);
    btnBg.strokeCircle(btnX, btnY, 28);

    const btnText = this.scene.add.text(btnX, btnY, '📊', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    const state = SaveManager.getInstance().getGameState();
    const completedGoals = state.goals.filter(g => g.status === GoalStatus.COMPLETED).length;
    
    let badgeText: Phaser.GameObjects.Text | null = null;
    if (completedGoals > 0) {
      badgeText = this.scene.add.text(btnX + 22, btnY - 20, completedGoals.toString(), {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#ffffff',
        align: 'center',
        backgroundColor: '#ff6b9d'
      }).setOrigin(0.5).setPadding(4, 2);
    }

    const button = this.scene.add.zone(btnX, btnY, 56, 56)
      .setInteractive({ useHandCursor: true });

    button.on('pointerdown', () => btnBg.setScale(0.9));
    button.on('pointerup', () => {
      btnBg.setScale(1);
      this.toggleInfoCenterPanel();
      EventManager.getInstance().emit('audio:play', { key: 'sfx_click', volume: 0.3 });
    });
    button.on('pointerout', () => btnBg.setScale(1));

    const items: Phaser.GameObjects.GameObject[] = [btnBg, btnText, button];
    if (badgeText) items.push(badgeText);
    this.container.add(items);
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

  private createMiniGoalDisplay(): void {
    if (!this.container) return;

    this.miniGoalContainer = this.scene.add.container(0, 0).setDepth(101).setScrollFactor(0);
    this.refreshMiniGoalDisplay();
    this.container.add(this.miniGoalContainer);
  }

  private refreshMiniGoalDisplay(): void {
    if (!this.miniGoalContainer || !this.container) return;

    this.miniGoalContainer.removeAll(true);

    const state = SaveManager.getInstance().getGameState();
    const activeGoals = state.goals
      .filter(g => g.status === GoalStatus.IN_PROGRESS || g.status === GoalStatus.PENDING)
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 2);

    if (activeGoals.length === 0) return;

    const startY = 105;
    const panelX = 100;
    const panelWidth = GAME_WIDTH - 230;
    const itemHeight = 28;

    activeGoals.forEach((goal, idx) => {
      const y = startY + idx * itemHeight;
      const progress = Math.min(100, (goal.currentCount / goal.targetCount) * 100);
      
      const itemBg = this.scene.add.graphics();
      itemBg.fillStyle(0x000000, 0.4);
      itemBg.fillRoundedRect(panelX, y - itemHeight / 2, panelWidth, itemHeight - 4, 8);
      this.miniGoalContainer!.add(itemBg);

      const iconText = goal.status === GoalStatus.COMPLETED ? '✅' : '🎯';
      const icon = this.scene.add.text(panelX + 12, y, iconText, {
        fontFamily: 'Arial',
        fontSize: '14px'
      }).setOrigin(0, 0.5);
      this.miniGoalContainer!.add(icon);

      const titleText = this.scene.add.text(panelX + 34, y - 2, goal.title, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#ffffff'
      }).setOrigin(0, 0.5);
      this.miniGoalContainer!.add(titleText);

      const progressBg = this.scene.add.graphics();
      const progressX = panelX + 34;
      const progressY = y + 7;
      const progressW = panelWidth - 44;
      const progressH = 5;
      progressBg.fillStyle(0x222222, 0.8);
      progressBg.fillRoundedRect(progressX, progressY, progressW, progressH, 3);
      progressBg.fillGradientStyle(
        0xa8e6cf, 0xff6b9d,
        0xa8e6cf, 0xff6b9d,
        1, 1, 1, 1
      );
      progressBg.fillRoundedRect(progressX, progressY, progressW * (progress / 100), progressH, 3);
      this.miniGoalContainer!.add(progressBg);

      const countText = this.scene.add.text(panelX + panelWidth - 8, y - 2, 
        `${goal.currentCount}/${goal.targetCount}`, {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#a8e6cf',
        align: 'right'
      }).setOrigin(1, 0.5);
      this.miniGoalContainer!.add(countText);
    });
  }

  private createMiniTrendDisplay(): void {
    if (!this.container) return;

    this.miniTrendContainer = this.scene.add.container(0, 0).setDepth(101).setScrollFactor(0);
    this.refreshMiniTrendDisplay();
    this.container.add(this.miniTrendContainer);
  }

  private refreshMiniTrendDisplay(): void {
    if (!this.miniTrendContainer) return;

    this.miniTrendContainer.removeAll(true);

    const state = SaveManager.getInstance().getGameState();
    const trend = state.resourceTrend.slice(-6);

    if (trend.length < 2) return;

    const x = GAME_WIDTH - 180;
    const y = 120;
    const width = 90;
    const height = 40;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.4);
    bg.fillRoundedRect(x, y, width, height, 6);
    bg.lineStyle(1, 0xa8e6cf, 0.3);
    bg.strokeRoundedRect(x, y, width, height, 6);
    this.miniTrendContainer.add(bg);

    const label = this.scene.add.text(x + width / 2, y + 6, '收集趋势', {
      fontFamily: 'Arial',
      fontSize: '9px',
      color: '#a8e6cf'
    }).setOrigin(0.5);
    this.miniTrendContainer.add(label);

    const chartX = x + 6;
    const chartY = y + 14;
    const chartW = width - 12;
    const chartH = height - 20;

    const maxVal = Math.max(...trend.map(p => p.totalCollected), 1);
    const minVal = Math.min(...trend.map(p => p.totalCollected), 0);
    const range = Math.max(maxVal - minVal, 1);

    bg.lineStyle(2, 0xa8e6cf, 0.8);
    bg.beginPath();
    trend.forEach((point, i) => {
      const px = chartX + (i / (trend.length - 1)) * chartW;
      const py = chartY + chartH - (((point.totalCollected - minVal) / range) * chartH);
      if (i === 0) {
        bg.moveTo(px, py);
      } else {
        bg.lineTo(px, py);
      }
    });
    bg.strokePath();

    trend.forEach((point, i) => {
      const px = chartX + (i / (trend.length - 1)) * chartW;
      const py = chartY + chartH - (((point.totalCollected - minVal) / range) * chartH);
      bg.fillStyle(0xff6b9d, 1);
      bg.fillCircle(px, py, 2);
    });
  }

  private createStatusContainer(): void {
    if (!this.container) return;

    this.statusContainer = this.scene.add.container(0, 0).setDepth(110).setScrollFactor(0);
    this.container.add(this.statusContainer);

    const state = SaveManager.getInstance().getGameState();
    state.activeStatusMessages.forEach(msg => {
      this.addStatusMessageItem(msg);
    });
  }

  private addStatusMessageItem(message: StatusMessage): void {
    if (!this.statusContainer) return;
    if (this.statusMessageItems.has(message.id)) return;

    const itemContainer = this.scene.add.container(0, 0);
    const baseY = 180;
    const itemHeight = 56;
    const idx = this.statusMessageItems.size;
    const y = baseY + idx * (itemHeight + 6);

    const colorMap: Record<StatusType, { bg: number; border: number; text: string }> = {
      [StatusType.INFO]: { bg: 0x1a3a5c, border: 0x4a8acf, text: '#4a8acf' },
      [StatusType.SUCCESS]: { bg: 0x1a4a2e, border: 0x4aa85c, text: '#4aa85c' },
      [StatusType.WARNING]: { bg: 0x4a3a1a, border: 0xcf8a4a, text: '#cf8a4a' },
      [StatusType.ERROR]: { bg: 0x4a1a2e, border: 0xcf4a6a, text: '#cf4a6a' }
    };

    const colors = colorMap[message.type] || colorMap[StatusType.INFO];
    const panelX = 50;
    const panelWidth = GAME_WIDTH - 100;

    const bg = this.scene.add.graphics();
    bg.fillStyle(colors.bg, 0.9);
    bg.fillRoundedRect(panelX, y, panelWidth, itemHeight, 12);
    bg.lineStyle(2, colors.border, 0.8);
    bg.strokeRoundedRect(panelX, y, panelWidth, itemHeight, 12);
    itemContainer.add(bg);

    const iconMap: Record<StatusType, string> = {
      [StatusType.INFO]: 'ℹ️',
      [StatusType.SUCCESS]: '✅',
      [StatusType.WARNING]: '⚠️',
      [StatusType.ERROR]: '❌'
    };

    const icon = this.scene.add.text(panelX + 16, y + itemHeight / 2, iconMap[message.type] || 'ℹ️', {
      fontFamily: 'Arial',
      fontSize: '22px'
    }).setOrigin(0, 0.5);
    itemContainer.add(icon);

    const title = this.scene.add.text(panelX + 50, y + 14, message.title, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    itemContainer.add(title);

    if (message.content) {
      const content = this.scene.add.text(panelX + 50, y + 36, message.content, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: colors.text,
        wordWrap: { width: panelWidth - 70 }
      }).setOrigin(0, 0.5);
      itemContainer.add(content);
    }

    const closeBtn = this.scene.add.text(panelX + panelWidth - 16, y + 14, '✕', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#888888'
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => {
      const state = SaveManager.getInstance().getGameState();
      SaveManager.getInstance().dismissStatusMessage(state, message.id);
    });
    itemContainer.add(closeBtn);

    if (!message.persistent) {
      this.scene.tweens.add({
        targets: itemContainer,
        alpha: 0,
        y: '-=10',
        duration: 400,
        delay: message.duration - 400,
        ease: 'Cubic.In',
        onComplete: () => {
          this.removeStatusMessageItem(message.id);
          const state = SaveManager.getInstance().getGameState();
          const idx2 = state.activeStatusMessages.findIndex(m => m.id === message.id);
          if (idx2 !== -1) {
            state.activeStatusMessages.splice(idx2, 1);
          }
        }
      });
    }

    this.statusContainer.add(itemContainer);
    this.statusMessageItems.set(message.id, itemContainer);
    this.rearrangeStatusMessages();
  }

  private removeStatusMessageItem(id: string): void {
    const item = this.statusMessageItems.get(id);
    if (item) {
      item.destroy();
      this.statusMessageItems.delete(id);
      this.rearrangeStatusMessages();
    }
  }

  private rearrangeStatusMessages(): void {
    if (!this.statusContainer) return;
    const baseY = 180;
    const itemHeight = 56;
    let idx = 0;
    this.statusMessageItems.forEach((item) => {
      const targetY = baseY + idx * (itemHeight + 6);
      this.scene.tweens.add({
        targets: item,
        y: targetY - item.y,
        duration: 250,
        ease: 'Cubic.Out'
      });
      idx++;
    });
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

    const onTrendUpdated = (_data: GameEvents['trend:updated']) => {
      this.refreshMiniTrendDisplay();
    };
    EventManager.getInstance().on('trend:updated', onTrendUpdated);
    this.uiListeners.push({ event: 'trend:updated', callback: onTrendUpdated });

    const onGoalProgress = (_data: GameEvents['goal:progress']) => {
      this.refreshMiniGoalDisplay();
    };
    EventManager.getInstance().on('goal:progress', onGoalProgress);
    this.uiListeners.push({ event: 'goal:progress', callback: onGoalProgress });

    const onGoalCompleted = (_data: GameEvents['goal:completed']) => {
      this.refreshMiniGoalDisplay();
    };
    EventManager.getInstance().on('goal:completed', onGoalCompleted);
    this.uiListeners.push({ event: 'goal:completed', callback: onGoalCompleted });

    const onStatusShow = (data: GameEvents['status:show']) => {
      this.addStatusMessageItem(data.message);
    };
    EventManager.getInstance().on('status:show', onStatusShow);
    this.uiListeners.push({ event: 'status:show', callback: onStatusShow });

    const onStatusDismiss = (data: GameEvents['status:dismiss']) => {
      this.removeStatusMessageItem(data.id);
    };
    EventManager.getInstance().on('status:dismiss', onStatusDismiss);
    this.uiListeners.push({ event: 'goal:progress', callback: onGoalProgress });

    const onSynthesisRecord = (_data: GameEvents['synthesis:record_added']) => {
      if (this.infoCenterPanel && this.currentInfoTab === 'records') {
        this.refreshInfoCenterPanel();
      }
    };
    EventManager.getInstance().on('synthesis:record_added', onSynthesisRecord);
    this.uiListeners.push({ event: 'synthesis:record_added', callback: onSynthesisRecord });
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

      this.synthesisPanel!.add([petalImg, countText]);

      if (idx < recipe.inputs.length - 1) {
        const plusText = this.scene.add.text(offsetX + 38, y + 45, '+', {
          fontFamily: 'Arial',
          fontSize: '20px',
          color: '#ffffff'
        }).setOrigin(0.5);
        this.synthesisPanel!.add(plusText);
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
      color: unlocked ? (config.isMutation ? '#ffaa00' : (config.isFailed ? '#888888' : '#a8e6cf')) : '#444444',
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

  // ===== Info Center Panel =====
  private toggleInfoCenterPanel(): void {
    if (this.infoCenterPanel) {
      this.closeInfoCenterPanel();
    } else {
      this.openInfoCenterPanel();
    }
  }

  private openInfoCenterPanel(): void {
    if (!this.container) return;

    this.infoCenterPanel = this.scene.add.container(0, 0).setDepth(150).setScrollFactor(0);
    
    const panelBg = this.scene.add.graphics();
    panelBg.fillStyle(0x0a0514, 0.97);
    panelBg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.infoCenterPanel.add(panelBg);

    const title = this.scene.add.text(GAME_WIDTH / 2, 75, '信息中心', {
      fontFamily: 'Arial',
      fontSize: '30px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.infoCenterPanel.add(title);

    this.createInfoTabs();
    this.renderInfoContent();

    const closeBtn = this.scene.add.text(GAME_WIDTH - 70, 65, '✕', {
      fontFamily: 'Arial',
      fontSize: '30px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    closeBtn.on('pointerup', () => this.closeInfoCenterPanel());
    this.infoCenterPanel.add(closeBtn);

    this.infoCenterPanel.setAlpha(0);
    this.scene.tweens.add({
      targets: this.infoCenterPanel,
      alpha: 1,
      duration: 300
    });

    this.container.add(this.infoCenterPanel);
  }

  private createInfoTabs(): void {
    if (!this.infoCenterPanel) return;

    const tabs: { key: InfoTabType; label: string; color: number; icon: string }[] = [
      { key: 'trend', label: '资源趋势', color: 0xa8e6cf, icon: '📈' },
      { key: 'records', label: '合成记录', color: 0xff6b9d, icon: '📋' },
      { key: 'goals', label: '目标追踪', color: 0xffd93d, icon: '🎯' },
      { key: 'shortcuts', label: '快捷入口', color: 0xc8a2ff, icon: '⚡' }
    ];

    const tabWidth = 170;
    const tabHeight = 50;
    const startX = (GAME_WIDTH - tabs.length * tabWidth) / 2 + 20;
    const tabY = 120;

    this.infoTabButtons = [];

    tabs.forEach((tab, index) => {
      const tabContainer = this.scene.add.container(0, 0);
      const tabX = startX + index * tabWidth;
      const isActive = this.currentInfoTab === tab.key;

      const tabBg = this.scene.add.graphics();
      tabBg.fillStyle(isActive ? tab.color : 0x1a0a2e, isActive ? 0.9 : 0.5);
      tabBg.fillRoundedRect(tabX, tabY, tabWidth - 10, tabHeight, 12);
      tabBg.lineStyle(2, tab.color, isActive ? 0.9 : 0.4);
      tabBg.strokeRoundedRect(tabX, tabY, tabWidth - 10, tabHeight, 12);

      const iconText = this.scene.add.text(tabX + 20, tabY + tabHeight / 2, tab.icon, {
        fontFamily: 'Arial',
        fontSize: '18px'
      }).setOrigin(0, 0.5);

      const labelText = this.scene.add.text(tabX + (tabWidth - 10) / 2 + 10, tabY + tabHeight / 2, tab.label, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: isActive ? '#ffffff' : `#${tab.color.toString(16).padStart(6, '0')}`,
        align: 'center'
      }).setOrigin(0.5);

      tabContainer.add([tabBg, iconText, labelText]);

      const zone = this.scene.add.zone(tabX + (tabWidth - 10) / 2, tabY + tabHeight / 2, tabWidth - 10, tabHeight)
        .setInteractive({ useHandCursor: true });

      zone.on('pointerup', () => {
        this.currentInfoTab = tab.key;
        EventManager.getInstance().emit('audio:play', { key: 'sfx_click', volume: 0.3 });
        this.refreshInfoCenterPanel();
      });

      tabContainer.add(zone);
      this.infoCenterPanel!.add(tabContainer);
      this.infoTabButtons.push(tabContainer);
    });
  }

  private refreshInfoCenterPanel(): void {
    if (!this.infoCenterPanel) return;

    this.infoTabButtons.forEach(btn => btn.destroy());
    this.infoTabButtons = [];

    const itemsToRemove: Phaser.GameObjects.GameObject[] = [];
    this.infoCenterPanel.iterate((child) => {
      if ((child as any)._isInfoContent) {
        itemsToRemove.push(child);
      }
    });
    itemsToRemove.forEach(item => {
      this.infoCenterPanel!.remove(item);
      item.destroy();
    });

    this.createInfoTabs();
    this.renderInfoContent();
  }

  private renderInfoContent(): void {
    switch (this.currentInfoTab) {
      case 'trend':
        this.renderTrendContent();
        break;
      case 'records':
        this.renderRecordsContent();
        break;
      case 'goals':
        this.renderGoalsContent();
        break;
      case 'shortcuts':
        this.renderShortcutsContent();
        break;
    }
  }

  private markAsInfoContent(obj: Phaser.GameObjects.GameObject): void {
    (obj as any)._isInfoContent = true;
  }

  private renderTrendContent(): void {
    if (!this.infoCenterPanel) return;
    const contentContainer = this.scene.add.container(0, 0);
    this.markAsInfoContent(contentContainer);
    this.infoCenterPanel.add(contentContainer);

    const state = SaveManager.getInstance().getGameState();
    const trend = state.resourceTrend;

    const contentY = 200;
    const contentH = GAME_HEIGHT - 280;
    const contentX = 50;
    const contentW = GAME_WIDTH - 100;

    const summary = this.scene.add.graphics();
    this.markAsInfoContent(summary);
    contentContainer.add(summary);

    const statCards = [
      { label: '总收集', value: state.totalCollected, color: 0xa8e6cf, icon: '🌸' },
      { label: '总合成', value: state.totalSynthesized, color: 0xff6b9d, icon: '⚗️' },
      { label: '总变异', value: state.totalMutations, color: 0xffaa00, icon: '✨' },
      { label: '总失败', value: state.totalFailures, color: 0x888888, icon: '💨' }
    ];

    statCards.forEach((stat, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cx = contentX + col * (contentW / 2 + 10);
      const cy = contentY + row * 85;
      const cardW = contentW / 2 - 15;
      const cardH = 75;

      summary.fillStyle(0x1a0a2e, 0.8);
      summary.fillRoundedRect(cx, cy, cardW, cardH, 12);
      summary.lineStyle(2, stat.color, 0.5);
      summary.strokeRoundedRect(cx, cy, cardW, cardH, 12);

      const icon = this.scene.add.text(cx + 20, cy + 40, stat.icon, {
        fontFamily: 'Arial',
        fontSize: '28px'
      }).setOrigin(0, 0.5);
      this.markAsInfoContent(icon);
      contentContainer.add(icon);

      const value = this.scene.add.text(cx + cardW - 20, cy + 28, stat.value.toString(), {
        fontFamily: 'Arial',
        fontSize: '28px',
        color: `#${stat.color.toString(16).padStart(6, '0')}`,
        align: 'right',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5);
      this.markAsInfoContent(value);
      contentContainer.add(value);

      const label = this.scene.add.text(cx + cardW - 20, cy + 55, stat.label, {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#aaaaaa',
        align: 'right'
      }).setOrigin(1, 0.5);
      this.markAsInfoContent(label);
      contentContainer.add(label);
    });

    const chartTitle = this.scene.add.text(GAME_WIDTH / 2, contentY + 190, '收集 & 合成 趋势图', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);
    this.markAsInfoContent(chartTitle);
    contentContainer.add(chartTitle);

    if (trend.length >= 2) {
      const chartX = contentX + 20;
      const chartY = contentY + 225;
      const chartW = contentW - 40;
      const chartH = 220;

      summary.fillStyle(0x0a0514, 0.8);
      summary.fillRoundedRect(chartX - 10, chartY - 10, chartW + 20, chartH + 20, 12);
      summary.lineStyle(1, 0x444444, 0.5);
      summary.strokeRoundedRect(chartX - 10, chartY - 10, chartW + 20, chartH + 20, 12);

      const displayTrend = trend.slice(-12);
      const maxCollected = Math.max(...displayTrend.map(p => p.totalCollected), 1);
      const maxSynthesized = Math.max(...displayTrend.map(p => p.totalSynthesized), 1);
      const maxVal = Math.max(maxCollected, maxSynthesized, 1);
      const minCollected = Math.min(...displayTrend.map(p => p.totalCollected), 0);

      summary.lineStyle(1, 0x333333, 0.8);
      for (let i = 0; i <= 4; i++) {
        const ly = chartY + (chartH / 4) * i;
        summary.moveTo(chartX, ly);
        summary.lineTo(chartX + chartW, ly);
      }
      summary.strokePath();

      summary.lineStyle(3, 0xa8e6cf, 0.9);
      summary.beginPath();
      displayTrend.forEach((point, i) => {
        const px = chartX + (i / (displayTrend.length - 1)) * chartW;
        const normalized = (point.totalCollected - minCollected) / Math.max(maxVal - minCollected + 1, 1);
        const py = chartY + chartH - normalized * chartH;
        if (i === 0) summary.moveTo(px, py);
        else summary.lineTo(px, py);
      });
      summary.strokePath();

      displayTrend.forEach((point, i) => {
        const px = chartX + (i / (displayTrend.length - 1)) * chartW;
        const normalized = (point.totalCollected - minCollected) / Math.max(maxVal - minCollected + 1, 1);
        const py = chartY + chartH - normalized * chartH;
        summary.fillStyle(0xa8e6cf, 1);
        summary.fillCircle(px, py, 4);
      });

      summary.lineStyle(3, 0xff6b9d, 0.9);
      summary.beginPath();
      displayTrend.forEach((point, i) => {
        const px = chartX + (i / (displayTrend.length - 1)) * chartW;
        const normalized = point.totalSynthesized / Math.max(maxVal, 1);
        const py = chartY + chartH - normalized * chartH;
        if (i === 0) summary.moveTo(px, py);
        else summary.lineTo(px, py);
      });
      summary.strokePath();

      displayTrend.forEach((point, i) => {
        const px = chartX + (i / (displayTrend.length - 1)) * chartW;
        const normalized = point.totalSynthesized / Math.max(maxVal, 1);
        const py = chartY + chartH - normalized * chartH;
        summary.fillStyle(0xff6b9d, 1);
        summary.fillCircle(px, py, 4);
      });

      const legendY = chartY + chartH + 30;
      summary.fillStyle(0xa8e6cf, 1);
      summary.fillCircle(chartX + 20, legendY, 6);
      const leg1 = this.scene.add.text(chartX + 35, legendY, '总收集', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#a8e6cf'
      }).setOrigin(0, 0.5);
      this.markAsInfoContent(leg1);
      contentContainer.add(leg1);

      summary.fillStyle(0xff6b9d, 1);
      summary.fillCircle(chartX + 120, legendY, 6);
      const leg2 = this.scene.add.text(chartX + 135, legendY, '总合成', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#ff6b9d'
      }).setOrigin(0, 0.5);
      this.markAsInfoContent(leg2);
      contentContainer.add(leg2);
    } else {
      const noData = this.scene.add.text(GAME_WIDTH / 2, contentY + 320, 
        '暂无趋势数据，继续探索积累数据后可查看', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#666666',
        align: 'center'
      }).setOrigin(0.5);
      this.markAsInfoContent(noData);
      contentContainer.add(noData);
    }

    const playTimeY = contentY + 480;
    const playTimeMin = Math.floor(state.playTime / 60);
    const playTimeSec = state.playTime % 60;
    const timeText = this.scene.add.text(GAME_WIDTH / 2, playTimeY,
      `游戏时长: ${playTimeMin}分${playTimeSec}秒`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#a8e6cf',
      align: 'center'
    }).setOrigin(0.5);
    this.markAsInfoContent(timeText);
    contentContainer.add(timeText);

    const lastSave = state.lastSaveTime;
    let saveText = '尚未保存';
    if (lastSave > 0) {
      const diff = Math.floor((Date.now() - lastSave) / 1000);
      if (diff < 60) saveText = `${diff}秒前自动保存`;
      else saveText = `${Math.floor(diff / 60)}分钟前自动保存`;
    }
    const lastSaveText = this.scene.add.text(GAME_WIDTH / 2, playTimeY + 28, saveText, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#666666',
      align: 'center'
    }).setOrigin(0.5);
    this.markAsInfoContent(lastSaveText);
    contentContainer.add(lastSaveText);
  }

  private renderRecordsContent(): void {
    if (!this.infoCenterPanel) return;
    const contentContainer = this.scene.add.container(0, 0);
    this.markAsInfoContent(contentContainer);
    this.infoCenterPanel.add(contentContainer);

    const state = SaveManager.getInstance().getGameState();
    const records = state.synthesisRecords;

    const contentY = 200;
    const contentX = 50;
    const contentW = GAME_WIDTH - 100;

    const summary = this.scene.add.graphics();
    this.markAsInfoContent(summary);
    contentContainer.add(summary);

    const successCount = records.filter(r => r.resultType === SynthesisResultType.NORMAL).length;
    const mutationCount = records.filter(r => r.resultType === SynthesisResultType.MUTATION).length;
    const failCount = records.filter(r => r.resultType === SynthesisResultType.FAIL).length;
    const total = Math.max(records.length, 1);

    const statsRow = [
      { label: '成功', value: successCount, color: 0xa8e6cf, pct: Math.round(successCount / total * 100) },
      { label: '变异', value: mutationCount, color: 0xffaa00, pct: Math.round(mutationCount / total * 100) },
      { label: '失败', value: failCount, color: 0x888888, pct: Math.round(failCount / total * 100) }
    ];

    statsRow.forEach((s, idx) => {
      const cx = contentX + idx * (contentW / 3 + 5);
      const cy = contentY;
      const cw = contentW / 3 - 10;

      summary.fillStyle(0x1a0a2e, 0.8);
      summary.fillRoundedRect(cx, cy, cw, 60, 10);
      summary.lineStyle(2, s.color, 0.5);
      summary.strokeRoundedRect(cx, cy, cw, 60, 10);

      const v = this.scene.add.text(cx + cw / 2, cy + 22, 
        `${s.value}次`, {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: `#${s.color.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold',
        align: 'center'
      }).setOrigin(0.5);
      this.markAsInfoContent(v);
      contentContainer.add(v);

      const l = this.scene.add.text(cx + cw / 2, cy + 44, 
        `${s.label} ${s.pct}%`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#aaaaaa',
        align: 'center'
      }).setOrigin(0.5);
      this.markAsInfoContent(l);
      contentContainer.add(l);
    });

    if (records.length === 0) {
      const noData = this.scene.add.text(GAME_WIDTH / 2, contentY + 180, 
        '暂无合成记录，快去合成花瓣吧！', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#666666',
        align: 'center'
      }).setOrigin(0.5);
      this.markAsInfoContent(noData);
      contentContainer.add(noData);
      return;
    }

    const listY = contentY + 90;
    const itemH = 95;
    const listHeight = GAME_HEIGHT - listY - 100;
    const maxItems = Math.floor(listHeight / itemH);
    const displayRecords = records.slice(0, maxItems);

    displayRecords.forEach((record, idx) => {
      const ry = listY + idx * itemH;
      const resultColors: Record<SynthesisResultType, { border: number; bg: number; label: string; labelColor: number }> = {
        [SynthesisResultType.NORMAL]: { border: 0xa8e6cf, bg: 0x0d2818, label: '成功', labelColor: 0xa8e6cf },
        [SynthesisResultType.MUTATION]: { border: 0xffaa00, bg: 0x2a1a05, label: '变异', labelColor: 0xffaa00 },
        [SynthesisResultType.FAIL]: { border: 0x666666, bg: 0x151515, label: '失败', labelColor: 0x888888 }
      };
      const rc = resultColors[record.resultType];

      summary.fillStyle(rc.bg, 0.9);
      summary.fillRoundedRect(contentX, ry, contentW, itemH - 6, 10);
      summary.lineStyle(2, rc.border, 0.6);
      summary.strokeRoundedRect(contentX, ry, contentW, itemH - 6, 10);

      const time = new Date(record.timestamp);
      const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}`;
      const timeLabel = this.scene.add.text(contentX + 14, ry + 16, timeStr, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#666666'
      }).setOrigin(0, 0.5);
      this.markAsInfoContent(timeLabel);
      contentContainer.add(timeLabel);

      const resultLabel = this.scene.add.text(contentX + contentW - 14, ry + 16, rc.label, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: `#${rc.labelColor.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold',
        align: 'right'
      }).setOrigin(1, 0.5);
      this.markAsInfoContent(resultLabel);
      contentContainer.add(resultLabel);

      let iconX = contentX + 30;
      record.inputs.forEach((inp, inpIdx) => {
        const conf = PETAL_CONFIGS[inp.type];
        const img = this.scene.add.image(iconX, ry + 55, `petal_${inp.type}`)
          .setDisplaySize(28, 28)
          .setBlendMode(conf.isFailed ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD)
          .setAlpha(0.7);
        this.markAsInfoContent(img);
        contentContainer.add(img);

        const cnt = this.scene.add.text(iconX, ry + 78, `×${inp.count}`, {
          fontFamily: 'Arial',
          fontSize: '10px',
          color: '#aaaaaa',
          align: 'center'
        }).setOrigin(0.5);
        this.markAsInfoContent(cnt);
        contentContainer.add(cnt);

        if (inpIdx < record.inputs.length - 1) {
          const plus = this.scene.add.text(iconX + 24, ry + 55, '+', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#666666'
          }).setOrigin(0.5);
          this.markAsInfoContent(plus);
          contentContainer.add(plus);
        }
        iconX += 58;
      });

      const arrow = this.scene.add.text(iconX + 10, ry + 55, '→', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#ffffff'
      }).setOrigin(0.5);
      this.markAsInfoContent(arrow);
      contentContainer.add(arrow);

      const outConf = PETAL_CONFIGS[record.output.type];
      const outX = iconX + 48;
      const outImg = this.scene.add.image(outX, ry + 55, `petal_${record.output.type}`)
        .setDisplaySize(36, 36)
        .setBlendMode(outConf.isFailed ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
      this.markAsInfoContent(outImg);
      contentContainer.add(outImg);

      const outName = this.scene.add.text(outX, ry + 82, 
        `${outConf.name}×${record.output.count}`, {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: `#${rc.labelColor.toString(16).padStart(6, '0')}`,
        align: 'center'
      }).setOrigin(0.5);
      this.markAsInfoContent(outName);
      contentContainer.add(outName);
    });

    if (records.length > maxItems) {
      const moreHint = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 60,
        `仅显示最近${maxItems}条，共${records.length}条记录`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#666666',
        align: 'center'
      }).setOrigin(0.5);
      this.markAsInfoContent(moreHint);
      contentContainer.add(moreHint);
    }
  }

  private renderGoalsContent(): void {
    if (!this.infoCenterPanel) return;
    const contentContainer = this.scene.add.container(0, 0);
    this.markAsInfoContent(contentContainer);
    this.infoCenterPanel.add(contentContainer);

    const state = SaveManager.getInstance().getGameState();
    const allGoals = [...state.goals].sort((a, b) => a.priority - b.priority);

    const contentY = 200;
    const contentX = 50;
    const contentW = GAME_WIDTH - 100;

    const gfx = this.scene.add.graphics();
    this.markAsInfoContent(gfx);
    contentContainer.add(gfx);

    const completedCount = allGoals.filter(g => 
      g.status === GoalStatus.COMPLETED || g.status === GoalStatus.CLAIMED
    ).length;
    const pct = Math.round((completedCount / allGoals.length) * 100);

    const titleStats = this.scene.add.text(GAME_WIDTH / 2, contentY - 5,
      `已完成 ${completedCount}/${allGoals.length} (${pct}%)`, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#a8e6cf',
      align: 'center'
    }).setOrigin(0.5);
    this.markAsInfoContent(titleStats);
    contentContainer.add(titleStats);

    const progressBg = this.scene.add.graphics();
    this.markAsInfoContent(progressBg);
    contentContainer.add(progressBg);
    const pbX = contentX + 30;
    const pbY = contentY + 20;
    const pbW = contentW - 60;
    const pbH = 10;
    progressBg.fillStyle(0x222222, 0.8);
    progressBg.fillRoundedRect(pbX, pbY, pbW, pbH, 6);
    progressBg.fillGradientStyle(
      0xa8e6cf, 0xff6b9d,
      0xa8e6cf, 0xff6b9d,
      1, 1, 1, 1
    );
    progressBg.fillRoundedRect(pbX, pbY, pbW * (pct / 100), pbH, 6);

    const listStartY = contentY + 50;
    const itemH = 105;
    const listHeight = GAME_HEIGHT - listStartY - 80;
    const maxItems = Math.floor(listHeight / itemH);
    const displayGoals = allGoals.slice(0, Math.min(maxItems * 2, allGoals.length));

    displayGoals.forEach((goal, idx) => {
      const gy = listStartY + idx * itemH;
      const progress = Math.min(100, (goal.currentCount / goal.targetCount) * 100);
      const statusColors: Record<GoalStatus, { border: number; bg: number; icon: string }> = {
        [GoalStatus.PENDING]: { border: 0x555555, bg: 0x101010, icon: '⏳' },
        [GoalStatus.IN_PROGRESS]: { border: 0xa8e6cf, bg: 0x0d2818, icon: '🎯' },
        [GoalStatus.COMPLETED]: { border: 0xffd93d, bg: 0x2a2405, icon: '🎉' },
        [GoalStatus.CLAIMED]: { border: 0x666666, bg: 0x151515, icon: '✅' }
      };
      const sc = statusColors[goal.status];

      gfx.fillStyle(sc.bg, 0.9);
      gfx.fillRoundedRect(contentX, gy, contentW, itemH - 8, 12);
      gfx.lineStyle(2, sc.border, goal.status === GoalStatus.COMPLETED ? 0.9 : 0.5);
      gfx.strokeRoundedRect(contentX, gy, contentW, itemH - 8, 12);

      const icon = this.scene.add.text(contentX + 20, gy + 32, sc.icon, {
        fontFamily: 'Arial',
        fontSize: '24px'
      }).setOrigin(0, 0.5);
      this.markAsInfoContent(icon);
      contentContainer.add(icon);

      const title = this.scene.add.text(contentX + 58, gy + 22, goal.title, {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: goal.status === GoalStatus.CLAIMED ? '#666666' : '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      this.markAsInfoContent(title);
      contentContainer.add(title);

      const desc = this.scene.add.text(contentX + 58, gy + 44, goal.description, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#888888',
        wordWrap: { width: contentW - 80 }
      }).setOrigin(0, 0.5);
      this.markAsInfoContent(desc);
      contentContainer.add(desc);

      const pgbX = contentX + 58;
      const pgbY = gy + 62;
      const pgbW = contentW - 78;
      const pgbH = 7;
      gfx.fillStyle(0x222222, 0.8);
      gfx.fillRoundedRect(pgbX, pgbY, pgbW, pgbH, 4);
      const fillColor = goal.status === GoalStatus.COMPLETED ? 0xffd93d : 
                        goal.status === GoalStatus.CLAIMED ? 0x666666 : 0xa8e6cf;
      gfx.fillStyle(fillColor, 1);
      gfx.fillRoundedRect(pgbX, pgbY, pgbW * (progress / 100), pgbH, 4);

      const countLabel = this.scene.add.text(pgbX, gy + 82,
        `${goal.currentCount}/${goal.targetCount}`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: `#${fillColor.toString(16).padStart(6, '0')}`
      }).setOrigin(0, 0.5);
      this.markAsInfoContent(countLabel);
      contentContainer.add(countLabel);

      const pctLabel = this.scene.add.text(pgbX + pgbW, gy + 82,
        `${Math.floor(progress)}%`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#888888',
        align: 'right'
      }).setOrigin(1, 0.5);
      this.markAsInfoContent(pctLabel);
      contentContainer.add(pctLabel);

      if (goal.status === GoalStatus.COMPLETED) {
        const btnBg = this.scene.add.graphics();
        const btnW = 70;
        const btnH = 28;
        const btnX = contentX + contentW - btnW - 14;
        const btnY = gy + 18;
        btnBg.fillStyle(0xffd93d, 0.9);
        btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 8);
        this.markAsInfoContent(btnBg);
        contentContainer.add(btnBg);

        const btnLabel = this.scene.add.text(btnX + btnW / 2, btnY + btnH / 2, '领取', {
          fontFamily: 'Arial',
          fontSize: '13px',
          color: '#1a0a2e',
          align: 'center',
          fontStyle: 'bold'
        }).setOrigin(0.5);
        this.markAsInfoContent(btnLabel);
        contentContainer.add(btnLabel);

        const zone = this.scene.add.zone(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH)
          .setInteractive({ useHandCursor: true });
        this.markAsInfoContent(zone);
        contentContainer.add(zone);
        zone.on('pointerup', () => {
          SaveManager.getInstance().claimGoal(goal.id);
          EventManager.getInstance().emit('audio:play', { key: 'sfx_click', volume: 0.3 });
          this.refreshInfoCenterPanel();
          this.showToast('✨ 已确认完成！', 2000, 0xffd93d);
        });
      }
    });

    if (allGoals.length > displayGoals.length) {
      const moreHint = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 50,
        `显示前${displayGoals.length}个目标，共${allGoals.length}个`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#666666',
        align: 'center'
      }).setOrigin(0.5);
      this.markAsInfoContent(moreHint);
      contentContainer.add(moreHint);
    }
  }

  private renderShortcutsContent(): void {
    if (!this.infoCenterPanel) return;
    const contentContainer = this.scene.add.container(0, 0);
    this.markAsInfoContent(contentContainer);
    this.infoCenterPanel.add(contentContainer);

    const state = SaveManager.getInstance().getGameState();
    const contentY = 200;
    const contentX = 50;
    const contentW = GAME_WIDTH - 100;

    const gfx = this.scene.add.graphics();
    this.markAsInfoContent(gfx);
    contentContainer.add(gfx);

    const sectionTitle1 = this.scene.add.text(GAME_WIDTH / 2, contentY,
      '✨ 常用功能', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      align: 'center',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.markAsInfoContent(sectionTitle1);
    contentContainer.add(sectionTitle1);

    const shortcuts = DEFAULT_QUICK_ENTRIES;
    const shortcutGridY = contentY + 40;
    const shortcutW = (contentW - 30) / 2;
    const shortcutH = 95;

    shortcuts.forEach((entry, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const sx = contentX + col * (shortcutW + 30);
      const sy = shortcutGridY + row * (shortcutH + 20);

      gfx.fillStyle(0x1a0a2e, 0.9);
      gfx.fillRoundedRect(sx, sy, shortcutW, shortcutH, 16);
      gfx.lineStyle(2, entry.color, 0.6);
      gfx.strokeRoundedRect(sx, sy, shortcutW, shortcutH, 16);

      const glowTexKey = `shortcut_glow_${entry.color}`;
      if (!this.scene.textures.exists(glowTexKey)) {
        const glowCanvas = this.scene.textures.createCanvas(glowTexKey, 100, 100);
        const glowCtx = glowCanvas.getContext();
        const r = (entry.color >> 16) & 255;
        const g = (entry.color >> 8) & 255;
        const b = entry.color & 255;
        const grad = glowCtx.createRadialGradient(50, 50, 0, 50, 50, 50);
        grad.addColorStop(0, `rgba(${r},${g},${b},0.4)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        glowCtx.fillStyle = grad;
        glowCtx.fillRect(0, 0, 100, 100);
        glowCanvas.refresh();
      }
      const glowImg = this.scene.add.image(sx + 40, sy + shortcutH / 2, glowTexKey);
      this.markAsInfoContent(glowImg);
      contentContainer.add(glowImg);

      const icon = this.scene.add.text(sx + 40, sy + shortcutH / 2, entry.icon, {
        fontFamily: 'Arial',
        fontSize: '32px'
      }).setOrigin(0.5);
      this.markAsInfoContent(icon);
      contentContainer.add(icon);

      const label = this.scene.add.text(sx + shortcutW - 20, sy + 35, entry.label, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: `#${entry.color.toString(16).padStart(6, '0')}`,
        align: 'right',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5);
      this.markAsInfoContent(label);
      contentContainer.add(label);

      let subLabel = '';
      switch (entry.id) {
        case QuickEntryType.SYNTHESIS:
          const canSynth = this.synthesisSystem.getAvailableRecipes().length;
          subLabel = canSynth > 0 ? `有${canSynth}个可合成` : '暂无可用配方';
          break;
        case QuickEntryType.COLLECTION:
          const total = Object.values(PetalType).length;
          subLabel = `已解锁 ${state.unlockedPetals.length}/${total}`;
          break;
        case QuickEntryType.GOAL:
          const completed = state.goals.filter(g => 
            g.status === GoalStatus.COMPLETED || g.status === GoalStatus.CLAIMED
          ).length;
          subLabel = `完成 ${completed}/${state.goals.length}`;
          break;
        case QuickEntryType.RECIPE_HINT:
          subLabel = '推荐最佳配方';
          break;
      }

      const sub = this.scene.add.text(sx + shortcutW - 20, sy + 62, subLabel, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#888888',
        align: 'right'
      }).setOrigin(1, 0.5);
      this.markAsInfoContent(sub);
      contentContainer.add(sub);

      const zone = this.scene.add.zone(sx + shortcutW / 2, sy + shortcutH / 2, shortcutW, shortcutH)
        .setInteractive({ useHandCursor: true });
      this.markAsInfoContent(zone);
      contentContainer.add(zone);
      zone.on('pointerup', () => {
        EventManager.getInstance().emit('audio:play', { key: 'sfx_click', volume: 0.3 });
        EventManager.getInstance().emit('quickentry:action', { type: entry.id });
        this.handleQuickEntry(entry.id);
      });
    });

    const sectionTitle2 = this.scene.add.text(GAME_WIDTH / 2, shortcutGridY + 250,
      '💡 推荐合成', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      align: 'center',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.markAsInfoContent(sectionTitle2);
    contentContainer.add(sectionTitle2);

    const available = this.synthesisSystem.getAvailableRecipes();
    const recY = shortcutGridY + 290;
    if (available.length > 0) {
      const recipe = available[0];
      const rcw = contentW;
      const rch = 90;
      gfx.fillStyle(0x1a0a2e, 0.9);
      gfx.fillRoundedRect(contentX, recY, rcw, rch, 14);
      gfx.lineStyle(2, 0xc8a2ff, 0.7);
      gfx.strokeRoundedRect(contentX, recY, rcw, rch, 14);

      const hintLabel = this.scene.add.text(contentX + 18, recY + 20, '⭐ 当前推荐', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#ffd93d',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      this.markAsInfoContent(hintLabel);
      contentContainer.add(hintLabel);

      let rx = contentX + 25;
      recipe.inputs.forEach((inp, inpIdx) => {
        const conf = PETAL_CONFIGS[inp.type];
        const img = this.scene.add.image(rx, recY + 58, `petal_${inp.type}`)
          .setDisplaySize(32, 32)
          .setBlendMode(Phaser.BlendModes.ADD);
        this.markAsInfoContent(img);
        contentContainer.add(img);

        const cnt = this.scene.add.text(rx, recY + 82, `${state.petals[inp.type] || 0}/${inp.count}`, {
          fontFamily: 'Arial',
          fontSize: '10px',
          color: '#a8e6cf',
          align: 'center'
        }).setOrigin(0.5);
        this.markAsInfoContent(cnt);
        contentContainer.add(cnt);

        if (inpIdx < recipe.inputs.length - 1) {
          const p = this.scene.add.text(rx + 28, recY + 58, '+', {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#888888'
          }).setOrigin(0.5);
          this.markAsInfoContent(p);
          contentContainer.add(p);
        }
        rx += 64;
      });

      const arrow = this.scene.add.text(rx + 12, recY + 58, '→', {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#ffffff'
      }).setOrigin(0.5);
      this.markAsInfoContent(arrow);
      contentContainer.add(arrow);

      const outConf = PETAL_CONFIGS[recipe.output.type];
      const outX = rx + 46;
      const outImg = this.scene.add.image(outX, recY + 55, `petal_${recipe.output.type}`)
        .setDisplaySize(40, 40)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.markAsInfoContent(outImg);
      contentContainer.add(outImg);

      const outName = this.scene.add.text(outX, recY + 84, outConf.name, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#a8e6cf',
        align: 'center'
      }).setOrigin(0.5);
      this.markAsInfoContent(outName);
      contentContainer.add(outName);

      const btnBg = this.scene.add.graphics();
      const btnW = 70;
      const btnH = 34;
      const btnX = contentX + rcw - btnW - 16;
      const btnY = recY + 28;
      btnBg.fillStyle(0xff6b9d, 0.9);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
      this.markAsInfoContent(btnBg);
      contentContainer.add(btnBg);

      const btnLabel = this.scene.add.text(btnX + btnW / 2, btnY + btnH / 2, '去合成', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ffffff',
        align: 'center',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.markAsInfoContent(btnLabel);
      contentContainer.add(btnLabel);

      const zone = this.scene.add.zone(btnX + btnW / 2, btnY + btnH / 2, btnW, btnH)
        .setInteractive({ useHandCursor: true });
      this.markAsInfoContent(zone);
      contentContainer.add(zone);
      zone.on('pointerup', () => {
        this.closeInfoCenterPanel();
        this.openSynthesisPanel();
      });
    } else {
      const hintY = recY + 40;
      const unlocked = state.unlockedRecipes.length;
      const allCount = SYNTHESIS_RECIPES.length;
      const noHint = this.scene.add.text(GAME_WIDTH / 2, hintY, 
        `已解锁 ${unlocked}/${allCount} 个配方，继续收集花瓣解锁更多！`, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#888888',
        align: 'center',
        wordWrap: { width: contentW - 40 }
      }).setOrigin(0.5);
      this.markAsInfoContent(noHint);
      contentContainer.add(noHint);

      const tip1 = this.scene.add.text(GAME_WIDTH / 2, hintY + 50,
        '💡 提示：收集到特定花瓣会自动解锁新配方', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#666666',
        align: 'center'
      }).setOrigin(0.5);
      this.markAsInfoContent(tip1);
      contentContainer.add(tip1);
    }

    const sectionTitle3 = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 110,
      '🔧 系统设置', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      align: 'center',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.markAsInfoContent(sectionTitle3);
    contentContainer.add(sectionTitle3);

    const settY = GAME_HEIGHT - 85;
    const settW = (contentW - 20) / 2;
    const settH = 55;

    [
      { label: '重新开始游戏', color: 0xff6b6b, icon: '🔄', action: 'reset' },
      { label: '返回主菜单', color: 0x666666, icon: '🏠', action: 'menu' }
    ].forEach((s, idx) => {
      const sx = contentX + idx * (settW + 20);
      gfx.fillStyle(0x1a0a2e, 0.9);
      gfx.fillRoundedRect(sx, settY, settW, settH, 12);
      gfx.lineStyle(2, s.color, 0.5);
      gfx.strokeRoundedRect(sx, settY, settW, settH, 12);

      const si = this.scene.add.text(sx + 22, settY + settH / 2, s.icon, {
        fontFamily: 'Arial',
        fontSize: '22px'
      }).setOrigin(0, 0.5);
      this.markAsInfoContent(si);
      contentContainer.add(si);

      const sl = this.scene.add.text(sx + settW - 18, settY + settH / 2, s.label, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: `#${s.color.toString(16).padStart(6, '0')}`,
        align: 'right'
      }).setOrigin(1, 0.5);
      this.markAsInfoContent(sl);
      contentContainer.add(sl);

      const zone = this.scene.add.zone(sx + settW / 2, settY + settH / 2, settW, settH)
        .setInteractive({ useHandCursor: true });
      this.markAsInfoContent(zone);
      contentContainer.add(zone);
      zone.on('pointerup', () => {
        EventManager.getInstance().emit('audio:play', { key: 'sfx_click', volume: 0.3 });
        if (s.action === 'reset') {
          if (confirm('确定要重新开始游戏吗？所有进度将丢失！')) {
            SaveManager.getInstance().resetGame();
            this.scene.scene.restart();
          }
        } else if (s.action === 'menu') {
          this.scene.scene.start('Menu');
        }
      });
    });
  }

  private handleQuickEntry(type: QuickEntryType): void {
    switch (type) {
      case QuickEntryType.SYNTHESIS:
        this.closeInfoCenterPanel();
        this.openSynthesisPanel();
        break;
      case QuickEntryType.COLLECTION:
        this.closeInfoCenterPanel();
        this.openCollectionPanel();
        break;
      case QuickEntryType.GOAL:
        this.currentInfoTab = 'goals';
        this.refreshInfoCenterPanel();
        break;
      case QuickEntryType.RECIPE_HINT:
        this.currentInfoTab = 'shortcuts';
        this.refreshInfoCenterPanel();
        break;
      case QuickEntryType.AUTO_SAVE:
        SaveManager.getInstance().addTrendPoint();
        this.showToast('已手动保存快照', 2000, 0xa8e6cf);
        break;
    }
  }

  private closeInfoCenterPanel(): void {
    if (!this.infoCenterPanel || !this.container) return;

    this.scene.tweens.add({
      targets: this.infoCenterPanel,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        if (this.infoCenterPanel) {
          this.container!.remove(this.infoCenterPanel);
          this.infoCenterPanel.destroy();
          this.infoCenterPanel = null;
          this.infoTabButtons = [];
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
    this.refreshMiniGoalDisplay();
    this.refreshMiniTrendDisplay();
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