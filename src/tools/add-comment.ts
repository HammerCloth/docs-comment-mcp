/**
 * add_comment tool - Add a comment to a specific paragraph
 */

import { DocumentService } from '../services/document-service.js';
import { AddCommentInput, ToolResponse, Comment } from '../types/index.js';
import { createErrorResponse } from '../utils/error-handler.js';

const documentService = new DocumentService();

export async function addComment(
  input: AddCommentInput
): Promise<ToolResponse<Comment>> {
  try {
    const data = await documentService.addComment(input);
    return {
      success: true,
      data,
    };
  } catch (error) {
    return createErrorResponse<Comment>(error);
  }
}
