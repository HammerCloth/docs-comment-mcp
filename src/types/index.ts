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
  author?: string;
  initials?: string;
}

export interface ListCommentsInput {
  file_path: string;
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
