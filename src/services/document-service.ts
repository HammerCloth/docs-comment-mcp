/**
 * OOXML Document Service - Direct manipulation of .docx files
 */

import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip';
import { parseString, Builder } from 'xml2js';
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
   * Parse XML string to object
   */
  private async parseXml(xml: string): Promise<any> {
    return new Promise((resolve, reject) => {
      parseString(xml, { explicitArray: false }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Build XML from object
   */
  private buildXml(obj: any): string {
    const builder = new Builder({
      xmldec: { version: '1.0', encoding: 'UTF-8', standalone: true },
    });
    return builder.buildObject(obj);
  }

  /**
   * Load .docx as ZIP archive
   */
  private async loadDocxZip(filePath: string): Promise<JSZip> {
    try {
      const buffer = fs.readFileSync(filePath);
      return await JSZip.loadAsync(buffer);
    } catch (error) {
      handleFileError(error, filePath);
    }
  }

  /**
   * Save ZIP archive as .docx
   */
  private async saveDocxZip(zip: JSZip, filePath: string): Promise<void> {
    try {
      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      fs.writeFileSync(filePath, buffer);
    } catch (error) {
      handleFileError(error, filePath);
    }
  }

  /**
   * Get document information including paragraphs and comments
   */
  async getDocumentInfo(filePath: string): Promise<DocumentInfo> {
    validateFilePath(filePath);
    validateFileExtension(filePath);

    try {
      const zip = await this.loadDocxZip(filePath);

      // Read document.xml
      const documentXml = await zip.file('word/document.xml')?.async('string');
      if (!documentXml) {
        throw new DocumentError('Invalid .docx file: missing document.xml', 'INVALID_DOCX');
      }

      const doc = await this.parseXml(documentXml);
      const body = doc['w:document']['w:body'];

      // Extract paragraphs
      const paragraphs: DocumentParagraph[] = [];
      const wParagraphs = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']];

      wParagraphs.forEach((p: any, index: number) => {
        if (!p) return;

        // Extract text from paragraph
        let text = '';
        const runs = p['w:r'];
        if (runs) {
          const runArray = Array.isArray(runs) ? runs : [runs];
          runArray.forEach((run: any) => {
            if (run && run['w:t']) {
              // Handle both string and object cases
              const textContent = run['w:t'];
              if (typeof textContent === 'string') {
                text += textContent;
              } else if (typeof textContent === 'object' && textContent._) {
                text += textContent._;
              } else if (typeof textContent === 'object') {
                // If it's still an object, try to stringify it
                text += String(textContent);
              }
            }
          });
        }

        paragraphs.push({
          index,
          text: text || '(empty paragraph)',
          style: p['w:pPr']?.['w:pStyle']?.['$']?.['w:val'] || 'Normal',
        });
      });

      // Check for comments
      let commentCount = 0;
      const commentsXml = await zip.file('word/comments.xml')?.async('string');
      if (commentsXml) {
        const comments = await this.parseXml(commentsXml);
        const commentList = comments['w:comments']?.['w:comment'];
        if (commentList) {
          commentCount = Array.isArray(commentList) ? commentList.length : 1;
        }
      }

      return {
        file_path: filePath,
        paragraphs,
        total_paragraphs: paragraphs.length,
        has_comments: commentCount > 0,
        comment_count: commentCount,
      };
    } catch (error) {
      if (error instanceof DocumentError) {
        throw error;
      }
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

    validateFilePath(file_path);
    validateFileExtension(file_path);
    validateCommentText(comment_text);
    validateFileWritable(file_path);

    try {
      // Get document info to validate paragraph index
      const docInfo = await this.getDocumentInfo(file_path);
      validateParagraphIndex(paragraph_index, docInfo.total_paragraphs);

      const zip = await this.loadDocxZip(file_path);
      const comment_id = uuidv4();
      const commentIdNum = Date.now() % 1000000; // Numeric ID for Word
      const created_at = new Date().toISOString();

      // Read and modify document.xml
      const documentXml = await zip.file('word/document.xml')!.async('string');
      const doc = await this.parseXml(documentXml);

      // Add comment range to the target paragraph
      const body = doc['w:document']['w:body'];
      const wParagraphs = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']];
      const targetParagraph = wParagraphs[paragraph_index];

      if (!targetParagraph) {
        throw new DocumentError(`Paragraph ${paragraph_index} not found`, 'PARAGRAPH_NOT_FOUND');
      }

      // Add comment range start and end
      if (!targetParagraph['w:commentRangeStart']) {
        targetParagraph['w:commentRangeStart'] = {
          $: { 'w:id': commentIdNum.toString() }
        };
      }

      if (!targetParagraph['w:commentRangeEnd']) {
        targetParagraph['w:commentRangeEnd'] = {
          $: { 'w:id': commentIdNum.toString() }
        };
      }

      // Add comment reference
      if (!targetParagraph['w:r']) {
        targetParagraph['w:r'] = [];
      }
      const runs = Array.isArray(targetParagraph['w:r']) ? targetParagraph['w:r'] : [targetParagraph['w:r']];
      runs.push({
        'w:commentReference': {
          $: { 'w:id': commentIdNum.toString() }
        }
      });
      targetParagraph['w:r'] = runs;

      // Save modified document.xml
      const modifiedDocXml = this.buildXml(doc);
      zip.file('word/document.xml', modifiedDocXml);

      // Create or modify comments.xml
      let commentsXml = await zip.file('word/comments.xml')?.async('string');
      let comments: any;

      if (commentsXml) {
        comments = await this.parseXml(commentsXml);
      } else {
        // Create new comments.xml structure
        comments = {
          'w:comments': {
            $: {
              'xmlns:w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
              'xmlns:w14': 'http://schemas.microsoft.com/office/word/2010/wordml',
              'xmlns:w15': 'http://schemas.microsoft.com/office/word/2012/wordml',
            },
            'w:comment': []
          }
        };
      }

      // Add new comment
      const newComment = {
        $: {
          'w:id': commentIdNum.toString(),
          'w:author': author,
          'w:initials': initials,
          'w:date': created_at,
        },
        'w:p': {
          'w:r': {
            'w:t': comment_text
          }
        }
      };

      if (!comments['w:comments']['w:comment']) {
        comments['w:comments']['w:comment'] = [];
      }

      const commentList = Array.isArray(comments['w:comments']['w:comment'])
        ? comments['w:comments']['w:comment']
        : [comments['w:comments']['w:comment']];
      commentList.push(newComment);
      comments['w:comments']['w:comment'] = commentList;

      // Save comments.xml
      const modifiedCommentsXml = this.buildXml(comments);
      zip.file('word/comments.xml', modifiedCommentsXml);

      // Update [Content_Types].xml if needed
      const contentTypesXml = await zip.file('[Content_Types].xml')!.async('string');
      if (!contentTypesXml.includes('comments.xml')) {
        const contentTypes = await this.parseXml(contentTypesXml);
        if (!contentTypes.Types.Override) {
          contentTypes.Types.Override = [];
        }
        const overrides = Array.isArray(contentTypes.Types.Override)
          ? contentTypes.Types.Override
          : [contentTypes.Types.Override];
        overrides.push({
          $: {
            PartName: '/word/comments.xml',
            ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml'
          }
        });
        contentTypes.Types.Override = overrides;
        zip.file('[Content_Types].xml', this.buildXml(contentTypes));
      }

      // Update word/_rels/document.xml.rels if needed
      const relsXml = await zip.file('word/_rels/document.xml.rels')!.async('string');
      if (!relsXml.includes('comments.xml')) {
        const rels = await this.parseXml(relsXml);
        if (!rels.Relationships.Relationship) {
          rels.Relationships.Relationship = [];
        }
        const relationships = Array.isArray(rels.Relationships.Relationship)
          ? rels.Relationships.Relationship
          : [rels.Relationships.Relationship];
        const maxId = Math.max(...relationships.map((r: any) => parseInt(r.$.Id.replace('rId', ''))));
        relationships.push({
          $: {
            Id: `rId${maxId + 1}`,
            Type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments',
            Target: 'comments.xml'
          }
        });
        rels.Relationships.Relationship = relationships;
        zip.file('word/_rels/document.xml.rels', this.buildXml(rels));
      }

      // Save the modified .docx
      await this.saveDocxZip(zip, file_path);

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
    validateFilePath(filePath);
    validateFileExtension(filePath);

    try {
      const zip = await this.loadDocxZip(filePath);
      const commentsXml = await zip.file('word/comments.xml')?.async('string');

      if (!commentsXml) {
        return [];
      }

      const comments = await this.parseXml(commentsXml);
      const commentList = comments['w:comments']?.['w:comment'];

      if (!commentList) {
        return [];
      }

      const commentArray = Array.isArray(commentList) ? commentList : [commentList];

      return commentArray.map((c: any) => {
        let text = '';
        if (c['w:p']) {
          const paragraphs = Array.isArray(c['w:p']) ? c['w:p'] : [c['w:p']];
          paragraphs.forEach((p: any) => {
            if (p['w:r']) {
              const runs = Array.isArray(p['w:r']) ? p['w:r'] : [p['w:r']];
              runs.forEach((r: any) => {
                if (r['w:t']) {
                  // Handle both string and object cases
                  const textContent = r['w:t'];
                  if (typeof textContent === 'string') {
                    text += textContent;
                  } else if (typeof textContent === 'object' && textContent._) {
                    text += textContent._;
                  }
                }
              });
            }
          });
        }

        return {
          comment_id: c.$['w:id'] || '',
          paragraph_index: -1, // Would need to parse document.xml to find this
          comment_text: text,
          author: c.$['w:author'] || 'Unknown',
          initials: c.$['w:initials'] || '',
          created_at: c.$['w:date'] || new Date().toISOString(),
        };
      });
    } catch (error) {
      handleDocxError(error);
    }
  }
}
