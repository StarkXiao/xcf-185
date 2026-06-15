import { 
  PetalType, 
  PetalConfig, 
  SynthesisRecipe, 
  GameState, 
  Goal, 
  GoalType, 
  GoalStatus, 
  QuickEntry, 
  QuickEntryType,
  InheritanceType,
  InheritanceOption,
  KeyMilestone,
  AudioContextType,
  CollectionTask,
  CollectionTaskChain,
  CollectionTaskStatus,
  CommissionConditionType,
  RedDotState,
  TaskReward,
  Region,
  RegionConfig,
  RegionUnlockState,
  RegionUnlockConditionType,
  RegionEntrance,
  Position,
  DailyReward,
  DailyRewardState,
  TutorialConditionType,
  TutorialValidationType,
  TutorialGuideProgress,
  TimeOfDay,
  WeatherType,
  SeasonType,
  TimeEffect,
  WeatherEffect,
  EnvironmentState,
  EnvironmentStats,
  RareDropEvent,
  VisitorSpriteId,
  VisitorSpriteConfig,
  VisitorSpriteState,
  VisitorSystemState,
  VisitorOrderStatus,
  AffectionLevel,
  VisitorReward,
  WorkshopRecipe,
  WorkshopState,
  WorkshopRecipeState,
  WorkshopProductionStats,
  ProcessingType,
  ChapterConfig,
  ChapterState,
  ChapterStatus,
  ChapterGoalType,
  StoryProgressState
} from '../types';

export const GAME_WIDTH = 750;
export const GAME_HEIGHT = 1334;
export const WORLD_WIDTH = 1500;
export const WORLD_HEIGHT = 2000;

export const PLAYER_SPEED = 300;
export const PETAL_SPAWN_INTERVAL = 2000;
export const PETAL_COLLECT_RANGE = 60;
export const PETAL_MAX_COUNT = 15;
export const AUTO_SAVE_INTERVAL = 10000;

export const COLLECT_RANGE_GROWTH = {
  baseRange: 60,
  rangePerLevel: 15,
  maxRange: 180,
  petalsPerLevel: 20,
  maxLevel: 10
};

export const OBSTACLE_CONFIG = {
  count: 25,
  minSize: 60,
  maxSize: 120,
  avoidRadius: 200
};

export const REGION_CONFIGS: RegionConfig[] = [
  {
    id: 'moonlight_glade',
    name: '月光林地',
    description: '森林东部的开阔草地，夜晚时分会被月光笼罩',
    x: 100,
    y: 100,
    width: 600,
    height: 600,
    preferredPetals: [PetalType.MOONLIGHT, PetalType.STARLIGHT],
    baseHeat: 1.0,
    color: 0x88ccff,
    unlockConditions: [],
    isLockedByDefault: false,
    entryPoint: { x: 400, y: 400 },
    difficulty: 'easy',
    spawnRateMultiplier: 1.0,
    rareDropBoost: 0,
    ambiance: { bgTint: 0x0a0a2e, particleColor: 0x88ccff, fogDensity: 0.05 },
    navigationIcon: '🌙'
  },
  {
    id: 'starlight_lake',
    name: '星辰湖畔',
    description: '森林中央的静谧湖泊，星空倒映在湖面上',
    x: 800,
    y: 100,
    width: 600,
    height: 600,
    preferredPetals: [PetalType.STARLIGHT, PetalType.MOONLIGHT, PetalType.DEW],
    baseHeat: 1.0,
    color: 0xffe66d,
    unlockConditions: [
      {
        type: RegionUnlockConditionType.TOTAL_COLLECTED,
        targetCount: 10,
        description: '累计收集10朵花瓣'
      }
    ],
    isLockedByDefault: true,
    entryPoint: { x: 1100, y: 400 },
    difficulty: 'easy',
    spawnRateMultiplier: 1.1,
    rareDropBoost: 0.05,
    ambiance: { bgTint: 0x0e0e2a, particleColor: 0xffe66d, fogDensity: 0.08 },
    navigationIcon: '⭐'
  },
  {
    id: 'dew_valley',
    name: '晨露山谷',
    description: '森林西北部的山谷，清晨时分雾气弥漫',
    x: 100,
    y: 800,
    width: 500,
    height: 500,
    preferredPetals: [PetalType.DEW, PetalType.GLOWING],
    baseHeat: 1.0,
    color: 0xa8e6cf,
    unlockConditions: [
      {
        type: RegionUnlockConditionType.PETAL_UNLOCKED,
        target: PetalType.STARLIGHT,
        targetCount: 1,
        description: '解锁星光花瓣'
      },
      {
        type: RegionUnlockConditionType.TOTAL_SYNTHESIZED,
        targetCount: 1,
        description: '完成1次合成'
      }
    ],
    isLockedByDefault: true,
    entryPoint: { x: 350, y: 1050 },
    difficulty: 'medium',
    spawnRateMultiplier: 1.0,
    rareDropBoost: 0.08,
    ambiance: { bgTint: 0x0a1a1a, particleColor: 0xa8e6cf, fogDensity: 0.15 },
    navigationIcon: '💧'
  },
  {
    id: 'glowing_cave',
    name: '荧光洞穴',
    description: '森林深处的神秘洞穴，洞壁散发着微弱荧光',
    x: 700,
    y: 800,
    width: 500,
    height: 500,
    preferredPetals: [PetalType.GLOWING, PetalType.DREAM],
    baseHeat: 1.0,
    color: 0xff9ecb,
    unlockConditions: [
      {
        type: RegionUnlockConditionType.PETAL_UNLOCKED,
        target: PetalType.DEW,
        targetCount: 1,
        description: '解锁露珠花瓣'
      },
      {
        type: RegionUnlockConditionType.REGION_UNLOCKED,
        target: 'dew_valley',
        description: '解锁晨露山谷'
      }
    ],
    isLockedByDefault: true,
    entryPoint: { x: 950, y: 1050 },
    difficulty: 'medium',
    spawnRateMultiplier: 0.9,
    rareDropBoost: 0.12,
    ambiance: { bgTint: 0x1a0a1a, particleColor: 0xff9ecb, fogDensity: 0.2 },
    navigationIcon: '✨'
  },
  {
    id: 'dream_garden',
    name: '梦境花园',
    description: '只有在梦中才能到达的神秘花园',
    x: 300,
    y: 1400,
    width: 900,
    height: 500,
    preferredPetals: [PetalType.DREAM, PetalType.ETERNAL, PetalType.WAKEUP],
    baseHeat: 0.8,
    color: 0xc8a2ff,
    unlockConditions: [
      {
        type: RegionUnlockConditionType.PETAL_UNLOCKED,
        target: PetalType.GLOWING,
        targetCount: 1,
        description: '解锁荧光花瓣'
      },
      {
        type: RegionUnlockConditionType.TOTAL_COLLECTED,
        targetCount: 50,
        description: '累计收集50朵花瓣'
      },
      {
        type: RegionUnlockConditionType.PLAY_TIME,
        targetCount: 300,
        description: '游戏时长达到5分钟'
      }
    ],
    isLockedByDefault: true,
    entryPoint: { x: 750, y: 1650 },
    difficulty: 'hard',
    spawnRateMultiplier: 0.8,
    rareDropBoost: 0.2,
    ambiance: { bgTint: 0x150a2a, particleColor: 0xc8a2ff, fogDensity: 0.12 },
    navigationIcon: '🌸'
  },
  {
    id: 'eternal_temple',
    name: '永恒神殿',
    description: '森林最深处的古老神殿，传说封印着永恒之力',
    x: 1100,
    y: 800,
    width: 300,
    height: 400,
    preferredPetals: [PetalType.ETERNAL, PetalType.DREAM],
    baseHeat: 0.6,
    color: 0xffd700,
    unlockConditions: [
      {
        type: RegionUnlockConditionType.PETAL_UNLOCKED,
        target: PetalType.DREAM,
        targetCount: 1,
        description: '解锁梦境花瓣'
      },
      {
        type: RegionUnlockConditionType.REGION_UNLOCKED,
        target: 'dream_garden',
        description: '解锁梦境花园'
      },
      {
        type: RegionUnlockConditionType.TOTAL_SYNTHESIZED,
        targetCount: 10,
        description: '累计完成10次合成'
      }
    ],
    isLockedByDefault: true,
    entryPoint: { x: 1250, y: 1000 },
    difficulty: 'legendary',
    spawnRateMultiplier: 0.5,
    rareDropBoost: 0.4,
    ambiance: { bgTint: 0x2a1a0a, particleColor: 0xffd700, fogDensity: 0.08 },
    navigationIcon: '👑'
  }
];

export const REGIONS: Region[] = REGION_CONFIGS.map(config => ({
  id: config.id,
  name: config.name,
  description: config.description,
  x: config.x,
  y: config.y,
  width: config.width,
  height: config.height,
  preferredPetals: config.preferredPetals,
  baseHeat: config.baseHeat,
  color: config.color
}));

export const REGION_ENTRANCES: RegionEntrance[] = [
  { regionId: 'moonlight_glade', entranceX: 700, entranceY: 400, exitX: 800, exitY: 400, width: 40, height: 80 },
  { regionId: 'starlight_lake', entranceX: 800, entranceY: 400, exitX: 700, exitY: 400, width: 40, height: 80 },
  { regionId: 'moonlight_glade', entranceX: 400, entranceY: 700, exitX: 400, exitY: 800, width: 80, height: 40 },
  { regionId: 'dew_valley', entranceX: 350, entranceY: 800, exitX: 350, exitY: 700, width: 80, height: 40 },
  { regionId: 'starlight_lake', entranceX: 950, entranceY: 700, exitX: 950, exitY: 800, width: 80, height: 40 },
  { regionId: 'glowing_cave', entranceX: 950, entranceY: 800, exitX: 950, exitY: 700, width: 80, height: 40 },
  { regionId: 'dew_valley', entranceX: 350, entranceY: 1300, exitX: 350, exitY: 1400, width: 80, height: 40 },
  { regionId: 'dream_garden', entranceX: 750, entranceY: 1400, exitX: 750, exitY: 1300, width: 80, height: 40 },
  { regionId: 'glowing_cave', entranceX: 1100, entranceY: 1000, exitX: 1100, exitY: 1000, width: 40, height: 80 },
  { regionId: 'eternal_temple', entranceX: 1100, entranceY: 1000, exitX: 1200, exitY: 1000, width: 40, height: 80 }
];

export function getInitialRegionUnlockStates(): RegionUnlockState[] {
  return REGION_CONFIGS.map(config => ({
    regionId: config.id,
    isUnlocked: !config.isLockedByDefault,
    unlockedAt: config.isLockedByDefault ? undefined : Date.now(),
    visitCount: config.isLockedByDefault ? 0 : 1,
    firstVisitAt: config.isLockedByDefault ? undefined : Date.now(),
    totalTimeSpent: 0
  }));
}

export function getDefaultCurrentRegionId(): string {
  const defaultRegion = REGION_CONFIGS.find(r => !r.isLockedByDefault);
  return defaultRegion ? defaultRegion.id : REGION_CONFIGS[0].id;
}

export function formatPlayTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.floor(seconds)}秒`;
  } else if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return secs > 0 ? `${mins}分${secs}秒` : `${mins}分钟`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`;
  }
}

export const HEAT_CONFIG = {
  heatIncreasePerCollect: 0.15,
  maxHeat: 2.5,
  heatDecayRate: 0.05,
  heatDecayInterval: 5000,
  heatDecayAmount: 0.1,
  heatBonusWeight: 0.4
};

export const DECAY_CONFIG = {
  decayStartThreshold: 3,
  decayPerCollect: 0.12,
  maxDecay: 0.7,
  decayRecoveryRate: 0.08,
  decayRecoveryInterval: 8000,
  resetTimeWindow: 15000,
  decayPenaltyWeight: 0.5
};

export const BALANCE_CONFIG = {
  highLevelSpawnReduction: 0.15,
  level3Reduction: 0.1,
  level4Reduction: 0.2,
  level5Reduction: 0.3,
  level6Reduction: 0.4,
  level7Reduction: 0.5,
  heatBoostForRare: 0.3,
  minSpawnWeight: 0.5
};

export const PATHFINDING_CONFIG = {
  gridSize: 50,
  maxIterations: 500,
  smoothPath: true
};

export const INITIAL_CONTROL_SETTINGS = {
  joystickEnabled: true,
  autoPathEnabled: true,
  autoCollectEnabled: true,
  showPathPreview: true,
  vibrationEnabled: true,
  sensitivity: 1.0
};

export const TUTORIAL_STEPS = [
  {
    id: 'tutorial_move',
    title: '欢迎来到梦境森林',
    content: '点击屏幕任意位置，角色会自动寻路移动过去。遇到障碍物时会自动绕行哦！',
    actionRequired: 'move' as const,
    completed: false,
    validation: {
      type: TutorialValidationType.MOVE_TO_AREA,
      count: 20
    },
    skipConfig: {
      allowed: true,
      confirmRequired: true,
      confirmMessage: '跳过移动教学？后续可随时点击移动'
    },
    retryOnFail: true,
    failureMessage: '请点击屏幕让角色移动至少一段距离',
    successMessage: '✅ 移动成功！'
  },
  {
    id: 'tutorial_collect',
    title: '收集花瓣',
    content: '靠近发光的花瓣即可自动收集。收集越多，你的吸附范围会越大！',
    actionRequired: 'collect' as const,
    completed: false,
    validation: {
      type: TutorialValidationType.COLLECT_PETAL
    },
    skipConfig: {
      allowed: true,
      skipToStepId: 'tutorial_range',
      confirmRequired: true,
      confirmMessage: '跳过收集教学？你仍可自行探索收集'
    },
    retryOnFail: true,
    failureMessage: '请靠近花瓣进行收集',
    successMessage: '✅ 收集成功！'
  },
  {
    id: 'tutorial_range',
    title: '吸附范围成长',
    content: '注意角色周围的光圈，那是你的收集范围。每收集20朵花瓣，范围就会扩大！',
    completed: false,
    isOptional: true,
    skipConfig: {
      allowed: true,
      confirmRequired: false
    }
  },
  {
    id: 'tutorial_synthesis',
    title: '花瓣合成',
    content: '点击右下角的合成按钮，可以将收集的花瓣合成更高级的品种。',
    highlightElement: 'synthesis_button',
    actionRequired: 'click' as const,
    completed: false,
    validation: {
      type: TutorialValidationType.CLICK_ELEMENT,
      target: 'synthesis_button'
    },
    unlockCondition: {
      type: TutorialConditionType.TOTAL_COLLECTED,
      count: 3
    },
    skipConfig: {
      allowed: true,
      confirmRequired: true,
      confirmMessage: '跳过合成教学？合成是游戏核心玩法'
    },
    retryOnFail: true,
    failureMessage: '请点击高亮的合成按钮',
    successMessage: '✅ 成功打开合成面板！',
    delayMs: 500
  },
  {
    id: 'tutorial_advanced_synthesis',
    title: '进阶合成',
    content: '当收集足够花瓣后，可以尝试更高级的合成配方，有机会获得稀有变异花瓣！',
    actionRequired: 'synthesize' as const,
    completed: false,
    isOptional: true,
    validation: {
      type: TutorialValidationType.SYNTHESIZE_RECIPE
    },
    unlockCondition: {
      type: TutorialConditionType.TOTAL_SYNTHESIZED,
      count: 1
    },
    skipConfig: {
      allowed: true,
      skipToStepId: 'tutorial_settings',
      confirmRequired: false
    },
    retryOnFail: true,
    failureMessage: '请完成一次合成操作',
    successMessage: '✅ 合成完成！'
  },
  {
    id: 'tutorial_settings',
    title: '操作设置',
    content: '在游戏中可以随时调整操作方式，包括摇杆开关、自动寻路等功能。',
    completed: false,
    isOptional: true,
    skipConfig: {
      allowed: true,
      confirmRequired: false
    }
  },
  {
    id: 'tutorial_complete',
    title: '教程完成！',
    content: '恭喜你掌握了基本操作！现在去探索梦境森林，收集所有稀有花瓣吧！',
    completed: false,
    skipConfig: {
      allowed: false
    }
  }
];

export const PETAL_CONFIGS: Record<PetalType, PetalConfig> = {
  [PetalType.MOONLIGHT]: {
    type: PetalType.MOONLIGHT,
    name: '月光花瓣',
    level: 1,
    color: 0x88ccff,
    glowColor: 0x4488ff,
    spawnWeight: 35,
    description: '散发柔和月光的基础花瓣',
    category: 'normal',
    regionName: '月光林地',
    regionDescription: '森林东部的开阔草地，夜晚时分会被月光笼罩',
    spawnConditions: '全天可收集，夜间出现概率提升',
    recommendedRecipes: ['recipe_1', 'recipe_7'],
    unlockHint: '初始即可收集',
    difficulty: 'easy'
  },
  [PetalType.STARLIGHT]: {
    type: PetalType.STARLIGHT,
    name: '星光花瓣',
    level: 2,
    color: 0xffe66d,
    glowColor: 0xffcc00,
    spawnWeight: 25,
    description: '闪烁着星星光芒的花瓣',
    category: 'normal',
    regionName: '星辰湖畔',
    regionDescription: '森林中央的静谧湖泊，星空倒映在湖面上',
    spawnConditions: '通过合成获得，或在深夜有极小概率自然出现',
    recommendedRecipes: ['recipe_2', 'recipe_7', 'recipe_8'],
    unlockHint: '使用3朵月光花瓣合成解锁',
    difficulty: 'easy'
  },
  [PetalType.DEW]: {
    type: PetalType.DEW,
    name: '露珠花瓣',
    level: 3,
    color: 0xa8e6cf,
    glowColor: 0x44ddaa,
    spawnWeight: 18,
    description: '凝结着晨露的清新花瓣',
    category: 'normal',
    regionName: '晨露山谷',
    regionDescription: '森林西北部的山谷，清晨时分雾气弥漫',
    spawnConditions: '通过合成获得，清晨有极小概率自然出现',
    recommendedRecipes: ['recipe_3', 'recipe_8', 'recipe_9'],
    unlockHint: '使用3朵星光花瓣合成解锁',
    difficulty: 'medium'
  },
  [PetalType.GLOWING]: {
    type: PetalType.GLOWING,
    name: '荧光花瓣',
    level: 4,
    color: 0xff9ecb,
    glowColor: 0xff66aa,
    spawnWeight: 10,
    description: '散发梦幻荧光的神秘花瓣',
    category: 'normal',
    regionName: '荧光洞穴',
    regionDescription: '森林深处的神秘洞穴，洞壁散发着微弱荧光',
    spawnConditions: '通过合成获得，仅在深夜洞穴中可能自然出现',
    recommendedRecipes: ['recipe_4', 'recipe_9', 'recipe_10'],
    unlockHint: '使用3朵露珠花瓣合成解锁',
    difficulty: 'medium'
  },
  [PetalType.DREAM]: {
    type: PetalType.DREAM,
    name: '梦境花瓣',
    level: 5,
    color: 0xc8a2ff,
    glowColor: 0x9966ff,
    spawnWeight: 6,
    description: '蕴含梦境力量的稀有花瓣',
    category: 'normal',
    regionName: '梦境花园',
    regionDescription: '只有在梦中才能到达的神秘花园',
    spawnConditions: '通过合成获得，稀有变异时有极小概率出现',
    recommendedRecipes: ['recipe_5', 'recipe_10'],
    unlockHint: '使用3朵荧光花瓣合成解锁',
    difficulty: 'hard'
  },
  [PetalType.ETERNAL]: {
    type: PetalType.ETERNAL,
    name: '永恒花瓣',
    level: 6,
    color: 0xffd700,
    glowColor: 0xffaa00,
    spawnWeight: 4,
    description: '传说中永不凋零的永恒花瓣',
    category: 'normal',
    regionName: '永恒神殿',
    regionDescription: '森林最深处的古老神殿，传说封印着永恒之力',
    spawnConditions: '通过合成获得，极难自然出现',
    recommendedRecipes: ['recipe_6', 'recipe_10'],
    unlockHint: '使用3朵梦境花瓣合成解锁',
    difficulty: 'hard'
  },
  [PetalType.WAKEUP]: {
    type: PetalType.WAKEUP,
    name: '唤醒之花',
    level: 7,
    color: 0xffffff,
    glowColor: 0xff6699,
    spawnWeight: 0,
    description: '能够唤醒沉睡恋人的神圣之花',
    category: 'normal',
    regionName: '恋人长眠之地',
    regionDescription: '神殿最深处，恋人沉睡的祭坛',
    spawnConditions: '仅能通过特定配方合成',
    recommendedRecipes: ['recipe_6'],
    unlockHint: '使用1朵永恒花瓣+2朵梦境花瓣+3朵荧光花瓣合成',
    difficulty: 'legendary'
  },
  [PetalType.MOONLIGHT_SHIMMER]: {
    type: PetalType.MOONLIGHT_SHIMMER,
    name: '月华花瓣',
    level: 2,
    color: 0xb3e0ff,
    glowColor: 0x66bbff,
    spawnWeight: 0,
    description: '月光花瓣的变异体，散发着淡淡月华光辉',
    isMutation: true,
    category: 'mutation',
    regionName: '月华台',
    regionDescription: '月光林地最高处的石台，满月时会聚集月华',
    spawnConditions: '合成月光花瓣时变异获得，满月之夜概率提升',
    recommendedRecipes: ['recipe_11'],
    unlockHint: '合成月光花瓣时有15%概率变异获得',
    difficulty: 'medium'
  },
  [PetalType.STARLIGHT_BURST]: {
    type: PetalType.STARLIGHT_BURST,
    name: '星爆花瓣',
    level: 3,
    color: 0xffee99,
    glowColor: 0xffdd33,
    spawnWeight: 0,
    description: '星光花瓣的变异体，如星爆般璀璨夺目',
    isMutation: true,
    category: 'mutation',
    regionName: '流星坡',
    regionDescription: '星辰湖畔的山坡，常有流星划过',
    spawnConditions: '合成星光花瓣时变异获得，流星夜概率提升',
    recommendedRecipes: ['recipe_12'],
    unlockHint: '合成星光花瓣时有12%概率变异获得',
    difficulty: 'medium'
  },
  [PetalType.DEW_CRYSTAL]: {
    type: PetalType.DEW_CRYSTAL,
    name: '晶露花瓣',
    level: 4,
    color: 0xccf5e8,
    glowColor: 0x88eedd,
    spawnWeight: 0,
    description: '露珠花瓣的变异体，凝结成晶莹剔透的水晶形态',
    isMutation: true,
    category: 'mutation',
    regionName: '冰晶洞',
    regionDescription: '晨露山谷深处的洞穴，洞壁挂满冰晶',
    spawnConditions: '合成露珠花瓣时变异获得，寒冷清晨概率提升',
    recommendedRecipes: [],
    unlockHint: '合成露珠花瓣时有10%概率变异获得',
    difficulty: 'hard'
  },
  [PetalType.GLOWING_EMBER]: {
    type: PetalType.GLOWING_EMBER,
    name: '烬荧花瓣',
    level: 5,
    color: 0xffccbb,
    glowColor: 0xff9988,
    spawnWeight: 0,
    description: '荧光花瓣的变异体，如余烬般温暖的荧光',
    isMutation: true,
    category: 'mutation',
    regionName: '余烬谷',
    regionDescription: '荧光洞穴深处的火山遗迹，仍有余温',
    spawnConditions: '合成荧光花瓣时变异获得，夜晚概率提升',
    recommendedRecipes: [],
    unlockHint: '合成荧光花瓣时有8%概率变异获得',
    difficulty: 'hard'
  },
  [PetalType.DREAM_PHANTOM]: {
    type: PetalType.DREAM_PHANTOM,
    name: '幻梦花瓣',
    level: 6,
    color: 0xd4b8ff,
    glowColor: 0xaa88ff,
    spawnWeight: 0,
    description: '梦境花瓣的变异体，缥缈虚幻的梦幻形态',
    isMutation: true,
    category: 'mutation',
    regionName: '幻影迷宫',
    regionDescription: '梦境花园深处的迷宫，令人迷失方向',
    spawnConditions: '合成梦境花瓣时变异获得，深夜概率提升',
    recommendedRecipes: [],
    unlockHint: '合成梦境花瓣时有5%概率变异获得',
    difficulty: 'legendary'
  },
  [PetalType.FAILED_DUST]: {
    type: PetalType.FAILED_DUST,
    name: '幻灭之尘',
    level: 0,
    color: 0x888888,
    glowColor: 0x666666,
    spawnWeight: 0,
    description: '合成失败的产物，花瓣化为缥缈的尘埃',
    isFailed: true,
    category: 'failed',
    regionName: '消散之境',
    regionDescription: '所有失败产物最终消散的虚无空间',
    spawnConditions: '合成失败时获得',
    recommendedRecipes: [],
    unlockHint: '任意合成失败时有概率获得',
    difficulty: 'easy'
  },
  [PetalType.FAILED_SLIME]: {
    type: PetalType.FAILED_SLIME,
    name: '混沌黏液',
    level: 0,
    color: 0x66aa66,
    glowColor: 0x448844,
    spawnWeight: 0,
    description: '合成失败的产物，不稳定的花瓣能量凝结成黏液',
    isFailed: true,
    category: 'failed',
    regionName: '混沌池',
    regionDescription: '消散之境中的不稳定能量池',
    spawnConditions: '合成失败时获得',
    recommendedRecipes: [],
    unlockHint: '任意合成失败时有概率获得',
    difficulty: 'easy'
  },
  [PetalType.FAILED_ASH]: {
    type: PetalType.FAILED_ASH,
    name: '凋零灰烬',
    level: 0,
    color: 0x554433,
    glowColor: 0x332211,
    spawnWeight: 0,
    description: '合成失败的产物，花瓣完全燃烧后的残余灰烬',
    isFailed: true,
    category: 'failed',
    regionName: '焚化场',
    regionDescription: '消散之境中能量完全耗尽的区域',
    spawnConditions: '合成失败时获得',
    recommendedRecipes: [],
    unlockHint: '任意合成失败时有概率获得',
    difficulty: 'easy'
  }
};

export const SYNTHESIS_RECIPES: SynthesisRecipe[] = [
  {
    id: 'recipe_1',
    inputs: [
      { type: PetalType.MOONLIGHT, count: 3 }
    ],
    output: { type: PetalType.STARLIGHT, count: 1 },
    animationType: 'merge',
    mutationChance: 0.15,
    mutationOutcomes: [
      { type: PetalType.MOONLIGHT_SHIMMER, probability: 1.0 }
    ],
    failChance: 0.08,
    failOutcomes: [
      { type: PetalType.FAILED_DUST, probability: 0.7, returnRatio: 0.3 },
      { type: PetalType.FAILED_SLIME, probability: 0.3, returnRatio: 0.5 }
    ],
    hintNormal: '三朵月光花瓣融合，化作星辰之光！',
    hintMutation: '不可思议！月光花瓣发生了变异，月华降临！',
    hintFail: '合成失败...花瓣的力量消散了...'
  },
  {
    id: 'recipe_2',
    inputs: [
      { type: PetalType.STARLIGHT, count: 3 }
    ],
    output: { type: PetalType.DEW, count: 1 },
    animationType: 'merge',
    mutationChance: 0.12,
    mutationOutcomes: [
      { type: PetalType.STARLIGHT_BURST, probability: 1.0 }
    ],
    failChance: 0.10,
    failOutcomes: [
      { type: PetalType.FAILED_DUST, probability: 0.5, returnRatio: 0.3 },
      { type: PetalType.FAILED_ASH, probability: 0.5, returnRatio: 0.2 }
    ],
    hintNormal: '星光凝结，化作清晨的露珠！',
    hintMutation: '奇迹！星光花瓣绽放出星爆的光芒！',
    hintFail: '星光黯淡了...合成失败了...'
  },
  {
    id: 'recipe_3',
    inputs: [
      { type: PetalType.DEW, count: 3 }
    ],
    output: { type: PetalType.GLOWING, count: 1 },
    animationType: 'transform',
    mutationChance: 0.10,
    mutationOutcomes: [
      { type: PetalType.DEW_CRYSTAL, probability: 1.0 }
    ],
    failChance: 0.12,
    failOutcomes: [
      { type: PetalType.FAILED_SLIME, probability: 0.6, returnRatio: 0.4 },
      { type: PetalType.FAILED_DUST, probability: 0.4, returnRatio: 0.3 }
    ],
    hintNormal: '露珠升华，散发出梦幻荧光！',
    hintMutation: '露珠凝结成了水晶！晶露花瓣诞生！',
    hintFail: '露珠蒸发了...什么都没有留下...'
  },
  {
    id: 'recipe_4',
    inputs: [
      { type: PetalType.GLOWING, count: 3 }
    ],
    output: { type: PetalType.DREAM, count: 1 },
    animationType: 'transform',
    mutationChance: 0.08,
    mutationOutcomes: [
      { type: PetalType.GLOWING_EMBER, probability: 1.0 }
    ],
    failChance: 0.15,
    failOutcomes: [
      { type: PetalType.FAILED_ASH, probability: 0.5, returnRatio: 0.3 },
      { type: PetalType.FAILED_SLIME, probability: 0.5, returnRatio: 0.4 }
    ],
    hintNormal: '荧光凝聚，编织成美丽的梦境！',
    hintMutation: '荧光化作温暖余烬！烬荧花瓣悄然绽放！',
    hintFail: '荧光熄灭了...只剩下一片灰烬...'
  },
  {
    id: 'recipe_5',
    inputs: [
      { type: PetalType.DREAM, count: 3 }
    ],
    output: { type: PetalType.ETERNAL, count: 1 },
    animationType: 'explode',
    mutationChance: 0.05,
    mutationOutcomes: [
      { type: PetalType.DREAM_PHANTOM, probability: 1.0 }
    ],
    failChance: 0.20,
    failOutcomes: [
      { type: PetalType.FAILED_ASH, probability: 0.6, returnRatio: 0.2 },
      { type: PetalType.FAILED_DUST, probability: 0.4, returnRatio: 0.2 }
    ],
    hintNormal: '三重梦境交织，绽放出永恒之花！',
    hintMutation: '梦境破碎重组，幻梦花瓣凭空出现！',
    hintFail: '梦境破碎了...永恒终究难以触及...'
  },
  {
    id: 'recipe_6',
    inputs: [
      { type: PetalType.ETERNAL, count: 1 },
      { type: PetalType.DREAM, count: 2 },
      { type: PetalType.GLOWING, count: 3 }
    ],
    output: { type: PetalType.WAKEUP, count: 1 },
    animationType: 'explode',
    mutationChance: 0,
    failChance: 0.30,
    failOutcomes: [
      { type: PetalType.FAILED_ASH, probability: 0.5, returnRatio: 0.1 },
      { type: PetalType.FAILED_DUST, probability: 0.3, returnRatio: 0.1 },
      { type: PetalType.FAILED_SLIME, probability: 0.2, returnRatio: 0.2 }
    ],
    hintNormal: '所有花瓣的力量汇聚，唤醒之花终于绽放！',
    hintFail: '力量失衡了...神圣的合成以失败告终...'
  },
  {
    id: 'recipe_7',
    inputs: [
      { type: PetalType.MOONLIGHT, count: 2 },
      { type: PetalType.STARLIGHT, count: 1 }
    ],
    output: { type: PetalType.DEW, count: 1 },
    animationType: 'merge',
    mutationChance: 0.18,
    mutationOutcomes: [
      { type: PetalType.MOONLIGHT_SHIMMER, probability: 0.5 },
      { type: PetalType.STARLIGHT_BURST, probability: 0.5 }
    ],
    failChance: 0.06,
    failOutcomes: [
      { type: PetalType.FAILED_DUST, probability: 0.8, returnRatio: 0.5 },
      { type: PetalType.FAILED_SLIME, probability: 0.2, returnRatio: 0.6 }
    ],
    hintNormal: '月光与星光交融，化作晶莹露珠！',
    hintMutation: '两种力量碰撞，产生了奇妙的变异！',
    hintFail: '月光与星光无法融合...消散在空中...'
  },
  {
    id: 'recipe_8',
    inputs: [
      { type: PetalType.STARLIGHT, count: 2 },
      { type: PetalType.DEW, count: 1 }
    ],
    output: { type: PetalType.GLOWING, count: 1 },
    animationType: 'transform',
    mutationChance: 0.15,
    mutationOutcomes: [
      { type: PetalType.STARLIGHT_BURST, probability: 0.5 },
      { type: PetalType.DEW_CRYSTAL, probability: 0.5 }
    ],
    failChance: 0.08,
    failOutcomes: [
      { type: PetalType.FAILED_SLIME, probability: 0.6, returnRatio: 0.5 },
      { type: PetalType.FAILED_DUST, probability: 0.4, returnRatio: 0.4 }
    ],
    hintNormal: '星光与露珠结合，散发出柔和荧光！',
    hintMutation: '奇妙的反应！变异花瓣诞生了！',
    hintFail: '星光被露珠熄灭了...合成失败...'
  },
  {
    id: 'recipe_9',
    inputs: [
      { type: PetalType.DEW, count: 2 },
      { type: PetalType.GLOWING, count: 1 }
    ],
    output: { type: PetalType.DREAM, count: 1 },
    animationType: 'transform',
    mutationChance: 0.12,
    mutationOutcomes: [
      { type: PetalType.DEW_CRYSTAL, probability: 0.5 },
      { type: PetalType.GLOWING_EMBER, probability: 0.5 }
    ],
    failChance: 0.10,
    failOutcomes: [
      { type: PetalType.FAILED_ASH, probability: 0.5, returnRatio: 0.4 },
      { type: PetalType.FAILED_SLIME, probability: 0.5, returnRatio: 0.5 }
    ],
    hintNormal: '露珠与荧光交织，编织成甜美的梦境！',
    hintMutation: '能量产生了奇妙的扭曲！变异花瓣出现！',
    hintFail: '梦境被现实打破...合成失败了...'
  },
  {
    id: 'recipe_10',
    inputs: [
      { type: PetalType.MOONLIGHT, count: 5 },
      { type: PetalType.STARLIGHT, count: 3 },
      { type: PetalType.DEW, count: 2 }
    ],
    output: { type: PetalType.ETERNAL, count: 1 },
    animationType: 'explode',
    mutationChance: 0.08,
    mutationOutcomes: [
      { type: PetalType.DREAM_PHANTOM, probability: 0.4 },
      { type: PetalType.GLOWING_EMBER, probability: 0.3 },
      { type: PetalType.DEW_CRYSTAL, probability: 0.3 }
    ],
    failChance: 0.25,
    failOutcomes: [
      { type: PetalType.FAILED_ASH, probability: 0.6, returnRatio: 0.15 },
      { type: PetalType.FAILED_DUST, probability: 0.4, returnRatio: 0.15 }
    ],
    hintNormal: '低阶花瓣的力量汇聚，绽放出永恒之花！',
    hintMutation: '众多能量碰撞产生奇迹！稀有变异出现！',
    hintFail: '力量太过分散...永恒之力无法凝聚...'
  },
  {
    id: 'recipe_11',
    inputs: [
      { type: PetalType.MOONLIGHT_SHIMMER, count: 2 }
    ],
    output: { type: PetalType.STARLIGHT_BURST, count: 1 },
    animationType: 'transform',
    mutationChance: 0,
    failChance: 0.05,
    failOutcomes: [
      { type: PetalType.FAILED_DUST, probability: 1.0, returnRatio: 0.5 }
    ],
    hintNormal: '月华花瓣融合，化作璀璨星爆！',
    hintFail: '月华消散了...只留下尘埃...'
  },
  {
    id: 'recipe_12',
    inputs: [
      { type: PetalType.STARLIGHT_BURST, count: 2 }
    ],
    output: { type: PetalType.DEW_CRYSTAL, count: 1 },
    animationType: 'transform',
    mutationChance: 0,
    failChance: 0.05,
    failOutcomes: [
      { type: PetalType.FAILED_ASH, probability: 1.0, returnRatio: 0.5 }
    ],
    hintNormal: '星爆之力凝结，化作晶露之花！',
    hintFail: '星爆熄灭了...只剩下灰烬...'
  }
];

export const MAX_RESOURCE_TREND_POINTS = 50;
export const TREND_SAMPLE_INTERVAL = 30000;
export const MAX_SYNTHESIS_RECORDS = 30;
export const MAX_STATUS_MESSAGES = 5;
export const MAX_ACTIVE_GOALS = 5;

export const INITIAL_GOALS: Goal[] = [
  {
    id: 'goal_collect_moonlight_10',
    type: GoalType.COLLECT_PETAL,
    title: '收集10朵月光花瓣',
    description: '在森林中探索收集10朵月光花瓣',
    target: PetalType.MOONLIGHT,
    targetCount: 10,
    currentCount: 0,
    status: GoalStatus.PENDING,
    priority: 1
  },
  {
    id: 'goal_synthesize_recipe_1',
    type: GoalType.SYNTHESIZE_RECIPE,
    title: '完成首次合成',
    description: '使用合成系统完成任意一次合成',
    target: 'any',
    targetCount: 1,
    currentCount: 0,
    status: GoalStatus.PENDING,
    priority: 2
  },
  {
    id: 'goal_total_collect_20',
    type: GoalType.TOTAL_COLLECTED,
    title: '花瓣收藏家',
    description: '累计收集20朵任意花瓣',
    target: 'total',
    targetCount: 20,
    currentCount: 0,
    status: GoalStatus.PENDING,
    priority: 3
  },
  {
    id: 'goal_unlock_starlight',
    type: GoalType.UNLOCK_PETAL,
    title: '星光初现',
    description: '通过合成或收集解锁星光花瓣',
    target: PetalType.STARLIGHT,
    targetCount: 1,
    currentCount: 0,
    status: GoalStatus.PENDING,
    priority: 4
  },
  {
    id: 'goal_unlock_recipe_2',
    type: GoalType.UNLOCK_RECIPE,
    title: '配方探索者',
    description: '收集到星光花瓣解锁配方2',
    target: 'recipe_2',
    targetCount: 1,
    currentCount: 0,
    status: GoalStatus.PENDING,
    priority: 5
  },
  {
    id: 'goal_total_synthesize_5',
    type: GoalType.TOTAL_SYNTHESIZED,
    title: '合成匠人',
    description: '累计完成5次成功合成',
    target: 'total',
    targetCount: 5,
    currentCount: 0,
    status: GoalStatus.PENDING,
    priority: 6
  },
  {
    id: 'goal_collect_dew_5',
    type: GoalType.COLLECT_PETAL,
    title: '露珠凝结',
    description: '收集5朵露珠花瓣',
    target: PetalType.DEW,
    targetCount: 5,
    currentCount: 0,
    status: GoalStatus.PENDING,
    priority: 7
  },
  {
    id: 'goal_unlock_wakeup',
    type: GoalType.UNLOCK_PETAL,
    title: '唤醒之花',
    description: '合成出传说中的唤醒之花',
    target: PetalType.WAKEUP,
    targetCount: 1,
    currentCount: 0,
    status: GoalStatus.PENDING,
    priority: 10
  }
];

export const INITIAL_COLLECTION_TASK_CHAINS: CollectionTaskChain[] = [
  {
    id: 'chain_normal',
    title: '普通花瓣收集',
    description: '收集所有普通花瓣，探索梦境森林的奥秘',
    icon: '🌸',
    color: 0xa8e6cf,
    tasks: [
      'task_moonlight_10',
      'task_starlight_5',
      'task_dew_3',
      'task_glowing_2',
      'task_dream_2',
      'task_eternal_1',
      'task_wakeup_1'
    ],
    category: 'normal',
    chainReward: {
      type: 'petal',
      petalType: PetalType.ETERNAL,
      count: 1,
      description: '完成普通收集链，获得1朵永恒花瓣'
    },
    isChainComplete: false,
    chainClaimed: false
  },
  {
    id: 'chain_mutation',
    title: '变异花瓣收集',
    description: '发现所有变异花瓣，见证奇迹的诞生',
    icon: '✨',
    color: 0xffaa00,
    tasks: [
      'task_moonlight_shimmer_1',
      'task_starlight_burst_1',
      'task_dew_crystal_1',
      'task_glowing_ember_1',
      'task_dream_phantom_1'
    ],
    category: 'mutation',
    chainReward: {
      type: 'petal',
      petalType: PetalType.DREAM_PHANTOM,
      count: 2,
      description: '完成变异收集链，获得2朵幻梦花瓣'
    },
    isChainComplete: false,
    chainClaimed: false
  },
  {
    id: 'chain_failed',
    title: '失败产物收集',
    description: '记录所有合成失败产物，从失败中学习',
    icon: '💀',
    color: 0x888888,
    tasks: [
      'task_failed_dust_3',
      'task_failed_slime_2',
      'task_failed_ash_2'
    ],
    category: 'failed',
    chainReward: {
      type: 'goal_progress',
      description: '完成失败收集链，所有目标进度+10%'
    },
    isChainComplete: false,
    chainClaimed: false
  }
];

export const INITIAL_COLLECTION_TASKS: CollectionTask[] = [
  {
    id: 'task_moonlight_10',
    chainId: 'chain_normal',
    title: '月光收集者',
    description: '收集10朵月光花瓣',
    targetPetalType: PetalType.MOONLIGHT,
    targetCount: 10,
    currentCount: 0,
    status: CollectionTaskStatus.IN_PROGRESS,
    reward: {
      type: 'petal',
      petalType: PetalType.MOONLIGHT,
      count: 3,
      description: '奖励3朵月光花瓣'
    },
    order: 1,
    unlockHint: '初始任务，收集月光花瓣开始你的旅程',
    recommendedRecipes: ['recipe_1', 'recipe_7'],
    regionSource: '月光林地',
    regionDescription: '森林东部的开阔草地'
  },
  {
    id: 'task_starlight_5',
    chainId: 'chain_normal',
    title: '星光点点',
    description: '收集5朵星光花瓣',
    targetPetalType: PetalType.STARLIGHT,
    targetCount: 5,
    currentCount: 0,
    status: CollectionTaskStatus.LOCKED,
    reward: {
      type: 'petal',
      petalType: PetalType.STARLIGHT,
      count: 2,
      description: '奖励2朵星光花瓣'
    },
    order: 2,
    unlockHint: '完成「月光收集者」后解锁，先合成星光花瓣吧',
    recommendedRecipes: ['recipe_1', 'recipe_2', 'recipe_7'],
    regionSource: '星辰湖畔',
    regionDescription: '森林中央的静谧湖泊'
  },
  {
    id: 'task_dew_3',
    chainId: 'chain_normal',
    title: '晨露凝结',
    description: '收集3朵露珠花瓣',
    targetPetalType: PetalType.DEW,
    targetCount: 3,
    currentCount: 0,
    status: CollectionTaskStatus.LOCKED,
    reward: {
      type: 'petal',
      petalType: PetalType.DEW,
      count: 1,
      description: '奖励1朵露珠花瓣'
    },
    order: 3,
    unlockHint: '完成「星光点点」后解锁',
    recommendedRecipes: ['recipe_2', 'recipe_3', 'recipe_8'],
    regionSource: '晨露山谷',
    regionDescription: '森林西北部的山谷'
  },
  {
    id: 'task_glowing_2',
    chainId: 'chain_normal',
    title: '荧光闪烁',
    description: '收集2朵荧光花瓣',
    targetPetalType: PetalType.GLOWING,
    targetCount: 2,
    currentCount: 0,
    status: CollectionTaskStatus.LOCKED,
    reward: {
      type: 'petal',
      petalType: PetalType.GLOWING,
      count: 1,
      description: '奖励1朵荧光花瓣'
    },
    order: 4,
    unlockHint: '完成「晨露凝结」后解锁',
    recommendedRecipes: ['recipe_3', 'recipe_4', 'recipe_9'],
    regionSource: '荧光洞穴',
    regionDescription: '森林深处的神秘洞穴'
  },
  {
    id: 'task_dream_2',
    chainId: 'chain_normal',
    title: '梦境编织',
    description: '收集2朵梦境花瓣',
    targetPetalType: PetalType.DREAM,
    targetCount: 2,
    currentCount: 0,
    status: CollectionTaskStatus.LOCKED,
    reward: {
      type: 'petal',
      petalType: PetalType.DREAM,
      count: 1,
      description: '奖励1朵梦境花瓣'
    },
    order: 5,
    unlockHint: '完成「荧光闪烁」后解锁',
    recommendedRecipes: ['recipe_4', 'recipe_5', 'recipe_10'],
    regionSource: '梦境花园',
    regionDescription: '只有在梦中才能到达的神秘花园'
  },
  {
    id: 'task_eternal_1',
    chainId: 'chain_normal',
    title: '永恒绽放',
    description: '收集1朵永恒花瓣',
    targetPetalType: PetalType.ETERNAL,
    targetCount: 1,
    currentCount: 0,
    status: CollectionTaskStatus.LOCKED,
    reward: {
      type: 'petal',
      petalType: PetalType.ETERNAL,
      count: 1,
      description: '奖励1朵永恒花瓣'
    },
    order: 6,
    unlockHint: '完成「梦境编织」后解锁',
    recommendedRecipes: ['recipe_5', 'recipe_6', 'recipe_10'],
    regionSource: '永恒神殿',
    regionDescription: '森林最深处的古老神殿'
  },
  {
    id: 'task_wakeup_1',
    chainId: 'chain_normal',
    title: '恋人苏醒',
    description: '收集1朵唤醒之花',
    targetPetalType: PetalType.WAKEUP,
    targetCount: 1,
    currentCount: 0,
    status: CollectionTaskStatus.LOCKED,
    reward: {
      type: 'petal',
      petalType: PetalType.WAKEUP,
      count: 1,
      description: '奖励1朵唤醒之花'
    },
    order: 7,
    unlockHint: '完成「永恒绽放」后解锁，这是最终的挑战',
    recommendedRecipes: ['recipe_6'],
    regionSource: '恋人长眠之地',
    regionDescription: '神殿最深处的祭坛'
  },
  {
    id: 'task_moonlight_shimmer_1',
    chainId: 'chain_mutation',
    title: '月华初现',
    description: '获得1朵月华花瓣（变异）',
    targetPetalType: PetalType.MOONLIGHT_SHIMMER,
    targetCount: 1,
    currentCount: 0,
    status: CollectionTaskStatus.IN_PROGRESS,
    reward: {
      type: 'unlock_recipe',
      recipeId: 'recipe_11',
      description: '解锁特殊配方：月华融合'
    },
    order: 1,
    unlockHint: '合成月光花瓣时有15%概率变异获得',
    recommendedRecipes: ['recipe_1', 'recipe_7'],
    regionSource: '月华台',
    regionDescription: '月光林地最高处的石台'
  },
  {
    id: 'task_starlight_burst_1',
    chainId: 'chain_mutation',
    title: '星爆降临',
    description: '获得1朵星爆花瓣（变异）',
    targetPetalType: PetalType.STARLIGHT_BURST,
    targetCount: 1,
    currentCount: 0,
    status: CollectionTaskStatus.LOCKED,
    reward: {
      type: 'unlock_recipe',
      recipeId: 'recipe_12',
      description: '解锁特殊配方：星爆结晶'
    },
    order: 2,
    unlockHint: '完成「月华初现」后解锁，合成星光花瓣时变异获得',
    recommendedRecipes: ['recipe_2'],
    regionSource: '流星坡',
    regionDescription: '星辰湖畔的山坡'
  },
  {
    id: 'task_dew_crystal_1',
    chainId: 'chain_mutation',
    title: '晶露凝结',
    description: '获得1朵晶露花瓣（变异）',
    targetPetalType: PetalType.DEW_CRYSTAL,
    targetCount: 1,
    currentCount: 0,
    status: CollectionTaskStatus.LOCKED,
    reward: {
      type: 'petal',
      petalType: PetalType.DEW_CRYSTAL,
      count: 1,
      description: '奖励1朵晶露花瓣'
    },
    order: 3,
    unlockHint: '完成「星爆降临」后解锁，合成露珠花瓣时变异获得',
    recommendedRecipes: ['recipe_3'],
    regionSource: '冰晶洞',
    regionDescription: '晨露山谷深处的洞穴'
  },
  {
    id: 'task_glowing_ember_1',
    chainId: 'chain_mutation',
    title: '烬荧闪烁',
    description: '获得1朵烬荧花瓣（变异）',
    targetPetalType: PetalType.GLOWING_EMBER,
    targetCount: 1,
    currentCount: 0,
    status: CollectionTaskStatus.LOCKED,
    reward: {
      type: 'petal',
      petalType: PetalType.GLOWING_EMBER,
      count: 1,
      description: '奖励1朵烬荧花瓣'
    },
    order: 4,
    unlockHint: '完成「晶露凝结」后解锁，合成荧光花瓣时变异获得',
    recommendedRecipes: ['recipe_4'],
    regionSource: '余烬谷',
    regionDescription: '荧光洞穴深处的火山遗迹'
  },
  {
    id: 'task_dream_phantom_1',
    chainId: 'chain_mutation',
    title: '幻梦虚无',
    description: '获得1朵幻梦花瓣（变异）',
    targetPetalType: PetalType.DREAM_PHANTOM,
    targetCount: 1,
    currentCount: 0,
    status: CollectionTaskStatus.LOCKED,
    reward: {
      type: 'petal',
      petalType: PetalType.DREAM_PHANTOM,
      count: 2,
      description: '奖励2朵幻梦花瓣'
    },
    order: 5,
    unlockHint: '完成「烬荧闪烁」后解锁，合成梦境花瓣时变异获得',
    recommendedRecipes: ['recipe_5'],
    regionSource: '幻影迷宫',
    regionDescription: '梦境花园深处的迷宫'
  },
  {
    id: 'task_failed_dust_3',
    chainId: 'chain_failed',
    title: '幻灭之尘',
    description: '获得3份幻灭之尘（失败）',
    targetPetalType: PetalType.FAILED_DUST,
    targetCount: 3,
    currentCount: 0,
    status: CollectionTaskStatus.IN_PROGRESS,
    reward: {
      type: 'petal',
      petalType: PetalType.MOONLIGHT,
      count: 5,
      description: '奖励5朵月光花瓣'
    },
    order: 1,
    unlockHint: '合成失败时有概率获得，失败是成功之母',
    recommendedRecipes: ['recipe_1'],
    regionSource: '消散之境',
    regionDescription: '所有失败产物最终消散的虚无空间'
  },
  {
    id: 'task_failed_slime_2',
    chainId: 'chain_failed',
    title: '混沌黏液',
    description: '获得2份混沌黏液（失败）',
    targetPetalType: PetalType.FAILED_SLIME,
    targetCount: 2,
    currentCount: 0,
    status: CollectionTaskStatus.LOCKED,
    reward: {
      type: 'petal',
      petalType: PetalType.STARLIGHT,
      count: 3,
      description: '奖励3朵星光花瓣'
    },
    order: 2,
    unlockHint: '完成「幻灭之尘」后解锁',
    recommendedRecipes: ['recipe_2'],
    regionSource: '混沌池',
    regionDescription: '消散之境中的不稳定能量池'
  },
  {
    id: 'task_failed_ash_2',
    chainId: 'chain_failed',
    title: '凋零灰烬',
    description: '获得2份凋零灰烬（失败）',
    targetPetalType: PetalType.FAILED_ASH,
    targetCount: 2,
    currentCount: 0,
    status: CollectionTaskStatus.LOCKED,
    reward: {
      type: 'petal',
      petalType: PetalType.DEW,
      count: 2,
      description: '奖励2朵露珠花瓣'
    },
    order: 3,
    unlockHint: '完成「混沌黏液」后解锁',
    recommendedRecipes: ['recipe_5'],
    regionSource: '焚化场',
    regionDescription: '消散之境中能量完全耗尽的区域'
  }
];

export const INITIAL_RED_DOT_STATE: RedDotState = {
  collectionNewUnlocks: [],
  claimableTasks: [],
  claimableChains: [],
  lastViewedCollection: 0,
  commissionNewUnlocks: [],
  claimableCommissions: [],
  claimableCommissionChains: [],
  lastViewedCommission: 0
};

export const INITIAL_COMMISSION_TASK_CHAINS: CollectionTaskChain[] = [
  {
    id: 'commission_chain_forest',
    title: '森林委托',
    description: '森林精灵们的委托，完成可获得丰厚奖励',
    icon: '🌲',
    color: 0x4aa85c,
    tasks: [
      'commission_collect_moonlight_20',
      'commission_synthesize_recipe_3',
      'commission_synthesize_glowing_3',
      'commission_collect_starlight_15',
      'commission_synthesize_dream_2'
    ],
    category: 'normal',
    chainReward: {
      type: 'petal',
      petalType: PetalType.ETERNAL,
      count: 2,
      description: '完成全部森林委托，获得2朵永恒花瓣'
    },
    isChainComplete: false,
    chainClaimed: false
  },
  {
    id: 'commission_chain_master',
    title: '炼金大师',
    description: '挑战高级合成，成为真正的炼金大师',
    icon: '⚗️',
    color: 0xc8a2ff,
    tasks: [
      'commission_total_synthesize_20',
      'commission_discover_mutation_3',
      'commission_synthesize_eternal_1'
    ],
    category: 'normal',
    chainReward: {
      type: 'petal',
      petalType: PetalType.WAKEUP,
      count: 1,
      description: '完成炼金大师委托，获得1朵唤醒之花'
    },
    isChainComplete: false,
    chainClaimed: false
  }
];

export const INITIAL_COMMISSION_TASKS: CollectionTask[] = [
  {
    id: 'commission_collect_moonlight_20',
    chainId: 'commission_chain_forest',
    title: '月光采集',
    description: '收集20朵月光花瓣',
    targetPetalType: PetalType.MOONLIGHT,
    targetCount: 20,
    currentCount: 0,
    status: CollectionTaskStatus.IN_PROGRESS,
    reward: {
      type: 'petal',
      petalType: PetalType.GLOWING,
      count: 2,
      description: '奖励2朵荧光花瓣'
    },
    order: 1,
    unlockHint: '初始委托，森林精灵需要月光花瓣',
    recommendedRecipes: ['recipe_1', 'recipe_7'],
    regionSource: '月光林地',
    regionDescription: '森林东部的开阔草地',
    conditions: [
      { type: CommissionConditionType.COLLECT_PETAL, targetPetalType: PetalType.MOONLIGHT, targetCount: 20 }
    ]
  },
  {
    id: 'commission_synthesize_recipe_3',
    chainId: 'commission_chain_forest',
    title: '露珠炼金',
    description: '使用配方合成3朵露珠花瓣',
    targetPetalType: PetalType.DEW,
    targetCount: 3,
    currentCount: 0,
    status: CollectionTaskStatus.LOCKED,
    reward: {
      type: 'petal',
      petalType: PetalType.DEW,
      count: 2,
      description: '奖励2朵露珠花瓣'
    },
    order: 2,
    unlockHint: '完成「月光采集」后解锁',
    recommendedRecipes: ['recipe_2'],
    regionSource: '合成台',
    regionDescription: '通过合成获得',
    conditions: [
      { type: CommissionConditionType.SYNTHESIZE_OUTPUT, targetPetalType: PetalType.DEW, targetCount: 3 }
    ]
  },
  {
    id: 'commission_synthesize_glowing_3',
    chainId: 'commission_chain_forest',
    title: '荧光绽放',
    description: '合成3朵荧光花瓣',
    targetPetalType: PetalType.GLOWING,
    targetCount: 3,
    currentCount: 0,
    status: CollectionTaskStatus.LOCKED,
    reward: {
      type: 'unlock_recipe',
      recipeId: 'recipe_10',
      description: '解锁特殊配方：永恒之径'
    },
    order: 3,
    unlockHint: '完成「露珠炼金」后解锁',
    recommendedRecipes: ['recipe_3', 'recipe_4'],
    regionSource: '合成台',
    regionDescription: '通过合成获得',
    conditions: [
      { type: CommissionConditionType.SYNTHESIZE_OUTPUT, targetPetalType: PetalType.GLOWING, targetCount: 3 }
    ]
  },
  {
    id: 'commission_collect_starlight_15',
    chainId: 'commission_chain_forest',
    title: '星光闪耀',
    description: '通过合成或收集获得15朵星光花瓣',
    targetPetalType: PetalType.STARLIGHT,
    targetCount: 15,
    currentCount: 0,
    status: CollectionTaskStatus.LOCKED,
    reward: {
      type: 'petal',
      petalType: PetalType.DREAM,
      count: 1,
      description: '奖励1朵梦境花瓣'
    },
    order: 4,
    unlockHint: '完成「荧光绽放」后解锁',
    recommendedRecipes: ['recipe_1'],
    regionSource: '星辰湖畔',
    regionDescription: '森林中央的静谧湖泊',
    conditions: [
      { type: CommissionConditionType.COLLECT_PETAL, targetPetalType: PetalType.STARLIGHT, targetCount: 15 }
    ]
  },
  {
    id: 'commission_synthesize_dream_2',
    chainId: 'commission_chain_forest',
    title: '梦境编织',
    description: '合成2朵梦境花瓣',
    targetPetalType: PetalType.DREAM,
    targetCount: 2,
    currentCount: 0,
    status: CollectionTaskStatus.LOCKED,
    reward: {
      type: 'petal',
      petalType: PetalType.DREAM,
      count: 2,
      description: '奖励2朵梦境花瓣'
    },
    order: 5,
    unlockHint: '完成「星光闪耀」后解锁',
    recommendedRecipes: ['recipe_4', 'recipe_5'],
    regionSource: '合成台',
    regionDescription: '通过合成获得',
    conditions: [
      { type: CommissionConditionType.SYNTHESIZE_OUTPUT, targetPetalType: PetalType.DREAM, targetCount: 2 }
    ]
  },
  {
    id: 'commission_total_synthesize_20',
    chainId: 'commission_chain_master',
    title: '初露锋芒',
    description: '累计成功合成20次',
    targetPetalType: PetalType.MOONLIGHT,
    targetCount: 20,
    currentCount: 0,
    status: CollectionTaskStatus.IN_PROGRESS,
    reward: {
      type: 'petal',
      petalType: PetalType.STARLIGHT,
      count: 10,
      description: '奖励10朵星光花瓣'
    },
    order: 1,
    unlockHint: '初始委托，累计合成次数',
    recommendedRecipes: ['recipe_1', 'recipe_2', 'recipe_3'],
    regionSource: '合成台',
    regionDescription: '通过任意成功合成',
    conditions: [
      { type: CommissionConditionType.TOTAL_SYNTHESIZED, targetCount: 20 }
    ]
  },
  {
    id: 'commission_discover_mutation_3',
    chainId: 'commission_chain_master',
    title: '变异探索者',
    description: '发现3种不同的变异花瓣',
    targetPetalType: PetalType.MOONLIGHT_SHIMMER,
    targetCount: 3,
    currentCount: 0,
    status: CollectionTaskStatus.LOCKED,
    reward: {
      type: 'petal',
      petalType: PetalType.DREAM_PHANTOM,
      count: 1,
      description: '奖励1朵幻梦花瓣'
    },
    order: 2,
    unlockHint: '完成「初露锋芒」后解锁，合成时会触发变异',
    recommendedRecipes: ['recipe_1', 'recipe_2', 'recipe_3', 'recipe_4', 'recipe_5'],
    regionSource: '合成台',
    regionDescription: '合成时触发变异获得',
    conditions: [
      { type: CommissionConditionType.DISCOVER_MUTATION, targetCount: 3 }
    ]
  },
  {
    id: 'commission_synthesize_eternal_1',
    chainId: 'commission_chain_master',
    title: '永恒之誓',
    description: '合成1朵永恒花瓣',
    targetPetalType: PetalType.ETERNAL,
    targetCount: 1,
    currentCount: 0,
    status: CollectionTaskStatus.LOCKED,
    reward: {
      type: 'petal',
      petalType: PetalType.ETERNAL,
      count: 1,
      description: '额外奖励1朵永恒花瓣'
    },
    order: 3,
    unlockHint: '完成「变异探索者」后解锁',
    recommendedRecipes: ['recipe_5', 'recipe_10'],
    regionSource: '合成台',
    regionDescription: '通过高级合成获得',
    conditions: [
      { type: CommissionConditionType.SYNTHESIZE_OUTPUT, targetPetalType: PetalType.ETERNAL, targetCount: 1 }
    ]
  }
];

export const DAILY_REWARDS: DailyReward[] = [
  {
    day: 1,
    type: 'petal',
    petalType: PetalType.MOONLIGHT,
    count: 10,
    description: '月光花瓣 ×10',
    icon: '🌙',
    color: 0x88ccff
  },
  {
    day: 2,
    type: 'petal',
    petalType: PetalType.STARLIGHT,
    count: 5,
    description: '星光花瓣 ×5',
    icon: '⭐',
    color: 0xffe66d
  },
  {
    day: 3,
    type: 'petal',
    petalType: PetalType.DEW,
    count: 3,
    description: '露珠花瓣 ×3',
    icon: '💧',
    color: 0xa8e6cf
  },
  {
    day: 4,
    type: 'petal',
    petalType: PetalType.GLOWING,
    count: 2,
    description: '荧光花瓣 ×2',
    icon: '✨',
    color: 0xff9ecb
  },
  {
    day: 5,
    type: 'petal',
    petalType: PetalType.DREAM,
    count: 2,
    description: '梦境花瓣 ×2',
    icon: '💜',
    color: 0xc8a2ff
  },
  {
    day: 6,
    type: 'petal',
    petalType: PetalType.ETERNAL,
    count: 1,
    description: '永恒花瓣 ×1',
    icon: '👑',
    color: 0xffd700
  },
  {
    day: 7,
    type: 'petal',
    petalType: PetalType.WAKEUP,
    count: 1,
    description: '唤醒之花 ×1',
    icon: '🌸',
    color: 0xff6b9d
  }
];

export const INITIAL_DAILY_REWARD_STATE: DailyRewardState = {
  lastLoginDate: '',
  consecutiveDays: 0,
  claimedDays: [],
  todayClaimed: false
};

export const DEFAULT_QUICK_ENTRIES: QuickEntry[] = [
  {
    id: QuickEntryType.SYNTHESIS,
    label: '合成',
    icon: '⚗️',
    color: 0xff6b9d,
    enabled: true
  },
  {
    id: QuickEntryType.COLLECTION,
    label: '图鉴',
    icon: '📖',
    color: 0xa8e6cf,
    enabled: true
  },
  {
    id: QuickEntryType.GOAL,
    label: '目标',
    icon: '🎯',
    color: 0xffd93d,
    enabled: true
  },
  {
    id: QuickEntryType.RECIPE_HINT,
    label: '推荐',
    icon: '💡',
    color: 0xc8a2ff,
    enabled: true
  },
  {
    id: QuickEntryType.MAP,
    label: '地图',
    icon: '🗺️',
    color: 0x66b3ff,
    enabled: true
  }
];

export const RARE_DROP_EVENTS: Omit<RareDropEvent, 'lastTriggered' | 'count'>[] = [
  {
    id: 'midnight_eternal',
    type: PetalType.ETERNAL,
    rarity: 'epic',
    trigger: 'time',
    triggerCondition: '午夜时分随机出现',
    probability: 0.08,
    cooldown: 60000,
    maxCount: 3,
    announcement: '✨ 午夜降临，永恒花瓣悄然绽放！'
  },
  {
    id: 'aurora_dream_phantom',
    type: PetalType.DREAM_PHANTOM,
    rarity: 'legendary',
    trigger: 'weather',
    triggerCondition: '极光天气时出现',
    probability: 0.15,
    cooldown: 45000,
    maxCount: 2,
    announcement: '🌌 极光中，幻梦花瓣显现！'
  },
  {
    id: 'meteor_starburst',
    type: PetalType.STARLIGHT_BURST,
    rarity: 'epic',
    trigger: 'weather',
    triggerCondition: '流星雨时坠落',
    probability: 0.2,
    cooldown: 30000,
    maxCount: 5,
    announcement: '☄️ 流星划过，星爆花瓣从天而降！'
  },
  {
    id: 'fullmoon_shimmer',
    type: PetalType.MOONLIGHT_SHIMMER,
    rarity: 'rare',
    trigger: 'time',
    triggerCondition: '满月之夜出现',
    probability: 0.25,
    cooldown: 40000,
    maxCount: 8,
    announcement: '🌕 满月当空，月华花瓣洒落！'
  },
  {
    id: 'storm_ember',
    type: PetalType.GLOWING_EMBER,
    rarity: 'rare',
    trigger: 'weather',
    triggerCondition: '暴风雨中出现',
    probability: 0.18,
    cooldown: 35000,
    maxCount: 6,
    announcement: '⚡ 雷暴中，烬荧花瓣闪烁！'
  },
  {
    id: 'snow_crystal',
    type: PetalType.DEW_CRYSTAL,
    rarity: 'rare',
    trigger: 'weather',
    triggerCondition: '下雪天结晶',
    probability: 0.22,
    cooldown: 35000,
    maxCount: 7,
    announcement: '❄️ 雪花凝结，晶露花瓣诞生！'
  },
  {
    id: 'fog_phantom',
    type: PetalType.DREAM_PHANTOM,
    rarity: 'legendary',
    trigger: 'weather',
    triggerCondition: '大雾中隐约出现',
    probability: 0.1,
    cooldown: 50000,
    maxCount: 2,
    announcement: '🌫️ 迷雾深处，幻梦花瓣若隐若现！'
  },
  {
    id: 'dawn_wakeup',
    type: PetalType.WAKEUP,
    rarity: 'legendary',
    trigger: 'time',
    triggerCondition: '黎明时分极低概率出现',
    probability: 0.01,
    cooldown: 300000,
    maxCount: 1,
    announcement: '🌸 奇迹！唤醒之花在黎明中绽放！'
  },
  {
    id: 'winter_eternal',
    type: PetalType.ETERNAL,
    rarity: 'epic',
    trigger: 'season',
    triggerCondition: '冬季稀有出现',
    probability: 0.12,
    cooldown: 80000,
    maxCount: 4,
    announcement: '❄️ 寒冬之中，永恒花瓣傲然绽放！'
  },
  {
    id: 'autumn_dream',
    type: PetalType.DREAM,
    rarity: 'rare',
    trigger: 'season',
    triggerCondition: '秋季常见',
    probability: 0.15,
    cooldown: 25000,
    maxCount: 10,
    announcement: '🍂 秋风起，梦境花瓣飘舞！'
  },
  {
    id: 'milestone_100_wakeup',
    type: PetalType.WAKEUP,
    rarity: 'legendary',
    trigger: 'milestone',
    triggerCondition: '收集100朵花瓣后概率出现',
    probability: 0.05,
    cooldown: 120000,
    maxCount: 1,
    announcement: '🎉 收集达成里程碑！唤醒之花作为奖励出现！'
  },
  {
    id: 'random_legendary',
    type: PetalType.WAKEUP,
    rarity: 'legendary',
    trigger: 'random',
    triggerCondition: '极低概率随机出现',
    probability: 0.005,
    cooldown: 600000,
    maxCount: 1,
    announcement: '🌟 传说中的奇迹！唤醒之花神秘出现！'
  }
];

export const VISITOR_SPRITE_CONFIGS: Record<VisitorSpriteId, VisitorSpriteConfig> = {
  [VisitorSpriteId.LUNA]: {
    id: VisitorSpriteId.LUNA,
    name: '露娜',
    title: '月光守望者',
    description: '月光林地最古老的精灵，热爱一切与月光有关的事物',
    appearance: '🧚',
    personality: '温柔恬静，喜爱月光下的宁静',
    color: 0x88ccff,
    glowColor: 0x4488ff,
    preferredPetals: [PetalType.MOONLIGHT, PetalType.MOONLIGHT_SHIMMER],
    dislikedPetals: [PetalType.FAILED_ASH],
    visitWeight: 30,
    minPlayTime: 0,
    orderCooldown: 60000,
    affectionThresholds: [0, 20, 50, 100, 180, 300],
    levelTitles: ['陌生人', '初识', '朋友', '挚友', '知己', '灵魂伴侣'],
    dialogue: {
      greet: ['月光之下，我们再次相遇了', '你好呀，梦境森林的访客', '今晚的月色真美...'],
      happy: ['这正合我意！月光花瓣是我最喜欢的', '你真懂我！太感谢了', '完美！这是月光赐予的缘分'],
      neutral: ['嗯...可以接受', '还好吧，虽然不是我的最爱', '谢谢你的心意'],
      dislike: ['这...不太合我意呢', '灰烬让我感到不安...', '下次换个别的吧？'],
      affectionUp: ['我们越来越了解彼此了', '和你在一起感觉很安心', '你是月光带给我的珍贵礼物'],
      orderPlace: ['我需要一些月光花瓣来完成仪式', '能帮我收集这些花瓣吗？'],
      orderFulfill: ['太棒了！月光仪式可以继续了', '你是最可靠的伙伴！'],
      reward: ['这是月光凝结的礼物，送给你', '愿月光永远照耀你的道路']
    }
  },
  [VisitorSpriteId.EMBER]: {
    id: VisitorSpriteId.EMBER,
    name: '炎灵',
    title: '荧光洞穴守护者',
    description: '洞穴深处的热情精灵，被温暖的光芒所吸引',
    appearance: '🔥',
    personality: '热情似火，喜欢一切发光的东西',
    color: 0xff9ecb,
    glowColor: 0xff66aa,
    preferredPetals: [PetalType.GLOWING, PetalType.GLOWING_EMBER],
    dislikedPetals: [PetalType.FAILED_SLIME],
    visitWeight: 20,
    minPlayTime: 60,
    orderCooldown: 75000,
    affectionThresholds: [0, 25, 60, 120, 200, 350],
    levelTitles: ['陌生人', '初识', '朋友', '挚友', '知己', '灵魂伴侣'],
    dialogue: {
      greet: ['哇！洞穴外面也好温暖呢', '嗨嗨！又见面了', '你的光芒吸引了我！'],
      happy: ['这就是我想要的！完美！', '荧光花瓣！我的最爱！', '太温暖了，谢谢你！'],
      neutral: ['还行吧，不算太差', '嗯，虽然不是我想要的', '至少不是黏糊糊的东西'],
      dislike: ['呃...黏液让我浑身不舒服', '这种东西...还是算了吧', '你在开玩笑吧？'],
      affectionUp: ['我们简直是火焰双子！', '你让我觉得洞穴也不那么孤独了', '你的温暖让我感动'],
      orderPlace: ['洞穴深处需要更多荧光', '帮我找些发光的花瓣吧！'],
      orderFulfill: ['你果然是最靠谱的！', '洞穴又明亮起来了！'],
      reward: ['这是我珍藏的发光宝石', '愿你的道路永远被荧光照亮']
    }
  },
  [VisitorSpriteId.RIVER]: {
    id: VisitorSpriteId.RIVER,
    name: '溪音',
    title: '星辰湖畔精灵',
    description: '湖畔的优雅精灵，钟爱露珠与星光',
    appearance: '💧',
    personality: '优雅沉静，像水面一样平静',
    color: 0xa8e6cf,
    glowColor: 0x44ddaa,
    preferredPetals: [PetalType.DEW, PetalType.DEW_CRYSTAL, PetalType.STARLIGHT],
    dislikedPetals: [PetalType.FAILED_DUST],
    visitWeight: 25,
    minPlayTime: 30,
    orderCooldown: 65000,
    affectionThresholds: [0, 22, 55, 110, 190, 320],
    levelTitles: ['陌生人', '初识', '朋友', '挚友', '知己', '灵魂伴侣'],
    dialogue: {
      greet: ['湖面倒映着星光...你也看到了吗', '星辰湖畔的精灵向你问好', '今天的水波格外温柔'],
      happy: ['晶莹剔透，就像晨露一样', '你真是有心人！', '星露交融，美不胜收'],
      neutral: ['好吧，这也是一种心意', '嗯...可以接受', '谢谢你的努力'],
      dislike: ['尘埃落在水面上...不好', '我不太喜欢这种浑浊的感觉', '请别再给我这个了'],
      affectionUp: ['你就像水面一样清澈', '我们的友情如同湖水般深远', '你是星辰湖最好的朋友'],
      orderPlace: ['湖水的净化需要一些花瓣', '能帮我收集这些吗？'],
      orderFulfill: ['湖水重新变得清澈了', '你是星辰湖的守护者！'],
      reward: ['湖底珍藏的晶露，送给你', '愿清澈的泉水永远伴随你']
    }
  },
  [VisitorSpriteId.FLORA]: {
    id: VisitorSpriteId.FLORA,
    name: '花语',
    title: '梦境花园主人',
    description: '梦境花园的主人，痴迷于梦境花瓣的奥秘',
    appearance: '🌸',
    personality: '梦幻浪漫，总是沉浸在自己的世界中',
    color: 0xc8a2ff,
    glowColor: 0x9966ff,
    preferredPetals: [PetalType.DREAM, PetalType.DREAM_PHANTOM],
    dislikedPetals: [PetalType.FAILED_SLIME, PetalType.FAILED_ASH],
    visitWeight: 15,
    minPlayTime: 120,
    orderCooldown: 80000,
    affectionThresholds: [0, 30, 70, 140, 240, 400],
    levelTitles: ['陌生人', '初识', '朋友', '挚友', '知己', '灵魂伴侣'],
    dialogue: {
      greet: ['你来了...是梦引领你来的吗', '梦境与现实之间，欢迎你', '我在梦中感应到了你的到来'],
      happy: ['梦境花瓣！我等了好久', '你是我梦中最美的幻影', '这就是我梦寐以求的！'],
      neutral: ['梦境中也有这样的画面', '嗯...不算太坏的梦', '虽然不完美，但也是梦的一部分'],
      dislike: ['这不是我想要的梦...', '恶梦般的礼物', '请给我更美好的梦吧'],
      affectionUp: ['你出现在我最美的梦中', '我们的羁绊已经超越了梦境', '你是我梦中最真实的部分'],
      orderPlace: ['花园的梦境需要更多花瓣编织', '帮我搜集这些梦的材料'],
      orderFulfill: ['梦境花园又绽放了新花', '你是最伟大的梦境编织者！'],
      reward: ['这是从最深梦境中采摘的珍宝', '愿美好的梦永远与你相伴']
    }
  },
  [VisitorSpriteId.AURORA]: {
    id: VisitorSpriteId.AURORA,
    name: '极光',
    title: '永恒神殿祭司',
    description: '守护永恒神殿的神秘精灵，对永恒花瓣有执着的追求',
    appearance: '✨',
    personality: '庄严神秘，言谈间带着古老的智慧',
    color: 0xffd700,
    glowColor: 0xffaa00,
    preferredPetals: [PetalType.ETERNAL, PetalType.STARLIGHT_BURST],
    dislikedPetals: [PetalType.FAILED_DUST, PetalType.FAILED_ASH],
    visitWeight: 8,
    minPlayTime: 180,
    orderCooldown: 90000,
    affectionThresholds: [0, 35, 80, 160, 280, 450],
    levelTitles: ['陌生人', '初识', '朋友', '挚友', '知己', '灵魂伴侣'],
    dialogue: {
      greet: ['永恒神殿欢迎你的到来', '时间如河流，而你如磐石', '命运的丝线将我们相连'],
      happy: ['永恒的力量在你手中凝聚', '这正合神殿的需要', '你拥有超越时间的力量'],
      neutral: ['时间会证明一切', '嗯...尚可接受', '这也是命运的一种安排'],
      dislike: ['衰败之物不该出现在神殿', '这会玷污永恒的纯净', '请敬畏永恒的力量'],
      affectionUp: ['你正在触碰永恒的边缘', '时间无法磨灭我们的羁绊', '你是永恒选中的人'],
      orderPlace: ['神殿需要这些花瓣来维持永恒之力', '帮我完成这个神圣的使命'],
      orderFulfill: ['神殿的光辉因你而更加耀眼', '你是永恒最忠诚的守护者！'],
      reward: ['永恒之力凝聚成的宝物，赐予你', '愿永恒之光永远守护你']
    }
  },
  [VisitorSpriteId.SHADOW]: {
    id: VisitorSpriteId.SHADOW,
    name: '暗影',
    title: '梦境森林神秘客',
    description: '身份成谜的精灵，似乎对唤醒之花有特殊的感应',
    appearance: '🌙',
    personality: '神秘莫测，时而冷漠时而温柔',
    color: 0x2a1a4e,
    glowColor: 0x4a2a6e,
    preferredPetals: [PetalType.WAKEUP, PetalType.ETERNAL, PetalType.DREAM_PHANTOM],
    dislikedPetals: [],
    visitWeight: 3,
    minPlayTime: 300,
    orderCooldown: 120000,
    affectionThresholds: [0, 50, 120, 220, 380, 600],
    levelTitles: ['陌生人', '初识', '朋友', '挚友', '知己', '灵魂伴侣'],
    dialogue: {
      greet: ['...你看到了我？有意思', '命运的齿轮又转动了', '这次来的是你...'],
      happy: ['...不错，你的品味出乎意料', '这是我珍视的东西...谢谢', '你...比我想象中更特别'],
      neutral: ['...随你', '嗯...也算可以', '无妨'],
      dislike: ['...我什么都能接受', '没有关系...'],
      affectionUp: ['...你让我想起了过去的某个人', '也许...你可以相信', '你的存在，让我开始期待明天'],
      orderPlace: ['...帮我找到这些花瓣', '这是唤醒沉睡之人的关键...'],
      orderFulfill: ['...你做到了', '也许...苏醒之日不远了'],
      reward: ['这是...最重要的东西，交给你了', '愿你能唤醒那个人...拜托了']
    }
  }
};

export const VISITOR_SYSTEM_CONFIG = {
  MIN_VISIT_INTERVAL: 45000,
  MAX_VISIT_INTERVAL: 180000,
  VISIT_DURATION: 60000,
  ORDER_BASE_TIME_LIMIT: 120000,
  ORDER_AFFECTION_REWARD_BASE: 10,
  ORDER_AFFECTION_REWARD_PREFERRED_BONUS: 8,
  PREFERENCE_DISCOVERY_CHANCE: 0.3,
  AFFECTION_DECAY_RATE: 0,
  MAX_ACTIVE_ORDERS: 1,
  MAX_INTERACTION_RECORDS: 50
};

export const VISITOR_REWARDS: Record<VisitorSpriteId, VisitorReward[]> = {
  [VisitorSpriteId.LUNA]: [
    { id: 'luna_reward_1', spriteId: VisitorSpriteId.LUNA, affectionLevel: AffectionLevel.ACQUAINTANCE, type: 'petal', petalType: PetalType.MOONLIGHT, count: 5, description: '月光花瓣 ×5', icon: '🌙', claimed: false },
    { id: 'luna_reward_2', spriteId: VisitorSpriteId.LUNA, affectionLevel: AffectionLevel.FRIEND, type: 'recipe', recipeId: 'recipe_7', description: '解锁月光融合配方', icon: '📜', claimed: false },
    { id: 'luna_reward_3', spriteId: VisitorSpriteId.LUNA, affectionLevel: AffectionLevel.CLOSE_FRIEND, type: 'petal', petalType: PetalType.MOONLIGHT_SHIMMER, count: 2, description: '月华花瓣 ×2', icon: '✨', claimed: false },
    { id: 'luna_reward_4', spriteId: VisitorSpriteId.LUNA, affectionLevel: AffectionLevel.CONFIDANT, type: 'efficiency', efficiencyBoost: 0.1, description: '收集效率提升10%', icon: '⚡', claimed: false },
    { id: 'luna_reward_5', spriteId: VisitorSpriteId.LUNA, affectionLevel: AffectionLevel.SOULMATE, type: 'petal', petalType: PetalType.ETERNAL, count: 1, description: '永恒花瓣 ×1', icon: '👑', claimed: false }
  ],
  [VisitorSpriteId.EMBER]: [
    { id: 'ember_reward_1', spriteId: VisitorSpriteId.EMBER, affectionLevel: AffectionLevel.ACQUAINTANCE, type: 'petal', petalType: PetalType.GLOWING, count: 3, description: '荧光花瓣 ×3', icon: '💫', claimed: false },
    { id: 'ember_reward_2', spriteId: VisitorSpriteId.EMBER, affectionLevel: AffectionLevel.FRIEND, type: 'petal', petalType: PetalType.GLOWING_EMBER, count: 1, description: '烬荧花瓣 ×1', icon: '🔥', claimed: false },
    { id: 'ember_reward_3', spriteId: VisitorSpriteId.EMBER, affectionLevel: AffectionLevel.CLOSE_FRIEND, type: 'recipe', recipeId: 'recipe_9', description: '解锁荧光梦境配方', icon: '📜', claimed: false },
    { id: 'ember_reward_4', spriteId: VisitorSpriteId.EMBER, affectionLevel: AffectionLevel.CONFIDANT, type: 'efficiency', efficiencyBoost: 0.1, description: '合成成功率提升10%', icon: '⚡', claimed: false },
    { id: 'ember_reward_5', spriteId: VisitorSpriteId.EMBER, affectionLevel: AffectionLevel.SOULMATE, type: 'petal', petalType: PetalType.DREAM, count: 2, description: '梦境花瓣 ×2', icon: '💜', claimed: false }
  ],
  [VisitorSpriteId.RIVER]: [
    { id: 'river_reward_1', spriteId: VisitorSpriteId.RIVER, affectionLevel: AffectionLevel.ACQUAINTANCE, type: 'petal', petalType: PetalType.DEW, count: 3, description: '露珠花瓣 ×3', icon: '💧', claimed: false },
    { id: 'river_reward_2', spriteId: VisitorSpriteId.RIVER, affectionLevel: AffectionLevel.FRIEND, type: 'recipe', recipeId: 'recipe_8', description: '解锁星露交融配方', icon: '📜', claimed: false },
    { id: 'river_reward_3', spriteId: VisitorSpriteId.RIVER, affectionLevel: AffectionLevel.CLOSE_FRIEND, type: 'petal', petalType: PetalType.DEW_CRYSTAL, count: 1, description: '晶露花瓣 ×1', icon: '❄️', claimed: false },
    { id: 'river_reward_4', spriteId: VisitorSpriteId.RIVER, affectionLevel: AffectionLevel.CONFIDANT, type: 'efficiency', efficiencyBoost: 0.15, description: '收集效率提升15%', icon: '⚡', claimed: false },
    { id: 'river_reward_5', spriteId: VisitorSpriteId.RIVER, affectionLevel: AffectionLevel.SOULMATE, type: 'petal', petalType: PetalType.ETERNAL, count: 1, description: '永恒花瓣 ×1', icon: '👑', claimed: false }
  ],
  [VisitorSpriteId.FLORA]: [
    { id: 'flora_reward_1', spriteId: VisitorSpriteId.FLORA, affectionLevel: AffectionLevel.ACQUAINTANCE, type: 'petal', petalType: PetalType.DREAM, count: 2, description: '梦境花瓣 ×2', icon: '💜', claimed: false },
    { id: 'flora_reward_2', spriteId: VisitorSpriteId.FLORA, affectionLevel: AffectionLevel.FRIEND, type: 'petal', petalType: PetalType.DREAM_PHANTOM, count: 1, description: '幻梦花瓣 ×1', icon: '✨', claimed: false },
    { id: 'flora_reward_3', spriteId: VisitorSpriteId.FLORA, affectionLevel: AffectionLevel.CLOSE_FRIEND, type: 'recipe', recipeId: 'recipe_10', description: '解锁永恒之径配方', icon: '📜', claimed: false },
    { id: 'flora_reward_4', spriteId: VisitorSpriteId.FLORA, affectionLevel: AffectionLevel.CONFIDANT, type: 'efficiency', efficiencyBoost: 0.12, description: '变异概率提升12%', icon: '⚡', claimed: false },
    { id: 'flora_reward_5', spriteId: VisitorSpriteId.FLORA, affectionLevel: AffectionLevel.SOULMATE, type: 'petal', petalType: PetalType.ETERNAL, count: 2, description: '永恒花瓣 ×2', icon: '👑', claimed: false }
  ],
  [VisitorSpriteId.AURORA]: [
    { id: 'aurora_reward_1', spriteId: VisitorSpriteId.AURORA, affectionLevel: AffectionLevel.ACQUAINTANCE, type: 'petal', petalType: PetalType.STARLIGHT, count: 5, description: '星光花瓣 ×5', icon: '⭐', claimed: false },
    { id: 'aurora_reward_2', spriteId: VisitorSpriteId.AURORA, affectionLevel: AffectionLevel.FRIEND, type: 'petal', petalType: PetalType.STARLIGHT_BURST, count: 1, description: '星爆花瓣 ×1', icon: '💥', claimed: false },
    { id: 'aurora_reward_3', spriteId: VisitorSpriteId.AURORA, affectionLevel: AffectionLevel.CLOSE_FRIEND, type: 'recipe', recipeId: 'recipe_12', description: '解锁星爆结晶配方', icon: '📜', claimed: false },
    { id: 'aurora_reward_4', spriteId: VisitorSpriteId.AURORA, affectionLevel: AffectionLevel.CONFIDANT, type: 'efficiency', efficiencyBoost: 0.15, description: '稀有掉落概率提升15%', icon: '⚡', claimed: false },
    { id: 'aurora_reward_5', spriteId: VisitorSpriteId.AURORA, affectionLevel: AffectionLevel.SOULMATE, type: 'petal', petalType: PetalType.ETERNAL, count: 2, description: '永恒花瓣 ×2', icon: '👑', claimed: false }
  ],
  [VisitorSpriteId.SHADOW]: [
    { id: 'shadow_reward_1', spriteId: VisitorSpriteId.SHADOW, affectionLevel: AffectionLevel.ACQUAINTANCE, type: 'petal', petalType: PetalType.DREAM, count: 3, description: '梦境花瓣 ×3', icon: '💜', claimed: false },
    { id: 'shadow_reward_2', spriteId: VisitorSpriteId.SHADOW, affectionLevel: AffectionLevel.FRIEND, type: 'petal', petalType: PetalType.ETERNAL, count: 1, description: '永恒花瓣 ×1', icon: '👑', claimed: false },
    { id: 'shadow_reward_3', spriteId: VisitorSpriteId.SHADOW, affectionLevel: AffectionLevel.CLOSE_FRIEND, type: 'petal', petalType: PetalType.DREAM_PHANTOM, count: 2, description: '幻梦花瓣 ×2', icon: '✨', claimed: false },
    { id: 'shadow_reward_4', spriteId: VisitorSpriteId.SHADOW, affectionLevel: AffectionLevel.CONFIDANT, type: 'efficiency', efficiencyBoost: 0.2, description: '全效率提升20%', icon: '⚡', claimed: false },
    { id: 'shadow_reward_5', spriteId: VisitorSpriteId.SHADOW, affectionLevel: AffectionLevel.SOULMATE, type: 'petal', petalType: PetalType.WAKEUP, count: 1, description: '唤醒之花 ×1', icon: '🌸', claimed: false }
  ]
};

export const INITIAL_VISITOR_SYSTEM_STATE: VisitorSystemState = {
  sprites: Object.values(VisitorSpriteId).map(id => ({
    spriteId: id,
    affection: 0,
    level: AffectionLevel.STRANGER,
    totalVisits: 0,
    totalOrdersPlaced: 0,
    totalOrdersFulfilled: 0,
    totalOrdersExpired: 0,
    lastVisitTime: 0,
    lastOrderTime: 0,
    unlocked: id === VisitorSpriteId.LUNA,
    rewards: VISITOR_REWARDS[id].map(r => ({ ...r })),
    discoveredPreferences: [],
    discoveredDislikes: []
  })),
  activeVisitor: null,
  activeOrder: null,
  visitorArrivedAt: 0,
  nextVisitTime: 0,
  visitDuration: VISITOR_SYSTEM_CONFIG.VISIT_DURATION,
  totalVisitorInteractions: 0,
  completedSpriteCount: 0
};

export const INITIAL_ENVIRONMENT: EnvironmentState = {
  time: {
    gameTime: 0,
    dayCount: 1,
    timeOfDay: TimeOfDay.NIGHT,
    timeProgress: 0.9,
    season: SeasonType.SPRING,
    dayStartTime: 0,
    isFullMoon: false,
    isMeteorShower: false,
    moonPhase: 0
  },
  weather: {
    currentWeather: WeatherType.CLEAR,
    weatherDuration: 30000,
    weatherIntensity: 0.5,
    nextWeatherChange: 30000,
    weatherTransition: 0,
    targetWeather: WeatherType.CLEAR
  },
  ambientLight: 0.3,
  skyColor: 0x0a0514,
  fogDensity: 0.1,
  windSpeed: 0,
  temperature: 20
};

export const INITIAL_ENVIRONMENT_STATS: EnvironmentStats = {
  totalDaysPlayed: 0,
  nightsPlayed: 0,
  weatherExperience: Object.values(WeatherType).reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {} as Record<WeatherType, number>),
  rareDropsFound: [],
  specialEventsWitnessed: [],
  totalRareDrops: 0
};

export const WORKSHOP_RECIPES: WorkshopRecipe[] = [
  {
    id: 'workshop_refine_moonlight',
    inputs: [{ type: PetalType.MOONLIGHT, count: 5 }],
    output: { type: PetalType.STARLIGHT, count: 2 },
    processingType: ProcessingType.REFINING,
    processingTime: 3000,
    batchMax: 5,
    successRate: 0.9,
    upgradeLevel: 1,
    upgradeCost: [{ type: PetalType.MOONLIGHT, count: 10 }],
    upgradeSuccessRateBonus: 0.05,
    upgradeOutputBonus: 1,
    unlockCondition: [{ type: PetalType.MOONLIGHT, count: 5 }],
    description: '将月光花瓣精炼为更高纯度的星光花瓣'
  },
  {
    id: 'workshop_purify_starlight',
    inputs: [{ type: PetalType.STARLIGHT, count: 4 }],
    output: { type: PetalType.DEW, count: 2 },
    processingType: ProcessingType.PURIFYING,
    processingTime: 4000,
    batchMax: 4,
    successRate: 0.85,
    upgradeLevel: 1,
    upgradeCost: [{ type: PetalType.STARLIGHT, count: 8 }],
    upgradeSuccessRateBonus: 0.05,
    upgradeOutputBonus: 1,
    unlockCondition: [{ type: PetalType.STARLIGHT, count: 3 }],
    description: '净化星光花瓣，凝结出清澈的露珠花瓣'
  },
  {
    id: 'workshop_enhance_dew',
    inputs: [{ type: PetalType.DEW, count: 3 }],
    output: { type: PetalType.GLOWING, count: 2 },
    processingType: ProcessingType.ENHANCING,
    processingTime: 5000,
    batchMax: 3,
    successRate: 0.8,
    upgradeLevel: 1,
    upgradeCost: [{ type: PetalType.DEW, count: 6 }],
    upgradeSuccessRateBonus: 0.06,
    upgradeOutputBonus: 1,
    unlockCondition: [{ type: PetalType.DEW, count: 2 }],
    description: '强化露珠花瓣，激发其内在荧光'
  },
  {
    id: 'workshop_refine_glowing',
    inputs: [{ type: PetalType.GLOWING, count: 3 }],
    output: { type: PetalType.DREAM, count: 2 },
    processingType: ProcessingType.REFINING,
    processingTime: 6000,
    batchMax: 3,
    successRate: 0.75,
    upgradeLevel: 1,
    upgradeCost: [{ type: PetalType.GLOWING, count: 6 }],
    upgradeSuccessRateBonus: 0.06,
    upgradeOutputBonus: 1,
    unlockCondition: [{ type: PetalType.GLOWING, count: 2 }],
    description: '精炼荧光花瓣，提炼出梦幻般的梦境花瓣'
  },
  {
    id: 'workshop_purify_dream',
    inputs: [{ type: PetalType.DREAM, count: 3 }, { type: PetalType.STARLIGHT, count: 2 }],
    output: { type: PetalType.ETERNAL, count: 2 },
    processingType: ProcessingType.PURIFYING,
    processingTime: 8000,
    batchMax: 2,
    successRate: 0.7,
    upgradeLevel: 1,
    upgradeCost: [{ type: PetalType.DREAM, count: 5 }],
    upgradeSuccessRateBonus: 0.07,
    upgradeOutputBonus: 1,
    unlockCondition: [{ type: PetalType.DREAM, count: 2 }],
    description: '净化梦境花瓣与星光的融合物，凝聚永恒之力'
  },
  {
    id: 'workshop_enhance_eternal',
    inputs: [{ type: PetalType.ETERNAL, count: 2 }, { type: PetalType.DREAM, count: 3 }, { type: PetalType.GLOWING, count: 4 }],
    output: { type: PetalType.WAKEUP, count: 1 },
    processingType: ProcessingType.ENHANCING,
    processingTime: 12000,
    batchMax: 1,
    successRate: 0.6,
    upgradeLevel: 1,
    upgradeCost: [{ type: PetalType.ETERNAL, count: 3 }],
    upgradeSuccessRateBonus: 0.08,
    upgradeOutputBonus: 0,
    unlockCondition: [{ type: PetalType.ETERNAL, count: 1 }],
    description: '终极强化工艺，融合永恒、梦境与荧光，尝试唤醒沉睡之花'
  },
  {
    id: 'workshop_refine_mutation_shimmer',
    inputs: [{ type: PetalType.MOONLIGHT_SHIMMER, count: 2 }],
    output: { type: PetalType.STARLIGHT_BURST, count: 1 },
    processingType: ProcessingType.REFINING,
    processingTime: 5000,
    batchMax: 3,
    successRate: 0.85,
    upgradeLevel: 1,
    upgradeCost: [{ type: PetalType.MOONLIGHT_SHIMMER, count: 4 }],
    upgradeSuccessRateBonus: 0.05,
    upgradeOutputBonus: 1,
    unlockCondition: [{ type: PetalType.MOONLIGHT_SHIMMER, count: 1 }],
    description: '精炼月华花瓣的变异能量，转化为璀璨的星爆花瓣'
  },
  {
    id: 'workshop_purify_mutation_burst',
    inputs: [{ type: PetalType.STARLIGHT_BURST, count: 2 }],
    output: { type: PetalType.DEW_CRYSTAL, count: 1 },
    processingType: ProcessingType.PURIFYING,
    processingTime: 6000,
    batchMax: 2,
    successRate: 0.8,
    upgradeLevel: 1,
    upgradeCost: [{ type: PetalType.STARLIGHT_BURST, count: 4 }],
    upgradeSuccessRateBonus: 0.06,
    upgradeOutputBonus: 1,
    unlockCondition: [{ type: PetalType.STARLIGHT_BURST, count: 1 }],
    description: '净化星爆花瓣的爆裂能量，结晶为晶露花瓣'
  }
];

export const WORKSHOP_MAX_RECORDS = 30;
export const WORKSHOP_MAX_ACTIVE_JOBS = 3;

export const INITIAL_WORKSHOP_STATE: WorkshopState = {
  recipeStates: WORKSHOP_RECIPES.map(recipe => ({
    recipeId: recipe.id,
    isUnlocked: recipe.unlockCondition.length === 0,
    currentLevel: 1,
    totalProduced: 0,
    totalBatchRuns: 0,
    lastProducedAt: 0
  })),
  activeJobs: [],
  productionStats: {
    totalProcessed: 0,
    totalOutput: 0,
    totalBatchOperations: 0,
    totalUpgrades: 0,
    averageOutputPerRun: 0,
    recipesByProcessingType: {
      [ProcessingType.REFINING]: 0,
      [ProcessingType.PURIFYING]: 0,
      [ProcessingType.ENHANCING]: 0
    },
    peakBatchSize: 0,
    totalProcessingTime: 0
  },
  productionRecords: []
};

export const INITIAL_GAME_STATE: GameState = {
  playerX: WORLD_WIDTH / 2,
  playerY: WORLD_HEIGHT / 2,
  petals: {
    [PetalType.MOONLIGHT]: 0,
    [PetalType.STARLIGHT]: 0,
    [PetalType.DEW]: 0,
    [PetalType.GLOWING]: 0,
    [PetalType.DREAM]: 0,
    [PetalType.ETERNAL]: 0,
    [PetalType.WAKEUP]: 0,
    [PetalType.MOONLIGHT_SHIMMER]: 0,
    [PetalType.STARLIGHT_BURST]: 0,
    [PetalType.DEW_CRYSTAL]: 0,
    [PetalType.GLOWING_EMBER]: 0,
    [PetalType.DREAM_PHANTOM]: 0,
    [PetalType.FAILED_DUST]: 0,
    [PetalType.FAILED_SLIME]: 0,
    [PetalType.FAILED_ASH]: 0
  },
  unlockedPetals: [PetalType.MOONLIGHT],
  totalCollected: 0,
  totalSynthesized: 0,
  totalMutations: 0,
  totalFailures: 0,
  playTime: 0,
  isCompleted: false,
  hasWakeUp: false,
  unlockedRecipes: [
    'recipe_1',
    'recipe_7'
  ],
  discoveredMutations: [],
  discoveredFailures: [],
  resourceTrend: [],
  synthesisRecords: [],
  goals: JSON.parse(JSON.stringify(INITIAL_GOALS)),
  activeStatusMessages: [],
  lastSaveTime: 0,
  efficiencyBoost: 0,
  collectionTasks: JSON.parse(JSON.stringify(INITIAL_COLLECTION_TASKS)),
  collectionTaskChains: JSON.parse(JSON.stringify(INITIAL_COLLECTION_TASK_CHAINS)),
  commissionTasks: JSON.parse(JSON.stringify(INITIAL_COMMISSION_TASKS)),
  commissionTaskChains: JSON.parse(JSON.stringify(INITIAL_COMMISSION_TASK_CHAINS)),
  redDotState: JSON.parse(JSON.stringify(INITIAL_RED_DOT_STATE)),
  regionHeats: REGIONS.map(region => ({
    regionId: region.id,
    currentHeat: region.baseHeat,
    lastCollectTime: 0,
    collectCount: 0
  })),
  consecutiveCollect: null,
  dailyRewardState: JSON.parse(JSON.stringify(INITIAL_DAILY_REWARD_STATE)),
  environment: JSON.parse(JSON.stringify(INITIAL_ENVIRONMENT)),
  environmentStats: JSON.parse(JSON.stringify(INITIAL_ENVIRONMENT_STATS)),
  rareDropEvents: RARE_DROP_EVENTS.map(event => ({
    ...event,
    lastTriggered: 0,
    count: 0
  })),
  visitorSystem: JSON.parse(JSON.stringify(INITIAL_VISITOR_SYSTEM_STATE)),
  regionUnlockStates: getInitialRegionUnlockStates(),
  currentRegionId: getDefaultCurrentRegionId(),
  lastRegionId: null,
  workshopState: JSON.parse(JSON.stringify(INITIAL_WORKSHOP_STATE)),
  storyProgress: getInitialStoryProgressState()
};

export const INITIAL_TUTORIAL_STATE = {
  currentStep: 0,
  steps: JSON.parse(JSON.stringify(TUTORIAL_STEPS)),
  completed: false,
  dismissed: false,
  activeGuideId: undefined as string | undefined,
  guideProgress: [] as TutorialGuideProgress[],
  validationAttempts: {} as Record<string, number>
};

export const INITIAL_COLLECT_RANGE_STATE = {
  currentRange: COLLECT_RANGE_GROWTH.baseRange,
  currentLevel: 1,
  petalsForNextLevel: COLLECT_RANGE_GROWTH.petalsPerLevel
};

export const STORAGE_KEY = 'dream_forest_save';
export const SETTINGS_STORAGE_KEY = 'dream_forest_control_settings';
export const TUTORIAL_STORAGE_KEY = 'dream_forest_tutorial';
export const BACKUP_STORAGE_KEY = 'dream_forest_save_backups';
export const AUTO_BACKUP_KEY = 'dream_forest_auto_backup';
export const SAVE_VERSION = '5.5.0';

export const MAX_BACKUP_COUNT = 10;
export const MAX_AUTO_BACKUP_COUNT = 3;
export const AUTO_BACKUP_INTERVAL = 60000;

export const INITIAL_SETTINGS = {
  bgmVolume: 0.5,
  sfxVolume: 0.7,
  isMuted: false,
  audioContextPreferences: {} as Partial<Record<AudioContextType, { volume: number; enabled: boolean }>>
};

export function getInitialGameState() {
  return JSON.parse(JSON.stringify(INITIAL_GAME_STATE));
}

export function getInitialSettings() {
  return JSON.parse(JSON.stringify(INITIAL_SETTINGS));
}

export function getInitialControlSettings() {
  return JSON.parse(JSON.stringify(INITIAL_CONTROL_SETTINGS));
}

export function getInitialTutorialState() {
  return JSON.parse(JSON.stringify(INITIAL_TUTORIAL_STATE));
}

export function getInitialCollectRangeState() {
  return JSON.parse(JSON.stringify(INITIAL_COLLECT_RANGE_STATE));
}

export function calculateCollectRange(totalCollected: number): { range: number; level: number; progress: number } {
  const { baseRange, rangePerLevel, maxRange, petalsPerLevel, maxLevel } = COLLECT_RANGE_GROWTH;
  const level = Math.min(Math.floor(totalCollected / petalsPerLevel) + 1, maxLevel);
  const range = Math.min(baseRange + (level - 1) * rangePerLevel, maxRange);
  const progress = (totalCollected % petalsPerLevel) / petalsPerLevel;
  return { range, level, progress };
}

export const MAX_PETALS_ON_SCREEN = PETAL_MAX_COUNT;

export const RECIPE_UNLOCK_CONDITIONS: Record<string, { petals: { type: PetalType; count: number }[] }> = {
  'recipe_2': { petals: [{ type: PetalType.STARLIGHT, count: 1 }] },
  'recipe_3': { petals: [{ type: PetalType.DEW, count: 1 }] },
  'recipe_4': { petals: [{ type: PetalType.GLOWING, count: 1 }] },
  'recipe_5': { petals: [{ type: PetalType.DREAM, count: 1 }] },
  'recipe_6': { petals: [{ type: PetalType.ETERNAL, count: 1 }] },
  'recipe_8': { petals: [{ type: PetalType.DEW, count: 1 }] },
  'recipe_9': { petals: [{ type: PetalType.GLOWING, count: 1 }] },
  'recipe_10': { petals: [{ type: PetalType.DREAM, count: 1 }] },
  'recipe_11': { petals: [{ type: PetalType.MOONLIGHT_SHIMMER, count: 1 }] },
  'recipe_12': { petals: [{ type: PetalType.STARLIGHT_BURST, count: 1 }] }
};

export const MILESTONE_CONFIG = {
  firstCollect: { icon: '🌸', color: 0xff6b9d, title: '初次收集' },
  firstSynthesis: { icon: '⚗️', color: 0xc8a2ff, title: '首次合成' },
  firstMutation: { icon: '✨', color: 0xffd93d, title: '首次变异' },
  unlockStarlight: { icon: '⭐', color: 0xffe66d, title: '星光绽放' },
  unlockDew: { icon: '💧', color: 0xa8e6cf, title: '露珠凝结' },
  unlockGlowing: { icon: '💫', color: 0xff9ecb, title: '荧光闪耀' },
  unlockDream: { icon: '🌙', color: 0xc8a2ff, title: '梦境降临' },
  unlockEternal: { icon: '👑', color: 0xffd700, title: '永恒之花' },
  unlockWakeup: { icon: '💖', color: 0xff6b9d, title: '恋人苏醒' },
  collect50: { icon: '🎯', color: 0x88ccff, title: '收集达人' },
  collect100: { icon: '🏆', color: 0xffd700, title: '花瓣收藏家' },
  synthesis10: { icon: '🔮', color: 0xc8a2ff, title: '合成学徒' },
  completeGame: { icon: '🎊', color: 0xff6b9d, title: '游戏通关' }
};

export const RARITY_CONFIG: Record<string, { label: string; color: string; glowColor: number; threshold: number }> = {
  legendary: { label: '传说', color: '#ffd700', glowColor: 0xffaa00, threshold: 0.02 },
  epic: { label: '史诗', color: '#c8a2ff', glowColor: 0x9966ff, threshold: 0.05 },
  rare: { label: '稀有', color: '#88ccff', glowColor: 0x4488ff, threshold: 0.15 },
  uncommon: { label: '不凡', color: '#a8e6cf', glowColor: 0x44ddaa, threshold: 0.30 }
};

export const INHERITANCE_OPTIONS: Omit<InheritanceOption, 'selected'>[] = [
  {
    id: InheritanceType.PETAL_RESERVE,
    name: '花瓣储备',
    description: '保留10%的各类型花瓣作为初始储备',
    icon: '🌸',
    cost: 3,
    costType: 'points',
    maxSelectable: 1
  },
  {
    id: InheritanceType.UNLOCKED_RECIPES,
    name: '配方传承',
    description: '继承所有已解锁的合成配方',
    icon: '📜',
    cost: 2,
    costType: 'points',
    maxSelectable: 1
  },
  {
    id: InheritanceType.DISCOVERED_MUTATIONS,
    name: '变异研究',
    description: '继承已发现的变异体图鉴记录',
    icon: '🔬',
    cost: 2,
    costType: 'points',
    maxSelectable: 1
  },
  {
    id: InheritanceType.COLLECTION_PROGRESS,
    name: '图鉴进度',
    description: '继承花瓣图鉴的解锁进度',
    icon: '📖',
    cost: 2,
    costType: 'points',
    maxSelectable: 1
  },
  {
    id: InheritanceType.EFFICIENCY_BOOST,
    name: '效率加成',
    description: '下一局收集速度提升20%',
    icon: '⚡',
    cost: 3,
    costType: 'points',
    maxSelectable: 1
  },
  {
    id: InheritanceType.GOAL_PROGRESS,
    name: '目标追踪',
    description: '继承未完成目标的进度',
    icon: '🎯',
    cost: 1,
    costType: 'points',
    maxSelectable: 1
  },
  {
    id: InheritanceType.ENVIRONMENT_STATS,
    name: '环境探索',
    description: '继承天气与环境探索统计',
    icon: '🌍',
    cost: 2,
    costType: 'points',
    maxSelectable: 1
  }
];

export const EFFICIENCY_RATING = {
  S: { minScore: 90, color: '#ffd700', label: '完美' },
  A: { minScore: 75, color: '#c8a2ff', label: '优秀' },
  B: { minScore: 60, color: '#88ccff', label: '良好' },
  C: { minScore: 40, color: '#a8e6cf', label: '普通' },
  D: { minScore: 0, color: '#888888', label: '加油' }
};

export const MAX_INHERITANCE_POINTS = 5;
export const PETAL_RESERVE_RATIO = 0.1;
export const EFFICIENCY_BOOST_RATIO = 0.2;

export const AUDIO_CONTEXT_CONFIG: Record<AudioContextType, {
  bgmKey: string;
  defaultVolume: number;
  crossFadeDuration: number;
}> = {
  [AudioContextType.MENU]: {
    bgmKey: 'bgm_menu',
    defaultVolume: 0.5,
    crossFadeDuration: 800
  },
  [AudioContextType.EXPLORE]: {
    bgmKey: 'bgm_explore',
    defaultVolume: 0.5,
    crossFadeDuration: 1000
  },
  [AudioContextType.SYNTHESIS]: {
    bgmKey: 'bgm_synthesis',
    defaultVolume: 0.6,
    crossFadeDuration: 600
  },
  [AudioContextType.COMPLETE]: {
    bgmKey: 'bgm_complete',
    defaultVolume: 0.7,
    crossFadeDuration: 1500
  }
};

export const AUDIO_CONTEXT_PREFERENCE_KEY = 'dream_forest_audio_context_prefs';

export const TIME_CONFIG = {
  DAY_DURATION: 120000,
  DAWN_START: 0,
  DAY_START: 0.15,
  DUSK_START: 0.7,
  NIGHT_START: 0.85,
  MIDNIGHT_START: 0.95,
  SEASON_DURATION: 4,
  FULL_MOON_INTERVAL: 7,
  METEOR_SHOWER_CHANCE: 0.1,
  TIME_SPEED_MULTIPLIER: 1
};

export const TIME_EFFECTS: Record<TimeOfDay, TimeEffect> = {
  [TimeOfDay.DAWN]: {
    timeOfDay: TimeOfDay.DAWN,
    spawnWeightModifier: {
      [PetalType.DEW]: 2.5,
      [PetalType.MOONLIGHT]: 0.8,
      [PetalType.STARLIGHT]: 0.6,
      [PetalType.GLOWING]: 1.2
    },
    rareDropBoost: 1.2,
    lightLevel: 0.6,
    description: '黎明时分，晨露凝结，露珠花瓣大量出现'
  },
  [TimeOfDay.DAY]: {
    timeOfDay: TimeOfDay.DAY,
    spawnWeightModifier: {
      [PetalType.MOONLIGHT]: 0.5,
      [PetalType.STARLIGHT]: 0.3,
      [PetalType.DREAM]: 0.4,
      [PetalType.DEW]: 1.5,
      [PetalType.GLOWING]: 0.8
    },
    rareDropBoost: 0.8,
    lightLevel: 1.0,
    description: '阳光明媚，普通花瓣活跃，但月光花瓣稀少'
  },
  [TimeOfDay.DUSK]: {
    timeOfDay: TimeOfDay.DUSK,
    spawnWeightModifier: {
      [PetalType.GLOWING]: 2.0,
      [PetalType.DREAM]: 1.5,
      [PetalType.MOONLIGHT]: 1.5,
      [PetalType.STARLIGHT]: 1.8
    },
    rareDropBoost: 1.5,
    lightLevel: 0.5,
    description: '黄昏降临，荧光花瓣开始苏醒，稀有掉落概率提升'
  },
  [TimeOfDay.NIGHT]: {
    timeOfDay: TimeOfDay.NIGHT,
    spawnWeightModifier: {
      [PetalType.MOONLIGHT]: 2.0,
      [PetalType.STARLIGHT]: 2.5,
      [PetalType.DREAM]: 1.8,
      [PetalType.ETERNAL]: 1.5,
      [PetalType.DEW]: 0.5,
      [PetalType.GLOWING]: 1.5
    },
    rareDropBoost: 2.0,
    lightLevel: 0.3,
    description: '夜幕降临，月光与星光花瓣绽放，稀有掉落概率大幅提升'
  },
  [TimeOfDay.MIDNIGHT]: {
    timeOfDay: TimeOfDay.MIDNIGHT,
    spawnWeightModifier: {
      [PetalType.MOONLIGHT_SHIMMER]: 3.0,
      [PetalType.STARLIGHT_BURST]: 3.0,
      [PetalType.DREAM_PHANTOM]: 2.5,
      [PetalType.ETERNAL]: 2.0,
      [PetalType.DREAM]: 2.0,
      [PetalType.WAKEUP]: 1.5
    },
    rareDropBoost: 3.0,
    lightLevel: 0.15,
    description: '午夜时分，传说中的变异花瓣可能出现！稀有掉落概率最高'
  }
};

export const SEASON_EFFECTS: Record<SeasonType, {
  spawnWeightModifier: Partial<Record<PetalType, number>>;
  rareDropBoost: number;
  weatherWeights: Partial<Record<WeatherType, number>>;
  description: string;
  color: number;
}> = {
  [SeasonType.SPRING]: {
    spawnWeightModifier: {
      [PetalType.DEW]: 1.8,
      [PetalType.MOONLIGHT]: 1.2,
      [PetalType.DEW_CRYSTAL]: 1.5
    },
    rareDropBoost: 1.1,
    weatherWeights: {
      [WeatherType.CLEAR]: 3,
      [WeatherType.CLOUDY]: 2,
      [WeatherType.RAIN]: 2,
      [WeatherType.FOG]: 1
    },
    description: '春暖花开，露珠花瓣更加常见',
    color: 0xa8e6cf
  },
  [SeasonType.SUMMER]: {
    spawnWeightModifier: {
      [PetalType.GLOWING]: 1.8,
      [PetalType.STARLIGHT]: 1.5,
      [PetalType.STARLIGHT_BURST]: 1.3,
      [PetalType.GLOWING_EMBER]: 1.5
    },
    rareDropBoost: 1.3,
    weatherWeights: {
      [WeatherType.CLEAR]: 4,
      [WeatherType.STORM]: 1,
      [WeatherType.HEAVY_RAIN]: 1,
      [WeatherType.METEOR]: 0.5
    },
    description: '夏日炎炎，荧光与星光花瓣闪耀，偶有流星雨',
    color: 0xffe66d
  },
  [SeasonType.AUTUMN]: {
    spawnWeightModifier: {
      [PetalType.DREAM]: 1.8,
      [PetalType.MOONLIGHT]: 1.5,
      [PetalType.DREAM_PHANTOM]: 1.3,
      [PetalType.MOONLIGHT_SHIMMER]: 1.5
    },
    rareDropBoost: 1.5,
    weatherWeights: {
      [WeatherType.CLEAR]: 2,
      [WeatherType.CLOUDY]: 3,
      [WeatherType.FOG]: 2,
      [WeatherType.WINDY]: 2,
      [WeatherType.AURORA]: 0.5
    },
    description: '秋意浓浓，梦境花瓣飘舞，极光偶现',
    color: 0xff9966
  },
  [SeasonType.WINTER]: {
    spawnWeightModifier: {
      [PetalType.ETERNAL]: 1.8,
      [PetalType.DREAM]: 1.2,
      [PetalType.WAKEUP]: 1.3,
      [PetalType.DEW_CRYSTAL]: 1.8
    },
    rareDropBoost: 1.8,
    weatherWeights: {
      [WeatherType.SNOW]: 3,
      [WeatherType.FOG]: 2,
      [WeatherType.CLEAR]: 2,
      [WeatherType.AURORA]: 1
    },
    description: '寒冬腊月，永恒花瓣绽放，极光与雪舞相伴',
    color: 0x88ccff
  }
};

export const WEATHER_EFFECTS: Record<WeatherType, WeatherEffect> = {
  [WeatherType.CLEAR]: {
    type: WeatherType.CLEAR,
    spawnWeightModifier: {
      [PetalType.STARLIGHT]: 1.3,
      [PetalType.GLOWING]: 1.2
    },
    rareDropBoost: 1.0,
    ambientMultiplier: 1.0,
    description: '晴朗的天空，星光闪耀'
  },
  [WeatherType.CLOUDY]: {
    type: WeatherType.CLOUDY,
    spawnWeightModifier: {
      [PetalType.MOONLIGHT]: 1.2,
      [PetalType.DEW]: 1.1
    },
    rareDropBoost: 1.1,
    ambientMultiplier: 0.8,
    description: '多云天气，月光柔和'
  },
  [WeatherType.RAIN]: {
    type: WeatherType.RAIN,
    spawnWeightModifier: {
      [PetalType.DEW]: 2.0,
      [PetalType.DEW_CRYSTAL]: 1.5,
      [PetalType.MOONLIGHT]: 0.7,
      [PetalType.STARLIGHT]: 0.6
    },
    rareDropBoost: 1.3,
    ambientMultiplier: 0.6,
    description: '细雨绵绵，露珠花瓣大量涌现'
  },
  [WeatherType.HEAVY_RAIN]: {
    type: WeatherType.HEAVY_RAIN,
    spawnWeightModifier: {
      [PetalType.DEW]: 2.5,
      [PetalType.DEW_CRYSTAL]: 2.0,
      [PetalType.MOONLIGHT]: 0.4,
      [PetalType.STARLIGHT]: 0.3,
      [PetalType.GLOWING]: 0.5
    },
    rareDropBoost: 1.5,
    ambientMultiplier: 0.4,
    description: '倾盆大雨，晶露花瓣可能出现'
  },
  [WeatherType.SNOW]: {
    type: WeatherType.SNOW,
    spawnWeightModifier: {
      [PetalType.DEW_CRYSTAL]: 2.5,
      [PetalType.ETERNAL]: 1.5,
      [PetalType.GLOWING_EMBER]: 1.3,
      [PetalType.DEW]: 0.6
    },
    rareDropBoost: 1.6,
    ambientMultiplier: 0.5,
    description: '雪花飘落，晶露与永恒花瓣更加常见'
  },
  [WeatherType.FOG]: {
    type: WeatherType.FOG,
    spawnWeightModifier: {
      [PetalType.DREAM]: 2.0,
      [PetalType.DREAM_PHANTOM]: 1.8,
      [PetalType.GLOWING]: 0.7,
      [PetalType.STARLIGHT]: 0.5
    },
    rareDropBoost: 1.8,
    ambientMultiplier: 0.3,
    description: '迷雾笼罩，梦境花瓣若隐若现，稀有掉落提升'
  },
  [WeatherType.WINDY]: {
    type: WeatherType.WINDY,
    spawnWeightModifier: {
      [PetalType.STARLIGHT]: 1.5,
      [PetalType.STARLIGHT_BURST]: 1.3,
      [PetalType.MOONLIGHT_SHIMMER]: 1.2,
      [PetalType.DEW]: 0.5
    },
    rareDropBoost: 1.2,
    ambientMultiplier: 0.9,
    description: '风起云涌，轻盈的花瓣随风飘散'
  },
  [WeatherType.STORM]: {
    type: WeatherType.STORM,
    spawnWeightModifier: {
      [PetalType.GLOWING_EMBER]: 2.5,
      [PetalType.STARLIGHT_BURST]: 2.0,
      [PetalType.MOONLIGHT]: 0.3,
      [PetalType.DEW]: 0.3
    },
    rareDropBoost: 2.0,
    ambientMultiplier: 0.3,
    description: '雷暴交加，烬荧与星爆花瓣可能降临'
  },
  [WeatherType.AURORA]: {
    type: WeatherType.AURORA,
    spawnWeightModifier: {
      [PetalType.DREAM_PHANTOM]: 3.0,
      [PetalType.ETERNAL]: 2.0,
      [PetalType.DREAM]: 2.0,
      [PetalType.WAKEUP]: 1.5
    },
    rareDropBoost: 2.5,
    ambientMultiplier: 0.8,
    specialEvent: true,
    description: '极光降临！传说级花瓣出现概率大幅提升！'
  },
  [WeatherType.METEOR]: {
    type: WeatherType.METEOR,
    spawnWeightModifier: {
      [PetalType.STARLIGHT_BURST]: 3.5,
      [PetalType.STARLIGHT]: 2.5,
      [PetalType.ETERNAL]: 1.8,
      [PetalType.WAKEUP]: 1.5
    },
    rareDropBoost: 3.0,
    ambientMultiplier: 0.9,
    specialEvent: true,
    description: '流星雨！星爆花瓣与永恒花瓣可能坠落！'
  }
};

export const WEATHER_DURATION = {
  [WeatherType.CLEAR]: { min: 30000, max: 60000 },
  [WeatherType.CLOUDY]: { min: 20000, max: 40000 },
  [WeatherType.RAIN]: { min: 15000, max: 35000 },
  [WeatherType.HEAVY_RAIN]: { min: 10000, max: 20000 },
  [WeatherType.SNOW]: { min: 20000, max: 40000 },
  [WeatherType.FOG]: { min: 15000, max: 30000 },
  [WeatherType.WINDY]: { min: 15000, max: 30000 },
  [WeatherType.STORM]: { min: 8000, max: 15000 },
  [WeatherType.AURORA]: { min: 20000, max: 35000 },
  [WeatherType.METEOR]: { min: 15000, max: 25000 }
};

export const SKY_COLORS: Record<TimeOfDay, Record<WeatherType, { top: number; bottom: number; fog: number }>> = {
  [TimeOfDay.DAWN]: {
    [WeatherType.CLEAR]: { top: 0xffa07a, bottom: 0xffd700, fog: 0xffccaa },
    [WeatherType.CLOUDY]: { top: 0x887788, bottom: 0x998899, fog: 0xaaaaaa },
    [WeatherType.RAIN]: { top: 0x556677, bottom: 0x667788, fog: 0x778899 },
    [WeatherType.HEAVY_RAIN]: { top: 0x334455, bottom: 0x445566, fog: 0x556677 },
    [WeatherType.SNOW]: { top: 0xaaddff, bottom: 0xddeeff, fog: 0xccddee },
    [WeatherType.FOG]: { top: 0x888888, bottom: 0x999999, fog: 0xaaaaaa },
    [WeatherType.WINDY]: { top: 0x8899aa, bottom: 0xaabbcc, fog: 0x99aabb },
    [WeatherType.STORM]: { top: 0x223344, bottom: 0x334455, fog: 0x445566 },
    [WeatherType.AURORA]: { top: 0x1a0a2e, bottom: 0x2a1a4e, fog: 0x3a2a5e },
    [WeatherType.METEOR]: { top: 0x0a0514, bottom: 0x1a0a2e, fog: 0x2a1a3e }
  },
  [TimeOfDay.DAY]: {
    [WeatherType.CLEAR]: { top: 0x87ceeb, bottom: 0x98fb98, fog: 0xaaddff },
    [WeatherType.CLOUDY]: { top: 0x8899aa, bottom: 0xaabb99, fog: 0xbbcccc },
    [WeatherType.RAIN]: { top: 0x556677, bottom: 0x667755, fog: 0x778877 },
    [WeatherType.HEAVY_RAIN]: { top: 0x334455, bottom: 0x445544, fog: 0x556655 },
    [WeatherType.SNOW]: { top: 0xbbddee, bottom: 0xddeeff, fog: 0xeef0ff },
    [WeatherType.FOG]: { top: 0x999999, bottom: 0xaaaaaa, fog: 0xbbbbbb },
    [WeatherType.WINDY]: { top: 0x7799cc, bottom: 0x99bb77, fog: 0x88aacc },
    [WeatherType.STORM]: { top: 0x224466, bottom: 0x335544, fog: 0x446677 },
    [WeatherType.AURORA]: { top: 0x2a1a4e, bottom: 0x3a2a6e, fog: 0x4a3a7e },
    [WeatherType.METEOR]: { top: 0x1a0a3e, bottom: 0x2a1a5e, fog: 0x3a2a6e }
  },
  [TimeOfDay.DUSK]: {
    [WeatherType.CLEAR]: { top: 0xff6b6b, bottom: 0xffa500, fog: 0xff8866 },
    [WeatherType.CLOUDY]: { top: 0x775566, bottom: 0x886655, fog: 0x997766 },
    [WeatherType.RAIN]: { top: 0x445566, bottom: 0x554433, fog: 0x665544 },
    [WeatherType.HEAVY_RAIN]: { top: 0x223344, bottom: 0x333322, fog: 0x444433 },
    [WeatherType.SNOW]: { top: 0x99aadd, bottom: 0xbbccdd, fog: 0xccddee },
    [WeatherType.FOG]: { top: 0x666677, bottom: 0x777766, fog: 0x888877 },
    [WeatherType.WINDY]: { top: 0x6677aa, bottom: 0x889966, fog: 0x778899 },
    [WeatherType.STORM]: { top: 0x112233, bottom: 0x223322, fog: 0x334433 },
    [WeatherType.AURORA]: { top: 0x1a0a2e, bottom: 0x2a1a3e, fog: 0x3a2a4e },
    [WeatherType.METEOR]: { top: 0x0a0524, bottom: 0x1a0a3e, fog: 0x2a1a4e }
  },
  [TimeOfDay.NIGHT]: {
    [WeatherType.CLEAR]: { top: 0x0a0514, bottom: 0x1a0a2e, fog: 0x0d1a26 },
    [WeatherType.CLOUDY]: { top: 0x1a1a2e, bottom: 0x2a2a3e, fog: 0x1d2a36 },
    [WeatherType.RAIN]: { top: 0x0a1520, bottom: 0x1a2530, fog: 0x0d2a36 },
    [WeatherType.HEAVY_RAIN]: { top: 0x050a15, bottom: 0x151a25, fog: 0x0a1a26 },
    [WeatherType.SNOW]: { top: 0x1a2a3e, bottom: 0x2a3a4e, fog: 0x1d3a46 },
    [WeatherType.FOG]: { top: 0x1a1a1a, bottom: 0x2a2a2a, fog: 0x1d2a26 },
    [WeatherType.WINDY]: { top: 0x0a1020, bottom: 0x1a2030, fog: 0x0d2030 },
    [WeatherType.STORM]: { top: 0x050515, bottom: 0x151525, fog: 0x0a1020 },
    [WeatherType.AURORA]: { top: 0x0a0524, bottom: 0x1a1544, fog: 0x0d2a46 },
    [WeatherType.METEOR]: { top: 0x05020a, bottom: 0x150a2e, fog: 0x0a152e }
  },
  [TimeOfDay.MIDNIGHT]: {
    [WeatherType.CLEAR]: { top: 0x050210, bottom: 0x0a0520, fog: 0x070a18 },
    [WeatherType.CLOUDY]: { top: 0x0a0a1a, bottom: 0x15152a, fog: 0x0f1a23 },
    [WeatherType.RAIN]: { top: 0x050a15, bottom: 0x0a1525, fog: 0x071020 },
    [WeatherType.HEAVY_RAIN]: { top: 0x020510, bottom: 0x050a15, fog: 0x030812 },
    [WeatherType.SNOW]: { top: 0x0a1525, bottom: 0x152035, fog: 0x0d1a2d },
    [WeatherType.FOG]: { top: 0x0a0a0a, bottom: 0x151515, fog: 0x0f1a1a },
    [WeatherType.WINDY]: { top: 0x050815, bottom: 0x0a1025, fog: 0x070c20 },
    [WeatherType.STORM]: { top: 0x020208, bottom: 0x050515, fog: 0x030510 },
    [WeatherType.AURORA]: { top: 0x050220, bottom: 0x100840, fog: 0x081530 },
    [WeatherType.METEOR]: { top: 0x020108, bottom: 0x080415, fog: 0x050818 }
  }
};



export const ENVIRONMENT_INHERITANCE_OPTION: InheritanceOption = {
  id: InheritanceType.ENVIRONMENT_STATS,
  name: '环境探索',
  description: '继承天气与环境探索统计',
  icon: '🌍',
  cost: 2,
  costType: 'points',
  selected: false,
  maxSelectable: 1
};

export const AUDIO_CONTEXT_CONFIG_EXTENDED: Record<AudioContextType, {
  bgmKey: string;
  defaultVolume: number;
  crossFadeDuration: number;
  weatherVariations?: Partial<Record<WeatherType, string>>;
  timeVariations?: Partial<Record<TimeOfDay, string>>;
}> = {
  [AudioContextType.MENU]: {
    bgmKey: 'bgm_menu',
    defaultVolume: 0.5,
    crossFadeDuration: 800
  },
  [AudioContextType.EXPLORE]: {
    bgmKey: 'bgm_explore',
    defaultVolume: 0.5,
    crossFadeDuration: 1000,
    weatherVariations: {
      [WeatherType.RAIN]: 'bgm_rain',
      [WeatherType.HEAVY_RAIN]: 'bgm_heavy_rain',
      [WeatherType.SNOW]: 'bgm_snow',
      [WeatherType.STORM]: 'bgm_storm',
      [WeatherType.AURORA]: 'bgm_aurora',
      [WeatherType.METEOR]: 'bgm_meteor'
    },
    timeVariations: {
      [TimeOfDay.DAWN]: 'bgm_dawn',
      [TimeOfDay.NIGHT]: 'bgm_night',
      [TimeOfDay.MIDNIGHT]: 'bgm_midnight'
    }
  },
  [AudioContextType.SYNTHESIS]: {
    bgmKey: 'bgm_synthesis',
    defaultVolume: 0.6,
    crossFadeDuration: 600
  },
  [AudioContextType.COMPLETE]: {
    bgmKey: 'bgm_complete',
    defaultVolume: 0.7,
    crossFadeDuration: 1500
  }
};

export const SFX_CONFIG: Record<string, { volume: number; context: AudioContextType }> = {
  sfx_collect: { volume: 0.3, context: AudioContextType.EXPLORE },
  sfx_collect_rare: { volume: 0.6, context: AudioContextType.EXPLORE },
  sfx_collect_legendary: { volume: 0.8, context: AudioContextType.EXPLORE },
  sfx_synthesis: { volume: 0.5, context: AudioContextType.SYNTHESIS },
  sfx_synthesis_mutation: { volume: 0.7, context: AudioContextType.SYNTHESIS }, 
  sfx_synthesis_fail: { volume: 0.4, context: AudioContextType.SYNTHESIS },     
  sfx_weather_change: { volume: 0.4, context: AudioContextType.EXPLORE },
  sfx_time_dawn: { volume: 0.5, context: AudioContextType.EXPLORE },
  sfx_time_night: { volume: 0.5, context: AudioContextType.EXPLORE },
  sfx_rare_drop: { volume: 0.7, context: AudioContextType.EXPLORE },
  sfx_special_event: { volume: 0.8, context: AudioContextType.EXPLORE },        
  sfx_rain: { volume: 0.2, context: AudioContextType.EXPLORE },
  sfx_wind: { volume: 0.15, context: AudioContextType.EXPLORE },
  sfx_thunder: { volume: 0.6, context: AudioContextType.EXPLORE }
};

export const STORY_CHAPTERS: ChapterConfig[] = [
  {
    id: 'chapter_1',
    order: 1,
    title: '第一章：月光初现',
    subtitle: '森林的呼唤',
    description: '在梦境森林的入口，你醒来发现自己身处一片陌生的月光林地。远处传来微弱的呼唤声...',
    icon: '🌙',
    color: 0x88ccff,
    regionId: 'moonlight_glade',
    startDialogue: [
      { id: 'ch1_d1', speaker: '旁白', text: '你缓缓睁开眼睛，发现自己躺在一片柔软的草地上。', delay: 2000 },
      { id: 'ch1_d2', speaker: '旁白', text: '柔和的月光透过树叶洒落，周围飘散着淡淡花香。', delay: 2000 },
      { id: 'ch1_d3', speaker: '神秘声音', speakerIcon: '👤', text: '「你终于来了...我等了你很久...」', expression: 'serious', delay: 2500 },
      { id: 'ch1_d4', speaker: '你', text: '「你是谁？我为什么会在这里？」', expression: 'surprised', delay: 2000 },
      { id: 'ch1_d5', speaker: '神秘声音', speakerIcon: '👤', text: '「我是这片森林的守护者。你的恋人正沉睡在森林深处...」', expression: 'sad', delay: 2500 },
      { id: 'ch1_d6', speaker: '神秘声音', speakerIcon: '👤', text: '「只有收集散落在森林各处的花瓣，才能唤醒她...」', expression: 'serious', delay: 2500 },
      { id: 'ch1_d7', speaker: '你', text: '「我该怎么做？」', expression: 'serious', delay: 2000 },
      { id: 'ch1_d8', speaker: '神秘声音', speakerIcon: '👤', text: '「先从收集月光花瓣开始吧，它们蕴含着最基础的力量。」', expression: 'normal', delay: 2500 },
      { id: 'ch1_d9', speaker: '旁白', text: '你的冒险，从这片月光林地开始了。', delay: 2000 }
    ],
    completeDialogue: [
      { id: 'ch1_c1', speaker: '神秘声音', speakerIcon: '👤', text: '「很好，你已经掌握了收集花瓣的方法。」', expression: 'happy', delay: 2000 },
      { id: 'ch1_c2', speaker: '神秘声音', speakerIcon: '👤', text: '「现在，试着将三朵月光花瓣合在一起，会发生奇妙的变化...」', expression: 'normal', delay: 2500 }
    ],
    goals: [
      { id: 'ch1_g1', type: ChapterGoalType.COLLECT_PETAL, title: '初识月光', description: '收集5朵月光花瓣', target: PetalType.MOONLIGHT, targetCount: 5, currentCount: 0, completed: false, claimed: false },
      { id: 'ch1_g2', type: ChapterGoalType.TOTAL_COLLECTED, title: '收集入门', description: '累计收集10朵花瓣', target: 'total', targetCount: 10, currentCount: 0, completed: false, claimed: false },
      { id: 'ch1_g3', type: ChapterGoalType.SYNTHESIZE_RECIPE, title: '初次合成', description: '完成1次合成', target: 'recipe_1', targetCount: 1, currentCount: 0, completed: false, claimed: false }
    ],
    rewards: [
      { type: 'petal', petalType: PetalType.STARLIGHT, count: 2, description: '星光花瓣 ×2' },
      { type: 'efficiency_boost', boostAmount: 0.1, description: '收集效率提升10%' }
    ],
    specialRecipes: [
      { recipeId: 'recipe_7', unlockHint: '完成本章后解锁月光与星光的融合配方', isUnlocked: false }
    ]
  },
  {
    id: 'chapter_2',
    order: 2,
    title: '第二章：星辰湖畔',
    subtitle: '星光的指引',
    description: '沿着小径前行，一片宁静的湖泊出现在眼前。湖面倒映着满天星辰...',
    icon: '⭐',
    color: 0xffe66d,
    regionId: 'starlight_lake',
    unlockCondition: { type: 'chapter_completed', targetChapterId: 'chapter_1' },
    startDialogue: [
      { id: 'ch2_d1', speaker: '旁白', text: '穿过月光林地的小径，你来到了一片静谧的湖泊边。', delay: 2000 },
      { id: 'ch2_d2', speaker: '你', text: '「这里是...？好美...」', expression: 'surprised', delay: 2000 },
      { id: 'ch2_d3', speaker: '神秘声音', speakerIcon: '👤', text: '「这是星辰湖畔，星光花瓣的故乡。」', expression: 'happy', delay: 2500 },
      { id: 'ch2_d4', speaker: '神秘声音', speakerIcon: '👤', text: '「星光蕴含着指引的力量，能让你看到前方的道路。」', expression: 'normal', delay: 2500 },
      { id: 'ch2_d5', speaker: '你', text: '「我需要收集更多星光花瓣吗？」', expression: 'normal', delay: 2000 },
      { id: 'ch2_d6', speaker: '神秘声音', speakerIcon: '👤', text: '「是的。星光与月光结合，能产生更强大的力量——露珠。」', expression: 'serious', delay: 2500 },
      { id: 'ch2_d7', speaker: '神秘声音', speakerIcon: '👤', text: '「但要小心，合成并非每次都会成功...」', expression: 'sad', delay: 2500 },
      { id: 'ch2_d8', speaker: '你', text: '「我会努力的！」', expression: 'happy', delay: 2000 },
      { id: 'ch2_d9', speaker: '旁白', text: '星辰湖畔的微风拂过，湖面泛起阵阵星光涟漪。', delay: 2000 }
    ],
    completeDialogue: [
      { id: 'ch2_c1', speaker: '神秘声音', speakerIcon: '👤', text: '「你已经领悟了星光的力量。」', expression: 'happy', delay: 2000 },
      { id: 'ch2_c2', speaker: '神秘声音', speakerIcon: '👤', text: '「看，山谷的入口已经打开了，晨露正在等待着你。」', expression: 'normal', delay: 2500 },
      { id: 'ch2_c3', speaker: '你', text: '「谢谢你的指引，守护者。」', expression: 'happy', delay: 2000 }
    ],
    goals: [
      { id: 'ch2_g1', type: ChapterGoalType.COLLECT_PETAL, title: '星光闪耀', description: '收集5朵星光花瓣', target: PetalType.STARLIGHT, targetCount: 5, currentCount: 0, completed: false, claimed: false },
      { id: 'ch2_g2', type: ChapterGoalType.UNLOCK_PETAL, title: '露珠凝结', description: '解锁露珠花瓣', target: PetalType.DEW, targetCount: 1, currentCount: 0, completed: false, claimed: false },
      { id: 'ch2_g3', type: ChapterGoalType.UNLOCK_REGION, title: '探索山谷', description: '解锁晨露山谷', target: 'dew_valley', targetCount: 1, currentCount: 0, completed: false, claimed: false },
      { id: 'ch2_g4', type: ChapterGoalType.TOTAL_SYNTHESIZED, title: '合成练习', description: '完成3次合成', target: 'total', targetCount: 3, currentCount: 0, completed: false, claimed: false }
    ],
    rewards: [
      { type: 'petal', petalType: PetalType.DEW, count: 2, description: '露珠花瓣 ×2' },
      { type: 'recipe', recipeId: 'recipe_8', description: '解锁特殊配方：星光露珠' }
    ],
    specialRecipes: [
      { recipeId: 'recipe_8', unlockHint: '星光与露珠的神秘融合', isUnlocked: false }
    ]
  },
  {
    id: 'chapter_3',
    order: 3,
    title: '第三章：晨露山谷',
    subtitle: '清新的力量',
    description: '山谷中弥漫着淡淡的雾气，清晨的露珠在草叶上闪烁着晶莹的光芒...',
    icon: '💧',
    color: 0xa8e6cf,
    regionId: 'dew_valley',
    unlockCondition: { type: 'chapter_completed', targetChapterId: 'chapter_2' },
    startDialogue: [
      { id: 'ch3_d1', speaker: '旁白', text: '踏入晨露山谷，清新的空气扑面而来。', delay: 2000 },
      { id: 'ch3_d2', speaker: '你', text: '「这里的空气好清新...」', expression: 'happy', delay: 2000 },
      { id: 'ch3_d3', speaker: '神秘声音', speakerIcon: '👤', text: '「晨露代表着新生与纯净的力量。」', expression: 'normal', delay: 2500 },
      { id: 'ch3_d4', speaker: '神秘声音', speakerIcon: '👤', text: '「它能净化一切，也能孕育出新的可能。」', expression: 'happy', delay: 2500 },
      { id: 'ch3_d5', speaker: '你', text: '「我感觉到了...一种温暖的力量...」', expression: 'surprised', delay: 2000 },
      { id: 'ch3_d6', speaker: '神秘声音', speakerIcon: '👤', text: '「那是露珠在回应你。继续收集它们吧。」', expression: 'normal', delay: 2500 },
      { id: 'ch3_d7', speaker: '神秘声音', speakerIcon: '👤', text: '「三朵露珠可以合成更强大的荧光。」', expression: 'serious', delay: 2500 },
      { id: 'ch3_d8', speaker: '旁白', text: '远处的洞穴入口隐约闪烁着神秘的光芒...', delay: 2000 }
    ],
    completeDialogue: [
      { id: 'ch3_c1', speaker: '神秘声音', speakerIcon: '👤', text: '「晨露的力量已经与你同在。」', expression: 'happy', delay: 2000 },
      { id: 'ch3_c2', speaker: '神秘声音', speakerIcon: '👤', text: '「荧光洞穴的封印已经松动了，那里有你需要的力量。」', expression: 'serious', delay: 2500 },
      { id: 'ch3_c3', speaker: '你', text: '「我会去的，为了唤醒她...」', expression: 'serious', delay: 2000 }
    ],
    goals: [
      { id: 'ch3_g1', type: ChapterGoalType.COLLECT_PETAL, title: '晨露收集', description: '收集5朵露珠花瓣', target: PetalType.DEW, targetCount: 5, currentCount: 0, completed: false, claimed: false },
      { id: 'ch3_g2', type: ChapterGoalType.UNLOCK_PETAL, title: '荧光闪烁', description: '解锁荧光花瓣', target: PetalType.GLOWING, targetCount: 1, currentCount: 0, completed: false, claimed: false },
      { id: 'ch3_g3', type: ChapterGoalType.DISCOVER_MUTATION, title: '奇迹发生', description: '发现1种变异花瓣', target: 'mutation', targetCount: 1, currentCount: 0, completed: false, claimed: false },
      { id: 'ch3_g4', type: ChapterGoalType.UNLOCK_REGION, title: '洞穴入口', description: '解锁荧光洞穴', target: 'glowing_cave', targetCount: 1, currentCount: 0, completed: false, claimed: false }
    ],
    rewards: [
      { type: 'petal', petalType: PetalType.GLOWING, count: 2, description: '荧光花瓣 ×2' },
      { type: 'efficiency_boost', boostAmount: 0.15, description: '收集效率提升15%' }
    ],
    specialRecipes: [
      { recipeId: 'recipe_9', unlockHint: '露珠与荧光的共鸣配方', isUnlocked: false }
    ]
  },
  {
    id: 'chapter_4',
    order: 4,
    title: '第四章：荧光洞穴',
    subtitle: '梦境的入口',
    description: '洞穴深处散发着柔和的荧光，洞壁上的结晶在光芒中若隐若现...',
    icon: '✨',
    color: 0xff9ecb,
    regionId: 'glowing_cave',
    unlockCondition: { type: 'chapter_completed', targetChapterId: 'chapter_3' },
    startDialogue: [
      { id: 'ch4_d1', speaker: '旁白', text: '踏入荧光洞穴，四周的洞壁散发着神秘的光芒。', delay: 2000 },
      { id: 'ch4_d2', speaker: '你', text: '「这里好美...像梦境一样...」', expression: 'surprised', delay: 2000 },
      { id: 'ch4_d3', speaker: '神秘声音', speakerIcon: '👤', text: '「荧光是梦境的使者，能连接现实与梦境。」', expression: 'normal', delay: 2500 },
      { id: 'ch4_d4', speaker: '神秘声音', speakerIcon: '👤', text: '「每一次合成，都可能产生意想不到的变异...」', expression: 'serious', delay: 2500 },
      { id: 'ch4_d5', speaker: '你', text: '「变异？那是什么？」', expression: 'surprised', delay: 2000 },
      { id: 'ch4_d6', speaker: '神秘声音', speakerIcon: '👤', text: '「当花瓣的力量超出预期时，就会产生变异。」', expression: 'normal', delay: 2500 },
      { id: 'ch4_d7', speaker: '神秘声音', speakerIcon: '👤', text: '「变异花瓣拥有独特的力量，是突破极限的关键。」', expression: 'happy', delay: 2500 },
      { id: 'ch4_d8', speaker: '你', text: '「我明白了，我会小心尝试的。」', expression: 'serious', delay: 2000 },
      { id: 'ch4_d9', speaker: '旁白', text: '洞穴深处，似乎有什么在呼唤着你...', delay: 2000 }
    ],
    completeDialogue: [
      { id: 'ch4_c1', speaker: '神秘声音', speakerIcon: '👤', text: '「你已经掌握了变异的奥秘。」', expression: 'happy', delay: 2000 },
      { id: 'ch4_c2', speaker: '神秘声音', speakerIcon: '👤', text: '「梦境花园的大门已经为你敞开。」', expression: 'normal', delay: 2500 },
      { id: 'ch4_c3', speaker: '你', text: '「终于...离她更近一步了...」', expression: 'happy', delay: 2000 }
    ],
    goals: [
      { id: 'ch4_g1', type: ChapterGoalType.COLLECT_PETAL, title: '荧光收集', description: '收集5朵荧光花瓣', target: PetalType.GLOWING, targetCount: 5, currentCount: 0, completed: false, claimed: false },
      { id: 'ch4_g2', type: ChapterGoalType.UNLOCK_PETAL, title: '梦境编织', description: '解锁梦境花瓣', target: PetalType.DREAM, targetCount: 1, currentCount: 0, completed: false, claimed: false },
      { id: 'ch4_g3', type: ChapterGoalType.DISCOVER_MUTATION, title: '变异探索', description: '发现2种不同的变异花瓣', target: 'mutation', targetCount: 2, currentCount: 0, completed: false, claimed: false },
      { id: 'ch4_g4', type: ChapterGoalType.UNLOCK_REGION, title: '花园入口', description: '解锁梦境花园', target: 'dream_garden', targetCount: 1, currentCount: 0, completed: false, claimed: false },
      { id: 'ch4_g5', type: ChapterGoalType.TOTAL_COLLECTED, title: '收集大师', description: '累计收集50朵花瓣', target: 'total', targetCount: 50, currentCount: 0, completed: false, claimed: false }
    ],
    rewards: [
      { type: 'petal', petalType: PetalType.DREAM, count: 2, description: '梦境花瓣 ×2' },
      { type: 'recipe', recipeId: 'recipe_10', description: '解锁特殊配方：永恒之径' }
    ],
    specialRecipes: [
      { recipeId: 'recipe_10', unlockHint: '低阶花瓣的终极融合', isUnlocked: false }
    ]
  },
  {
    id: 'chapter_5',
    order: 5,
    title: '第五章：梦境花园',
    subtitle: '沉睡的真相',
    description: '穿过洞穴的尽头，一片绚丽的花园出现在眼前。这里是连接梦境与现实的边界...',
    icon: '🌸',
    color: 0xc8a2ff,
    regionId: 'dream_garden',
    unlockCondition: { type: 'chapter_completed', targetChapterId: 'chapter_4' },
    startDialogue: [
      { id: 'ch5_d1', speaker: '旁白', text: '穿过荧光洞穴的尽头，一片绚烂的花园映入眼帘。', delay: 2000 },
      { id: 'ch5_d2', speaker: '你', text: '「这里是...？」', expression: 'surprised', delay: 2000 },
      { id: 'ch5_d3', speaker: '神秘声音', speakerIcon: '👤', text: '「这是梦境花园，你恋人沉睡的地方。」', expression: 'sad', delay: 2500 },
      { id: 'ch5_d4', speaker: '神秘声音', speakerIcon: '👤', text: '「她就在花园的深处...永恒神殿中...」', expression: 'normal', delay: 2500 },
      { id: 'ch5_d5', speaker: '你', text: '「我终于找到你了...等我...」', expression: 'sad', delay: 2000 },
      { id: 'ch5_d6', speaker: '神秘声音', speakerIcon: '👤', text: '「但要进入神殿，你需要更强大的力量——永恒。」', expression: 'serious', delay: 2500 },
      { id: 'ch5_d7', speaker: '神秘声音', speakerIcon: '👤', text: '「梦境花瓣可以合成永恒花瓣，那是进入神殿的钥匙。」', expression: 'normal', delay: 2500 },
      { id: 'ch5_d8', speaker: '你', text: '「我一定会集齐所有力量，唤醒她！」', expression: 'serious', delay: 2000 },
      { id: 'ch5_d9', speaker: '旁白', text: '花园深处，永恒神殿的轮廓若隐若现...', delay: 2000 }
    ],
    completeDialogue: [
      { id: 'ch5_c1', speaker: '神秘声音', speakerIcon: '👤', text: '「你已经拥有了进入神殿的资格。」', expression: 'happy', delay: 2000 },
      { id: 'ch5_c2', speaker: '神秘声音', speakerIcon: '👤', text: '「但唤醒之花需要所有花瓣的力量汇聚...」', expression: 'serious', delay: 2500 },
      { id: 'ch5_c3', speaker: '神秘声音', speakerIcon: '👤', text: '「去吧，神殿在等待着你。」', expression: 'normal', delay: 2500 },
      { id: 'ch5_c4', speaker: '你', text: '「谢谢你，守护者。」', expression: 'happy', delay: 2000 }
    ],
    goals: [
      { id: 'ch5_g1', type: ChapterGoalType.COLLECT_PETAL, title: '梦境收集', description: '收集5朵梦境花瓣', target: PetalType.DREAM, targetCount: 5, currentCount: 0, completed: false, claimed: false },
      { id: 'ch5_g2', type: ChapterGoalType.UNLOCK_PETAL, title: '永恒绽放', description: '解锁永恒花瓣', target: PetalType.ETERNAL, targetCount: 1, currentCount: 0, completed: false, claimed: false },
      { id: 'ch5_g3', type: ChapterGoalType.UNLOCK_REGION, title: '神殿之门', description: '解锁永恒神殿', target: 'eternal_temple', targetCount: 1, currentCount: 0, completed: false, claimed: false },
      { id: 'ch5_g4', type: ChapterGoalType.TOTAL_SYNTHESIZED, title: '炼金大师', description: '完成10次合成', target: 'total', targetCount: 10, currentCount: 0, completed: false, claimed: false },
      { id: 'ch5_g5', type: ChapterGoalType.DISCOVER_MUTATION, title: '变异收藏家', description: '发现3种变异花瓣', target: 'mutation', targetCount: 3, currentCount: 0, completed: false, claimed: false }
    ],
    rewards: [
      { type: 'petal', petalType: PetalType.ETERNAL, count: 1, description: '永恒花瓣 ×1' },
      { type: 'efficiency_boost', boostAmount: 0.2, description: '收集效率提升20%' }
    ],
    specialRecipes: [
      { recipeId: 'recipe_11', unlockHint: '月华融合秘术', isUnlocked: false },
      { recipeId: 'recipe_12', unlockHint: '星爆结晶秘术', isUnlocked: false }
    ]
  },
  {
    id: 'chapter_6',
    order: 6,
    title: '终章：永恒神殿',
    subtitle: '恋人的苏醒',
    description: '神殿的最深处，祭坛上沉睡着你的恋人。所有的力量将在此刻汇聚...',
    icon: '👑',
    color: 0xffd700,
    regionId: 'eternal_temple',
    unlockCondition: { type: 'chapter_completed', targetChapterId: 'chapter_5' },
    startDialogue: [
      { id: 'ch6_d1', speaker: '旁白', text: '推开神殿的大门，金色的光芒从深处涌出。', delay: 2000 },
      { id: 'ch6_d2', speaker: '你', text: '「这里是...」', expression: 'surprised', delay: 2000 },
      { id: 'ch6_d3', speaker: '神秘声音', speakerIcon: '👤', text: '「这是永恒神殿，她沉睡的地方。」', expression: 'sad', delay: 2500 },
      { id: 'ch6_d4', speaker: '旁白', text: '祭坛上，一位少女安静地沉睡着，仿佛只是陷入了一个漫长的梦。', delay: 2000 },
      { id: 'ch6_d5', speaker: '你', text: '「是她...真的是她...」', expression: 'sad', delay: 2000 },
      { id: 'ch6_d6', speaker: '神秘声音', speakerIcon: '👤', text: '「唤醒之花需要：1朵永恒花瓣、2朵梦境花瓣、3朵荧光花瓣。」', expression: 'serious', delay: 2500 },
      { id: 'ch6_d7', speaker: '神秘声音', speakerIcon: '👤', text: '「只有这样，才能打破千年的封印...」', expression: 'normal', delay: 2500 },
      { id: 'ch6_d8', speaker: '你', text: '「我已经准备好了...」', expression: 'serious', delay: 2000 },
      { id: 'ch6_d9', speaker: '旁白', text: '神殿的光芒越来越亮，仿佛在期待着这一刻...', delay: 2000 }
    ],
    completeDialogue: [
      { id: 'ch6_c1', speaker: '旁白', text: '所有花瓣的力量汇聚成一道神圣的光芒...', delay: 3000 },
      { id: 'ch6_c2', speaker: '旁白', text: '唤醒之花在你手中绽放出绚丽的光芒！', delay: 3000 },
      { id: 'ch6_c3', speaker: '你', text: '「醒醒...快醒醒...」', expression: 'sad', delay: 2000 },
      { id: 'ch6_c4', speaker: '旁白', text: '少女的睫毛轻轻颤动，缓缓睁开了眼睛...', delay: 3000 },
      { id: 'ch6_c5', speaker: '恋人', speakerIcon: '💖', text: '「...是你吗？我...我睡了多久...？」', expression: 'surprised', delay: 2500 },
      { id: 'ch6_c6', speaker: '你', text: '「是我...我终于找到你了...」', expression: 'happy', delay: 2000 },
      { id: 'ch6_c7', speaker: '恋人', speakerIcon: '💖', text: '「我...我做了一个很长很长的梦...梦里一直有个声音在呼唤我...」', expression: 'happy', delay: 2500 },
      { id: 'ch6_c8', speaker: '恋人', speakerIcon: '💖', text: '「原来...那个声音...是你...」', expression: 'happy', delay: 2500 },
      { id: 'ch6_c9', speaker: '你', text: '「我们再也不分开了...」', expression: 'happy', delay: 2000 },
      { id: 'ch6_c10', speaker: '旁白', text: '在梦境森林的深处，恋人终于重逢...', delay: 3000 },
      { id: 'ch6_c11', speaker: '旁白', text: '而这，是另一个故事的开始...', delay: 3000 }
    ],
    goals: [
      { id: 'ch6_g1', type: ChapterGoalType.COLLECT_PETAL, title: '永恒之力', description: '收集1朵永恒花瓣', target: PetalType.ETERNAL, targetCount: 1, currentCount: 0, completed: false, claimed: false },
      { id: 'ch6_g2', type: ChapterGoalType.COLLECT_PETAL, title: '梦境之力', description: '收集2朵梦境花瓣', target: PetalType.DREAM, targetCount: 2, currentCount: 0, completed: false, claimed: false },
      { id: 'ch6_g3', type: ChapterGoalType.COLLECT_PETAL, title: '荧光之力', description: '收集3朵荧光花瓣', target: PetalType.GLOWING, targetCount: 3, currentCount: 0, completed: false, claimed: false },
      { id: 'ch6_g4', type: ChapterGoalType.UNLOCK_PETAL, title: '神圣之花', description: '合成唤醒之花', target: PetalType.WAKEUP, targetCount: 1, currentCount: 0, completed: false, claimed: false },
      { id: 'ch6_g5', type: ChapterGoalType.SYNTHESIZE_RECIPE, title: '最终合成', description: '使用配方6合成唤醒之花', target: 'recipe_6', targetCount: 1, currentCount: 0, completed: false, claimed: false }
    ],
    rewards: [
      { type: 'petal', petalType: PetalType.WAKEUP, count: 1, description: '唤醒之花 ×1' }
    ],
    specialRecipes: [
      { recipeId: 'recipe_6', unlockHint: '传说中的神圣配方——唤醒之花', isUnlocked: false }
    ]
  }
];

export function getInitialStoryProgressState(): StoryProgressState {
  const firstChapter = STORY_CHAPTERS.find(c => c.order === 1);
  
  const chapterStates: ChapterState[] = STORY_CHAPTERS.map(config => ({
    chapterId: config.id,
    status: config.order === 1 ? ChapterStatus.IN_PROGRESS : ChapterStatus.LOCKED,
    currentGoalIndex: 0,
    goals: config.goals.map(g => ({ ...g })),
    specialRecipes: config.specialRecipes.map(r => ({ ...r })),
    playTimeInChapter: 0,
    petalsCollectedInChapter: Object.fromEntries(
      Object.values(PetalType).map(t => [t, 0])
    ) as Record<PetalType, number>,
    synthesesInChapter: 0,
    dialoguesViewed: []
  }));

  return {
    currentChapterId: firstChapter ? firstChapter.id : null,
    chapterStates,
    allChaptersCompleted: false,
    totalStoryScore: 0,
    bestChapterRatings: {}
  };
}

export function getChapterConfig(chapterId: string): ChapterConfig | undefined {
  return STORY_CHAPTERS.find(c => c.id === chapterId);
}

export function getNextChapterId(currentChapterId: string): string | null {
  const current = STORY_CHAPTERS.find(c => c.id === currentChapterId);
  if (!current) return null;
  const next = STORY_CHAPTERS.find(c => c.order === current.order + 1);
  return next ? next.id : null;
}
