/**
 * User-facing copy, registered into the Client locale service.
 *
 * Keys are flat and dot-namespaced; `{placeholders}` are interpolated by the
 * host translator.
 */

/** English copy (primary). */
export const en = {
  'section.label': 'Cealum Tint',
  'section.description': 'Customize the background colour of the messages you send.',

  'status.on': 'Active · {color}',
  'status.off': 'Off · native bubbles',
  'compat.pending': 'Waiting for the first message to verify compatibility.',
  'compat.missing':
    'This DSH version does not expose the user bubble marker; colours are inactive.',
  'compat.ok': 'Compatible with this DSH version.',

  'toggle.label': 'Custom bubble colour',
  'toggle.hint':
    'Applies to messages you send. Replies, tool calls and the composer stay untouched.',

  'presets.label': 'Presets',
  'preset.deep-green': 'Deep Green',
  'preset.ocean-blue': 'Ocean Blue',
  'preset.purple': 'Purple',
  'preset.amber': 'Amber',
  'preset.graphite': 'Graphite',

  'custom.label': 'Custom colour',
  'custom.hint': 'Accepts #RGB or #RRGGBB. Saved as upper-case #RRGGBB.',
  'custom.invalid': 'Enter a valid hex colour, for example #2C6732.',
  'custom.picker': 'Pick a colour',

  'text.label': 'Text colour',
  'text.auto': 'Auto contrast',
  'text.custom': 'Custom',
  'text.hint': 'Auto picks black or white from the bubble colour.',
  'text.invalid': 'Enter a valid hex colour, for example #FFFFFF.',

  'contrast.label': 'Contrast',
  'contrast.value': '{ratio}:1',
  'contrast.aaa': 'AAA',
  'contrast.aa': 'AA',
  'contrast.fail': 'Below AA',
  'contrast.unknown': 'Unknown',

  'preview.label': 'Preview',
  'preview.text': 'This is a test message, previewing the current bubble colour.',

  'reset.label': 'Restore defaults',
  'reset.hint': 'Clears the saved values and returns to Deep Green.',

  'error.save': 'Could not save the setting.',
} as const

/** Every locale key. */
export type CealumTintKey = keyof typeof en

/** Chinese copy (mirror of {@link en}). */
export const zh: Record<CealumTintKey, string> = {
  'section.label': '云岫着色',
  'section.description': '自定义你发送的消息气泡背景色。',

  'status.on': '已启用 · {color}',
  'status.off': '已关闭 · 原生气泡',
  'compat.pending': '等待首条消息以完成兼容性自检。',
  'compat.missing': '当前 DSH 版本未暴露用户气泡标识，配色未生效。',
  'compat.ok': '与当前 DSH 版本兼容。',

  'toggle.label': '启用自定义气泡配色',
  'toggle.hint': '只作用于你发送的消息；AI 回复、工具调用与输入框保持原样。',

  'presets.label': '预设颜色',
  'preset.deep-green': '深绿',
  'preset.ocean-blue': '海洋蓝',
  'preset.purple': '紫罗兰',
  'preset.amber': '琥珀',
  'preset.graphite': '石墨灰',

  'custom.label': '自定义颜色',
  'custom.hint': '支持 #RGB 或 #RRGGBB，保存时统一为大写 #RRGGBB。',
  'custom.invalid': '请输入合法的十六进制颜色，例如 #2C6732。',
  'custom.picker': '选择颜色',

  'text.label': '文字颜色',
  'text.auto': '自动适配',
  'text.custom': '手动指定',
  'text.hint': '自动模式按气泡颜色选择黑或白。',
  'text.invalid': '请输入合法的十六进制颜色，例如 #FFFFFF。',

  'contrast.label': '对比度',
  'contrast.value': '{ratio}:1',
  'contrast.aaa': 'AAA',
  'contrast.aa': 'AA',
  'contrast.fail': '低于 AA',
  'contrast.unknown': '未知',

  'preview.label': '预览',
  'preview.text': '这是一条测试消息，用于预览当前气泡颜色。',

  'reset.label': '恢复默认设置',
  'reset.hint': '清除已保存的值，回到深绿。',

  'error.save': '保存失败。',
}
