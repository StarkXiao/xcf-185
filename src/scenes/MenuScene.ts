import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SAVE_VERSION } from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { SaveBackupInfo, SaveValidationResult, AudioContextType } from '../types';

export class MenuScene extends Phaser.Scene {
  private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private titleGlow: Phaser.GameObjects.Text | null = null;
  private savePanel: Phaser.GameObjects.Container | null = null;
  private backupListContainer: Phaser.GameObjects.Container | null = null;
  private audioPanel: Phaser.GameObjects.Container | null = null;
  private dailyRewardPanel: Phaser.GameObjects.Container | null = null;
  private goalsPanel: Phaser.GameObjects.Container | null = null;
  private progressPanel: Phaser.GameObjects.Container | null = null;

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

      this.createButton('📊 最近进度', currentY, () => {
        this.openProgressPanel();
      }, 0x4aa85c);
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
  }
}
