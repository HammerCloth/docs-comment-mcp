/**
 * MCP Tool: Modify paragraph with track changes
 */

import { ModifyParagraphInput } from '../types/index.js';

export const modifyParagraphTool = {
  name: 'modify_paragraph',
  description: 'Modify an entire paragraph in a Word document with track changes (revision mode). The old paragraph content will be marked as deleted and new content as inserted, both as revisions that can be accepted or rejected in Word/WPS.',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Absolute path to the .docx file',
      },
      paragraph_index: {
        type: 'number',
        description: 'Index of the paragraph to modify (0-based)',
      },
      new_text: {
        type: 'string',
        description: 'New text for the paragraph',
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
    required: ['file_path', 'paragraph_index', 'new_text'],
  },
};
