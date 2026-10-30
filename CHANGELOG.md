# Change Log

本文件记录 vscode-ihyperdb-snippet 的版本变更。
格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [0.1.1] - 2026-10-31

### 修复

- 发布流水线补上闭环校验：发布后轮询 Marketplace，版本未上线则失败（`scripts/check-marketplace.mjs`）。
- 背景：0.1.0 上传成功，但 Marketplace 索引有数分钟延迟，早期查询看不到新版本。
  `vsce publish --skip-duplicate` 会把重复发布当作成功，掩盖「版本尚未生效」。
- 结果：0.1.0 与 0.1.1 均已上线，0.1.1 为当前最新版本。

## [0.1.0] - 2026-10-31

### 修复

- `contributes.snippets.language` 由 `'c'` 改为 `c`。带引号的字符串不是合法语言 ID，片段此前不会挂载到 C 文件。
- `TagMinute` 描述里的分钟区间由 0-69 改为 0-59，与手册一致。
- `TagYearday`、`TagDaysec`、`TagUnixsec` 描述里的示例行由 `TagDay(...)` 改为各自的函数名。
- `PreBadVal` 描述里的示例行由 `NoneRecord(...)` 改为 `PreBadVal(...)`。

### 新增

- 内置函数 `TagWeekday`：快照时间的星期 (1-7)。
- 内置函数 `BadVal`：数据质量为 bad 时返回 1。
- 内置函数 `PreUnixsec`：上一条记录的 Unix 时间戳。
- 语法片段 `<>`：不等于运算符。
- `scripts/validate-snippets.mjs`：校验片段结构、占位符编号、版本同步、README 覆盖。
- `scripts/check-version.mjs`：校验 Git 标签与包版本一致。
- `test/`：在真实 VS Code 中断言补全项出现的 smoke 测试。
- GitHub Actions：`ci.yml` 校验并打包；`release.yml` 按标签发布到 Marketplace 与 Open VSX。

### 变更

- `FilExtream` 描述补充斜率公式、最大间隔规则、坏质量点规则、计算周期约束。
- `NoOutput`、`PrevVal`、`BadVal` 描述补充手册示例。
- README 重写：更新手册链接、补齐函数清单、新增配置规则与运算符优先级表。

### 移除

- 移除对旧手册地址 `product.baosight.com/wp-content/uploads/doc/ihdonline/` 的引用（已 404）。

## [0.0.4]

已发布到 Marketplace，仓库无对应提交与记录。

## [0.0.3]

- 更新包信息与实际发布内容。

## [0.0.2]

- 更新 README.md。

## [0.0.1]

- 初始版本：3 个语法片段、15 个内置函数、3 个常用代码片段。
