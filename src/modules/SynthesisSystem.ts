import Phaser from 'phaser';
import { PetalType, SynthesisRecipe, SynthesisResultType, SynthesisResultData, MutationOutcome, FailOutcome, AudioContextType, EndingSettlementData } from '../types';
import { SYNTHESIS_RECIPES, PETAL_CONFIGS } from '../config/GameConfig';
import { SaveManager } from '../managers/SaveManager';
import { EventManager } from '../managers/EventManager';
import { AudioManager } from '../managers/AudioManager';
import { EndingAwakeningSystem } from './EndingAwakeningSystem';

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
    if (!SaveManager.getInstance().isRecipeUnlocked(recipeId)) return false;

    const state = SaveManager.getInstance().getGameState();
    return recipe.inputs.every(input => 
      (state.petals[input.type] || 0) >= input.count
    );
  }

  public getAvailableRecipes(): SynthesisRecipe[] {
    return this.availableRecipes.filter(recipe => 
      SaveManager.getInstance().isRecipeUnlocked(recipe.id) && this.canSynthesize(recipe.id)
    );
  }

  public getAllRecipes(): SynthesisRecipe[] {
    return this.availableRecipes.filter(recipe => 
      SaveManager.getInstance().isRecipeUnlocked(recipe.id)
    );
  }

  public synthesize(recipeId: string): boolean {
    if (this.isSynthesizing) return false;

    const recipe = this.availableRecipes.find(r => r.id === recipeId);
    if (!recipe || !this.canSynthesize(recipeId)) {
      EventManager.getInstance().emit('synthesis:fail', {
        recipeId,
        resultType: SynthesisResultType.FAIL,
        output: PetalType.FAILED_DUST,
        count: 0
      } as SynthesisResultData);
      return false;
    }

    this.isSynthesizing = true;
    EventManager.getInstance().emit('synthesis:start', { recipeId });
    EventManager.getInstance().emit('audio:play', { key: 'sfx_synthesis_start', volume: 0.4 });

    const result = this.determineSynthesisResult(recipe);

    recipe.inputs.forEach(input => {
      SaveManager.getInstance().removePetals(input.type, input.count);
    });

    this.playSynthesisAnimation(recipe, result, () => {
      this.processSynthesisResult(recipe, result);
      this.isSynthesizing = false;
    });

    return true;
  }

  private determineSynthesisResult(recipe: SynthesisRecipe): SynthesisResultData {
    const rand = Math.random();
    const failChance = recipe.failChance || 0;
    const mutationChance = recipe.mutationChance || 0;

    if (rand < failChance && recipe.failOutcomes && recipe.failOutcomes.length > 0) {
      const failType = this.selectOutcome(recipe.failOutcomes);
      const returnedPetals = this.computeReturnedPetals(recipe, failType);
      
      return {
        recipeId: recipe.id,
        resultType: SynthesisResultType.FAIL,
        output: failType.type,
        count: 1,
        returnedPetals
      };
    }

    if (rand < failChance + mutationChance && recipe.mutationOutcomes && recipe.mutationOutcomes.length > 0) {
      const mutationType = this.selectOutcome(recipe.mutationOutcomes);
      
      return {
        recipeId: recipe.id,
        resultType: SynthesisResultType.MUTATION,
        output: mutationType.type,
        count: 1
      };
    }

    return {
      recipeId: recipe.id,
      resultType: SynthesisResultType.NORMAL,
      output: recipe.output.type,
      count: recipe.output.count
    };
  }

  private selectOutcome<T extends { probability: number }>(outcomes: T[]): T {
    const total = outcomes.reduce((sum, o) => sum + o.probability, 0);
    let rand = Math.random() * total;
    
    for (const outcome of outcomes) {
      rand -= outcome.probability;
      if (rand <= 0) return outcome;
    }
    return outcomes[outcomes.length - 1];
  }

  private computeReturnedPetals(recipe: SynthesisRecipe, failOutcome: FailOutcome): { type: PetalType; count: number }[] {
    const returned: { type: PetalType; count: number }[] = [];
    const ratio = failOutcome.returnRatio || 0;

    recipe.inputs.forEach(input => {
      const returnCount = Math.floor(input.count * ratio);
      if (returnCount > 0) {
        returned.push({ type: input.type, count: returnCount });
      }
    });

    return returned;
  }

  private processSynthesisResult(recipe: SynthesisRecipe, result: SynthesisResultData): void {
    if (result.resultType === SynthesisResultType.FAIL) {
      if (result.returnedPetals) {
        result.returnedPetals.forEach(rp => {
          SaveManager.getInstance().addPetal(rp.type, rp.count);
        });
      }
      SaveManager.getInstance().addFailedPetal(result.output, result.count);
      SaveManager.getInstance().addSynthesisRecord(recipe.id, result);

      EventManager.getInstance().emit('synthesis:fail', result);
      EventManager.getInstance().emit('audio:play', { key: 'sfx_synthesis_fail', volume: 0.5 });
      
      const hint = recipe.hintFail || '合成失败了...';
      this.showHintToast(hint, 0xff6b6b);

    } else if (result.resultType === SynthesisResultType.MUTATION) {
      SaveManager.getInstance().addMutationPetal(result.output, result.count);
      SaveManager.getInstance().incrementSynthesized();
      SaveManager.getInstance().updateCommissionForSynthesizeOutput(result.output, result.count);
      SaveManager.getInstance().addSynthesisRecord(recipe.id, result);

      EventManager.getInstance().emit('synthesis:mutation', result);
      EventManager.getInstance().emit('synthesis:complete', result);
      EventManager.getInstance().emit('audio:play', { key: 'sfx_synthesis_mutation', volume: 0.6 });

      const hint = recipe.hintMutation || '发生了奇妙的变异！';
      this.showHintToast(hint, 0xffaa00);

    } else {
      SaveManager.getInstance().addPetal(result.output, result.count);
      SaveManager.getInstance().incrementSynthesized();
      SaveManager.getInstance().updateCommissionForSynthesizeOutput(result.output, result.count);
      SaveManager.getInstance().addSynthesisRecord(recipe.id, result);

      EventManager.getInstance().emit('synthesis:complete', result);
      EventManager.getInstance().emit('audio:play', { key: 'sfx_synthesis_complete', volume: 0.5 });

      const hint = recipe.hintNormal || '合成成功！';
      this.showHintToast(hint, 0xa8e6cf);

      if (result.output === PetalType.WAKEUP) {
        this.triggerWakeUpSequence();
      }
    }
  }

  private showHintToast(message: string, color: number): void {
    const camera = this.scene.cameras.main;
    const centerX = camera.scrollX + camera.width / 2;
    
    const hintText = this.scene.add.text(centerX, camera.scrollY + 200, message, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: `#${color.toString(16).padStart(6, '0')}`,
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(200).setAlpha(0).setScrollFactor(0);

    this.scene.tweens.add({
      targets: hintText,
      alpha: 1,
      y: camera.scrollY + 180,
      duration: 400,
      ease: 'Back.Out'
    });

    this.scene.tweens.add({
      targets: hintText,
      alpha: 0,
      y: camera.scrollY + 160,
      duration: 600,
      delay: 2400,
      ease: 'Cubic.In',
      onComplete: () => hintText.destroy()
    });
  }

  private playSynthesisAnimation(
    recipe: SynthesisRecipe, 
    result: SynthesisResultData,
    onComplete: () => void
  ): void {
    const camera = this.scene.cameras.main;
    const centerX = camera.scrollX + camera.width / 2;
    const centerY = camera.scrollY + camera.height / 2;

    if (result.resultType === SynthesisResultType.FAIL) {
      this.playFailAnimation(recipe, centerX, centerY, onComplete);
    } else if (result.resultType === SynthesisResultType.MUTATION) {
      this.playMutationAnimation(recipe, result, centerX, centerY, onComplete);
    } else {
      this.playNormalAnimation(recipe, result, centerX, centerY, onComplete);
    }
  }

  private playNormalAnimation(
    recipe: SynthesisRecipe, 
    result: SynthesisResultData,
    centerX: number, 
    centerY: number, 
    onComplete: () => void
  ): void {
    const camera = this.scene.cameras.main;
    const magicCircle = this.createMagicCircle(centerX, centerY, 0xa8e6cf);
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

    this.animateInputPetals(inputPetals, centerX, centerY);

    this.scene.time.delayedCall(1200, () => {
      this.createExplosionParticles(centerX, centerY, result.output, 0xa8e6cf);
    });

    this.scene.time.delayedCall(1500, () => {
      if (glowImg) glowImg.destroy();
      magicCircle.destroy();
      inputPetals.forEach(p => p.destroy());

      if (recipe.animationType === 'explode') {
        camera.shake(300, 0.01);
        camera.flash(500, 255, 255, 255);
      }

      this.spawnResultPetal(result.output, centerX, centerY);
      onComplete();
    });
  }

  private playMutationAnimation(
    recipe: SynthesisRecipe, 
    result: SynthesisResultData,
    centerX: number, 
    centerY: number, 
    onComplete: () => void
  ): void {
    const camera = this.scene.cameras.main;
    const magicCircle = this.createMagicCircle(centerX, centerY, 0xffaa00);
    const inputPetals = this.createInputPetals(recipe, centerX, centerY);
    
    const glitchCircle = this.scene.add.graphics().setDepth(70);
    for (let i = 0; i < 5; i++) {
      glitchCircle.lineStyle(2, 0xff6600, 0.6);
      glitchCircle.strokeCircle(centerX, centerY, 70 + i * 20);
    }

    this.scene.tweens.add({
      targets: magicCircle,
      rotation: Math.PI * 6,
      scale: { from: 0.3, to: 1.8 },
      alpha: { from: 0, to: 1 },
      duration: 1800,
      ease: 'Elastic.Out'
    });

    this.scene.tweens.add({
      targets: glitchCircle,
      rotation: -Math.PI * 4,
      scale: { from: 0.5, to: 2 },
      alpha: { from: 0.8, to: 0 },
      duration: 1800,
      ease: 'Cubic.In'
    });

    const glowImg = (magicCircle as any)._glowImg;
    if (glowImg) {
      this.scene.tweens.add({
        targets: glowImg,
        scale: { from: 0.5, to: 2 },
        alpha: { from: 0, to: 1 },
        duration: 1800,
        ease: 'Elastic.Out'
      });
    }

    this.animateInputPetals(inputPetals, centerX, centerY, 600);

    this.scene.time.delayedCall(800, () => {
      for (let i = 0; i < 3; i++) {
        this.scene.time.delayedCall(i * 150, () => {
          camera.shake(100, 0.008);
        });
      }
    });

    this.scene.time.delayedCall(1400, () => {
      this.createMutationParticles(centerX, centerY);
    });

    this.scene.time.delayedCall(1800, () => {
      if (glowImg) glowImg.destroy();
      magicCircle.destroy();
      glitchCircle.destroy();
      inputPetals.forEach(p => p.destroy());

      camera.flash(400, 255, 170, 0);
      this.spawnResultPetal(result.output, centerX, centerY, true);
      onComplete();
    });
  }

  private playFailAnimation(
    recipe: SynthesisRecipe, 
    centerX: number, 
    centerY: number, 
    onComplete: () => void
  ): void {
    const camera = this.scene.cameras.main;
    const magicCircle = this.createMagicCircle(centerX, centerY, 0xff6b6b);
    const inputPetals = this.createInputPetals(recipe, centerX, centerY);

    this.scene.tweens.add({
      targets: magicCircle,
      rotation: Math.PI * 2,
      scale: { from: 0.5, to: 1.2 },
      alpha: { from: 0, to: 0.8 },
      duration: 1000,
      ease: 'Cubic.Out'
    });

    const glowImg = (magicCircle as any)._glowImg;
    if (glowImg) {
      this.scene.tweens.add({
        targets: glowImg,
        scale: { from: 0.5, to: 1 },
        alpha: { from: 0, to: 0.6 },
        duration: 1000,
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
        duration: 400,
        delay: index * 80,
        ease: 'Back.Out'
      });

      this.scene.tweens.add({
        targets: petal,
        x: centerX + (Math.random() - 0.5) * 80,
        y: centerY + (Math.random() - 0.5) * 80,
        alpha: 0,
        scale: 0.3,
        rotation: Math.PI * 2,
        duration: 600,
        delay: 500 + index * 80,
        ease: 'Cubic.In'
      });
    });

    this.scene.time.delayedCall(900, () => {
      this.createFailParticles(centerX, centerY);
      camera.shake(200, 0.015);
    });

    this.scene.time.delayedCall(1200, () => {
      if (glowImg) glowImg.destroy();
      magicCircle.destroy();
      inputPetals.forEach(p => p.destroy());

      camera.flash(300, 255, 80, 80);
      onComplete();
    });
  }

  private animateInputPetals(
    petals: Phaser.GameObjects.Image[], 
    centerX: number, 
    centerY: number,
    baseDelay: number = 500
  ): void {
    petals.forEach((petal, index) => {
      const angle = (index / petals.length) * Math.PI * 2;
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
        delay: baseDelay + index * 100,
        ease: 'Cubic.In'
      });
    });
  }

  private createMagicCircle(x: number, y: number, color: number): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics().setDepth(70);

    const glowTextureKey = `magic_circle_glow_${color}`;
    if (!this.scene.textures.exists(glowTextureKey)) {
      const glowCanvas = this.scene.textures.createCanvas(glowTextureKey, 240, 240);
      const glowCtx = glowCanvas.getContext();
      const center = 120;
      const r = (color >> 16) & 255;
      const g = (color >> 8) & 255;
      const b = color & 255;
      const grad = glowCtx.createRadialGradient(center, center, 0, center, center, 120);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.3)`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
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
      
      graphics.lineStyle(3, color, alpha);
      graphics.beginPath();
      graphics.arc(x, y, radius, 0, Math.PI * 2);
      graphics.strokePath();

      const runeCount = 6 + i * 2;
      for (let j = 0; j < runeCount; j++) {
        const angle = (j / runeCount) * Math.PI * 2;
        const rx = x + Math.cos(angle) * radius;
        const ry = y + Math.sin(angle) * radius;
        
        graphics.fillStyle(color, alpha);
        graphics.fillCircle(rx, ry, 4);
      }
    }

    return graphics;
  }

  private createInputPetals(recipe: SynthesisRecipe, x: number, y: number): Phaser.GameObjects.Image[] {
    const petals: Phaser.GameObjects.Image[] = [];

    recipe.inputs.forEach((input) => {
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

  private createExplosionParticles(x: number, y: number, outputType: PetalType, color: number): void {
    const config = PETAL_CONFIGS[outputType];
    
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

  private createMutationParticles(x: number, y: number): void {
    const colors = [0xffaa00, 0xff6600, 0xffdd00, 0xff8800];
    
    colors.forEach((color, i) => {
      this.scene.time.delayedCall(i * 80, () => {
        const particles = this.scene.add.particles(x, y, 'pixel_white', {
          lifespan: 1200,
          speed: { min: 150, max: 400 },
          angle: { min: 0, max: 360 },
          scale: { start: 4, end: 0 },
          alpha: { start: 1, end: 0 },
          quantity: 20,
          blendMode: 'ADD',
          tint: color
        });

        this.scene.time.delayedCall(1200, () => particles.destroy());
      });
    });

    const ring = this.scene.add.graphics().setDepth(75);
    for (let i = 0; i < 4; i++) {
      this.scene.time.delayedCall(i * 100, () => {
        ring.clear();
        ring.lineStyle(4, 0xffaa00, 0.8 - i * 0.2);
        ring.beginPath();
        ring.arc(x, y, 30 + i * 40, 0, Math.PI * 2);
        ring.strokePath();
      });
    }
    this.scene.time.delayedCall(600, () => ring.destroy());
  }

  private createFailParticles(x: number, y: number): void {
    const particles = this.scene.add.particles(x, y, 'pixel_white', {
      lifespan: 1500,
      speed: { min: 50, max: 150 },
      angle: { min: 180, max: 360 },
      gravityY: 200,
      scale: { start: 5, end: 1 },
      alpha: { start: 1, end: 0 },
      quantity: 25,
      blendMode: 'NORMAL',
      tint: 0x666666
    });

    this.scene.time.delayedCall(1500, () => particles.destroy());

    const smoke = this.scene.add.particles(x, y, 'pixel_white', {
      lifespan: 2000,
      speed: { min: 20, max: 60 },
      angle: { min: 160, max: 200 },
      scale: { start: 2, end: 6 },
      alpha: { start: 0.6, end: 0 },
      quantity: 15,
      blendMode: 'NORMAL',
      tint: 0x444444,
      delay: 200
    });

    this.scene.time.delayedCall(2200, () => smoke.destroy());
  }

  private spawnResultPetal(type: PetalType, x: number, y: number, isMutation: boolean = false): void {
    const petalSystem = (this.scene as any).petalSystem;
    if (petalSystem && petalSystem.spawnSynthesisResult) {
      petalSystem.spawnSynthesisResult(type, x, y, isMutation);
    }
  }

  private triggerWakeUpSequence(): void {
    const state = SaveManager.getInstance().getGameState();

    AudioManager.getInstance().switchContext(AudioContextType.COMPLETE);

    EventManager.getInstance().emit('game:complete', {
      playTime: state.playTime,
      totalCollected: state.totalCollected
    });

    const endingSystem = (this.scene as any).endingAwakeningSystem as EndingAwakeningSystem | undefined;

    if (endingSystem) {
      endingSystem.onWakeUpTriggered();
      const settlementData = endingSystem.generateSettlementData();

      this.scene.cameras.main.fadeOut(2000, 255, 255, 255);

      this.scene.time.delayedCall(2500, () => {
        this.scene.scene.start('Result', { endingSettlementData: settlementData });
      });
    } else {
      this.scene.cameras.main.fadeOut(2000, 255, 255, 255);

      this.scene.time.delayedCall(2500, () => {
        this.scene.scene.start('Result');
      });
    }
  }

  public getRecipeById(recipeId: string): SynthesisRecipe | undefined {
    return this.availableRecipes.find(r => r.id === recipeId);
  }

  public isSynthesisInProgress(): boolean {
    return this.isSynthesizing;
  }

  public getMutationChance(recipeId: string): number {
    const recipe = this.getRecipeById(recipeId);
    return recipe?.mutationChance || 0;
  }

  public getFailChance(recipeId: string): number {
    const recipe = this.getRecipeById(recipeId);
    return recipe?.failChance || 0;
  }
}
