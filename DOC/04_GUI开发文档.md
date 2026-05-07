# GUI 开发文档

## 框架选型

Electron + React + TypeScript。选择理由：单文件打包、原生窗口管理、成熟的 Markdown 渲染生态。

## 主题系统

所有颜色定义在 `src/styles/theme.css` 的 CSS 变量中：

```css
--bg: #ffffff;       /* 纯白背景 */
--sidebar: #f7f8f9;  /* 侧边栏浅灰 */
--text: #2b2b2b;     /* 主文本 */
--muted: #6b6b6b;    /* 次要文本 */
--faint: #999999;    /* 辅助文本 */
--border: #e5e5e5;   /* 边框 */
--hover: #ebebeb;    /* 悬停 */
--accent: #4183C4;   /* 主强调色 */
--accent-pink: #e25571; /* LLM 按钮 */
--code-bg: #f6f8fa;  /* 代码背景 */
```

全局 `user-select: none`，编辑器区域用 `user-select: text` 覆盖。

## 窗口管理

Electron `frame: false` 实现无边框窗口：

- 标题栏：`-webkit-app-region: drag` 支持拖拽，按钮区域 `no-drag`
- 最小化/最大化/关闭通过 `ipcRenderer.invoke` 调用主进程
- 窗口阴影：`setBackgroundColor('#00000000')`

## 组件实现要点

### TitleBar
- 32px 高度，左贴边 4px
- 图标 + "MarkItDown-GUI" + 窗口控制按钮
- 双击最大化

### MenuBar
- 24px 高，标题栏下方
- 菜单下拉：`position: absolute` 定位，点击外部自动关闭
- 视图菜单显示勾选状态（侧边栏/源码模式/日志）

### Sidebar
- Flex 上下结构：文件树区域 `flex-1`，底部固定 40px 操作栏
- 空状态："没有打开的文件夹" 居中显示
- 标签切换用 `display: none/flex` 保持组件状态
- 下划线指示器：固定 100px 宽，居中于标签

### FileTree
- 文件系统通过 `electronAPI.readDir / statPath` 懒加载
- 缩进 `depth * 10px`
- 图标：16px 灰色 SVG 线条图标，按扩展名分类
- 多选：Ctrl 反选，Shift 范围选

### MarkdownViewer
- 预览模式：`marked` 渲染 HTML，通过 `.md-preview` CSS 类应用 Typora 风格排版
- 源码模式：`<pre>` 等宽字体
- 复制提示：点击后右侧浮现 "已复制"，1 秒淡出

### BottomBar
- 40px 高度，`padding: 0 4px`，与侧边栏底部平齐
- 左区：◀ 按钮、</> 按钮、状态文字、日志按钮、字符词数、耗时
- 右区：转换（蓝）、LLM 转换 + ▾（粉）

## 状态管理

Zustand `appStore`：

- `view` — 当前视图（editor/settings/history）
- `sidebarVisible / sidebarWidth` — 侧边栏
- `isSourceMode` — 源码/预览切换
- `treeItems[]` — 文件树节点
- `results: Map<string, ConversionResult>` — 转换结果缓存
- `logs[]` — 日志

组件通过 selector 按需订阅，避免无关渲染。

## 动画

- 侧边栏收起/展开：`transition: width 0.25s ease, min-width 0.25s ease`
- 日志面板展开/收起：`transition: max-height 0.2s ease`
