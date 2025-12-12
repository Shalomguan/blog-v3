---
title: DOMJUDGE食用指南
date: 2025-12-11 23:30:20
categories: [acm]
---
## 导入名单
> 致小登们:办菜鸟杯的时候我是负责拉题上DOMJUDGE上的配置，包括导入题目，拉取名单生成密码之类的。发觉有些事情难办的很啊，于是写一篇博客用来备忘。

首先我想要说的就是这个名单的导入，这个算是最简单的了，基本不会有坑，不过考虑到有人可能觉得写脚本麻烦，我在下面贴一个脚本
```py
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
从“2025年菜鸟杯报名信息收集表（收集结果）.xlsx”生成：
  - groups.tsv
  - teams.tsv
  - accounts.tsv（DOMjudge 账户）

使用方式示例（PowerShell）：
    python gen_cnb_domjudge.py `
        --input "2025年菜鸟杯报名信息收集表（收集结果）.xlsx" `
        --outdir "out"

依赖：
    pip install pandas openpyxl
"""

import argparse
import os
import secrets
from typing import List, Tuple

import pandas as pd

# ===== 可根据需要修改的常量 =====

# 默认比赛年份，用于生成 teamid: <year> + 三位序号，例如 2025001
CONTEST_YEAR = XXXX
# 学号前四位在这个集合里的视为“2025-2026 Freshman”
FRESHMAN_YEARS = {XXXX, XXXX}
# groups.tsv 中基础组别
GROUPS_BASE = [
    (2, "Self-Registered"),
    (3, "Participants"),
    (4, "Observers"),
]

# 今年 CNB 用到的两个 group ID
FRESHMAN_GROUP_ID = XX
FRESHMAN_GROUP_NAME = "XXXX-XXXX Freshman"

SENIOR_GROUP_ID = 11
SENIOR_GROUP_NAME = "XXXX-XXXX Senior Player"

# 学校信息（teams.tsv 中使用）
AFFILIATION_NAME = "Wuhan University of Science and Technology"
AFFILIATION_SHORT = "WUST"
COUNTRY_CODE = "CHN"

# teams.tsv 最后一列“extra”的值（参照你往年的文件）
EXTRA_FIELD_VALUE = "2"

# ===== 报名表列名（此处根据EXCEL表头创建） =====

COL_NAME_REALNAME = "姓名（必填）"
COL_NAME_STUID = "学号（必填）"
COL_NAME_NICKNAME = (
    "希望展示在榜单上昵称（昵称不允许涉及敏感信息，只能使用汉子和ASCII字符，条件允许我们会使用昵称为大家滚榜）（必填）"
)

def classify_group(student_id: str) -> int:
    """
    按学号前四位（入学年份）判断组别：
    - 如果是 2025 就是 2025-2026 Freshman
    - 其余全部 → 2025-2026 Senior Player
    """
    if not student_id:
        return SENIOR_GROUP_ID

    s = str(student_id).strip()
    if len(s) < 4:
        return SENIOR_GROUP_ID

    try:
        year = int(s[:4])
    except ValueError:
        return SENIOR_GROUP_ID

    if year in FRESHMAN_YEARS:
        return FRESHMAN_GROUP_ID
    return SENIOR_GROUP_ID


def sanitize_display_name(name: str, max_len: int = 64) -> str:
    """
    清洗榜单展示名：
      - 去掉换行、制表符等控制字符；
      - 限制最大长度，避免 MySQL “Data too long for column 'name'”。
    """
    if not name:
        return ""

    # 转成字符串，去掉控制字符
    name = str(name)
    for ch in ("\r", "\n", "\t"):
        name = name.replace(ch, " ")
    name = name.strip()

    # 限制最大长度
    if len(name) > max_len:
        name = name[:max_len]
        # 如需省略号可以改为：
        # name = name[:max_len - 1] + "…"

    return name


def load_registration(input_path: str) -> pd.DataFrame:
    """读取报名表并做简单清洗。"""
    df = pd.read_excel(input_path)

    # 只保留有姓名和学号的行
    df = df.dropna(subset=[COL_NAME_REALNAME, COL_NAME_STUID])

    # 按学号去重（保留第一条）
    df = df.drop_duplicates(subset=[COL_NAME_STUID])

    # 按学号排序，生成 teamid 时更稳定
    df = df.sort_values(by=[COL_NAME_STUID])
    df = df.reset_index(drop=True)
    return df


def build_groups_rows() -> List[Tuple[int, str]]:
    """构造今年 groups.tsv 的所有行（不包含头）。"""
    rows = list(GROUPS_BASE)
    rows.append((FRESHMAN_GROUP_ID, FRESHMAN_GROUP_NAME))
    rows.append((SENIOR_GROUP_ID, SENIOR_GROUP_NAME))
    return rows


def build_teams_and_accounts(df: pd.DataFrame, contest_year: int):
    """
    从报名表构造：
      - teams.tsv 的数据行
      - accounts.tsv 的数据行
    不包含头部行。
    """
    teams_rows = []
    accounts_rows = []

    for idx, row in df.iterrows():
        # ===== 生成队伍编号 =====
        seq = idx + 1              # 从 1 开始编号
        teamid = f"{contest_year}{seq:03d}"  # 例如 2025001
        team_short_name = f"CNB{teamid}"     # 简短队名，用在 externalid

        # ===== 基本信息 =====
        realname = str(row[COL_NAME_REALNAME]).strip()
        student_id = str(row[COL_NAME_STUID]).strip()

        # 昵称列（希望展示在榜单上的名字）
        nickname = row.get(COL_NAME_NICKNAME, "")
        if nickname is None:
            nickname = ""
        nickname = str(nickname).strip()

        # 为空或 NaN 时退回真实姓名
        if not nickname or nickname.lower() == "nan":
            display_name = realname
        else:
            display_name = nickname

        # 清洗 & 限长，防止导入 DOMjudge 时 name 字段过长
        display_name = sanitize_display_name(display_name, max_len=64)

        # ===== 组别 =====
        groupid = classify_group(student_id)

        # ===== 组装 teams.tsv 行 =====
        # 格式：teamid  externalid  groupid  name  affiliation_name
        #       affiliation_short  country  extra
        teams_rows.append([
            teamid,
            team_short_name,
            str(groupid),
            display_name,          # 榜单上显示的队名：昵称/真实姓名
            AFFILIATION_NAME,
            AFFILIATION_SHORT,
            COUNTRY_CODE,
            EXTRA_FIELD_VALUE,
        ])

        # ===== 组装 accounts.tsv 行 =====
        # DOMjudge accounts.tsv：type  fullname  username  password
        # 这里按你的需求：fullname = 真实姓名（user.name 用真实姓名）
        username = f"team{teamid}"
        password = secrets.token_urlsafe(8)  # 约 11 字符随机密码

        accounts_rows.append([
            "team",
            realname,   # user 的 name 字段：真实姓名
            username,
            password,
        ])

    return teams_rows, accounts_rows


def write_groups_tsv(output_path: str):
    """写 groups.tsv，头一行须为 'groups\\t1'。"""
    rows = build_groups_rows()
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        f.write("groups\t1\n")
        for gid, name in rows:
            f.write(f"{gid}\t{name}\n")


def write_teams_tsv(output_path: str, teams_rows):
    """写 teams.tsv，头一行为 'teams\\t1'。"""
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        f.write("teams\t1\n")
        for cols in teams_rows:
            f.write("\t".join(map(str, cols)) + "\n")


def write_accounts_tsv(output_path: str, accounts_rows):
    """写 accounts.tsv，符合 DOMjudge 文档格式。"""
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        f.write("accounts\t1\n")
        for cols in accounts_rows:
            f.write("\t".join(map(str, cols)) + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="从菜鸟杯报名表生成 DOMjudge 的 groups.tsv / teams.tsv / accounts.tsv"
    )
    parser.add_argument(
        "--input",
        required=True,
        help="报名信息 Excel 文件路径，例如：2025年菜鸟杯报名信息收集表（收集结果）.xlsx",
    )
    parser.add_argument(
        "--outdir",
        default=".",
        help="输出目录（默认当前目录）",
    )
    parser.add_argument(
        "--year",
        type=int,
        default=CONTEST_YEAR,
        help=f"比赛年份，用于生成 teamid（默认 {CONTEST_YEAR}）",
    )

    args = parser.parse_args()

    input_path = args.input
    outdir = args.outdir
    contest_year = args.year

    os.makedirs(outdir, exist_ok=True)

    df = load_registration(input_path)

    teams_rows, accounts_rows = build_teams_and_accounts(df, contest_year)

    groups_path = os.path.join(outdir, "groups.tsv")
    teams_path = os.path.join(outdir, "teams.tsv")
    accounts_path = os.path.join(outdir, "accounts.tsv")

    write_groups_tsv(groups_path)
    write_teams_tsv(teams_path, teams_rows)
    write_accounts_tsv(accounts_path, accounts_rows)

    print(f"已生成：{groups_path}")
    print(f"已生成：{teams_path}")
    print(f"已生成：{accounts_path}")
    print(f"共生成 {len(teams_rows)} 个队伍 / 账号。")


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
