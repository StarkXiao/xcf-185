export enum PetalType {
  MOONLIGHT = 'moonlight',
  STARLIGHT = 'starlight',
  DEW = 'dew',
  GLOWING = 'glowing',
  DREAM = 'dream',
  ETERNAL = 'eternal',
  WAKEUP = 'wakeup',
  MOONLIGHT_SHIMMER = 'moonlight_shimmer',
  STARLIGHT_BURST = 'starlight_burst',
  DEW_CRYSTAL = 'dew_crystal',
  GLOWING_EMBER = 'glowing_ember',
  DREAM_PHANTOM = 'dream_phantom',
  FAILED_DUST = 'failed_dust',
  FAILED_SLIME = 'failed_slime',
  FAILED_ASH = 'failed_ash'
}

export enum GameStateKey {
  MENU = 'Menu',
  PRELOADER = 'Preloader',
  GAME = 'Game',
  RESULT = 'Result'
}

export enum GoalType {
  COLLECT_PETAL = 'collect_petal',
  SYNTHESIZE_RECIPE = 'synthesize_recipe',
  UNLOCK_PETAL = 'unlock_petal',
  UNLOCK_RECIPE = 'unlock_recipe',
  TOTAL_COLLECTED = 'total_collected',
  TOTAL_SYNTHESIZED = 'total_synthesized'
}

export enum GoalStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CLAIMED = 'claimed'
}

export enum QuickEntryType {
  SYNTHESIS = 'synthesis',
  COLLECTION = 'collection',
  GOAL = 'goal',
  RECIPE_HINT = 'recipe_hint',
  AUTO_SAVE = 'auto_save'
}

export enum StatusType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error'
}

export interface ResourceTrendPoint {
  timestamp: number;
  totalCollected: number;
  totalSynthesized: number;
  totalMutations: number;
  totalFailures: number;
  petalCounts: Record<PetalType, number>;
}

export interface SynthesisRecord {
  id: string;
  timestamp: number;
  recipeId: string;
  recipeName: string;
  resultType: SynthesisResultType;
  inputs: { type: PetalType; count: number }[];
  output: { type: PetalType; count: number };
  returnedPetals?: { type: PetalType; count: number }[];
}

export interface Goal {
  id: string;
  type: GoalType;
  title: string;
  description: string;
  target: PetalType | string;
  targetCount: number;
  currentCount: number;
  status: GoalStatus;
  reward?: string;
  priority: number;
}

export interface QuickEntry {
  id: QuickEntryType;
  label: string;
  icon: string;
  color: number;
  badge?: string;
  enabled: boolean;
}

export interface StatusMessage {
  id: string;
  type: StatusType;
  title: string;
  content?: string;
  timestamp: number;
  duration: number;
  persistent?: boolean;
}

export enum SynthesisResultType {
  NORMAL = 'normal',
  MUTATION = 'mutation',
  FAIL = 'fail'
}

export interface PetalConfig {
  type: PetalType;
  name: string;
  level: number;
  color: number;
  glowColor: number;
  spawnWeight: number;
  description: string;
  isMutation?: boolean;
  isFailed?: boolean;
  category: 'normal' | 'mutation' | 'failed';
}

export interface MutationOutcome {
  type: PetalType;
  probability: number;
}

export interface FailOutcome {
  type: PetalType;
  probability: number;
  returnRatio: number;
}

export interface SynthesisRecipe {
  id: string;
  inputs: { type: PetalType; count: number }[];
  output: { type: PetalType; count: number };
  animationType: 'merge' | 'transform' | 'explode';
  mutationChance?: number;
  mutationOutcomes?: MutationOutcome[];
  failChance?: number;
  failOutcomes?: FailOutcome[];
  hintNormal?: string;
  hintMutation?: string;
  hintFail?: string;
}

export interface GameState {
  playerX: number;
  playerY: number;
  petals: Record<PetalType, number>;
  unlockedPetals: PetalType[];
  totalCollected: number;
  totalSynthesized: number;
  totalMutations: number;
  totalFailures: number;
  playTime: number;
  isCompleted: boolean;
  hasWakeUp: boolean;
  unlockedRecipes: string[];
  discoveredMutations: PetalType[];
  discoveredFailures: PetalType[];
  resourceTrend: ResourceTrendPoint[];
  synthesisRecords: SynthesisRecord[];
  goals: Goal[];
  activeStatusMessages: StatusMessage[];
  lastSaveTime: number;
}

export interface SaveData {
  version: string;
  timestamp: number;
  gameState: GameState;
  settings: {
    bgmVolume: number;
    sfxVolume: number;
    isMuted: boolean;
  };
}

export interface PetalObject extends Phaser.Physics.Arcade.Sprite {
  petalType: PetalType;
  isCollecting: boolean;
  floatOffset: number;
}

export interface SynthesisResultData {
  recipeId: string;
  resultType: SynthesisResultType;
  output: PetalType;
  count: number;
  returnedPetals?: { type: PetalType; count: number }[];
}

export interface GameEvents {
  'petal:collected': { type: PetalType; count: number };
  'petal:spawned': { type: PetalType; x: number; y: number };
  'synthesis:start': { recipeId: string };
  'synthesis:complete': SynthesisResultData;
  'synthesis:mutation': SynthesisResultData;
  'synthesis:fail': SynthesisResultData;
  'synthesis:recipe_unlocked': { recipeId: string };
  'synthesis:record_added': { record: SynthesisRecord };
  'collection:unlock': { type: PetalType; category: 'normal' | 'mutation' | 'failed' };
  'game:complete': { playTime: number; totalCollected: number };
  'audio:play': { key: string; volume?: number };
  'save:update': { state: GameState };
  'trend:updated': { point: ResourceTrendPoint };
  'goal:progress': { goalId: string; current: number; target: number };
  'goal:completed': { goal: Goal };
  'goal:claimed': { goal: Goal };
  'status:show': { message: StatusMessage };
  'status:dismiss': { id: string };
  'quickentry:action': { type: QuickEntryType };
}

export interface Position {
  x: number;
  y: number;
}
