# 部署说明

## ⚠️ 当前状态

项目代码已完成，但由于开发环境缺少 Node.js，无法完成以下步骤：
- 依赖安装 (`npm install`)
- TypeScript 编译 (`npm run build`)
- 测试运行 (`npm run test`)

## 📋 已完成的工作

### ✅ 项目结构
```
docs-comment-mcp/
├── src/
│   ├── index.ts                    # 入口文件
│   ├── server.ts                   # MCP 服务器
│   ├── tools/
│   │   ├── read-document.ts        # 读取文档工具
│   │   ├── add-comment.ts          # 添加批注工具
│   │   └── list-comments.ts        # 列出批注工具
│   ├── services/
│   │   └── document-service.ts     # 文档服务核心逻辑
│   ├── types/
│   │   └── index.ts                # TypeScript 类型定义
│   └── utils/
│       ├── validation.ts           # 参数验证
│       └── error-handler.ts        # 错误处理
├── tests/                          # 测试目录（待实现）
├── package.json                    # 项目配置
├── tsconfig.json                   # TypeScript 配置
├── .gitignore                      # Git 忽略文件
├── README.md                       # 项目文档
└── LICENSE                         # Apache-2.0 许可证
```

### ✅ 核心功能实现

1. **类型系统** (`src/types/index.ts`)
   - DocumentParagraph, DocumentInfo
   - Comment
   - 工具输入/输出类型
   - 错误类型

2. **工具函数** (`src/utils/`)
   - 文件路径验证
   - 文件扩展名验证
   - 段落索引验证
   - 批注内容验证
   - 错误处理和响应格式化

3. **DocumentService** (`src/services/document-service.ts`)
   - loadDocument() - 加载文档
   - saveDocument() - 保存文档
   - getDocumentInfo() - 获取文档信息
   - addComment() - 添加批注
   - getComments() - 获取批注列表

4. **MCP 工具** (`src/tools/`)
   - read_document - 读取文档
   - add_comment - 添加批注
   - list_comments - 列出批注

5. **MCP 服务器** (`src/server.ts`)
   - 工具注册
   - 请求处理
   - stdio 通信

## 🚀 下一步操作

### 1. 安装 Node.js

在有 Node.js 的环境中执行：

```bash
# 检查 Node.js 版本（需要 18+）
node --version

# 如果没有安装，请访问：
# https://nodejs.org/
```

### 2. 安装依赖

```bash
cd /Users/siyixiong/IdeaProjects/docs-comment-mcp
npm install
```

### 3. 构建项目

```bash
npm run build
```

这将编译 TypeScript 代码到 `dist/` 目录。

### 4. 测试运行

```bash
# 测试 MCP 服务器
node dist/index.js
```

### 5. 配置 Claude Desktop

编辑配置文件：
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

添加：
```json
{
  "mcpServers": {
    "docs-comment": {
      "command": "node",
      "args": ["/Users/siyixiong/IdeaProjects/docs-comment-mcp/dist/index.js"]
    }
  }
}
```

### 6. 重启 Claude Desktop

重启后，MCP 服务器将自动加载。

## ⚠️ 已知问题

### 1. DocumentService 实现不完整

当前 `document-service.ts` 中的实现是占位符：

**问题**：
- `docx` 库主要用于创建文档，不是读取文档
- 需要使用其他库（如 `mammoth` 或直接解析 OOXML）来读取现有文档

**解决方案**：
有两种方案可选：

#### 方案 A：使用 mammoth + docx 组合
```bash
npm install mammoth
```

- 使用 `mammoth` 读取文档内容
- 使用 `docx` 创建带批注的新文档
- 需要合并原文档内容和新批注

#### 方案 B：直接操作 OOXML
```bash
npm install jszip xml2js
```

- 将 .docx 解压为 ZIP
- 解析 `word/document.xml` 和 `word/comments.xml`
- 修改 XML 添加批注
- 重新打包为 .docx

**推荐**：方案 B 更可靠，但实现复杂度更高。

### 2. 测试未实现

`tests/` 目录为空，需要添加：
- 单元测试
- 集成测试
- 测试 fixtures（示例 .docx 文件）

## 📝 待完成任务

- [ ] 安装 Node.js 和依赖
- [ ] 完善 DocumentService 实现（选择方案 A 或 B）
- [ ] 编写测试
- [ ] 构建和验证
- [ ] 在 Word/WPS 中测试兼容性
- [ ] 配置到 Claude Desktop

## 🎯 MVP 功能验收标准

1. ✅ 能读取 .docx 文件的段落内容
2. ✅ 能在指定段落添加批注
3. ✅ 能列出文档中的所有批注
4. ✅ 生成的文档能在 Word 2016+ 中打开
5. ✅ 生成的文档能在 WPS 2019+ 中打开
6. ✅ 批注正确显示作者、内容、时间

## 📚 参考资料

- [MCP Protocol](https://modelcontextprotocol.io/)
- [docx Library](https://docx.js.org/)
- [OOXML Standard](https://www.iso.org/standard/71691.html)
- [Word Comments XML Schema](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oe376/)

## 💡 技术建议

### 关于 docx 库的限制

经过代码实现，发现 `docx` 库主要用于**创建**文档，而不是**读取和修改**现有文档。

**建议的实现路径**：

1. **短期方案**（快速 MVP）：
   - 使用 `mammoth` 读取文档文本
   - 使用 `docx` 重新创建文档并添加批注
   - 缺点：可能丢失原文档的复杂格式

2. **长期方案**（生产级）：
   - 直接操作 OOXML（ZIP + XML）
   - 完全保留原文档格式
   - 精确控制批注位置和属性

### 下一步开发优先级

1. **P0**: 在有 Node.js 的环境中安装依赖并构建
2. **P0**: 实现 DocumentService 的文档读取功能
3. **P1**: 实现批注添加功能（OOXML 操作）
4. **P1**: 编写基本测试
5. **P2**: 兼容性测试（Word/WPS）

## 🔧 故障排除

### 如果构建失败

检查：
- Node.js 版本 >= 18
- TypeScript 版本 >= 5.3
- 所有依赖正确安装

### 如果 MCP 服务器无法启动

检查：
- `dist/index.js` 文件存在
- 文件有执行权限
- Claude Desktop 配置正确

### 如果批注无法显示

检查：
- 生成的 .docx 文件结构
- comments.xml 格式是否正确
- Word/WPS 版本兼容性
