/**
 * MCP Tool: List all revisions in a document
 */

import { ListRevisionsInput } from '../types/index.js';

export const listRevisionsTool = {
  name: 'list_revisions',
  description: 'List all tracked changes (revisions) in a Word document. Shows all insertions and deletions that are pending review.',
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
};
