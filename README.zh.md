# Cealum Tint（云岫着色）

在 DeepSeek Harness 中为你**自己发送**的消息气泡着色——默认深绿，
也可以选任何颜色。AI 回复、工具卡片、思考与输入框保持原生不变。

## 功能

- **五款预设**——深绿 `#2C6732`、海洋蓝 `#245B82`、紫罗兰 `#604B83`、
  琥珀 `#805B26`、石墨灰 `#414141`。
- **任意十六进制颜色**——接受 `#RGB` 与 `#RRGGBB`，统一保存为大写
  `#RRGGBB`；非法值不会进入 CSS。
- **文字颜色**——按 WCAG 对比度自动选择黑或白，或手动指定，并提供
  AA/AAA 实时读数。
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
- **Client** 侧注入一条样式规则——

  ```css
  div[data-message-bubble]{
    background-color:var(--cealum-tint-user-bg, var(--dsw-specific-bubble));
    color:var(--cealum-tint-user-fg, var(--dsw-alias-label-primary));
  }
  ```

  外加两个挂在文档元素上的自定义属性。不做主题覆盖、不接管聊天节点、
  不改写历史：本插件只样式化这一个选择器，只触碰这两个以自己命名的
  自定义属性。

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
