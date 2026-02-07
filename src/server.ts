/**
 * MCP Server implementation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readDocument } from './tools/read-document.js';
import { addComment } from './tools/add-comment.js';
import { listComments } from './tools/list-comments.js';
import { insertTextTool } from './tools/insert-text.js';
import { deleteTextTool } from './tools/delete-text.js';
import { replaceTextTool } from './tools/replace-text.js';
import { modifyParagraphTool } from './tools/modify-paragraph.js';
import { listRevisionsTool } from './tools/list-revisions.js';
import { DocumentService } from './services/document-service.js';

export class DocsCommentServer {
  private server: Server;
  private documentService: DocumentService;

  constructor() {
    this.documentService = new DocumentService();
    this.server = new Server(
      {
        name: 'docs-comment-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'read_document',
          description:
            'Read a .docx file and return its content structure including paragraphs and existing comments',
          inputSchema: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'Absolute path to the .docx file',
              },
            },
            required: ['file_path'],
          },
        },
        {
          name: 'add_comment',
          description:
            'Add a comment to a specific paragraph in a .docx document',
          inputSchema: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'Absolute path to the .docx file',
              },
              comment_text: {
                type: 'string',
                description: 'The comment text to add',
              },
              paragraph_index: {
                type: 'number',
                description: 'Zero-based index of the target paragraph',
              },
              author: {
                type: 'string',
                description: 'Comment author name (default: "AI Assistant")',
              },
              initials: {
                type: 'string',
                description: 'Author initials (default: "AI")',
              },
            },
            required: ['file_path', 'comment_text', 'paragraph_index'],
          },
        },
        {
          name: 'list_comments',
          description: 'List all comments in a .docx document',
          inputSchema: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'Absolute path to the .docx file',
              },
            },
            required: ['file_path'],
          },
        },
        insertTextTool,
        deleteTextTool,
        replaceTextTool,
        modifyParagraphTool,
        listRevisionsTool,
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'read_document':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await readDocument(args as any), null, 2),
                },
              ],
            };

          case 'add_comment':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await addComment(args as any), null, 2),
                },
              ],
            };

          case 'list_comments':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await listComments(args as any), null, 2),
                },
              ],
            };

          case 'insert_text':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.documentService.insertText(args as any),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'delete_text':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.documentService.deleteText(args as any),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'replace_text':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.documentService.replaceText(args as any),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'modify_paragraph':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.documentService.modifyParagraph(args as any),
                    null,
                    2
                  ),
                },
              ],
            };

          case 'list_revisions':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.documentService.getRevisions((args as any).file_path),
                    null,
                    2
                  ),
                },
              ],
            };

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error:
                    error instanceof Error ? error.message : 'Unknown error',
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('docs-comment-mcp server running on stdio');
  }
}
