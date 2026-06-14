import Phaser from 'phaser';
import { PetalType, SynthesisRecipe } from '../types';
import { SYNTHESIS_RECIPES, PETAL_CONFIGS } from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { EventManager } from '../managers/EventManager';

export class SynthesisSystem {
  private scene: Phaser.Scene;
  private availableRecipes: SynthesisRecipe[] = [];
  private isSynthesizing = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.availableRecipes = [...SYNTHESIS_RECIPES];
  }

  public canSynthesize(recipeId: string): boolean {
    const recipe = this.availableRecipes.find(r => r.id === recipeId);
    if (!recipe) return false;

    const state = SaveManager.getInstance().getGameState();
    return recipe.inputs.every(input => 
      (state.petals[input.type] || 0) >= input.count
    );
  }

  public getAvailableRecipes(): SynthesisRecipe[] {
    return this.availableRecipes.filter(recipe => this.canSynthesize(recipe.id));
  }

  public getAllRecipes(): SynthesisRecipe[] {
    return [...this.availableRecipes];
  }

  public synthesize(recipeId: string): boolean {
    if (this.isSynthesizing) return false;

    const recipe = this.availableRecipes.find(r => r.id === recipeId);
    if (!recipe || !this.canSynthesize(recipeId)) {
      EventManager.getInstance().emit('synthesis:fail', { reason: '材料不足' });
      return false;
    }

    this.isSynthesizing = true;
    EventManager.getInstance().emit('synthesis:start', { recipeId });
    EventManager.getInstance().emit('audio:play', { key: 'sfx_synthesis_start', volume: 0.4 });

    recipe.inputs.forEach(input => {
      SaveManager.getInstance().removePetals(input.type, input.count);
    });

    this.playSynthesisAnimation(recipe, () => {
      SaveManager.getInstance().addPetal(recipe.output.type, recipe.output.count);
      SaveManager.getInstance().incrementSynthesized();
      
      EventManager.getInstance().emit('synthesis:complete', { 
        output: recipe.output.type, 
        count: recipe.output.count 
      });
      EventManager.getInstance().emit('audio:play', { key: 'sfx_synthesis_complete', volume: 0.5 });

      if (recipe.output.type === PetalType.WAKEUP) {
        this.triggerWakeUpSequence();
      }

      this.isSynthesizing = false;
    });

    return true;
  }

  private playSynthesisAnimation(recipe: SynthesisRecipe, onComplete: () => void): void {
    const camera = this.scene.cameras.main;
    const centerX = camera.scrollX + camera.width / 2;
    const centerY = camera.scrollY + camera.height / 2;

    const magicCircle = this.createMagicCircle(centerX, centerY);
    const inputPetals = this.createInputPetals(recipe, centerX, centerY);

    this.scene.tweens.add({
      targets: magicCircle,
      rotation: Math.PI * 4,
      scale: { from: 0.5, to: 1.5 },
      alpha: { from: 0, to: 1 },
      duration: 1500,
      ease: 'Cubic.Out'
    });
    const glowImg = (magicCircle as any)._glowImg;
    if (glowImg) {
      this.scene.tweens.add({
        targets: glowImg,
        scale: { from: 0.5, to: 1.5 },
        alpha: { from: 0, to: 1 },
        duration: 1500,
        ease: 'Cubic.Out'
      });
    }

    inputPetals.forEach((petal, index) => {
      const angle = (index / inputPetals.length) * Math.PI * 2;
      const startX = centerX + Math.cos(angle) * 150;
      const startY = centerY + Math.sin(angle) * 150;

      petal.setPosition(startX, startY);
      petal.setAlpha(0);
      petal.setScale(0.5);

      this.scene.tweens.add({
        targets: petal,
        alpha: 1,
        scale: 1,
        duration: 500,
        delay: index * 100,
        ease: 'Back.Out'
      });

      this.scene.tweens.add({
        targets: petal,
        x: centerX,
        y: centerY,
        scale: 0,
        alpha: 0,
        duration: 800,
        delay: 500 + index * 100,
        ease: 'Cubic.In'
      });
    });

    this.scene.time.delayedCall(1200, () => {
      this.createExplosionParticles(centerX, centerY, recipe);
    });

    this.scene.time.delayedCall(1500, () => {
      if (glowImg) glowImg.destroy();
      magicCircle.destroy();
      inputPetals.forEach(p => p.destroy());

      if (recipe.animationType === 'explode') {
        camera.shake(300, 0.01);
        camera.flash(500, 255, 255, 255);
      }

      const petalSystem = (this.scene as any).petalSystem;
      if (petalSystem && petalSystem.spawnSynthesisResult) {
        petalSystem.spawnSynthesisResult(recipe.output.type, centerX, centerY);
      }

      onComplete();
    });
  }

  private createMagicCircle(x: number, y: number): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics().setDepth(70);

    const glowTextureKey = 'magic_circle_glow';
    if (!this.scene.textures.exists(glowTextureKey)) {
      const glowCanvas = this.scene.textures.createCanvas(glowTextureKey, 240, 240);
      const glowCtx = glowCanvas.getContext();
      const center = 120;
      const grad = glowCtx.createRadialGradient(center, center, 0, center, center, 120);
      grad.addColorStop(0, 'rgba(168, 230, 207, 0.3)');
      grad.addColorStop(1, 'rgba(168, 230, 207, 0)');
      glowCtx.fillStyle = grad;
      glowCtx.beginPath();
      glowCtx.arc(center, center, 120, 0, Math.PI * 2);
      glowCtx.fill();
      glowCanvas.refresh();
    }

    const glowImg = this.scene.add.image(x, y, glowTextureKey).setDepth(70);
    (graphics as any)._glowImg = glowImg;

    for (let i = 0; i < 3; i++) {
      const radius = 80 + i * 25;
      const alpha = 0.5 - i * 0.15;
      
      graphics.lineStyle(3, 0xa8e6cf, alpha);
      graphics.beginPath();
      graphics.arc(x, y, radius, 0, Math.PI * 2);
      graphics.strokePath();

      const runeCount = 6 + i * 2;
      for (let j = 0; j < runeCount; j++) {
        const angle = (j / runeCount) * Math.PI * 2;
        const rx = x + Math.cos(angle) * radius;
        const ry = y + Math.sin(angle) * radius;
        
        graphics.fillStyle(0xa8e6cf, alpha);
        graphics.fillCircle(rx, ry, 4);
      }
    }

    return graphics;
  }

  private createInputPetals(recipe: SynthesisRecipe, x: number, y: number): Phaser.GameObjects.Image[] {
    const petals: Phaser.GameObjects.Image[] = [];

    recipe.inputs.forEach((input, index) => {
      const config = PETAL_CONFIGS[input.type];
      for (let i = 0; i < input.count; i++) {
        const petal = this.scene.add.image(x, y, `petal_${input.type}`)
          .setDepth(71)
          .setBlendMode(Phaser.BlendModes.ADD);
        petal.setTint(config.color);
        petals.push(petal);
      }
    });

    return petals;
  }

  private createExplosionParticles(x: number, y: number, recipe: SynthesisRecipe): void {
    const config = PETAL_CONFIGS[recipe.output.type];
    
    const particles = this.scene.add.particles(x, y, 'pixel_white', {
      lifespan: 1000,
      speed: { min: 100, max: 300 },
      angle: { min: 0, max: 360 },
      scale: { start: 3, end: 0 },
      alpha: { start: 1, end: 0 },
      quantity: 30,
      blendMode: 'ADD',
      tint: config.glowColor
    });

    this.scene.time.delayedCall(1000, () => {
      particles.destroy();
    });
  }

  private triggerWakeUpSequence(): void {
    const state = SaveManager.getInstance().getGameState();
    
    EventManager.getInstance().emit('game:complete', {
      playTime: state.playTime,
      totalCollected: state.totalCollected
    });

    this.scene.cameras.main.fadeOut(2000, 255, 255, 255);
    
    this.scene.time.delayedCall(2500, () => {
      this.scene.scene.start('Result');
    });
  }

  public getRecipeById(recipeId: string): SynthesisRecipe | undefined {
    return this.availableRecipes.find(r => r.id === recipeId);
  }

  public isSynthesisInProgress(): boolean {
    return this.isSynthesizing;
  }
}
