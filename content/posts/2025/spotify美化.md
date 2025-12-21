---
title: Spotify桌面端美化教程
date: 2025-12-21 17:16:00
categories: [教程]
tags: [美化,spotify]
description: 用了两年的spotify，忍受了很久他的界面的简陋，在windows下我之前一直使用lyricify来看歌词，后来换到arch发现lyricify没有linux版本，lyricify on wine又好久没更新了，所以就找到了一个插件
---

# 安装插件spicetify

## windows下

```powershell
iwr -useb https://raw.githubusercontent.com/spicetify/cli/main/install.ps1 | iex
```
这时候你的spotify上面会多一个商城的图标，点进去可以下载许多插件和主题
## linux下
选用你喜欢的包管理器
```bash
yay -S spicetify-cli
paru -S spicetify-cli
```
## 歌词插件
### lyrics-plus
是一个增强歌词的插件，在找不到歌词的时候他会在别的源去搜索歌词4
```bash
spicetify config custom_apps lyrics-plus   
spicetify apply
```
### fullAppDisplay
可以配合lyrics一起使用，让他能够全屏播放
```bash
spicetify config extensions fullAppDisplay.js
spicetify apply
```
使用效果
![image](https://pic.gslpro.top/lyrics_example.png)
## 主题
我选择的是StarryNight<br>
效果如下
![image](https://pic.gslpro.top/spo_beauty.png)
## 新歌上线
有时候有些新歌偷偷就发了，如果你想要及时的获得通知的话，下面的插件可能你会需要
### New release
```bash
spicetify config custom_apps new-releases
spicetify apply
```