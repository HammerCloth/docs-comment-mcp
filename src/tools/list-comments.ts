/**
 * list_comments tool - List all comments in a document
 */

import { DocumentService } from '../services/document-service.js';
import { ListCommentsInput, ToolResponse, Comment } from '../types/index.js';
import { createErrorResponse } from '../utils/error-handler.js';

const documentService = new DocumentService();

interface ListCommentsData {
  file_path: string;
  comments: Comment[];
  total_comments: number;
}

export async function listComments(
  input: ListCommentsInput
): Promise<ToolResponse<ListCommentsData>> {
  try {
    const comments = await documentService.getComments(input.file_path);
    const data: ListCommentsData = {
      file_path: input.file_path,
      comments,
      total_comments: comments.length,
    };
    return {
      success: true,
      data,
    };
  } catch (error) {
    return createErrorResponse<ListCommentsData>(error);
  }
}
