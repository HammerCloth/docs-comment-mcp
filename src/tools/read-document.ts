/**
 * read_document tool - Read .docx file content and structure
 */

import { DocumentService } from '../services/document-service.js';
import { ReadDocumentInput, ToolResponse, DocumentInfo } from '../types/index.js';
import { createErrorResponse } from '../utils/error-handler.js';

const documentService = new DocumentService();

export async function readDocument(
  input: ReadDocumentInput
): Promise<ToolResponse<DocumentInfo>> {
  try {
    const data = await documentService.getDocumentInfo(input.file_path);
    return {
      success: true,
      data,
    };
  } catch (error) {
    return createErrorResponse<DocumentInfo>(error);
  }
}
