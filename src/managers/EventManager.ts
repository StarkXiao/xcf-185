import Phaser from 'phaser';
import { GameEvents } from '../types';

export class EventManager {
  private static instance: EventManager;
  private eventEmitter: Phaser.Events.EventEmitter;

  private constructor() {
    this.eventEmitter = new Phaser.Events.EventEmitter();
  }

  public static getInstance(): EventManager {
    if (!EventManager.instance) {
      EventManager.instance = new EventManager();
    }
    return EventManager.instance;
  }

  public emit<K extends keyof GameEvents>(event: K, data: GameEvents[K]): void {
    this.eventEmitter.emit(event, data);
  }

  public on<K extends keyof GameEvents>(
    event: K,
    callback: (data: GameEvents[K]) => void,
    context?: unknown
  ): void {
    this.eventEmitter.on(event, callback, context);
  }

  public off<K extends keyof GameEvents>(
    event: K,
    callback?: (data: GameEvents[K]) => void,
    context?: unknown
  ): void {
    if (callback) {
      this.eventEmitter.off(event, callback, context);
    } else {
      this.eventEmitter.removeListener(event);
    }
  }

  public removeEventListener<K extends keyof GameEvents>(event: K): void {
    this.eventEmitter.removeListener(event);
  }

  public once<K extends keyof GameEvents>(
    event: K,
    callback: (data: GameEvents[K]) => void,
    context?: unknown
  ): void {
    this.eventEmitter.once(event, callback, context);
  }

  public removeAllListeners(): void {
    this.eventEmitter.removeAllListeners();
  }

  public destroy(): void {
    this.eventEmitter.removeAllListeners();
    this.eventEmitter.destroy();
  }
}
