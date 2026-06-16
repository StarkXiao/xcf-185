import Phaser from 'phaser';
import { 
  GAME_WIDTH, 
  GAME_HEIGHT, 
  SAVE_VERSION,
  ACHIEVEMENT_CONFIGS,
  GALLERY_ITEMS,
  GALLERY_CATEGORY_CONFIG
} from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { EventManager } from '../managers/EventManager';
import { 
  SaveBackupInfo, 
  SaveValidationResult, 
  AudioContextType, 
  CollectionTask, 
  CollectionTaskChain, 
  CollectionTaskStatus,
  RedDotState,
  AchievementCategory,
  AchievementRarity,
  AchievementConfig,
  AchievementState,
  GalleryCategory,
  GalleryItem
} from '../types';

export class MenuScene extends Phaser.Scene {
  private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private titleGlow: Phaser.GameObjects.Text | null = null;
  private savePanel: Phaser.GameObjects.Container | null = null;
  private backupListContainer: Phaser.GameObjects.Container | null = null;
  private audioPanel: Phaser.GameObjects.Container | null = null;
  private dailyRewardPanel: Phaser.GameObjects.Container | null = null;
  private goalsPanel: Phaser.GameObjects.Container | null = null;
  private progressPanel: Phaser.GameObjects.Container | null = null;
  private commissionPanel: Phaser.GameObjects.Container | null = null;
  private commissionListContainer: Phaser.GameObjects.Container | null = null;
  private commissionBtn: Phaser.GameObjects.Text | null = null;
  private commissionRedDot: Phaser.GameObjects.Graphics | null = null;
  private achievementPanel: Phaser.GameObjects.Container | null = null;
  private achievementListContainer: Phaser.GameObjects.Container | null = null;
  private achievementBtn: Phaser.GameObjects.Text | null = null;
  private achievementRedDot: Phaser.GameObjects.Graphics | null = null;
  private currentAchievementCategory: AchievementCategory | 'all' = 'all';
  private achievementCategoryTabs: Phaser.GameObjects.Container[] = [];
  private galleryPanel: Phaser.GameObjects.Container | null = null;
  private galleryListContainer: Phaser.GameObjects.Container | null = null;
  private galleryBtn: Phaser.GameObjects.Text | null = null;
  private galleryRedDot: Phaser.GameObjects.Graphics | null = null;
  private currentGalleryCategory: GalleryCategory = GalleryCategory.NORMAL;
  private galleryCategoryTabs: Phaser.GameObjects.Container[] = [];

  constructor() {
    super('Menu');
  }

  create(): void {
    AudioManager.getInstance().setScene(this);
    AudioManager.getInstance().switchContext(AudioContextType.MENU);

    this.createBackground();
    this.createTitle();
    this.createButtons();
    this.createFloatingPetals();

    const hasSave = SaveManager.getInstance().hasSave();
    if (hasSave) {
      SaveManager.getInstance().checkDailyLogin();
      if (SaveManager.getInstance().canClaimTodayReward()) {
        this.time.delayedCall(500, () => {
          this.openDailyRewardPanel();
        });
      }
    }
  }

  private createBackground(): void {
    const gradient = this.textures.createCanvas('menu_bg', GAME_WIDTH, GAME_HEIGHT);
    const ctx = gradient.getContext();
    
    const bgGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    bgGradient.addColorStop(0, '#0a0514');
    bgGradient.addColorStop(0.3, '#1a0a2e');
    bgGradient.addColorStop(0.7, '#0d1a26');
    bgGradient.addColorStop(1, '#0d2818');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let i = 0; i < 100; i++) {
      const x = Math.random() * GAME_WIDTH;
      const y = Math.random() * GAME_HEIGHT * 0.7;
      const size = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.8 + 0.2;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }

    const forestGradient = ctx.createLinearGradient(0, GAME_HEIGHT * 0.6, 0, GAME_HEIGHT);
    forestGradient.addColorStop(0, 'rgba(13, 40, 24, 0)');
    forestGradient.addColorStop(0.5, 'rgba(13, 40, 24, 0.8)');
    forestGradient.addColorStop(1, 'rgba(10, 26, 18, 1)');
    ctx.fillStyle = forestGradient;
    ctx.fillRect(0, GAME_HEIGHT * 0.6, GAME_WIDTH, GAME_HEIGHT * 0.4);

    gradient.refresh();
    this.add.image(0, 0, 'menu_bg').setOrigin(0, 0);

    const fogGradient = this.textures.createCanvas('menu_fog', GAME_WIDTH, GAME_HEIGHT);
    const fogCtx = fogGradient.getContext();
    const fogGrad = fogCtx.createRadialGradient(
      GAME_WIDTH / 2, GAME_HEIGHT / 2, 0,
      GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH
    );
    fogGrad.addColorStop(0, 'rgba(100, 50, 150, 0)');
    fogGrad.addColorStop(1, 'rgba(30, 10, 50, 0.4)');
    fogCtx.fillStyle = fogGrad;
    fogCtx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    fogGradient.refresh();

    this.add.image(0, 0, 'menu_fog').setOrigin(0, 0);
  }

  private createTitle(): void {
    const titleY = GAME_HEIGHT * 0.25;

    const mainTitle = this.add.text(GAME_WIDTH / 2, titleY, '梦境森林', {
      fontFamily: 'Arial',
      fontSize: '72px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.titleGlow = this.add.text(GAME_WIDTH / 2, titleY, '梦境森林', {
      fontFamily: 'Arial',
      fontSize: '72px',
      color: '#a8e6cf',
      fontStyle: 'bold'
    }).setOrigin(0.5).setAlpha(0.5).setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: this.titleGlow,
      alpha: { from: 0.3, to: 0.8 },
      scale: { from: 1, to: 1.05 },
      duration: 2500,
      yoyo: true,
      repeat: -1
    });

    const subtitle = this.add.text(GAME_WIDTH / 2, titleY + 80, '唤醒沉睡的恋人', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#a8e6cf',
      align: 'center'
    }).setOrigin(0.5);

    this.tweens.add({
      targets: subtitle,
      alpha: { from: 0.6, to: 1 },
      duration: 2000,
      yoyo: true,
      repeat: -1
    });
  }

  private createButtons(): void {
    const startY = GAME_HEIGHT * 0.45;
    const hasSave = SaveManager.getInstance().hasSave();
    const btnSpacing = 75;

    if (hasSave) {
      this.createButton('继续游戏', startY, () => {
        this.scene.start('Game', { continueGame: true });
      });
      this.createButton('新的开始', startY + btnSpacing, () => {
        SaveManager.getInstance().resetGame();
        this.scene.start('Game', { continueGame: false });
      });
    } else {
      this.createButton('开始游戏', startY, () => {
        SaveManager.getInstance().resetGame();
        this.scene.start('Game', { continueGame: false });
      });
    }

    let currentY = startY + btnSpacing * 2;

    if (hasSave) {
      const canClaim = SaveManager.getInstance().canClaimTodayReward();
      const dailyBtnText = canClaim ? '🎁 每日签到 (可领取)' : '🎁 每日签到';
      this.createButton(dailyBtnText, currentY, () => {
        this.openDailyRewardPanel();
      }, 0xffaa00);
      currentY += btnSpacing;

      this.createButton('🎯 阶段目标', currentY, () => {
        this.openGoalsPanel();
      }, 0x4a8acf);
      currentY += btnSpacing;

      this.commissionBtn = this.createButton('📜 森林委托', currentY, () => {
        this.openCommissionPanel();
      }, 0xc48a4a);
      this.setupCommissionRedDot();
      currentY += btnSpacing;

      this.createButton('📊 最近进度', currentY, () => {
        this.openProgressPanel();
      }, 0x4aa85c);
      currentY += btnSpacing;

      this.achievementBtn = this.createButton('🏆 成就殿堂', currentY, () => {
        this.openAchievementPanel();
      }, 0xffd700);
      this.setupAchievementRedDot();
      currentY += btnSpacing;

      this.galleryBtn = this.createButton('📚 收藏图鉴', currentY, () => {
        this.openGalleryPanel();
      }, 0x9370db);
      this.setupGalleryRedDot();
      currentY += btnSpacing;
    }

    const isMuted = AudioManager.getInstance().isMuted();
    const muteBtn = this.createButton(isMuted ? '🔇 开启音效' : '🔊 关闭音效', currentY, () => {
      const newMuted = AudioManager.getInstance().toggleMute();
      muteBtn.setText(newMuted ? '🔇 开启音效' : '🔊 关闭音效');
    }, 0x666666);
    currentY += btnSpacing;

    this.createButton('💾 存档管理', currentY, () => {
      this.toggleSavePanel();
    }, 0x667788);
    currentY += btnSpacing;

    this.createButton('🎵 声场设置', currentY, () => {
      this.toggleAudioPanel();
    }, 0x665577);
  }

  private createButton(text: string, y: number, callback: () => void, color: number = 0xff6b9d): Phaser.GameObjects.Text {
    const btnWidth = 300;
    const btnHeight = 70;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(color, 0.8);
    btnBg.fillRoundedRect((GAME_WIDTH - btnWidth) / 2, y - btnHeight / 2, btnWidth, btnHeight, 15);
    btnBg.lineStyle(3, 0xffffff, 0.5);
    btnBg.strokeRoundedRect((GAME_WIDTH - btnWidth) / 2, y - btnHeight / 2, btnWidth, btnHeight, 15);

    const glowTextureKey = `btn_glow_${color}_${y}`;
    if (!this.textures.exists(glowTextureKey)) {
      const glowCanvas = this.textures.createCanvas(glowTextureKey, 360, 360);
      const glowCtx = glowCanvas.getContext();
      const center = 180;
      const grad = glowCtx.createRadialGradient(center, center, 0, center, center, 180);
      grad.addColorStop(0, `rgba(${this.hexToRgb(color)}, 0.3)`);
      grad.addColorStop(1, `rgba(${this.hexToRgb(color)}, 0)`);
      glowCtx.fillStyle = grad;
      glowCtx.beginPath();
      glowCtx.arc(center, center, 180, 0, Math.PI * 2);
      glowCtx.fill();
      glowCanvas.refresh();
    }

    const btnGlow = this.add.image(GAME_WIDTH / 2, y, glowTextureKey).setBlendMode(Phaser.BlendModes.ADD);

    const btnText = this.add.text(GAME_WIDTH / 2, y, text, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const hitZone = this.add.zone(GAME_WIDTH / 2, y, btnWidth, btnHeight)
      .setInteractive({ useHandCursor: true });

    hitZone.on('pointerover', () => {
      this.tweens.add({
        targets: [btnBg, btnText, btnGlow],
        scale: 1.05,
        duration: 200
      });
    });

    hitZone.on('pointerout', () => {
      this.tweens.add({
        targets: [btnBg, btnText, btnGlow],
        scale: 1,
        duration: 200
      });
    });

    hitZone.on('pointerdown', () => {
      this.tweens.add({
        targets: [btnBg, btnText],
        scale: 0.95,
        duration: 100
      });
      AudioManager.getInstance().playSfx('sfx_click');
    });

    hitZone.on('pointerup', () => {
      this.tweens.add({
        targets: [btnBg, btnText],
        scale: 1,
        duration: 100,
        onComplete: callback
      });
    });

    this.tweens.add({
      targets: btnGlow,
      alpha: { from: 0.5, to: 1 },
      duration: 2000,
      yoyo: true,
      repeat: -1
    });

    return btnText;
  }

  private hexToRgb(hex: number): string {
    const r = (hex >> 16) & 255;
    const g = (hex >> 8) & 255;
    const b = hex & 255;
    return `${r}, ${g}, ${b}`;
  }

  private createFloatingPetals(): void {
    const petalColors = [0xa8e6cf, 0xffe66d, 0x88ccff, 0xff6b9d];
    
    this.particles = this.add.particles(0, 0, 'pixel_white', {
      x: { min: 0, max: GAME_WIDTH },
      y: { min: -50, max: GAME_HEIGHT },
      lifespan: { min: 4000, max: 8000 },
      speedY: { min: 10, max: 30 },
      speedX: { min: -15, max: 15 },
      scale: { start: 0, end: 3 },
      alpha: { start: 0, end: 0.8 },
      rotate: { min: 0, max: 360 },
      quantity: 1,
      frequency: 300,
      blendMode: 'ADD',
      tint: petalColors
    });
  }

  private toggleSavePanel(): void {
    if (this.savePanel) {
      this.closeSavePanel();
    } else {
      this.openSavePanel();
    }
  }

  private openSavePanel(): void {
    this.savePanel = this.add.container(0, 0).setDepth(200);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a0514, 0.97);
    panelBg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.savePanel.add(panelBg);

    const title = this.add.text(GAME_WIDTH / 2, 60, '存档管理', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.savePanel.add(title);

    const versionText = this.add.text(GAME_WIDTH / 2, 95, `存档版本: ${SAVE_VERSION}`, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#888888'
    }).setOrigin(0.5);
    this.savePanel.add(versionText);

    const closeBtn = this.add.text(GAME_WIDTH - 50, 55, '✕', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.closeSavePanel());
    this.savePanel.add(closeBtn);

    this.createSaveActionButtons();
    this.createBackupList();

    this.savePanel.setAlpha(0);
    this.tweens.add({
      targets: this.savePanel,
      alpha: 1,
      duration: 250
    });
  }

  private createSaveActionButtons(): void {
    if (!this.savePanel) return;

    const actions = [
      { label: '📦 创建备份', color: 0x4aa85c, action: () => this.handleCreateBackup() },
      { label: '✅ 校验存档', color: 0x4a8acf, action: () => this.handleValidateSave() },
      { label: '📤 导出存档', color: 0xffaa00, action: () => this.handleExportSave() },
      { label: '📥 导入存档', color: 0xc8a2ff, action: () => this.handleImportSave() },
      { label: '⚙️ 重置设置', color: 0xff6b6b, action: () => this.handleResetSettings() }
    ];

    const startY = 140;
    const btnWidth = 140;
    const btnHeight = 50;
    const spacing = 10;
    const totalWidth = actions.length * btnWidth + (actions.length - 1) * spacing;
    const startX = (GAME_WIDTH - totalWidth) / 2;

    actions.forEach((action, index) => {
      const x = startX + index * (btnWidth + spacing);
      const btnBg = this.add.graphics();
      btnBg.fillStyle(action.color, 0.8);
      btnBg.fillRoundedRect(x, startY, btnWidth, btnHeight, 10);
      btnBg.lineStyle(2, 0xffffff, 0.3);
      btnBg.strokeRoundedRect(x, startY, btnWidth, btnHeight, 10);

      const btnText = this.add.text(x + btnWidth / 2, startY + btnHeight / 2, action.label, {
        fontFamily: 'Arial',
        fontSize: '13px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: btnWidth - 10 }
      }).setOrigin(0.5);

      const hitZone = this.add.zone(x + btnWidth / 2, startY + btnHeight / 2, btnWidth, btnHeight)
        .setInteractive({ useHandCursor: true });

      hitZone.on('pointerover', () => btnBg.setAlpha(0.9));
      hitZone.on('pointerout', () => btnBg.setAlpha(0.8));
      hitZone.on('pointerup', () => {
        AudioManager.getInstance().playSfx('sfx_click');
        action.action();
      });

      this.savePanel!.add([btnBg, btnText, hitZone]);
    });
  }

  private createBackupList(): void {
    if (!this.savePanel) return;

    const listY = 220;
    const listHeight = GAME_HEIGHT - 280;

    const listTitle = this.add.text(50, listY, '备份列表', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0);
    this.savePanel.add(listTitle);

    this.backupListContainer = this.add.container(0, 0);
    this.savePanel.add(this.backupListContainer);

    this.refreshBackupList();
  }

  private refreshBackupList(): void {
    if (!this.backupListContainer || !this.savePanel) return;

    this.backupListContainer.removeAll(true);

    const backups = SaveManager.getInstance().getBackupList();
    const startY = 260;
    const itemHeight = 70;
    const itemWidth = GAME_WIDTH - 100;

    if (backups.length === 0) {
      const emptyText = this.add.text(GAME_WIDTH / 2, startY + 50, '暂无备份', {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#666666'
      }).setOrigin(0.5);
      this.backupListContainer.add(emptyText);
      return;
    }

    backups.slice(0, 8).forEach((backup, index) => {
      const y = startY + index * (itemHeight + 8);
      const isAuto = backup.isAuto;

      const itemBg = this.add.graphics();
      itemBg.fillStyle(0x1a0a2e, 0.8);
      itemBg.fillRoundedRect(50, y, itemWidth, itemHeight, 12);
      itemBg.lineStyle(2, isAuto ? 0x667788 : 0xa8e6cf, 0.5);
      itemBg.strokeRoundedRect(50, y, itemWidth, itemHeight, 12);
      this.backupListContainer!.add(itemBg);

      const label = backup.label || (isAuto ? '自动备份' : '手动备份');
      const labelText = this.add.text(70, y + 20, label, {
        fontFamily: 'Arial',
        fontSize: '15px',
        color: isAuto ? '#8899aa' : '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      this.backupListContainer!.add(labelText);

      const date = new Date(backup.timestamp);
      const dateStr = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      const dateText = this.add.text(70, y + 45, `${dateStr}  v${backup.version}`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#888888'
      }).setOrigin(0, 0.5);
      this.backupListContainer!.add(dateText);

      const sizeText = this.add.text(itemWidth - 30, y + 20, `${(backup.size / 1024).toFixed(1)}KB`, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: '#666666'
      }).setOrigin(1, 0.5);
      this.backupListContainer!.add(sizeText);

      const restoreBtn = this.createSmallButton(
        itemWidth - 100, y + 38,
        '恢复', 0x4aa85c,
        () => this.handleRestoreBackup(index, isAuto)
      );
      this.backupListContainer!.add(restoreBtn);

      const deleteBtn = this.createSmallButton(
        itemWidth - 40, y + 38,
        '删除', 0xff6b6b,
        () => this.handleDeleteBackup(index, isAuto)
      );
      this.backupListContainer!.add(deleteBtn);
    });
  }

  private createSmallButton(x: number, y: number, text: string, color: number, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const btnWidth = 50;
    const btnHeight = 26;

    const btnBg = this.add.graphics();
    btnBg.fillStyle(color, 0.8);
    btnBg.fillRoundedRect(x - btnWidth / 2, y - btnHeight / 2, btnWidth, btnHeight, 6);
    container.add(btnBg);

    const btnText = this.add.text(x, y, text, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#ffffff'
    }).setOrigin(0.5);
    container.add(btnText);

    const hitZone = this.add.zone(x, y, btnWidth, btnHeight)
      .setInteractive({ useHandCursor: true });
    hitZone.on('pointerup', callback);
    container.add(hitZone);

    return container;
  }

  private handleCreateBackup(): void {
    const label = `手动备份 ${new Date().toLocaleString()}`;
    const result = SaveManager.getInstance().createBackup(label);
    if (result) {
      this.showToast('✅ 备份创建成功');
      this.refreshBackupList();
    } else {
      this.showToast('❌ 备份创建失败');
    }
  }

  private handleRestoreBackup(index: number, isAuto: boolean): void {
    if (!confirm('确定要恢复此备份吗？当前进度将被覆盖。')) {
      return;
    }
    const success = SaveManager.getInstance().restoreBackup(index, isAuto);
    if (success) {
      this.showToast('✅ 备份恢复成功');
      this.refreshBackupList();
    } else {
      this.showToast('❌ 备份恢复失败');
    }
  }

  private handleDeleteBackup(index: number, isAuto: boolean): void {
    if (!confirm('确定要删除此备份吗？')) {
      return;
    }
    const success = SaveManager.getInstance().deleteBackup(index, isAuto);
    if (success) {
      this.showToast('🗑️ 备份已删除');
      this.refreshBackupList();
    }
  }

  private handleValidateSave(): void {
    const result = SaveManager.getInstance().validateAndRepairSave();
    let message = '';
    if (result.valid) {
      if (result.fixed) {
        message = `⚠️ 校验完成，修复了 ${result.warnings.length} 个问题`;
      } else if (result.warnings.length > 0) {
        message = `⚠️ 校验通过，有 ${result.warnings.length} 个警告`;
      } else {
        message = '✅ 存档数据完好';
      }
    } else {
      message = `❌ 校验失败: ${result.errors[0]}`;
    }
    this.showToast(message);
  }

  private handleExportSave(): void {
    const data = SaveManager.getInstance().exportSave();
    if (data) {
      const input = prompt('存档导出码（已复制到剪贴板）：\n请手动复制以下内容：', data);
      if (input) {
        try {
          navigator.clipboard.writeText(data);
        } catch (e) {
          console.log('Clipboard not available');
        }
      }
      this.showToast('📤 存档已导出');
    } else {
      this.showToast('❌ 导出失败');
    }
  }

  private handleImportSave(): void {
    const input = prompt('请输入存档导入码：');
    if (input && input.trim()) {
      const success = SaveManager.getInstance().importSave(input.trim());
      if (success) {
        this.showToast('📥 存档导入成功');
        this.refreshBackupList();
      } else {
        this.showToast('❌ 导入失败，数据格式无效');
      }
    }
  }

  private handleResetSettings(): void {
    if (!confirm('确定要重置所有设置为默认值吗？')) {
      return;
    }
    SaveManager.getInstance().resetSettings();
    this.showToast('⚙️ 设置已重置');
  }

  private closeSavePanel(): void {
    if (!this.savePanel) return;

    this.tweens.add({
      targets: this.savePanel,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        if (this.savePanel) {
          this.savePanel.destroy();
          this.savePanel = null;
          this.backupListContainer = null;
        }
      }
    });
  }

  private toggleAudioPanel(): void {
    if (this.audioPanel) {
      this.closeAudioPanel();
    } else {
      this.openAudioPanel();
    }
  }

  private openAudioPanel(): void {
    this.audioPanel = this.add.container(0, 0).setDepth(200);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a0514, 0.97);
    panelBg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.audioPanel.add(panelBg);

    const title = this.add.text(GAME_WIDTH / 2, 60, '🎵 声场设置', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.audioPanel.add(title);

    const subtitle = this.add.text(GAME_WIDTH / 2, 95, '为每个游戏场景定制专属声场效果', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#a8e6cf'
    }).setOrigin(0.5);
    this.audioPanel.add(subtitle);

    const closeBtn = this.add.text(GAME_WIDTH - 50, 55, '✕', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.closeAudioPanel());
    this.audioPanel.add(closeBtn);

    this.renderAudioSettings();

    const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30,
      '💡 所有声场偏好将自动保存，重进游戏后依然生效', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#666666'
    }).setOrigin(0.5);
    this.audioPanel.add(hint);

    this.audioPanel.setAlpha(0);
    this.tweens.add({
      targets: this.audioPanel,
      alpha: 1,
      duration: 250
    });
  }

  private renderAudioSettings(): void {
    if (!this.audioPanel) return;

    const contexts = [
      { type: AudioContextType.MENU, icon: '🏠', name: '主菜单', desc: '主标题界面，轻柔开场', accent: 0xff6b9d },
      { type: AudioContextType.EXPLORE, icon: '🌲', name: '探索模式', desc: '森林漫步与花瓣采集', accent: 0xa8e6cf },
      { type: AudioContextType.SYNTHESIS, icon: '⚗️', name: '合成面板', desc: '专注调配、神秘氛围', accent: 0xc8a2ff },
      { type: AudioContextType.COMPLETE, icon: '🌸', name: '完成结局', desc: '恋人苏醒、温暖收尾', accent: 0xffe66d }
    ];

    const startY = 140;
    const itemHeight = 110;
    const cardW = GAME_WIDTH - 100;

    contexts.forEach((ctx, idx) => {
      const y = startY + idx * (itemHeight + 15);
      const prefs = AudioManager.getInstance().getContextPreferences(ctx.type);

      const card = this.add.graphics();
      card.fillStyle(0x1a0a2e, 0.9);
      card.fillRoundedRect(50, y, cardW, itemHeight, 14);
      card.lineStyle(2, ctx.accent, prefs.enabled ? 0.6 : 0.2);
      card.strokeRoundedRect(50, y, cardW, itemHeight, 14);
      this.audioPanel!.add(card);

      const icon = this.add.text(80, y + 30, ctx.icon, {
        fontFamily: 'Arial',
        fontSize: '28px'
      }).setOrigin(0, 0.5);
      this.audioPanel!.add(icon);

      const name = this.add.text(130, y + 25, ctx.name, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: prefs.enabled ? '#ffffff' : '#555555',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      this.audioPanel!.add(name);

      const desc = this.add.text(130, y + 50, ctx.desc, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: prefs.enabled ? '#888888' : '#444444'
      }).setOrigin(0, 0.5);
      this.audioPanel!.add(desc);

      const toggleX = GAME_WIDTH - 90;
      const toggleY = y + 35;

      const toggleBg = this.add.graphics();
      toggleBg.fillStyle(prefs.enabled ? ctx.accent : 0x333333, 1);
      toggleBg.fillRoundedRect(toggleX - 25, toggleY - 15, 50, 30, 15);
      this.audioPanel!.add(toggleBg);

      const knobX = prefs.enabled ? toggleX + 10 : toggleX - 10;
      const knob = this.add.circle(knobX, toggleY, 11, 0xffffff)
        .setInteractive({ useHandCursor: true });
      this.audioPanel!.add(knob);

      knob.on('pointerup', () => {
        const newVal = !prefs.enabled;
        AudioManager.getInstance().setContextEnabled(ctx.type, newVal);
        AudioManager.getInstance().playSfx('sfx_click', 0.3);
        this.refreshAudioPanel();
      });

      const sliderY = y + 82;
      const sliderStartX = 80;
      const sliderEndX = GAME_WIDTH - 100;
      const sliderW = sliderEndX - sliderStartX;
      const vol = prefs.enabled ? prefs.volume : prefs.volume;

      const sliderBg = this.add.graphics();
      sliderBg.fillStyle(0x333333, 0.8);
      sliderBg.fillRoundedRect(sliderStartX, sliderY - 5, sliderW, 10, 5);
      this.audioPanel!.add(sliderBg);

      const fillW = sliderW * vol;
      const sliderFill = this.add.graphics();
      sliderFill.fillStyle(prefs.enabled ? ctx.accent : 0x555555, 0.8);
      sliderFill.fillRoundedRect(sliderStartX, sliderY - 5, fillW, 10, 5);
      this.audioPanel!.add(sliderFill);

      const volText = this.add.text(sliderEndX + 5, sliderY, `${Math.round(vol * 100)}%`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: prefs.enabled ? '#ffffff' : '#555555'
      }).setOrigin(1, 0.5);
      this.audioPanel!.add(volText);

      const sliderKnob = this.add.circle(sliderStartX + fillW, sliderY, 10, 0xffffff)
        .setInteractive({ useHandCursor: true, draggable: true });
      this.audioPanel!.add(sliderKnob);

      this.input.setDraggable(sliderKnob);
      sliderKnob.on('drag', (_ptr: Phaser.Input.Pointer, dragX: number) => {
        const clamped = Phaser.Math.Clamp(dragX, sliderStartX, sliderEndX);
        const newVol = (clamped - sliderStartX) / sliderW;
        sliderKnob.x = clamped;
        sliderFill.clear();
        sliderFill.fillStyle(prefs.enabled ? ctx.accent : 0x555555, 0.8);
        sliderFill.fillRoundedRect(sliderStartX, sliderY - 5, clamped - sliderStartX, 10, 5);
        volText.setText(`${Math.round(newVol * 100)}%`);
      });
      sliderKnob.on('dragend', () => {
        const finalVol = Phaser.Math.Clamp((sliderKnob.x - sliderStartX) / sliderW, 0, 1);
        AudioManager.getInstance().setContextVolume(ctx.type, finalVol);
        AudioManager.getInstance().playSfx('sfx_click', 0.15);
      });

      const previewBtn = this.createSmallButton(
        GAME_WIDTH - 160, y + 35,
        '试听', ctx.accent,
        () => {
          const prev = AudioManager.getInstance().getCurrentContext();
          AudioManager.getInstance().switchContext(ctx.type);
          setTimeout(() => {
            if (prev) AudioManager.getInstance().switchContext(prev);
          }, 2000);
          this.showToast(`🎵 试听 ${ctx.name} 声场 (2秒)`, 2000);
        }
      );
      previewBtn.setAlpha(prefs.enabled ? 1 : 0.3);
      this.audioPanel!.add(previewBtn);
    });
  }

  private refreshAudioPanel(): void {
    if (!this.audioPanel) return;
    const children = this.audioPanel.getAll();
    children.forEach(c => c.destroy());
    this.renderAudioSettings();
    if (this.audioPanel) {
      const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30,
        '💡 所有声场偏好将自动保存，重进游戏后依然生效', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#666666'
      }).setOrigin(0.5);
      this.audioPanel.add(hint);
    }
  }

  private closeAudioPanel(): void {
    if (!this.audioPanel) return;

    this.tweens.add({
      targets: this.audioPanel,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        if (this.audioPanel) {
          this.audioPanel.destroy();
          this.audioPanel = null;
        }
      }
    });
  }

  private openDailyRewardPanel(): void {
    if (this.dailyRewardPanel) return;

    this.dailyRewardPanel = this.add.container(0, 0).setDepth(200);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a0514, 0.97);
    panelBg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.dailyRewardPanel.add(panelBg);

    const title = this.add.text(GAME_WIDTH / 2, 60, '🎁 每日签到', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.dailyRewardPanel.add(title);

    const rewardState = SaveManager.getInstance().getDailyRewardState();
    const subtitle = this.add.text(GAME_WIDTH / 2, 95, 
      `连续签到 ${rewardState.consecutiveDays} 天`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffd700'
    }).setOrigin(0.5);
    this.dailyRewardPanel.add(subtitle);

    const closeBtn = this.add.text(GAME_WIDTH - 50, 55, '✕', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.closeDailyRewardPanel());
    this.dailyRewardPanel.add(closeBtn);

    this.renderDailyRewards();

    this.dailyRewardPanel.setAlpha(0);
    this.tweens.add({
      targets: this.dailyRewardPanel,
      alpha: 1,
      duration: 250
    });
  }

  private renderDailyRewards(): void {
    if (!this.dailyRewardPanel) return;

    const rewards = SaveManager.getInstance().getDailyRewards();
    const rewardState = SaveManager.getInstance().getDailyRewardState();
    const canClaimToday = SaveManager.getInstance().canClaimTodayReward();

    const startY = 140;
    const itemWidth = 90;
    const itemHeight = 110;
    const spacing = 10;
    const totalWidth = 7 * itemWidth + 6 * spacing;
    const startX = (GAME_WIDTH - totalWidth) / 2;

    rewards.forEach((reward, index) => {
      const x = startX + index * (itemWidth + spacing);
      const day = reward.day;
      const isClaimed = rewardState.claimedDays.includes(day);
      const isToday = day === rewardState.consecutiveDays && canClaimToday;
      const isPast = day < rewardState.consecutiveDays || (day === rewardState.consecutiveDays && rewardState.todayClaimed);

      const itemBg = this.add.graphics();
      if (isToday) {
        itemBg.fillStyle(0xffaa00, 0.3);
      } else if (isPast || isClaimed) {
        itemBg.fillStyle(0x444444, 0.3);
      } else {
        itemBg.fillStyle(0x1a0a2e, 0.6);
      }
      itemBg.fillRoundedRect(x, startY, itemWidth, itemHeight, 10);
      itemBg.lineStyle(2, isToday ? 0xffd700 : (isPast || isClaimed ? 0x666666 : 0x888888), isToday ? 0.8 : 0.4);
      itemBg.strokeRoundedRect(x, startY, itemWidth, itemHeight, 10);
      this.dailyRewardPanel!.add(itemBg);

      const dayText = this.add.text(x + itemWidth / 2, startY + 18, `第${day}天`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: isPast || isClaimed ? '#666666' : '#a8e6cf'
      }).setOrigin(0.5);
      this.dailyRewardPanel!.add(dayText);

      const iconText = this.add.text(x + itemWidth / 2, startY + 50, reward.icon, {
        fontFamily: 'Arial',
        fontSize: '32px'
      }).setOrigin(0.5);
      if (isPast || isClaimed) {
        iconText.setAlpha(0.5);
      }
      this.dailyRewardPanel!.add(iconText);

      const descText = this.add.text(x + itemWidth / 2, startY + 82, reward.description, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: isPast || isClaimed ? '#666666' : '#ffffff',
        align: 'center',
        wordWrap: { width: itemWidth - 10 }
      }).setOrigin(0.5);
      this.dailyRewardPanel!.add(descText);

      if (isClaimed || (day === rewardState.consecutiveDays && rewardState.todayClaimed)) {
        const claimedText = this.add.text(x + itemWidth / 2, startY + 98, '✓ 已领取', {
          fontFamily: 'Arial',
          fontSize: '10px',
          color: '#4aa85c'
        }).setOrigin(0.5);
        this.dailyRewardPanel!.add(claimedText);
      }

      if (isToday && canClaimToday) {
        const claimBtn = this.add.graphics();
        claimBtn.fillStyle(0xffaa00, 0.9);
        claimBtn.fillRoundedRect(x + 10, startY + 95, itemWidth - 20, 22, 6);
        this.dailyRewardPanel!.add(claimBtn);

        const claimText = this.add.text(x + itemWidth / 2, startY + 106, '领取', {
          fontFamily: 'Arial',
          fontSize: '12px',
          color: '#ffffff',
          fontStyle: 'bold'
        }).setOrigin(0.5);
        this.dailyRewardPanel!.add(claimText);

        const hitZone = this.add.zone(x + itemWidth / 2, startY + 106, itemWidth - 20, 22)
          .setInteractive({ useHandCursor: true });
        hitZone.on('pointerup', () => this.handleClaimDailyReward());
        this.dailyRewardPanel!.add(hitZone);

        this.tweens.add({
          targets: [claimBtn, claimText],
          scale: { from: 1, to: 1.05 },
          duration: 1000,
          yoyo: true,
          repeat: -1
        });
      }
    });

    const hintY = startY + itemHeight + 30;
    const hintText = this.add.text(GAME_WIDTH / 2, hintY, 
      '💡 连续签到可获得更丰厚的奖励，断签将从第1天重新开始', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#888888',
      align: 'center'
    }).setOrigin(0.5);
    this.dailyRewardPanel.add(hintText);
  }

  private handleClaimDailyReward(): void {
    const result = SaveManager.getInstance().claimDailyReward();
    if (result.success) {
      AudioManager.getInstance().playSfx('sfx_click');
      this.showToast(`🎁 ${result.message}`, 2500);
      this.refreshDailyRewardPanel();
    } else {
      this.showToast(`❌ ${result.message}`, 2000);
    }
  }

  private refreshDailyRewardPanel(): void {
    if (!this.dailyRewardPanel) return;
    const children = this.dailyRewardPanel.getAll();
    children.forEach(c => c.destroy());

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a0514, 0.97);
    panelBg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.dailyRewardPanel.add(panelBg);

    const title = this.add.text(GAME_WIDTH / 2, 60, '🎁 每日签到', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.dailyRewardPanel.add(title);

    const rewardState = SaveManager.getInstance().getDailyRewardState();
    const subtitle = this.add.text(GAME_WIDTH / 2, 95, 
      `连续签到 ${rewardState.consecutiveDays} 天`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffd700'
    }).setOrigin(0.5);
    this.dailyRewardPanel.add(subtitle);

    const closeBtn = this.add.text(GAME_WIDTH - 50, 55, '✕', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.closeDailyRewardPanel());
    this.dailyRewardPanel.add(closeBtn);

    this.renderDailyRewards();
  }

  private closeDailyRewardPanel(): void {
    if (!this.dailyRewardPanel) return;

    this.tweens.add({
      targets: this.dailyRewardPanel,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        if (this.dailyRewardPanel) {
          this.dailyRewardPanel.destroy();
          this.dailyRewardPanel = null;
        }
      }
    });
  }

  private openGoalsPanel(): void {
    if (this.goalsPanel) return;

    this.goalsPanel = this.add.container(0, 0).setDepth(200);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a0514, 0.97);
    panelBg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.goalsPanel.add(panelBg);

    const title = this.add.text(GAME_WIDTH / 2, 60, '🎯 阶段目标', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.goalsPanel.add(title);

    const goals = SaveManager.getInstance().getGoals();
    const completedCount = goals.filter(g => g.status === 'completed' || g.status === 'claimed').length;
    const subtitle = this.add.text(GAME_WIDTH / 2, 95, 
      `已完成 ${completedCount} / ${goals.length} 个目标`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#a8e6cf'
    }).setOrigin(0.5);
    this.goalsPanel.add(subtitle);

    const closeBtn = this.add.text(GAME_WIDTH - 50, 55, '✕', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.closeGoalsPanel());
    this.goalsPanel.add(closeBtn);

    this.renderGoalsList();

    this.goalsPanel.setAlpha(0);
    this.tweens.add({
      targets: this.goalsPanel,
      alpha: 1,
      duration: 250
    });
  }

  private renderGoalsList(): void {
    if (!this.goalsPanel) return;

    const goals = SaveManager.getInstance().getGoals();
    const startY = 130;
    const itemHeight = 75;
    const itemWidth = GAME_WIDTH - 80;
    const spacing = 10;

    const activeGoals = goals.filter(g => g.status !== 'claimed');
    const claimedGoals = goals.filter(g => g.status === 'claimed');
    const displayGoals = [...activeGoals, ...claimedGoals].slice(0, 8);

    displayGoals.forEach((goal, index) => {
      const y = startY + index * (itemHeight + spacing);
      const isCompleted = goal.status === 'completed' || goal.status === 'claimed';
      const isClaimed = goal.status === 'claimed';
      const progress = Math.min(goal.currentCount / goal.targetCount, 1);

      const itemBg = this.add.graphics();
      if (isClaimed) {
        itemBg.fillStyle(0x333333, 0.4);
      } else if (isCompleted) {
        itemBg.fillStyle(0x4aa85c, 0.2);
      } else {
        itemBg.fillStyle(0x1a0a2e, 0.8);
      }
      itemBg.fillRoundedRect(40, y, itemWidth, itemHeight, 12);
      itemBg.lineStyle(2, isCompleted ? 0x4aa85c : 0x667788, isCompleted ? 0.6 : 0.3);
      itemBg.strokeRoundedRect(40, y, itemWidth, itemHeight, 12);
      this.goalsPanel!.add(itemBg);

      const statusIcon = isClaimed ? '✅' : (isCompleted ? '🎁' : '🎯');
      const iconText = this.add.text(65, y + itemHeight / 2, statusIcon, {
        fontFamily: 'Arial',
        fontSize: '24px'
      }).setOrigin(0, 0.5);
      this.goalsPanel!.add(iconText);

      const titleText = this.add.text(105, y + 22, goal.title, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: isClaimed ? '#666666' : '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      this.goalsPanel!.add(titleText);

      const descText = this.add.text(105, y + 45, goal.description, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: isClaimed ? '#555555' : '#888888'
      }).setOrigin(0, 0.5);
      this.goalsPanel!.add(descText);

      const progressBarWidth = 200;
      const progressBarX = GAME_WIDTH - 60 - progressBarWidth;
      const progressBarY = y + itemHeight / 2 - 6;

      const progressBg = this.add.graphics();
      progressBg.fillStyle(0x333333, 0.8);
      progressBg.fillRoundedRect(progressBarX, progressBarY, progressBarWidth, 12, 6);
      this.goalsPanel!.add(progressBg);

      const progressFill = this.add.graphics();
      const fillColor = isClaimed ? 0x666666 : (isCompleted ? 0x4aa85c : 0xffd700);
      progressFill.fillStyle(fillColor, 0.9);
      progressFill.fillRoundedRect(progressBarX, progressBarY, progressBarWidth * progress, 12, 6);
      this.goalsPanel!.add(progressFill);

      const progressText = this.add.text(GAME_WIDTH - 65, y + itemHeight / 2, 
        `${goal.currentCount}/${goal.targetCount}`, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: isClaimed ? '#666666' : '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(1, 0.5);
      this.goalsPanel!.add(progressText);

      if (isCompleted && !isClaimed) {
        const claimBtn = this.add.graphics();
        claimBtn.fillStyle(0xffaa00, 0.9);
        claimBtn.fillRoundedRect(GAME_WIDTH - 130, y + 45, 70, 22, 6);
        this.goalsPanel!.add(claimBtn);

        const claimText = this.add.text(GAME_WIDTH - 95, y + 56, '领取', {
          fontFamily: 'Arial',
          fontSize: '12px',
          color: '#ffffff',
          fontStyle: 'bold'
        }).setOrigin(0.5);
        this.goalsPanel!.add(claimText);

        const hitZone = this.add.zone(GAME_WIDTH - 95, y + 56, 70, 22)
          .setInteractive({ useHandCursor: true });
        hitZone.on('pointerup', () => this.handleClaimGoal(goal.id));
        this.goalsPanel!.add(hitZone);
      }
    });

    const hintText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30,
      '💡 完成目标可获得丰厚奖励，目标将随游戏进度逐步解锁', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#666666'
    }).setOrigin(0.5);
    this.goalsPanel.add(hintText);
  }

  private handleClaimGoal(goalId: string): void {
    const state = SaveManager.getInstance().claimGoal(goalId);
    if (state) {
      AudioManager.getInstance().playSfx('sfx_click');
      this.showToast('🎁 目标奖励已领取！', 2000);
      this.refreshGoalsPanel();
    }
  }

  private refreshGoalsPanel(): void {
    if (!this.goalsPanel) return;
    const children = this.goalsPanel.getAll();
    children.forEach(c => c.destroy());

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a0514, 0.97);
    panelBg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.goalsPanel.add(panelBg);

    const title = this.add.text(GAME_WIDTH / 2, 60, '🎯 阶段目标', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.goalsPanel.add(title);

    const goals = SaveManager.getInstance().getGoals();
    const completedCount = goals.filter(g => g.status === 'completed' || g.status === 'claimed').length;
    const subtitle = this.add.text(GAME_WIDTH / 2, 95, 
      `已完成 ${completedCount} / ${goals.length} 个目标`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#a8e6cf'
    }).setOrigin(0.5);
    this.goalsPanel.add(subtitle);

    const closeBtn = this.add.text(GAME_WIDTH - 50, 55, '✕', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.closeGoalsPanel());
    this.goalsPanel.add(closeBtn);

    this.renderGoalsList();
  }

  private closeGoalsPanel(): void {
    if (!this.goalsPanel) return;

    this.tweens.add({
      targets: this.goalsPanel,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        if (this.goalsPanel) {
          this.goalsPanel.destroy();
          this.goalsPanel = null;
        }
      }
    });
  }

  private openProgressPanel(): void {
    if (this.progressPanel) return;

    this.progressPanel = this.add.container(0, 0).setDepth(200);

    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0a0514, 0.97);
    panelBg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    this.progressPanel.add(panelBg);

    const title = this.add.text(GAME_WIDTH / 2, 60, '📊 最近进度', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.progressPanel.add(title);

    const closeBtn = this.add.text(GAME_WIDTH - 50, 55, '✕', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.closeProgressPanel());
    this.progressPanel.add(closeBtn);

    this.renderProgressSummary();

    this.progressPanel.setAlpha(0);
    this.tweens.add({
      targets: this.progressPanel,
      alpha: 1,
      duration: 250
    });
  }

  private renderProgressSummary(): void {
    if (!this.progressPanel) return;

    const state = SaveManager.getInstance().getGameState();
    const efficiency = SaveManager.getInstance().calculateEfficiencyStats();

    const startY = 120;

    const stats = [
      { label: '累计收集', value: state.totalCollected.toString(), icon: '🌸', color: 0xff6b9d },
      { label: '成功合成', value: state.totalSynthesized.toString(), icon: '⚗️', color: 0xc8a2ff },
      { label: '变异发现', value: state.totalMutations.toString(), icon: '✨', color: 0xffaa00 },
      { label: '解锁花瓣', value: state.unlockedPetals.length.toString(), icon: '📖', color: 0xa8e6cf }
    ];

    const statWidth = 140;
    const statHeight = 90;
    const statSpacing = 15;
    const totalStatsWidth = stats.length * statWidth + (stats.length - 1) * statSpacing;
    const statsStartX = (GAME_WIDTH - totalStatsWidth) / 2;

    stats.forEach((stat, index) => {
      const x = statsStartX + index * (statWidth + statSpacing);
      const y = startY;

      const cardBg = this.add.graphics();
      cardBg.fillStyle(0x1a0a2e, 0.8);
      cardBg.fillRoundedRect(x, y, statWidth, statHeight, 12);
      cardBg.lineStyle(2, stat.color, 0.4);
      cardBg.strokeRoundedRect(x, y, statWidth, statHeight, 12);
      this.progressPanel!.add(cardBg);

      const iconText = this.add.text(x + statWidth / 2, y + 28, stat.icon, {
        fontFamily: 'Arial',
        fontSize: '24px'
      }).setOrigin(0.5);
      this.progressPanel!.add(iconText);

      const valueText = this.add.text(x + statWidth / 2, y + 55, stat.value, {
        fontFamily: 'Arial',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.progressPanel!.add(valueText);

      const labelText = this.add.text(x + statWidth / 2, y + 75, stat.label, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#888888'
      }).setOrigin(0.5);
      this.progressPanel!.add(labelText);
    });

    const timeY = startY + statHeight + 30;
    const timeCardWidth = GAME_WIDTH - 80;
    const timeCardHeight = 60;

    const timeCardBg = this.add.graphics();
    timeCardBg.fillStyle(0x1a0a2e, 0.8);
    timeCardBg.fillRoundedRect(40, timeY, timeCardWidth, timeCardHeight, 12);
    timeCardBg.lineStyle(2, 0x667788, 0.3);
    timeCardBg.strokeRoundedRect(40, timeY, timeCardWidth, timeCardHeight, 12);
    this.progressPanel!.add(timeCardBg);

    const playMinutes = Math.floor(state.playTime / 60);
    const playHours = Math.floor(playMinutes / 60);
    const playMins = playMinutes % 60;
    const timeStr = playHours > 0 ? `${playHours}小时${playMins}分钟` : `${playMins}分钟`;

    const timeIcon = this.add.text(65, timeY + timeCardHeight / 2, '⏱️', {
      fontFamily: 'Arial',
      fontSize: '24px'
    }).setOrigin(0, 0.5);
    this.progressPanel!.add(timeIcon);

    const timeLabel = this.add.text(105, timeY + timeCardHeight / 2 - 10, '游戏时长', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#888888'
    }).setOrigin(0, 0.5);
    this.progressPanel!.add(timeLabel);

    const timeValue = this.add.text(105, timeY + timeCardHeight / 2 + 12, timeStr, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.progressPanel!.add(timeValue);

    const ratingBg = this.add.graphics();
    ratingBg.fillStyle(efficiency.efficiencyRating === 'S' ? 0xffd700 : 
                       efficiency.efficiencyRating === 'A' ? 0x4aa85c :
                       efficiency.efficiencyRating === 'B' ? 0x4a8acf :
                       efficiency.efficiencyRating === 'C' ? 0xffaa00 : 0x888888, 0.9);
    ratingBg.fillRoundedRect(GAME_WIDTH - 130, timeY + 12, 80, 36, 8);
    this.progressPanel!.add(ratingBg);

    const ratingText = this.add.text(GAME_WIDTH - 90, timeY + timeCardHeight / 2, 
      `效率 ${efficiency.efficiencyRating}`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.progressPanel!.add(ratingText);

    const petalY = timeY + timeCardHeight + 25;
    const petalTitle = this.add.text(50, petalY, '花瓣收藏', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0, 0.5);
    this.progressPanel!.add(petalTitle);

    const petalTypes = [
      { type: 'moonlight', name: '月光', color: '#88ccff' },
      { type: 'starlight', name: '星光', color: '#ffe66d' },
      { type: 'dew', name: '露珠', color: '#a8e6cf' },
      { type: 'glowing', name: '荧光', color: '#ff9ecb' },
      { type: 'dream', name: '梦境', color: '#c8a2ff' },
      { type: 'eternal', name: '永恒', color: '#ffd700' },
      { type: 'wakeup', name: '唤醒', color: '#ff6b9d' }
    ];

    const petalStartY = petalY + 30;
    const petalItemWidth = 95;
    const petalItemHeight = 50;
    const petalSpacing = 8;
    const petalTotalWidth = petalTypes.length * petalItemWidth + (petalTypes.length - 1) * petalSpacing;
    const petalStartX = (GAME_WIDTH - petalTotalWidth) / 2;

    petalTypes.forEach((petal, index) => {
      const x = petalStartX + index * (petalItemWidth + petalSpacing);
      const y = petalStartY;
      const count = state.petals[petal.type as keyof typeof state.petals] || 0;
      const unlocked = state.unlockedPetals.includes(petal.type as any);

      const itemBg = this.add.graphics();
      itemBg.fillStyle(unlocked ? 0x1a0a2e : 0x222222, unlocked ? 0.8 : 0.5);
      itemBg.fillRoundedRect(x, y, petalItemWidth, petalItemHeight, 8);
      itemBg.lineStyle(1.5, unlocked ? parseInt(petal.color.replace('#', ''), 16) : 0x444444, unlocked ? 0.5 : 0.3);
      itemBg.strokeRoundedRect(x, y, petalItemWidth, petalItemHeight, 8);
      this.progressPanel!.add(itemBg);

      const nameText = this.add.text(x + petalItemWidth / 2, y + 16, petal.name, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: unlocked ? petal.color : '#555555'
      }).setOrigin(0.5);
      this.progressPanel!.add(nameText);

      const countText = this.add.text(x + petalItemWidth / 2, y + 36, 
        unlocked ? `×${count}` : '未解锁', {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: unlocked ? '#ffffff' : '#444444',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.progressPanel!.add(countText);
    });

    const lastSaveY = petalStartY + petalItemHeight + 30;
    const lastSaveDate = new Date(state.lastSaveTime);
    const lastSaveStr = state.lastSaveTime > 0 
      ? `${lastSaveDate.toLocaleDateString()} ${lastSaveDate.toLocaleTimeString()}`
      : '暂无记录';

    const lastSaveText = this.add.text(GAME_WIDTH / 2, lastSaveY, 
      `💾 上次保存: ${lastSaveStr}`, {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#666666'
    }).setOrigin(0.5);
    this.progressPanel!.add(lastSaveText);
  }

  private closeProgressPanel(): void {
    if (!this.progressPanel) return;

    this.tweens.add({
      targets: this.progressPanel,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        if (this.progressPanel) {
          this.progressPanel.destroy();
          this.progressPanel = null;
        }
      }
    });
  }

  private showToast(message: string, duration: number = 2000): void {
    const toast = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, message, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.8)',
      padding: { x: 20, y: 12 }
    }).setOrigin(0.5).setDepth(300).setAlpha(0);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      y: '-=30',
      duration: 200,
      ease: 'Back.Out'
    });

    this.tweens.add({
      targets: toast,
      alpha: 0,
      y: '+=30',
      duration: 300,
      delay: duration - 300,
      ease: 'Cubic.In',
      onComplete: () => toast.destroy()
    });
  }

  update(): void {}

  destroy(): void {
    if (this.particles) {
      this.particles.stop();
      this.particles.destroy();
    }
    if (this.savePanel) {
      this.savePanel.destroy();
      this.savePanel = null;
    }
    if (this.audioPanel) {
      this.audioPanel.destroy();
      this.audioPanel = null;
    }
    if (this.dailyRewardPanel) {
      this.dailyRewardPanel.destroy();
      this.dailyRewardPanel = null;
    }
    if (this.goalsPanel) {
      this.goalsPanel.destroy();
      this.goalsPanel = null;
    }
    if (this.progressPanel) {
      this.progressPanel.destroy();
      this.progressPanel = null;
    }
    if (this.commissionPanel) {
      this.commissionPanel.destroy();
      this.commissionPanel = null;
    }
    EventManager.getInstance().off('commission:progress');
    EventManager.getInstance().off('commission:completed');
    EventManager.getInstance().off('commission:claimed');
    EventManager.getInstance().off('commissionchain:completed');
    EventManager.getInstance().off('commissionchain:claimed');
    EventManager.getInstance().off('reddot:updated');
  }

  private setupCommissionRedDot(): void {
    if (!this.commissionBtn) return;

    const state = SaveManager.getInstance().getGameState();
    const rd: Partial<RedDotState> = state.redDotState || {};
    const hasUnclaimed = (rd.claimableCommissions?.length || 0) > 0 || 
                        (rd.claimableCommissionChains?.length || 0) > 0 ||
                        (rd.commissionNewUnlocks?.length || 0) > 0;

    if (this.commissionRedDot) {
      this.commissionRedDot.destroy();
      this.commissionRedDot = null;
    }

    if (hasUnclaimed) {
      const bounds = this.commissionBtn.getBounds();
      this.commissionRedDot = this.add.graphics();
      this.commissionRedDot.fillStyle(0xff4444, 1);
      this.commissionRedDot.fillCircle(bounds.right, bounds.top, 8);
      this.commissionRedDot.lineStyle(2, 0xffffff, 1);
      this.commissionRedDot.strokeCircle(bounds.right, bounds.top, 8);
      this.commissionRedDot.setDepth(this.commissionBtn.depth + 1);
    }

    EventManager.getInstance().off('reddot:updated');
    EventManager.getInstance().on('reddot:updated', () => {
      this.setupCommissionRedDot();
    });
  }

  private openCommissionPanel(): void {
    if (this.commissionPanel) return;

    SaveManager.getInstance().viewCommissionPanel();

    this.commissionPanel = this.add.container(0, 0);
    this.commissionPanel.setDepth(100);

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0515, 0.95);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.setInteractive();
    this.commissionPanel.add(bg);

    const title = this.add.text(GAME_WIDTH / 2, 60, '📜 森林委托', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.commissionPanel.add(title);

    const desc = this.add.text(GAME_WIDTH / 2, 95, '完成森林精灵的委托，获得丰厚奖励', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#888888'
    }).setOrigin(0.5);
    this.commissionPanel.add(desc);

    const closeBtn = this.add.text(GAME_WIDTH - 50, 55, '✕', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.closeCommissionPanel());
    this.commissionPanel.add(closeBtn);

    this.commissionListContainer = this.add.container(0, 120);
    this.commissionPanel.add(this.commissionListContainer);

    this.renderCommissionChains();

    this.setupCommissionEventListeners();

    this.commissionPanel.setAlpha(0);
    this.tweens.add({
      targets: this.commissionPanel,
      alpha: 1,
      duration: 250
    });
  }

  private setupCommissionEventListeners(): void {
    EventManager.getInstance().on('commission:progress', () => {
      if (this.commissionPanel) this.renderCommissionChains();
    });
    EventManager.getInstance().on('commission:completed', () => {
      if (this.commissionPanel) this.renderCommissionChains();
    });
    EventManager.getInstance().on('commission:claimed', () => {
      if (this.commissionPanel) this.renderCommissionChains();
    });
    EventManager.getInstance().on('commissionchain:completed', () => {
      if (this.commissionPanel) this.renderCommissionChains();
    });
    EventManager.getInstance().on('commissionchain:claimed', () => {
      if (this.commissionPanel) this.renderCommissionChains();
    });
  }

  private closeCommissionPanel(): void {
    if (!this.commissionPanel) return;

    this.tweens.add({
      targets: this.commissionPanel,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        if (this.commissionPanel) {
          this.commissionPanel.destroy();
          this.commissionPanel = null;
          this.commissionListContainer = null;
        }
      }
    });
  }

  private renderCommissionChains(): void {
    if (!this.commissionListContainer) return;

    this.commissionListContainer.removeAll(true);

    const chains = SaveManager.getInstance().getCommissionTaskChains() || [];
    const tasks = SaveManager.getInstance().getCommissionTasks() || [];
    const state = SaveManager.getInstance().getGameState();
    const claimableCommissions = state.redDotState?.claimableCommissions || [];
    const claimableCommissionChains = state.redDotState?.claimableCommissionChains || [];

    let currentY = 0;

    chains.forEach(chain => {
      const chainTasks = chain.tasks
        .map(taskId => tasks.find(t => t.id === taskId))
        .filter((t): t is CollectionTask => t !== undefined)
        .sort((a, b) => a.order - b.order);

      const completedTasks = chainTasks.filter(
        t => t.status === CollectionTaskStatus.COMPLETED || t.status === CollectionTaskStatus.CLAIMED
      ).length;
      const chainProgress = chainTasks.length > 0 ? completedTasks / chainTasks.length : 0;

      const chainCardHeight = 100;
      const chainCardX = 30;
      const chainCardWidth = GAME_WIDTH - 60;

      const chainBg = this.add.graphics();
      chainBg.fillStyle(0x1a0a2e, 0.85);
      chainBg.fillRoundedRect(chainCardX, currentY, chainCardWidth, chainCardHeight, 16);
      chainBg.lineStyle(2, chain.color, 0.4);
      chainBg.strokeRoundedRect(chainCardX, currentY, chainCardWidth, chainCardHeight, 16);
      this.commissionListContainer!.add(chainBg);

      const chainIcon = this.add.text(chainCardX + 25, currentY + 25, chain.icon, {
        fontFamily: 'Arial',
        fontSize: '28px'
      }).setOrigin(0, 0.5);
      this.commissionListContainer!.add(chainIcon);

      const chainTitle = this.add.text(chainCardX + 65, currentY + 22, chain.title, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      this.commissionListContainer!.add(chainTitle);

      const chainDesc = this.add.text(chainCardX + 65, currentY + 45, chain.description, {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: '#888888'
      }).setOrigin(0, 0.5);
      this.commissionListContainer!.add(chainDesc);

      const progressBg = this.add.graphics();
      progressBg.fillStyle(0x000000, 0.5);
      progressBg.fillRoundedRect(chainCardX + 65, currentY + 62, chainCardWidth - 130, 12, 6);
      this.commissionListContainer!.add(progressBg);

      const progressFill = this.add.graphics();
      progressFill.fillStyle(chain.color, 1);
      progressFill.fillRoundedRect(chainCardX + 65, currentY + 62, (chainCardWidth - 130) * chainProgress, 12, 6);
      this.commissionListContainer!.add(progressFill);

      const progressText = this.add.text(
        chainCardX + chainCardWidth - 70, 
        currentY + 68, 
        `${completedTasks}/${chainTasks.length}`, {
          fontFamily: 'Arial',
          fontSize: '11px',
          color: '#ffffff',
          fontStyle: 'bold'
        }
      ).setOrigin(0.5);
      this.commissionListContainer!.add(progressText);

      if (chain.chainReward) {
        const claimable = chain.isChainComplete && !chain.chainClaimed;
        const chainRewardBtnBg = this.add.graphics();
        chainRewardBtnBg.fillStyle(chain.chainClaimed ? 0x444444 : claimable ? 0x4aa85c : 0x222222, claimable ? 1 : 0.7);
        chainRewardBtnBg.fillRoundedRect(chainCardX + chainCardWidth - 70, currentY + 15, 55, 32, 8);
        if (claimable) {
          chainRewardBtnBg.lineStyle(2, 0xffffff, 0.6);
          chainRewardBtnBg.strokeRoundedRect(chainCardX + chainCardWidth - 70, currentY + 15, 55, 32, 8);
        }
        this.commissionListContainer!.add(chainRewardBtnBg);

        const chainRewardBtnText = this.add.text(
          chainCardX + chainCardWidth - 42, 
          currentY + 31, 
          chain.chainClaimed ? '✓' : claimable ? '领取' : '🎁', {
            fontFamily: 'Arial',
            fontSize: claimable ? '13px' : '14px',
            color: '#ffffff',
            fontStyle: 'bold'
          }
        ).setOrigin(0.5).setInteractive({ useHandCursor: claimable });
        if (claimable) {
          chainRewardBtnText.on('pointerup', () => {
            SaveManager.getInstance().claimCommissionChain(chain.id);
            this.showToast('🎁 委托链奖励已领取！');
          });
        }
        this.commissionListContainer!.add(chainRewardBtnText);

        if (claimable && claimableCommissionChains.includes(chain.id)) {
          const redDot = this.add.graphics();
          redDot.fillStyle(0xff4444, 1);
          redDot.fillCircle(chainCardX + chainCardWidth - 20, currentY + 18, 5);
          this.commissionListContainer!.add(redDot);
        }
      }

      currentY += chainCardHeight + 15;

      chainTasks.forEach((task, taskIdx) => {
        const isLocked = task.status === CollectionTaskStatus.LOCKED;
        const isCompleted = task.status === CollectionTaskStatus.COMPLETED;
        const isClaimed = task.status === CollectionTaskStatus.CLAIMED;
        const isInProgress = task.status === CollectionTaskStatus.IN_PROGRESS;

        const taskCardHeight = 95;
        const taskCardX = 55;
        const taskCardWidth = GAME_WIDTH - 110;

        const taskBg = this.add.graphics();
        const taskBgColor = isLocked ? 0x15101f : isClaimed ? 0x0f1a0f : isCompleted ? 0x1a1f0f : 0x1a0a2e;
        taskBg.fillStyle(taskBgColor, 0.8);
        taskBg.fillRoundedRect(taskCardX, currentY, taskCardWidth, taskCardHeight, 12);
        const borderColor = isLocked ? 0x333333 : isClaimed ? 0x4aa85c : isCompleted ? 0xffaa00 : chain.color;
        taskBg.lineStyle(1.5, borderColor, isLocked ? 0.3 : 0.5);
        taskBg.strokeRoundedRect(taskCardX, currentY, taskCardWidth, taskCardHeight, 12);
        this.commissionListContainer!.add(taskBg);

        const orderText = this.add.text(taskCardX + 18, currentY + 22, `${task.order}`, {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: isLocked ? '#444444' : '#ffffff',
          backgroundColor: `rgba(${this.hexToRgb(chain.color)}, ${isLocked ? 0.15 : 0.4})`,
          padding: { x: 6, y: 2 }
        }).setOrigin(0.5);
        this.commissionListContainer!.add(orderText);

        const taskTitle = this.add.text(taskCardX + 45, currentY + 18, task.title, {
          fontFamily: 'Arial',
          fontSize: '15px',
          color: isLocked ? '#555555' : '#ffffff',
          fontStyle: 'bold'
        }).setOrigin(0, 0.5);
        this.commissionListContainer!.add(taskTitle);

        const taskDesc = this.add.text(taskCardX + 45, currentY + 40, task.description, {
          fontFamily: 'Arial',
          fontSize: '12px',
          color: isLocked ? '#444444' : '#aaaaaa'
        }).setOrigin(0, 0.5);
        this.commissionListContainer!.add(taskDesc);

        if (!isLocked) {
          const taskProgressBarBg = this.add.graphics();
          taskProgressBarBg.fillStyle(0x000000, 0.5);
          taskProgressBarBg.fillRoundedRect(taskCardX + 45, currentY + 58, taskCardWidth - 160, 10, 5);
          this.commissionListContainer!.add(taskProgressBarBg);

          const progressPct = task.targetCount > 0 ? task.currentCount / task.targetCount : 0;
          const taskProgressBarFill = this.add.graphics();
          taskProgressBarFill.fillStyle(isClaimed ? 0x4aa85c : isCompleted ? 0xffaa00 : chain.color, 1);
          taskProgressBarFill.fillRoundedRect(taskCardX + 45, currentY + 58, (taskCardWidth - 160) * Math.min(progressPct, 1), 10, 5);
          this.commissionListContainer!.add(taskProgressBarFill);

          const taskProgressText = this.add.text(
            taskCardX + taskCardWidth - 125, 
            currentY + 63, 
            `${task.currentCount}/${task.targetCount}`, {
              fontFamily: 'Arial',
              fontSize: '11px',
              color: isLocked ? '#555555' : '#ffffff',
              fontStyle: 'bold'
            }
          ).setOrigin(0, 0.5);
          this.commissionListContainer!.add(taskProgressText);

          const rewardText = this.add.text(taskCardX + 45, currentY + 78, 
            `🎁 ${task.reward.description}`, {
              fontFamily: 'Arial',
              fontSize: '11px',
              color: '#ffaacc'
            }
          ).setOrigin(0, 0.5);
          this.commissionListContainer!.add(rewardText);
        } else {
          const hintText = this.add.text(taskCardX + 45, currentY + 65, 
            `🔒 ${task.unlockHint}`, {
              fontFamily: 'Arial',
              fontSize: '12px',
              color: '#666666'
            }
          ).setOrigin(0, 0.5);
          this.commissionListContainer!.add(hintText);
        }

        const btnX = taskCardX + taskCardWidth - 60;
        const btnY = currentY + taskCardHeight / 2;
        
        if (isCompleted) {
          const claimBtnBg = this.add.graphics();
          claimBtnBg.fillStyle(0x4aa85c, 1);
          claimBtnBg.fillRoundedRect(btnX - 35, btnY - 16, 70, 32, 8);
          claimBtnBg.lineStyle(2, 0xffffff, 0.5);
          claimBtnBg.strokeRoundedRect(btnX - 35, btnY - 16, 70, 32, 8);
          this.commissionListContainer!.add(claimBtnBg);

          const claimBtn = this.add.text(btnX, btnY, '领取', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#ffffff',
            fontStyle: 'bold'
          }).setOrigin(0.5).setInteractive({ useHandCursor: true });
          claimBtn.on('pointerup', () => {
            SaveManager.getInstance().claimCommissionTask(task.id);
            this.showToast(`🎁 获得: ${task.reward.description}`);
          });
          this.commissionListContainer!.add(claimBtn);

          if (claimableCommissions.includes(task.id)) {
            const redDot = this.add.graphics();
            redDot.fillStyle(0xff4444, 1);
            redDot.fillCircle(btnX + 32, btnY - 14, 5);
            this.commissionListContainer!.add(redDot);
          }
        } else if (isClaimed) {
          const claimedText = this.add.text(btnX, btnY, '✓ 已领', {
            fontFamily: 'Arial',
            fontSize: '14px',
            color: '#4aa85c',
            fontStyle: 'bold'
          }).setOrigin(0.5);
          this.commissionListContainer!.add(claimedText);
        } else if (isInProgress) {
          const progressBtnBg = this.add.graphics();
          progressBtnBg.fillStyle(0x333333, 0.8);
          progressBtnBg.fillRoundedRect(btnX - 35, btnY - 16, 70, 32, 8);
          this.commissionListContainer!.add(progressBtnBg);

          const progressBtnText = this.add.text(btnX, btnY, '进行中', {
            fontFamily: 'Arial',
            fontSize: '12px',
            color: '#88ccff'
          }).setOrigin(0.5);
          this.commissionListContainer!.add(progressBtnText);
        } else {
          const lockedText = this.add.text(btnX, btnY, '🔒', {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#555555'
          }).setOrigin(0.5);
          this.commissionListContainer!.add(lockedText);
        }

        currentY += taskCardHeight + 8;
      });

      currentY += 20;
    });

    const scrollHeight = Math.max(currentY + 20, GAME_HEIGHT - 140);
    this.commissionListContainer.setSize(GAME_WIDTH, scrollHeight);
  }

  // ========== 成就系统 ==========

  private setupAchievementRedDot(): void {
    if (!this.achievementBtn) return;

    const state = SaveManager.getInstance().getGameState();
    const rd: Partial<RedDotState> = state.redDotState || {};
    const hasUnclaimed = (rd.newlyUnlockedAchievements?.length || 0) > 0 || 
                        (rd.claimableAchievements?.length || 0) > 0;

    if (this.achievementRedDot) {
      this.achievementRedDot.destroy();
      this.achievementRedDot = null;
    }

    if (hasUnclaimed) {
      const bounds = this.achievementBtn.getBounds();
      this.achievementRedDot = this.add.graphics();
      this.achievementRedDot.fillStyle(0xff4444, 1);
      this.achievementRedDot.fillCircle(bounds.right, bounds.top, 8);
      this.achievementRedDot.lineStyle(2, 0xffffff, 1);
      this.achievementRedDot.strokeCircle(bounds.right, bounds.top, 8);
      this.achievementRedDot.setDepth(this.achievementBtn.depth + 1);
    }
  }

  private setupGalleryRedDot(): void {
    if (!this.galleryBtn) return;

    const state = SaveManager.getInstance().getGameState();
    const rd: Partial<RedDotState> = state.redDotState || {};
    const hasUnclaimed = (rd.galleryNewUnlocks?.length || 0) > 0;

    if (this.galleryRedDot) {
      this.galleryRedDot.destroy();
      this.galleryRedDot = null;
    }

    if (hasUnclaimed) {
      const bounds = this.galleryBtn.getBounds();
      this.galleryRedDot = this.add.graphics();
      this.galleryRedDot.fillStyle(0xff4444, 1);
      this.galleryRedDot.fillCircle(bounds.right, bounds.top, 8);
      this.galleryRedDot.lineStyle(2, 0xffffff, 1);
      this.galleryRedDot.strokeCircle(bounds.right, bounds.top, 8);
      this.galleryRedDot.setDepth(this.galleryBtn.depth + 1);
    }
  }

  private openAchievementPanel(): void {
    if (this.achievementPanel) return;

    SaveManager.getInstance().markAllAchievementsViewed();
    this.setupAchievementRedDot();

    this.achievementPanel = this.add.container(0, 0).setDepth(100);

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0515, 0.97);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.setInteractive();
    this.achievementPanel.add(bg);

    const title = this.add.text(GAME_WIDTH / 2, 60, '🏆 成就殿堂', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.achievementPanel.add(title);

    const achievementStates = SaveManager.getInstance().getAchievementStates();
    const unlocked = achievementStates.filter(s => s.isUnlocked).length;
    const statsText = this.add.text(GAME_WIDTH / 2, 95, 
      `已解锁 ${unlocked} / ${ACHIEVEMENT_CONFIGS.length} 个成就`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#a8e6cf'
    }).setOrigin(0.5);
    this.achievementPanel.add(statsText);

    const closeBtn = this.add.text(GAME_WIDTH - 50, 55, '✕', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.closeAchievementPanel());
    this.achievementPanel.add(closeBtn);

    this.createAchievementCategoryTabs();

    this.achievementListContainer = this.add.container(0, 180);
    this.achievementPanel.add(this.achievementListContainer);
    this.renderAchievementList();

    this.setupAchievementEventListeners();

    this.achievementPanel.setAlpha(0);
    this.tweens.add({
      targets: this.achievementPanel,
      alpha: 1,
      duration: 250
    });
  }

  private closeAchievementPanel(): void {
    if (!this.achievementPanel) return;

    this.tweens.add({
      targets: this.achievementPanel,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        if (this.achievementPanel) {
          this.achievementPanel.destroy();
          this.achievementPanel = null;
          this.achievementListContainer = null;
          this.achievementCategoryTabs = [];
        }
      }
    });
  }

  private createAchievementCategoryTabs(): void {
    if (!this.achievementPanel) return;

    const categories: { key: AchievementCategory | 'all'; label: string; color: number; icon: string }[] = [
      { key: 'all', label: '全部', color: 0xffd700, icon: '🏆' },
      { key: AchievementCategory.COLLECTION, label: '收集', color: 0xff6b9d, icon: '🌸' },
      { key: AchievementCategory.SYNTHESIS, label: '合成', color: 0x87ceeb, icon: '⚗️' },
      { key: AchievementCategory.EXPLORATION, label: '探索', color: 0x4aa85c, icon: '🗺️' },
      { key: AchievementCategory.MILESTONE, label: '里程碑', color: 0xffaa00, icon: '⭐' },
      { key: AchievementCategory.HIDDEN, label: '隐藏', color: 0x9370db, icon: '❓' },
      { key: AchievementCategory.STORY, label: '剧情', color: 0x8b0000, icon: '📖' }
    ];

    const tabWidth = 85;
    const tabHeight = 55;
    const startX = 20;
    const tabY = 125;
    const spacing = 5;

    this.achievementCategoryTabs = [];

    categories.forEach((cat, index) => {
      const tabContainer = this.add.container(0, 0);
      const tabX = startX + index * (tabWidth + spacing);
      const isActive = this.currentAchievementCategory === cat.key;

      if (tabX + tabWidth > GAME_WIDTH - 20) return;

      const tabBg = this.add.graphics();
      tabBg.fillStyle(isActive ? cat.color : 0x1a0a2e, isActive ? 0.9 : 0.6);
      tabBg.fillRoundedRect(tabX, tabY, tabWidth, tabHeight, 10);
      tabBg.lineStyle(2, cat.color, isActive ? 1 : 0.4);
      tabBg.strokeRoundedRect(tabX, tabY, tabWidth, tabHeight, 10);

      const iconText = this.add.text(tabX + tabWidth / 2, tabY + 18, cat.icon, {
        fontFamily: 'Arial',
        fontSize: '18px'
      }).setOrigin(0.5);

      const labelText = this.add.text(tabX + tabWidth / 2, tabY + 40, cat.label, {
        fontFamily: 'Arial',
        fontSize: '11px',
        color: isActive ? '#ffffff' : '#aaaaaa'
      }).setOrigin(0.5);

      const hitZone = this.add.zone(tabX + tabWidth / 2, tabY + tabHeight / 2, tabWidth, tabHeight)
        .setInteractive({ useHandCursor: true });

      hitZone.on('pointerup', () => {
        this.currentAchievementCategory = cat.key;
        this.createAchievementCategoryTabs();
        this.renderAchievementList();
        AudioManager.getInstance().playSfx('sfx_click');
      });

      tabContainer.add([tabBg, iconText, labelText, hitZone]);
      this.achievementCategoryTabs.push(tabContainer);
      this.achievementPanel!.add(tabContainer);
    });
  }

  private renderAchievementList(): void {
    if (!this.achievementListContainer) return;

    this.achievementListContainer.removeAll(true);

    let filteredAchievements = ACHIEVEMENT_CONFIGS;
    if (this.currentAchievementCategory !== 'all') {
      filteredAchievements = ACHIEVEMENT_CONFIGS.filter(a => a.category === this.currentAchievementCategory);
    }

    const startY = 0;
    const itemHeight = 100;
    const itemWidth = GAME_WIDTH - 60;
    const spacing = 10;
    let currentY = startY;

    filteredAchievements
      .sort((a, b) => a.order - b.order)
      .forEach((config, index) => {
        const state = SaveManager.getInstance().getAchievementState(config.id);
        const isUnlocked = state?.isUnlocked || false;
        const isClaimed = state?.isClaimed || false;
        const isHidden = config.isHidden && !isUnlocked;
        const canClaim = isUnlocked && !isClaimed && !!config.reward;

        const y = currentY;
        const itemBg = this.add.graphics();

        if (isHidden) {
          itemBg.fillStyle(0x222233, 0.6);
        } else if (isClaimed) {
          itemBg.fillStyle(0x334433, 0.5);
        } else if (canClaim) {
          itemBg.fillStyle(0x4a4a1a, 0.5);
        } else if (isUnlocked) {
          itemBg.fillStyle(0x1a3a4a, 0.6);
        } else {
          itemBg.fillStyle(0x1a1a2e, 0.8);
        }
        itemBg.fillRoundedRect(30, y, itemWidth, itemHeight, 12);

        const borderColor = isClaimed ? 0x4aa85c : canClaim ? 0xffd700 : isUnlocked ? 0x4a8acf : 0x444466;
        itemBg.lineStyle(2, borderColor, isClaimed || canClaim ? 0.8 : 0.5);
        itemBg.strokeRoundedRect(30, y, itemWidth, itemHeight, 12);

        this.achievementListContainer!.add(itemBg);

        const rarityColors: Record<AchievementRarity, number> = {
          [AchievementRarity.COMMON]: 0xc0c0c0,
          [AchievementRarity.RARE]: 0x4169e1,
          [AchievementRarity.EPIC]: 0x9370db,
          [AchievementRarity.LEGENDARY]: 0xffd700
        };

        const iconBg = this.add.graphics();
        iconBg.fillStyle(rarityColors[config.rarity], isUnlocked ? 0.3 : 0.15);
        iconBg.fillRoundedRect(45, y + 15, 70, 70, 10);
        iconBg.lineStyle(2, rarityColors[config.rarity], isUnlocked ? 0.8 : 0.4);
        iconBg.strokeRoundedRect(45, y + 15, 70, 70, 10);
        this.achievementListContainer!.add(iconBg);

        const iconText = this.add.text(80, y + 50, isHidden ? '❓' : config.icon, {
          fontFamily: 'Arial',
          fontSize: '28px'
        }).setOrigin(0.5);
        this.achievementListContainer!.add(iconText);

        const title = this.add.text(130, y + 22, isHidden ? '??? 未发现的成就' : config.title, {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: isHidden ? '#666666' : (isUnlocked ? '#ffffff' : '#aaaaaa'),
          fontStyle: 'bold'
        });
        this.achievementListContainer!.add(title);

        const desc = this.add.text(130, y + 48, 
          isHidden ? (config.unlockHint || '完成特定条件后解锁详情') : config.description, {
          fontFamily: 'Arial',
          fontSize: '12px',
          color: isHidden ? '#555555' : '#888888',
          wordWrap: { width: itemWidth - 180 }
        });
        this.achievementListContainer!.add(desc);

        if (!isHidden && state) {
          const progress = state.progress / 100;
          const progressBg = this.add.graphics();
          progressBg.fillStyle(0x333344, 0.8);
          progressBg.fillRoundedRect(130, y + 75, itemWidth - 180, 12, 6);
          this.achievementListContainer!.add(progressBg);

          if (progress > 0 || isUnlocked) {
            const progressFill = this.add.graphics();
            progressFill.fillStyle(isUnlocked ? 0x4aa85c : 0x4a8acf, 0.9);
            progressFill.fillRoundedRect(130, y + 75, (itemWidth - 180) * (isUnlocked ? 1 : progress), 12, 6);
            this.achievementListContainer!.add(progressFill);
          }

          const progressText = this.add.text(130 + (itemWidth - 180) / 2, y + 81,
            isUnlocked ? '已完成' : `${state.currentCount} / ${state.targetCount}`, {
            fontFamily: 'Arial',
            fontSize: '10px',
            color: '#ffffff'
          }).setOrigin(0.5);
          this.achievementListContainer!.add(progressText);
        }

        const statusX = GAME_WIDTH - 60;
        let statusIcon = '';
        let statusColor = '#666666';

        if (canClaim) {
          statusIcon = '🎁';
          statusColor = '#ffd700';
        } else if (isClaimed) {
          statusIcon = '✅';
          statusColor = '#4aa85c';
        } else if (isUnlocked) {
          statusIcon = '🏆';
          statusColor = '#4a8acf';
        }

        if (statusIcon) {
          const statusText = this.add.text(statusX, y + itemHeight / 2, statusIcon, {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: statusColor
          }).setOrigin(0.5);
          this.achievementListContainer!.add(statusText);
        }

        if (canClaim) {
          const claimZone = this.add.zone(statusX, y + itemHeight / 2, 60, 60)
            .setInteractive({ useHandCursor: true });
          claimZone.on('pointerup', () => {
            const reward = SaveManager.getInstance().claimAchievementReward(config.id);
            if (reward) {
              this.showToast(`🎁 领取奖励：${reward.description}`);
              this.renderAchievementList();
              this.setupAchievementRedDot();
            }
          });
          this.achievementListContainer!.add(claimZone);
        }

        if (config.reward && !isHidden) {
          const rewardText = this.add.text(statusX, y + 15, '奖励', {
            fontFamily: 'Arial',
            fontSize: '10px',
            color: '#888888'
          }).setOrigin(0.5);
          this.achievementListContainer!.add(rewardText);
        }

        currentY += itemHeight + spacing;
      });

    const scrollHeight = Math.max(currentY + 20, GAME_HEIGHT - 200);
    this.achievementListContainer.setSize(GAME_WIDTH, scrollHeight);
  }

  private setupAchievementEventListeners(): void {
    EventManager.getInstance().on('achievement:progress', () => {
      if (this.achievementPanel) this.renderAchievementList();
    });
    EventManager.getInstance().on('achievement:unlocked', () => {
      if (this.achievementPanel) this.renderAchievementList();
      this.setupAchievementRedDot();
    });
    EventManager.getInstance().on('achievement:claimed', () => {
      if (this.achievementPanel) this.renderAchievementList();
      this.setupAchievementRedDot();
    });
  }

  // ========== 收藏馆/图鉴系统 ==========

  private openGalleryPanel(): void {
    if (this.galleryPanel) return;

    SaveManager.getInstance().markGalleryViewed();
    this.setupGalleryRedDot();

    this.galleryPanel = this.add.container(0, 0).setDepth(100);

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0515, 0.97);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.setInteractive();
    this.galleryPanel.add(bg);

    const title = this.add.text(GAME_WIDTH / 2, 60, '📚 收藏图鉴', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#c8a2ff',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.galleryPanel.add(title);

    const progress = SaveManager.getInstance().getGalleryProgress();
    const categories = Object.values(GalleryCategory);
    let totalItems = 0;
    let totalDiscovered = 0;
    categories.forEach(cat => {
      const items = GALLERY_ITEMS.filter(i => i.category === cat);
      totalItems += items.length;
      totalDiscovered += items.filter(i => progress.discoveredItems.includes(i.id)).length;
    });

    const statsText = this.add.text(GAME_WIDTH / 2, 95, 
      `已发现 ${totalDiscovered} / ${totalItems} 项 (${Math.floor(totalDiscovered / Math.max(1, totalItems) * 100)}%)`, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#a8e6cf'
    }).setOrigin(0.5);
    this.galleryPanel.add(statsText);

    const closeBtn = this.add.text(GAME_WIDTH - 50, 55, '✕', {
      fontFamily: 'Arial',
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.closeGalleryPanel());
    this.galleryPanel.add(closeBtn);

    this.createGalleryCategoryTabs();

    this.galleryListContainer = this.add.container(0, 180);
    this.galleryPanel.add(this.galleryListContainer);
    this.renderGalleryItems();

    this.galleryPanel.setAlpha(0);
    this.tweens.add({
      targets: this.galleryPanel,
      alpha: 1,
      duration: 250
    });
  }

  private closeGalleryPanel(): void {
    if (!this.galleryPanel) return;

    this.tweens.add({
      targets: this.galleryPanel,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        if (this.galleryPanel) {
          this.galleryPanel.destroy();
          this.galleryPanel = null;
          this.galleryListContainer = null;
          this.galleryCategoryTabs = [];
        }
      }
    });
  }

  private createGalleryCategoryTabs(): void {
    if (!this.galleryPanel) return;

    const categories: { key: GalleryCategory; label: string; color: number; icon: string }[] = [
      { key: GalleryCategory.NORMAL, label: '普通', color: 0xffb6c1, icon: GALLERY_CATEGORY_CONFIG[GalleryCategory.NORMAL].icon },
      { key: GalleryCategory.MUTATION, label: '变异', color: 0x9370db, icon: GALLERY_CATEGORY_CONFIG[GalleryCategory.MUTATION].icon },
      { key: GalleryCategory.FAILED, label: '失败', color: 0xa0522d, icon: GALLERY_CATEGORY_CONFIG[GalleryCategory.FAILED].icon },
      { key: GalleryCategory.REGION, label: '区域', color: 0x228b22, icon: GALLERY_CATEGORY_CONFIG[GalleryCategory.REGION].icon },
      { key: GalleryCategory.RECIPE, label: '配方', color: 0x8b4513, icon: GALLERY_CATEGORY_CONFIG[GalleryCategory.RECIPE].icon }
    ];

    const tabWidth = 95;
    const tabHeight = 55;
    const startX = 20;
    const tabY = 125;
    const spacing = 5;

    this.galleryCategoryTabs = [];

    categories.forEach((cat, index) => {
      const tabContainer = this.add.container(0, 0);
      const tabX = startX + index * (tabWidth + spacing);
      const isActive = this.currentGalleryCategory === cat.key;

      if (tabX + tabWidth > GAME_WIDTH - 20) return;

      const tabBg = this.add.graphics();
      tabBg.fillStyle(isActive ? cat.color : 0x1a0a2e, isActive ? 0.9 : 0.6);
      tabBg.fillRoundedRect(tabX, tabY, tabWidth, tabHeight, 10);
      tabBg.lineStyle(2, cat.color, isActive ? 1 : 0.4);
      tabBg.strokeRoundedRect(tabX, tabY, tabWidth, tabHeight, 10);

      const progress = SaveManager.getInstance().getGalleryProgress();
      const catItems = GALLERY_ITEMS.filter(i => i.category === cat.key);
      const discovered = catItems.filter(i => progress.discoveredItems.includes(i.id)).length;

      const iconText = this.add.text(tabX + tabWidth / 2, tabY + 18, cat.icon, {
        fontFamily: 'Arial',
        fontSize: '18px'
      }).setOrigin(0.5);

      const labelText = this.add.text(tabX + tabWidth / 2, tabY + 42, 
        `${cat.label} ${discovered}/${catItems.length}`, {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: isActive ? '#ffffff' : '#aaaaaa'
      }).setOrigin(0.5);

      const hitZone = this.add.zone(tabX + tabWidth / 2, tabY + tabHeight / 2, tabWidth, tabHeight)
        .setInteractive({ useHandCursor: true });

      hitZone.on('pointerup', () => {
        this.currentGalleryCategory = cat.key;
        this.createGalleryCategoryTabs();
        this.renderGalleryItems();
        AudioManager.getInstance().playSfx('sfx_click');
      });

      tabContainer.add([tabBg, iconText, labelText, hitZone]);
      this.galleryCategoryTabs.push(tabContainer);
      this.galleryPanel!.add(tabContainer);
    });
  }

  private renderGalleryItems(): void {
    if (!this.galleryListContainer) return;

    this.galleryListContainer.removeAll(true);

    const categoryItems = GALLERY_ITEMS.filter(i => i.category === this.currentGalleryCategory);
    const progress = SaveManager.getInstance().getGalleryProgress();

    const cols = 4;
    const itemSize = 150;
    const gap = 15;
    const startX = (GAME_WIDTH - cols * itemSize - (cols - 1) * gap) / 2;
    const startY = 10;

    categoryItems.forEach((item, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (itemSize + gap);
      const y = startY + row * (itemSize + gap);
      const isDiscovered = progress.discoveredItems.includes(item.id);

      const itemBg = this.add.graphics();
      itemBg.fillStyle(isDiscovered ? 0x1a2a3a : 0x1a1a2a, isDiscovered ? 0.9 : 0.7);
      itemBg.fillRoundedRect(x, y, itemSize, itemSize, 12);
      itemBg.lineStyle(2, isDiscovered ? item.color : 0x333344, isDiscovered ? 0.7 : 0.4);
      itemBg.strokeRoundedRect(x, y, itemSize, itemSize, 12);
      this.galleryListContainer!.add(itemBg);

      const iconSize = 48;
      const iconBg = this.add.graphics();
      iconBg.fillStyle(isDiscovered ? item.color : 0x444455, isDiscovered ? 0.25 : 0.3);
      iconBg.fillCircle(x + itemSize / 2, y + 45, iconSize / 2 + 5);
      this.galleryListContainer!.add(iconBg);

      const iconText = this.add.text(x + itemSize / 2, y + 45, isDiscovered ? item.icon : '❓', {
        fontFamily: 'Arial',
        fontSize: isDiscovered ? '32px' : '28px',
        color: isDiscovered ? '#ffffff' : '#555566'
      }).setOrigin(0.5);
      this.galleryListContainer!.add(iconText);

      const nameText = this.add.text(x + itemSize / 2, y + 92, 
        isDiscovered ? item.name : '???', {
        fontFamily: 'Arial',
        fontSize: '12px',
        color: isDiscovered ? '#ffffff' : '#555566',
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: itemSize - 10 }
      }).setOrigin(0.5);
      this.galleryListContainer!.add(nameText);

      const descText = this.add.text(x + itemSize / 2, y + 115,
        isDiscovered ? this.truncateText(item.description, 12) : this.truncateText(item.unlockHint, 12), {
        fontFamily: 'Arial',
        fontSize: '9px',
        color: isDiscovered ? '#888899' : '#444455',
        align: 'center',
        wordWrap: { width: itemSize - 10 }
      }).setOrigin(0.5, 0);
      this.galleryListContainer!.add(descText);

      if (isDiscovered) {
        const checkMark = this.add.text(x + itemSize - 15, y + 15, '✓', {
          fontFamily: 'Arial',
          fontSize: '14px',
          color: '#4aa85c',
          fontStyle: 'bold'
        }).setOrigin(0.5);
        this.galleryListContainer!.add(checkMark);
      }
    });

    const rows = Math.ceil(categoryItems.length / cols);
    const scrollHeight = Math.max(startY + rows * (itemSize + gap) + 20, GAME_HEIGHT - 200);
    this.galleryListContainer.setSize(GAME_WIDTH, scrollHeight);
  }

  private truncateText(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;
    return text.substring(0, maxChars) + '...';
  }
}
