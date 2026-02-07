# docs-comment-mcp 实施计划

## 📋 计划概览

**项目**: Word Document Comment MCP Server
**开发模式**: Autopilot (Ralph + Ultrawork)
**预计时间**: 36 小时（4-5 个工作日）
**当前阶段**: 阶段 1 - 规划

---

## 🎯 里程碑定义

### Milestone 1: 项目基础设施 (4 小时)
- ✅ 环境搭建
- ✅ 依赖安装
- ✅ TypeScript 配置
- ✅ 项目结构创建

### Milestone 2: 核心服务层 (8 小时)
- ✅ 类型定义
- ✅ DocumentService 实现
- ✅ 工具函数（validation, error-handler）

### Milestone 3: MCP 工具实现 (18 小时)
- ✅ read_document 工具
- ✅ add_comment 工具
- ✅ list_comments 工具
- ✅ MCP 服务器集成

### Milestone 4: 测试和验证 (6 小时)
- ✅ 单元测试
- ✅ 集成测试
- ✅ 兼容性测试（Word/WPS）

---

## 📦 任务分解

### Phase 1: 项目初始化 (优先级: P0)

#### Task 1.1: 创建项目结构
**预计时间**: 30 分钟
**依赖**: 无
**输出**:
```
src/
├── index.ts
├── server.ts
├── tools/
├── services/
├── types/
└── utils/
tests/
├── fixtures/
├── tools/
└── services/
```

#### Task 1.2: 配置 package.json
**预计时间**: 30 分钟
**依赖**: Task 1.1
**关键依赖**:
- @modelcontextprotocol/sdk: ^1.0.0
- docx: ^8.5.0
- jszip: ^3.10.1
- xml2js: ^0.6.2
- uuid: ^9.0.1

#### Task 1.3: 配置 TypeScript
**预计时间**: 30 分钟
**依赖**: Task 1.2
**输出**: tsconfig.json
**配置要点**:
- target: ES2022
- module: ESNext
- moduleResolution: node
- strict: true
- esModuleInterop: true

#### Task 1.4: 安装依赖
**预计时间**: 30 分钟
**依赖**: Task 1.3
**命令**: `npm install`

---

### Phase 2: 类型定义 (优先级: P0)

#### Task 2.1: 定义核心类型
**预计时间**: 1 小时
**依赖**: Task 1.4
**文件**: `src/types/index.ts`
**类型列表**:
```typescript
// 文档相关
interface DocumentParagraph {
  index: number;
  text: string;
  style?: string;
}

interface DocumentInfo {
  file_path: string;
  paragraphs: DocumentParagraph[];
  total_paragraphs: number;
  has_comments: boolean;
  comment_count: number;
}

// 批注相关
interface Comment {
  comment_id: string;
  paragraph_index: number;
  comment_text: string;
  author: string;
  initials: string;
  created_at: string;
}

// 工具输入/输出
interface ReadDocumentInput {
  file_path: string;
}

interface AddCommentInput {
  file_path: string;
  comment_text: string;
  paragraph_index: number;
  author?: string;
  initials?: string;
}

interface ListCommentsInput {
  file_path: string;
}

// 响应格式
interface ToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

---

### Phase 3: 工具函数 (优先级: P1)

#### Task 3.1: 参数验证工具
**预计时间**: 1.5 小时
**依赖**: Task 2.1
**文件**: `src/utils/validation.ts`
**功能**:
- validateFilePath(): 验证文件路径格式和存在性
- validateFileExtension(): 验证文件扩展名为 .docx
- validateParagraphIndex(): 验证段落索引范围
- validateCommentText(): 验证批注内容非空

#### Task 3.2: 错误处理工具
**预计时间**: 1 小时
**依赖**: Task 2.1
**文件**: `src/utils/error-handler.ts`
**功能**:
- createErrorResponse(): 创建标准错误响应
- handleFileError(): 处理文件操作错误
- handleValidationError(): 处理参数验证错误
- handleDocxError(): 处理 docx 库错误

---

### Phase 4: DocumentService 核心服务 (优先级: P0)

#### Task 4.1: DocumentService 基础结构
**预计时间**: 2 小时
**依赖**: Task 2.1, Task 3.1, Task 3.2
**文件**: `src/services/document-service.ts`
**方法**:
```typescript
class DocumentService {
  async loadDocument(filePath: string): Promise<Document>
  async saveDocument(doc: Document, filePath: string): Promise<void>
  async getDocumentInfo(filePath: string): Promise<DocumentInfo>
  async addComment(input: AddCommentInput): Promise<Comment>
  async getComments(filePath: string): Promise<Comment[]>
}
```

#### Task 4.2: 实现 loadDocument
**预计时间**: 1.5 小时
**依赖**: Task 4.1
**技术要点**:
- 使用 fs.readFileSync 读取文件
- 使用 docx.Document.load() 解析
- 错误处理（文件不存在、格式错误、权限不足）

#### Task 4.3: 实现 getDocumentInfo
**预计时间**: 2 小时
**依赖**: Task 4.2
**技术要点**:
- 遍历 document.getSections()
- 提取段落文本和样式
- 统计批注数量

#### Task 4.4: 实现 addComment
**预计时间**: 3 小时
**依赖**: Task 4.2
**技术要点**:
- 定位目标段落
- 创建 Comment 对象
- 使用 uuid 生成批注 ID
- 保存修改后的文档
**关键挑战**: docx 库的批注 API 使用

#### Task 4.5: 实现 getComments
**预计时间**: 2 小时
**依赖**: Task 4.2
**技术要点**:
- 解析 comments.xml
- 提取批注元数据
- 映射到段落索引

---

### Phase 5: MCP 工具实现 (优先级: P0)

#### Task 5.1: read_document 工具
**预计时间**: 2 小时
**依赖**: Task 4.3
**文件**: `src/tools/read-document.ts`
**流程**:
1. 验证输入参数
2. 调用 DocumentService.getDocumentInfo()
3. 格式化响应
4. 错误处理

#### Task 5.2: add_comment 工具
**预计时间**: 2.5 小时
**依赖**: Task 4.4
**文件**: `src/tools/add-comment.ts`
**流程**:
1. 验证输入参数（文件路径、段落索引、批注内容）
2. 调用 DocumentService.addComment()
3. 返回批注 ID 和元数据
4. 错误处理

#### Task 5.3: list_comments 工具
**预计时间**: 1.5 小时
**依赖**: Task 4.5
**文件**: `src/tools/list-comments.ts`
**流程**:
1. 验证输入参数
2. 调用 DocumentService.getComments()
3. 格式化响应
4. 错误处理

---

### Phase 6: MCP 服务器集成 (优先级: P0)

#### Task 6.1: 实现 MCP Server
**预计时间**: 3 小时
**依赖**: Task 5.1, Task 5.2, Task 5.3
**文件**: `src/server.ts`
**功能**:
- 初始化 MCP Server
- 注册 3 个工具
- 处理工具调用
- stdio 通信

#### Task 6.2: 实现入口文件
**预计时间**: 1 小时
**依赖**: Task 6.1
**文件**: `src/index.ts`
**功能**:
- 启动 MCP Server
- 错误处理
- 优雅退出

#### Task 6.3: 构建和测试
**预计时间**: 1 小时
**依赖**: Task 6.2
**命令**:
- `npm run build`
- 手动测试 MCP 服务器

---

### Phase 7: 测试 (优先级: P1)

#### Task 7.1: 创建测试 fixtures
**预计时间**: 1 小时
**依赖**: 无
**输出**: `tests/fixtures/sample.docx`
**内容**: 包含多个段落和样式的测试文档

#### Task 7.2: DocumentService 单元测试
**预计时间**: 2 小时
**依赖**: Task 4.5, Task 7.1
**文件**: `tests/services/document-service.test.ts`
**测试用例**:
- loadDocument 成功/失败
- getDocumentInfo 正确解析
- addComment 正确添加
- getComments 正确列出

#### Task 7.3: 工具单元测试
**预计时间**: 2 小时
**依赖**: Task 5.3, Task 7.1
**文件**:
- `tests/tools/read-document.test.ts`
- `tests/tools/add-comment.test.ts`
- `tests/tools/list-comments.test.ts`

#### Task 7.4: 集成测试
**预计时间**: 1 小时
**依赖**: Task 6.3, Task 7.3
**测试场景**:
- 完整的读取-添加-列出流程
- 多批注场景
- 错误处理

#### Task 7.5: 兼容性测试
**预计时间**: 2 小时
**依赖**: Task 7.4
**测试内容**:
- 生成的 .docx 在 Word 2016+ 中打开
- 生成的 .docx 在 WPS 2019+ 中打开
- 批注正确显示

---

### Phase 8: 文档和收尾 (优先级: P2)

#### Task 8.1: 编写 README.md
**预计时间**: 1 小时
**依赖**: Task 6.3
**内容**:
- 项目介绍
- 安装说明
- 使用示例
- API 文档

#### Task 8.2: 添加 .gitignore
**预计时间**: 15 分钟
**依赖**: 无
**内容**: node_modules, dist, *.log, .env

#### Task 8.3: 代码格式化和 lint
**预计时间**: 30 分钟
**依赖**: Task 6.3
**命令**:
- `npm run format`
- `npm run lint`

---

## 🔗 依赖关系图

```
Task 1.1 (项目结构)
  └─> Task 1.2 (package.json)
       └─> Task 1.3 (tsconfig.json)
            └─> Task 1.4 (安装依赖)
                 └─> Task 2.1 (类型定义)
                      ├─> Task 3.1 (验证工具)
                      ├─> Task 3.2 (错误处理)
                      └─> Task 4.1 (DocumentService 基础)
                           ├─> Task 4.2 (loadDocument)
                           │    ├─> Task 4.3 (getDocumentInfo)
                           │    │    └─> Task 5.1 (read_document 工具)
                           │    ├─> Task 4.4 (addComment)
                           │    │    └─> Task 5.2 (add_comment 工具)
                           │    └─> Task 4.5 (getComments)
                           │         └─> Task 5.3 (list_comments 工具)
                           └─> Task 5.1, 5.2, 5.3
                                └─> Task 6.1 (MCP Server)
                                     └─> Task 6.2 (入口文件)
                                          └─> Task 6.3 (构建测试)

Task 7.1 (测试 fixtures) ─┐
Task 4.5 (getComments) ────┼─> Task 7.2 (单元测试)
Task 5.3 (list_comments) ──┘    └─> Task 7.3 (工具测试)
                                     └─> Task 7.4 (集成测试)
                                          └─> Task 7.5 (兼容性测试)
```

---

## ⚠️ 技术风险评估

### 风险 1: docx 库批注 API 不熟悉
**影响**: 高
**概率**: 中
**缓解措施**:
- 提前研究 docx 库文档
- 创建简单的 POC 测试批注功能
- 如果 API 不支持，考虑直接操作 XML

### 风险 2: OOXML 格式复杂性
**影响**: 中
**概率**: 中
**缓解措施**:
- 使用 docx 库封装，避免直接操作 XML
- 参考 OOXML 标准文档
- 测试多种文档格式

### 风险 3: Word/WPS 兼容性问题
**影响**: 高
**概率**: 低
**缓解措施**:
- 严格遵循 OOXML 标准
- 在多个版本的 Word/WPS 中测试
- 避免使用专有扩展

### 风险 4: 大文件性能问题
**影响**: 中
**概率**: 低
**缓解措施**:
- MVP 阶段不优化，先保证功能
- 后续可添加流式处理
- 文档中说明性能限制

---

## 🎨 实施策略

### 开发顺序
1. **自底向上**: 先实现底层服务（DocumentService），再实现上层工具
2. **关键路径优先**: 优先实现 P0 任务
3. **快速验证**: 每个阶段完成后立即测试

### 并行化机会
- Task 3.1 和 Task 3.2 可并行
- Task 5.1, 5.2, 5.3 可并行（依赖 DocumentService 完成后）
- Task 7.2 和 Task 7.3 可并行

### 质量保证
- 每个模块完成后编写单元测试
- 使用 TypeScript strict 模式
- 代码审查关键模块（DocumentService, MCP Server）

---

## 📊 进度追踪

### Phase 1: 项目初始化
- [ ] Task 1.1: 创建项目结构
- [ ] Task 1.2: 配置 package.json
- [ ] Task 1.3: 配置 TypeScript
- [ ] Task 1.4: 安装依赖

### Phase 2: 类型定义
- [ ] Task 2.1: 定义核心类型

### Phase 3: 工具函数
- [ ] Task 3.1: 参数验证工具
- [ ] Task 3.2: 错误处理工具

### Phase 4: DocumentService
- [ ] Task 4.1: DocumentService 基础结构
- [ ] Task 4.2: 实现 loadDocument
- [ ] Task 4.3: 实现 getDocumentInfo
- [ ] Task 4.4: 实现 addComment
- [ ] Task 4.5: 实现 getComments

### Phase 5: MCP 工具
- [ ] Task 5.1: read_document 工具
- [ ] Task 5.2: add_comment 工具
- [ ] Task 5.3: list_comments 工具

### Phase 6: MCP 服务器
- [ ] Task 6.1: 实现 MCP Server
- [ ] Task 6.2: 实现入口文件
- [ ] Task 6.3: 构建和测试

### Phase 7: 测试
- [ ] Task 7.1: 创建测试 fixtures
- [ ] Task 7.2: DocumentService 单元测试
- [ ] Task 7.3: 工具单元测试
- [ ] Task 7.4: 集成测试
- [ ] Task 7.5: 兼容性测试

### Phase 8: 文档和收尾
- [ ] Task 8.1: 编写 README.md
- [ ] Task 8.2: 添加 .gitignore
- [ ] Task 8.3: 代码格式化和 lint

---

## 🚀 下一步行动

**立即开始**: Phase 1 - 项目初始化
**预计完成时间**: 2 小时
**关键输出**: 完整的项目结构和配置文件

准备好进入 **阶段 2: 执行** 了吗？
