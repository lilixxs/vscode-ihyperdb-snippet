# AGENTS.md

VS Code 补全插件。功能全部由 iHyperDB 计算点表达式片段实现，共 25 个片段。
片段挂在语言 ID `c` 上，只在 C 语言模式的编辑器里触发。

## 关键文件

- `snippets/snippets.code-snippets`：唯一的功能实现。
- `package.json`：`contributes.snippets` 与 npm 脚本。
- `scripts/validate-snippets.mjs`：硬性约束的校验器，CI 门禁。
- `.github/workflows/ci.yml`、`release.yml`：校验打包与标签发布。

## 命令

```bash
npm ci                                          # 安装开发依赖
npm run validate                                # 校验片段、清单、README
npm run package -- --out ihyperdb-snippet.vsix  # 生成 vsix
npm run test:smoke                              # 真实 VS Code 冒烟测试
npm run check:version v0.1.0                    # 标签与版本一致性
```

没有 lint 和单元测试框架。`npm run validate` 就是门禁，不要跳过。

## 片段文件规则

- 文件是 JSONC，带尾逗号。`JSON.parse` 会直接失败，校验器自带解析器。改完跑 `npm run validate`。
- 占位符编号决定 Tab 顺序，同号出现多次表示镜像填充：
  - `ihd snippet trigUP` / `trigDown` 重复使用 `${1:trigger_tag}`，用户只填一次点名。
  - `ihd snippet compare3` 的 `${2:pt_tag}` 在 body 中先于 `${1:a}`，Tab 顺序是 a → pt_tag → b。
  重编号会破坏镜像与顺序。
- 部分 `prefix` 是带空格的英文短语，例如 `"Filter Extreme iHD"`、`"3 vars compare"`。保留原样。
- 键名按三组统一：`ihd syntax <名称>`、`ihd func <名称>`、`ihd snippet <名称>`。输入匹配只走 `prefix`。
- 每个片段的首个 `prefix` 必须出现在 `README.md`，否则 `validate` 失败。
- `ihd func` 条目的 `description` 必须含以函数名开头的示例行（`PreMs('pt_tag')`），否则 `validate` 失败。
- `contributes.snippets[0].language` 必须是 `c`。写成 `"'c'"` 时片段不会挂载：
  smoke 测试在旧值下 3 个断言的补全列表为空，改成 `c` 后全部通过。

## 验证

1. `npm run validate`。
2. `npm run package -- --out ihyperdb-snippet.vsix`，确认 vsix 内含 `extension/package.json` 与 `extension/snippets/snippets.code-snippets`。
3. `npm run test:smoke`。它启动真实 VS Code 扩展宿主，对 `.c` 文档请求补全并断言片段出现。
   - 不设 `VSCODE_EXECUTABLE` 时下载 stable 版；本机可指向 `Code.exe` 复用已安装版本。
   - 依赖 VS Code 内置 `cpp` 扩展声明的 `c` 语言；语言不存在时用例失败而不是跳过。

## 发布

- 推送 `v<version>` 标签触发 `release.yml`：校验标签与版本一致 → 打包 → 发布 → 建 GitHub Release。
- 版本号要同步三处：`package.json` 的 `version`、`package-lock.json` 根 `version` 和 `packages[""].version`。
  `validate` 会校验这三处。
- 发布认证：Marketplace 走 Trusted Publishing（OIDC）。工作流已声明 `id-token: write`，无需 `VSCE_PAT`。
  配了 `VSCE_PAT` 时优先用 PAT；两者都没有时发布步骤会失败，不再静默跳过。
- Open VSX 仍要 `OVSX_PAT`；缺失时打 warning 并跳过，不影响 Marketplace 发布。
- 手动触发 `release.yml` 时 `dry_run` 默认 true，只打包不发布。
- Marketplace 已有 0.0.4，但仓库没有对应提交。不要假设仓库版本等于线上版本。

## iHyperDB 语法约束

来源：官方手册「计算点」章节 `res.baowugroup.com/baosightproduct/wp-content/uploads/doc/ihdonline/tag_calculate.htm`。

- 点名用单引号包裹：`PrevVal('tag1')`。
- 计算点类型只能是 `int32` 或 `float64`；`string`、`blob` 不参与计算。
- `IF` 必须带 `ELSE`，关键字后的表达式都要加括号。不需要输出时写 `NoOutput()`。
- 不支持连续比较，`a > b > c` 要拆成 `(a>b)&&(b>c)`。
- 正负号要加括号：`'int8'*(-1)`。
- 表达式以西文单引号开头时，整体加括号：`('tag1'+1)`。
- 不等于写作 `<>`，不要写 `!=`。
- `FilExtream` 的计算周期要小于被采集点的采集周期。

## 文档与文件编码

- README 中英双语。改功能清单要同时改中文表格与英文列。
- 图片放 `FILES/README.md/`，用相对路径引用。
- 旧手册地址 `product.baosight.com/wp-content/uploads/doc/ihdonline` 返回 404，`validate` 会拦截这个字符串。
- 工作区是 CRLF（`core.autocrlf=true`），仓库存 LF。用能保持换行符的工具改文件。
- `package.json` 不能带 BOM，npm 会报 `EJSONPARSE`。不要用 PowerShell 的 `Set-Content -Encoding utf8` 写它。
