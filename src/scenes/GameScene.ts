import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../config/GameConfig';
import { SceneRenderer } from '../modules/SceneRenderer';
import { PlayerController } from '../modules/PlayerController';
import { PetalSystem } from '../modules/PetalSystem';
import { SynthesisSystem } from '../modules/SynthesisSystem';
import { UIManager } from '../modules/UIManager';
import { AudioManager } from '../managers/AudioManager';
import { SaveManager } from '../managers/SaveManager';

export class GameScene extends Phaser.Scene {
  private sceneRenderer!: SceneRenderer;
  private playerController!: PlayerController;
  private petalSystem!: PetalSystem;
  private synthesisSystem!: SynthesisSystem;
  private uiManager!: UIManager;
  private saveTimer: number = 0;
  private playTimeTimer: number = 0;
  private trendTimer: number = 0;
  private readonly TREND_INTERVAL: number = 30000;

  constructor() {
    super('Game');
  }

  init(data: { continueGame?: boolean }): void {
    if (!data.continueGame) {
      SaveManager.getInstance().resetGame();
    }
  }

  create(): void {
    AudioManager.getInstance().setScene(this);
    AudioManager.getInstance().playBgm('bgm_main');

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.sceneRenderer = new SceneRenderer(this);
    this.sceneRenderer.create();

    this.playerController = new PlayerController(this);
    this.playerController.create();

    this.petalSystem = new PetalSystem(this);
    this.petalSystem.create();

    this.synthesisSystem = new SynthesisSystem(this);

    this.uiManager = new UIManager(this, this.synthesisSystem);
    this.uiManager.create();

    (this as any).petalSystem = this.petalSystem;

    SaveManager.getInstance().addTrendPoint();

    this.events.on('shutdown', () => this.destroy());
    this.events.on('pause', () => this.pause());
    this.events.on('resume', () => this.resume());
  }

  update(time: number, delta: number): void {
    this.sceneRenderer.update(time, delta);
    this.playerController.update(time, delta);
    
    const collectRange = this.playerController.getCollectRange();
    const attractRange = this.playerController.getAttractRange();
    this.petalSystem.update(time, delta, this.playerController.getPlayer(), collectRange, attractRange);

    this.playTimeTimer += delta;
    if (this.playTimeTimer >= 1000) {
      SaveManager.getInstance().updatePlayTime(1);
      this.playTimeTimer = 0;
    }

    this.saveTimer += delta;
    if (this.saveTimer >= 10000) {
      const state = SaveManager.getInstance().getGameState();
      SaveManager.getInstance().saveGame(state);
      this.saveTimer = 0;
    }

    this.trendTimer += delta;
    if (this.trendTimer >= this.TREND_INTERVAL) {
      SaveManager.getInstance().addTrendPoint();
      this.trendTimer = 0;
    }
  }

  pause(): void {
    const state = SaveManager.getInstance().getGameState();
    SaveManager.getInstance().saveGame(state);
  }

  resume(): void {
    AudioManager.getInstance().setScene(this);
  }

  destroy(): void {
    const state = SaveManager.getInstance().getGameState();
    SaveManager.getInstance().saveGame(state);

    if (this.sceneRenderer) {
      this.sceneRenderer.destroy();
    }
    if (this.playerController) {
      this.playerController.destroy();
    }
    if (this.petalSystem) {
      this.petalSystem.destroy();
    }
    if (this.uiManager) {
      this.uiManager.destroy();
    }
  }
}
