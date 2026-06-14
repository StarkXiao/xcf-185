import Phaser from 'phaser';
import { Obstacle, Position } from '../types';
import { 
  WORLD_WIDTH, 
  WORLD_HEIGHT, 
  OBSTACLE_CONFIG,
  PLAYER_SPEED 
} from '../config/GameConfig';

export class ObstacleSystem {
  private scene: Phaser.Scene;
  private obstacles: Obstacle[] = [];
  private obstacleSprites: Phaser.GameObjects.Container[] = [];
  private obstacleGroup: Phaser.Physics.Arcade.StaticGroup | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public create(): void {
    this.obstacleGroup = this.scene.physics.add.staticGroup();
    this.generateObstacles();
    this.createObstacleSprites();
  }

  private generateObstacles(): void {
    this.obstacles = [];
    const centerX = WORLD_WIDTH / 2;
    const centerY = WORLD_HEIGHT / 2;
    const types: Array<'tree' | 'rock' | 'bush' | 'water'> = ['tree', 'rock', 'bush', 'water'];
    
    let attempts = 0;
    const maxAttempts = OBSTACLE_CONFIG.count * 10;

    while (this.obstacles.length < OBSTACLE_CONFIG.count && attempts < maxAttempts) {
      attempts++;
      
      const width = OBSTACLE_CONFIG.minSize + Math.random() * (OBSTACLE_CONFIG.maxSize - OBSTACLE_CONFIG.minSize);
      const height = OBSTACLE_CONFIG.minSize + Math.random() * (OBSTACLE_CONFIG.maxSize - OBSTACLE_CONFIG.minSize);
      const x = Math.random() * (WORLD_WIDTH - width);
      const y = Math.random() * (WORLD_HEIGHT - height);

      const distToCenter = Math.sqrt(
        Math.pow(x + width / 2 - centerX, 2) + 
        Math.pow(y + height / 2 - centerY, 2)
      );

      if (distToCenter < OBSTACLE_CONFIG.avoidRadius) continue;

      let overlaps = false;
      for (const existing of this.obstacles) {
        const padding = 50;
        if (
          x < existing.x + existing.width + padding &&
          x + width + padding > existing.x &&
          y < existing.y + existing.height + padding &&
          y + height + padding > existing.y
        ) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        this.obstacles.push({
          id: `obstacle_${this.obstacles.length}`,
          x,
          y,
          width,
          height,
          type: types[Math.floor(Math.random() * types.length)]
        });
      }
    }
  }

  private createObstacleSprites(): void {
    this.obstacles.forEach(obstacle => {
      const container = this.scene.add.container(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2);
      
      const graphics = this.scene.add.graphics();
      
      switch (obstacle.type) {
        case 'tree':
          this.drawTree(graphics, obstacle.width, obstacle.height);
          break;
        case 'rock':
          this.drawRock(graphics, obstacle.width, obstacle.height);
          break;
        case 'bush':
          this.drawBush(graphics, obstacle.width, obstacle.height);
          break;
        case 'water':
          this.drawWater(graphics, obstacle.width, obstacle.height);
          break;
      }

      container.add(graphics);
      container.setDepth(5);

      if (this.obstacleGroup) {
        const body = this.obstacleGroup.create(
          obstacle.x + obstacle.width / 2,
          obstacle.y + obstacle.height / 2
        ) as Phaser.Physics.Arcade.Sprite;
        
        if (body) {
          body.setSize(obstacle.width * 0.8, obstacle.height * 0.8);
          body.setDisplaySize(obstacle.width, obstacle.height);
          body.setVisible(false);
          body.setImmovable(true);
        }
      }

      this.obstacleSprites.push(container);
    });
  }

  private drawTree(graphics: Phaser.GameObjects.Graphics, width: number, height: number): void {
    const trunkWidth = width * 0.2;
    const trunkHeight = height * 0.4;
    
    graphics.fillStyle(0x4a3728);
    graphics.fillRoundedRect(-trunkWidth / 2, 0, trunkWidth, trunkHeight, 5);

    const crownColors = [0x1a4d2e, 0x2d5a3d, 0x1e5631];
    for (let i = 0; i < 3; i++) {
      const crownSize = width * (0.9 - i * 0.2);
      const crownY = -trunkHeight / 2 - i * height * 0.2;
      graphics.fillStyle(crownColors[i % crownColors.length]);
      graphics.beginPath();
      graphics.arc(0, crownY, crownSize / 2, 0, Math.PI * 2);
      graphics.fill();
    }

    graphics.fillStyle(0x228b22, 0.3);
    graphics.beginPath();
    graphics.arc(0, -trunkHeight / 2, width * 0.5, 0, Math.PI * 2);
    graphics.fill();
  }

  private drawRock(graphics: Phaser.GameObjects.Graphics, width: number, height: number): void {
    const rockGradient = [0x696969, 0x808080, 0x5a5a5a];
    
    graphics.fillStyle(rockGradient[0]);
    graphics.beginPath();
    
    const points = 8;
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const radius = (width / 2) * (0.7 + Math.random() * 0.3);
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * (height / 2) * (0.7 + Math.random() * 0.3);
      
      if (i === 0) {
        graphics.moveTo(px, py);
      } else {
        graphics.lineTo(px, py);
      }
    }
    graphics.closePath();
    graphics.fill();

    graphics.fillStyle(rockGradient[1], 0.5);
    graphics.beginPath();
    graphics.arc(-width * 0.15, -height * 0.1, width * 0.2, 0, Math.PI * 2);
    graphics.fill();

    graphics.fillStyle(0x404040, 0.4);
    graphics.beginPath();
    graphics.arc(width * 0.1, height * 0.15, width * 0.15, 0, Math.PI * 2);
    graphics.fill();
  }

  private drawBush(graphics: Phaser.GameObjects.Graphics, width: number, height: number): void {
    const bushColors = [0x228b22, 0x32cd32, 0x006400];
    
    for (let i = 0; i < 5; i++) {
      const offsetX = (Math.random() - 0.5) * width * 0.5;
      const offsetY = (Math.random() - 0.5) * height * 0.3;
      const size = width * (0.3 + Math.random() * 0.2);
      
      graphics.fillStyle(bushColors[i % bushColors.length]);
      graphics.beginPath();
      graphics.arc(offsetX, offsetY, size, 0, Math.PI * 2);
      graphics.fill();
    }

    for (let i = 0; i < 10; i++) {
      const berryX = (Math.random() - 0.5) * width * 0.6;
      const berryY = (Math.random() - 0.5) * height * 0.4;
      graphics.fillStyle(Math.random() > 0.5 ? 0xff6b6b : 0xffa500);
      graphics.beginPath();
      graphics.arc(berryX, berryY, 3, 0, Math.PI * 2);
      graphics.fill();
    }
  }

  private drawEllipse(graphics: Phaser.GameObjects.Graphics, x: number, y: number, radiusX: number, radiusY: number): void {
    graphics.save();
    graphics.translateCanvas(x, y);
    graphics.scaleCanvas(radiusX / radiusY, 1);
    graphics.beginPath();
    graphics.arc(0, 0, radiusY, 0, Math.PI * 2);
    graphics.restore();
  }

  private drawWater(graphics: Phaser.GameObjects.Graphics, width: number, height: number): void {
    graphics.fillStyle(0x1e90ff, 0.6);
    this.drawEllipse(graphics, 0, 0, width / 2, height / 2);
    graphics.fill();

    graphics.fillStyle(0x87ceeb, 0.4);
    this.drawEllipse(graphics, 0, -height * 0.1, width * 0.4, height * 0.35);
    graphics.fill();

    graphics.lineStyle(2, 0xffffff, 0.3);
    for (let i = 0; i < 3; i++) {
      const rippleSize = (width * 0.2) * (i + 1);
      this.drawEllipse(graphics, 0, 0, rippleSize, rippleSize * 0.6);
      graphics.stroke();
    }
  }

  public getObstacles(): Obstacle[] {
    return this.obstacles;
  }

  public getObstacleGroup(): Phaser.Physics.Arcade.StaticGroup | null {
    return this.obstacleGroup;
  }

  public checkCollision(x: number, y: number, radius: number = 20): boolean {
    for (const obstacle of this.obstacles) {
      const closestX = Math.max(obstacle.x, Math.min(x, obstacle.x + obstacle.width));
      const closestY = Math.max(obstacle.y, Math.min(y, obstacle.y + obstacle.height));
      const distance = Math.sqrt(
        Math.pow(x - closestX, 2) + Math.pow(y - closestY, 2)
      );
      if (distance < radius) return true;
    }
    return false;
  }

  public avoidObstacles(
    currentPos: Position,
    targetPos: Position,
    delta: number
  ): Position {
    const dx = targetPos.x - currentPos.x;
    const dy = targetPos.y - currentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < 1) return currentPos;

    const moveSpeed = PLAYER_SPEED * (delta / 1000);
    let moveX = (dx / distance) * moveSpeed;
    let moveY = (dy / distance) * moveSpeed;

    const checkRadius = 40;
    let avoidanceX = 0;
    let avoidanceY = 0;
    let hasObstacleNearby = false;

    for (const obstacle of this.obstacles) {
      const obstacleCenterX = obstacle.x + obstacle.width / 2;
      const obstacleCenterY = obstacle.y + obstacle.height / 2;
      
      const toObstacleX = obstacleCenterX - currentPos.x;
      const toObstacleY = obstacleCenterY - currentPos.y;
      const distToObstacle = Math.sqrt(toObstacleX * toObstacleX + toObstacleY * toObstacleY);
      
      const obstacleRadius = Math.max(obstacle.width, obstacle.height) / 2 + checkRadius;
      
      if (distToObstacle < obstacleRadius) {
        hasObstacleNearby = true;
        const avoidStrength = (obstacleRadius - distToObstacle) / obstacleRadius;
        
        const dotProduct = (dx * toObstacleX + dy * toObstacleY) / (distance * distToObstacle);
        
        if (dotProduct > 0) {
          avoidanceX -= (toObstacleX / distToObstacle) * avoidStrength * moveSpeed * 2;
          avoidanceY -= (toObstacleY / distToObstacle) * avoidStrength * moveSpeed * 2;
          
          const perpX = -toObstacleY / distToObstacle;
          const perpY = toObstacleX / distToObstacle;
          const perpDot = dx * perpX + dy * perpY;
          
          if (Math.abs(perpDot) > 0.1) {
            avoidanceX += perpX * Math.sign(perpDot) * moveSpeed * 0.5;
            avoidanceY += perpY * Math.sign(perpDot) * moveSpeed * 0.5;
          }
        }
      }
    }

    if (hasObstacleNearby) {
      moveX += avoidanceX;
      moveY += avoidanceY;
      
      const totalSpeed = Math.sqrt(moveX * moveX + moveY * moveY);
      if (totalSpeed > moveSpeed) {
        moveX = (moveX / totalSpeed) * moveSpeed;
        moveY = (moveY / totalSpeed) * moveSpeed;
      }
    }

    let newX = currentPos.x + moveX;
    let newY = currentPos.y + moveY;

    if (this.checkCollision(newX, currentPos.y, 25)) {
      newX = currentPos.x;
    }
    if (this.checkCollision(currentPos.x, newY, 25)) {
      newY = currentPos.y;
    }
    if (this.checkCollision(newX, newY, 25)) {
      newX = currentPos.x;
      newY = currentPos.y;
    }

    return { x: newX, y: newY };
  }

  public update(time: number, delta: number): void {
    this.obstacleSprites.forEach((sprite, index) => {
      const obstacle = this.obstacles[index];
      if (obstacle.type === 'water') {
        const wave = Math.sin(time * 0.002 + index) * 2;
        sprite.setScale(1 + wave * 0.02);
      } else if (obstacle.type === 'bush') {
        const sway = Math.sin(time * 0.0015 + index * 0.5) * 0.02;
        sprite.setRotation(sway);
      }
    });
  }

  public destroy(): void {
    if (this.obstacleGroup) {
      this.obstacleGroup.destroy();
    }
    this.obstacleSprites.forEach(sprite => sprite.destroy());
    this.obstacles = [];
  }
}
