# docs-comment-mcp

MCP (Model Context Protocol) 服务器，用于让 AI 能够操作 Word/WPS 文档，添加批注和修订模式修改。

## 功能特性

### 批注功能
- ✅ 读取 .docx 文档内容和结构
- ✅ 在指定段落添加批注
- ✅ 列出文档中的所有批注

### 修订模式（Track Changes）
- ✅ 插入文本（带修订标记）
- ✅ 删除文本（带修订标记）
- ✅ 替换文本（智能词级对比）
- ✅ 修改整个段落（智能词级对比）
- ✅ 列出所有修订记录
- ✅ 自定义作者和时间戳
- ✅ **词级修订**：按词或短语分组修订，模拟人类自然的修改方式

### AI 智能审阅
- ✅ **suggest_revision 工具**：AI 像人类审阅者一样提出修改建议
  - 指出具体需要修改的文本片段
  - 提供建议的替换内容
  - 解释修改原因（语法错误、用词不当、表达不清等）
  - 可选择立即应用或仅作为建议供审阅
  - 使用自然的词级对比，而非机械的逐字对比

### 兼容性
- ✅ 完全兼容 Word 2016+ 和 WPS 2019+
- ✅ 支持中文内容和批注
- ✅ 修订可在 Word/WPS 中接受或拒绝

## 安装

### 前置要求

- Node.js 18 或更高版本
- npm 或 yarn

### 从源码安装

```bash
# 克隆仓库
git clone https://github.com/HammerCloth/docs-comment-mcp.git
cd docs-comment-mcp

# 安装依赖
npm install
# 如果网络问题，可使用淘宝镜像：
# npm install --registry=https://registry.npmmirror.com

# 构建项目
npm run build

# 全局安装（可选）
npm install -g .
```

## 配置

### Claude Desktop 配置

在 Claude Desktop 的配置文件中添加此 MCP 服务器：

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "docs-comment": {
      "command": "node",
      "args": ["/path/to/docs-comment-mcp/dist/index.js"]
    }
  }
}
```

如果全局安装，可以简化为：

```json
{
  "mcpServers": {
    "docs-comment": {
      "command": "docs-comment-mcp"
    }
  }
}
```

## 使用方法

### 1. 读取文档

```
User: 请读取 /path/to/document.docx 文件

Claude: [调用 read_document 工具]
文档包含 10 个段落：
1. 标题：Introduction
2. 正文：This is the first paragraph...
...
```

### 2. 添加批注

```
User: 在第 3 段添加批注："需要补充数据来源"

Claude: [调用 add_comment 工具]
已成功添加批注：
- 批注 ID: c1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o
- 位置：第 3 段
- 内容：需要补充数据来源
- 作者：AI Assistant
```

### 3. 列出批注

```
User: 列出文档中的所有批注

Claude: [调用 list_comments 工具]
文档包含 2 个批注：
1. [第 3 段] 需要补充数据来源 (AI Assistant)
2. [第 5 段] 建议添加引用 (AI Assistant)
```

### 4. 插入文本（修订模式）

```
User: 在第 2 段插入文本 "重要提示："，使用修订模式

Claude: [调用 insert_text 工具]
已成功插入文本（修订模式）：
- 修订 ID: abc123...
- 位置：第 2 段
- 文本：重要提示：
- 作者：AI Assistant
- 状态：待审核（可在 Word 中接受或拒绝）
```

### 5. 删除文本（修订模式）

```
User: 删除第 3 段中的 "临时数据" 文本，使用修订模式

Claude: [调用 delete_text 工具]
已标记删除（修订模式）：
- 修订 ID: def456...
- 位置：第 3 段
- 删除文本：临时数据
- 作者：AI Assistant
- 状态：待审核（可在 Word 中接受或拒绝）
```

### 6. 替换文本（修订模式）

```
User: 将第 1 段的 "初稿" 替换为 "正式版本"，使用修订模式

Claude: [调用 replace_text 工具]
已完成替换（修订模式）：
- 删除：初稿
- 插入：正式版本
- 位置：第 1 段
- 作者：AI Assistant
- 状态：待审核（可在 Word 中接受或拒绝）
```

### 7. 修改段落（修订模式）

```
User: 将第 5 段修改为 "这是更新后的段落内容"，使用修订模式

Claude: [调用 modify_paragraph 工具]
已修改段落（修订模式）：
- 位置：第 5 段
- 旧内容已标记删除
- 新内容已标记插入
- 作者：AI Assistant
- 状态：待审核（可在 Word 中接受或拒绝）
```

### 8. 列出所有修订

```
User: 列出文档中的所有修订记录

Claude: [调用 list_revisions 工具]
文档包含 3 个修订：
1. [插入] 第 2 段 - "重要提示：" (AI Assistant)
2. [删除] 第 3 段 - "临时数据" (AI Assistant)
3. [插入] 第 1 段 - "正式版本" (AI Assistant)
```

## MCP 工具

### 批注工具

#### read_document

读取 .docx 文件的内容和结构。

**输入参数**:
- `file_path` (string, 必需): 文件的绝对路径

**返回**:
```json
{
  "success": true,
  "data": {
    "file_path": "/path/to/document.docx",
    "paragraphs": [
      {
        "index": 0,
        "text": "Introduction",
        "style": "Heading1"
      }
    ],
    "total_paragraphs": 10,
    "has_comments": true,
    "comment_count": 2
  }
}
```

### add_comment

在指定段落添加批注。

**输入参数**:
- `file_path` (string, 必需): 文件的绝对路径
- `comment_text` (string, 必需): 批注内容
- `paragraph_index` (number, 必需): 段落索引（从 0 开始）
- `author` (string, 可选): 批注作者，默认 "AI Assistant"
- `initials` (string, 可选): 作者缩写，默认 "AI"

**返回**:
```json
{
  "success": true,
  "data": {
    "comment_id": "c1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o",
    "paragraph_index": 3,
    "comment_text": "需要补充数据来源",
    "author": "AI Assistant",
    "initials": "AI",
    "created_at": "2026-02-07T10:30:00.000Z"
  }
}
```

### list_comments

列出文档中的所有批注。

**输入参数**:
- `file_path` (string, 必需): 文件的绝对路径

**返回**:
```json
{
  "success": true,
  "data": {
    "file_path": "/path/to/document.docx",
    "comments": [
      {
        "comment_id": "c1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o",
        "paragraph_index": 3,
        "comment_text": "需要补充数据来源",
        "author": "AI Assistant",
        "initials": "AI",
        "created_at": "2026-02-07T10:30:00.000Z"
      }
    ],
    "total_comments": 1
  }
}
```

### 修订模式工具

#### insert_text

在文档中插入文本，使用修订模式标记。

**输入参数**:
- `file_path` (string, 必需): 文件的绝对路径
- `paragraph_index` (number, 必需): 段落索引（从 0 开始）
- `text` (string, 必需): 要插入的文本
- `position` (number, 可选): 插入位置，默认为段落末尾
- `author` (string, 可选): 作者名称，默认 "AI Assistant"
- `date` (string, 可选): ISO 日期字符串，默认当前时间

**返回**:
```json
{
  "revision_id": "abc123...",
  "revision_type": "insert",
  "paragraph_index": 2,
  "text": "重要提示：",
  "author": "AI Assistant",
  "date": "2026-02-07T12:00:00.000Z"
}
```

#### delete_text

删除文档中的文本，使用修订模式标记。

**输入参数**:
- `file_path` (string, 必需): 文件的绝对路径
- `paragraph_index` (number, 必需): 段落索引（从 0 开始）
- `text` (string, 必需): 要删除的文本（必须精确匹配）
- `author` (string, 可选): 作者名称，默认 "AI Assistant"
- `date` (string, 可选): ISO 日期字符串，默认当前时间

**返回**:
```json
{
  "revision_id": "def456...",
  "revision_type": "delete",
  "paragraph_index": 3,
  "text": "临时数据",
  "author": "AI Assistant",
  "date": "2026-02-07T12:00:00.000Z"
}
```

#### replace_text

替换文档中的文本，使用修订模式标记（删除旧文本 + 插入新文本）。

**输入参数**:
- `file_path` (string, 必需): 文件的绝对路径
- `paragraph_index` (number, 必需): 段落索引（从 0 开始）
- `old_text` (string, 必需): 要替换的文本（必须精确匹配）
- `new_text` (string, 必需): 新文本
- `author` (string, 可选): 作者名称，默认 "AI Assistant"
- `date` (string, 可选): ISO 日期字符串，默认当前时间

**返回**:
```json
{
  "delete": {
    "revision_id": "ghi789...",
    "revision_type": "delete",
    "paragraph_index": 1,
    "text": "初稿",
    "author": "AI Assistant",
    "date": "2026-02-07T12:00:00.000Z"
  },
  "insert": {
    "revision_id": "jkl012...",
    "revision_type": "insert",
    "paragraph_index": 1,
    "text": "正式版本",
    "author": "AI Assistant",
    "date": "2026-02-07T12:00:00.000Z"
  }
}
```

#### modify_paragraph

修改整个段落，使用修订模式标记（删除旧内容 + 插入新内容）。

**输入参数**:
- `file_path` (string, 必需): 文件的绝对路径
- `paragraph_index` (number, 必需): 段落索引（从 0 开始）
- `new_text` (string, 必需): 新的段落文本
- `author` (string, 可选): 作者名称，默认 "AI Assistant"
- `date` (string, 可选): ISO 日期字符串，默认当前时间

**返回**:
```json
{
  "delete": {
    "revision_id": "mno345...",
    "revision_type": "delete",
    "paragraph_index": 5,
    "text": "旧的段落内容",
    "author": "AI Assistant",
    "date": "2026-02-07T12:00:00.000Z"
  },
  "insert": {
    "revision_id": "pqr678...",
    "revision_type": "insert",
    "paragraph_index": 5,
    "text": "这是更新后的段落内容",
    "author": "AI Assistant",
    "date": "2026-02-07T12:00:00.000Z"
  }
}
```

#### list_revisions

列出文档中的所有修订记录。

**输入参数**:
- `file_path` (string, 必需): 文件的绝对路径

**返回**:
```json
[
  {
    "revision_id": "abc123...",
    "revision_type": "insert",
    "paragraph_index": 2,
    "text": "重要提示：",
    "author": "AI Assistant",
    "date": "2026-02-07T12:00:00.000Z"
  },
  {
    "revision_id": "def456...",
    "revision_type": "delete",
    "paragraph_index": 3,
    "text": "临时数据",
    "author": "AI Assistant",
    "date": "2026-02-07T12:00:00.000Z"
  }
]
```

## 开发

### 项目结构

```
docs-comment-mcp/
├── src/
│   ├── index.ts              # 入口文件
│   ├── server.ts             # MCP 服务器实现
│   ├── tools/                # MCP 工具
│   │   ├── read-document.ts
│   │   ├── add-comment.ts
│   │   └── list-comments.ts
│   ├── services/             # 业务逻辑
│   │   └── document-service.ts
│   ├── types/                # TypeScript 类型定义
│   │   └── index.ts
│   └── utils/                # 工具函数
│       ├── validation.ts
│       └── error-handler.ts
├── tests/                    # 测试文件
├── dist/                     # 编译输出
└── package.json
```

### 开发命令

```bash
# 开发模式（监听文件变化）
npm run dev

# 构建
npm run build

# 运行测试
npm run test

# 代码检查
npm run lint

# 代码格式化
npm run format
```

## 技术栈

- **语言**: TypeScript
- **运行时**: Node.js 18+
- **MCP SDK**: @modelcontextprotocol/sdk
- **文档处理**: docx
- **其他**: jszip, xml2js, uuid

## 兼容性

- ✅ Word 2016+
- ✅ WPS 2019+
- ✅ macOS, Windows, Linux
- ✅ 中文内容支持

## 限制

当前 MVP 版本的限制：

- 仅支持 .docx 格式（不支持 .doc）
- 批注添加在段落级别（不支持字符级别）
- 不支持批注回复功能
- 不支持批注样式自定义

## 未来计划

- [ ] 支持删除和修改批注
- [ ] 支持批注回复
- [ ] 支持字符级别批注
- [ ] 支持 .doc 格式
- [ ] 批注样式自定义

## 许可证

Apache-2.0

## 贡献

欢迎提交 Issue 和 Pull Request！

## 支持

如有问题，请在 GitHub 提交 Issue：https://github.com/HammerCloth/docs-comment-mcp/issues

## 仓库

- GitHub: https://github.com/HammerCloth/docs-comment-mcp
- 作者: HammerCloth
