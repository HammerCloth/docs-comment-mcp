/**
 * Validation utilities for input parameters
 */

import * as fs from 'fs';
import * as path from 'path';
import { ValidationError } from '../types/index.js';

/**
 * Validate file path exists and is accessible
 */
export function validateFilePath(filePath: string): void {
  if (!filePath || typeof filePath !== 'string') {
    throw new ValidationError('File path is required and must be a string', 'file_path');
  }

  if (!path.isAbsolute(filePath)) {
    throw new ValidationError('File path must be absolute', 'file_path');
  }

  if (!fs.existsSync(filePath)) {
    throw new ValidationError(`File does not exist: ${filePath}`, 'file_path');
  }

  try {
    fs.accessSync(filePath, fs.constants.R_OK);
  } catch (error) {
    throw new ValidationError(`File is not readable: ${filePath}`, 'file_path');
  }
}

/**
 * Validate file has .docx extension
 */
export function validateFileExtension(filePath: string): void {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.docx') {
    throw new ValidationError(
      `Only .docx files are supported. Got: ${ext}`,
      'file_path'
    );
  }
}

/**
 * Validate paragraph index is within valid range
 */
export function validateParagraphIndex(
  index: number,
  totalParagraphs: number
): void {
  if (typeof index !== 'number' || !Number.isInteger(index)) {
    throw new ValidationError(
      'Paragraph index must be an integer',
      'paragraph_index'
    );
  }

  if (index < 0) {
    throw new ValidationError(
      'Paragraph index must be non-negative',
      'paragraph_index'
    );
  }

  if (index >= totalParagraphs) {
    throw new ValidationError(
      `Paragraph index ${index} is out of range. Document has ${totalParagraphs} paragraphs (0-${totalParagraphs - 1})`,
      'paragraph_index'
    );
  }
}

/**
 * Validate comment text is not empty
 */
export function validateCommentText(text: string): void {
  if (!text || typeof text !== 'string') {
    throw new ValidationError(
      'Comment text is required and must be a string',
      'comment_text'
    );
  }

  if (text.trim().length === 0) {
    throw new ValidationError(
      'Comment text cannot be empty or whitespace only',
      'comment_text'
    );
  }
}

/**
 * Validate file is writable
 */
export function validateFileWritable(filePath: string): void {
  try {
    fs.accessSync(filePath, fs.constants.W_OK);
  } catch (error) {
    throw new ValidationError(
      `File is not writable: ${filePath}. Please close the file in other applications.`,
      'file_path'
    );
  }
}
