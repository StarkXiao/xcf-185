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
  AUTO_SAVE = 'auto_save',
  MAP = 'map'
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

export enum AchievementCategory {
  COLLECTION = 'collection',
  SYNTHESIS = 'synthesis',
  EXPLORATION = 'exploration',
  MILESTONE = 'milestone',
  HIDDEN = 'hidden',
  SOCIAL = 'social',
  STORY = 'story'
}

export enum AchievementRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export enum AchievementConditionType {
  PETAL_COLLECTED = 'petal_collected',
  PETAL_UNLOCKED = 'petal_unlocked',
  TOTAL_COLLECTED = 'total_collected',
  TOTAL_SYNTHESIZED = 'total_synthesized',
  PLAY_TIME = 'play_time',
  REGION_UNLOCKED = 'region_unlocked',
  RECIPE_SYNTHESIZED = 'recipe_synthesized',
  MUTATION_DISCOVERED = 'mutation_discovered',
  ALL_NORMAL_PETALS = 'all_normal_petals',
  ALL_MUTATION_PETALS = 'all_mutation_petals',
  ALL_FAILED_PETALS = 'all_failed_petals',
  CONSECUTIVE_COLLECT = 'consecutive_collect',
  VISITOR_INTERACTIONS = 'visitor_interactions',
  ALL_REGIONS_UNLOCKED = 'all_regions_unlocked',
  GAME_COMPLETED = 'game_completed',
  WORKSHOP_PRODUCTION = 'workshop_production',
  CHAPTER_COMPLETED = 'chapter_completed',
  SPECIAL_EVENT = 'special_event',
  NO_FAILURE_STREAK = 'no_failure_streak',
  PERFECT_SYNTHESIS = 'perfect_synthesis'
}

export interface AchievementCondition {
  type: AchievementConditionType;
  target?: PetalType | string;
  targetCount?: number;
  description?: string;
}

export interface AchievementReward {
  type: 'petal' | 'efficiency_boost' | 'unlock_hint' | 'exclusive_title';
  petalType?: PetalType;
  count?: number;
  boostAmount?: number;
  title?: string;
  description: string;
}

export interface AchievementConfig {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon: string;
  color: number;
  conditions: AchievementCondition[];
  reward?: AchievementReward;
  isHidden: boolean;
  unlockHint?: string;
  order: number;
}

export interface AchievementState {
  achievementId: string;
  isUnlocked: boolean;
  unlockedAt?: number;
  isClaimed: boolean;
  claimedAt?: number;
  progress: number;
  currentCount: number;
  targetCount: number;
}

export enum GalleryCategory {
  NORMAL = 'normal',
  MUTATION = 'mutation',
  FAILED = 'failed',
  REGION = 'region',
  RECIPE = 'recipe',
  VISITOR = 'visitor',
  CHAPTER = 'chapter'
}

export interface GalleryItem {
  id: string;
  category: GalleryCategory;
  name: string;
  description: string;
  icon: string;
  color: number;
  unlockHint: string;
  data?: any;
}

export interface GalleryProgress {
  discoveredItems: string[];
  lastViewedTime: number;
}

export enum CrisisType {
  POLLUTION = 'pollution',
  DECAY = 'decay',
  CORRUPTION = 'corruption',
  WITHER = 'wither',
  BLIGHT = 'blight'
}

export enum CrisisSeverity {
  MINOR = 'minor',
  MODERATE = 'moderate',
  MAJOR = 'major',
  CATASTROPHIC = 'catastrophic'
}

export enum MarketRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary'
}

export enum MarketRefreshResult {
  SUCCESS = 'success',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  ON_COOLDOWN = 'on_cooldown'
}

export enum MarketTransactionType {
  BUY = 'buy',
  SELL = 'sell',
  REFRESH = 'refresh'
}

export enum CrisisStatus {
  DORMANT = 'dormant',
  WARNING = 'warning',
  ACTIVE = 'active',
  PURIFYING = 'purifying',
  RESOLVED = 'resolved',
  FAILED = 'failed'
}

export interface CrisisPurifyCost {
  petalType: PetalType;
  count: number;
}

export interface CrisisSpecialDrop {
  petalType: PetalType;
  count: number;
  probability: number;
}

export interface CrisisGlobalEffect {
  spawnRateMultiplier: number;
  rareDropMultiplier: number;
  collectRangePenalty: number;
  efficiencyPenalty: number;
  description: string;
}

export interface ForestCrisisConfig {
  id: string;
  type: CrisisType;
  name: string;
  description: string;
  icon: string;
  color: number;
  severity: CrisisSeverity;
  duration: number;
  purifyTime: number;
  purifyCosts: CrisisPurifyCost[];
  specialDrops: CrisisSpecialDrop[];
  globalEffect: CrisisGlobalEffect;
  triggerCondition: {
    minPlayTime: number;
    minTotalCollected: number;
    cooldown: number;
  };
  warningDuration: number;
  failurePenalty: {
    petalLossPercent: number;
    efficiencyPenalty: number;
    penaltyDuration: number;
  };
}

export interface ForestCrisisInstance {
  crisisId: string;
  status: CrisisStatus;
  startedAt: number;
  warningStartedAt: number;
  timeRemaining: number;
  purifyProgress: number;
  purifyTarget: number;
  costsPaid: CrisisPurifyCost[];
  resolvedAt: number;
  failedAt: number;
  regionId: string;
}

export interface ForestCrisisSettlement {
  crisisId: string;
  crisisName: string;
  type: CrisisType;
  severity: CrisisSeverity;
  wasResolved: boolean;
  timeTaken: number;
  petalsLost: { petalType: PetalType; count: number }[];
  specialDropsGained: { petalType: PetalType; count: number }[];
  efficiencyPenalty: number;
  penaltyDuration: number;
  timestamp: number;
}

export interface ForestCrisisSystemState {
  activeCrises: ForestCrisisInstance[];
  resolvedCrises: string[];
  failedCrises: string[];
  totalCrisesTriggered: number;
  totalCrisesResolved: number;
  totalCrisesFailed: number;
  lastCrisisTime: number;
  nextCrisisCheckTime: number;
  crisisSettlements: ForestCrisisSettlement[];
  activePenalty: {
    efficiencyPenalty: number;
    remainingDuration: number;
  } | null;
}

export interface MarketItem {
  id: string;
  petalType: PetalType;
  rarity: MarketRarity;
  basePrice: number;
  currentPrice: number;
  stock: number;
  maxStock: number;
  priceFluctuation: number;
  discount: number;
  isHot: boolean;
  isNew: boolean;
  restockTime: number;
}

export interface MarketTransaction {
  id: string;
  type: MarketTransactionType;
  itemId?: string;
  petalType?: PetalType;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  timestamp: number;
  success: boolean;
}

export interface MarketPriceHistory {
  petalType: PetalType;
  prices: { timestamp: number; price: number }[];
}

export interface MarketState {
  items: MarketItem[];
  transactions: MarketTransaction[];
  priceHistories: Record<PetalType, MarketPriceHistory>;
  currency: number;
  refreshCost: number;
  refreshCooldown: number;
  lastRefreshTime: number;
  totalTrades: number;
  totalProfit: number;
  totalSpent: number;
  favoritePetals: PetalType[];
  marketLevel: number;
  reputation: number;
  dailyPurchaseLimit: number;
  todayPurchases: number;
  lastResetDay: string;
}

export interface MarketItemConfig {
  petalType: PetalType;
  rarity: MarketRarity;
  basePrice: number;
  maxStock: number;
  spawnWeight: number;
}

export interface MarketConfig {
  initialCurrency: number;
  baseRefreshCost: number;
  refreshCooldownMs: number;
  itemSlotCount: number;
  priceFluctuationRange: number;
  priceUpdateIntervalMs: number;
  autoRestockIntervalMs: number;
  dailyPurchaseLimit: number;
  reputationPerTrade: number;
  maxReputation: number;
  sellPriceRatio: number;
  hotItemBonus: number;
  newItemDiscount: number;
  rarityPriceMultipliers: Record<MarketRarity, number>;
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
  commissionTasks: CollectionTask[];
  commissionTaskChains: CollectionTaskChain[];
  redDotState: RedDotState;
  regionHeats: RegionHeat[];
  consecutiveCollect: ConsecutiveCollect | null;
  dailyRewardState: DailyRewardState;
  environment: EnvironmentState;
  environmentStats: EnvironmentStats;
  rareDropEvents: RareDropEvent[];
  visitorSystem: VisitorSystemState;
  regionUnlockStates: RegionUnlockState[];
  currentRegionId: string | null;
  lastRegionId: string | null;
  workshopState: WorkshopState;
  storyProgress: StoryProgressState;
  achievementStates: AchievementState[];
  galleryProgress: GalleryProgress;
  forestCrisisState: ForestCrisisSystemState;
  marketState: MarketState;
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

export enum RegionUnlockConditionType {
  PETAL_COLLECTED = 'petal_collected',
  PETAL_UNLOCKED = 'petal_unlocked',
  TOTAL_COLLECTED = 'total_collected',
  TOTAL_SYNTHESIZED = 'total_synthesized',
  PLAY_TIME = 'play_time',
  REGION_UNLOCKED = 'region_unlocked',
  RECIPE_SYNTHESIZED = 'recipe_synthesized',
  GOAL_COMPLETED = 'goal_completed'
}

export interface RegionUnlockCondition {
  type: RegionUnlockConditionType;
  target?: PetalType | string;
  targetCount?: number;
  description: string;
}

export interface RegionConfig extends Region {
  unlockConditions: RegionUnlockCondition[];
  isLockedByDefault: boolean;
  entryPoint: Position;
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary';
  spawnRateMultiplier: number;
  rareDropBoost: number;
  ambiance: {
    bgTint: number;
    particleColor: number;
    fogDensity: number;
  };
  navigationIcon: string;
}

export interface RegionUnlockState {
  regionId: string;
  isUnlocked: boolean;
  unlockedAt?: number;
  visitCount: number;
  firstVisitAt?: number;
  totalTimeSpent: number;
}

export interface RegionEntrance {
  regionId: string;
  entranceX: number;
  entranceY: number;
  exitX: number;
  exitY: number;
  width: number;
  height: number;
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
  timeMultiplier: number;
  weatherMultiplier: number;
  seasonMultiplier: number;
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

export enum TimeOfDay {
  DAWN = 'dawn',
  DAY = 'day',
  DUSK = 'dusk',
  NIGHT = 'night',
  MIDNIGHT = 'midnight'
}

export enum WeatherType {
  CLEAR = 'clear',
  CLOUDY = 'cloudy',
  RAIN = 'rain',
  HEAVY_RAIN = 'heavy_rain',
  SNOW = 'snow',
  FOG = 'fog',
  WINDY = 'windy',
  STORM = 'storm',
  AURORA = 'aurora',
  METEOR = 'meteor'
}

export enum SeasonType {
  SPRING = 'spring',
  SUMMER = 'summer',
  AUTUMN = 'autumn',
  WINTER = 'winter'
}

export interface TimeState {
  gameTime: number;
  dayCount: number;
  timeOfDay: TimeOfDay;
  timeProgress: number;
  season: SeasonType;
  dayStartTime: number;
  isFullMoon: boolean;
  isMeteorShower: boolean;
  moonPhase: number;
}

export interface WeatherState {
  currentWeather: WeatherType;
  weatherDuration: number;
  weatherIntensity: number;
  nextWeatherChange: number;
  weatherTransition: number;
  targetWeather: WeatherType;
}

export interface EnvironmentState {
  time: TimeState;
  weather: WeatherState;
  ambientLight: number;
  skyColor: number;
  fogDensity: number;
  windSpeed: number;
  temperature: number;
}

export interface WeatherEffect {
  type: WeatherType;
  spawnWeightModifier: Partial<Record<PetalType, number>>;
  rareDropBoost: number;
  ambientMultiplier: number;
  specialEvent?: boolean;
  description: string;
}

export interface TimeEffect {
  timeOfDay: TimeOfDay;
  spawnWeightModifier: Partial<Record<PetalType, number>>;
  rareDropBoost: number;
  lightLevel: number;
  description: string;
}

export interface RareDropEvent {
  id: string;
  type: PetalType;
  rarity: 'legendary' | 'epic' | 'rare' | 'uncommon';
  trigger: 'time' | 'weather' | 'season' | 'random' | 'milestone';
  triggerCondition: string;
  probability: number;
  cooldown: number;
  lastTriggered: number;
  count: number;
  maxCount: number;
  announcement: string;
}

export interface EnvironmentStats {
  totalDaysPlayed: number;
  nightsPlayed: number;
  weatherExperience: Record<WeatherType, number>;
  rareDropsFound: RareDropEvent[];
  specialEventsWitnessed: string[];
  totalRareDrops: number;
}

export enum InheritanceType {
  PETAL_RESERVE = 'petal_reserve',
  UNLOCKED_RECIPES = 'unlocked_recipes',
  DISCOVERED_MUTATIONS = 'discovered_mutations',
  COLLECTION_PROGRESS = 'collection_progress',
  EFFICIENCY_BOOST = 'efficiency_boost',
  GOAL_PROGRESS = 'goal_progress',
  ENVIRONMENT_STATS = 'environment_stats'
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

export enum CommissionConditionType {
  COLLECT_PETAL = 'collect_petal',
  SYNTHESIZE_RECIPE = 'synthesize_recipe',
  SYNTHESIZE_OUTPUT = 'synthesize_output',
  TOTAL_COLLECTED = 'total_collected',
  TOTAL_SYNTHESIZED = 'total_synthesized',
  DISCOVER_MUTATION = 'discover_mutation'
}

export interface TaskReward {
  type: 'petal' | 'goal_progress' | 'unlock_recipe';
  petalType?: PetalType;
  count?: number;
  recipeId?: string;
  description: string;
}

export interface CommissionTaskCondition {
  type: CommissionConditionType;
  targetPetalType?: PetalType;
  targetRecipeId?: string;
  targetCount: number;
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
  conditions?: CommissionTaskCondition[];
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
  commissionNewUnlocks: string[];
  claimableCommissions: string[];
  claimableCommissionChains: string[];
  lastViewedCommission: number;
  newlyUnlockedAchievements: string[];
  claimableAchievements: string[];
  lastViewedAchievements: number;
  lastViewedGallery: number;
  galleryNewUnlocks: PetalType[];
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

export enum VisitorSpriteId {
  LUNA = 'luna',
  EMBER = 'ember',
  RIVER = 'river',
  FLORA = 'flora',
  AURORA = 'aurora',
  SHADOW = 'shadow'
}

export enum VisitorOrderStatus {
  PENDING = 'pending',
  FULFILLED = 'fulfilled',
  EXPIRED = 'expired'
}

export enum AffectionLevel {
  STRANGER = 0,
  ACQUAINTANCE = 1,
  FRIEND = 2,
  CLOSE_FRIEND = 3,
  CONFIDANT = 4,
  SOULMATE = 5
}

export interface VisitorSpriteConfig {
  id: VisitorSpriteId;
  name: string;
  title: string;
  description: string;
  appearance: string;
  personality: string;
  color: number;
  glowColor: number;
  preferredPetals: PetalType[];
  dislikedPetals: PetalType[];
  visitWeight: number;
  minPlayTime: number;
  orderCooldown: number;
  affectionThresholds: number[];
  levelTitles: string[];
  dialogue: {
    greet: string[];
    happy: string[];
    neutral: string[];
    dislike: string[];
    affectionUp: string[];
    orderPlace: string[];
    orderFulfill: string[];
    reward: string[];
  };
}

export interface VisitorOrder {
  id: string;
  spriteId: VisitorSpriteId;
  petals: { type: PetalType; count: number }[];
  bonusPetals?: { type: PetalType; count: number }[];
  timeLimit: number;
  placedAt: number;
  status: VisitorOrderStatus;
  affectionReward: number;
  isPreferred: boolean;
}

export interface VisitorReward {
  id: string;
  spriteId: VisitorSpriteId;
  affectionLevel: AffectionLevel;
  type: 'petal' | 'recipe' | 'efficiency' | 'cosmetic';
  petalType?: PetalType;
  count?: number;
  recipeId?: string;
  efficiencyBoost?: number;
  description: string;
  icon: string;
  claimed: boolean;
}

export interface VisitorSpriteState {
  spriteId: VisitorSpriteId;
  affection: number;
  level: AffectionLevel;
  totalVisits: number;
  totalOrdersPlaced: number;
  totalOrdersFulfilled: number;
  totalOrdersExpired: number;
  lastVisitTime: number;
  lastOrderTime: number;
  unlocked: boolean;
  rewards: VisitorReward[];
  discoveredPreferences: PetalType[];
  discoveredDislikes: PetalType[];
}

export interface VisitorSystemState {
  sprites: VisitorSpriteState[];
  activeVisitor: VisitorSpriteId | null;
  activeOrder: VisitorOrder | null;
  visitorArrivedAt: number;
  nextVisitTime: number;
  visitDuration: number;
  totalVisitorInteractions: number;
  completedSpriteCount: number;
}

export interface VisitorInteractionRecord {
  spriteId: VisitorSpriteId;
  timestamp: number;
  type: 'visit' | 'order_placed' | 'order_fulfilled' | 'order_expired' | 'reward_claimed' | 'affection_up';
  affectionChange: number;
  details?: string;
}

export enum ProcessingType {
  REFINING = 'refining',
  PURIFYING = 'purifying',
  ENHANCING = 'enhancing'
}

export interface WorkshopRecipe {
  id: string;
  inputs: { type: PetalType; count: number }[];
  output: { type: PetalType; count: number };
  processingType: ProcessingType;
  processingTime: number;
  batchMax: number;
  successRate: number;
  upgradeLevel: number;
  upgradeCost: { type: PetalType; count: number }[];
  upgradeSuccessRateBonus: number;
  upgradeOutputBonus: number;
  unlockCondition: { type: PetalType; count: number }[];
  description: string;
}

export interface WorkshopProductionRecord {
  id: string;
  recipeId: string;
  batchCount: number;
  resultType: PetalType;
  resultCount: number;
  timestamp: number;
  processingTime: number;
  wasUpgraded: boolean;
}

export interface WorkshopRecipeState {
  recipeId: string;
  isUnlocked: boolean;
  currentLevel: number;
  totalProduced: number;
  totalBatchRuns: number;
  lastProducedAt: number;
}

export interface WorkshopProductionStats {
  totalProcessed: number;
  totalOutput: number;
  totalBatchOperations: number;
  totalUpgrades: number;
  averageOutputPerRun: number;
  recipesByProcessingType: Record<ProcessingType, number>;
  peakBatchSize: number;
  totalProcessingTime: number;
}

export interface WorkshopActiveJob {
  id: string;
  recipeId: string;
  batchCount: number;
  startTime: number;
  duration: number;
  isUpgraded: boolean;
}

export interface WorkshopState {
  recipeStates: WorkshopRecipeState[];
  activeJobs: WorkshopActiveJob[];
  productionStats: WorkshopProductionStats;
  productionRecords: WorkshopProductionRecord[];
}

export enum ChapterStatus {
  LOCKED = 'locked',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SETTLED = 'settled'
}

export enum ChapterGoalType {
  COLLECT_PETAL = 'collect_petal',
  SYNTHESIZE_RECIPE = 'synthesize_recipe',
  UNLOCK_REGION = 'unlock_region',
  UNLOCK_PETAL = 'unlock_petal',
  TOTAL_COLLECTED = 'total_collected',
  TOTAL_SYNTHESIZED = 'total_synthesized',
  DISCOVER_MUTATION = 'discover_mutation',
  VISITOR_INTERACT = 'visitor_interact'
}

export interface ChapterGoal {
  id: string;
  type: ChapterGoalType;
  title: string;
  description: string;
  target: PetalType | string;
  targetCount: number;
  currentCount: number;
  completed: boolean;
  claimed: boolean;
}

export interface ChapterDialogue {
  id: string;
  speaker: string;
  speakerIcon?: string;
  text: string;
  expression?: 'happy' | 'sad' | 'surprised' | 'serious' | 'normal';
  delay?: number;
}

export interface ChapterReward {
  type: 'petal' | 'recipe' | 'unlock_region' | 'efficiency_boost';
  petalType?: PetalType;
  count?: number;
  recipeId?: string;
  regionId?: string;
  boostAmount?: number;
  description: string;
}

export interface ChapterSpecialRecipe {
  recipeId: string;
  unlockHint: string;
  isUnlocked: boolean;
}

export interface ChapterConfig {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: number;
  regionId: string;
  startDialogue: ChapterDialogue[];
  completeDialogue: ChapterDialogue[];
  goals: ChapterGoal[];
  rewards: ChapterReward[];
  specialRecipes: ChapterSpecialRecipe[];
  unlockCondition?: {
    type: 'chapter_completed' | 'play_time' | 'total_collected';
    targetChapterId?: string;
    targetCount?: number;
  };
}

export interface ChapterState {
  chapterId: string;
  status: ChapterStatus;
  currentGoalIndex: number;
  goals: ChapterGoal[];
  specialRecipes: ChapterSpecialRecipe[];
  startedAt?: number;
  completedAt?: number;
  settledAt?: number;
  playTimeInChapter: number;
  petalsCollectedInChapter: Record<PetalType, number>;
  synthesesInChapter: number;
  dialoguesViewed: string[];
}

export interface ChapterSettlementData {
  chapterId: string;
  chapterTitle: string;
  playTime: number;
  goalsCompleted: number;
  totalGoals: number;
  petalsCollected: Record<PetalType, number>;
  synthesesCompleted: number;
  rewards: ChapterReward[];
  rating: 'S' | 'A' | 'B' | 'C';
  score: number;
}

export interface StoryProgressState {
  currentChapterId: string | null;
  chapterStates: ChapterState[];
  allChaptersCompleted: boolean;
  totalStoryScore: number;
  bestChapterRatings: Record<string, 'S' | 'A' | 'B' | 'C'>;
}

export interface ChapterReviewData {
  chapterId: string;
  chapterTitle: string;
  status: ChapterStatus;
  rating: 'S' | 'A' | 'B' | 'C' | null;
  playTime: number;
  goalsCompleted: number;
  totalGoals: number;
  completedAt?: number;
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
    isRare?: boolean;
  };
  'petal:spawned': { 
    type: PetalType; 
    x: number; 
    y: number;
    regionId?: string;
    heatBonus?: number;
    decayPenalty?: number;
    isRare?: boolean;
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
  'commission:progress': { taskId: string; current: number; target: number };
  'commission:completed': { task: CollectionTask };
  'commission:claimed': { task: CollectionTask };
  'commissionchain:completed': { chain: CollectionTaskChain };
  'commissionchain:claimed': { chain: CollectionTaskChain };
  'reddot:updated': {};
  'dailylogin:checked': { state: DailyRewardState };
  'dailyreward:claimed': { reward: DailyReward; day: number };
  'time:changed': { timeOfDay: TimeOfDay; dayCount: number; season: SeasonType };
  'time:newday': { dayCount: number; season: SeasonType; isFullMoon: boolean };
  'weather:changed': { oldWeather: WeatherType; newWeather: WeatherType; intensity: number };
  'weather:special': { type: WeatherType; description: string };
  'environment:updated': { environment: EnvironmentState };
  'raredrop:spawned': { event: RareDropEvent; x: number; y: number };
  'raredrop:collected': { event: RareDropEvent; type: PetalType };
  'season:changed': { oldSeason: SeasonType; newSeason: SeasonType };
  'visitor:arrived': { spriteId: VisitorSpriteId; isReturning: boolean };
  'visitor:left': { spriteId: VisitorSpriteId };
  'visitor:order_placed': { order: VisitorOrder };
  'visitor:order_fulfilled': { order: VisitorOrder; spriteId: VisitorSpriteId; affectionGain: number };
  'visitor:order_expired': { order: VisitorOrder; spriteId: VisitorSpriteId };
  'visitor:affection_up': { spriteId: VisitorSpriteId; oldLevel: AffectionLevel; newLevel: AffectionLevel; affection: number };
  'visitor:reward_unlocked': { spriteId: VisitorSpriteId; reward: VisitorReward };
  'visitor:reward_claimed': { spriteId: VisitorSpriteId; reward: VisitorReward };
  'visitor:preference_discovered': { spriteId: VisitorSpriteId; petalType: PetalType; isPreference: boolean };
  'visitor:panel_opened': {};
  'region:unlocked': { regionId: string; regionName: string };
  'region:entered': { regionId: string; regionName: string; previousRegionId: string | null };
  'region:left': { regionId: string; regionName: string; nextRegionId: string | null };
  'region:locked_attempt': { regionId: string; regionName: string; missingConditions: string[] };
  'region:condition_progress': { regionId: string; conditionIndex: number; current: number; target: number };
  'region:map_opened': {};
  'region:navigate_request': { regionId: string };
  'workshop:processing_start': { recipeId: string; batchCount: number };
  'workshop:processing_complete': { recipeId: string; batchCount: number; outputType: PetalType; outputCount: number };
  'workshop:batch_complete': { recipeId: string; totalBatches: number; totalOutput: number };
  'workshop:recipe_upgrade': { recipeId: string; newLevel: number };
  'workshop:recipe_unlocked': { recipeId: string };
  'workshop:panel_opened': {};
  'workshop:stats_updated': { stats: WorkshopProductionStats };
  'story:chapter_start': { chapterId: string; chapterTitle: string };
  'story:chapter_complete': { chapterId: string; chapterTitle: string };
  'story:chapter_settled': { chapterId: string; settlementData: ChapterSettlementData };
  'story:goal_progress': { chapterId: string; goalId: string; current: number; target: number };
  'story:goal_complete': { chapterId: string; goal: ChapterGoal };
  'story:dialogue_start': { chapterId: string; dialogue: ChapterDialogue };
  'story:dialogue_end': { chapterId: string };
  'story:special_recipe_unlocked': { chapterId: string; recipeId: string };
  'story:reward_claimed': { chapterId: string; reward: ChapterReward };
  'story:all_complete': { totalScore: number };
  'story:review_opened': {};
  'achievement:unlocked': { achievementId: string; config: AchievementConfig };
  'achievement:progress': { achievementId: string; current: number; target: number };
  'achievement:claimed': { achievementId: string; reward: AchievementReward };
  'achievement:panel_opened': {};
  'gallery:item_discovered': { itemId: string; category: GalleryCategory };
  'gallery:panel_opened': {};
  'playtime:update': { playTime: number };
  'crisis:warning': { crisisId: string; crisisName: string; type: CrisisType; severity: CrisisSeverity; timeRemaining: number; regionId: string };
  'crisis:active': { crisisId: string; crisisName: string; type: CrisisType; severity: CrisisSeverity; duration: number; regionId: string; globalEffect: CrisisGlobalEffect };
  'crisis:purify_start': { crisisId: string; crisisName: string; purifyTime: number; costs: CrisisPurifyCost[] };
  'crisis:purify_progress': { crisisId: string; progress: number; target: number };
  'crisis:resolved': { crisisId: string; crisisName: string; type: CrisisType; specialDrops: CrisisSpecialDrop[]; settlement: ForestCrisisSettlement };
  'crisis:failed': { crisisId: string; crisisName: string; type: CrisisType; severity: CrisisSeverity; settlement: ForestCrisisSettlement };
  'crisis:penalty_applied': { efficiencyPenalty: number; duration: number };
  'crisis:penalty_expired': {};
  'crisis:popup_alert': { crisisId: string; crisisName: string; icon: string; description: string; urgency: 'warning' | 'critical' };
  'market:item_purchased': { itemId: string; petalType: PetalType; quantity: number; totalPrice: number };
  'market:item_sold': { petalType: PetalType; quantity: number; totalPrice: number };
  'market:refresh_success': { items: MarketItem[] };
  'market:refresh_failed': { result: MarketRefreshResult };
  'market:price_updated': { petalType: PetalType; oldPrice: number; newPrice: number };
  'market:currency_updated': { oldCurrency: number; newCurrency: number };
  'market:item_restocked': { itemId: string; petalType: PetalType; newStock: number };
  'market:panel_opened': {};
  'market:reputation_updated': { oldReputation: number; newReputation: number };
  'market:level_up': { oldLevel: number; newLevel: number };
  'market:daily_limit_reached': {};
  'market:hot_item_appeared': { itemId: string; petalType: PetalType };
}
