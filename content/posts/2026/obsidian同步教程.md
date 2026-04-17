---
title: Obsidian 跨平台同步教程：Remotely Save + Cloudflare R2（Arch / Windows / iPhone）
date: 2026-04-17 20:00:00
categories: [obsidian]
tags: [obsidian, remotely-save, cloudflare-r2, arch, windows, iphone]
description: 一篇给小白的 Obsidian 跨平台同步教程，从 0 开始配置 Cloudflare R2，并用 Remotely Save 实现 Arch、Windows 和 iPhone 同步。
---

# Obsidian 跨平台同步教程：Remotely Save + Cloudflare R2（Arch / Windows / iPhone）

我手上的设备比较杂：

- 一台 Windows
- 一台 Arch Linux
- 一台 iPhone

而我平时用 Obsidian 主要是记文字笔记，不怎么放图片，也不怎么塞大文件。

这种情况下，我想要的同步方案其实很简单：

1. 能跨平台
2. 成本低
3. 不要像 Git 一样每次都手动 commit / push / pull
4. 不要太玄学

最后我选的是：

**Remotely Save + Cloudflare R2**

这篇文章就完整记录一下，我是怎么从 0 开始把它配起来的。  
整篇尽量按**小白视角**来写，细到“点哪个按钮”。

---

# 为什么选这套方案

如果你只是想要最省心，那 Obsidian Sync 当然最直接。  
但如果你：

- 主要是文字笔记
- 愿意自己配置一次
- 想压低长期成本
- 设备又跨 Windows / Linux / iPhone

那 **Remotely Save + Cloudflare R2** 确实是一个值得试的组合。

我最后选它，主要是因为：

- **Remotely Save** 是 Obsidian 社区里很常用的同步插件
- **Cloudflare R2** 可以当对象存储来放远端文件
- 两者组合起来，比较适合轻量级的笔记同步

不过先说清楚：

**这不是 Obsidian 官方同步方案。**

所以这套方案的定位应该是：

> 成本和自由度更优，但第一次配置会比官方方案麻烦一些。

---

# 适合什么人

这套方案更适合下面这些人：

- Obsidian 里主要是 Markdown 文字
- 图片不多
- 几乎没有大型视频、音频、压缩包
- 有多台设备要同步
- 愿意自己动手配一次

如果你更看重：

- 开箱即用
- 最稳
- 不想排查任何问题
- 什么都不想自己管

那建议直接用官方 Sync。

---

# 整体流程先看一眼

整套流程其实就三大步：

## 第一步：在 Cloudflare 创建一个 R2 bucket
也就是给你的 Obsidian 笔记准备一个远端存储位置。

## 第二步：创建 R2 API Token
这个 token 是给 Remotely Save 用来读写你这个 bucket 的。

## 第三步：在 Obsidian 里配置 Remotely Save
把 bucket、endpoint、key 这些填进去，然后开始同步。

---

# 开始前先做一件事：备份你的 vault

正式开搞之前，先把你的 Obsidian vault 整个复制一份出来。

比如：

- Windows：复制整个 vault 文件夹到桌面
- Arch：复制到另一个目录
- iPhone：先别急着在手机上操作，先配主设备

这一步别省。  
同步方案第一次配置，最怕的不是麻烦，而是把原始笔记弄乱。

---

# 第 1 部分：Cloudflare R2 从 0 开始配置

---

## 1. 登录 Cloudflare

先打开 Cloudflare 控制台并登录。

登录后看左侧边栏。

---

## 2. 进入 R2 页面

在左侧菜单里按这个路径点进去：

**Storage & databases → R2 → Overview**

如果你是第一次用 R2，可能会先看到开通提示。  
这种情况按页面提示操作就行。

有的账号第一次开 R2 时，可能会要求补充支付信息。  
正常按提示走完，再回来继续。

---

## 3. 创建 bucket

进入 `R2 > Overview` 页面后，点击：

**Create bucket**

接下来会进入创建 bucket 的页面。

### Bucket name

这里填一个你自己看得懂的名字。

我建议直接用：

```text
obsidian-vault
````

也可以是：

```text
my-obsidian-notes
```

建议：

* 用小写
* 不要中文
* 不要空格
* 名字简单一点

### Location

如果你只是自己同步笔记，不想纠结地理区域：

**保持默认就行**

### Default storage class

这里建议直接选：

**Standard**

对 Obsidian 这种主要是小文件、会频繁读写的场景，直接用 Standard 最省事。

### 最后

点：

**Create bucket**

到这里，你的 bucket 就创建好了。

---

## 4. 创建 API Token

创建完 bucket 后，回到 R2 页面。

在 `R2 > Overview` 页面里，找到并点击：

**Manage in API Tokens**

如果你看到的是别的类似入口，比如：

* `Manage`
* `API Tokens`

本质上也是去同一个地方。

点进去之后，开始创建 token。

---

## 5. 选择创建 token

进入 API token 页面后，通常会看到创建 token 的入口。

如果页面让你选类型，个人用户按默认思路走就行，重点不是名字，而是后面的权限要配对。

继续点击创建。

---

## 6. 配置权限

这是最关键的一步。

### 权限类型

找到权限设置后，选择：

**Object Read & Write**

不要选只读。
因为你不是只想“下载笔记”，你还需要“上传”和“双向同步”。

### 作用范围

找到类似下面这个选项：

**Apply to specific buckets only**

然后只勾选你刚刚创建的那个 bucket，比如：

```text
obsidian-vault
```

也就是说，这个 token 只允许访问你这个 Obsidian 专用 bucket。

这样做更安全，也更清晰。

### 创建 token

最后点击：

**Create API Token**

---

## 7. 记下这些信息

创建完成后，页面一般会展示这些内容：

* **Access Key ID**
* **Secret Access Key**
* 以及你需要用到的 **endpoint**

这时候你一定要把下面这些东西保存好：

```text
Bucket name:
obsidian-vault

Access Key ID:
你的 Access Key

Secret Access Key:
你的 Secret Key

Endpoint:
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

其中最重要的是：

**Secret Access Key**

这个通常只显示一次。
如果你没保存，后面大概率就只能重新建一个 token。

建议直接把这些信息先放到密码管理器里，或者先临时记到安全位置，等配置完成再整理。

---

# 第 2 部分：在 Obsidian 里安装 Remotely Save

这一部分建议先只在**主设备**上操作。

所谓主设备，就是你最常写笔记的那台。
比如你平时主要在 Windows 上记笔记，那就先在 Windows 上完成首次配置。

---

## 1. 打开 Obsidian

进入你要同步的那个 vault。

---

## 2. 打开社区插件

按下面这个路径点：

**Settings → Community plugins**

如果你之前没开过社区插件，需要先允许社区插件。

然后点击：

**Browse**

---

## 3. 搜索并安装 Remotely Save

在搜索框里输入：

```text
Remotely Save
```

然后：

1. 点击 **Install**
2. 安装完成后点击 **Enable**

到这里，插件就装好了。

---

# 第 3 部分：在 Remotely Save 里配置 Cloudflare R2

---

## 1. 打开插件设置页面

在 Obsidian 中继续点：

**Settings → Community plugins → Remotely Save**

进入插件设置页面。

---

## 2. 选择远端服务类型

找到远端类型，选择：

**S3 / S3-compatible**

因为 Cloudflare R2 走的是兼容 S3 的接口。

---

## 3. 一项一项填参数

接下来最重要的就是把参数填对。

---

### Address / Endpoint

填你刚刚保存下来的 endpoint：

```text
https://<ACCOUNT_ID>.r2.cloudflarestorage.com
```

把 `<ACCOUNT_ID>` 替换成你自己的。

---

### Bucket

填你的 bucket 名称，比如：

```text
obsidian-vault
```

---

### Access Key

填你刚刚创建的：

**Access Key ID**

---

### Secret Key

填你刚刚保存的：

**Secret Access Key**

---

### Region

这里直接填：

```text
us-east-1
```

别自己改成别的。

---

### Bypass CORS

找到这个选项后：

**打开它**

这一项建议直接开启。

---

## 4. 检查连接

参数填好后，点击：

**Check connectivity**

### 如果通过了

说明最基础的链路已经打通了。

### 如果没通过

按下面顺序检查：

1. endpoint 抄没抄错
2. bucket 名有没有打错
3. Access Key 有没有复制错误
4. Secret Key 有没有复制错误
5. Region 是否填的是 `us-east-1`
6. Bypass CORS 有没有打开

如果这些都对，但还是失败，那就先把插件更新到最新版再试。

---

# 第 4 部分：第一次怎么上传到 R2

很多人第一次都会问：

**“我已经配好了，那到底在哪里点上传？”**

其实 Remotely Save 没有一个单独叫“上传”的按钮。

它的逻辑是：

> 你点“同步”，第一次同步如果远端是空的，本质上就是把本地文件上传到远端。

---

## 1. 第一次只用一台设备

这一点很重要。

第一次同步时，**只在一台主设备上操作**。

不要一开始就同时在：

* Windows
* Arch
* iPhone

三台设备上一起点同步。

这样很容易把自己搞乱。

---

## 2. 确保远端 bucket 是空的

第一次同步之前，最好确认：

* 这个 bucket 是新建的
* 里面没有旧文件
* 或者至少你给这个 vault 用的路径是空的

这样逻辑最清楚：

* 本地已经有笔记
* 远端没有内容
* 所以第一次同步就是把本地内容推上去

---

## 3. 执行第一次同步

回到 Obsidian 主界面。

你通常会在左侧边栏看到一个同步相关的图标。
点击它，开始同步。

第一次同步可能会慢一点，耐心等它完成。

---

## 4. 确认是否上传成功

同步结束后，可以回到 Cloudflare：

1. 打开 `R2`
2. 点进你的 bucket
3. 看里面有没有对象

如果已经能看到对象，基本就说明主设备第一次上传成功了。

---

# 第 5 部分：第二台和第三台设备怎么接入

当主设备第一次同步成功之后，再去配置其他设备。

比如：

* Arch
* iPhone

它们的思路都一样。

---
## 1. 安装 Obsidian

先在对应设备上装好 Obsidian。

---
## 2. 新建一个空 vault

建议 vault 名字和主设备保持一致。
至少这样你自己不容易认错。

---

## 3. 安装 Remotely Save

路径和前面一样：

**Settings → Community plugins → Browse → 搜索 Remotely Save → Install → Enable**

---

## 4. 填入同样的 R2 参数

把主设备上那一套参数原样填进去：

* Endpoint
* Bucket
* Access Key
* Secret Key
* Region = `us-east-1`
* Bypass CORS = 开

---

## 5. 手动同步一次

这时候同步的效果就不是“上传本地已有内容”了，
而是把主设备已经放到 R2 上的内容拉下来。

也就是说：

* 主设备第一次同步：把已有内容传上去
* 其他设备第一次同步：把远端内容拉下来

---

# 第 6 部分：Windows / Arch / iPhone 的使用建议

---

## Windows

Windows 基本最省心，正常安装 Obsidian、启用插件、填参数就行。

建议：

* 把它当主设备来初始化
* 首次同步成功后再接入其他设备

---

## Arch

Arch 端本质和 Windows 一样。
因为真正的配置都在 Obsidian 里面，并不依赖系统本身。

建议：

* 先在 Windows 完成主设备上传
* 再在 Arch 上新建空 vault
* 装插件
* 填同样参数
* 同步拉取内容

---

## iPhone

iPhone 端也能正常用，但有一个点要特别注意：

**手机端不是系统级后台常驻同步。**

更准确地说：

* 你打开 Obsidian
* 它在前台时可以同步
* 你切到后台后，不要默认它还会一直帮你跑

所以第一次在 iPhone 上同步时，建议你：

* 打开 Obsidian
* 手动同步
* 不要立刻切后台
* 等它跑完

---

# 第 7 部分：我建议一开始这样设置，最稳

为了减少翻车，一开始我建议你走保守路线。

---

## 1. 先不要同步整个 `.obsidian`

这个特别重要。

很多人第一次搞同步时，会很想把下面这些全同步过去：

* 主题
* 插件配置
* 热键
* 工作区布局
* 各种 UI 状态

但我建议你：

**先不要同步整个 `.obsidian`。**

因为里面有不少文件其实是设备相关的，
有些甚至在你每次打开 Obsidian 时都会变化。

如果一上来就全同步，反而更容易遇到奇怪问题。

更稳妥的做法是：

先只同步：

* Markdown 笔记
* 普通附件
* 你明确知道需要同步的少量配置

等这套链路稳定运行一段时间后，再决定要不要同步更多配置。

---

## 2. 自动同步先别开太猛

一开始建议先以**手动同步为主**。

等你确认整套流程稳定之后，再考虑打开自动同步。

如果你要开，建议也别太激进，
比如先设置成：

* 每隔几分钟自动同步一次

不要一上来就追求特别频繁。

---

## 3. 养成一个好习惯：换设备前后都同步一下

这个习惯很重要。

### 离开当前设备前

先手动同步一次。

### 到新设备准备开始写之前

再手动同步一次。

这样会减少很多不必要的冲突。

---

# 第 8 部分：最常见的坑

---

## 坑 1：Secret Key 没保存

这是最常见的问题之一。

如果你在创建 token 的那一页没有把 Secret Key 保存下来，
后面往往看不到，只能重新创建一个新的 token。

---

## 坑 2：bucket 名打错

有时候连不上，不是因为 endpoint 出问题，
而是 bucket 名少了一个字符。

这个真的很常见。

---

## 坑 3：Region 填错

你就直接填：

```text
us-east-1
```

别折腾别的值。

---

## 坑 4：第一次就多设备一起同步

这个很容易出问题。

第一次同步，记住只做一件事：

**先用主设备把内容传上去。**

等远端已经确认有内容之后，再让其他设备接入。

---

## 坑 5：混用多套同步方案

比如你同一个 vault 又开：

* iCloud
* Git
* OneDrive
* Remotely Save

混在一起，后面很容易出现冲突。

一个 vault，最好只由一套同步方案来管。

---

# 第 9 部分：一句话复盘整个流程

如果你懒得看全文，其实整件事可以概括成下面这几步：

1. 在 Cloudflare 创建一个 R2 bucket
2. 创建一个只对这个 bucket 生效的 API token
3. 记下 endpoint、bucket、Access Key、Secret Key
4. 在 Obsidian 里安装 Remotely Save
5. 远端类型选 `S3 / S3-compatible`
6. 填 endpoint、bucket、Access Key、Secret Key、`us-east-1`
7. 打开 `Bypass CORS`
8. 点 `Check connectivity`
9. 在主设备第一次手动同步
10. 再让其他设备接入同步

---

# 最后

如果你问我：

**Remotely Save + Cloudflare R2 到底值不值得折腾？**

我的答案是：

**如果你主要是文字笔记，而且愿意第一次自己动手配一下，那很值。**

它不是最无脑的方案，
但它在下面这几个点上，平衡得挺不错：

* 成本
* 自由度
* 跨平台能力
* 使用体验

至少对我这种：

* Windows + Arch + iPhone
* 文字笔记为主
* 不怎么放图片

的用法来说，这套方案已经够用了。

如果你也在折腾 Obsidian 跨平台同步，希望这篇能让你少踩几个坑。

```

