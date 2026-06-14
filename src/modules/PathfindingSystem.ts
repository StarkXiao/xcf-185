import { Position, PathNode, Obstacle } from '../types';
import { WORLD_WIDTH, WORLD_HEIGHT, PATHFINDING_CONFIG } from '../config/GameConfig';

export class PathfindingSystem {
  private gridSize: number;
  private maxIterations: number;
  private obstacles: Obstacle[] = [];
  private gridWidth: number;
  private gridHeight: number;

  constructor() {
    this.gridSize = PATHFINDING_CONFIG.gridSize;
    this.maxIterations = PATHFINDING_CONFIG.maxIterations;
    this.gridWidth = Math.ceil(WORLD_WIDTH / this.gridSize);
    this.gridHeight = Math.ceil(WORLD_HEIGHT / this.gridSize);
  }

  public setObstacles(obstacles: Obstacle[]): void {
    this.obstacles = obstacles;
  }

  public findPath(start: Position, end: Position): Position[] | null {
    const startNode: PathNode = {
      x: Math.floor(start.x / this.gridSize),
      y: Math.floor(start.y / this.gridSize),
      g: 0,
      h: 0,
      f: 0,
      parent: null
    };

    const endNode: PathNode = {
      x: Math.floor(end.x / this.gridSize),
      y: Math.floor(end.y / this.gridSize),
      g: 0,
      h: 0,
      f: 0,
      parent: null
    };

    if (this.isObstacleAt(endNode.x, endNode.y)) {
      const nearest = this.findNearestWalkable(endNode);
      if (nearest) {
        endNode.x = nearest.x;
        endNode.y = nearest.y;
      } else {
        return null;
      }
    }

    const openList: PathNode[] = [startNode];
    const closedList: Set<string> = new Set();
    const nodeMap: Map<string, PathNode> = new Map();
    nodeMap.set(`${startNode.x},${startNode.y}`, startNode);

    let iterations = 0;

    while (openList.length > 0 && iterations < this.maxIterations) {
      iterations++;
      openList.sort((a, b) => a.f - b.f);
      const current = openList.shift()!;
      const currentKey = `${current.x},${current.y}`;

      if (current.x === endNode.x && current.y === endNode.y) {
        return this.reconstructPath(current);
      }

      closedList.add(currentKey);

      const neighbors = this.getNeighbors(current);

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;

        if (closedList.has(neighborKey) || this.isObstacleAt(neighbor.x, neighbor.y)) {
          continue;
        }

        const tentativeG = current.g + 1;
        const existingNode = nodeMap.get(neighborKey);

        if (!existingNode || tentativeG < existingNode.g) {
          neighbor.g = tentativeG;
          neighbor.h = this.heuristic(neighbor, endNode);
          neighbor.f = neighbor.g + neighbor.h;
          neighbor.parent = current;

          if (!existingNode) {
            openList.push(neighbor);
            nodeMap.set(neighborKey, neighbor);
          }
        }
      }
    }

    return null;
  }

  private getNeighbors(node: PathNode): PathNode[] {
    const neighbors: PathNode[] = [];
    const directions = [
      { x: 0, y: -1 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: -1 },
      { x: 1, y: -1 },
      { x: -1, y: 1 },
      { x: 1, y: 1 }
    ];

    for (const dir of directions) {
      const nx = node.x + dir.x;
      const ny = node.y + dir.y;

      if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
        if (dir.x !== 0 && dir.y !== 0) {
          if (this.isObstacleAt(node.x + dir.x, node.y) || this.isObstacleAt(node.x, node.y + dir.y)) {
            continue;
          }
        }

        neighbors.push({
          x: nx,
          y: ny,
          g: 0,
          h: 0,
          f: 0,
          parent: null
        });
      }
    }

    return neighbors;
  }

  private isObstacleAt(gridX: number, gridY: number): boolean {
    const worldX = gridX * this.gridSize;
    const worldY = gridY * this.gridSize;
    const padding = this.gridSize * 0.3;

    for (const obstacle of this.obstacles) {
      if (
        worldX + this.gridSize > obstacle.x - padding &&
        worldX < obstacle.x + obstacle.width + padding &&
        worldY + this.gridSize > obstacle.y - padding &&
        worldY < obstacle.y + obstacle.height + padding
      ) {
        return true;
      }
    }

    return false;
  }

  private findNearestWalkable(targetNode: PathNode): PathNode | null {
    const maxRadius = 10;
    
    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          
          const nx = targetNode.x + dx;
          const ny = targetNode.y + dy;
          
          if (nx >= 0 && nx < this.gridWidth && ny >= 0 && ny < this.gridHeight) {
            if (!this.isObstacleAt(nx, ny)) {
              return { x: nx, y: ny, g: 0, h: 0, f: 0, parent: null };
            }
          }
        }
      }
    }
    
    return null;
  }

  private heuristic(a: PathNode, b: PathNode): number {
    const dx = Math.abs(a.x - b.x);
    const dy = Math.abs(a.y - b.y);
    return dx + dy + (Math.sqrt(2) - 2) * Math.min(dx, dy);
  }

  private reconstructPath(endNode: PathNode): Position[] {
    const path: Position[] = [];
    let current: PathNode | null = endNode;

    while (current) {
      path.unshift({
        x: current.x * this.gridSize + this.gridSize / 2,
        y: current.y * this.gridSize + this.gridSize / 2
      });
      current = current.parent;
    }

    if (PATHFINDING_CONFIG.smoothPath && path.length > 2) {
      return this.smoothPath(path);
    }

    return path;
  }

  private smoothPath(path: Position[]): Position[] {
    if (path.length <= 2) return path;

    const smoothed: Position[] = [path[0]];
    let currentIndex = 0;

    while (currentIndex < path.length - 1) {
      let farthestIndex = currentIndex + 1;

      for (let i = path.length - 1; i > currentIndex + 1; i--) {
        if (this.hasLineOfSight(path[currentIndex], path[i])) {
          farthestIndex = i;
          break;
        }
      }

      smoothed.push(path[farthestIndex]);
      currentIndex = farthestIndex;
    }

    return smoothed;
  }

  private hasLineOfSight(start: Position, end: Position): boolean {
    const steps = Math.ceil(Math.max(
      Math.abs(end.x - start.x),
      Math.abs(end.y - start.y)
    ) / (this.gridSize / 2));

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const x = start.x + (end.x - start.x) * t;
      const y = start.y + (end.y - start.y) * t;

      for (const obstacle of this.obstacles) {
        if (
          x > obstacle.x &&
          x < obstacle.x + obstacle.width &&
          y > obstacle.y &&
          y < obstacle.y + obstacle.height
        ) {
          return false;
        }
      }
    }

    return true;
  }

  public isPositionWalkable(x: number, y: number): boolean {
    const gridX = Math.floor(x / this.gridSize);
    const gridY = Math.floor(y / this.gridSize);
    return !this.isObstacleAt(gridX, gridY);
  }
}
