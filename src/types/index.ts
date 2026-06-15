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

export enum AudioContextType {
  MENU = 'menu',
  EXPLORE = 'explore',
  SYNTHESIS = 'synthesis',
  COMPLETE = 'complete'
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
  regionName?: string;
  regionDescription?: string;
  spawnConditions?: string;
  recommendedRecipes?: string[];
  unlockHint?: string;
  difficulty?: 'easy' | 'medium' | 'hard' | 'legendary';
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
  efficiencyBoost?: number;
  collectionTasks: CollectionTask[];
  collectionTaskChains: CollectionTaskChain[];
  redDotState: RedDotState;
  regionHeats: RegionHeat[];
  consecutiveCollect: ConsecutiveCollect | null;
  dailyRewardState: DailyRewardState;
}

export interface AudioContextPreferences {
  volume: number;
  enabled: boolean;
}

export interface SaveData {
  version: string;
  timestamp: number;
  gameState: GameState;
  settings: {
    bgmVolume: number;
    sfxVolume: number;
    isMuted: boolean;
    audioContextPreferences: Partial<Record<AudioContextType, AudioContextPreferences>>;
  };
}

export interface PetalObject extends Phaser.Physics.Arcade.Sprite {
  petalType: PetalType;
  isCollecting: boolean;
  floatOffset: number;
  regionId?: string;
  spawnTime?: number;
  heatBonus?: number;
  decayPenalty?: number;
}

export interface Region {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  preferredPetals: PetalType[];
  baseHeat: number;
  color: number;
}

export interface RegionHeat {
  regionId: string;
  currentHeat: number;
  lastCollectTime: number;
  collectCount: number;
}

export interface ConsecutiveCollect {
  petalType: PetalType;
  count: number;
  lastCollectTime: number;
  currentDecay: number;
}

export interface SpawnAdjustment {
  type: PetalType;
  heatMultiplier: number;
  decayMultiplier: number;
  finalWeight: number;
}

export interface SynthesisResultData {
  recipeId: string;
  resultType: SynthesisResultType;
  output: PetalType;
  count: number;
  returnedPetals?: { type: PetalType; count: number }[];
}

export interface Position {
  x: number;
  y: number;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'tree' | 'rock' | 'bush' | 'water';
}

export interface PathNode {
  x: number;
  y: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}

export interface ControlSettings {
  joystickEnabled: boolean;
  autoPathEnabled: boolean;
  autoCollectEnabled: boolean;
  showPathPreview: boolean;
  vibrationEnabled: boolean;
  sensitivity: number;
}

export enum TutorialConditionType {
  PETAL_COUNT = 'petal_count',
  PETAL_UNLOCKED = 'petal_unlocked',
  RECIPE_UNLOCKED = 'recipe_unlocked',
  TOTAL_COLLECTED = 'total_collected',
  TOTAL_SYNTHESIZED = 'total_synthesized',
  STEP_COMPLETED = 'step_completed',
  GAME_PLAYTIME = 'game_playtime'
}

export interface TutorialCondition {
  type: TutorialConditionType;
  target?: PetalType | string;
  count?: number;
}

export enum TutorialValidationType {
  CLICK_ELEMENT = 'click_element',
  COLLECT_PETAL = 'collect_petal',
  MOVE_TO_AREA = 'move_to_area',
  SYNTHESIZE_RECIPE = 'synthesize_recipe',
  TAP_COUNT = 'tap_count',
  WAIT_DURATION = 'wait_duration'
}

export interface TutorialValidation {
  type: TutorialValidationType;
  target?: string;
  count?: number;
  duration?: number;
  tolerance?: number;
}

export interface TutorialSkipConfig {
  allowed: boolean;
  skipToStepId?: string;
  confirmRequired?: boolean;
  confirmMessage?: string;
}

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  targetArea?: { x: number; y: number; width: number; height: number };
  highlightElement?: string;
  actionRequired?: 'click' | 'move' | 'collect' | 'synthesize';
  completed: boolean;
  unlockCondition?: TutorialCondition;
  validation?: TutorialValidation;
  skipConfig?: TutorialSkipConfig;
  isOptional?: boolean;
  retryOnFail?: boolean;
  failureMessage?: string;
  successMessage?: string;
  delayMs?: number;
}

export interface TutorialGuideProgress {
  guideId: string;
  completedSteps: string[];
  skippedSteps: string[];
  startedAt: number;
  completedAt?: number;
}

export interface TutorialState {
  currentStep: number;
  steps: TutorialStep[];
  completed: boolean;
  dismissed: boolean;
  activeGuideId?: string;
  guideProgress: TutorialGuideProgress[];
  validationAttempts: Record<string, number>;
}

export interface EfficiencyStats {
  petalPerMinute: number;
  synthesisPerMinute: number;
  successRate: number;
  mutationRate: number;
  avgSynthesisTime: number;
  totalEfficiencyScore: number;
  efficiencyRating: 'S' | 'A' | 'B' | 'C' | 'D';
}

export interface KeyMilestone {
  id: string;
  type: 'collect' | 'synthesize' | 'unlock' | 'mutation' | 'complete';
  title: string;
  description: string;
  timestamp: number;
  playTimeAt: number;
  icon: string;
  color: number;
}

export interface RareDrop {
  type: PetalType;
  name: string;
  count: number;
  rarity: 'legendary' | 'epic' | 'rare' | 'uncommon';
  obtainedAt: number;
  description: string;
}

export enum InheritanceType {
  PETAL_RESERVE = 'petal_reserve',
  UNLOCKED_RECIPES = 'unlocked_recipes',
  DISCOVERED_MUTATIONS = 'discovered_mutations',
  COLLECTION_PROGRESS = 'collection_progress',
  EFFICIENCY_BOOST = 'efficiency_boost',
  GOAL_PROGRESS = 'goal_progress'
}

export interface InheritanceOption {
  id: InheritanceType;
  name: string;
  description: string;
  icon: string;
  cost: number;
  costType: 'points' | 'petals';
  costPetalType?: PetalType;
  selected: boolean;
  maxSelectable: number;
}

export interface InheritanceData {
  selectedOptions: InheritanceType[];
  inheritedPetals: Partial<Record<PetalType, number>>;
  inheritedRecipes: string[];
  efficiencyBoost: number;
}

export interface ReviewData {
  efficiencyStats: EfficiencyStats;
  milestones: KeyMilestone[];
  rareDrops: RareDrop[];
  inheritanceOptions: InheritanceOption[];
  totalScore: number;
}

export interface SaveValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fixed: boolean;
}

export interface SaveBackupInfo {
  version: string;
  timestamp: number;
  label?: string;
  size: number;
  isAuto: boolean;
}

export interface MigrationResult {
  success: boolean;
  fromVersion: string;
  toVersion: string;
  warnings: string[];
}

export interface SaveBackupData {
  version: string;
  timestamp: number;
  gameState: GameState;
  settings: SaveData['settings'];
  label?: string;
}

export enum CollectionTaskStatus {
  LOCKED = 'locked',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CLAIMED = 'claimed'
}

export interface TaskReward {
  type: 'petal' | 'goal_progress' | 'unlock_recipe';
  petalType?: PetalType;
  count?: number;
  recipeId?: string;
  description: string;
}

export interface CollectionTask {
  id: string;
  chainId: string;
  title: string;
  description: string;
  targetPetalType: PetalType;
  targetCount: number;
  currentCount: number;
  status: CollectionTaskStatus;
  reward: TaskReward;
  order: number;
  unlockHint: string;
  recommendedRecipes: string[];
  regionSource: string;
  regionDescription: string;
}

export interface CollectionTaskChain {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: number;
  tasks: string[];
  category: 'normal' | 'mutation' | 'failed';
  chainReward?: TaskReward;
  isChainComplete: boolean;
  chainClaimed: boolean;
}

export interface PetalRegionInfo {
  petalType: PetalType;
  regionName: string;
  regionDescription: string;
  spawnConditions: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
}

export interface RedDotState {
  collectionNewUnlocks: PetalType[];
  claimableTasks: string[];
  claimableChains: string[];
  lastViewedCollection: number;
}

export interface DailyReward {
  day: number;
  type: 'petal' | 'multiplier' | 'unlock';
  petalType?: PetalType;
  count?: number;
  multiplier?: number;
  description: string;
  icon: string;
  color: number;
}

export interface DailyRewardState {
  lastLoginDate: string;
  consecutiveDays: number;
  claimedDays: number[];
  todayClaimed: boolean;
}

export interface GameEvents {
  'petal:collected': { 
    type: PetalType; 
    count: number;
    regionId?: string;
    heatBonus?: number;
    decayPenalty?: number;
    consecutiveCount?: number;
    collectBonus?: string;
  };
  'petal:spawned': { 
    type: PetalType; 
    x: number; 
    y: number;
    regionId?: string;
    heatBonus?: number;
    decayPenalty?: number;
  };
  'synthesis:start': { recipeId: string };
  'synthesis:complete': SynthesisResultData;
  'synthesis:mutation': SynthesisResultData;
  'synthesis:fail': SynthesisResultData;
  'synthesis:recipe_unlocked': { recipeId: string };
  'synthesis:record_added': { record: SynthesisRecord };
  'collection:unlock': { type: PetalType; category: 'normal' | 'mutation' | 'failed' };
  'game:complete': { playTime: number; totalCollected: number };
  'audio:play': { key: string; volume?: number };
  'audio:context_changed': { context: AudioContextType; previousContext: AudioContextType | null };
  'audio:context_preference_updated': { context: AudioContextType; preferences: AudioContextPreferences };
  'save:update': { state: GameState };
  'trend:updated': { point: ResourceTrendPoint };
  'goal:progress': { goalId: string; current: number; target: number };
  'goal:completed': { goal: Goal };
  'goal:claimed': { goal: Goal };
  'status:show': { message: StatusMessage };
  'status:dismiss': { id: string };
  'quickentry:action': { type: QuickEntryType };
  'path:found': { path: Position[] };
  'path:blocked': { target: Position };
  'collectRange:updated': { range: number; level: number };
  'player:arrived': { x: number; y: number; distanceTraveled: number };
  'player:moved': { x: number; y: number; displacement: number };
  'tutorial:next': { step: TutorialStep };
  'tutorial:complete': {};
  'tutorial:reset': {};
  'tutorial:step_unlocked': { stepId: string; guideId?: string };
  'tutorial:step_skipped': { stepId: string; skipToStepId?: string; guideId?: string };
  'tutorial:validation_failed': { stepId: string; attempts: number; message?: string };
  'tutorial:validation_passed': { stepId: string; guideId?: string };
  'tutorial:guide_started': { guideId: string };
  'tutorial:guide_completed': { guideId: string; completedSteps: string[]; skippedSteps: string[] };
  'tutorial:condition_check': { stepId: string; conditionType: TutorialConditionType; met: boolean };
  'settings:updated': { settings: ControlSettings };
  'synthesis:panel_opened': {};
  'synthesis:button_clicked': {};
  'inheritance:apply': { data: InheritanceData };
  'save:backup_created': { label?: string; isAuto: boolean };
  'save:backup_restored': { label?: string };
  'save:validation_warning': { result: SaveValidationResult };
  'save:migration_completed': { result: MigrationResult };
  'save:error': { message: string };
  'collectiontask:progress': { taskId: string; current: number; target: number };
  'collectiontask:completed': { task: CollectionTask };
  'collectiontask:claimed': { task: CollectionTask };
  'collectionchain:completed': { chain: CollectionTaskChain };
  'collectionchain:claimed': { chain: CollectionTaskChain };
  'reddot:updated': {};
  'dailylogin:checked': { state: DailyRewardState };
  'dailyreward:claimed': { reward: DailyReward; day: number };
}
