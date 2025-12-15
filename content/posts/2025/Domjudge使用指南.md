---
title: DOMJUDGE食用指南
date: 2025-12-11 23:30:20
updated: 2025-12-12 14:37:42
description: 致小登们:办菜鸟杯的时候我是负责拉题上DOMJUDGE上的配置，包括导入题目，拉取名单生成密码之类的。发觉有些事情难办的很啊，于是写一篇博客用来备忘。
categories: [acm]
tags: [教程]
---
## 导入名单

首先我想要说的就是这个名单的导入，这个算是最简单的了，基本不会有坑，不过考虑到有人可能觉得写脚本麻烦，我在下面贴一个脚本,这一份代码还有需要修改
```py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
CNB DOMjudge 工具（整合版）

功能概览
1) gen：从报名 Excel 生成 DOMjudge 导入用 TSV + 滚榜昵称映射
   - groups.tsv
   - teams.tsv       （DOMjudge 榜单显示：真名）
   - accounts.tsv
   - nicknames.tsv   （滚榜显示：昵称映射 teamid -> nickname）

2) patch：对 DOMjudge event-feed（NDJSON，每行一个 JSON 对象）替换队伍显示名
   - 输入：event-feed.json（NDJSON）
   - 输出：event-feed.nick.json（NDJSON）
   - 只替换 type == "teams" 的事件：data.name = nicknames.tsv 中的 nickname

===========================================================
依赖
  pip install pandas openpyxl

-----------------------------------------------------------
Windows (PowerShell) 推荐运行方式
  1) 生成 TSV：
     python .\cnb_domjudge_tool.py gen `
       --input "2025年菜鸟杯报名信息收集表（收集结果）.xlsx" `
       --outdir out `
       --year 2025

  2) 替换 event-feed 里的队伍名为昵称（用于 resolver 滚榜）：
     python .\cnb_domjudge_tool.py patch `
       --nick out\nicknames.tsv `
       --in event-feed.json `
       --out event-feed.nick.json

  注意：
  - PowerShell 分行必须用反引号 ` 续行；或者写在一行也可以。
  - 参数必须是两个短横线：--nick 不是 “—nick”（长横线会报错）。

-----------------------------------------------------------
Arch / Linux (bash) 推荐运行方式
  1) 建议虚拟环境：
     python -m venv .venv
     source .venv/bin/activate
     pip install -U pip
     pip install pandas openpyxl

  2) 生成 TSV：
     python cnb_domjudge_tool.py gen \
       --input "2025年菜鸟杯报名信息收集表（收集结果）.xlsx" \
       --outdir out \
       --year 2025

  3) 替换 event-feed：
     python cnb_domjudge_tool.py patch \
       --nick out/nicknames.tsv \
       --in event-feed.json \
       --out event-feed.nick.json

===========================================================
你要的业务规则（已实现）
- teams.tsv 的队伍名（DOMjudge 显示名）= “姓名（必填）”
- 滚榜时显示昵称：通过 nicknames.tsv + patch event-feed 实现
  （DOMjudge 内仍显示真名，不受影响）
"""

import argparse
import os
import secrets
import json
from typing import Any, Dict, List, Tuple

import pandas as pd


# ===================== 可根据需要修改的常量 =====================

CONTEST_YEAR = 2025

# 学号前四位在这个集合里的视为 Freshman
FRESHMAN_YEARS = {2025, 2026}

# groups.tsv 基础组别（可按需保留/修改）
GROUPS_BASE = [
    (2, "Self-Registered"),
    (3, "Participants"),
    (4, "Observers"),
]

FRESHMAN_GROUP_ID = 10
FRESHMAN_GROUP_NAME = "2025-2026 Freshman"

SENIOR_GROUP_ID = 11
SENIOR_GROUP_NAME = "2025-2026 Senior Player"

AFFILIATION_NAME = "Wuhan University of Science and Technology"
AFFILIATION_SHORT = "WUST"
COUNTRY_CODE = "CHN"

# teams.tsv 最后一列 extra（按你往年习惯）
EXTRA_FIELD_VALUE = "2"


# ===================== 报名表列名（必须和 Excel 表头完全一致） =====================

COL_NAME_REALNAME = "姓名（必填）"
COL_NAME_STUID = "学号（必填）"
COL_NAME_NICKNAME = (
    "希望展示在榜单上昵称（昵称不允许涉及敏感信息，只能使用汉子和ASCII字符，条件允许我们会使用昵称为大家滚榜）（必填）"
)


# ===================== 工具函数 =====================

def classify_group(student_id: str) -> int:
    """按学号前四位判断组别。"""
    if not student_id:
        return SENIOR_GROUP_ID
    s = str(student_id).strip()
    if len(s) < 4:
        return SENIOR_GROUP_ID
    try:
        year = int(s[:4])
    except ValueError:
        return SENIOR_GROUP_ID
    return FRESHMAN_GROUP_ID if year in FRESHMAN_YEARS else SENIOR_GROUP_ID


def sanitize_text(s: Any, max_len: int = 64) -> str:
    """
    清洗文本：
    - 去掉换行/制表符等控制字符
    - 去首尾空白
    - 限长（避免 DOMjudge/MySQL 的 name 字段过长）
    """
    if s is None:
        return ""
    s = str(s)
    for ch in ("\r", "\n", "\t"):
        s = s.replace(ch, " ")
    s = s.strip()
    if len(s) > max_len:
        s = s[:max_len]
    return s


def load_registration(input_path: str) -> pd.DataFrame:
    """读取报名表并做基础清洗：去空、按学号去重、排序。"""
    df = pd.read_excel(input_path)

    # 只保留有姓名和学号
    df = df.dropna(subset=[COL_NAME_REALNAME, COL_NAME_STUID])

    # 按学号去重（保留第一条）
    df = df.drop_duplicates(subset=[COL_NAME_STUID])

    # 按学号排序，teamid 稳定
    df = df.sort_values(by=[COL_NAME_STUID]).reset_index(drop=True)
    return df


def build_groups_rows() -> List[Tuple[int, str]]:
    rows = list(GROUPS_BASE)
    rows.append((FRESHMAN_GROUP_ID, FRESHMAN_GROUP_NAME))
    rows.append((SENIOR_GROUP_ID, SENIOR_GROUP_NAME))
    return rows


def build_teams_accounts_nicks(df: pd.DataFrame, contest_year: int):
    """
    从报名表生成：
      - teams.tsv 行：DOMjudge 队伍名 = 真名
      - accounts.tsv 行
      - nicknames.tsv 行：teamid -> nickname（滚榜用）
    """
    teams_rows: List[List[str]] = []
    accounts_rows: List[List[str]] = []
    nick_rows: List[List[str]] = []

    for idx, row in df.iterrows():
        seq = idx + 1
        teamid = f"{contest_year}{seq:03d}"     # e.g. 2025001
        externalid = f"CNB{teamid}"             # e.g. CNB2025001

        realname = sanitize_text(row[COL_NAME_REALNAME], max_len=64)
        student_id = sanitize_text(row[COL_NAME_STUID], max_len=64)
        nickname = sanitize_text(row.get(COL_NAME_NICKNAME, ""), max_len=64)

        # 昵称为空时回退真名（避免滚榜映射为空导致 name 变空）
        # 如果你坚持“昵称必填不允许回退”，改成 raise ValueError(...) 即可
        if not nickname or nickname.lower() == "nan":
            nickname = realname

        groupid = classify_group(student_id)

        # teams.tsv：name = 真名（DOMjudge 榜单/队伍名显示真名）
        teams_rows.append([
            teamid,
            externalid,
            str(groupid),
            realname,  # 关键：DOMjudge 显示真名
            AFFILIATION_NAME,
            AFFILIATION_SHORT,
            COUNTRY_CODE,
            EXTRA_FIELD_VALUE,
        ])

        # accounts.tsv
        username = f"team{teamid}"
        password = secrets.token_urlsafe(8)
        accounts_rows.append([
            "team",
            realname,
            username,
            password,
        ])

        # nicknames.tsv：滚榜显示昵称用
        nick_rows.append([
            teamid,
            nickname,
        ])

    return teams_rows, accounts_rows, nick_rows


def write_groups_tsv(path: str):
    rows = build_groups_rows()
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write("groups\t1\n")
        for gid, name in rows:
            f.write(f"{gid}\t{name}\n")


def write_teams_tsv(path: str, teams_rows: List[List[str]]):
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write("teams\t1\n")
        for cols in teams_rows:
            f.write("\t".join(map(str, cols)) + "\n")


def write_accounts_tsv(path: str, accounts_rows: List[List[str]]):
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write("accounts\t1\n")
        for cols in accounts_rows:
            f.write("\t".join(map(str, cols)) + "\n")


def write_nicknames_tsv(path: str, nick_rows: List[List[str]]):
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write("teamid\tnickname\n")
        for teamid, nickname in nick_rows:
            f.write(f"{teamid}\t{nickname}\n")


def read_nicknames_tsv(path: str) -> Dict[str, str]:
    """读取 nicknames.tsv -> dict(teamid -> nickname)。"""
    mapping: Dict[str, str] = {}
    with open(path, "r", encoding="utf-8") as f:
        first = True
        for line in f:
            line = line.rstrip("\n")
            if not line:
                continue
            if first:
                first = False
                if line.lower().startswith("teamid"):
                    continue
            parts = line.split("\t")
            if len(parts) < 2:
                continue
            teamid = parts[0].strip()
            nickname = "\t".join(parts[1:]).strip()
            if teamid:
                mapping[teamid] = nickname
    return mapping


# ===================== 子命令：gen =====================

def cmd_gen(args):
    os.makedirs(args.outdir, exist_ok=True)

    df = load_registration(args.input)
    teams_rows, accounts_rows, nick_rows = build_teams_accounts_nicks(df, args.year)

    groups_path = os.path.join(args.outdir, "groups.tsv")
    teams_path = os.path.join(args.outdir, "teams.tsv")
    accounts_path = os.path.join(args.outdir, "accounts.tsv")
    nicks_path = os.path.join(args.outdir, "nicknames.tsv")

    write_groups_tsv(groups_path)
    write_teams_tsv(teams_path, teams_rows)
    write_accounts_tsv(accounts_path, accounts_rows)
    write_nicknames_tsv(nicks_path, nick_rows)

    print(f"已生成：{groups_path}")
    print(f"已生成：{teams_path}（DOMjudge 队伍名=真名）")
    print(f"已生成：{accounts_path}")
    print(f"已生成：{nicks_path}（滚榜映射 teamid->昵称）")
    print(f"共生成 {len(teams_rows)} 个队伍 / 账号。")


# ===================== 子命令：patch（NDJSON event-feed） =====================

def cmd_patch(args):
    """
    读取 DOMjudge event-feed（NDJSON，每行一个 JSON 事件），把 teams 事件中的 data.name 改成昵称。
    输出仍然是 NDJSON，保证 resolver 可直接使用。
    """
    nick = read_nicknames_tsv(args.nick)
    replaced = 0
    total_lines = 0
    team_events = 0

    with open(args.infile, "r", encoding="utf-8") as fin, open(args.outfile, "w", encoding="utf-8") as fout:
        for line in fin:
            line = line.strip()
            if not line:
                continue

            total_lines += 1
            obj = json.loads(line)

            # DOMjudge event feed teams 事件结构示例：
            # {"type":"teams","op":"create","data":{"id":2025001,"name":"真名",...}}
            if isinstance(obj, dict) and obj.get("type") == "teams":
                team_events += 1
                d = obj.get("data")
                if isinstance(d, dict):
                    tid = d.get("id")
                    if tid is not None:
                        tid = str(tid)
                        if tid in nick:
                            d["name"] = nick[tid]
                            replaced += 1

            fout.write(json.dumps(obj, ensure_ascii=False) + "\n")

    print(f"已写出：{args.outfile}")
    print(f"输入事件行数：{total_lines}，其中 teams 事件：{team_events}")
    print(f"已替换队伍名数量：{replaced}")
    if team_events == 0:
        print("提示：输入文件中没有 type:'teams' 事件。请确认这是完整的 DOMjudge event-feed。")


# ===================== main =====================

def main():
    parser = argparse.ArgumentParser(description="CNB DOMjudge TSV 生成 + event-feed 昵称替换工具")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_gen = sub.add_parser("gen", help="从 Excel 生成 groups/teams/accounts/nicknames TSV")
    p_gen.add_argument("--input", required=True, help="报名信息 Excel 文件路径")
    p_gen.add_argument("--outdir", default=".", help="输出目录（默认当前目录）")
    p_gen.add_argument("--year", type=int, default=CONTEST_YEAR, help=f"比赛年份（默认 {CONTEST_YEAR}）")
    p_gen.set_defaults(func=cmd_gen)

    p_patch = sub.add_parser("patch", help="替换 DOMjudge event-feed（NDJSON）中 teams 的 name 为昵称")
    p_patch.add_argument("--nick", required=True, help="nicknames.tsv 路径（gen 输出）")
    p_patch.add_argument("--in", dest="infile", required=True, help="输入 event-feed.json（NDJSON）")
    p_patch.add_argument("--out", dest="outfile", required=True, help="输出 event-feed.nick.json（NDJSON）")
    p_patch.set_defaults(func=cmd_patch)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()


```

脚本的具体内容根据年份更改，会生成accounts,teams,和groups三个文件之后在domjudge的**import**和**export**选项这里进入，导入就行了

## 题目导入
题目的导入算不得麻烦，就是会有一点小坑，主要还是打包格式的问题
这里是spj的打包格式
```
.
├── data
│   ├── sample
│   └── secret
├── output_validators
│   └── validate
│       ├── checker.cpp
│       └── testlib.h
├── submissions
│   ├── accepted
├── domjudge-problem.ini
├── problem.pdf

```
这是普通题目的打包格式
```
.
├── data
│   ├── sample
│   └── secret
├── submissions
│   ├── accepted
├── domjudge-problem.ini
├── problem.pdf

```
建议pdf统一都用markdown导出，在出题之前写好一个<mark>markdown的模板</mark>，让他们在此模板进行修改，以防题目格式百花齐放（

**最要注意的来了**

如果你是git下来的文件夹，很有可能犯的一个错误就是压缩包的层级错误，DOMjudge 要求 domjudge-problem.ini 和 problem.yaml 必须位于压缩包的**根目录**。


## ⚠️ 重要：DOMjudge 题目 ZIP 打包方式（错误会直接导致无法导入）

### ❌ 错误做法（**常见，坑了我好久**）

> **对着整个题目文件夹点击右键 → 压缩**

```text
PROBLEM.zip
└── PROBLEM/
    ├── data/
    ├── submissions/
    ├── domjudge-problem.ini
    └── ...
```

**错误后果：**

* DOMjudge **无法识别题目结构**
* 后台导入时会：

  * 直接失败
  * 或无报错但题目不显示
* 表现为：
  **“显示导入0个testcases”**
* 属于 **最常见、最隐蔽、最浪费时间的错误之一**

 **只要 ZIP 第一层是文件夹，DOMjudge 一定识别失败。**

---

### ✅ 正确做法

> **进入 `PROBLEM` 文件夹内部 → 全选所有内容 → 右键 → 压缩为 ZIP**

```text
PROBLEM.zip
├── data/
├── submissions/
├── domjudge-problem.ini
└── ...
```

**关键要求（缺一不可）：**

* ZIP **第一层必须是文件**
* `domjudge-problem.ini` **必须在根目录**
* `data/`、`submissions/` 与 ini 文件 **同级**

### 压缩脚本
::chat
{:2024-12-12 14:19:30}

{scandi}

照你这么说，打包文件未免也太麻烦了


{scandi}

有没有那种一口气全打包好的脚本

{:Wa撤回了一条消息}

{.Wa}

有的兄弟有的，在下面给你贴出来
::
```py
import os
import zipfile

# --- 配置区域 ---
# 忽略的文件夹（不打包这些）
IGNORE_DIRS = {
    ".git", 
    ".vscode", 
    ".idea", 
    "__pycache__"
}
# 忽略的文件后缀（不打包这些）
IGNORE_EXTENSIONS = {".zip", ".py", ".exe", ".DS_Store"}
# ----------------

def pack_folder(folder_name):
    """打包单个文件夹"""
    folder_path = os.path.join(".", folder_name)
    zip_filename = f"{folder_name}.zip"
    
    print(f"📦 正在打包: {folder_name} -> {zip_filename}")
    
    try:
        with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
            # 遍历题目文件夹内部
            for root, dirs, files in os.walk(folder_path):
                # 移除无需打包的子文件夹，避免遍历进去
                dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
                
                for file in files:
                    file_path = os.path.join(root, file)
                    
                    # 忽略特定后缀的文件
                    if file.startswith(".") or os.path.splitext(file)[1] in IGNORE_EXTENSIONS:
                        continue
                        
                    # 关键步骤：计算 ZIP 内的相对路径
                    # 作用：确保压缩包打开后直接是 data, submissions 等，而不是包了一层文件夹
                    arcname = os.path.relpath(file_path, folder_path)
                    
                    zipf.write(file_path, arcname)
        print(f"    ✅ 成功")
    except Exception as e:
        print(f"    ❌ 失败: {e}")

def main():
    root_dir = os.getcwd()
    print(f"📂 工作目录: {root_dir}")
    print("-" * 30)

    count = 0
    # 遍历当前目录下的所有项目
    for item in os.listdir(root_dir):
        item_path = os.path.join(root_dir, item)
        
        # 只处理文件夹，且不在黑名单里
        if os.path.isdir(item_path) and item not in IGNORE_DIRS:
            pack_folder(item)
            count += 1
            
    print("-" * 30)
    print(f"🎉 全部搞定！共打包 {count} 个题目。")

if __name__ == "__main__":
    main()
```
## 滚榜（Resolver）

既然都办比赛了，那**不滚榜是不完整的**。
不滚榜的比赛，现场气氛直接少一半。

我们这边用的是 **resolver** 这一套滚榜工具，**ICPC / DOMjudge 圈子里很常见**，稳定、省心、效果也够用。

**首先需要取得event-feed.json**

这里看了别人的文档，大致知道我们的domjudge版本下是访问

**域名/domjudge/api/v4/contests/{contest_id}/event-feed/?stream=false**输入管理员账户的账号密码，获得event-feed再改后缀即可



接下来resolver文件夹里新建一个文件夹叫做CDP,把先前的event-feed.json放进去，之后点击award.bat进行一个初始化，初始化你想要设置的奖项，然后在当前文件夹打开powershel输入
```bash 
.\resolver.bat CDP
```
就可以运行了
这时候我们会发现，哇塞，怎么榜单上是真实名字，完全没有想要的效果
这是因为我们在domjudge系统里用的是真实名字（为了方便最后颁发奖项），所以我们需要一个映射把真实名字变成想要榜单的名字，依旧是用第一部分的那个脚本，执行那个注释里的命令,完成名称的替换
这时候再进行测试就好了
### windows环境下
可能存在的问题有：**中文名字全部变成框框了**，要解决这个问题的话，你得在
**resolver.bat**文件夹的开头加入两行代码
echo off为自带的，无需理会
```bat
@echo off 
set "ICPC_FONT=Microsoft YaHei"
set "ICPC_FONT_NAME=Microsoft YaHei"
```
如果是想要让滚榜没这么自动，可以把使用award.bat设置多一点奖项，让大部分名字都能念得到。
### linux环境下  
如果是linux环境，可以查看
[scandi的博客](www.baidu.com)

哦对了，如果这两个bat打不开，大概率是因为没有java环境，这里我就不赘述怎么配置环境了，自己上网搜索即可

## 注意事项
！！！！！！在拉题的时候不要拉到热身赛上了！！！！
然后拉完题之后最好拉一个测试的比赛有所有的题，然后把std都交一遍，检查一下数据是不是有问题
我们这次检查出了好多问题，包括pdf缺失（不知道为什么     
## 后记
还有什么要说吗，让我想想，没有的话就先这样，还打算写一个计网和数据结构的复习笔记呢。
哦，记起来了，可能要讲讲用牛客验题的规范还有spj的写法。挖个坑改日再写吧