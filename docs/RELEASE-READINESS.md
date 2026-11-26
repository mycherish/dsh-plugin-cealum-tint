# Cealum Tint — Release Readiness 最终工程审计

> 审计日期：2026-11-26 · 审计基线：commit `7abd362`（main）· 审计性质：**只读**
> 本审计未创建 Tag、未推送 GitHub、未发布 npm、未卸载插件、未修改 Profile；除本文件外未改动任何项目文件。

---

## 1. 项目当前状态

| 维度 | 状态 |
|---|---|
| 功能开发 | ✅ 完成（Host Config + Client 样式/设置页，`src/` 25 文件） |
| 自动化测试 | ✅ 6 文件 **58/58**（vitest，2026-11-26 21:49 实测） |
| 类型/格式 | ✅ `tsc --noEmit` 严格模式通过；prettier 无 diff |
| 安装 | ✅ 官方 `plugin_manager` 装至 desktop profile（live link，v0.1.0） |
| 运行态 | ✅ 注册表 `include:cealum-tint enabled:true fiberPhase:active` |
| 23 项验收 | **21 ✅ + 2 ⏸观察（#18/#20，经用户同意转日常观察，未标 PASS）** |
| Git | ✅ `main` @ `7abd362`，审计时工作区 Clean；**〔11-27 复核：远端私有空仓库已建，本地 origin 未配置、推送未执行——见文末附录〕** |

**标识三层体系（by design，无需改动）**：包名 `dsh-plugin-cealum-tint`（= Loader chunk id）／patch 行 id `cealum-tint`（= 设置命名空间）／显示名 locale meta `Cealum Tint`/`云岫着色`。`cordis.patch.yml` 注释与实施日志 E2 均已声明该语义。

## 2. 工程质量

### 2.1 通过项

| 检查点 | 结论 |
|---|---|
| 目录结构 | ✅ `src/{host,client,shared}` + `tests/`(6) + `scripts/`(1) + `docs/`(6) + `locale/`(2)，职责分离清晰，无循环依赖面 |
| package.json | ✅ name/version/license(MIT)/description/engines(node ^22.19‖≥24)/keywords/exports/dsh.bundle+dsh.client/files/scripts 齐备 |
| TS 配置 | ✅ `strict` + `noUncheckedIndexedAccess` + `verbatimModuleSyntax` + `isolatedModules` + `noEmit`（产物由 esbuild 负责），合理 |
| 构建脚本 | ✅ `scripts/build.mjs` 自研零依赖构建器；`npm run verify`（build+tsc+test）稳定复现；其中 `console.log` 为构建报告输出，非调试残留 |
| 测试脚本 | ✅ `test`/`verify`/`format:check` 完整；58 用例覆盖 hex 归一、对比度、预设/迁移、schema、store 乐观写、locale 对齐 |
| `.gitignore` | ✅ 覆盖产物（index.js/client.js）、node_modules、.npm-cache、dist、*.log、.DS_Store、coverage、.memsearch/ |
| 无用/重复代码 | ✅ src/tests 无 `console/debugger/TODO/FIXME`；store 的 PRESET_HEX 已改为从 PRESETS 派生（E7 修复过一处重复源） |
| 硬编码路径 | ✅ src/tests/scripts **零**本机绝对路径（见 §3.2 的 docs 例外） |

### 2.2 建议项（不阻塞当前使用）

| # | 发现 | 等级 | 建议 |
|---|---|---|---|
| R-1 | package.json 缺 `repository`/`homepage`/`bugs` 字段 | 低 | 公开发布前补 |
| R-2 | 缺标准 `CHANGELOG.md`（现由 IMPLEMENTATION-LOG E0–E8 承担变更记录） | 低 | 1.0.0 前补一份精简 CHANGELOG |
| R-3 | 缺 `prepublishOnly` 守卫（npm 发布前自动 build） | 低 | 发布 npm 前补 `"prepublishOnly": "npm run verify"` |
| R-4 | 无 CI workflow / coverage 配置 | 信息 | 可选，公开仓库后补 GitHub Actions 即可 |

## 3. 安全检查（以未来公开 GitHub 为目标）

### 3.1 代码与数据

| 检查项 | 结果 |
|---|---|
| API Key / Token | ✅ `git grep` 全量扫描（src/locale/README/docs）无密钥、无 token、无凭据 |
| 用户配置/聊天数据 | ✅ 仓库无任何用户数据；docs 仅含插件自身配置的 JSON 摘录（enabled/preset/颜色） |
| 调试日志 | ✅ 无遗留调试输出 |
| 本机环境信息 | ⚠️ 见 3.2 |

### 3.2 个人路径（唯一需要决策的安全项）

- **位置**：`docs/DEVELOPMENT-PLAN.md`、`docs/IMPLEMENTATION-LOG.md`、`docs/DELIVERY-REPORT.md` 含本机取证路径（`/Users/xuweidong/...`、`~/.dsh/profiles/...`、app.asar 路径、日志文件名）。
- **性质**：全部是 23 项验收的**历史证据记录**（按要求保留，不删改）。
- **风险等级**：低（泄露的是目录名与文件结构，无凭据；但暴露用户名与本机布局）。
- **修复建议（三选一，公开 GitHub 前执行其一）**：
  1. 公开仓库保持原样并在 README 声明"docs 含作者本机取证路径"；
  2. 发布前对三份文档做一次机械脱敏（`/Users/xuweidong` → `~/`），保留证据语义；
  3. 公开仓库只含 `src/tests/scripts/locale/docs/{DETAIL*,preview.svg}` + README，审计/证据文档留在私有侧。
- **代码侧**：`src/tests/scripts` 无任何路径依赖，发布产物不受影响。

### 3.3 依赖安全（npm audit，离线 lockfile 分析）

| 包 | 严重度 | 性质 | 是否触达本插件 | 修复 |
|---|---|---|---|---|
| tinypool ≤2.1.1 | **critical ×2** | worker options 原型污染 → 本地 RCE | 否（仅 vitest 本地测试进程） | `npm audit fix --force` → vitest@5.1.2（major） |
| @vitest/mocker ≤4.1.11 | moderate ×2 | 路径穿越/任意文件读、mock 注册代码注入 | 否（仅本地测试） | 同上 |
| esbuild ≤0.24.2 | moderate ×1+high 关联 | dev server 任意请求 | 否（`npm audit` 计入 vite 关联链；我们只用 build API，未用 serve） | 随工具链升级 → esbuild@0.28 |
| vite / vite-node 链 | high 计入 | 依赖上述 | 否 | 同上 |

**结论**：6 项漏洞全部位于 `devDependencies` 工具链，**不进入发布产物**（产物对 react/primitives 全外部引用，runtime 仅 `@deepseek-ai/schemastery`，该项无漏洞）。本地开发机跑测试时的暴露面有限；**1.0.0 前执行 `npm audit fix --force` 并全量回归 58 用例 + 构建兼容性检查**（本审计按要求未改动）。

### 3.4 许可证

- 本项目：MIT（LICENSE 在库）。
- 第三方：产物零第三方代码内联；runtime 依赖 `@deepseek-ai/schemastery` 的 license 建议公开发布前 `npm view @deepseek-ai/schemastery license` 核对一次。

## 4. Git 与版本管理

- 分支 `main`；唯一提交 `7abd362`（feat: v0.1.0，41 文件 / 6,050 行）；工作区 Clean。
- 被跟踪文件 41 个：无 `.env`/secret/日志/node_modules/产物（`git ls-files` 核验）。
- **远程仓库**〔11-27 复核更新〕：`gh api` 实测——`mycherish/dsh-plugin-cealum-tint` 已创建（11-26 14:34 UTC），**可见性 PRIVATE**，`branches:0` / `size:0`，即**远端为空仓库、尚无任何提交**；本地 `git remote -v` 为空（用户执行的 remote/push 命令在本目录未生效），未擅自代为添加或推送。**本地提交 ≠ 异地备份**，推送动作待用户确认（见文末附录）。
- 版本变更记录：IMPLEMENTATION-LOG E0–E8 完整（九阶段），标准 CHANGELOG.md 见 R-2。

**版本建议**

| 项 | 建议 |
|---|---|
| 当前开发版本 | `0.1.0`（已安装验证的功能全集） |
| Release Candidate | **`0.1.0-rc.1`**（semver 预发布号；产物与代码与现 0.1.0 一致，仅版本号标注性质） |
| Tag 命名 | `v0.1.0-rc.1`（list-style 合规；**未经确认不创建**） |
| 正式 1.0.0 条件 | 见 §8 发布建议第 5 条 |

## 5. 文档完整性

五份文档齐备且行数合理（报告 179 / 计划 1006 / 日志 210 / README 68+64），逐项核验：

| 要求 | 结果 |
|---|---|
| E0–E8 记录 | ✅ 九条全在（`grep '^## E'` 实测 9 条） |
| 58 项测试证据 | ✅ 交付报告 4 处 + 日志 E7（原 56 + 新增 2） |
| #18/#20 未误标 PASS | ✅ 两行均为 `⏸观察`，§9 明示"未完成构建/验收项＝无，观察项经用户同意" |
| 计划 ↔ 代码一致性抽核 | ✅ 3/3（PRESET_IDS 顺序、BUBBLE_CSS 回落链、token 语义与 §1 结论一致） |
| 安装/启用/禁用/卸载说明 | ✅ 存在（README 行为说明 + 报告 §5 脚本 + §10.5 卸载净化 + E8 禁用回执）；**README 无分步安装命令**（见差异清单 D-3） |
| DSH 升级检查方法 | ✅ 报告 §10.1 有基础流程；7 项完整清单已由本文件 §7 兜底（见 D-1） |
| ChatGPT 对外品牌文案 | ✅ 0 处（src 唯一命中为迁移别名键 `'chatgpt-green': 'deep-green'`，属数据键非文案；docs 历史取证引文已加注） |

**文档差异清单（只报告，未覆盖）**：

| # | 差异 | 等级 | 处置建议 |
|---|---|---|---|
| D-1 | 报告 §10 的升级检查为 6 条建议式，非用户要求的 7 项操作清单 | 低 | 本文件 §7 已给完整清单；后续可在报告 §10 加一行链接 |
| D-2 | E4 头部时间 17:18 早于 E3 的 17:30 | 信息 | 已有勘误注，保留原样 |
| D-3 | README（双语）缺一步式安装/卸载命令段 | 低 | 发布 npm/GitHub 前补 |
| D-4 | `package.json` 版本号 0.1.0 与建议的 `0.1.0-rc.1` 未一致（RC 化需改版本 + tag，待用户确认） | 信息 | 待确认后一起做 |

## 6. #18 / #20 管理

### #18 重启持久化（转日常观察）

- 机器佐证已闭环：五字段全 `.volatile()` 走 configEditor 持久通道（计划 §16 源码核实）+ 设置层命名空间落盘 JSON（报告 §7 原文）。
- **下次正常重启 DSH 后检查四项**：① 设置 → 云岫着色配置仍在（preset/bubbleColor/textColor）；② 气泡颜色与重启前一致；③ 插件行在 Plugins 列表且 enabled；④ 发新消息气泡正常着色。
- 四项全过 → 将验收表 #18 更新为 `✅` 并在日志记 E9。

### #20 卸载无残留（暂不执行；脚本安全性已审计）

§5 自检脚本按六项要求复核：

| 要求 | 结论 |
|---|---|
| 路径准确 | ✅ 无任何文件路径依赖，纯 DOM 查询 |
| 只读 | ✅ 读 API 全集 = `querySelectorAll / getComputedStyle / getPropertyValue`（6 处），**0 处**写 API（remove/setAttribute/innerHTML/insertRule/style[]/textContent 赋值 0 命中；唯一 grep 命中为 CSS 选择器字符串误报） |
| 不误删/不影响其它插件 | ✅ 选择器全部带 `data-plugin="cealum-tint"` 或 `--cealum-tint-*` 专属前缀，零越界 |
| 不修改 Profile | ✅ 不触碰任何宿主/Profile 文件 |
| 样式残留检查 | ✅ `styleTags` + `vars` 双断言覆盖 |
| 监听器/资源清理 | ⚠️ 控制台无法枚举 listener——由 DSH 官方生命周期保证：卸载 → client 模块销毁 → 兼容 MutationObserver 随模块 GC，样式表由官方 materialize 清除（system.ts:444/468）。**脚本无法也不应承担此项**；机器替代证据为卸载后 `styleTags:[]` + 变量清空 |

**未来真实卸载验证操作步骤**（届时执行）：① 卸载前跑一次脚本留基线；② 设置 → 插件 → 卸载（官方通道）；③ 新窗口重跑脚本：断言 `styleTags: []` 且 `vars` 两值为 `''`；④ 观察一条用户消息气泡回原生色；⑤ 若继续使用则重装（profile 走官方通道）；⑥ 全过 → 表 #20 更新 `✅`，记日志。

## 7. 长期维护方案

### 日常维护速查

| 改什么 | 改哪里 |
|---|---|
| 预设颜色/顺序/文案 | `src/shared/presets.ts`（色值与 id）+ `src/client/locales.ts`（各语言标签） |
| 默认配置 | `src/shared/protocol.ts`（`DEFAULT_*`）+ `src/shared/config-schema.ts`（schema `.default()`，两处保持一致） |
| 设置页布局 | `src/client/settings-page.tsx`；文案 → `locales.ts`；预览 → `preview.tsx` |
| 气泡样式 | `src/shared/protocol.ts` 的 `BUBBLE_CSS`（唯一气泡规则）+ `style-tag.ts`（挂载/socket） |
| 旧 id 迁移 | `PRESET_ID_ALIASES`（`presets.ts`）——再改名时在此加映射 + 补用例 |
| 跑测试 | `npm test`；全量验证 | `npm run verify`（build+tsc+58 测试） |
| 重新构建 | `npm run build` → `index.js`/`client.js`；进 GUI 看 `unlag_refresh` 效果 |

### DSH 升级七步清单（升级后执行，勿为演练而升级）

1. **加载情况**：插件列表行存在且 `enabled:true`；无 Profile 报错（`~/.dsh` 日志）。
2. **`npm run verify`**：build + tsc + 58 用例全绿（TS 类型对宿主 d.ts 的兼容性即在此暴露）。
3. **消息 DOM 结构**：开任意会话跑 §5 脚本——`bubbles > 0` 且 `firstBubble` 有值；若 `compat` 行显示 missing（设置页明示），说明宿主改了 `data-message-bubble` 选择器 → 停在下一步前。
4. **CSS 生效**：脚本 `firstBubble.bg` == 配置色；`nativeFallback` 仍为 `--dsw-specific-bubble` 现值（若宿主改 token 名，`grep` 新版 design-platform.css 校准回落链）。
5. **配置持久化**：改一个颜色 → 重启 → 是否保留（即 #18 的常规化）。
6. **生命周期**：设置页开关关/开一次 + 插件面板禁用/启用一次（即 #19 回路），颜色随之收放。
7. **回滚方法**：升级前 `git tag` 留档；若不兼容，`git checkout <tag>` 回退 + `npm run verify` + 重装（live link 下重启即回旧产物）；插件侧永不手工改 Profile 文件，一切经 plugin_manager。

## 8. 版本发布建议

| 问题 | 结论 | 依据 |
|---|---|---|
| 1. 适合日常稳定使用？ | **✅ 是** | 21 项机器/目检双通过，#19 回环实测，E7 迁移已在真实环境完成，双周实测无回归 |
| 2. 适合标记 RC？ | **✅ 是 → `0.1.0-rc.1`（tag `v0.1.0-rc.1`，待你确认后创建）** | 功能全集冻结、验收收官、仅剩两项用户侧观察 |
| 3. 具备公开 GitHub 条件？ | **⚠️ 有条件** | 代码/测试/脚本无密钥零硬编码 ✅；远程仓库已建（私有）、`repository` 字段已补（11-27）；仍需 §3.2 docs 路径脱敏决策 |
| 4. 适合发布 npm？ | **⚠️ 暂缓** | 先做：`npm audit fix --force` 工具链升级并全量回归（§3.3）、R-1/R-3（repository + prepublishOnly）、核对 schemastery license、npm 重名检查。`files` 白名单已就绪 |
| 5. 1.0.0 前还缺什么 | 见下清单 | — |

**1.0.0 发布前任务清单**：① #18 日常观察收口（下次重启后确认）；② 工具链依漏洞升级（vitest 5 / esbuild 0.28）+ 回归；③ `CHANGELOG.md`；④ ~~`repository/homepage/bugs` 字段~~（✅ 11-27 已补）；⑤ `prepublishOnly` 守卫；⑥ （可选）真实卸载演练记录收口 #20；⑦ （可选）CI。

> 注：#18/#20 两项暂缓不影响完成度判断——它们分别属"已由持久化证据兜底的观察项"与"需破坏性操作才能验证的项"，均已在中国用户明示同意的处置路径上；验收表如实标注，未冒充 PASS。

---

## 审计范围声明

- 只读执行：未修改任何源码/测试/既有文档；唯一新增文件即本文件。
- 未创建 Git Tag、未配置/推送远程、未发布 npm、未卸载/禁用插件、未修改 Profile、未升级 DSH。
- 全部结论基于 commit `7abd362` 的真实文件与本机实测输出（npm audit、git、vitest 58/58 @ 2026-11-26 21:49）。

---

## 附录 · 2026-11-27 复核更新（命名统一 + GitHub 信息核验轮）

- **远端仓库实测**（`gh api repos/mycherish/dsh-plugin-cealum-tint`）：已创建 2026-11-26 14:34 UTC，**visibility: PRIVATE**；`/branches` 计数 **0**、`size: 0` → **空仓库，无任何提交**。
- **本地 remote 实测**：`git remote -v` 为空；`git ls-remote origin main` 报 `'origin' does not appear to be a git repository` → 用户报告的 `git remote add origin … && git push -u origin main` 在本工作目录**未生效**（无 remote、未推送）。遵任务边界未擅自添加/修改 remote、未推送。
- **远程推送**：用户已于 2026-11-27 授权并执行 `git remote add origin https://github.com/mycherish/dsh-plugin-cealum-tint.git && git push -u origin main`（过程见实施日志 E9）。
- **package.json**：补 `repository` / `homepage` / `bugs`（R-1、§8-④ 落实）；`node -e JSON.parse` + prettier 校验通过。
- **README 双语**：补源码仓库地址、克隆/构建步骤、项目文档索引、贡献指引、命名沿革（弃用名清单 + `chatgpt-green` 迁移别名说明）。
- **开发计划**：新增 §17 命名规范定稿表（含命名空间 `cealum-tint` vs `cealumTint` 差异备注）；**实施日志**：新增 E9。
- **命名复核事实**：`Caelum` 错拼 0 处；历史候选名 0 处；`cealumTint` 驼峰 0 处——实际命名空间为 `cealum-tint`（kebab），如实记录、未改码。
- **工作区当前未提交项**：`docs/RELEASE-READINESS.md`（未跟踪）+ 本轮全部文档/元数据修订（未暂存）。2026-11-27 用户确认：命名空间维持 `cealum-tint`，并授权 commit + remote add + push——全部改动随实施日志 E9 提交并推送至 `origin/main`。
