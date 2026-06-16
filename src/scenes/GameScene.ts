import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../config/GameConfig';
import { SceneRenderer } from '../modules/SceneRenderer';
import { PlayerController } from '../modules/PlayerController';
import { PetalSystem } from '../modules/PetalSystem';
import { SynthesisSystem } from '../modules/SynthesisSystem';
import { UIManager } from '../modules/UIManager';
import { TimeSystem } from '../modules/TimeSystem';
import { WeatherSystem } from '../modules/WeatherSystem';
import { RareDropSystem } from '../modules/RareDropSystem';
import { VisitorSpriteSystem } from '../modules/VisitorSpriteSystem';
import { RegionUnlockSystem } from '../modules/RegionUnlockSystem';
import { PetalWorkshopSystem } from '../modules/PetalWorkshopSystem';
import { StoryChapterSystem } from '../modules/StoryChapterSystem';
import { AchievementSystem } from '../modules/AchievementSystem';
import { AudioManager } from '../managers/AudioManager';
import { SaveManager } from '../managers/SaveManager';
import { EventManager } from '../managers/EventManager';
import { AudioContextType, StatusType } from '../types';

export class GameScene extends Phaser.Scene {
  private sceneRenderer!: SceneRenderer;
  private playerController!: PlayerController;
  private petalSystem!: PetalSystem;
  private synthesisSystem!: SynthesisSystem;
  private uiManager!: UIManager;
  private timeSystem!: TimeSystem;
  private weatherSystem!: WeatherSystem;
  private rareDropSystem!: RareDropSystem;
  private visitorSpriteSystem!: VisitorSpriteSystem;
  private regionUnlockSystem!: RegionUnlockSystem;
  private petalWorkshopSystem!: PetalWorkshopSystem;
  private storyChapterSystem!: StoryChapterSystem;
  private achievementSystem!: AchievementSystem;
  private saveTimer: number = 0;
  private playTimeTimer: number = 0;
  private trendTimer: number = 0;
  private readonly TREND_INTERVAL: number = 30000;
  private useInheritance: boolean = false;
  public player!: Phaser.Physics.Arcade.Sprite;

  constructor() {
    super('Game');
  }

  init(data: { continueGame?: boolean; useInheritance?: boolean }): void {
    this.useInheritance = data.useInheritance || false;
    
    if (!data.continueGame && !data.useInheritance) {
      SaveManager.getInstance().resetGame();
    }
  }

  create(): void {
    AudioManager.getInstance().setScene(this);
    AudioManager.getInstance().switchContext(AudioContextType.EXPLORE);

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.sceneRenderer = new SceneRenderer(this);
    this.sceneRenderer.create();

    this.timeSystem = new TimeSystem(this);
    this.timeSystem.create();

    this.weatherSystem = new WeatherSystem(this);
    this.weatherSystem.create();

    this.playerController = new PlayerController(this);
    this.playerController.create();
    this.player = this.playerController.getPlayer();

    this.petalSystem = new PetalSystem(this);
    this.petalSystem.create();
    this.petalSystem.setPlayer(this.playerController.getPlayer());

    const state = SaveManager.getInstance().getGameState();
    if (state.efficiencyBoost && state.efficiencyBoost > 0) {
      this.petalSystem.setEfficiencyBoost(state.efficiencyBoost);
    }

    this.rareDropSystem = new RareDropSystem(this);
    this.rareDropSystem.setPetalSystem(this.petalSystem);
    this.rareDropSystem.create();

    this.visitorSpriteSystem = new VisitorSpriteSystem(this);
    this.visitorSpriteSystem.create();

    this.regionUnlockSystem = new RegionUnlockSystem(this);
    this.regionUnlockSystem.create();

    this.playerController.setRegionUnlockSystem(this.regionUnlockSystem);

    this.petalWorkshopSystem = new PetalWorkshopSystem(this);
    this.petalWorkshopSystem.create();

    this.storyChapterSystem = new StoryChapterSystem(this);
    this.storyChapterSystem.create();

    this.achievementSystem = new AchievementSystem(this);
    this.achievementSystem.create();

    this.synthesisSystem = new SynthesisSystem(this);

    this.uiManager = new UIManager(this, this.synthesisSystem, this.visitorSpriteSystem, this.regionUnlockSystem, this.petalWorkshopSystem);
    this.uiManager.create();

    this.petalSystem.setRegionUnlockSystem(this.regionUnlockSystem);

    (this as any).petalSystem = this.petalSystem;
    (this as any).player = this.player;
    (this as any).regionUnlockSystem = this.regionUnlockSystem;
    (this as any).storyChapterSystem = this.storyChapterSystem;

    this.setupRegionEventListeners();

    SaveManager.getInstance().addTrendPoint();

    this.events.on('shutdown', () => this.destroy());
    this.events.on('pause', () => this.pause());
    this.events.on('resume', () => this.resume());
  }

  private setupRegionEventListeners(): void {
    EventManager.getInstance().on('region:navigate_request', (data) => {
      if (this.regionUnlockSystem) {
        this.regionUnlockSystem.teleportToRegion(data.regionId);
      }
    });

    EventManager.getInstance().on('region:entered', (data) => {
      this.handleRegionEntered(data.regionId);
    });
  }

  private handleRegionEntered(regionId: string): void {
    const config = this.regionUnlockSystem.getRegionConfig(regionId);
    if (!config) return;

    if (this.sceneRenderer) {
      this.sceneRenderer.setRegionAmbiance(config.ambiance);
    }

    if (this.petalSystem) {
      this.petalSystem.onRegionChanged(regionId);
    }

    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.time.delayedCall(200, () => {
      this.cameras.main.fadeIn(300, 0, 0, 0);
    });

    EventManager.getInstance().emit('status:show', {
      message: {
        id: `region_enter_${Date.now()}`,
        type: StatusType.INFO,
        title: `📍 ${config.name}`,
        content: config.description,
        timestamp: Date.now(),
        duration: 3000
      }
    });
  }

  update(time: number, delta: number): void {
    this.timeSystem.update(time, delta);
    this.weatherSystem.update(time, delta);
    this.sceneRenderer.update(time, delta);
    this.playerController.update(time, delta);
    
    const collectRange = this.playerController.getCollectRange();
    const attractRange = this.playerController.getAttractRange();
    this.petalSystem.update(time, delta, this.playerController.getPlayer(), collectRange, attractRange);
    
    this.rareDropSystem.update(time, delta);
    this.visitorSpriteSystem.update(time, delta);
    this.regionUnlockSystem.update(time, delta);
    this.petalWorkshopSystem.update(time, delta);
    this.storyChapterSystem.update(time, delta);

    this.playTimeTimer += delta;
    if (this.playTimeTimer >= 1000) {
      SaveManager.getInstance().updatePlayTime(1);
      const state = SaveManager.getInstance().getGameState();
      EventManager.getInstance().emit('playtime:update', { playTime: state.playTime });
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

    if (this.timeSystem) {
      this.timeSystem.destroy();
    }
    if (this.weatherSystem) {
      this.weatherSystem.destroy();
    }
    if (this.rareDropSystem) {
      this.rareDropSystem.destroy();
    }
    if (this.visitorSpriteSystem) {
      this.visitorSpriteSystem.destroy();
    }
    if (this.regionUnlockSystem) {
      this.regionUnlockSystem.destroy();
    }
    if (this.petalWorkshopSystem) {
      this.petalWorkshopSystem.destroy();
    }
    if (this.storyChapterSystem) {
      this.storyChapterSystem.destroy();
    }
    if (this.achievementSystem) {
      this.achievementSystem.destroy();
    }
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
