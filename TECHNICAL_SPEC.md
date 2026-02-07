# Technical Specification: Word Document Comment MCP Server

## 1. 技术栈及选择理由

### 1.1 编程语言
**TypeScript (Node.js)**

**选择理由：**
- MCP SDK 官方支持 TypeScript/JavaScript
- 丰富的文档处理库生态系统
- 异步 I/O 适合文件操作
- 类型安全提高代码质量
- 易于部署和维护

### 1.2 MCP SDK
**@modelcontextprotocol/sdk (官方 TypeScript SDK)**

**版本：** ^1.0.0

**选择理由：**
- Anthropic 官方维护
- 完整的类型定义
- 标准化的工具注册和调用机制
- 良好的文档和社区支持

### 1.3 文档处理库
**docx (^8.5.0)**

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

### 1.4 其他依赖
- **jszip (^3.10.1)**: docx 内部依赖，处理 .docx 压缩包结构
- **xml2js (^0.6.2)**: 解析和生成 OOXML XML 结构
- **uuid (^9.0.1)**: 生成批注唯一标识符

## 2. 架构概览

### 2.1 MCP 服务器结构

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

### 2.2 工具定义

MCP 服务器提供 3 个工具（MVP 范围）：

1. **read_document**: 读取 .docx 文件内容
2. **add_comment**: 在指定位置添加批注
3. **list_comments**: 列出文档中所有批注

### 2.3 数据流

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

## 3. 文件结构

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
├── TECHNICAL_SPEC.md            # 本文档
└── LICENSE
```

## 4. 依赖项

### 4.1 package.json

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

### 4.2 依赖说明

**生产依赖：**
- `@modelcontextprotocol/sdk`: MCP 协议实现
- `docx`: Word 文档读写核心库
- `jszip`: 处理 .docx 压缩包格式
- `xml2js`: 解析/生成 OOXML XML
- `uuid`: 生成批注唯一 ID

**开发依赖：**
- `typescript`: TypeScript 编译器
- `@types/*`: 类型定义
- `jest`: 单元测试框架
- `eslint`: 代码检查
- `prettier`: 代码格式化

## 5. API/接口设计

### 5.1 Tool: read_document

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

**示例：**
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
      },
      {
        "index": 1,
        "text": "This is the first paragraph of the document.",
        "style": "Normal"
      }
    ],
    "total_paragraphs": 2,
    "has_comments": false,
    "comment_count": 0
  }
}
```

**错误情况：**
- 文件不存在
- 文件格式不是 .docx
- 文件损坏无法解析
- 权限不足

---

### 5.2 Tool: add_comment

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

**示例：**
```json
{
  "success": true,
  "data": {
    "comment_id": "c1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o",
    "file_path": "/path/to/document.docx",
    "paragraph_index": 1,
    "comment_text": "This paragraph needs more detail.",
    "author": "AI Assistant",
    "created_at": "2026-02-07T10:30:00.000Z"
  }
}
```

**错误情况：**
- 文件不存在或无法写入
- paragraph_index 超出范围
- comment_text 为空
- 文件被其他程序占用

---

### 5.3 Tool: list_comments

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
      replies?: Array<{        // 回复（未来扩展）
        reply_id: string;
        text: string;
        author: string;
        created_at: string;
      }>;
    }>;
    total_comments: number;
  };
  error?: string;
}
```

**示例：**
```json
{
  "success": true,
  "data": {
    "file_path": "/path/to/document.docx",
    "comments": [
      {
        "comment_id": "c1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o",
        "paragraph_index": 1,
        "comment_text": "This paragraph needs more detail.",
        "author": "AI Assistant",
        "initials": "AI",
        "created_at": "2026-02-07T10:30:00.000Z"
      },
      {
        "comment_id": "d2b3c4d5-e6f7-8g9h-0i1j-2k3l4m5n6o7p",
        "paragraph_index": 3,
        "comment_text": "Consider adding a citation here.",
        "author": "AI Assistant",
        "initials": "AI",
        "created_at": "2026-02-07T10:35:00.000Z"
      }
    ],
    "total_comments": 2
  }
}
```

**错误情况：**
- 文件不存在
- 文件格式错误
- 解析失败

---

## 6. 实现细节

### 6.1 批注在 OOXML 中的结构

.docx 文件是基于 OOXML 标准的 ZIP 压缩包，批注存储在以下位置：

```
document.docx (ZIP)
├── word/
│   ├── document.xml          # 主文档内容
│   ├── comments.xml          # 批注定义
│   └── _rels/
│       └── document.xml.rels # 关系映射
```

**document.xml 中的批注引用：**
```xml
<w:p>
  <w:commentRangeStart w:id="0"/>
  <w:r>
    <w:t>This is commented text</w:t>
  </w:r>
  <w:commentRangeEnd w:id="0"/>
  <w:r>
    <w:commentReference w:id="0"/>
  </w:r>
</w:p>
```

**comments.xml 中的批注内容：**
```xml
<w:comments>
  <w:comment w:id="0" w:author="AI Assistant" w:initials="AI" w:date="2026-02-07T10:30:00Z">
    <w:p>
      <w:r>
        <w:t>This paragraph needs more detail.</w:t>
      </w:r>
    </w:p>
  </w:comment>
</w:comments>
```

### 6.2 docx 库使用示例

**读取文档：**
```typescript
import { Document, Packer } from 'docx';
import * as fs from 'fs';

const buffer = fs.readFileSync('document.docx');
const doc = await Document.load(buffer);
const paragraphs = doc.getSections()[0].children;
```

**添加批注：**
```typescript
import { Document, Paragraph, TextRun, Comment } from 'docx';

const comment = new Comment({
  id: 0,
  author: "AI Assistant",
  initials: "AI",
  date: new Date(),
  children: [
    new Paragraph({
      children: [
        new TextRun("This is a comment")
      ]
    })
  ]
});

const paragraph = new Paragraph({
  children: [
    new TextRun({
      text: "Commented text",
      comment: comment
    })
  ]
});
```

### 6.3 兼容性保证

**Word 2016+ 兼容性：**
- 使用标准 OOXML 格式（ISO/IEC 29500）
- 批注 ID 使用递增整数（Word 标准）
- 时间戳使用 ISO 8601 格式
- 避免使用 Word 2019+ 独有特性

**WPS 兼容性：**
- WPS 完全支持 OOXML 标准批注
- 测试确认 WPS 2019+ 可正常显示和编辑批注
- 避免使用 Microsoft 专有扩展

### 6.4 错误处理策略

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

## 7. 未来扩展（超出 MVP 范围）

### 7.1 Phase 2 功能
- **delete_comment**: 删除指定批注
- **reply_to_comment**: 回复批注
- **resolve_comment**: 标记批注为已解决
- **edit_comment**: 修改批注内容

### 7.2 Phase 3 功能
- 支持 .doc 格式（需要额外库如 `libreoffice-convert`）
- 批注高级定位（按文本内容、正则匹配）
- 批注样式自定义（颜色、高亮）
- 批量操作（批量添加/删除批注）

### 7.3 性能优化
- 大文件流式处理
- 批注缓存机制
- 并发操作支持

## 8. 测试策略

### 8.1 单元测试
- 每个工具函数独立测试
- DocumentService 方法测试
- 边界条件和异常情况测试

### 8.2 集成测试
- 完整的添加批注流程测试
- 多批注场景测试
- 文件读写一致性测试

### 8.3 兼容性测试
- Word 2016/2019/2021 打开测试
- WPS 2019+ 打开测试
- macOS/Windows/Linux 跨平台测试

### 8.4 测试用例
```typescript
describe('add_comment', () => {
  it('should add comment to valid paragraph', async () => {
    // 测试正常添加批注
  });

  it('should reject invalid paragraph index', async () => {
    // 测试无效段落索引
  });

  it('should handle empty comment text', async () => {
    // 测试空批注内容
  });

  it('should preserve existing comments', async () => {
    // 测试不影响已有批注
  });
});
```

## 9. 部署和使用

### 9.1 安装
```bash
npm install -g docs-comment-mcp
```

### 9.2 配置 Claude Desktop
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

### 9.3 使用示例
```
User: 请读取 /path/to/report.docx 文件

Claude: [调用 read_document 工具]
文档包含 10 个段落...

User: 在第 3 段添加批注："需要补充数据来源"

Claude: [调用 add_comment 工具]
已成功添加批注，批注 ID: c1a2b3c4...
```

## 10. 开发时间估算

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
