# Cealum Tint 插件开发技术方案

> 云岫着色 · Customize your conversation colors.
> 目标运行环境：DSH Desktop（`@deepseek-ai/dsh` 0.2.2-rc.5，Profile `desktop`）
> 本文件是唯一实施依据。所有关键技术结论均附带本机真实源码路径/行号/运行时查询证据。

**结论先行**：用户消息气泡的背景色由单一 CSS 变量 `--dsw-specific-bubble` 决定，且气泡元素带有全安装内唯一的语义标识 `data-message-bubble`。因此本项目走"纯样式层"路线：Host 半只声明 Config（持久化），Client 半注册一个设置页 + 注入一张自己拥有的 `<style>` 标签。不接管任何组件、不改主题插件、不碰聊天数据。

---

## 1. 项目概述

| 项 | 值 |
|---|---|
| 品牌 | Cealum Tint / 云岫着色 |
| 描述 | Customize your conversation colors. |
| npm 包名 | `dsh-plugin-cealum-tint` |
| Loader entry id / 配置命名空间 | `cealum-tint`（⚠️ 命名空间 = patch 行 id，**不是**包名，见 §10） |
| 本地目录 | `/Users/xuweidong/www/dsh/dsh-plugin-cealum-tint` |
| CSS 命名空间 | `cealum-tint-` |
| 目标 Profile | `desktop`（Desktop 独立客户端，只装这一个） |
| 核心机制 | 1 个 Host 行（Config）+ 1 个 Client 行（owned style + settings.section） |

---

## 2. 当前 DSH 环境审计结果

### 2.1 运行时事实（✅ 已确认）

| 项 | 实际值 | 证据 |
|---|---|---|
| DSH 版本 | **`@deepseek-ai/dsh` 0.2.2-rc.5** | `$DSH_INSTALL_DIR/package.json` → `version` |
| 分发形态 | 打包 Desktop（`app.asar`） | 安装路径含 `/Contents/Resources/app.asar/` |
| Profile | **`desktop`** | `$DSH_PROFILE` |
| Profile 目录 | `/Users/xuweidong/.dsh/profiles/desktop` | `$DSH_PROFILE_DIR` |
| DSH_HOME | `/Users/xuweidong/.dsh` | `$DSH_HOME` |
| 运行中 Web GUI | `http://127.0.0.1:64812` | `$DSH_WEB_URL` |
| Electron 运行时 | `/Applications/DeepSeek Harness.app/Contents/MacOS/DeepSeek Harness` | `$DSH_NODE_EXECUTABLE` |
| 主题 | `ui-theme.config.preference: dark` | `profile/cordis.patch.yml:66-69` |
| Schemastery | `3.19.0` | `@deepseek-ai/schemastery/package.json` |

**profile 已装 bundle（18 个）**（`profile/package.json` → `dsh.profile.bundles`）：
`@deepseek-ai/dsh-base`、`dsh-web-app`、`experimental-voice-input-bundle`、`@zilliz/memsearch-dsh`、`experimental-terminal-bundle`、`experimental-session-search`、**`dsh-config-manager`**、`@michengai/dsh-skills-manager`、`dsh-lsp-actions`、**`dsh-unlag`**、`@dingyi222666/dsh-session-notification`、**`dsh-orbis`(link: neural-orbit)**、`experimental-plugin-market-bundle`、`personalized-recommendations`、`experimental-forge-bundle`、`experimental-cot-translation-bundle`、`cua-bundle`、`@plannotator/dsh`、`@deepseek-ai/dsh-subagent-codex`。

### 2.2 关键结论：profile 干净、无冲突源

- ✅ **没有任何已装插件使用 `data-message-bubble`** ——全量检索 `@deepseek-ai`（1485 个 js/css）+ `profile/node_modules`（3199 个 js/css），命中仅 `dsh-client-ui-chat/lib/client.js` 一处（宿主自己）。
- ✅ **`--dsw-specific-bubble` 的消费方有 4 处**：宿主气泡规则、`dsh-client-ui-goal`（GoalCommandInputView）、`dsh-experimental-session-inspector`、`dsh-config-manager`（作 fallback 基色）。→ **禁止全局覆盖该 token**，必须作用域化（§6）。
- ✅ **`dsh-config-manager` 已在用 `data-chat-flow-kind='user'|'steering'` 做样式**（`config-manager.module.css:5909`），且把自身气泡色写成 `--cm-chat-bubble: var(--dsw-specific-bubble, …)`（`:87`）→ 它**跟随**我们的颜色，不冲突。
- ⚠️ `~/.dsh/skin-center-active.json` 含 `bubbleOpacity:50 / bubbleBlur:10`，看似有皮肤系统改气泡；但 **`bubbleOpacity` 在全 profile `node_modules` 中零命中** → 已卸载插件的遗留状态文件，**当前无消费者，无冲突**（不建议清理，属用户数据）。
- ⚠️ `dsh-unlag`（1.17.3）不触碰气泡样式（`client.js` 中 `bubble` / `data-message-bubble` 均 0 命中）。

### 2.3 现有可参考的真实样例（对本项目价值排序）

| 样例 | 路径 | 可借鉴内容 |
|---|---|---|
| **`dsh-config-manager` 0.3.1** | `profile/node_modules/dsh-config-manager` | ⭐核心参考：`dsh` manifest 完整形态、双半插件、`settings.section` 注册、聊天样式、`<style>` 注入、接管 `conversation.chat.node`（反向教训） |
| `dsh-client-ui-theme` | `@deepseek-ai/dsh-client-ui-theme` | ⭐核心参考：Host `Config`(schemastery) + `.volatile()`、`configForms` 客户端读写、**官方 `<style data-plugin>` 注入范式**、`overrideTokens` |
| `dsh-orbis` | `~/www/dsh/neural-orbit` | 本地 `link:` 开发闭环、esbuild → `__ModuleLoader__` 封装、tsc+vitest+prettier 工程化 |
| 官方模板 | `.../dsh-doc/templates/decoration/` | 最小 bundle 骨架（4 个文件） |

---

## 3. 插件开发机制分析

### 3.1 Bundle 与 Manifest（✅ 已确认，逐字来自源码）

`dsh.bundle.patch` **在 0.2.2-rc.5 存在**。三处独立验证：官方文档 `host-plugin.md:3`、`config-manager/package.json`、`templates/decoration/package.json`。

```jsonc
{
  "name": "dsh-plugin-cealum-tint",
  "type": "module",
  "exports": {
    ".": "./index.js",              // Host 半
    "./client": "./client.js",      // Client 半
    "./locale/*.json": "./locale/*.json",
    "./icon": "./icon.svg"
  },
  "files": ["index.js","client.js","cordis.patch.yml","locale/*.json","docs","icon.svg"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",                                    // 必填
      "immediately": true,                                   // stage-one 预取
      "inject": ["@deepseek-ai/dsh-client-ui-settings",
                 "@deepseek-ai/dsh-client-locale"],          // 依赖的包行先就绪
      "external": ["@deepseek-ai/dsh-client-ui-primitives"]  // 非 inject 的模块请求
    }
  }
}
```

`cordis.patch.yml`（挂在 `dsh-base` 之上的 profile bundle 层）：

```yaml
- insert:
    - id: cealum-tint                 # ← 配置命名空间来源
      name: 'dsh-plugin-cealum-tint'  # ← 包名
```

**两种半的入口形态**（`host-plugin.md:60-65`）：

- Host：`export function apply(ctx, config) {}` + `export const inject = [...]` + `export const Config`（或 default export 服务类，二者不可混用）。
- Client：`window.__ModuleLoader__.load({ id, factory(require){ return { inject, apply } } })`；`factory` 内可 `require('react')`（`react`、`react/jsx-runtime`、`react-dom` 由页面模块表提供，**不可打包进来**）。

### 3.2 浏览器模块表（✅ 已确认，全量清单）

页面启动处 `dsh-web-frontend/dist/assets/index-Ciz7DZxv.js`（偏移 ~1061144）：

```js
{ react, "react/jsx-runtime", "react-dom", "react-dom/client",
  "@deepseek-ai/cordis", zod, "@tanstack/react-virtual",
  "@deepseek-ai/dsh-client-store", "@deepseek-ai/dsh-client-ui-slots",
  "@deepseek-ai/dsh-client-ui-primitives", "@deepseek-ai/dsh-client-ui-dockkit" }
```

`@deepseek-ai/dsh-client-ui-primitives` 的**完整导出表**可在同一文件偏移 ~1005219 处读到，其中对本项目有用的是：

- `UserMessageBubble` / `UserTextRun` —— 真实气泡与文本渲染器（设置页预览可复用气泡）
- `SettingsForm` / `SettingsValueField` / `SettingsSecretField` / `Switch` / `SegmentedControl` / `SegmentedTabs` / `Tag` / `Pill` / `Input` / `Tooltip` / `Toast` / `useClipboardCopy` 等
- `Icon*` 图标族

> ⚠️ `@tanstack/react-virtual` 在表内 → 聊天流确为虚拟滚动（`use-chat-viewport.ts` 51 KB 佐证），历史消息会反复挂载/卸载 → **只能用 CSS，不能做一次性 DOM 改写**。

### 3.3 样式注入：官方支持（✅ 已确认）

`dsh-client-ui-theme/src/client/styles.ts` 的 `installThemeStyles()` 是**官方范式**：

```ts
for (const [name, css] of STYLES) {
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = PLUGIN_ID              // 归属标记
    tag.dataset.pluginCss = `${PLUGIN_ID}/${name}`
    tag.textContent = css
    document.head.appendChild(tag)
    return () => { tag.remove() }               // 卸载即清
  }, `ui-theme: ${name} stylesheet`)
}
```

配套清理机制（`dsh-client-modules/src/client/entry-lifecycle.ts`）：

```ts
export function removeOwnedStyles(id: string): void {
  for (const el of document.querySelectorAll('style[data-plugin]'))
    if (el.getAttribute('data-plugin') === id) el.remove()
}
```

在 `system.ts:319/444/468` 与 `entries.ts:149/197` 被调用（materialize 失败、行移除、代码替换）→ **禁用/卸载/替换插件都会抹掉我们的样式，无残留**。这正是验收表"卸载无残留"的官方保证。

### 3.4 配置机制（✅ 已确认）

| 能力 | 官方接口 | 证据 |
|---|---|---|
| Config 声明 | `export const Config = z.object({...})`（`@deepseek-ai/schemastery`） | `ui-theme/src/index.ts:38` |
| 免重启热更新字段 | `.volatile()` + `config.field.get()` | `ui-theme/src/index.ts:39-45`；`configuration.md:10` |
| 命名空间注册 | `ctx.settings.configure({ auto: false }, ctx.fiber)` | `ui-theme/src/index.ts:53` |
| 命名空间 id | **Loader entry id**（`entry.options.id`） | `dsh-settings/src/index.ts:315,327` |
| 客户端读取/订阅/写入 | `ctx.configForms.get<T>(ns)` → `ConfigForm<T>` | `ui-theme/src/client/index.ts:607`；`config-form.ts:284` |
| 写入 | `form.set(field, value)` / `unset(field)` / `mutate(ops)` → `Promise<boolean>` | `config-form.ts:109,119,129` |
| 变更监听 | `form.subscribe(listener)` | `config-form-types.ts` |
| 落盘位置 | profile 用户层 → 重启保留；`unset` 回落 schema 默认 | `ConfigFormSnapshot{base,user,revision,writable}` |
| Host 侧自改配置 | `ctx.get('configEditor').edit(ctx.fiber.entry, fn)` | `configuration.md` |

客户端入口的 `inject` 需含 `'configForms'` 与 `'remote'`（主题包原文：`export const inject = ['slots','locale','remote','configForms']`，`ui-theme/src/client/index.ts:595`）。

### 3.5 设置界面扩展点（✅ 已确认）

来自 `cordis_inspect_query`（client Slots）+ `ui-settings/src/client/contract/slots.ts`：

| Slot | kind/scope | owner props | 用途 |
|---|---|---|---|
| `settings.section` | `list` / `root` | `{ close: () => void }` | **一个完整设置页（本项目选它）** |
| `settings.section.icon` | `list` / `root` inline | `{ size: number; active: boolean }` | 导航图标（**注册 id 必须等于目标 section id**） |
| `settings.plugins.tab` | `list` / `root` | — | 塞进 Plugins 分页 |
| `settings.general.item` | `list` / `root` | — | 单个偏好行（不占整页） |

注册选项（真实用例 `config-manager/src/client/index.ts:189-196`）：
`{ name, id, order, label: () => string, locale: ns, inject: () => props }`。

### 3.6 生命周期与 HMR（✅/🟡）

- ✅ 资源清理统一走 `ctx.effect(fn, label)`，`fn` 返回 disposer。
- ✅ `dsh-client-hmr` README：*"Ordinary plugin enable/disable changes take effect without reloading the page or restarting the Host. Code rebuilds replace the affected plugin with fresh component state."*
- ✅ 代码重建热替换需要 dev bundle watcher；**打包版 Desktop 无此 watcher** 🟡 → 开发期改代码后需禁用/启用插件或刷新页面（阶段 0 实测确认）。
- 🔴 本会话内可用的验证手段：`cordis_inspect_query`（Host Config / Client Slots）+ 用户可见页面；**无浏览器自动化**，视觉结论需以真实运行证据（用户截图或 DOM 检查）补足。

---

## 4. 消息组件及样式结构分析（本项目最关键章节）

### 4.1 完整 DOM / 组件链路（✅ 全部源码级确认）

```
ChatFlow.tsx
├── ChatNodeSeat.tsx:153   <div class=flowItem
│        data-chat-flow-kind="user"          ← ★ 角色识别（= routedNode.kind）
│        data-chat-node-key data-chat-turn data-chat-group-part …>
│     └── conversation.chat.node (keyed entryKey="user") → UserMessageNodeView
│          └── MessageItem.tsx:332 → UserStyleBubble
│               └── MessageItem.tsx:219  <div class=userRow
│                        data-pending-steering data-submission-echo
│                        data-chat-steering-batch>
│                    ├── conversation.chat.user.before (chain slot：消息来源装饰)
│                    ├── conversation.chat.user.content (factory)
│                    │    └── UserContent.tsx
│                    │         └── <div class=userStack>
│                    │             ├── <div data-message-attachments>   ← 附件在气泡【外】
│                    │             │     └── conversation.chat.user.images (slot)
│                    │             ├── <UserMessageBubble
│                    │             │      data-message-bubble=""        ← ★ 气泡本体
│                    │             │      data-text-interaction-source="">
│                    │             │       └── conversation.user.text (factory) → UserTextRun
│                    │             │       └── JsonBlock（extraBlocks 兜底）
│                    │             └── <div class=referenceSummary>
│                    └── actions?.(text) → MessageIconActions          ← 复制/时间在气泡【外】
└── PendingSubmissionBubble / PendingSteeringBubble（ChatFlow.tsx:8 引入）
     └── 同样 → UserStyleBubble → 同样的 [data-message-bubble]      ← 乐观回声也覆盖到
```

### 4.2 气泡背景色的**唯一来源**（✅ 决定性证据）

`UserMessageBubble` 是个**无样式裸 div**，来自打包后的 primitives（`index-Ciz7DZxv.js` 偏移 ~663977）：

```js
const VN = "_bubble_1sgyj_1", HN = { bubble: VN }
function AR({ className: e, ...t }) {            // ← UserMessageBubble
  return m.jsx("div", { ...t, className: pe(HN.bubble, e) })
}
```

它在 `dsh-web-frontend/dist/assets/index-CSAdOBx6.css` 里的**唯一一条规则**（**无 `!important`**）：

```css
._bubble_1sgyj_1{
  max-width:100%;
  background: var(--dsw-specific-bubble);        /* ★ 背景色开关 */
  border-radius: var(--dsw-radius-xl);
  padding:10px 16px;
  font-size: var(--dsh-content-font-size,14px);
  line-height:calc(22px + var(--dsh-content-font-delta,0px));
  color: var(--dsw-alias-label-primary);         /* ★ 文字色 */
  white-space:pre-wrap;
  word-break:break-word
}
```

该 token 定义在 `dsh-client-ui-theme/src/styles/design-platform.css`：

| 模式 | 声明 | 字面值 |
|---|---|---|
| 浅色 `body` | `:309` `--dsw-specific-bubble: var(--dsw-static-deepseek-50)` | `rgb(237,243,254)`（淡蓝） |
| 深色 `body[data-ds-dark-theme]` | `:461` `--dsw-specific-bubble: var(--dsw-static-neutral-bluish-850)` | `rgb(44,44,46)`（**截图 1 的灰**） |
| 深色文字 | `:411` `--dsw-alias-label-primary: var(--dsw-static-neutral-bluish-50)` | 近白 |

主题切换靠 `body[data-ds-dark-theme]`（`:90` light / `:328` dark）——**不是 `:root`**，进一步说明自定义属性在气泡元素上覆盖可行且局部化。

> ⚠️ 设计 token 体系里**没有"消息气泡"语义 token**；`Theme.listTokens` Inspect 只暴露 14 个精选 alias，不含 `--dsw-specific-bubble`。真实 token 全集在 `design-platform.css`。

### 4.3 角色识别：稳定标识（✅ 已确认）

| 标识 | 位置 | 覆盖范围 | 稳定性 |
|---|---|---|---|
| **`[data-message-bubble]`** | `UserContent.tsx:47` | 仅聊天区用户/steering 气泡（全安装唯一） | ⭐⭐⭐ 语义属性，非哈希类名 |
| `data-chat-flow-kind="user"` | `ChatNodeSeat.tsx:161` | 仅**持久化**节点行 | ⭐⭐ 值为 `ChatNode['kind']` 枚举 |
| `data-chat-flow-kind="steering"` | 同上 | 回合内插话（也是用户发的） | ⭐⭐ |
| `data-submission-echo` / `data-pending-steering` | `MessageItem.tsx:222-223` | **尚未落库的乐观气泡** | ⭐⭐ |
| `data-chat-node-key` | `ChatNodeSeat.tsx:159` | 每条消息的稳定 key | ⭐ |

**关键陷阱**：乐观回声（点发送 → 服务器受理之间）**不经过 `ChatNodeSeat`**，因此没有 `data-chat-flow-kind` 祖先。只用 `[data-chat-flow-kind="user"] [data-message-bubble]` 会漏掉"刚发出的那条"。
→ 但 `[data-message-bubble]` **本身就只在用户气泡上出现**（`UserContent` 是唯一渲染者，仅被 `UserStyleBubble` 调用，而它只服务 user/steering/pending），所以**单用 `[data-message-bubble]` 即完整覆盖且不误伤**。

**明确不会**用：消息文本匹配、`nth-child`、DOM 顺序、哈希类名（`_bubble_1sgyj_1`、`userRow` 均为构建产物）。

### 4.4 不会被误伤的部分（✅ 逐项确认）

| 内容 | 为什么安全 |
|---|---|
| AI 回复 | `assistant-step` 走 `AssistantMarkdown`，无 `[data-message-bubble]` |
| 工具调用 / 思考 / 系统提示 / 压缩 / 错误 | 各自 keyed renderer，无该属性 |
| 底部输入框、发送按钮 | composer 子树（`conversation.composer.bar`），无该属性 |
| 复制 / 时间 / 动作行 | `MessageIconActions` 渲染在 `userRow` 内、气泡**兄弟位**（`MessageItem.tsx:233,350-358`） |
| 图片 / 文件附件 | `[data-message-attachments]` 在气泡**之前**（`UserContent.tsx:29-45`） |
| 用户消息内容 | 纯文本（`UserTextRun`）+ `JsonBlock` 兜底，**不含 Markdown/代码块**——用户消息不走 Markdown 渲染器 |
| 引用标签 | `.referenceSummary` 在气泡**之后**（`UserContent.tsx:53-57`） |
| `ask_user_question` 回填 | `dsh-client-ui-user-questions` 也用 `UserMessageBubble`，但**不传 `data-message-bubble`** → 不受影响（保守，符合"只影响用户已发送的消息"） |

---

## 5. 技术方案对比

### 方案 A：Theme / Token 扩展（`theme.overrideTokens`）

官方接口存在（`ui-theme/src/client/index.ts:388`）：

```ts
overrideTokens(source: string, tokens: {[name]: {light, dark}}): () => void
```

| 维度 | 结论 |
|---|---|
| 是否支持 | ✅ 支持，正式 API，可叠层、有 disposer、发 `theme/change` |
| 实现入口 | `ctx.theme.overrideTokens('cealum-tint', {'--dsw-specific-bubble':{light:'#2C6732',dark:'#2C6732'}})` |
| 需访问消息组件 | ❌ 不需要 |
| 能准确识别用户消息？ | ❌ **不能**——token 是全局的，无法作用域化 |
| 动态改色 | ✅ `theme/change` 驱动重绘 |
| 设置页 | ✅（靠 `settings.section`，与本路线无关） |
| 卸载恢复 | ✅ 调用 disposer |
| 升级兼容 | 🟡 依赖 token 名不被重命名 |
| **致命缺陷** | 🔴 连带染绿 `dsh-client-ui-goal` 命令输入气泡、`session-inspector` 气泡、`config-manager` fallback 基色 → **违反"输入框保持原样"** |

**结论：否决**（作为主方案）。

### 方案 B：官方 UI 组件扩展（接管 `conversation.chat.node` → `user`）

真实可行性已被第三方插件证明（`config-manager/src/client/chat/chat-entry-view.ts`），但原文明确写着这是高风险面：

> 「`conversation.chat.node` 的 `user` key 是 keyed 遮蔽位 …… **没有 children 表** …… 只有一条路：用更低的 priority **接管该 key 的渲染器**，把宿主那条气泡自己复刻一遍」
> 「接管宿主渲染器 = 高风险面（我们的组件一抛错，那条消息就在用户眼前消失）」
> 「priority 必须 **-1**；写 0 会因同 cell 同 priority 重复注册直接抛错，把整个插件打挂」

| 维度 | 结论 |
|---|---|
| 是否支持 | ✅ 支持（keyed slot + priority 遮蔽） |
| 准确识别用户消息 | ✅ 完全准确（`entryKey='user'`） |
| 动态改色 | ✅ 重渲染 |
| **冲突** | 🔴 **`dsh-config-manager` 已占用 priority `-1`**：我们若同时抢，输家静默失效；若写 0，直接抛错 |
| 维护成本 | 🔴 极高：须复刻 `UserStyleBubble`、`conversation.chat.user.before` 链、附件、pending/echo、动作行、`referenceLabels`… 且宿主形状随版本漂移 |
| 风险 | 🔴 组件抛错 = 消息消失；破坏复制/重试/附件 |

**结论：否决**。为一个背景色做这件事，风险收益完全不成比例。

### 方案 C：官方支持的局部样式注入（✅ 选定）

| 维度 | 结论 |
|---|---|
| 是否支持 | ✅ 官方机制（`data-plugin`/`data-plugin-css` 归属 + `ctx.effect` 清理 + `removeOwnedStyles`） |
| 实现入口 | Client `apply` 内 `document.createElement('style')` → `dataset.plugin="cealum-tint"` → `ctx.effect` 返回 `tag.remove()` |
| 需访问消息组件 | ❌ 不需要，只依赖 `[data-message-bubble]` 这一个语义属性 |
| 能准确识别用户消息 | ✅✅ 唯一且被官方/第三方实现独立验证的标识（§4.3） |
| 动态改色 | ✅ 改 CSS 变量（`style.setProperty`）即重绘生效 |
| 设置页 | ✅ 独立能力（`settings.section`） |
| 卸载恢复 | ✅ `ctx.effect` + `removeOwnedStyles` 双保险 |
| 升级兼容 | 🟡 属性名变化会**静默失效但绝不报错/不破布局**（降级 = 无着色） |
| 维护成本 | 🟢 极低，一张 CSS + 两个变量 |
| 风险 | 🟢 低：不生成 DOM、不拦渲染、不动数据 |

### 5.4 组合职责划分（最终形态）

| 职责 | 归属 |
|---|---|
| 颜色值持久化 / 校验 / 默认值 | **Host 半**：`export const Config`（schemastery，全字段 `.volatile()`） |
| 读写通道 | `ctx.configForms.get('cealum-tint')`（`set`/`unset`/`subscribe`） |
| 样式落地 | **Client 半**：一张 owned `<style>` + `documentElement` 上两个 CSS 变量 |
| 用户界面 | **Client 半**：`settings.section` 独立页 + `settings.section.icon` |
| 文案 | `locale/{zh,en}.json` + `ctx.locale.register` |

---

## 6. 最终技术选型及原因

**选方案 C（样式层）+ Host Config（持久化），拒绝 A 与 B。**

三条硬理由：

1. **唯一性已验证**：`data-message-bubble` 在整个安装（1485 + 3199 个产物文件）中只出现一次，且由宿主 `UserContent.tsx:47` 显式写在气泡上。这是"结构化标识"，不是偶然。
2. **共存已验证**：`dsh-config-manager` 抢占了 `conversation.chat.node/user`（方案 B 的路），但它的实现**把正文委托给宿主的 `conversation.chat.user.content` factory**，所以 `[data-message-bubble]` 依然存在。→ 方案 C 与它共存；方案 B 与它互斥。
3. **不可逆性最低**：CSS 失效时页面依然完整可用（只是不着色）；方案 B 组件失效时消息消失。

**明确的技术阻塞说明**：当前版本**没有**"消息气泡背景"专属主题 token，也**没有**按角色作用域化的 token 扩展 API。因此"官方 Theme/Token"路线在语义上做不到"只改用户消息"。这不是阻碍，而是选 C 的直接原因。

---

## 7. 产品功能和设置界面设计

### 7.1 功能矩阵

| ID | 功能 | 默认 | 实现要点 |
|---|---|---|---|
| F1 | 启用/关闭自定义配色 | 开启 | `enabled: boolean`；关闭 = 移除两个 CSS 变量（零视觉残留） |
| F2 | 预设颜色 | Deep Green | 5 个预设常量（见 7.2） |
| F3 | 自定义 HEX | — | 支持 `#RGB` / `#RRGGBB`，保存前归一化为大写 6 位 |
| F4 | 文字色自动适配 | 自动 | WCAG 相对亮度（含 sRGB 线性化），对比度取黑/白更优者 |
| F5 | 手动指定文字色 | 关 | `textMode: 'auto' | 'custom'` + `textColor` |
| F6 | 恢复默认 | — | `form.unset(field)` 逐字段 → 回落 schema 默认 |
| F7 | 即时生效 | — | `subscribe` → 改 CSS 变量，无重启无刷新 |
| F8 | 作用范围 | 用户消息 | `[data-message-bubble]`（含乐观回声、含 steering） |

### 7.2 预设色与自动文字色（已按 WCAG 计算）

| 名称 | HEX | 相对亮度 L | vs 白 | vs 黑 | 自动文字色 |
|---|---|---|---|---|---|
| Deep Green | `#2C6732` | 0.107 | **6.70** | 3.13 | ⚪ `#FFFFFF` |
| Ocean Blue | `#245B82` | 0.095 | **7.24** | 2.94 | ⚪ `#FFFFFF` |
| Purple | `#604B83` | 0.091 | **7.45** | 2.87 | ⚪ `#FFFFFF` |
| Amber | `#805B26` | 0.123 | **6.09** | 3.45 | ⚪ `#FFFFFF` |
| Graphite | `#414141` | 0.053 | **10.24** | 2.06 | ⚪ `#FFFFFF` |

算法（实现必须一致）：

```
c_i  = c_srgb / 255
c_lin = c_i <= 0.03928 ? c_i / 12.92 : ((c_i + 0.055) / 1.055) ** 2.4
L    = 0.2126*R_lin + 0.7152*G_lin + 0.0722*B_lin
contrast(a,b) = (max(La,Lb) + 0.05) / (min(La,Lb) + 0.05)
autoText(bg) = contrast(bg, white) >= contrast(bg, black) ? '#FFFFFF' : '#000000'
```

### 7.3 设置界面（延续原生深色 UI）

```
┌─ Settings ▸ Cealum Tint 云岫着色 ─────────────────────────┐
│  自定义用户消息气泡配色                                    │
│  ┌ 启用自定义配色 ────────────────────────────── [ ● ] ┐   │
│  │  预设颜色                                          │   │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐      │   │
│  │  │ #2C  │ │ #24  │ │ #60  │ │ #80  │ │ #41  │      │   │
│  │  │ 6732 │ │ 5B82 │ │ 4B83 │ │ 5B26 │ │ 4141 │      │   │
│  │  └──✓───┘ └──────┘ └──────┘ └──────┘ └──────┘      │   │
│  │  自定义颜色   [ #2C6732 ]        [▩ 取色]           │   │
│  │  文字颜色     [自动适配 ─────▾]   #FFFFFF  6.70:1   │   │
│  │  预览                                              │   │
│  │              ┌────────────────────────────┐        │   │
│  │              │ 这是一条测试消息，用于预览 │ ←真实   │   │
│  │              │ 当前气泡颜色。              │  气泡    │   │
│  │              └────────────────────────────┘        │   │
│  │  [ 恢复默认设置 ]                                  │   │
│  └────────────────────────────────────────────────────┘   │
│                        （改动自动保存，即时生效）          │
└───────────────────────────────────────────────────────────┘
```

**预览复用真实气泡（关键设计）**：设置页直接渲染模块表中的 `UserMessageBubble`，并**同样带上 `data-message-bubble=""`**；测试文本作为 **children** 传入（不使用未经证实的 `UserTextRun` props）。因为我们的样式规则就是 `div[data-message-bubble]{…}`，预览元素会**自动**被同一条规则染色 → 零重复样式逻辑，预览与真实消息永远一致。

控件优先使用模块表中的 `Switch`、`SegmentedControl`、`Input`、`Tag`、`Tooltip`；若其 props 契约不确定，则用最小自建控件（原生 `<button>`/`<input>`）并只继承主题 token，避免猜测第三方组件参数。

---

## 8. 插件架构设计

### 8.1 半-半职责

```
┌──────────────────────────── Host (Node) ────────────────────────────┐
│ index.js                                                            │
│  export const name = 'cealum-tint'                                  │
│  export const inject = ['settings']                                 │
│  export const Config = z.object({ …全字段 .volatile() })             │
│  export function apply(ctx, config) {                               │
│    ctx.inject(['settings'], c => c.effect(() =>                      │
│      c.settings.configure({ auto: false }, ctx.fiber)))             │
│  }                                                                  │
│  职责：schema 校验 / 默认值 / 用户层持久化 / 免重载热更新             │
│  不碰 DOM，不碰样式                                                  │
└─────────────────────────────────────────────────────────────────────┘
                              ↕ configForms（remote 服务）
┌─────────────────────────── Client (Web) ────────────────────────────┐
│ client.js  factory(require){ return { inject, apply } }             │
│  inject: ['slots','locale','remote','configForms']                  │
│  apply(ctx):                                                        │
│   1. ctx.locale.register('cealum-tint', {zh, en})                   │
│   2. configForm = ctx.configForms.get('cealum-tint')                │
│   3. installStyleSheet(ctx)   ← owned <style data-plugin>           │
│   4. bindColours(ctx, form)   ← :root 上两个 CSS 变量 + subscribe    │
│   5. ctx.configForms.whileServed(['cealum-tint'], …)                │
│      → 注册 settings.section / settings.section.icon                │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 样式层设计（核心）

```css
/* cealum-tint/user-bubble.css —— 内容固定，永不重写 */
div[data-message-bubble] {
  /* 兜底链：变量缺失 → 回落宿主原 token → 完全无副作用 */
  background-color: var(--cealum-tint-user-bg, var(--dsw-specific-bubble));
  color:            var(--cealum-tint-user-fg, var(--dsw-alias-label-primary));
}
```

设计要点：

1. **特异性 `(0,1,1)` 严格高于 `._bubble_1sgyj_1` `(0,1,0)`** —— 不依赖加载顺序（虽然运行时注入必然在后），抗未来 CSS 顺序变化。
2. **用 `background-color` 长属性，不用 `background` 简写** —— 若未来宿主/skin 在气泡上加 `background-image`/渐变，简写会把它清掉，长属性不会。
3. **不覆盖 `--dsw-specific-bubble` 自身**（避免 `var(--x, var(--x))` 自引用循环导致 guaranteed-invalid）。
4. **不写 `!important`**（见 §16 R3 修正：普通选择器无法压过 `!important`；当前宿主规则无 `!important`，若未来出现则停止并重查 Cascade）。
5. **颜色走独立变量** `--cealum-tint-user-bg/fg`，改色只 `documentElement.style.setProperty(...)`，浏览器只重绘不重排。
6. **卸载**：`ctx.effect` 移除 tag + 复原变量（照抄 `installThemeStyles` 的"存旧值 → 删/复原"模式）。

### 8.3 关键代码骨架

**Host `src/host/index.ts`**

```ts
import z from '@deepseek-ai/schemastery'
import type { Volatile } from '@deepseek-ai/cordis'

export const name = 'cealum-tint'
export const inject = ['settings']

export interface Config {
  enabled: Volatile<boolean>
  preset: Volatile<string>
  bubbleColor: Volatile<string>
  textMode: Volatile<string>
  textColor: Volatile<string>
}

export const Config = z.object({
  enabled:     z.boolean().default(true).volatile(),
  preset:      z.union([...PRESET_IDS, 'custom']).default('deep-green').volatile(),
  bubbleColor: z.string().pattern(HEX_PATTERN).default('#2C6732').volatile(),
  textMode:    z.union(['auto', 'custom']).default('auto').volatile(),
  textColor:   z.string().pattern(HEX_PATTERN).default('#FFFFFF').volatile(),
})

export function apply(ctx: Context): void {
  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber))
  })
}
```

**Client 样式注入 + 变量绑定**

```js
ctx.effect(() => {
  const tag = document.createElement('style')
  tag.dataset.plugin = PLUGIN_ID
  tag.dataset.pluginCss = `${PLUGIN_ID}/user-bubble.css`
  tag.textContent = CSS_TEXT
  document.head.appendChild(tag)
  return () => tag.remove()
}, 'cealum-tint: user bubble stylesheet')

ctx.effect(() => {
  const root = document.documentElement
  const prevBg = root.style.getPropertyValue('--cealum-tint-user-bg')
  const prevFg = root.style.getPropertyValue('--cealum-tint-user-fg')
  const sync = () => { /* 读 snapshot → 校验 → setProperty / removeProperty */ }
  sync()
  const off = form.subscribe(sync)
  return () => { off(); /* 复原 prev */ }
}, 'cealum-tint: live colour binding')
```

**预览组件（复用真实气泡）**

```jsx
h(UserMessageBubble, { 'data-message-bubble': '' }, '这是一条测试消息，用于预览当前气泡颜色。')
// 背景/文字由同一条 [data-message-bubble] 规则渲染 —— 与真实消息零差异
```

---

## 9. 项目目录结构

```
/Users/xuweidong/www/dsh/dsh-plugin-cealum-tint/
├── package.json                 # exports / dsh.bundle.patch / dsh.client
├── cordis.patch.yml             # insert: id=cealum-tint, name=dsh-plugin-cealum-tint
├── index.js                     # [构建产物] Host 半
├── client.js                    # [构建产物] Client 半（__ModuleLoader__ 信封）
├── icon.svg                     # 原创图标（≤256 KiB，包内相对路径）
├── README.md  README.zh.md
├── LICENSE                      # MIT
├── locale/
│   ├── en.json                  # { meta: { title, description, detail } }
│   └── zh.json
├── docs/
│   ├── DEVELOPMENT-PLAN.md      # 本文件
│   ├── IMPLEMENTATION-LOG.md    # 实施日志
│   ├── DETAIL.md                # 插件详情页（meta.detail 指向）
│   └── preview.png              # 详情页单图（可选）
├── src/
│   ├── host/
│   │   ├── index.ts             # Config schema + apply
│   │   └── config-schema.ts     # 字段常量 / 默认值 / HEX 校验
│   ├── shared/
│   │   ├── presets.ts           # 5 个预设 + 'custom'
│   │   └── contrast.ts          # WCAG 相对亮度（含 sRGB 线性化）
│   └── client/
│       ├── index.tsx            # 装配入口
│       ├── style-text.ts        # 生成的 CSS 文本（与测试共享）
│       ├── style-tag.ts         # owned <style> 注入/清理
│       ├── color-binding.ts     # configForms → CSS 变量
│       ├── settings-page.tsx    # settings.section 页面
│       ├── preview.tsx          # 真实气泡预览
│       └── controls.tsx         # 预设色卡 / HEX 输入 / 模式切换
├── scripts/
│   └── build.mjs                # esbuild：src/host → index.js；src/client → client.js
├── tests/
│   ├── contrast.test.ts
│   ├── presets.test.ts
│   ├── style-text.test.ts
│   └── config-schema.test.ts
├── tsconfig.json
├── .gitignore
├── .prettierrc.json
└── .editorconfig
```

> 注：`package.json` 只出现一次（原稿曾重复列出，已在 §16 修正）。

**构建**（照搬 orbis 已验证做法，`scripts/build.mjs` 用 esbuild）：
- Host → ESM，`platform: node`，external 掉 `@deepseek-ai/*`
- Client → CJS body + `__ModuleLoader__.load` 信封，**`react` / `react-dom` / primitives 一律 external**（页面模块表提供，重复打包会炸）

---

## 10. 配置及持久化设计

### 10.1 字段表

| 字段 | 类型 | 默认 | volatile | 说明 |
|---|---|---|---|---|
| `enabled` | boolean | `true` | ✅ | 总开关 |
| `preset` | `'deep-green' \| 'ocean-blue' \| 'purple' \| 'amber' \| 'graphite' \| 'custom'` | `'deep-green'` | ✅ | 预设 id；`'custom'` 表示自定义 |
| `bubbleColor` | `#RGB` / `#RRGGBB` | `'#2C6732'` | ✅ | 实际生效 HEX（预设也写回这里，单一真相） |
| `textMode` | `'auto' \| 'custom'` | `'auto'` | ✅ | 文字色模式 |
| `textColor` | `#RGB` / `#RRGGBB` | `'#FFFFFF'` | ✅ | 仅 custom 生效 |

> 单一真相原则：UI 选中预设时，同时把预设 HEX 写入 `bubbleColor`；读色永远只读 `bubbleColor`。→ 避免"preset 与 color 不一致"的经典 bug。
> 归一化：任何写入前统一 `#RGB` → `#RRGGBB` 并转大写；读到时再做一次防御性归一化，非法值回落默认色且不写 CSS 变量。

### 10.2 命名空间与落盘（✅ 已确认）

- **命名空间 = Loader entry id = `cealum-tint`**（证据：`dsh-settings/src/index.ts:315` `entry.options.id as SettingsNamespace`；`ui-theme` 同行 id ↔ 同命名空间）。
  ⚠️ **不是**包名 `dsh-plugin-cealum-tint`。这是本方案最容易踩的坑。
- 落盘：用户层写入 profile 的 `cordis.patch.yml`（`ConfigFormSnapshot.user`），重启后仍生效。
- `unset(field)` → 回落 `Config` schema 默认（`base` 层）→ "恢复默认设置"语义精确。
- **禁止**插件自己读写 `cordis.patch.yml`（`configuration.md:3` 明文禁止）。

### 10.3 热更新链路（✅ 语义已查证，端到端待真机确认）

`form.set()` → `remote.settings.mutate` → Host `configEditor.edit` → 用户层写盘 → `settings/document-updated` → `configForms` 快照 revision++ → `subscribe(sync)` → `root.style.setProperty` → 下一个绘制帧生效。

`.volatile()` 的真实语义（`dsh-settings/src/schema.ts:33` 注释逐字）：*"Select fields whose nearest volatile ancestor makes them **editable without remounting**"*；写入走 `configEditor.edit(entry, …)`（`index.ts:391`），与普通字段**同一条持久化通道**。→ **`.volatile()` = 免重载热编辑，不牺牲持久化**（§16 第 5 条已核实）。

---

## 11. 安装部署方案

### 11.1 安装（本地开发闭环）

```bash
# 方式一：CLI
dsh plugin --profile desktop add link:/Users/xuweidong/www/dsh/dsh-plugin-cealum-tint

# 方式二：GUI → Plugins → Add plugin → 选择该目录（本地目录安装为 link，不复制）
# 方式三（Agent 侧）：plugin_manager action:install_bundle, target:<绝对包目录>
```

`link:` 安装注意（`host-plugin.md:36`）：**`files` 字段不生效**，目录里有什么就加载什么 → 开发期无需担心漏配。

### 11.2 启用 / 禁用 / 卸载

| 操作 | 效果 | 是否需要重启 |
|---|---|---|
| 禁用 | Client fiber dispose → `ctx.effect` 清理 → `removeOwnedStyles` 抹掉 style；设置页消失 | ❌ 无需重启（HMR 常驻） |
| 启用 | 行重新激活 → 重新注入 | ❌ |
| 卸载（remove_bundle） | 包移除 + 行移除 | 🟡 建议重启一次确认干净 |
| 仅关功能（`enabled=false`） | 样式 tag 仍在但变量被移除 → 回落宿主原色（**零视觉残留**） | ❌ |

### 11.3 验证加载成功

1. **权威查询**：`cordis_inspect_query` → host `Config.listConfigs`，`name: "dsh-plugin-cealum-tint"` → 应返回该行与其投影 schema；查 `entry` 可拿到 `packageDir`（应指向开发目录）。
2. Client 侧：`cordis_inspect_query` → client `Slots.listSubTree`，`root: "settings.section"` → occupants 中出现 `cealum-tint`。
3. UI：Settings 左侧出现「Cealum Tint 云岫着色」，Plugins 列表出现该行 + 自定义图标。
4. **不要**用 `list_plugins` 代替上述（需审批且不反映 slot 注册）。

### 11.4 日志 / 排障

| 来源 | 位置 |
|---|---|
| 插件安装结果 | `plugin_manager` 返回的 `application`（`applied` 才算生效）与 `warnings` |
| Web 启动崩溃 | `~/Library/Logs/DeepSeek Harness/crash-*.log` |
| Client 控制台 | 需开发者工具（`ui-settings-account.config.developerTools: true` 已开启） |
| 浏览器半加载失败 | `dsh-client-modules` 写入 entries `state.failures`，并 console 报 `client-modules: <id> …` |

### 11.5 不污染 Web Profile

- 只对 `--profile desktop` 安装；**绝不** `add` 到 `web` profile。
- 校验：`ls ~/.dsh/profiles/web/node_modules/dsh-plugin-cealum-tint` 应不存在。
- 副作用仅限：`~/.dsh/profiles/desktop/{package.json,pnpm-lock.yaml,cordis.patch.yml,node_modules}`。

### 11.6 重启后配置仍在

值落在 profile 用户层（`cordis.patch.yml` 的 `cealum-tint.config`）。验证：改色 → 完全退出 Desktop → 重启 → 颜色仍为自定义值，且 `cordis.patch.yml` 出现该行 `config`。

### 11.7 DSH 升级后的兼容检查清单

1. `data-message-bubble` 是否仍唯一存在（搜所有 `lib/client.js`）。
2. 气泡背景规则是否仍读 `var(--dsw-specific-bubble)`。
3. `._bubble_*` 规则是否出现 `!important` 或更高特异性（我们的 `(0,1,1)` 是否仍胜）。
4. `settings.section` 的 owner props 是否仍为 `{ close }`。
5. `ConfigForm` 是否仍是 `getSnapshot/subscribe/mutate/set/unset`。
6. 配置命名空间是否仍取自 entry id。
7. **降级行为自检**：若第 1 条失败，界面应提示"当前 DSH 版本不受支持"，而不是静默无效（见 §16 第 2 条）。

---

## 12. 测试及验收方案

### 12.1 自动化单测（vitest，纯函数层）

| 用例 | 断言 |
|---|---|
| `parseHex('#2C6732')` | → `{r:44,g:103,b:50}` |
| `parseHex('#abc')` | → `{r:170,g:187,b:204}`（`#RGB` 展开） |
| `parseHex('2C6732')` / `'#GGG'` / `''` | 依次：拒绝 / 拒绝 / 拒绝 |
| `normalizeHex('#abc')` | → `'#AABBCC'`（大写 6 位） |
| `autoContrast` 5 个预设 | 全部返回 `'#FFFFFF'`（§7.2 表） |
| `autoContrast('#FFFFFF')` | → `'#000000'` |
| `contrastRatio('#2C6732','#FFFFFF')` | ≈ 6.70（±0.02） |
| 预设表 | 5 项、HEX 唯一、均为合法 RGB、id 唯一 |
| `styleText()` 输出 | 含 `div[data-message-bubble]`；含双层 `var()` 兜底；**不含** `!important`；**不含** `--dsw-specific-bubble:` 声明（防自引用） |
| Config schema | 默认值正确；非法 `preset` 被拒；非法 HEX 被拒；`#RGB` 合法 |

### 12.2 手工验收清单（23 项，必须逐条执行并留证）

| # | 验收项目 | 预期结果 | 测试方法 |
|---|---|---|---|
| 1 | 用户新消息（乐观回声） | 立即为自定义色 | 发一条消息，在 AI 开始回复前检查 `[data-message-bubble]` 已有颜色 |
| 2 | 用户新消息（落库后） | 仍为自定义色 | 等回复结束再看同一气泡，颜色不变、无闪烁跳变 |
| 3 | 历史用户消息 | 显示自定义色 | 打开长历史会话，向上滚动加载历史 |
| 4 | AI 回复 | 完全原样 | 对比插件禁用前后截图 |
| 5 | 工具调用卡片 | 完全原样 | 触发一次 `bash`/`read`，检查卡片底色 |
| 6 | 思考过程 | 完全原样 | 用带 reasoning 的模型，展开 thinking 区 |
| 7 | Markdown | 正常显示 | AI 回复内含标题/列表/表格/链接 |
| 8 | 代码块 | 正常显示 | AI 回复内含 fenced code，检查语法高亮与复制按钮 |
| 9 | 图片附件 | 正常显示 | 发带图消息；确认图片在气泡外不被染色，点击可放大 |
| 10 | 文件附件卡片 | 正常显示 | 发带文件消息，检查 `[data-message-attachments]` 卡片 |
| 11 | 复制功能 | 正常 | 每条消息下方复制按钮 → 剪贴板内容与气泡文本一致 |
| 12 | 重试功能 | 正常 | 对一条用户消息点重试，确认气泡与流程正常 |
| 13 | 切换会话 | 正常 | 快速切 3 个会话，颜色一致、无残留 |
| 14 | 虚拟滚动 | 正常 | 长会话滚到底再回顶，历史气泡全部着色 |
| 15 | 实时修改颜色 | 立即生效 | 设置页点另一个预设，不改窗口不刷新，气泡即时变化 |
| 16 | 手动文字色 | 生效且可读 | `textMode=custom` 设 `#000000` 于深绿底 → 真的变黑（并显示对比度警告） |
| 17 | 关闭开关 | 完全恢复原灰 | 关 `enabled`，气泡回到 `rgb(44,44,46)`（深色） |
| 18 | 重启 DSH | 配置保留 | 完全退出后重启，颜色与选项仍在 |
| 19 | 禁用插件 | 恢复原始样式 | Plugins 里禁用 → 气泡回原色，设置页消失，无需重启 |
| 20 | 卸载插件 | 无残留 | 卸载后 DOM 中无 `style[data-plugin="cealum-tint"]`、`html` 上无 `--cealum-tint-*` |
| 21 | 与 dsh-config-manager 共存 | 回退按钮正常 + 气泡着色 | 若启用其"每条消息回退入口"，确认气泡仍着色、按钮仍在 |
| 22 | 主题切换 | 两模式都正确 | Settings 切 light/dark，气泡均为自定义色且文字可读 |
| 23 | steering 消息 | 一致着色 | 回合运行时插入一条插话 |

> 第 20 条 DOM 校验：
> `document.querySelectorAll('style[data-plugin="cealum-tint"]').length === 0`
> `getComputedStyle(document.documentElement).getPropertyValue('--cealum-tint-user-bg').trim() === ''`

---

## 13. 兼容性和风险分析

| ID | 风险 | 等级 | 可能性 | 缓解 |
|---|---|---|---|---|
| R1 | 未来版本移除/重命名 `data-message-bubble` | 中 | 低 | 降级为"不着色但不报错"；在**消息实际出现后**做一次特征自检，缺失则记 warn 并在设置页显示兼容性提示（§16 第 2 条） |
| R2 | 未来版本弃用 `--dsw-specific-bubble` | 低 | 低 | 直接写 `background-color`，token 只作 fallback → 不受影响 |
| R3 | 宿主提高特异性或改用 `!important` | 中 | 低 | 当前宿主规则无 `!important`；**普通选择器无法压过 `!important`**，故不预先加 `!important`。若实测发现 `!important`，停止该项并重查 CSS Cascade，不得擅自改技术路线 |
| R4 | 其它插件抢 `[data-message-bubble]` 样式 | 低 | 中 | 已知 `config-manager` 只读该 token 作 fallback，不写气泡背景 → 兼容 |
| R5 | `configForms` 命名空间不匹配（最常见） | **高**（易犯） | 中 | 死守规律：**命名空间 = patch 行 id**；安装后用 `Config.listConfigs` 验证 |
| R6 | 用户关了 `enabled` 以为坏了 | 低 | 中 | 设置页状态行明确显示"当前：已关闭 / 生效中 #2C6732" |
| R7 | 深色/浅色主题下文字对比不足 | 中 | 中 | 自动对比度 + 手动覆盖 + 设置页实时显示对比度数值 |
| R8 | 插件 throw 导致消息消失 | **极高**影响 | 极低 | 方案 C 不参与渲染管线，架构上不可能；`apply` 内部全 try/catch，失败只失样式 |
| R9 | 误用非 volatile 字段导致改色重启插件 | 中 | 中 | 全部字段 `.volatile()`；改色后观察无闪烁 |
| R10 | 乐观回声漏色 | 中 | 低（已消解） | 用 `[data-message-bubble]` 而非 `data-chat-flow-kind` |
| R11 | 打包时误把 `react` 打进 client.js | 高 | 中 | esbuild `external: ['react','react-dom',…]`；构建后检查产物体积 |
| R12 | 升级破坏：DSH 大版本变化 | 中 | 中 | README 标注 `tested with 0.2.2-rc.5`；升级后按 §11.7 走 |

**用户数据安全边界**：本插件只读会话渲染结果，**不写** `~/.dsh/sessions/**`、不订阅消息变更事件、不注入消息 DOM。即使插件被误删，聊天历史完好。

---

## 14. 分阶段开发任务清单

### 阶段 0：骨架跑通（0.5 天）
- [ ] T0.1 `package.json` + `cordis.patch.yml` + 空 `index.js`/`client.js`
- [ ] T0.2 `install_bundle` 安装到 desktop Profile
- [ ] T0.3 `Config.listConfigs` 确认行已挂载并拿到 `packageDir`
- [ ] T0.4 不手改 profile 文件

### 阶段 1：样式命脉验证（最高优先级 ⚠️）
- [ ] T1.1 client 注入硬编码 `#2C6732` 的 style tag
- [ ] T1.2 **真机确认**：用户气泡变绿；AI 回复/输入框/工具卡不变
- [ ] T1.3 确认 ①历史消息 ②新消息 ③乐观回显 ④steering 四态均着色
- [ ] T1.4 确认与 `dsh-config-manager` 共存
- [ ] T1.5 若 T1.2 失败 → **停止**，回到 §4 复核（不改路线）

### 阶段 2：配置持久化（1 天）
- [ ] T2.1 Host `Config` schema（5 字段，全 `.volatile()`）
- [ ] T2.2 `settings.configure`
- [ ] T2.3 `configForms.get('cealum-tint')` 读通；`set()` 写通并**重启验证保留**
- [ ] T2.4 `subscribe` → 改色即时生效

### 阶段 3：设置页（1.5 天）
- [ ] T3.1 `settings.section` 注册（id/order/label/locale/inject）
- [ ] T3.2 `settings.section.icon` 图标（注册 id = section id）
- [ ] T3.3 预设色卡（5 个，含选中态）
- [ ] T3.4 HEX 输入 + 校验 + 错误态
- [ ] T3.5 文字色模式（自动/自定义）+ 对比度读数
- [ ] T3.6 真实气泡预览（`UserMessageBubble` + children）
- [ ] T3.7 恢复默认（逐字段 `unset`）
- [ ] T3.8 中英文案

### 阶段 4：工程化与发布准备（1 天）
- [ ] T4.1 `scripts/build.mjs`（esbuild，双产物，react external）
- [ ] T4.2 vitest：contrast / presets / style-text / config-schema
- [ ] T4.3 `tsc --noEmit` + prettier
- [ ] T4.4 `icon.svg`（原创）+ `docs/DETAIL.md`
- [ ] T4.5 README（安装/卸载/配置/兼容矩阵/已知限制）
- [ ] T4.6 走完 §12.2 全部 23 条验收，留证

---

## 15. 下一阶段可执行的开发任务说明

```
在 /Users/xuweidong/www/dsh/dsh-plugin-cealum-tint 开发 DSH 0.2.2-rc.5 插件 dsh-plugin-cealum-tint
（Cealum Tint / 云岫着色）：把「用户发送的聊天消息气泡」背景改为可配置颜色（默认 #2C6732），并提供独立设置页。

【已确认事实，直接采用】
1. 选择器：div[data-message-bubble]
   - 唯一来源：@deepseek-ai/dsh-client-ui-chat src/client/chat/UserContent.tsx:47
   - 全安装内该属性仅此一处，覆盖 持久消息 / 乐观回声 / steering 三态
2. 气泡背景来自 CSS 变量 --dsw-specific-bubble（宿主规则 _bubble_1sgyj_1，无 !important）；
   默认：浅色 rgb(237,243,254) / 深色 rgb(44,44,46)；文字色 --dsw-alias-label-primary
3. 样式注入官方范式（@deepseek-ai/dsh-client-ui-theme src/client/styles.ts）：
   createElement('style') → dataset.plugin=插件id → dataset.pluginCss=… → head.appendChild
   → ctx.effect 返回 tag.remove()
4. Host：export const Config = z.object({…})（@deepseek-ai/schemastery，全字段 .volatile()）；
   apply 内 ctx.inject(['settings'], c => c.effect(() => c.settings.configure({auto:false}, ctx.fiber)))
5. ★配置命名空间 = cordis.patch.yml 行 id = "cealum-tint"（不是包名）
   Client：ctx.configForms.get('cealum-tint') → {getSnapshot, subscribe, set, unset, mutate}
   Client inject 必须含 'configForms' 与 'remote'
6. 设置页：ctx.slots.register({name:'settings.section', id:'cealum-tint', order:70,
   label:()=>t('section.label'), locale:NS, inject:()=>props}, Page)，owner props = { close }
   图标：settings.section.icon，id 必须等于 section id，owner props = { size, active }
7. 模块表提供（构建必须 external）：react, react/jsx-runtime, react-dom, react-dom/client,
   @deepseek-ai/cordis, zod, @tanstack/react-virtual, @deepseek-ai/dsh-client-store,
   @deepseek-ai/dsh-client-ui-slots, @deepseek-ai/dsh-client-ui-primitives, @deepseek-ai/dsh-client-ui-dockkit
8. Client 入口：window.__ModuleLoader__.load({ id:'cealum-tint', factory(require){ return {inject, apply} } })
9. 构建：esbuild（照 ~/www/dsh/neural-orbit/scripts/build.mjs）；Host→ESM index.js，
   Client→CJS body+信封 client.js
10. 安装：plugin_manager install_bundle，target = 绝对包目录（或 dsh plugin --profile desktop add link:…）

【样式（最终，勿改路线）】
div[data-message-bubble]{
  background-color: var(--cealum-tint-user-bg, var(--dsw-specific-bubble));
  color:            var(--cealum-tint-user-fg, var(--dsw-alias-label-primary));
}
- background-color 长属性；不声明 --dsw-specific-bubble 自身；不加 !important
- 颜色经 documentElement.style.setProperty 注入，ctx.effect 内保存旧值并复原

【配置字段】enabled / preset / bubbleColor / textMode / textColor（全 .volatile()）
【预设】#2C6732 / #245B82 / #604B83 / #805B26 / #414141；自动文字色按 WCAG 取黑或白

【禁止】
- 接管 conversation.chat.node 的 user key（config-manager 已占 priority -1；抛错会让消息消失）
- 使用 theme.overrideTokens 覆盖 --dsw-specific-bubble（连带染色 goal 输入气泡等）
- 直接读写 profile 的 package.json / cordis.patch.yml / pnpm-lock.yaml
- 把 react 打进 client.js
- 修改 DSH 安装目录内任何文件

【验收】按 §12.2 的 23 条逐条执行；T1.2/T1.3 是阶段 1 停止条件，不通过则停下汇报。
```

---

## 附录 A：证据索引（全部为本机真机读物）

| 结论 | 文件 | 位置 |
|---|---|---|
| DSH 版本 0.2.2-rc.5 | `$DSH_INSTALL_DIR/package.json` | `version` |
| profile / 已装 bundle | `~/.dsh/profiles/desktop/package.json` | `dsh.profile.bundles` |
| 主题偏好 dark | `profile/cordis.patch.yml` | L66-69 |
| `data-message-bubble` 唯一来源 | `.../dsh-client-ui-chat/src/client/chat/UserContent.tsx` | L47 |
| 附件在气泡外 | 同上 | L29-45 |
| `data-chat-flow-kind` 角色标识 | `.../chat/ChatNodeSeat.tsx` | L161 |
| userRow 根（含 pending 标记） | `.../chat/MessageItem.tsx` | L219-225 |
| 动作行在气泡外 | 同上 | L233、L350-358 |
| 乐观回声独立组件 | 同上 | L244、L277；`ChatFlow.tsx:8` |
| 气泡是裸 div + 哈希类名 | `dsh-web-frontend/dist/assets/index-Ciz7DZxv.js` | 偏移 ~663977 |
| 模块表全清单 | 同上 | 偏移 ~1061144 |
| primitives 导出表 | 同上 | 偏移 ~1005219 |
| 气泡 CSS 规则（无 !important） | `dsh-web-frontend/dist/assets/index-CSAdOBx6.css` | `._bubble_1sgyj_1` |
| token 浅/深定义 | `dsh-client-ui-theme/src/styles/design-platform.css` | L309 / L461（值 L29、L73、L411） |
| 主题切换选择器 | 同上 | L90、L328（`body[data-ds-dark-theme]`） |
| `<style data-plugin>` 官方范式 | `dsh-client-ui-theme/src/client/styles.ts` | `installThemeStyles()` |
| 样式自动清理 | `dsh-client-modules/src/client/entry-lifecycle.ts` | `removeOwnedStyles()` |
| 样式归属清点 | `dsh-client-modules/src/client/system.ts` | L76 `claimStyles` |
| `overrideTokens` | `dsh-client-ui-theme/src/client/index.ts` | L388 |
| `configForms` 用法 | 同上 | L595、L607、L220、L264 |
| `configForms.get(entryId)` | `dsh-client-ui-settings/src/client/config-form.ts` | L284 |
| `ConfigForm` 契约 | `.../client/config-form-types.ts` | 全文 |
| `.volatile()` 语义 | `dsh-settings/src/schema.ts` | L33-46（`volatileForm`） |
| volatile 写入通道 | `dsh-settings/src/index.ts` | L383-397（`configEditor.edit`） |
| 命名空间 = entry id | `dsh-settings/src/index.ts` | L315、L327 |
| Host `Config` + `.volatile()` | `dsh-client-ui-theme/src/index.ts` | L38-46、L53 |
| `settings.section` 契约 | `dsh-client-ui-settings/src/client/contract/slots.ts` | L57、L134-137 |
| `settings.section.icon` 契约 | 同上 | L65、L139-145 |
| 禁止自写 patch 文件 | `dsh-doc/references/configuration.md` | L3 |
| Host 导出两种形态 | `dsh-doc/references/host-plugin.md` | L60-65 |
| 最小 bundle 骨架 | `dsh-doc/templates/decoration/*` | 4 个文件 |
| 第三方完整样例 | `profile/node_modules/dsh-config-manager/*` | `package.json`、`cordis.patch.yml`、`src/client/index.ts`、`src/client/chat/chat-entry-view.ts` |
| 本地开发工程化 | `~/www/dsh/neural-orbit/{package.json,scripts/build.mjs}` | — |
| `plugin_manager` 语义 | `dsh-doc/references/host-plugin.md` | L71-75 |
| Schemastery API | `@deepseek-ai/schemastery/src/index.ts` | L165 `volatile`、L480、L951 `union` |

## 附录 B：待验证事项

| # | 待验证 | 为什么重要 | 验证方法 | 结论 |
|---|---|---|---|---|
| V1 | `[data-message-bubble]` 真机上出现在所有用户气泡（含乐观回声） | 整方案基石 | 发消息前后检查 DOM | 待阶段 1 |
| V2 | `.volatile()` 改动不重启插件、无闪烁 | 体验 | 连点预设，观察无 apply 重跑 | 待阶段 2 |
| V3 | `configForms` 能拿到 `cealum-tint` 命名空间 | 否则不落盘 | 改值后看 `cordis.patch.yml` | 待阶段 2 |
| V4 | 预览组件的最简用法 | 影响设置页实现 | 传 children 给 `UserMessageBubble` | 待阶段 3 |
| V5 | 打包版 Desktop 代码改动如何生效 | 决定迭代速度 | 禁用/启用 vs 刷新 | 待阶段 1 |
| V6 | `settings.section.icon` 渲染细节 | 图标可能不显示 | 注册后观察 | 待阶段 3 |

---

## 16. 技术审核修正记录

本节记录开发前最后一次技术审核发现的问题、修正方案与最终决策。**结论：原架构与技术路线全部保留，仅修正 6 处实现细节。**

### 16.1 R3 的 CSS 优先级表述错误（已修正）

- **问题**：原 §13 R3 写"可升为 `div[data-message-bubble][data-message-bubble]`（`(0,2,1)`）"作为对抗 `!important` 的手段。这是**错误的**：普通选择器无论特异性多高，都不能覆盖 `!important` 声明（CSS Cascade 中 `!important` 位于普通声明之后的独立优先级层）。
- **核查结果**：宿主气泡规则 `._bubble_1sgyj_1` **未使用 `!important`**（已逐字确认 `index-CSAdOBx6.css` 全文该规则）。
- **决策**：
  1. 保持 `div[data-message-bubble]`（`(0,1,1)` > `(0,1,0)`），**不写 `!important`**。
  2. 若运行期实测发现宿主改用 `!important`：**停止该项实现**，重新审查 CSS Cascade 与注入位置，**不得**擅自改为全局 token 覆盖或接管组件。
  3. 已同步修正 §13 R3 表述。

### 16.2 兼容性检测时机（已修正）

- **问题**：原 §13 R1 写"挂载时自检 `document.querySelector('[data-message-bubble]')` 为空则提示不兼容"。这是**误报陷阱**：应用启动或未打开会话时页面上本就没有气泡，会被判为不兼容。
- **修正**：
  1. **绝不**在 `apply` 阶段仅凭单次查询判定兼容性。
  2. **样式注入永不因检测结果而中断**（检测失败不得影响着色）。
  3. 兼容性判定改为**事件驱动 + 版本+DOM 联合特征**：
     - 通过 `MutationObserver`（`document.body`，`childList+subtree`）观察，**只有在首次观察到 `[data-message-bubble]` 之后**才认为"DCH 兼容特征成立"并立即断开观察；
     - 同时记录一次宿主版本探测（若可从模块表/文档中的版本标记读到则参与判定，读不到则只依赖 DOM 特征）；
     - 若插件启用后 **有用户消息渲染** 但属性缺失（可通过"存在 `data-chat-flow-kind` 祖先却无 `data-message-bubble`"精确识别这种"结构变了"的情形），才在设置页显示"当前 DSH 版本不受支持"提示；
     - 从未出现任何消息时：状态显示"等待首条消息以完成兼容性自检"，**不显示错误**。
  4. 观察器本身用 `ctx.effect` 托管，卸载即断开（不留监听器）。

### 16.3 Config Schema 与测试断言矛盾（已修正）

- **问题**：原稿 `preset: z.string()` 与"拒绝非法预设值"的单测断言矛盾。
- **核查 Schemastery 3.19.0 真实 API**：`z.union([...list])`（`src/index.ts:951` defineMethod union；成员可为字面量字符串，内部归一为 `const` schema，主题包 `z.union([...THEME_PREFERENCES])` 即此用法）；`z.string().pattern(regex)`（`src/index.ts:189,415`）；`.default(v)`；`.volatile()`（`src/index.ts:165,480`）。
- **最终 Schema**：

```ts
const PRESET_IDS = ['deep-green','ocean-blue','purple','amber','graphite'] as const
const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export const Config = z.object({
  enabled:     z.boolean().default(true).volatile(),
  preset:      z.union([...PRESET_IDS, 'custom']).default('deep-green').volatile(),
  bubbleColor: z.string().pattern(HEX_PATTERN).default('#2C6732').volatile(),
  textMode:    z.union(['auto','custom']).default('auto').volatile(),
  textColor:   z.string().pattern(HEX_PATTERN).default('#FFFFFF').volatile(),
})
```

- **决策**：预设用显式枚举（含 `custom`）；HEX 同时接受 `#RGB` 与 `#RRGGBB`；**写入前**客户端统一归一化为大写 6 位；**非法颜色绝不写入 CSS 变量**（`normalizeHex` 返回 `null` → 回落默认色 + 记 warn）；schema 层同样拒绝非法值（双重防线）。

### 16.4 预览组件参数（已修正）

- **问题**：原稿举例使用 `UserTextRun`，但其 props 契约未确认（primitives 无本地源码，只有打包产物中的压缩符号 `UserTextRun: DZ`）。
- **核查**：`UserMessageBubble` 的实现为 `function AR({className:e, ...t}){ return jsx("div", {...t, className: pe(HN.bubble, e)}) }` —— **把所有剩余 props（含 `children`）原样透传给 `div`**。
- **决策**：预览**不使用 `UserTextRun`**，直接用：

```jsx
<UserMessageBubble data-message-bubble="">这是一条测试消息，用于预览当前气泡颜色。</UserMessageBubble>
```

即测试文本作为 children 传入。预览与真实消息**共用同一 `.bubble` 类 + 同一条 `[data-message-bubble]` 规则**，零重复样式逻辑。若 `UserMessageBubble` 在目标版本导出缺失，则退化为一个纯 `div[data-message-bubble]`（样式仍一致）。

### 16.5 `.volatile()` 与持久化的关系（已核实，无需修正）

- **核查**：`dsh-settings/src/schema.ts:33-46` —— `volatileForm()` 的用途是"选出**其最近 volatile 祖先使其可免重挂载编辑**的字段"；`dsh-settings/src/index.ts:391` —— volatile 写入走 `this.ownerContext.configEditor.edit(entry, …)`，与普通字段**同一条写盘通道**（写 profile 用户层）。
- **结论**：`.volatile()` = **免重载热编辑**，**不牺牲持久化**。全字段 volatile 同时满足"即时生效"与"重启保留"两个要求，**无冲突，无需修正**。
- **附带约束**（新增）：`describe()` 只返回**至少有一个 volatile 字段**的 entry（`index.ts:308-309`）。若将来把全部字段改成非 volatile，插件会从 `describe()` 消失、客户端 `configForms` 变为 `unavailable` 且设置页不再可用 → 已在 README「维护须知」中写明。

### 16.6 其它细节修正

| 项 | 原稿 | 修正 |
|---|---|---|
| 目录树重复 `package.json` | 出现两次 | 已删除重复项（§9） |
| `settings.section.icon` 契约 | 只见 slot 名 | 已核实：`{kind:'list', scope:'root', inline:true, owner:{size, active}}`，**注册 id 必须等于 section id**，不匹配则不渲染（§3.5） |
| `configForms` API | 只写 `get(subscribe/set)` | 已核实完整面：`getSnapshot / subscribe / mutate(ops, rev?) / set(field,val) / unset(field)`，另有 `whileServed(namespaces, register)` 可用于"Host 未提供命名空间时不留痕迹地不注册"（§8.1 采用） |
| WCAG 算法 | 只写"相对亮度" | 已补全 **sRGB 线性化**（0.03928 阈值 / 2.4 指数）与对比度公式（§7.2） |
| 模块导入与构建参数 | 未定 | 以本机真实产物为准：模块表见 §3.2；构建 external 清单见 §15 第 7 条 |
| 验收表结构 | 22 项（合并了"AI 回复/工具/Markdown"） | 展开为 **23 项**（§12.2），与交付报告逐条对应 |

### 16.7 审核结论

- 技术路线（方案 C 样式层 + Host Config）**维持不变**，无可推翻的证据。
- 6 处修正均为**实现细节与表述精度**，不改变架构、命名、功能范围与技术边界。
- 无技术阻塞，**准予进入阶段 0**。

---

## 17. 命名规范定稿（2026-11-27 收口）

本表为全项目命名的唯一权威；早先草案与草稿记录若与本表冲突，以本表为准。背景与核验过程见实施日志 E9。

| 对象 | 定稿值 | 代码/文档落点 | 备注 |
|---|---|---|---|
| 品牌 / 显示名 | **Cealum Tint** | locale meta、全部文档标题 | 拼写即 "Cealum"，有意为之，**不改**为 Caelum |
| 中文名 | **云岫着色** | locale zh meta、文档标题 | |
| 英文描述 | Customize your conversation colors. | package.json `description`、README | |
| GitHub 仓库 / 本地目录 / npm 包名 | `dsh-plugin-cealum-tint` | 仓库 github.com/mycherish/dsh-plugin-cealum-tint；package.json `name`（= Loader chunk id）；本地目录同名 | GitHub 权限账户 `mycherish`；远端现状（私有、空仓库）见 E9 |
| DSH 插件 ID | `cealum-tint` | `cordis.patch.yml` 行 id（**= 设置命名空间**） | 见下方 ⚠ 备注 |
| CSS 前缀 | `cealum-tint-` | `--cealum-tint-user-bg/--cealum-tint-user-fg`、`data-plugin="cealum-tint"`、样式表标记 | |
| 默认色 | `#2C6732` | 预置 id `deep-green`（旧值 `chatgpt-green` 仅作迁移别名保留并自动归一） | 迁移兼容代码不得删除 |
| 源码仓库元数据 | `repository` / `homepage` / `bugs` 指向上述仓库 | package.json（2026-11-27 已补） | |

**⚠ 命名空间备注**：命名要求中曾出现 `cealumTint`（驼峰）表述；实际交付与**已持久化配置**使用的命名空间是 **`cealum-tint`**（kebab，即 patch 行 id，`ctx.configForms.get('cealum-tint')`）。二者只能取一个，且必须以真实运行态为准——改成驼峰会使已保存配置失联。**用户已于 2026-11-27 确认维持 `cealum-tint`**，本表如实记录该差异，驼峰方案否决、不改代码。

**弃用名单**（设计过程出现过、现已弃用，代码与新增文档一律不得使用）：Cealum Hue、Cealum Chroma、Cealum Bubble、Cealum Glow、Cealum Palette、Cealum Prism、Cealum Canvas、Caelum Tint（错拼变体）、Caelum Bubble、Caelum Chroma、User Message Color。
