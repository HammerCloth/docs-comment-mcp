/**
 * Core type definitions for docs-comment-mcp
 */

// Document related types
export interface DocumentParagraph {
  index: number;
  text: string;
  style?: string;
}

export interface DocumentInfo {
  file_path: string;
  paragraphs: DocumentParagraph[];
  total_paragraphs: number;
  has_comments: boolean;
  comment_count: number;
}

// Comment related types
export interface Comment {
  comment_id: string;
  paragraph_index: number;
  comment_text: string;
  author: string;
  initials: string;
  created_at: string;
}

// Tool input types
export interface ReadDocumentInput {
  file_path: string;
}

export interface AddCommentInput {
  file_path: string;
  comment_text: string;
  paragraph_index: number;
  text?: string; // Specific text to comment on (word or sentence) - either this or position range is required
  start_pos?: number; // Start position in paragraph (character index) - must be used with end_pos
  end_pos?: number; // End position in paragraph (character index) - must be used with start_pos
  author?: string;
  initials?: string;
}

export interface ListCommentsInput {
  file_path: string;
}

export interface DeleteCommentInput {
  file_path: string;
  comment_id: string; // The UUID of the comment to delete
}

// Revision (Track Changes) related types
export interface Revision {
  revision_id: string;
  revision_type: 'insert' | 'delete';
  paragraph_index: number;
  text: string;
  author: string;
  date: string;
}

export interface InsertTextInput {
  file_path: string;
  paragraph_index: number;
  text: string;
  position?: number; // Position in paragraph, default: end
  author?: string;
  date?: string;
}

export interface DeleteTextInput {
  file_path: string;
  paragraph_index: number;
  text: string; // Text to delete (will be matched)
  author?: string;
  date?: string;
}

export interface ReplaceTextInput {
  file_path: string;
  paragraph_index: number;
  old_text: string;
  new_text: string;
  author?: string;
  date?: string;
}

export interface ModifyParagraphInput {
  file_path: string;
  paragraph_index: number;
  new_text: string;
  author?: string;
  date?: string;
}

export interface ListRevisionsInput {
  file_path: string;
}

export interface SuggestRevisionInput {
  file_path: string;
  paragraph_index: number;
  original_text: string;
  suggested_text: string;
  reason: string;
  apply_immediately?: boolean;
  author?: string;
  date?: string;
}

export interface RevisionSuggestion {
  paragraph_index: number;
  original_text: string;
  suggested_text: string;
  reason: string;
  applied: boolean;
  revisions?: Revision[];
}

// Tool response type
export interface ToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Error types
export class DocumentError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'DocumentError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
