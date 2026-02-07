/**
 * Error handling utilities
 */

import { ToolResponse, DocumentError, ValidationError } from '../types/index.js';

/**
 * Create a standardized error response
 */
export function createErrorResponse<T>(error: unknown): ToolResponse<T> {
  if (error instanceof ValidationError) {
    return {
      success: false,
      error: `Validation error (${error.field}): ${error.message}`,
    };
  }

  if (error instanceof DocumentError) {
    return {
      success: false,
      error: `Document error (${error.code}): ${error.message}`,
    };
  }

  if (error instanceof Error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: false,
    error: 'An unknown error occurred',
  };
}

/**
 * Handle file operation errors
 */
export function handleFileError(error: unknown, filePath: string): never {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('enoent')) {
      throw new DocumentError(
        `File not found: ${filePath}`,
        'FILE_NOT_FOUND'
      );
    }

    if (message.includes('eacces') || message.includes('eperm')) {
      throw new DocumentError(
        `Permission denied: ${filePath}`,
        'PERMISSION_DENIED'
      );
    }

    if (message.includes('ebusy')) {
      throw new DocumentError(
        `File is busy or locked: ${filePath}. Please close it in other applications.`,
        'FILE_BUSY'
      );
    }
  }

  throw new DocumentError(
    `Failed to access file: ${filePath}`,
    'FILE_ERROR'
  );
}

/**
 * Handle docx library errors
 */
export function handleDocxError(error: unknown): never {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('corrupt') || message.includes('invalid')) {
      throw new DocumentError(
        'Document file is corrupted or invalid',
        'CORRUPT_FILE'
      );
    }

    if (message.includes('zip')) {
      throw new DocumentError(
        'Failed to parse document structure. File may be corrupted.',
        'PARSE_ERROR'
      );
    }
  }

  throw new DocumentError(
    'Failed to process document',
    'DOCX_ERROR'
  );
}

/**
 * Wrap async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ValidationError || error instanceof DocumentError) {
      throw error;
    }

    throw new DocumentError(
      `${context}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'OPERATION_FAILED'
    );
  }
}
