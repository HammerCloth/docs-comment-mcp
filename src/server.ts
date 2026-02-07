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
import { deleteComment } from './tools/delete-comment.js';
import { insertTextTool } from './tools/insert-text.js';
import { deleteTextTool } from './tools/delete-text.js';
import { replaceTextTool } from './tools/replace-text.js';
import { modifyParagraphTool } from './tools/modify-paragraph.js';
import { listRevisionsTool } from './tools/list-revisions.js';
import { suggestRevisionTool } from './tools/suggest-revision.js';
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
        // Document Reading Tools
        {
          name: 'read_document',
          description:
            '[Document] Read a .docx file and return its content structure including paragraphs and existing comments',
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
        // Comment Management Tools
        {
          name: 'add_comment',
          description:
            '[Comment] Add a comment to specific text (word or sentence) in a .docx document. REQUIRED: Must specify either "text" parameter OR both "start_pos" and "end_pos" parameters. Cannot comment on entire paragraph.',
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
              text: {
                type: 'string',
                description: 'REQUIRED (if start_pos/end_pos not provided): Specific text (word or sentence) to comment on. The comment will be attached to this exact text within the paragraph.',
              },
              start_pos: {
                type: 'number',
                description: 'REQUIRED (if text not provided): Start character position (0-based) in the paragraph. Must be used together with end_pos.',
              },
              end_pos: {
                type: 'number',
                description: 'REQUIRED (if text not provided): End character position (0-based) in the paragraph. Must be used together with start_pos.',
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
          description: '[Comment] List all comments in a .docx document',
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
          name: 'delete_comment',
          description: '[Comment] Delete a comment from a .docx document by its comment ID',
          inputSchema: {
            type: 'object',
            properties: {
              file_path: {
                type: 'string',
                description: 'Absolute path to the .docx file',
              },
              comment_id: {
                type: 'string',
                description: 'The UUID of the comment to delete (obtained from list_comments)',
              },
            },
            required: ['file_path', 'comment_id'],
          },
        },
        // Track Changes / Revision Tools
        {
          name: 'insert_text',
          description: '[Revision] Insert text into a Word document with track changes (revision mode). The insertion will be marked as a revision that can be accepted or rejected in Word/WPS.',
          inputSchema: insertTextTool.inputSchema,
        },
        {
          name: 'delete_text',
          description: '[Revision] Delete text from a Word document with track changes (revision mode). The deletion will be marked as a revision that can be accepted or rejected in Word/WPS.',
          inputSchema: deleteTextTool.inputSchema,
        },
        {
          name: 'replace_text',
          description: '[Revision] Replace text in a Word document with track changes (revision mode). The old text will be marked as deleted and new text as inserted, both as revisions that can be accepted or rejected in Word/WPS.',
          inputSchema: replaceTextTool.inputSchema,
        },
        {
          name: 'modify_paragraph',
          description: '[Revision] Modify an entire paragraph in a Word document with track changes (revision mode). The old paragraph content will be marked as deleted and new content as inserted, both as revisions that can be accepted or rejected in Word/WPS.',
          inputSchema: modifyParagraphTool.inputSchema,
        },
        {
          name: 'list_revisions',
          description: '[Revision] List all tracked changes (revisions) in a Word document. Shows all insertions and deletions that are pending review.',
          inputSchema: listRevisionsTool.inputSchema,
        },
        {
          name: 'suggest_revision',
          description: '[Revision] AI suggests a revision for a specific text segment in the document. This tool allows AI to identify what needs to be changed and explain why, mimicking human review process. The actual revision is then applied using replace_text tool.',
          inputSchema: suggestRevisionTool.inputSchema,
        },
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

          case 'delete_comment':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(await deleteComment(args as any), null, 2),
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

          case 'suggest_revision':
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    await this.documentService.suggestRevision(args as any),
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
