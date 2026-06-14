import Phaser from 'phaser';
import './style.css';
import { GAME_WIDTH, GAME_HEIGHT, PETAL_CONFIGS, SYNTHESIS_RECIPES } from './config/GameConfig';
import { PreloaderScene } from './scenes/PreloaderScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';
import { SaveManager } from './managers/SaveManager';
import { EventManager } from './managers/EventManager';
import { AudioManager } from './managers/AudioManager';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'app',
  backgroundColor: '#1a0a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    min: {
      width: 375,
      height: 667
    },
    max: {
      width: 1500,
      height: 2668
    }
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  },
  input: {
    activePointers: 2,
    touch: {
      capture: true
    },
    mouse: {
      target: null
    }
  },
  scene: [PreloaderScene, MenuScene, GameScene, ResultScene]
};

window.addEventListener('load', () => {
  const game = new Phaser.Game(config);
  (window as any).game = game;
  (window as any).SaveManager = SaveManager.getInstance();
  (window as any).EventManager = EventManager.getInstance();
  (window as any).AudioManager = AudioManager.getInstance();
  (window as any).PETAL_CONFIGS = PETAL_CONFIGS;
  (window as any).SYNTHESIS_RECIPES = SYNTHESIS_RECIPES;

  game.events.on('ready', () => {
    console.log('🌙 梦境森林游戏已启动');
  });

  window.addEventListener('resize', () => {
    game.scale.resize(window.innerWidth, window.innerHeight);
  });

  window.addEventListener('beforeunload', () => {
    game.destroy(true);
  });

  if ('serviceWorker' in navigator) {
    console.log('ℹ️  Service Worker support available');
  }
});
