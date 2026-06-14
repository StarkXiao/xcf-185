# 资源占位说明

本游戏使用 Phaser Graphics API 动态生成所有核心纹理，无需额外图片资源即可运行。

## 动态生成的纹理列表（在 PreloadScene 中生成）

### 花瓣纹理
- petal_rose (玫瑰花瓣)
- petal_lily (百合花瓣)
- petal_lavender (薰衣草花瓣)
- petal_sunflower (向日葵花瓣)
- petal_jade (翡翠花瓣)
- petal_starlight (星光花瓣)
- petal_moonstone (月光花瓣)
- petal_dream (梦境花瓣)
- petal_aurora (极光花瓣)
- petal_eternal (永恒花瓣)

### 角色纹理
- player (玩家角色)
- lover_sleeping (沉睡恋人)
- lover_awake (苏醒恋人)

### UI 纹理
- btn_normal (普通按钮)
- btn_hover (悬停按钮)
- btn_disabled (禁用按钮)
- btn_small (小按钮)

### 场景纹理
- bg_forest (梦境森林背景)

### 粒子纹理
- particle (粒子)
- sparkle (闪光粒子)

## 如需替换为真实资源

1. 将图片放入 public/images/ 目录
2. 在 PreloadScene.ts 的 loadAssets() 方法中添加对应加载代码：
   ```typescript
   this.load.image('petal_rose', 'images/rose.png');
   ```
3. 删除或注释掉对应 createXxxTexture() 中的 generateTexture 调用

## 音频资源

音效可放入 public/audio/ 目录，支持格式：mp3, ogg, wav
- bgm_menu.mp3 (主菜单背景音乐)
- bgm_game.mp3 (游戏背景音乐)
- sfx_collect.mp3 (收集音效)
- sfx_craft.mp3 (合成音效)
- sfx_button.mp3 (按钮音效)
- sfx_success.mp3 (成功音效)
- sfx_awaken.mp3 (唤醒音效)
