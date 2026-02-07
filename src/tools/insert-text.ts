/**
 * MCP Tool: Insert text with track changes
 */

import { InsertTextInput } from '../types/index.js';

export const insertTextTool = {
  name: 'insert_text',
  description: 'Insert text into a Word document with track changes (revision mode). The insertion will be marked as a revision that can be accepted or rejected in Word/WPS.',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Absolute path to the .docx file',
      },
      paragraph_index: {
        type: 'number',
        description: 'Index of the paragraph to insert text into (0-based)',
      },
      text: {
        type: 'string',
        description: 'Text to insert',
      },
      position: {
        type: 'number',
        description: 'Position in the paragraph to insert at (optional, default: end of paragraph)',
      },
      author: {
        type: 'string',
        description: 'Author name for the revision (optional, default: "AI Assistant")',
      },
      date: {
        type: 'string',
        description: 'ISO date string for the revision (optional, default: current time)',
      },
    },
    required: ['file_path', 'paragraph_index', 'text'],
  },
};
