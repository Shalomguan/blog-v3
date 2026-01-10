---
title: JavaScript Promise 执行模型：then 回调的真实调用时机
date: 2026-1-10 19:18:00
categories: [fullstackopen]
tags: [javascript,nodejs]
description: 
---

# 从 savedPerson 说起：我终于理解了 Promise.then

一开始我以为我懂 Promise。

`then` 嘛，不就是“异步回调”吗？
链式调用，拿结果，用就完了。
直到我在写 Full Stack Open 的 Phonebook 后端时，被一个变量**狠狠干了一下**。
---

## 一个看起来很正常的代码

写的代码是这样的，因为是照着他的例子改得，写的时候并没有感觉很复杂：

```js
Person.findOne({ name: body.name })
  .then(existing => {
    if (existing) {
      return res.status(400).json({ error: 'name must be unique' })
    }

    const person = new Person({
      name: body.name,
      number: body.number,
    })

    return person.save()
  })
  .then(savedPerson => {
    if (savedPerson) res.json(savedPerson)
  })
```

一切看起来都很合理。

直到我开始认真看这一句：

```js
.then(savedPerson => {
  if (savedPerson) res.json(savedPerson)
})
```

---

## 我当时脑子里的第一个问题

> **savedPerson 是哪来的？**

注意，这个变量在此之前：

* 没有声明过
* 没有赋值过
* 甚至在代码里从来没出现过

那问题来了：

> **JavaScript 是怎么判断 `savedPerson` 是不是 `undefined` 的？**

---

## 一开始我完全想歪了

我下意识以为：

* `savedPerson` 是某种“内置变量”
* 或者 Mongoose 偷偷塞了点魔法
* 或者 `.then` 里面有特殊规则

但这些都不对。

---

## 真相其实很“简单”，但不直观

关键在于一句话：

> **`.then` 后面的函数，不是立刻执行的，而是“注册回调”**

换句话说：

```js
.then(savedPerson => { ... })
```

本质等价于：

```js
.then(function (savedPerson) {
  ...
})
```

而这个函数——
**只有在前一个 Promise resolve 之后，才会被调用。**

---

## 那 savedPerson 到底是谁给的？

不是 JavaScript 凭空变出来的。
是 **Promise 在 resolve 的那一刻，把值当参数传进来的**。

就像这样（概念化）：

```js
promise完成后：
callback(resolve出来的值)
```

也就是说：

* 如果你 `return person.save()`
  → resolve 的是 **保存成功的文档对象**
* 如果你 `return res.status(...).json(...)`
  → 实际上 resolve 的是 **undefined**

于是：

```js
(savedPerson) => { ... }
```

里的 `savedPerson`：

* 有时候是对象
* 有时候是 `undefined`

---

## 我真正“想通”的那一刻

当我意识到这一点时，很多东西突然一起通了：

* `.then` 不是“下一行代码”
* 它是 **“等这件事做完后，再执行”**
* `then` 里的参数不是“提前存在的变量”
* 而是 **Promise resolve 时，临时传进来的函数参数**

从这一刻开始：

* `savedPerson` 不再神秘
* `undefined` 不再诡异
* Promise 链也不再像黑盒

---

## 后来我才发现：我以前一直在“用 Promise”，但没真正理解它

我以前只是知道：

* Promise 是异步
* then 可以拿结果

但现在我终于明白：

> **Promise 的核心不是异步，而是“状态变化 + 回调注册”。**

---
