import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SAVE_VERSION } from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { AudioManager } from '../managers/AudioManager';
import { SaveBackupInfo, SaveValidationResult } from '../types';

export class MenuScene extends Phaser.Scene {
  private particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private titleGlow: Phaser.GameObjects.Text | null = null;
  private savePanel: Phaser.GameObjects.Container | null = null;
  private backupListContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('Menu');
  }

  create(): void {
    AudioManager.getInstance().setScene(this);
    AudioManager.getInstance().playBgm('bgm_menu');

    this.createBackground();
    this.createTitle();
    this.createButtons();
    this.createFloatingPetals();
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
    const startY = GAME_HEIGHT * 0.48;
    const hasSave = SaveManager.getInstance().hasSave();

    if (hasSave) {
      this.createButton('继续游戏', startY, () => {
        this.scene.start('Game', { continueGame: true });
      });
      this.createButton('新的开始', startY + 100, () => {
        SaveManager.getInstance().resetGame();
        this.scene.start('Game', { continueGame: false });
      });
    } else {
      this.createButton('开始游戏', startY, () => {
        SaveManager.getInstance().resetGame();
        this.scene.start('Game', { continueGame: false });
      });
    }

    const isMuted = AudioManager.getInstance().isMuted();
    const muteBtn = this.createButton(isMuted ? '🔇 开启音效' : '🔊 关闭音效', startY + 200, () => {
      const newMuted = AudioManager.getInstance().toggleMute();
      muteBtn.setText(newMuted ? '🔇 开启音效' : '🔊 关闭音效');
    }, 0x666666);

    this.createButton('💾 存档管理', startY + 300, () => {
      this.toggleSavePanel();
    }, 0x667788);
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
  }
}
