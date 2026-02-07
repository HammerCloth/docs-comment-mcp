# docs-comment-mcp

MCP (Model Context Protocol) 服务器，用于让 AI 能够操作 Word/WPS 文档，添加批注和评论。

## 功能特性

- ✅ 读取 .docx 文档内容和结构
- ✅ 在指定段落添加批注
- ✅ 列出文档中的所有批注
- ✅ 完全兼容 Word 2016+ 和 WPS 2019+
- ✅ 支持中文内容和批注

## 安装

### 前置要求

- Node.js 18 或更高版本
- npm 或 yarn

### 从源码安装

```bash
# 克隆仓库
git clone <repository-url>
cd docs-comment-mcp

# 安装依赖
npm install

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

## MCP 工具

### read_document

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

如有问题，请提交 Issue 或联系维护者。
