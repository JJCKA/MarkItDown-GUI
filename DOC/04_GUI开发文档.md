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

全局 `user-select: none`，编辑器区域和表单输入元素用 `user-select: text` 覆盖。

## 窗口管理

Electron `frame: false` 实现无边框窗口：

- 标题栏：`-webkit-app-region: drag` 支持拖拽，按钮区域 `no-drag`
- 最小化/最大化/关闭通过 `ipcRenderer.invoke` 调用主进程

## 组件实现要点

### TitleBar
- 32px 高度，左贴边 4px
- 图标 + "MarkItDown-GUI" + 窗口控制按钮
- 双击最大化

### MenuBar
- 24px 高，标题栏下方
- 菜单下拉：`position: absolute` 定位，点击外部自动关闭
- 视图菜单显示勾选状态（侧边栏/预览/源码/对比/日志）
- 预览/源码选项直接设置 `viewMode`，对比选项切换 `compareVisible`

### Sidebar
- Flex 上下结构：文件树区域 `flex-1`，底部固定 40px 操作栏
- 空状态："没有打开的文件夹" 居中显示
- 标签切换用 `display: none/flex` 保持组件状态
- 下划线指示器：固定 100px 宽，居中于标签
- 底部图标：打开/设置/历史/统计

### FileTree
- 文件系统通过 `electronAPI.readDir / statPath` 懒加载
- 缩进 `depth * 10px`
- 图标：16px 灰色 SVG 线条图标，按扩展名分类
- 多选：Ctrl 反选，Shift 范围选

### MilkdownEditor
- **预览模式**：`marked` 渲染 HTML，自定义 renderer 支持任务列表和代码语言标签
- **源码模式**：`<textarea>` 等宽字体可编辑，修改后预览实时更新
- **对比模式**：左右分屏，左侧原始提取、右侧最终结果，可拖拽分割线调整比例
- 复制提示：点击后右侧浮现 "已复制"，1 秒淡出
- 导出时传递 `source_path` 给后端，自动更新缓存

### BottomBar
- 40px 高度，`padding: 0 4px`，与侧边栏底部平齐
- 左区：◀ 按钮、👁/</> 按钮（预览/源码切换）、⊞ 对比按钮、状态文字、日志按钮、队列按钮、字符词数、耗时、进度条
- 右区：转换（蓝）、LLM 转换 + ▾（粉）
- 进度条：`maxWidth: 1200`，`onMouseDown: stopPropagation` 防止触发侧边栏拖拽
- 批量转换时逐文件处理，每个文件调用 `recordConversion` 更新统计

### PageWrapper
- 设置/历史/统计页面共用的标题栏容器
- 48px 高度，左侧标题（20px 粗体），右侧叉号按钮（18px）
- 子容器 `flex: 1, overflow: auto` 支持内容滚动

### QueuePanel
- `position: fixed` 浮层，底部右侧
- 显示队列中每个文件的状态（等待/转换中/完成/失败/已取消）
- 操作按钮：取消剩余、全部导出、清除
- 全部导出使用 `Path.join` 构建路径（跨平台兼容）

### StatsPanel
- 2x3 网格卡片布局
- 数据从 localStorage 加载，每次转换后实时更新

### HistoryPanel
- 历史记录列表，带时间戳、缓存状态标记、成功/失败、字符数、耗时
- 已缓存项带淡蓝色背景（`rgba(65, 131, 196, 0.04)`），可点击查看
- 未缓存项普通背景
- 底部显示「当前保留前 n 条缓存记录」
- 点击历史项时设置 `skipAutoSelect` 标志，防止 App.tsx 的 useEffect 覆盖 activeResult

### LLMPopup
- `position: fixed` 浮层，底部右侧
- 点击外部 / Escape 关闭
- 开关变更立即保存到后端

## 状态管理

Zustand `appStore`：

- `view` — 当前视图（editor/settings/history/stats）
- `viewMode` — 预览/源码模式
- `compareVisible` — 对比视图开关
- `sidebarVisible / sidebarWidth` — 侧边栏
- `treeItems[]` — 文件树节点
- `selectedPaths[]` — 选中的文件路径
- `results: Map<string, ConversionResult>` — 转换结果缓存
- `queueItems[]` — 转换队列
- `logs[]` — 日志
- `historyItems[]` — 历史记录
- `stats` — 转换统计（持久化到 localStorage）
- `skipAutoSelect` — 跳过 useEffect 自动选择的标志

组件通过 selector 按需订阅，避免无关渲染。

## 侧边栏分割线

5px 宽的透明热区，内部 1px 可见线条（`position: absolute, left: 0`）。鼠标悬停时线条变蓝变粗到 5px。对比视图中的分割线使用相同模式。

## 动画

- 侧边栏收起/展开：`transition: width 0.25s ease, min-width 0.25s ease`
- 日志面板展开/收起：`transition: max-height 0.2s ease`
- 分割线悬停：`transition: background 0.15s, width 0.1s`
