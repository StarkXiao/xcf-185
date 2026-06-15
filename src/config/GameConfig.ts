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
  RedDotState,
  TaskReward,
  Region,
  DailyReward,
  DailyRewardState,
  TutorialConditionType,
  TutorialValidationType,
  TutorialGuideProgress
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

export const REGIONS: Region[] = [
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
    color: 0x88ccff
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
    color: 0xffe66d
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
    color: 0xa8e6cf
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
    color: 0xff9ecb
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
    color: 0xc8a2ff
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
    color: 0xffd700
  }
];

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
      type: TutorialValidationType.MOVE_TO_AREA
    },
    skipConfig: {
      allowed: true,
      confirmRequired: true,
      confirmMessage: '跳过移动教学？后续可随时点击移动'
    },
    retryOnFail: true,
    failureMessage: '请点击屏幕任意位置移动角色',
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
  lastViewedCollection: 0
};

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
  }
];

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
  redDotState: JSON.parse(JSON.stringify(INITIAL_RED_DOT_STATE)),
  regionHeats: REGIONS.map(region => ({
    regionId: region.id,
    currentHeat: region.baseHeat,
    lastCollectTime: 0,
    collectCount: 0
  })),
  consecutiveCollect: null,
  dailyRewardState: JSON.parse(JSON.stringify(INITIAL_DAILY_REWARD_STATE))
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
export const SAVE_VERSION = '4.1.0';

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
