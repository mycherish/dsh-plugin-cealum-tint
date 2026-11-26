# Cealum Tint（云岫着色）

在 DeepSeek Harness 中为你**自己发送**的消息气泡着色——默认深绿，
也可以选任何颜色。AI 回复、工具卡片、思考与输入框保持原生不变。

**源码仓库**：<https://github.com/mycherish/dsh-plugin-cealum-tint> ·
问题反馈：<https://github.com/mycherish/dsh-plugin-cealum-tint/issues>

## 获取

**环境要求**——DeepSeek Harness Desktop（在 0.2.2-rc.5 实测）；Node.js ≥ 22；
git 渠道需要 `PATH` 上有 [pnpm](https://pnpm.io) ≥ 10（多数 DSH 环境已自带）。
首次用 CLI 安装前，目标 Profile 需在 Desktop 中打开过一次。

### 安装 —— Release 安装包（无需本地构建）

```sh
dsh plugin --profile desktop add \
  https://github.com/mycherish/dsh-plugin-cealum-tint/releases/download/v0.1.0-rc.3/dsh-plugin-cealum-tint-0.1.0-rc.3.tgz
```

也可以从 [Releases](https://github.com/mycherish/dsh-plugin-cealum-tint/releases)
下载 `.tgz` 后把命令指向本地文件； 或在应用内走 **插件 ▸ 添加插件**。

### 安装 —— 从 git（在本机构建）

```sh
dsh plugin --profile desktop add \
  'git+https://github.com/mycherish/dsh-plugin-cealum-tint.git#v0.1.0-rc.3'
```

pnpm 10 会拦截依赖构建脚本，而本仓库源码树要在 `prepare` 步骤构建
`index.js` / `client.js`。首次运行会报 pnpm 的
`ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED`，并打印需要放行的条目。放行一次后
重跑同一条 add 命令：

```sh
# 1. 在 ~/.dsh/profiles/desktop/pnpm-workspace.yaml 中添加
#    （pnpm 10 的键名是 onlyBuiltDependencies；更新的 pnpm 会打印 allowBuilds）：
onlyBuiltDependencies:
  - "dsh-plugin-cealum-tint"

# 2. 重跑上面同一条 `dsh plugin --profile desktop add ...`
```

`dsh` 会原样转发 pnpm 的提示，键名与包名照抄输出即可，无需猜测。以上流程已用
pnpm 10.26 端到端实测：第二次运行会拉源码、经 `prepare` 构建（esbuild，0 漏洞）
并注册插件。Release 安装包与 GUI 渠道都不需要这一步——包内自带构建产物。

### 安装 —— npm（发布前此节不出现在正式文档）

npm 包 `dsh-plugin-cealum-tint` 首次发布当天补充本节。

### 安装后

打开 **设置 ▸ 云岫着色**，选预设或填任意十六进制颜色；手动消息与 AI 确认
流程的回答会一起变色，即时生效、自动保存。

### 更新

换新版本号重跑安装命令即可（安装包渠道）：

```sh
dsh plugin --profile desktop add \
  https://github.com/mycherish/dsh-plugin-cealum-tint/releases/download/v0.1.0-rc.3/dsh-plugin-cealum-tint-0.1.0-rc.3.tgz
```

### 卸载

```sh
dsh plugin --profile desktop remove dsh-plugin-cealum-tint
```

卸载同时按清理契约移除注入的样式表与颜色变量，气泡回到原生根色。

### 让 DSH Agent 帮你安装

把下面这段粘贴给任意 DeepSeek Harness 会话：

```text
请把 DeepSeek Harness 插件 "Cealum Tint"（云岫着色）安装到当前 Profile。
从 https://github.com/mycherish/dsh-plugin-cealum-tint/releases 获取最新
Release 的已验证 tarball 附件，保存到本地后用插件管理工具安装
（对解包目录执行 install_bundle，或等价 CLI：dsh plugin --profile <本 Profile> add <tgz 路径>），
完成后启用，并确认插件注册表出现 "cealum-tint" 条目。设置页位于
设置 ▸ 云岫着色。
```

### 从源码

```sh
git clone https://github.com/mycherish/dsh-plugin-cealum-tint.git
cd dsh-plugin-cealum-tint
npm install && npm run verify
```

然后把检出目录装入 Profile（`dsh plugin --profile <name> add <目录>` 或
**插件 ▸ 添加插件**）。

## 项目文档

- 实施日志（E0–E9）：[docs/IMPLEMENTATION-LOG.md](docs/IMPLEMENTATION-LOG.md)
- 交付与验收报告：[docs/DELIVERY-REPORT.md](docs/DELIVERY-REPORT.md)
- 开发计划（含 §17 命名规范）：[docs/DEVELOPMENT-PLAN.md](docs/DEVELOPMENT-PLAN.md)

## 命名沿革

项目定名 **Cealum Tint（云岫着色）**——拼写就是 "Cealum"，属有意为之。
设计过程中弃用过的候选名：*Cealum Hue / Chroma / Bubble / Glow / Palette /
Prism / Canvas*、错拼变体 *Caelum Tint*、以及 *User Message Color*；这些
名字均已弃用，代码中不出现。旧预置 ID `chatgpt-green` 仅作为迁移别名保留，
用于把旧存档配置映射到 `deep-green`。

## 功能

- **五款预设**——深绿 `#2C6732`、海洋蓝 `#245B82`、紫罗兰 `#604B83`、
  琥珀 `#805B26`、石墨灰 `#414141`。
- **任意十六进制颜色**——接受 `#RGB` 与 `#RRGGBB`，统一保存为大写
  `#RRGGBB`；非法值不会进入 CSS。
- **文字颜色**——按 WCAG 对比度自动选择黑或白，或手动指定，并提供
  AA/AAA 实时读数。
- **确认回复**——对 AI 确认问题（询问卡片）提交的回答与手动消息使用
  完全相同的自定义气泡颜色；未回答的卡片、AI 回复、审批卡片一律原样。
- **实时预览**——预览使用的正是聊天气泡同一个
  `div[data-message-bubble]` 接缝，预览即所得。
- **随时关闭**——一键回到原生气泡；样式表回退值指向宿主自己的设计令牌。

## 设置入口

设置 → **云岫着色**。修改即时生效并自动保存（写入 Profile 用户配置层，
重启后保持）。

## 工作原理

插件分两半：

- **Host** 侧只拥有一件事：`cealum-tint` 配置命名空间（五个 `.volatile()`
  字段：`enabled`、`preset`、`bubbleColor`、`textMode`、`textColor`）；
- **Client** 侧注入两张样式表——

  ```css
  /* 手动用户消息 */
  div[data-message-bubble]{
    background-color:var(--cealum-tint-user-bg, var(--dsw-specific-bubble));
    color:var(--cealum-tint-user-fg, var(--dsw-alias-label-primary));
  }

  /* 确认流程已回答的回复 */
  div[data-reply-outcome="answered"] > div:first-child > :first-child{
    background-color:var(--cealum-tint-user-bg, var(--dsw-specific-bubble));
    color:var(--cealum-tint-user-fg, var(--dsw-alias-label-primary));
  }
  ```

  外加两个挂在文档元素上的自定义属性。不做主题覆盖、不接管聊天节点、
  不改写历史：本插件只样式化这两个聊天选择器（手动气泡与已回答的确认
  回复气泡，声明逐字节一致），只触碰这两个以自己命名的自定义属性。

## 兼容性自检

与当前 DSH 版本的兼容性采用**事件驱动**验证：MutationObserver 等到第一条
真实用户气泡出现才算数。未观察到消息时设置页显示「等待中」；若某个版本
不再带用户气泡标识，设置页会如实说明（此时配色保持未激活）。自检永不
阻塞或拦截注入本身。

## 构建与测试

```sh
npm install
npm run verify   # 构建 + 类型检查 + 测试
```

产物：`index.js`（Host）、`client.js`（浏览器，ModuleLoader 封装）。

## 边界与承诺

- 仅用于 Desktop Profile；以 bundle 形式安装（`cordis.patch.yml` 插入一行
  id 为 `cealum-tint` 的记录）。
- 不读取、不修改聊天历史，不碰其他插件与 DSH 核心。
- 卸载时清除样式表（标记 `data-plugin="cealum-tint"`）、自定义属性与已
  保存的配置字段。

## 参与贡献

欢迎在 <https://github.com/mycherish/dsh-plugin-cealum-tint> 提 Issue 与
Pull Request。提交前请运行 `npm run verify`，并尽量让改动被现有测试覆盖。
