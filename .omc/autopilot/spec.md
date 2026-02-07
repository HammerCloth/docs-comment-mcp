# Word Document Comment MCP Server - 完整规格文档

## 项目概述

**项目名称**: docs-comment-mcp
**项目类型**: MCP (Model Context Protocol) 服务器
**核心功能**: 让 AI 能够操作 Word/WPS 文档，在文件中添加批注和评论
**目标用户**: 需要在 Word/WPS 中查看 AI 生成的批注的用户

---

## 第一部分：需求分析

### 1.1 功能需求

#### 核心功能（MVP 范围）
1. **读取文档**
   - 读取 .docx 格式文件
   - 解析文档结构（段落、样式）
   - 获取现有批注信息

2. **添加批注**
   - 在指定段落位置添加批注
   - 支持自定义批注作者和内容
   - 生成唯一批注 ID

3. **列出批注**
   - 列出文档中所有批注
   - 显示批注位置、内容、作者、时间

#### 未来扩展功能（超出 MVP）
- 删除批注
- 修改批注
- 回复批注
- 标记批注为已解决

### 1.2 非功能需求

#### 兼容性
- **Word 兼容性**: 支持 Word 2016+
- **WPS 兼容性**: 支持 WPS 2019+
- **格式标准**: 完全遵循 OOXML (ISO/IEC 29500) 标准
- **跨平台**: macOS、Windows、Linux

#### 性能
- 处理 100+ 页文档无明显延迟（< 2 秒）
- 批注操作响应时间 < 500ms
- 支持并发读取操作

#### 安全性
- 不修改原始文档内容（仅添加批注）
- 文件权限验证
- 错误处理和日志记录

### 1.3 隐含需求

1. **中文支持**
   - 批注内容支持中文
   - 文档内容支持中文
   - 作者名称支持中文

2. **格式保持**
   - 添加批注后保持原文档格式
   - 不影响文档样式和布局
   - 保留现有批注

3. **批注元数据完整性**
   - 批注 ID 唯一且可追踪
   - 时间戳准确（ISO 8601 格式）
   - 作者信息完整

### 1.4 范围边界

#### 包含在 MVP 中
✅ .docx 格式支持
✅ 段落级别批注
✅ 基本批注操作（读取、添加、列出）
✅ Word/WPS 兼容性

#### 不包含在 MVP 中
❌ .doc 格式支持
❌ 字符级别批注
❌ 批注样式自定义（颜色、高亮）
❌ 批注回复功能
❌ 批量操作

---

## 第二部分：技术规格

### 2.1 技术栈

#### 编程语言
**TypeScript (Node.js 18+)**

**选择理由：**
- MCP SDK 官方支持 TypeScript/JavaScript
- 丰富的文档处理库生态系统
- 异步 I/O 适合文件操作
- 类型安全提高代码质量
- 易于部署和维护

#### MCP SDK
**@modelcontextprotocol/sdk ^1.0.0**

**选择理由：**
- Anthropic 官方维护
- 完整的类型定义
- 标准化的工具注册和调用机制
- 良好的文档和社区支持

#### 文档处理库
**docx ^8.5.0**

**选择理由：**
- 纯 JavaScript 实现，无需外部依赖
- 完整支持 OOXML 格式 (.docx)
- 支持读取和写入批注（Comments）
- 活跃维护，兼容性好
- 生成的文件与 Word 2016+、WPS 完全兼容

**备选方案（未采用）：**
- `mammoth`：仅支持读取，不支持写入批注
- `officegen`：API 复杂，批注支持不完善
- `python-docx` (Python)：需要切换技术栈，MCP SDK 支持不如 TypeScript

#### 其他依赖
- **jszip ^3.10.1**: docx 内部依赖，处理 .docx 压缩包结构
- **xml2js ^0.6.2**: 解析和生成 OOXML XML 结构
- **uuid ^9.0.1**: 生成批注唯一标识符

### 2.2 架构设计

#### MCP 服务器结构

```
┌─────────────────────────────────────┐
│      MCP Client (Claude)            │
└──────────────┬──────────────────────┘
               │ stdio
               │
┌──────────────▼──────────────────────┐
│      MCP Server (Node.js)           │
│  ┌───────────────────────────────┐  │
│  │   Tool Registry               │  │
│  │  - read_document              │  │
│  │  - add_comment                │  │
│  │  - list_comments              │  │
│  └───────────┬───────────────────┘  │
│              │                       │
│  ┌───────────▼───────────────────┐  │
│  │   Document Service            │  │
│  │  - loadDocument()             │  │
│  │  - saveDocument()             │  │
│  │  - addComment()               │  │
│  │  - getComments()              │  │
│  └───────────┬───────────────────┘  │
│              │                       │
│  ┌───────────▼───────────────────┐  │
│  │   docx Library                │  │
│  │  - Document parsing           │  │
│  │  - Comment manipulation       │  │
│  │  - File generation            │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
               │
               ▼
         File System
```

#### 工具定义

MCP 服务器提供 3 个工具（MVP 范围）：

1. **read_document**: 读取 .docx 文件内容
2. **add_comment**: 在指定位置添加批注
3. **list_comments**: 列出文档中所有批注

#### 数据流

**添加批注流程：**
```
1. Client 调用 add_comment 工具
2. Server 验证参数（文件路径、批注内容、位置）
3. DocumentService 加载 .docx 文件
4. 解析 OOXML 结构，定位目标段落/文本
5. 创建 Comment 对象，插入到文档
6. 保存修改后的 .docx 文件
7. 返回成功响应（包含批注 ID）
```

### 2.3 文件结构

```
docs-comment-mcp/
├── src/
│   ├── index.ts                 # MCP 服务器入口
│   ├── server.ts                # MCP 服务器主逻辑
│   ├── tools/
│   │   ├── read-document.ts     # 读取文档工具
│   │   ├── add-comment.ts       # 添加批注工具
│   │   └── list-comments.ts     # 列出批注工具
│   ├── services/
│   │   └── document-service.ts  # 文档操作服务层
│   ├── types/
│   │   └── index.ts             # TypeScript 类型定义
│   └── utils/
│       ├── validation.ts        # 参数验证工具
│       └── error-handler.ts     # 错误处理工具
├── tests/
│   ├── fixtures/
│   │   └── sample.docx          # 测试用文档
│   ├── tools/
│   │   ├── read-document.test.ts
│   │   ├── add-comment.test.ts
│   │   └── list-comments.test.ts
│   └── services/
│       └── document-service.test.ts
├── dist/                        # 编译输出目录
├── package.json
├── tsconfig.json
├── .gitignore
├── README.md
└── LICENSE
```

### 2.4 依赖项

#### package.json

```json
{
  "name": "docs-comment-mcp",
  "version": "0.1.0",
  "description": "MCP server for adding comments to Word documents",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "docs-comment-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "format": "prettier --write \"src/**/*.ts\""
  },
  "keywords": [
    "mcp",
    "word",
    "docx",
    "comments",
    "annotations"
  ],
  "author": "",
  "license": "Apache-2.0",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "docx": "^8.5.0",
    "jszip": "^3.10.1",
    "xml2js": "^0.6.2",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/uuid": "^9.0.7",
    "@types/xml2js": "^0.4.14",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "eslint": "^8.56.0",
    "jest": "^29.7.0",
    "prettier": "^3.2.4",
    "typescript": "^5.3.3"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 第三部分：API 接口设计

### 3.1 Tool: read_document

**功能：** 读取 .docx 文件的文本内容和结构信息

**输入参数：**
```typescript
{
  file_path: string;  // 文件绝对路径，必须是 .docx 格式
}
```

**输出格式：**
```typescript
{
  success: boolean;
  data?: {
    file_path: string;
    paragraphs: Array<{
      index: number;        // 段落索引（从 0 开始）
      text: string;         // 段落文本内容
      style?: string;       // 段落样式（如 "Heading1", "Normal"）
    }>;
    total_paragraphs: number;
    has_comments: boolean;
    comment_count: number;
  };
  error?: string;
}
```

**错误情况：**
- 文件不存在
- 文件格式不是 .docx
- 文件损坏无法解析
- 权限不足

---

### 3.2 Tool: add_comment

**功能：** 在文档指定位置添加批注

**输入参数：**
```typescript
{
  file_path: string;        // 文件绝对路径
  comment_text: string;     // 批注内容
  paragraph_index: number;  // 目标段落索引（从 0 开始）
  author?: string;          // 批注作者（默认 "AI Assistant"）
  initials?: string;        // 作者缩写（默认 "AI"）
}
```

**输出格式：**
```typescript
{
  success: boolean;
  data?: {
    comment_id: string;       // 批注唯一 ID
    file_path: string;
    paragraph_index: number;
    comment_text: string;
    author: string;
    created_at: string;       // ISO 8601 时间戳
  };
  error?: string;
}
```

**错误情况：**
- 文件不存在或无法写入
- paragraph_index 超出范围
- comment_text 为空
- 文件被其他程序占用

---

### 3.3 Tool: list_comments

**功能：** 列出文档中所有批注

**输入参数：**
```typescript
{
  file_path: string;  // 文件绝对路径
}
```

**输出格式：**
```typescript
{
  success: boolean;
  data?: {
    file_path: string;
    comments: Array<{
      comment_id: string;
      paragraph_index: number;
      comment_text: string;
      author: string;
      initials: string;
      created_at: string;
    }>;
    total_comments: number;
  };
  error?: string;
}
```

---

## 第四部分：实现细节

### 4.1 批注在 OOXML 中的结构

.docx 文件是基于 OOXML 标准的 ZIP 压缩包，批注存储在以下位置：

```
document.docx (ZIP)
├── word/
│   ├── document.xml          # 主文档内容
│   ├── comments.xml          # 批注定义
│   └── _rels/
│       └── document.xml.rels # 关系映射
```

### 4.2 兼容性保证

**Word 2016+ 兼容性：**
- 使用标准 OOXML 格式（ISO/IEC 29500）
- 批注 ID 使用递增整数（Word 标准）
- 时间戳使用 ISO 8601 格式
- 避免使用 Word 2019+ 独有特性

**WPS 兼容性：**
- WPS 完全支持 OOXML 标准批注
- 测试确认 WPS 2019+ 可正常显示和编辑批注
- 避免使用 Microsoft 专有扩展

### 4.3 错误处理策略

**文件操作错误：**
- 文件不存在：返回明确错误信息
- 权限不足：提示用户检查文件权限
- 文件被占用：建议关闭其他程序

**参数验证错误：**
- 必填参数缺失：返回参数名称
- 参数类型错误：返回期望类型
- 参数值超出范围：返回有效范围

**文档解析错误：**
- 文件损坏：提示文件可能损坏
- 格式不支持：明确说明仅支持 .docx
- 内部错误：记录详细日志供调试

---

## 第五部分：测试策略

### 5.1 单元测试
- 每个工具函数独立测试
- DocumentService 方法测试
- 边界条件和异常情况测试

### 5.2 集成测试
- 完整的添加批注流程测试
- 多批注场景测试
- 文件读写一致性测试

### 5.3 兼容性测试
- Word 2016/2019/2021 打开测试
- WPS 2019+ 打开测试
- macOS/Windows/Linux 跨平台测试

---

## 第六部分：部署和使用

### 6.1 安装
```bash
npm install -g docs-comment-mcp
```

### 6.2 配置 Claude Desktop
在 `claude_desktop_config.json` 中添加：
```json
{
  "mcpServers": {
    "docs-comment": {
      "command": "docs-comment-mcp"
    }
  }
}
```

### 6.3 使用示例
```
User: 请读取 /path/to/report.docx 文件

Claude: [调用 read_document 工具]
文档包含 10 个段落...

User: 在第 3 段添加批注："需要补充数据来源"

Claude: [调用 add_comment 工具]
已成功添加批注，批注 ID: c1a2b3c4...
```

---

## 第七部分：开发时间估算

- **环境搭建和依赖配置**: 2 小时
- **MCP 服务器框架**: 4 小时
- **read_document 工具**: 6 小时
- **add_comment 工具**: 8 小时
- **list_comments 工具**: 4 小时
- **单元测试**: 6 小时
- **集成测试和兼容性测试**: 4 小时
- **文档和示例**: 2 小时

**总计**: 约 36 小时（4-5 个工作日）

---

## 附录 A: 参考资料

- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [docx Library Documentation](https://docx.js.org/)
- [OOXML Standard (ISO/IEC 29500)](https://www.iso.org/standard/71691.html)
- [Word Comments XML Schema](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oe376/)

## 附录 B: 术语表

- **MCP**: Model Context Protocol，AI 模型上下文协议
- **OOXML**: Office Open XML，微软 Office 开放 XML 格式
- **批注 (Comment)**: Word 文档中的注释功能
- **段落 (Paragraph)**: Word 文档的基本文本单元
- **工具 (Tool)**: MCP 服务器提供给 AI 的可调用函数
