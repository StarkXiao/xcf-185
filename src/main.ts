import Phaser from 'phaser';
import './style.css';
import { GAME_WIDTH, GAME_HEIGHT } from './config/GameConfig';
import { PreloaderScene } from './scenes/PreloaderScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { ResultScene } from './scenes/ResultScene';

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
