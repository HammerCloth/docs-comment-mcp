/**
 * MCP Tool: Replace text with track changes
 */

import { ReplaceTextInput } from '../types/index.js';

export const replaceTextTool = {
  name: 'replace_text',
  description: 'Replace text in a Word document with track changes (revision mode). The old text will be marked as deleted and new text as inserted, both as revisions that can be accepted or rejected in Word/WPS.',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Absolute path to the .docx file',
      },
      paragraph_index: {
        type: 'number',
        description: 'Index of the paragraph containing the text to replace (0-based)',
      },
      old_text: {
        type: 'string',
        description: 'Text to replace (must match exactly)',
      },
      new_text: {
        type: 'string',
        description: 'New text to insert',
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
    required: ['file_path', 'paragraph_index', 'old_text', 'new_text'],
  },
};
