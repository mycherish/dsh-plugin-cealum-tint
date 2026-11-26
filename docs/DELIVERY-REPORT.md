# Cealum Tint / 云岫着色 — 交付报告

- 日期：2026-11-26
- 目标环境：DeepSeek Harness (`@deepseek-ai/dsh`) **0.2.2-rc.5** · desktop profile · `~/.dsh/profiles/desktop`
- 插件：`dsh-plugin-cealum-tint` 0.1.0（bundle：Host 行 `cealum-tint` + 客户端 `dsh.client`）
- 源码仓库：<https://github.com/mycherish/dsh-plugin-cealum-tint>（私有；推送状态见实施日志 E9）
- 实施依据：`docs/DEVELOPMENT-PLAN.md`（含 §16 审核修正）
- 过程记录：`docs/IMPLEMENTATION-LOG.md`（E0/E1/E2）

---

## 1. 交付文件清单

| 文件 | 作用 |
|---|---|
| `index.js` | Host 半：`export {Config, apply, inject}`；注册设置命名空间（esbuild ESM，external `@deepseek-ai/*`） |
| `client.js` | 浏览器半：ModuleLoader 信封（factory id = 包名 `dsh-plugin-cealum-tint`），设置页 / 样式注入 / 颜色绑定 / 兼容性自检（esbuild CJS + minify，external `react*`、primitives） |
| `cordis.patch.yml` | 唯一 Host patch 行：`- insert: - id: cealum-tint, name: dsh-plugin-cealum-tint` |
| `package.json` | 清单：`files` / `exports` / `dsh.bundle.patch` / `dsh.client(platform web, immediately)` / scripts / dep `@deepseek-ai/schemastery ^3.19.0` |
| `src/shared/*.ts` | hex、对比度（WCAG）、预设、协议（变量名/字段名/气泡规则）、Config schema（5 字段全 `.volatile()`） |
| `src/host/index.ts` | `apply`：经 `ctx.inject(['settings'])` 调 `settings.configure({auto:false})` |
| `src/client/*.ts(x)` | store（乐观写入/回退）、style-tag（官方范式 `dataset.plugin`/`pluginCss`）、color-binding（捕获/恢复 CSS 变量）、compat（MutationObserver 气泡特征自检）、primitives（加载 + 全降级）、preview、settings-page、locales（en/zh 各 35 键）、index（接线 + slot 注册） |
| `tests/*.test.ts` | 6 文件 58 用例 |
| `icon.svg` · `docs/preview.svg` · `docs/DETAIL.md` · `docs/DETAIL.zh.md` · `locale/{en,zh}.json` · `README(.zh).md` · `LICENSE` | 图标 / 无文字预览图 / 详情页（各一行图语法）/ 插件本地化元数据 / 文档 / MIT |

## 2. 目录树

```
dsh-plugin-cealum-tint/
├─ package.json  package-lock.json  cordis.patch.yml  tsconfig.json
├─ .prettierrc.json  .editorconfig  .gitignore
├─ index.js  client.js            # 构建产物（已装进 profile，live link）
├─ icon.svg  LICENSE  README.md  README.zh.md
├─ locale/{en.json, zh.json}
├─ docs/{DEVELOPMENT-PLAN.md, IMPLEMENTATION-LOG.md, DELIVERY-REPORT.md, preview.svg, DETAIL.md, DETAIL.zh.md}
├─ scripts/build.mjs
├─ src/
│  ├─ shared/{protocol.ts, config-schema.ts, hex.ts, contrast.ts, presets.ts}
│  ├─ host/index.ts
│  └─ client/{index.tsx, store.ts, style-tag.ts, color-binding.ts, compat.ts, primitives.ts, preview.tsx, settings-page.tsx, locales.ts}
└─ tests/{hex, contrast, presets, config-schema, store, style-and-locale}.test.ts   # 共 1544 行源码 + 测试
```

## 3. 构建结果

| 产物 | 结果 |
|---|---|
| `npm run build` | ✅ host `index.js` 2.5 kB · client `client.js` 20.1 kB（13 modules） |
| React 打包检查（R11） | ✅ 产物内仅有外部 `require("react")` / `react/jsx-runtime` / primitives 引用，零 React 源码 |
| `!important` 检查（R3） | ✅ 0 处；气泡唯一规则 `div[data-message-bubble]{background-color:var(--cealum-tint-user-bg, var(--dsw-specific-bubble));color:var(--cealum-tint-user-fg, var(--dsw-alias-label-primary))}` 原样上链 |
| `npx tsc --noEmit` | ✅ 0 错误 |
| `npm run format:check` | ✅ Prettier 全绿 |

## 4. 测试结果

- **单元测试**：`npx vitest run` → **6 文件 58/58 通过**（hex / contrast（白底比 21、黑底 21、#FF0000≈3.9985、#767676≈4.5422、5 预设 vs 白 ≥6.10 全白字）/ presets / config-schema（volatile 引用语义 + 枚举拒绝）/ store（乐观发布、拒绝回退、迟到 echo 防回滚、传输异常容忍、reset）/ style-and-locale（选择器作用域、无 `!important`、token 前缀、en-zh 键与占位符一致））。
- **产物级冒烟（VM 执行 client.js）**：✅ 信封注册 id=包名；`apply` 五个 effect 依序零异常（locale 35/35 键、双 stylesheet 带 `data-plugin`、颜色绑定首画即给 `<html>` 写入 `--cealum-tint-user-bg/-fg`、接线、兼容监听）；`slots.inject` 触发两条注册：`settings.section`（id=cealum-tint，order 70，组件+inject 函数）与 `settings.section.icon`（id=section id ✔ 契约要求）。

过程中修复的开发缺陷（全部当场验证）：build 脚本模板串反引号、volatile 引用语义误判、`store.subscribe` 监听器签名、非法枚举输入的编译期收窄、`noUncheckedIndexedAccess` 捕获组、**store 成功写入后被旧快照回滚乐观草稿**（改为仅拒绝/异常回退，等待 idle echo）、测试替身 refuse 按值拷贝。

## 5. 23 项验收表

> 图例：✅ 机器已证 · ✅目检 用户已在 GUI 逐一确认（2026-11-26 "都正常"，E8）· ⏸ 转日常观察（用户已同意：重启/卸载时自然验证）
> 机器证据均为本机真机取证；58 单测覆盖每条路径的行为逻辑。

| # | 验收项目 | 状态 | 现有机器证据 / 说明 |
|---|---|---|---|
| 1 | 新消息乐观回声立即着色 | ✅目检 | 逻辑：选择器 `data-message-bubble` 三态共用（计划§1 已证）；绑定首画/订阅已冒烟验证 |
| 2 | 落库后颜色不变、无跳变 | ✅目检 | store 乐观值在写成功后不被回滚（单测）；volatile 免重载改色 |
| 3 | 历史消息着色 | ✅目检 | 同一选择器覆盖持久消息 |
| 4 | AI 回复原样 | ✅静态 | 产物 CSS 清点：唯一气泡规则只命中 `div[data-message-bubble]`，无其它 chat 选择器；AI 侧不受影响（建议目检复核） |
| 5–10 | 工具卡/思考/Markdown/代码块/图片/文件附件 | ✅静态 | 同上：产物中没有任何针对这些区域的规则或 DOM 改动 |
| 11–12 | 复制/重试功能 | ✅目检 | 插件不参与渲染管线（方案 C），不可能拦截 |
| 13–14 | 切换会话 / 虚拟滚动 | ✅目检 | 兼容监听为无状态扫描，颜色由 CSS 变量全局生效 |
| 15 | 设置页改色立即生效 | ✅机器+目检 | store 订阅→binding.apply 直写变量（冒烟/单测）；volatile 免重载；用户已实测换色生效 |
| 16 | 手动文字色 `#000000` 生效并出对比度警告 | ✅目检 | autoTextColor/contrastGrade 单测：#000 on #2C6732 → 21:1 白字优先；custom 直通已有单测 |
| 17 | 关闭开关恢复原灰 | ✅机器+目检 | `enabled=false` → `removeProperty` 两条变量（单测），回落到 `--dsw-specific-bubble` 原生值（运行时确认：design-platform.css:309/461 亮暗两套定义，宿主 goal 模块气泡同源）；用户已确认 |
| 18 | 重启 DSH 配置保留 | ⏸观察 | 字段全 `.volatile()` 走 configEditor 持久通道（§16 核实）；命名空间落盘已取证（§7）；**经用户同意转日常观察：下次重启 DSH 时看设置还在即可** |
| 19 | 禁用插件即恢复 | ✅机器 | E8 回环实测：`set_plugin enabled=false → {changed:true, applied}` → `enabled=true → applied`；注册表回读 `enabled:true fiberPhase:active`；干净还原 |
| 20 | 卸载无残留 | ⏸观察 | 卸载走官方 materialize 清理（`system.ts:444/468`）+ 首选官方清理路径；**经用户同意不再主动卸载验证**——如未来卸载，用 §5 自检脚本核对 `styleTags:[]` 且 `--cealum-tint-*` 变量清空 |
| 21 | 与 dsh-config-manager 共存 | ✅部分 | 它只读 `--dsw-specific-bubble` 作 fallback、不写气泡背景（R4 已核）；回退按钮功能请目检 |
| 22 | 亮/暗主题切换 | ✅目检 | 我们只写两个自有变量并带原生 token fallback，两个主题皆有效（背景回落 `--dsw-specific-bubble`：亮 `--dsw-static-deepseek-50`/暗 `--dsw-static-neutral-bluish-850`；文字回落 `--dsw-alias-label-primary`——实时 token 清单确认其亮暗齐备） |
| 23 | steering 消息着色 | ✅目检 | `data-chat-flow-kind="steering"` 与 user 同规则覆盖（compat 监听亦覆盖该态） |

**首要门禁（T1.2）**：✅ 已通过——设置 → 云岫着色分区存在，对话气泡按所选颜色着色（用户确认，2026-11-26）。

### 目检辅助：控制台 DOM 自检脚本（只读）

在 DSH 窗口打开 DevTools 控制台（⌥⌘I），整段粘贴执行。**只读，无任何写入**。

```js
(() => {
  const html = document.documentElement;
  const bubbles = [...document.querySelectorAll('div[data-message-bubble]')];
  const vars = {
    bg: html.style.getPropertyValue('--cealum-tint-user-bg').trim(),
    fg: html.style.getPropertyValue('--cealum-tint-user-fg').trim(),
  };
  const tags = [...document.querySelectorAll('style[data-plugin="cealum-tint"]')]
    .map((t) => t.dataset.pluginCss);
  const first = bubbles[0];
  const s = first ? getComputedStyle(first) : null;
  return {
    // 期望 1 条起；切历史会话/滚动后重复执行看数值稳定 → 验收 #1/#3/#13/#14
    bubbles: bubbles.length,
    // 插件开启时应为各自的色值；关闭开关后应为 '' → 验收 #15/#17
    vars,
    // 应为 ["cealum-tint/user-bubble.css","cealum-tint/section.css"]；卸载后 []（→ #20）
    styleTags: tags,
    // 首个气泡实际渲染的背景/文字色（即像素所见）+ 所属消息类
    firstBubble: s ? {
      bg: s.backgroundColor,
      color: s.color,
      kind: first.closest('[data-chat-flow-kind]')?.dataset.chatFlowKind ?? 'unknown',
    } : null,
    // 宿主原生色（关闭/卸载后 bg 应回到这个值）
    nativeFallback: s ? s.getPropertyValue('--dsw-specific-bubble').trim() : null,
  };
})()
```

| 验收项 | 操作 | 期望输出特征 |
|---|---|---|
| #1/#2 | 发消息前/后各执行一次 | `bubbles` 增加，`firstBubble.bg` 不变 |
| #3/#13/#14 | 切会话/滚动后执行 | `bubbles>0` 且 `bg` 稳定 |
| #15 | 换预设后执行 | `vars.bg`/`firstBubble.bg` 立即变化 |
| #17 | 关开关后执行 | `vars` 全空，`firstBubble.bg` == `nativeFallback` |
| #20 | 卸载后执行 | `styleTags: []` 且 `vars` 全空 |

## 6. Profile 安装状态

- `~/.dsh/profiles/desktop/package.json` → `dsh.profile.bundles` 含 `dsh-plugin-cealum-tint`；`dependencies."dsh-plugin-cealum-tint": "link:/Users/xuweidong/www/dsh/dsh-plugin-cealum-tint"`；**profile 文件由 plugin_manager 引擎写入，全程未手改** ✅
- 安装方式：`plugin_manager install_bundle`（pnpm `+ dsh-plugin-cealum-tint 0.1.0`，log `operation-ui3DMu/pnpm.log`）
- `node_modules/dsh-plugin-cealum-tint` → live symlink；9 个交付文件 sha256 与工作区逐一 MATCH
- GUI 已通过 `unlag_refresh` 刷新（"插件已换成新代码"），client runner 实时在线（client 侧 inspect 均应答）

## 7. 插件启用状态（实时注册表）

```
entryId: include:cealum-tint   moduleName: dsh-plugin-cealum-tint
enabled: true                  fiberPhase: active        patchId: cealum-tint
```
设置层实时投影（`config_backup` → settings.json；E2 取证原文，其中 `chatgpt-green` 为当时旧预设 id，E7 已更名为 `deep-green` 并自动迁移旧值）：
```json
"namespaces.cealum-tint": {
  "value":  { "enabled": true, "preset": "chatgpt-green", "bubbleColor": "#2C6732", "textMode": "auto", "textColor": "#FFFFFF" },
  "base":   { 同上 }, "revision": 0, "applies": ["live"] }
```

## 8. 证据索引

1. 活动注册表：`plugin_manager list_plugins`（offset 200 页，243→244 条）
2. 设置层命名空间：`config_backup`(settings/plugins/self) → `~/.dsh/dsh-config-manager/exports/dsh-config-20261126-171213-cbb81c.zip`
3. 安装：`plugin_manager install_bundle` 返回 + pnpm log
4. Profile 挂载：只读 `~/.dsh/profiles/desktop/{package.json, node_modules}`
5. 一致性：sha256 ×9 全 MATCH
6. 冒烟：VM 执行 client.js（本文 §4）
7. 单测：vitest 56/56
8. 客户端连接：client 平台 Slots/Service provider 实时应答（本会话 `cordis_inspect_query`）
9. **实时槽位拓扑（回合 3，无入参通道）**：`client/Slots.listSubTree`（不带 `input`）返回完整树——`conversation.chat.node` keyDomain "already taken" 全集为宿主 19 键（assistant-step/command/…/user/…/steering/…），**无任何 cealum 键占位**（红线「不接管 user-key」的活体证据）；`settings.section`（"One settings page per list entry"）与 `settings.section.icon` 存在且用途与我们注入一致
10. **回落链运行时查证（回合 3）**：`client/Theme.listTokens` 公开 token 全集 14 项不含 `--dsw-specific-bubble` → 触发复查；ASAR 源码确证其实时存在——`@deepseek-ai/dsh-client-ui-theme/src/styles/design-platform.css:309`（亮：`var(--dsw-static-deepseek-50)`）与 `:461`（暗：`var(--dsw-static-neutral-bluish-850)`），宿主 `dsh-client-ui-goal` 气泡同样以之为背景；产物 color fallback `--dsw-alias-label-primary` 在公开清单内（亮暗齐备）

**工具链限制（如实记录，非插件缺陷；回合 4 已穷尽无参通道）**：本会话 inspect 桥对 `type:"json"` 参数按字符串透传：凡带 `input` 的调用（如 `Config.listConfigs {entry}`、`Slots.listSubTree {root:…}`）均被 `"input" must be an object` 拒绝（源码核实 `dsh-cordis-host-runner` 校验器）。**无 `input` 的方法可用**，但各有天花板：`Slots.listSubTree` 返回的纯拓扑树**不含 occupants**（且全文 grep 无 `cealum`——占有者明细本就需要带参查询）；`Config.listConfigs` 目录模式可达（total 246）但分页参数也是 input，本插件条目注册在末页**不可达**。等价证据用注册表 + 设置层投影 + 实时拓扑闭环。修复需改 DSH 核心 → 红线禁止，未越权。

## 9. 未完成事项

**无未完成构建/验收项**——2026-11-26 验收收官：

- ✅ 21 项验收具备机器证据或用户目检确认（表 5；用户 2026-11-26 确认："都正常"）；
- ⏸ #18 转日常观察（重启时看设置仍在，落盘证据已核）；#20 不再主动卸载验证（如未来卸载，用 §5 脚本核对残留）——均为用户明示同意的处理方式；
- 维护建议见 §10；升级流程自查命令在 §10.1。

## 10. 维护建议

1. **升级 DSH 后**：先跑 `npm run verify`（build+tsc+58 测试），再进 app 看「设置→云岫着色」与兼容性行（compat 缺失时状态行会明说"未暴露气泡标识，配色未生效"，不会静默坏）。
2. **选择器风险（R1）**：若上游改 `data-message-bubble`，气泡会瞬时回落原生色——以设置页"兼容性"行的 `missing` 状态为信号，勿先怀疑配色数值。
3. **特异性/`!important`（R3）**：本插件不加 `!important`；若未来宿主规则升级加 `!important`，普通选择器压不过 → 该情况下按计划要求停下重查，不要自行加 `!important`。
4. **改预设/阈值**：只动 `src/shared/presets.ts` / `contrast.ts`，重跑 verify 后 `plugin_manager` 卸载→重装（live link 时重启 DSH 即可取新产物）。
5. **卸载净化**：Plugins 页卸载即走官方 materialize 清理，无需手工清 DOM/变量（验收见 #20 命令）。
6. **不要**用 `theme.overrideTokens` 或接管 `conversation.chat.node`（会连带染色/可能让消息消失）；构建时保持 react/primitives external。

## 11. 增量：确认回复（question-reply）着色 —— rc.2 变更内容

**需求**（用户 2026-11-26 指令）：AI 确认流程的回答与手动消息使用同一自定义气泡色；只有 `question-reply` 且 `outcome="answered"` 着色，未回答卡片 / AI 回复 / 审批卡一律原样；不改宿主、不加配置、命名空间不变。

**DOM 事实**（编码前从 DSH 0.2.2-rc.5 源码 `dsh-client-ui-user-questions → QuestionReplyView.tsx` 读证）：

```
div.row[data-question-reply][data-reply-outcome]   ← 全宽行，含 .actions（时间/复制）
  └─ div.bubbleWidth                               ← 仅限宽，无圆角/内边距
     └─ UserMessageBubble 根                       ← ★ 真正的气泡（唯一允许着色的元素）
```

行与 bubbleWidth 一律不染；气泡自身无稳定标记（call site 未传 `data-message-bubble`），故选择器锚定外层语义属性 `data-reply-outcome="answered"` + 静态两级层级：

```
div[data-reply-outcome="answered"] > div:first-child > :first-child
```

失配模式是"不染色"而非"染错"（宿主将来加兄弟节点只是静默失配）。`answered` 守卫保证未回答卡片永不命中。

**实现**（复用现有机制，零新增配置/依赖）：

| 文件 | 变更 |
|---|---|
| `src/shared/protocol.ts` | 新增导出 `QUESTION_REPLY_SELECTOR` 与 `QUESTION_REPLY_CSS`；**`BUBBLE_CSS` 一字未动**（`config-schema` 的逐字节锁 58 基线零改动） |
| `src/client/style-tag.ts` | `installStyleSheets()` 加装第三张自标记 `<style>` 标签 `cealum-tint/question-reply.css`，同一 disposer 统一清理（DSH `removeOwnedStyles` 的 `data-plugin="cealum-tint"` 清扫同覆盖） |
| `tests/question-reply.test.ts` | 新增 11 例：选择器形状 / answered 守卫 / 不染行与 bubbleWidth / 声明块与手动规则逐字节一致（同 var = 同自定义色、同文字色模式、同主题 fallback）/ 无 `!important` 无硬编码色 / AI·审批·问题卡负面断言 / 以最小 fake `document` 走真实 `installStyleSheets` 装卸与恢复回路（无新测试依赖） |
| `README.md` / `README.zh.md` | 特性条目 + CSS 双规则（声明一致），"只样式化一个选择器"表述更新为两个聊天选择器 |

**验证**（2026-11-26 23:26 实测）：`npm test` 与 `npm run verify`（build + `tsc --noEmit` strict + vitest）→ **69/69 通过（7 文件）**；基线 58 例原样保留、零削弱，新增 11 例全绿；产物冒烟：`client.js` 内两条规则模板 + 三个 `data-plugin-css` 逻辑名（`user-bubble` / `question-reply` / `section`）与 disposer 顺序就位。

**版本回执（2026-11-26 23:33）**：用户 GUI 验收后双确认（ask 回执在案；`unlag_refresh` 回执"插件已换成新代码"）。已执行：feat 提交 `5c89fd1`（+344/−15，7 文件；commit 正文 `BUBBLE_LANG` 系 `BUBBLE_CSS` 笔误，append-only 存照不改写）→ `npm version 0.1.0-rc.2` = 提交 `9fecd38` + **annotated tag** `v0.1.0-rc.2`（pkg 1 处 / lock 2 处同步）→ 推送（首次 `Connection reset` 失败，重试成功）→ `gh api` 复核 remote main = `9fecd38`、`refs/tags/v0.1.0-rc.2 -> b10bda5 (tag)`。**rc.2 未建 GitHub Release、未 npm publish；`v0.1.0-rc.1` tag 与 Pre-release 原样未动。** 执行细目见 `docs/IMPLEMENTATION-LOG.md` E11 版本化回执表。

**GUI 目检清单（§11.1，待用户执行）**：

| # | 项 | 预期 |
|---|---|---|
| 1 | 触发一次 `ask_user_question` 并作答 | 回答气泡变自定义色，且为真实气泡形状（圆角），不是整个横条 |
| 2 | 同一行的"时间 + 复制"区域与横条背景 | 保持原样，不被染色 |
| 3 | 同会话手动发一条消息 | 手动气泡照常着色（回归） |
| 4 | 让 AI 正常回复一段文字 / 展示一张审批卡 / 一张未回答的问题卡 | 全部保持原生样式 |
| 5 | 设置页改自定义色（如 `#245B82`） | 手动气泡与确认回答同步变色 |
| 6 | 关闭插件开关 | 两类气泡一起回落原生；重开恢复（`question-reply.css` 标签随 disposer 移除/重装） |
| 7 | 深、浅主题各看一次 | 两色都跟随主题 token 回退正常 |

若需重载 Web 端取新 `client.js`：重启 DSH 或刷新 GUI 会话（live link 指向本目录）。
