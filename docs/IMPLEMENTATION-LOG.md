# Cealum Tint 实施日志

> 记录开发阶段、执行命令、构建结果、测试结果、遇到的问题及解决方案。
> 唯一实施依据：`docs/DEVELOPMENT-PLAN.md`。

---

## E0 · 2026-11-26 16:10 · 项目起步

**环境核对**

| 项 | 值 |
|---|---|
| DSH | `@deepseek-ai/dsh` 0.2.2-rc.5 |
| Profile | `desktop` |
| Profile 目录 | `/Users/xuweidong/.dsh/profiles/desktop` |
| 项目目录 | `/Users/xuweidong/www/dsh/dsh-plugin-cealum-tint` |
| 目录现状 | 仅 `.memsearch/`（非项目文件），无用户文件，可安全新建 |

**动作**
- 检查目录现状：`ls -la` → 无既有项目文件，不涉及覆盖。
- 写入 `docs/DEVELOPMENT-PLAN.md`：完整归档 15 章 + 附录 A/B + 23 项验收 + 新增 §16 技术审核修正记录。

**审核核查（写文档前完成）**

| 核查项 | 命令/位置 | 结论 |
|---|---|---|
| Schemastery 版本 | `@deepseek-ai/schemastery/package.json` | 3.19.0 |
| `z.union` / `pattern` / `volatile` 真实存在 | `schemastery/src/index.ts:951,189,480` | ✅ 存在 |
| `.volatile()` 语义 | `dsh-settings/src/schema.ts:33-46` | "editable without remounting"（免重载编辑） |
| volatile 写入通道 | `dsh-settings/src/index.ts:391` | `configEditor.edit(entry, …)` → 与普通字段同一条持久化通道 ✅ |
| `describe()` 只列有 volatile 字段的 entry | `dsh-settings/src/index.ts:308-309` | 确认：至少一个 volatile 字段才能被客户端读到 |
| `configForms.get(entryId)` | `config-form.ts:284` | 参数是 Host 插件 entry id |
| `ConfigForm` 完整面 | `config-form-types.ts` | `getSnapshot/subscribe/mutate/set/unset` |
| `settings.section` 契约 | `ui-settings/.../contract/slots.ts:57,134` | `{close:()=>void}` |
| `settings.section.icon` 契约 | 同上 `:65,139` | `{size,active}`；注册 id 必须等于 section id |
| `UserMessageBubble` 实现 | `index-Ciz7DZxv.js` @~663977 | `({className,...t}) => <div {...t}/>`，children 可直接传 ✅ |
| 宿主气泡规则有无 `!important` | `index-CSAdOBx6.css` | 无 ✅ |

**修正落地**：见 `docs/DEVELOPMENT-PLAN.md` §16（R3 表述、兼容性检测时机、Config Schema 枚举、预览参数、volatile 核实、目录树去重）。

---

## E1 · 2026-11-26 17:06 · 阶段 0：源码全量实现 + 本地验证闭环

**产出物**（阶段 0 全部源码 + 资源）

- `src/shared/`：`hex.ts`、`contrast.ts`、`presets.ts`（5 预设 + `custom`）、`protocol.ts`（变量名 / 字段名 / 气泡 CSS 唯一规则）、`config-schema.ts`（5 字段全部 `.default().volatile()`）。
- `src/host/index.ts`：`inject = ['settings']`；`apply` 经 `ctx.inject(['settings'])` 调 `child.settings.configure({auto:false}, ctx.fiber)` 建立命名空间。
- `src/client/`：`store.ts`（乐观 store）、`style-tag.ts`（双 stylesheet 安装 + `data-plugin` 标记）、`color-binding.ts`（捕获/恢复 CSS 变量）、`compat.ts`（MutationObserver 气泡检测：ok/missing/pending）、`primitives.ts`（require 原语 + 全降级）、`preview.tsx`、`settings-page.tsx`（取色器 + hex 校验 + 预设 + 文字模式 + 对比度行 + 重置）、`locales.ts`（en/zh 全量文案）、`index.tsx`（locale 注册、样式安装、绑定接线、slot 注册 + 图标）。
- 打包 `scripts/build.mjs`：host ESM（external `@deepseek-ai/*`）+ client CJS（minify、`jsx:automatic`、external `react*` 与原语包）+ ModuleLoader 信封（factory id = 包名 `dsh-plugin-cealum-tint`）。
- 资源：`icon.svg`、`docs/preview.svg`（无文字预览图）、`docs/DETAIL.md`/`DETAIL.zh.md`（单图行）、`locale/en.json`/`zh.json`、`README.md`/`README.zh.md`、`LICENSE`（MIT）。
- 测试 6 文件 56 用例。

**构建 / 验证命令与结果**

| 命令 | 结果 |
|---|---|
| `npm install`（`npm_config_cache=$PWD/.npm-cache`） | ✅ 55 packages |
| `npm run build` | ✅ host `index.js` 2.4 kB / client `client.js` 19.6 kB（13 modules） |
| `npx tsc --noEmit` | ✅ 0 错误 |
| `npx vitest run` | ✅ 6 文件 56/56 通过 |
| `npm run format:check` | ✅（`prettier --write` 修 11 文件后） |

**过程中发现并修复的问题**

1. `scripts/build.mjs` 模板串内注释的反引号提前终止字面量（"Unexpected identifier 'cealum'"）→ 注释内改为普通引号。
2. volatile 契约误判：probe 证实 Schemastery volatile 字段 resolve 为引用对象（值需 `.get()`），测试与断言按此改写。
3. `store.subscribe` 监听器签名错误（误传 view 参数）→ 无参监听器 + 内部读快照（`index.tsx`、`tests/store.test.ts`）。
4. `tests/config-schema.test.ts` 非法枚举输入需 `as unknown as Record<string,string>` 绕过编译期字面量收窄。
5. `noUncheckedIndexedAccess` 下 `matchAll` 捕获组 `m[1] ?? ''`。
6. **store 写入语义缺陷（实质）**：`write()` 在 `finally` 中无条件 `adopt()`，导致成功写入后被宿主旧快照回滚乐观草稿。改为仅拒绝/传输异常时回退到 Host 已知解码；成功保持乐观值，等待 idle echo 再采纳（测试 `re-adopts…`、`never lets a late echo…` 同时覆盖）。
7. 测试替身 `makeForms().refuse` 按值拷贝导致拒绝开关失效 → 改 getter/setter 转发 `state.refuse`（该问题此前被缺陷 6 的无条件 adopt 掩盖）。

**红线自查**：未改任何 DSH 核心文件 / profile 文件；未用 `theme.overrideTokens`；未接管 `conversation.chat.node`；client 未打包 React；仅面向 desktop profile。

**下一步**：进入安装与真机验收（`plugin_manager install_bundle` → `cordis_inspect_query` 核对 Host/Client 装载 → 23 项验收）。

---

## E2 · 2026-11-26 17:12 · 安装 + Host 侧运行时验证

**安装**

- `plugin_manager install_bundle target=/Users/xuweidong/www/dsh/dsh-plugin-cealum-tint` → `stage:"enable", enabled:true, application:"applied"`，pnpm `+ dsh-plugin-cealum-tint 0.1.0 <- ../../../www/dsh/dsh-plugin-cealum-tint`（log：`operation-ui3DMu/pnpm.log`）。

**Host 运行时验证（按证据逐条）**

| # | 验证点 | 方法 | 结果 |
|---|---|---|---|
| 1 | 活动插件注册表出现本插件 | `plugin_manager list_plugins`（实时注册表，243→244 条） | `entryId:"include:cealum-tint", moduleName:"dsh-plugin-cealum-tint", enabled:true, fiberPhase:"active", patchId:"cealum-tint"` ✅ |
| 2 | Profile bundle 挂载 | 只读读取 `~/.dsh/profiles/desktop/package.json` | `dsh.profile.bundles` 末尾追加 `dsh-plugin-cealum-tint`；`dependencies` 为 `link:` 指向项目目录 ✅ |
| 3 | 文件一致性 | sha256 对比 9 个交付文件（index.js/client.js/patch/locale×2/docs×3/icon.svg） | 全部 MATCH（live link，构建即生效） ✅ |
| 4 | **设置命名空间真实投影** | `config_backup`（settings+plugins+self 分区，经 dsh-config-manager 实时导出） | `settings.json → namespaces."cealum-tint"`：`{value: {enabled:true, preset:"chatgpt-green", bubbleColor:"#2C6732", textMode:"auto", textColor:"#FFFFFF"}, base:同值, revision:0, applies:["live"]}` ✅（命名空间 id = patch 行 id，与规划一致；`chatgpt-green` 系取证当时的旧预设 id，E7 已更名为 `deep-green` 并自动迁移旧值） |
| 5 | 插件记录 | 备份 `plugins.json` | `{name:"dsh-plugin-cealum-tint", version:"0.1.0", isBundle:true, enabled:true}` ✅ |
| 6 | client bundle 无 react 打包（R11） | grep 产物 | 仅 `require("react")` / `require("react/jsx-runtime")` / primitives 外部引用；19.6 kB ✅ |
| 7 | 气泡规则上链（R3） | 提取产物内 `BUBBLE_CSS` | `div[data-message-bubble]{background-color:var(--cealum-tint-user-bg, var(--dsw-specific-bubble));color:var(--cealum-tint-user-fg, …)}`，无 `!important` ✅ |

**客户端刷新**：`unlag_refresh`（requestId `cealum-tint-install-1`）→ "刷新 · 插件已换成新代码"，GUI 侧插件模块已换新；`platform:"client"` 的 Slots/Service provider 均实时应答，证明 client runner 已连接。

**已发现的工具链限制（非插件缺陷，不影响验收结论）**

- 本会话的 inspect 桥对 `type:"json"` 参数按字符串透传：`cordis_inspect_query` 携带 `input`（如 `{root:"settings.section"}`、`{entry:"…"}`）一律被 Host 校验器以 `"input" must be an object` 拒绝（读源确证：`dsh-cordis-host-runner/lib/index.js → validateInput → validateJsonSchemaValue`，`isPlainJsonRecord(字符串)=false`）。故：
  - `Config.listConfigs` 精确条目 JSON Schema、`Slots.listSubTree` 精确槽位占有者两路查询不可用；
  - 已用替代证据链闭环（上表 #1/#4/#5 即等价证明：注册表激活 + 设置层命名空间投影 + 插件记录）。
  - 修复该传输 bug 属于 DSH 核心改动 → **红线禁止**，如实记录不越权。

**GUI 资源路由**（了解性）：combo 服务端点 `/plugins/??<pkg>/client.js,…&rev=` 由 boot 图生成，直接 GET 未登录返回 404/401，属预期（不做鉴权绕过）。

**下一步**：23 项验收中机器可判项已全部取证；UI 可视项待用户在已刷新的 GUI 里逐条核对（设置页出现"云岫着色"分区 + 气泡绿色为首要门禁 T1.2）。

---

## E3 · 2026-11-26 17:30 · 产物冒烟 + 交付报告

- **产物级冒烟测试（VM 执行 client.js）**：信封注册 id = 包名 ✅；`apply` 五个 effect 零异常（locale 35/35 键、双 stylesheet 带 `data-plugin` 标记、颜色绑定首画写入 `<html>` 两个变量、接线、兼容监听）✅；`slots.inject` 触发 `settings.section`（id=cealum-tint，order 70）与 `settings.section.icon`（id = section id）✅。首画变量以 ocean-blue 快照验证（`#245B82` + 自动白字）。
- Loader 契约复核：`dsh-client-modules/lib/client.js` — chunk 必须 `__ModuleLoader__.load` 注册图行 id（= 包名），与本产物一致；与已稳定运行的 dsh-config-manager 同型。
- **交付报告**：`docs/DELIVERY-REPORT.md`（10 节齐备：文件/树/构建/测试/23 项表/profile/启用状态/证据/未完成/维护）。
- 23 项现状：**10 项机器/静态证据在案**（#4–#10 静态、#15/#17 机器+复核、#21 部分）、**10 项 👁 待目检**（#1–#3、#11–#14、#16、#22–#23）、**3 项 ⏸**（#18 重启、#19/#20 破坏性——建议最后执行）。T1.2 门禁交由用户在已刷新 GUI 中确认。

---

## E4 · 2026-11-26 17:18 · 目标回合 2：回归验证 + 目检辅助脚本

> 时间戳说明：本回合系统时钟实测 17:18 CST，早于 E3 头部的 17:30（前回合录入误差）；条目先后以文档顺序为准。

**回归验证（本回合实测）**

- `npm run verify` 全绿：6 文件 **56/56** 用例通过（376ms），build + typecheck 无告警。
- 产物 sha256 与 E2 安装记录**逐位一致**（index.js `42dd306bffad…ecf64`、client.js `8899a2ba2fce…7250`）——live link 下 GUI 所载代码即当前源码，无漂移。

**回合 2 内已复核**（证据同 E2 方法）：注册表行 `include:cealum-tint enabled=true fiberPhase=active`；详情页契约合规（DETAIL(.zh).md 恰一行图片、locale meta 三键齐全、`files` 含 docs、preview.svg 1916 B）；README 与版本戳全部一致 0.1.0。

**inspect 桥限制确认**：回合 2 内按"每回合一次廉价重试"约定重发带 `input` 的 `cordis_inspect_query`，仍被 `"input" must be an object` 拒绝——限制确认为本会话持久，**不再重试**；等价证据链（注册表激活 + 设置层命名空间投影）保持闭环。

**新增目检辅助（交付报告 §5「目检辅助：控制台 DOM 自检脚本（只读）」）**：DevTools 粘贴即出的 DOM 级机验脚本，覆盖 #1/#3（`bubbles` 计数与 `firstBubble.bg` 稳定性）、#15（换预设后 `vars`/`firstBubble.bg` 立变）、#17（关闭后 `vars` 全空、bg 回落 `nativeFallback`）、#20（卸载后 `styleTags` 空）；§9 未完成事项已交叉引用。

**仍待办**：① 用户 👁 目检 16 项，门禁 T1.2 = 设置页「云岫着色」分区 + 气泡 `#2C6732`；② 目检通过后才执行 ⏸ #18 重启 / #19 禁用 / #20 卸载（破坏性，最后做）。

---

## E5 · 2026-11-26 · 目标回合 3：inspect 无参通道突破 + 回落链运行时查证

**inspect 通道突破（合法绕过：不是修桥，是不走上桥的坏车道）**

- 复查 provider 清单发现 `Slots.listSubTree` 的 `root` 参数**可选**、`Theme.listTokens` 为空 schema——完全不传 `input` 即不经过字符串透传的坏通道。
- `client/Slots.listSubTree`（无入参）✅ 成功返回完整实时槽位拓扑：
  - `conversation.chat.node` keyDomain "already taken" 全集 = 宿主 19 键（assistant-step/command/…/user/…/steering/…），**无任何 cealum 键** → 红线「不接管 user-key」的活体机器证据；
  - `settings.section`（"One settings page per list entry"）/`settings.section.icon` 存在，用途文本与注入目标一致。
- `client/Theme.listTokens`（无入参）✅ 成功：14 个公开 token 全为 `requiresLightAndDark:true` 的 override 面，**不含** `--dsw-specific-bubble` → 触发风险复查（见下）。
- 带 `input` 的调用仍被拒（occupants 级查询依旧不可达），限制表述已按"无参可用/带参不可用"修正。

**回落链风险复查（由 Theme 清单触发，结论：无险）**

- ASAR 源码 grep `--dsw-specific-bubble`（ELECTRON_RUN_AS_NODE 遍历）：
  - `@deepseek-ai/dsh-client-ui-theme/src/styles/design-platform.css:309`（亮：`--dsw-specific-bubble: var(--dsw-static-deepseek-50)`）与 `:461`（暗：`var(--dsw-static-neutral-bluish-850)`）→ 变量实时存在且亮暗齐备，即"原生灰"本体；
  - `@deepseek-ai/dsh-client-ui-goal` 的 `GoalCommandInputView.module.css` 气泡同样 `background: var(--dsw-specific-bubble)` → 宿主自身也用它作对话气泡底色。
- Theme 清单不列它，因该清单语义是"**可被插件 override 的 token 亮暗要求**"，bubble 不在公开覆盖面——与我们无关（我们本就不用 `theme.overrideTokens`，红线未碰）。
- 产物复核：`div[data-message-bubble]{background-color:var(--cealum-tint-user-bg, var(--dsw-specific-bubble));color:var(--cealum-tint-user-fg, var(--dsw-alias-label-primary))}`——背景 fallback 有效（源码确证）、文字 fallback 在公开清单内。**无代码改动，不触发重建**。

**落盘**：交付报告 §5 #17/#22 证据补强、§8 证据索引新增 #9/#10、工具链限制段改写；验收 #17（回落"原灰"）与 #22（主题切换）的依据由静态推断升级为运行时源码级确认。

---

## E6 · 2026-11-26 17:20 · 目标回合 4：无参通道穷尽 + 例行完整性核查

- `host/Config.listConfigs` 目录模式（无入参）✅ 可达：`total 246`、首页 25 条均为主链插件（status ∈ tree/inactive/schema/absent）；**本插件条目（`include:cealum-tint`）注册在末页，翻页参数 `offset/limit` 也是 `input` → 不可达**。
- 回合 3 `listSubTree` 截断输出的 spill 全文 88 KB 复查：纯拓扑（无 occupants 键），grep 无 `cealum` 字样——占有者级证据确无无参路径，侦查到此封顶。
- 例行核查：`npm run verify` **56/56**；产物 sha256 无漂移（`42dd306bffad` / `8899a2ba2fce`）。
- 结论：机器侧证据链**齐备且稳定**；剩余全部为用户侧动作（👁 16 项目检 → ⏸ #18/#19/#20 末位执行）。后继回合降级为低频完整性核查 + 状态待命。

---

## E7 · 2026-11-26 21:49 · 目检反馈 #1：去 ChatGPT 化 + 预设 id 迁移

**用户目检反馈（21:47）**：① 设置 → 云岫着色分区存在（T1.2 前半 ✅）；② 换颜色生效（#15 ✅）。要求：**全部去掉 ChatGPT 字样**。

**实施（预设更名 `chatgpt-green` → `deep-green`，标签 "Deep Green/深绿"）**

- `src/shared/presets.ts`：预设 id/label 更名；新增 `PRESET_ID_ALIASES { 'chatgpt-green': 'deep-green' }` + `normalizePresetId()`——旧 id 作为**迁移数据键**保留（不是对外文案），否则旧存值无法识别。
- `src/shared/protocol.ts`：`DEFAULT_PRESET = 'deep-green'`。
- `src/client/store.ts`：`decodeSettings` 归一化——旧 id 经别名映射；未知 id 回落为按 bubbleColor 反推（防御性解码收敛）。顺手删除与 PRESETS 重复的硬编码 `PRESET_HEX`，改为派生（单一事实源）。
- `src/client/locales.ts`：en/zh 键 + 值 + reset.hint 同步（键数仍 35/35 对齐）。
- 测试：更新 8 处 id 引用；**新增 2 用例**（别名映射、未知 id 回落）→ **58/58**（原 56）。
- 文档：README（en/zh）、preview.svg 注释、DEVELOPMENT-PLAN（sed 术语）、DELIVERY-REPORT（门禁描述 + 计数）；E2 备份 JSON 与 E2 表格保留历史原值、加"E7 已更名"注（证据不改写）。
- 重建：index.js `0982e0ae5531…` / client.js `9298636f13a3…`（2.5 kB / 20.1 kB）；format 干净；产物内 `deep-green` 就位。项目内残余 "chatgpt" 仅：两产物与 src 中的**别名键**（迁移数据，非文案）+ 文档中的历史取证引文（已加注）。
- `unlag_refresh`（requestId `cealum-tint-e7-rename`）→ "插件已换成新代码"，GUI 已载新文案。

**兼容性说明**：已存配置的 `preset:"chatgpt-green"` 在下一次解码时自动映射为 `deep-green`（迁移无感）；`bubbleColor` 字段不受影响，画面颜色不变。

---

## E8 · 2026-11-26 · 目检收官 + #19 禁用回环 + Git 初始化

**用户目检结论（回复原文："都正常"）**：#1–#3、#11–#14、#16、#22–#23 全部通过；连同此前确认的 T1.2（分区存在）、#15（换色生效）、#17（关开关还原），**目检侧闭环**。

**#19 禁用→还原回环（机器执行）**

| 步骤 | 操作 | 回执 |
|---|---|---|
| 1 | `set_plugin include:cealum-tint enabled=false` | `changed:true, application:"applied"`（官方 materialize 清理生效，气泡瞬时回落原生） |
| 2 | `set_plugin include:cealum-tint enabled=true` | `changed:true, application:"applied"` |
| 3 | `list_plugins` 回读 | `include:cealum-tint enabled:true fiberPhase:active patchId:cealum-tint`（total 244）✅ |
| 4 | `unlag_refresh`（`cealum-tint-e8-re-enable`） | "插件已换成新代码" ✅ |

**#18/#20 处置（用户明示同意）**：转日常观察——重启时核对设置仍在（落盘证据已在案 §7）；卸载验证不在本次执行（未来卸载时用 §5 脚本核对 `styleTags:[]` 与变量清空）。

**文档定稿**：交付报告——8 行 👁 表格转 ✅目检、#15/#17 转 ✅机器+目检、#19 转 ✅机器（回执）、#18/#20 转 ⏸观察、门禁句与 §9 改为收官态；图例注明用户确认时间。

**Git 初始化**：见仓库首次提交（E8 同日完成，提交内容含全部源码/测试/构建脚本/文档；构建产物 `index.js`/`client.js` 与缓存目录按 `.gitignore` 排除）。

## E9 · 2026-11-26 · 命名统一收口 + GitHub 信息核验

**背景**：用户在 GitHub 创建仓库并自行执行 `git remote add origin … && git push -u origin main`；本轮任务＝核验真实远端状态（不凭命令回执认定成功）、按最终命名表收口全部文档、补 package.json 仓库元数据。

| 步骤 | 操作 | 回执 |
|---|---|---|
| 1 | `gh api repos/mycherish/dsh-plugin-cealum-tint` | 仓库已创建 2026-11-26 14:34 UTC，**visibility: PRIVATE**；`/branches` = **0**、`size: 0` → **空仓库，无任何提交，推送未发生** |
| 2 | `git remote -v` / `git ls-remote origin main` | 均失败：remote 列表为空，报 `'origin' does not appear to be a git repository` → 用户命令在本工作目录**未生效**；遵边界未擅自加 remote、未推送，仅报告 |
| 3 | 命名扫描（全仓 grep） | `Caelum`（错拼）0 处；历史候选名 0 处；`cealumTint`（驼峰命名空间）0 处——实际命名空间为 patch 行 id `cealum-tint`（kebab），与命名表该行不一致，如实标注不改码（改驼峰会令已存配置失联） |
| 4 | 迁移别名复核 | `chatgpt-green` → `deep-green` 别名确认保留（历史兼容代码）；README 命名沿革加注说明 |
| 5 | package.json 元数据 | 补 `repository` / `homepage` / `bugs` 三字段；`node -e "JSON.parse"` 与 prettier 校验通过 |
| 6 | 文档完善 | README 双语（仓库地址/克隆构建/文档索引/贡献/命名沿革）；开发计划新增 §17 命名规范定稿；交付报告头部补仓库信息；就绪度审计三处陈旧状态修正 + 附录复核更新；本日志 E9 |

**测试回归**：未触碰 `src/`、`tests/`，58/58 基线维持（最近实测 2026-11-26 21:49）。

**停止点（已解除）**：报告与 `git diff` 呈现后，用户于 2026-11-26 确认三项——① 命名空间**维持 `cealum-tint`**（`cealumTint` 驼峰方案否决，不改代码，§17 已记录确认）；② 授权 commit 本轮 7 文件修订；③ 授权 `git remote add origin … && git push -u origin main`。本提交即上述授权的执行；推送回执以远端 `origin/main` 与聊天报告为准。

## E10 · 2026-11-26 22:52 · RC 0.1.0-rc.1 发布执行

**发布前审计**（同日实测）：package.json 0.1.0 / lock 双位同步；分支 `main`；HEAD `bb83467` = `origin/main`（远端 API 复核）；工作区 clean（除审计发现的日期修正）；注册表 `include:cealum-tint enabled:true fiberPhase:active patchId:cealum-tint`（total 245，list_plugins 实测）；`build` 产物 2.5kB/19.6kB(13 modules)；`npm test` 与 `npm run verify` **58/58 ×2 通过**。文档检查修正 12 处日期误记（2026-11-27 → 2026-11-26，提交 `f0d0d8a` 已推送）。

| 步骤 | 操作 | 回执 |
|---|---|---|
| 1 | 用户三确认：日期修正提交 / RC 版本化（方案 A）/ Pre-release | ask 回执在案 |
| 2 | `git commit` 日期修正 `f0d0d8a` + push | `bb83467..f0d0d8a main -> main` ✅ |
| 3 | `npm version 0.1.0-rc.1 --tag-version-prefix v -m "release: v%s — Cealum Tint RC（命名定稿 E9 后标注）"` | pkg/lock-root/lock-pkgs 三处 `0.1.0-rc.1`；提交 `7a3edeb`；**annotated tag** `v0.1.0-rc.1`（`git cat-file -t` = tag）✅ |
| 4 | 推送 `main` 与 `v0.1.0-rc.1` | `* [new tag] v0.1.0-rc.1 -> v0.1.0-rc.1` ✅（main 同链推送） |
| 5 | `gh release create v0.1.0-rc.1 --prerelease --target main`（Pre-release，无附件） | `https://github.com/mycherish/dsh-plugin-cealum-tint/releases/tag/v0.1.0-rc.1` ✅ |

**Profile 说明**：live link 指向本目录，版本显示随 DSH 下次加载/materialize 生效为 `0.1.0-rc.1`（未手工改 Profile，遵边界）；#18 重启观察项不受影响。
