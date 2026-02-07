/**
 * MCP Tool: Suggest revision for a specific text segment
 * AI suggests what to change, where to change, and why
 */

export const suggestRevisionTool = {
  name: 'suggest_revision',
  description: 'AI suggests a revision for a specific text segment in the document. This tool allows AI to identify what needs to be changed and explain why, mimicking human review process. The actual revision is then applied using replace_text tool.',
  inputSchema: {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Absolute path to the .docx file',
      },
      paragraph_index: {
        type: 'number',
        description: 'Index of the paragraph containing the text (0-based)',
      },
      original_text: {
        type: 'string',
        description: 'The original text segment that needs revision',
      },
      suggested_text: {
        type: 'string',
        description: 'The suggested replacement text',
      },
      reason: {
        type: 'string',
        description: 'Explanation of why this change is suggested (e.g., "grammar error", "better word choice", "clarity improvement")',
      },
      apply_immediately: {
        type: 'boolean',
        description: 'If true, apply the revision immediately. If false, just return the suggestion for user review (default: false)',
      },
      author: {
        type: 'string',
        description: 'Author name for the revision (optional, default: "AI Assistant")',
      },
    },
    required: ['file_path', 'paragraph_index', 'original_text', 'suggested_text', 'reason'],
  },
};
