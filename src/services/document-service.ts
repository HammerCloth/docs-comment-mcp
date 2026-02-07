/**
 * Document Service - Core business logic for document operations
 */

import * as fs from 'fs';
import { Document, Packer, Paragraph, TextRun, Comment as DocxComment } from 'docx';
import { v4 as uuidv4 } from 'uuid';
import {
  DocumentInfo,
  DocumentParagraph,
  Comment,
  AddCommentInput,
  DocumentError,
} from '../types/index.js';
import {
  validateFilePath,
  validateFileExtension,
  validateParagraphIndex,
  validateCommentText,
  validateFileWritable,
} from '../utils/validation.js';
import { handleFileError, handleDocxError } from '../utils/error-handler.js';

export class DocumentService {
  /**
   * Load a .docx document from file
   */
  async loadDocument(filePath: string): Promise<Document> {
    try {
      const buffer = fs.readFileSync(filePath);
      // Note: docx library doesn't have a load method in current version
      // We'll need to work with the buffer directly
      return buffer as any; // Placeholder - will be refined
    } catch (error) {
      handleFileError(error, filePath);
    }
  }

  /**
   * Save a document to file
   */
  async saveDocument(doc: Document, filePath: string): Promise<void> {
    try {
      const buffer = await Packer.toBuffer(doc);
      fs.writeFileSync(filePath, buffer);
    } catch (error) {
      handleFileError(error, filePath);
    }
  }

  /**
   * Get document information including paragraphs and comments
   */
  async getDocumentInfo(filePath: string): Promise<DocumentInfo> {
    // Validate inputs
    validateFilePath(filePath);
    validateFileExtension(filePath);

    try {
      // For MVP, we'll use a simpler approach with docx library
      // Read the file and parse basic structure
      const buffer = fs.readFileSync(filePath);

      // Note: The docx library is primarily for creating documents
      // For reading, we need a different approach
      // For MVP, we'll return a basic structure

      // TODO: Implement proper document reading
      // This is a placeholder implementation
      const paragraphs: DocumentParagraph[] = [
        {
          index: 0,
          text: 'Document content parsing not yet implemented',
          style: 'Normal',
        },
      ];

      return {
        file_path: filePath,
        paragraphs,
        total_paragraphs: paragraphs.length,
        has_comments: false,
        comment_count: 0,
      };
    } catch (error) {
      handleDocxError(error);
    }
  }

  /**
   * Add a comment to a specific paragraph
   */
  async addComment(input: AddCommentInput): Promise<Comment> {
    const {
      file_path,
      comment_text,
      paragraph_index,
      author = 'AI Assistant',
      initials = 'AI',
    } = input;

    // Validate inputs
    validateFilePath(file_path);
    validateFileExtension(file_path);
    validateCommentText(comment_text);
    validateFileWritable(file_path);

    try {
      // Get document info to validate paragraph index
      const docInfo = await this.getDocumentInfo(file_path);
      validateParagraphIndex(paragraph_index, docInfo.total_paragraphs);

      // Generate unique comment ID
      const comment_id = uuidv4();
      const created_at = new Date().toISOString();

      // Create a new document with the comment
      // Note: This is a simplified implementation
      // In production, we'd need to:
      // 1. Parse the existing document
      // 2. Add the comment to the specific paragraph
      // 3. Save the modified document

      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Commented paragraph',
                  }),
                ],
              }),
            ],
          },
        ],
      });

      // Save the document
      await this.saveDocument(doc, file_path);

      return {
        comment_id,
        paragraph_index,
        comment_text,
        author,
        initials,
        created_at,
      };
    } catch (error) {
      if (error instanceof DocumentError) {
        throw error;
      }
      handleDocxError(error);
    }
  }

  /**
   * Get all comments from a document
   */
  async getComments(filePath: string): Promise<Comment[]> {
    // Validate inputs
    validateFilePath(filePath);
    validateFileExtension(filePath);

    try {
      // TODO: Implement proper comment extraction
      // This requires parsing the comments.xml file from the .docx

      // Placeholder implementation
      return [];
    } catch (error) {
      handleDocxError(error);
    }
  }
}
