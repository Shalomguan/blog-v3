---
title: Mongoose 里「变量名、模型名、集合名」到底有什么区别？
date: 2025-12-05 20:00:00
categories: [fullstackopen]
---

最近在学习fullstackopen的时候被mogos的变量名，模型名和集合名的概念搞得晕晕的

踩坑几次之后，索性写了一次博客：**在 Mongoose 里，下面这三个名字分别是什么、干嘛用、有什么关系。**
<!--more-->>
```js
const Person = mongoose.model('Person', phonebookSchema)
````

这一行里，至少出现了 **三个名字**：

* JS 变量名：`Person`
* 模型名（Model name）：`'Person'`
* 集合名（Collection name，很多人会叫“表名”）
<!-- more -->
## 1. 变量名：Person —— 只是你代码里的一个变量

先看左边：

```js
const Person = ...
//    ^^^^^^  只是普通的 JS 常量名字
```

这个 `Person` 只是一个普通的 js 变量名，你可以叫：

```js
const P = mongoose.model('Person', phonebookSchema)
const MyAwesomeModel = mongoose.model('Person', phonebookSchema)
```

只要后面代码统一用这个变量就行，比如：

```js
const person = new Person({ name: 'Alice', number: '12345' })
person.save()

Person.find({}).then(result => {
  console.log(result)
})
```

`.find()`、`.save()` 这些方法，都是挂在这个 **模型对象（也就是变量 `Person`）** 上的，而不是数据库里的“表名”上。

> **你在代码里能直接用的，全都是「变量名」**

---

## 2. 模型名：'Person' —— 给 Mongoose 用的内部名字

再看这一段：

```js
mongoose.model('Person', phonebookSchema)
//              ^^^^^^^  这是一个字符串，叫模型名（Model name）
```

`'Person'` 是一个**字符串**，专门用来告诉 Mongoose：

> “帮我注册一个叫 Person 的模型，它的结构是 phonebookSchema。”

这个模型名有几个作用：

1. 在别的地方取回这个模型

   ```js
   // 在另一个文件里
   const Person = mongoose.model('Person') // 不传 schema = 取模型
   ```

2. Mongoose 会根据 **模型名** 推导出 **集合名**

   * `'Person'` → `people`
   * `'User'` → `users`
   * `'Phonebook'` → `phonebooks`

3. `Person.modelName` 就是这个字符串：

   ```js
   console.log(Person.modelName) // 'Person'
   ```

> **模型名是 Mongoose 在内部识别/登记模型用的名字，不是 JS 变量名，也不是 MongoDB 里的集合名。**

---

## 3. 集合名（“表名”）：MongoDB 里真正存数据的名字

在 MongoDB 里叫 **Collection（集合）**,但是我习惯把他叫成表名。

当你写：

```js
const Person = mongoose.model('Person', phonebookSchema)
```

Mongoose 会自动推导出一个集合名，一般规则是：

* 全小写 + 复数
* 特殊单词会稍微“智能复数化”一下，比如 `Person` → `people`

所以常见情况：

* 模型名 `'Person'` → 集合名 `people`
* 模型名 `'Phonebook'` → 集合名 `phonebooks`
* 模型名 `'User'` → 集合名 `users`
* 模型名 `'City'` → 集合名 `cities`

你可以在 MongoDB shell / mongosh 里看到它：

```bash
use Phonebook
show collections
# 可能输出：
# people
# phonebooks
```

> **集合名是数据库那边实际存在的名字，存的就是一条条文档（document）。**

---

## 4. 为啥 `.find()` 要用变量名，不是“表名”？

这是我一开始踩坑的地方。

错误写法：

```js
const Persons = mongoose.model('Phonebook', PhonebookSchema)

// ❌ 下面这样会报错：persons is not defined
phonebooks..find({}).then(result => {
  console.log(result)
})
```
问题在于：

哪怕你知道数据库里的集合名是 `phonebooks`，你也不能直接这样调用

因为在 JS 里压根没有这个变量。

`.find()` 的调用对象是 **Mongoose 模型对象**，也就是那个你自己声明的变量：

✔ 正确写法：

```js
const Persons = mongoose.model('Phonebook', PhonebookSchema)

Persons.find({}).then(result => {
  result.forEach(person => {
    console.log(person)
  })
  mongoose.connection.close()
})
```

> **你始终在操作「模型（变量）」：`Person` / `Persons`，而不是直接操作集合名 `people` / `phonebooks`。**

---

## 6. 三者关系总结

再回到这行代码：

```js
const Person = mongoose.model('Person', phonebookSchema)
```

可以这样理解：

* `Person`（左边）：
  👉 JavaScript 变量名，代表一个 **模型对象**，用来写 `Person.find()` / `new Person()`。

* `'Person'`（右边字符串）：
  👉 **模型名（Model name）**，Mongoose 用它来管理模型、推导集合名。

* `people`（推导出来的集合名）：
  👉 MongoDB 里的 **集合名（Collection / “表名”）**，真正存数据的地方。

用一张“小翻译表”概括：

| 概念  | 示例         | 属于哪里          | 用来干嘛                             |
| --- | ---------- | ------------- | -------------------------------- |
| 变量名 | `Person`   | JavaScript 代码 | 调用 `.find()` / `new` / `.save()` |
| 模型名 | `'Person'` | Mongoose 内部   | 注册 / 取回模型，推导集合名                  |
| 集合名 | `people`   | MongoDB 数据库   | 真正存文档的地方                         |

---

## 7. 一点踩坑小结

我在写 phonebook 脚本时，踩过的典型坑：

1. **变量名大小写写错**

   ```js
   const Persons = mongoose.model('Phonebook', PhonebookSchema)

   persons.find({})   // ❌ ReferenceError: persons is not defined
   ```

2. 把**模型名/变量名/“表名”混在一起理解**，以为：

   > “集合叫 phonebooks，那我就写 phonebooks.find() 吧？”

   其实 `.find()` 的对象是「模型变量」，不是“表名”。

3. 在一个脚本里又 `.save()` 又 `.find()`，并且在不同的 `then` 里乱关 `mongoose.connection.close()`，导致还没查完连接就被关掉——这个属于额外 bonus 坑 🤣。

---

## 结语

如果你也在学 Mongoose，建议在脑子里时刻分清这三个层次：

* **我现在在写的是 JS 代码（变量名）**
* **Mongoose 里登记的是模型名**
* **数据库真正存在的是集合名**

搞清楚之后，`Person.find()` 这种写法就不会再迷糊了，而看到 `people` / `phonebooks` 这样的集合名时，也知道是 Mongoose 帮你生成的“数据库那一侧”的名字。

希望这篇小记能帮你少掉几个 `xxx is not defined` 😄
