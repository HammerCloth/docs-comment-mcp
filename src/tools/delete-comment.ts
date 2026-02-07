import { DocumentService } from '../services/document-service.js';
import { DeleteCommentInput, ToolResponse } from '../types/index.js';
import { createErrorResponse } from '../utils/error-handler.js';

const documentService = new DocumentService();

export async function deleteComment(
  input: DeleteCommentInput
): Promise<ToolResponse<{ success: boolean; comment_id: string }>> {
  try {
    const data = await documentService.deleteComment(input);
    return {
      success: true,
      data,
    };
  } catch (error) {
    return createErrorResponse<{ success: boolean; comment_id: string }>(error);
  }
}
