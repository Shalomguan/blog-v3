---
title: fullstackopen学习
date: 2025-12-04 13:23:20
categories: [fullstackopen]
---
最近开始系统性地学习赫尔辛基大学的 **Full Stack Open** 课程。
这篇文章主要记录我在学习 Part 1 到 Part 3 过程中的一些心得，以及在代码上踩过的坑。

## 🛠️ 技术栈概览

Full Stack Open 课程主要涵盖了现代 Web 开发的核心技术栈：

* **Frontend**: React.js (Hooks, State Management)
* **Backend**: Node.js & Express
* **Deployment**: Fly.io
<!-- more -->
## 💡 学习心得

### 1\. React 的特性
React 的 **声明式** 写法是一大特色。
特别是 `useState` 和 `useEffect` 这两个 Hook：
* **State**: 它是组件的“记忆”，状态改变引发视图更新。如果单纯进行数据的修改页面将不会刷新

### 2\. 后端与 RESTful API

进入 Part 3 后，开始用 **Express** 写后端。

最大的感触是理解了 **REST API** 的设计理念。通过 `GET`, `POST`, `DELETE` 等不同的 HTTP 动词来操作资源。

调试后端时，我也遇到过不少坑，比如：

  * **CORS** (跨域资源共享) 问题，导致前端连不上后端。
  * 在部署的时候忘记更改URL
  * 前后端分离之后的时候main.jsx读取数据的方式应当修改

### 3\. 关于部署 (Deployment)

把代码跑在本地 (`localhost:3000`) 和部署到公网完全是两码事。

我选择了课程推荐的 **Fly.io** 进行部署。虽然中间经历了 `flyctl` 路径找不到、鉴权失败等问题，但最终看到自己的应用在公网上还是跑起来了




