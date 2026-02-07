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
  DeleteCommentInput,
  Revision,
  InsertTextInput,
  DeleteTextInput,
  ReplaceTextInput,
  ModifyParagraphInput,
  SuggestRevisionInput,
  RevisionSuggestion,
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
import { calculateWordDiff, calculatePositionDiff, DiffOperation } from '../utils/text-diff.js';

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
   * Add a comment to a specific paragraph or text within a paragraph
   */
  async addComment(input: AddCommentInput): Promise<Comment> {
    const {
      file_path,
      comment_text,
      paragraph_index,
      text,
      start_pos,
      end_pos,
      author = 'AI Assistant',
      initials = 'AI',
    } = input;

    validateFilePath(file_path);
    validateFileExtension(file_path);
    validateCommentText(comment_text);
    validateFileWritable(file_path);

    // Require either text or position range
    if (!text && !(start_pos !== undefined && end_pos !== undefined)) {
      throw new DocumentError(
        'Must specify either "text" or both "start_pos" and "end_pos" to comment on specific text',
        'MISSING_TEXT_SELECTION'
      );
    }

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

      // Ensure runs array exists
      if (!targetParagraph['w:r']) {
        targetParagraph['w:r'] = [];
      }
      let runs = Array.isArray(targetParagraph['w:r']) ? targetParagraph['w:r'] : [targetParagraph['w:r']];

      // Determine comment range based on input parameters
      let startRunIndex = 0;
      let endRunIndex = runs.length;
      let startCharOffset = 0;
      let endCharOffset = 0;

      // Find the target text or position range
        let currentPos = 0;
      let targetStart = start_pos;
      let targetEnd = end_pos;

      // If text is provided, find its position
      if (text) {
          const paragraphText = docInfo.paragraphs[paragraph_index].text;
        const textIndex = paragraphText.indexOf(text);
        if (textIndex === -1) {
          throw new DocumentError(
            `Text "${text}" not found in paragraph ${paragraph_index}`,
            'TEXT_NOT_FOUND'
          );
        }
        targetStart = textIndex;
        targetEnd = textIndex + text.length;
      }

      // Validate position range
      if (targetStart === undefined || targetEnd === undefined) {
        throw new DocumentError(
          'Either text or both start_pos and end_pos must be provided',
          'INVALID_INPUT'
        );
      }

      if (targetStart < 0 || targetEnd <= targetStart) {
        throw new DocumentError(
          'Invalid position range: start_pos must be >= 0 and end_pos must be > start_pos',
          'INVALID_RANGE'
        );
      }

      // Find the runs that contain the target range
      let foundStart = false;
      let foundEnd = false;

      for (let i = 0; i < runs.length; i++) {
          const run = runs[i];
        if (!run || !run['w:t']) continue;

        const textContent = typeof run['w:t'] === 'string' ? run['w:t'] : run['w:t']._;
        if (!textContent) continue;

        const runLength = textContent.length;
        const runStart = currentPos;
        const runEnd = currentPos + runLength;

        // Check if this run contains the start position
        if (!foundStart && targetStart >= runStart && targetStart < runEnd) {
          startRunIndex = i;
          startCharOffset = targetStart - runStart;
          foundStart = true;
        }

        // Check if this run contains the end position
        if (!foundEnd && targetEnd > runStart && targetEnd <= runEnd) {
          endRunIndex = i;
          endCharOffset = targetEnd - runStart;
          foundEnd = true;
        }

        currentPos += runLength;

        if (foundStart && foundEnd) break;
      }

      if (!foundStart || !foundEnd) {
        throw new DocumentError(
          `Position range ${targetStart}-${targetEnd} not found in paragraph ${paragraph_index}`,
          'RANGE_NOT_FOUND'
        );
      }

      // Split runs if necessary to insert comment markers at exact positions
      const newRuns: any[] = [];

      for (let i = 0; i < runs.length; i++) {
          const run = runs[i];

        if (i === startRunIndex && startCharOffset > 0) {
            // Split the start run
          const textContent = typeof run['w:t'] === 'string' ? run['w:t'] : run['w:t']._;
          const beforeText = textContent.substring(0, startCharOffset);
          const afterText = textContent.substring(startCharOffset);

          // Add the part before the comment
          if (beforeText) {
            newRuns.push({
              'w:r': {
                'w:t': beforeText,
              },
            });
          }

          // Add comment range start
          newRuns.push({
            'w:commentRangeStart': {
              $: { 'w:id': commentIdNum.toString() },
            },
          });

          // Add the part after the split (within comment range)
          if (afterText) {
            if (i === endRunIndex) {
              // This run contains both start and end
              const commentText = afterText.substring(0, endCharOffset - startCharOffset);
              const afterCommentText = afterText.substring(endCharOffset - startCharOffset);

              if (commentText) {
                newRuns.push({
                  'w:r': {
                    'w:t': commentText,
                  },
                });
              }

              // Add comment range end
              newRuns.push({
                'w:commentRangeEnd': {
                  $: { 'w:id': commentIdNum.toString() },
                },
              });

              // Add comment reference
              newRuns.push({
                'w:r': {
                  'w:commentReference': {
                    $: { 'w:id': commentIdNum.toString() },
                  },
                },
              });

              if (afterCommentText) {
                newRuns.push({
                  'w:r': {
                    'w:t': afterCommentText,
                  },
                });
              }
            } else {
              newRuns.push({
                'w:r': {
                  'w:t': afterText,
                },
              });
            }
          }
        } else if (i === endRunIndex && i !== startRunIndex) {
            // Split the end run
          const textContent = typeof run['w:t'] === 'string' ? run['w:t'] : run['w:t']._;
          const beforeText = textContent.substring(0, endCharOffset);
          const afterText = textContent.substring(endCharOffset);

          if (beforeText) {
            newRuns.push({
              'w:r': {
                'w:t': beforeText,
              },
            });
          }

          // Add comment range end
          newRuns.push({
            'w:commentRangeEnd': {
              $: { 'w:id': commentIdNum.toString() },
            },
          });

          // Add comment reference
          newRuns.push({
            'w:r': {
              'w:commentReference': {
                $: { 'w:id': commentIdNum.toString() },
              },
            },
          });

          if (afterText) {
            newRuns.push({
              'w:r': {
                'w:t': afterText,
              },
            });
          }
        } else if (i > startRunIndex && i < endRunIndex) {
          // Runs between start and end are within the comment range
          newRuns.push(run);
        } else if (i < startRunIndex || i > endRunIndex) {
          // Runs outside the comment range
          newRuns.push(run);
        }
      }

      runs = newRuns;

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

  /**
   * Delete a comment from a document by its comment ID
   */
  async deleteComment(input: DeleteCommentInput): Promise<{ success: boolean; comment_id: string }> {
    const { file_path, comment_id } = input;

    validateFilePath(file_path);
    validateFileExtension(file_path);
    validateFileWritable(file_path);

    try {
      const zip = await this.loadDocxZip(file_path);

      // Read comments.xml
      const commentsXml = await zip.file('word/comments.xml')?.async('string');
      if (!commentsXml) {
        throw new DocumentError('No comments found in document', 'NO_COMMENTS');
      }

      const comments = await this.parseXml(commentsXml);
      const commentList = comments['w:comments']?.['w:comment'];

      if (!commentList) {
        throw new DocumentError('No comments found in document', 'NO_COMMENTS');
      }

      const commentArray = Array.isArray(commentList) ? commentList : [commentList];

      // Find the comment to delete
      const commentIndex = commentArray.findIndex((c: any) => c.$['w:id'] === comment_id);
      if (commentIndex === -1) {
        throw new DocumentError(`Comment with ID ${comment_id} not found`, 'COMMENT_NOT_FOUND');
      }

      // Remove the comment from the array
      commentArray.splice(commentIndex, 1);

      // Update the comments structure
      if (commentArray.length === 0) {
        // If no comments left, remove the comment element entirely
        delete comments['w:comments']['w:comment'];
      } else {
        comments['w:comments']['w:comment'] = commentArray.length === 1 ? commentArray[0] : commentArray;
      }

      // Save modified comments.xml
      const modifiedCommentsXml = this.buildXml(comments);
      zip.file('word/comments.xml', modifiedCommentsXml);

      // Read and modify document.xml to remove comment references
      const documentXml = await zip.file('word/document.xml')!.async('string');
      const doc = await this.parseXml(documentXml);

      const body = doc['w:document']['w:body'];
      const wParagraphs = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']];

      // Remove commentRangeStart, commentRangeEnd, and commentReference for this comment
      wParagraphs.forEach((p: any) => {
        if (!p) return;

        // Process all elements in the paragraph
        const paragraphElements = Object.keys(p);
        paragraphElements.forEach((key) => {
          if (key === 'w:commentRangeStart' || key === 'w:commentRangeEnd') {
            const elements = Array.isArray(p[key]) ? p[key] : [p[key]];
            p[key] = elements.filter((el: any) => el.$['w:id'] !== comment_id);
            if (p[key].length === 0) delete p[key];
            else if (p[key].length === 1) p[key] = p[key][0];
          }
        });

        // Remove commentReference from runs
        if (p['w:r']) {
          const runs = Array.isArray(p['w:r']) ? p['w:r'] : [p['w:r']];
          p['w:r'] = runs.filter((run: any) => {
            if (run['w:commentReference']) {
              return run['w:commentReference'].$['w:id'] !== comment_id;
            }
            return true;
          });
          if (p['w:r'].length === 0) delete p['w:r'];
          else if (p['w:r'].length === 1) p['w:r'] = p['w:r'][0];
        }
      });

      // Save modified document.xml
      const modifiedDocXml = this.buildXml(doc);
      zip.file('word/document.xml', modifiedDocXml);

      // Save the modified .docx
      await this.saveDocxZip(zip, file_path);

      return {
        success: true,
        comment_id,
      };
    } catch (error) {
      if (error instanceof DocumentError) {
        throw error;
      }
      handleDocxError(error);
    }
  }

  /**
   * Insert text with track changes (revision mode)
   */
  async insertText(input: InsertTextInput): Promise<Revision> {
    const {
      file_path,
      paragraph_index,
      text,
      position,
      author = 'AI Assistant',
      date = new Date().toISOString(),
    } = input;

    validateFilePath(file_path);
    validateFileExtension(file_path);
    validateFileWritable(file_path);

    try {
      const docInfo = await this.getDocumentInfo(file_path);
      validateParagraphIndex(paragraph_index, docInfo.total_paragraphs);

      const zip = await this.loadDocxZip(file_path);
      const revision_id = uuidv4();
      const revisionIdNum = Date.now() % 1000000;

      // Read and modify document.xml
      const documentXml = await zip.file('word/document.xml')!.async('string');
      const doc = await this.parseXml(documentXml);

      const body = doc['w:document']['w:body'];
      const wParagraphs = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']];
      const targetParagraph = wParagraphs[paragraph_index];

      if (!targetParagraph) {
        throw new DocumentError(`Paragraph ${paragraph_index} not found`, 'PARAGRAPH_NOT_FOUND');
      }

      // Create insertion run with track changes
      const insertRun = {
        'w:ins': {
          $: {
            'w:id': revisionIdNum.toString(),
            'w:author': author,
            'w:date': date,
          },
          'w:r': {
            'w:t': text,
          },
        },
      };

      // Add to paragraph runs
      if (!targetParagraph['w:r']) {
        targetParagraph['w:r'] = [];
      }
      const runs = Array.isArray(targetParagraph['w:r']) ? targetParagraph['w:r'] : [targetParagraph['w:r']];

      if (position !== undefined && position < runs.length) {
        runs.splice(position, 0, insertRun);
      } else {
        runs.push(insertRun);
      }
      targetParagraph['w:r'] = runs;

      // Save modified document
      const modifiedDocXml = this.buildXml(doc);
      zip.file('word/document.xml', modifiedDocXml);
      await this.saveDocxZip(zip, file_path);

      return {
        revision_id,
        revision_type: 'insert',
        paragraph_index,
        text,
        author,
        date,
      };
    } catch (error) {
      if (error instanceof DocumentError) {
        throw error;
      }
      handleDocxError(error);
    }
  }

  /**
   * Delete text with track changes (revision mode)
   */
  async deleteText(input: DeleteTextInput): Promise<Revision> {
    const {
      file_path,
      paragraph_index,
      text,
      author = 'AI Assistant',
      date = new Date().toISOString(),
    } = input;

    validateFilePath(file_path);
    validateFileExtension(file_path);
    validateFileWritable(file_path);

    try {
      const docInfo = await this.getDocumentInfo(file_path);
      validateParagraphIndex(paragraph_index, docInfo.total_paragraphs);

      const zip = await this.loadDocxZip(file_path);
      const revision_id = uuidv4();
      const revisionIdNum = Date.now() % 1000000;

      // Read and modify document.xml
      const documentXml = await zip.file('word/document.xml')!.async('string');
      const doc = await this.parseXml(documentXml);

      const body = doc['w:document']['w:body'];
      const wParagraphs = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']];
      const targetParagraph = wParagraphs[paragraph_index];

      if (!targetParagraph) {
        throw new DocumentError(`Paragraph ${paragraph_index} not found`, 'PARAGRAPH_NOT_FOUND');
      }

      // Find and mark text for deletion
      const runs = targetParagraph['w:r'];
      if (runs) {
        const runArray = Array.isArray(runs) ? runs : [runs];
        let found = false;

        for (let i = 0; i < runArray.length; i++) {
          const run = runArray[i];
          if (run && run['w:t']) {
            const textContent = typeof run['w:t'] === 'string' ? run['w:t'] : run['w:t']._;
            if (textContent && textContent.includes(text)) {
              // Replace with deletion markup
              runArray[i] = {
                'w:del': {
                  $: {
                    'w:id': revisionIdNum.toString(),
                    'w:author': author,
                    'w:date': date,
                  },
                  'w:r': {
                    'w:delText': text,
                  },
                },
              };
              found = true;
              break;
            }
          }
        }

        if (!found) {
          throw new DocumentError(`Text "${text}" not found in paragraph ${paragraph_index}`, 'TEXT_NOT_FOUND');
        }

        targetParagraph['w:r'] = runArray;
      }

      // Save modified document
      const modifiedDocXml = this.buildXml(doc);
      zip.file('word/document.xml', modifiedDocXml);
      await this.saveDocxZip(zip, file_path);

      return {
        revision_id,
        revision_type: 'delete',
        paragraph_index,
        text,
        author,
        date,
      };
    } catch (error) {
      if (error instanceof DocumentError) {
        throw error;
      }
      handleDocxError(error);
    }
  }

  /**
   * Replace text with track changes using word-level diff (more natural, human-like revisions)
   */
  async replaceText(input: ReplaceTextInput): Promise<Revision[]> {
    const {
      file_path,
      paragraph_index,
      old_text,
      new_text,
      author = 'AI Assistant',
      date = new Date().toISOString(),
    } = input;

    validateFilePath(file_path);
    validateFileExtension(file_path);
    validateFileWritable(file_path);

    try {
      const docInfo = await this.getDocumentInfo(file_path);
      validateParagraphIndex(paragraph_index, docInfo.total_paragraphs);

      // Use word-level diff for more natural, human-like revisions
      // This groups changes by words/phrases rather than individual characters
      const diffOps = calculateWordDiff(old_text, new_text);

      const zip = await this.loadDocxZip(file_path);
      const documentXml = await zip.file('word/document.xml')!.async('string');
      const doc = await this.parseXml(documentXml);

      const body = doc['w:document']['w:body'];
      const wParagraphs = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']];
      const targetParagraph = wParagraphs[paragraph_index];

      if (!targetParagraph) {
        throw new DocumentError(`Paragraph ${paragraph_index} not found`, 'PARAGRAPH_NOT_FOUND');
      }

      // Clear existing runs and rebuild with diff operations
      const newRuns: any[] = [];
      const revisions: Revision[] = [];

      for (const op of diffOps) {
        const revisionIdNum = Date.now() % 1000000 + newRuns.length;

        if (op.type === 'equal') {
          // Keep unchanged text
          newRuns.push({
            'w:r': {
              'w:t': op.text,
            },
          });
        } else if (op.type === 'delete') {
          // Mark as deletion
          newRuns.push({
            'w:del': {
              $: {
                'w:id': revisionIdNum.toString(),
                'w:author': author,
                'w:date': date,
              },
              'w:r': {
                'w:delText': op.text,
              },
            },
          });

          revisions.push({
            revision_id: revisionIdNum.toString(),
            revision_type: 'delete',
            paragraph_index,
            text: op.text,
            author,
            date,
          });
        } else if (op.type === 'insert') {
          // Mark as insertion
          newRuns.push({
            'w:ins': {
              $: {
                'w:id': revisionIdNum.toString(),
                'w:author': author,
                'w:date': date,
              },
              'w:r': {
                'w:t': op.text,
              },
            },
          });

          revisions.push({
            revision_id: revisionIdNum.toString(),
            revision_type: 'insert',
            paragraph_index,
            text: op.text,
            author,
            date,
          });
        }
      }

      // Replace paragraph runs
      targetParagraph['w:r'] = newRuns;

      // Save modified document
      const modifiedDocXml = this.buildXml(doc);
      zip.file('word/document.xml', modifiedDocXml);
      await this.saveDocxZip(zip, file_path);

      return revisions;
    } catch (error) {
      if (error instanceof DocumentError) {
        throw error;
      }
      handleDocxError(error);
    }
  }

  /**
   * Modify entire paragraph with track changes using word-level diff
   */
  async modifyParagraph(input: ModifyParagraphInput): Promise<Revision[]> {
    const {
      file_path,
      paragraph_index,
      new_text,
      author = 'AI Assistant',
      date = new Date().toISOString(),
    } = input;

    validateFilePath(file_path);
    validateFileExtension(file_path);
    validateFileWritable(file_path);

    try {
      const docInfo = await this.getDocumentInfo(file_path);
      validateParagraphIndex(paragraph_index, docInfo.total_paragraphs);

      const oldText = docInfo.paragraphs[paragraph_index].text;

      // Use replaceText with word-level diff for natural revisions
      return await this.replaceText({
        file_path,
        paragraph_index,
        old_text: oldText,
        new_text,
        author,
        date,
      });
    } catch (error) {
      if (error instanceof DocumentError) {
        throw error;
      }
      handleDocxError(error);
    }
  }

  /**
   * Get all revisions from a document
   */
  async getRevisions(filePath: string): Promise<Revision[]> {
    validateFilePath(filePath);
    validateFileExtension(filePath);

    try {
      const zip = await this.loadDocxZip(filePath);
      const documentXml = await zip.file('word/document.xml')?.async('string');

      if (!documentXml) {
        return [];
      }

      const doc = await this.parseXml(documentXml);
      const body = doc['w:document']['w:body'];
      const wParagraphs = Array.isArray(body['w:p']) ? body['w:p'] : [body['w:p']];

      const revisions: Revision[] = [];

      wParagraphs.forEach((p: any, paragraphIndex: number) => {
        if (!p) return;

        const runs = p['w:r'];
        if (!runs) return;

        const runArray = Array.isArray(runs) ? runs : [runs];

        runArray.forEach((run: any) => {
          // Check for insertions
          if (run['w:ins']) {
            const ins = run['w:ins'];
            let text = '';
            if (ins['w:r'] && ins['w:r']['w:t']) {
              const textContent = ins['w:r']['w:t'];
              text = typeof textContent === 'string' ? textContent : textContent._;
            }

            revisions.push({
              revision_id: ins.$['w:id'] || '',
              revision_type: 'insert',
              paragraph_index: paragraphIndex,
              text,
              author: ins.$['w:author'] || 'Unknown',
              date: ins.$['w:date'] || new Date().toISOString(),
            });
          }

          // Check for deletions
          if (run['w:del']) {
            const del = run['w:del'];
            let text = '';
            if (del['w:r'] && del['w:r']['w:delText']) {
              const textContent = del['w:r']['w:delText'];
              text = typeof textContent === 'string' ? textContent : textContent._;
            }

            revisions.push({
              revision_id: del.$['w:id'] || '',
              revision_type: 'delete',
              paragraph_index: paragraphIndex,
              text,
              author: del.$['w:author'] || 'Unknown',
              date: del.$['w:date'] || new Date().toISOString(),
            });
          }
        });
      });

      return revisions;
    } catch (error) {
      handleDocxError(error);
    }
  }

  /**
   * Suggest a revision for a specific text segment
   * AI identifies what to change, where, and why - mimicking human review
   */
  async suggestRevision(input: SuggestRevisionInput): Promise<RevisionSuggestion> {
    const {
      file_path,
      paragraph_index,
      original_text,
      suggested_text,
      reason,
      apply_immediately = false,
      author = 'AI Assistant',
      date = new Date().toISOString(),
    } = input;

    validateFilePath(file_path);
    validateFileExtension(file_path);

    try {
      const docInfo = await this.getDocumentInfo(file_path);
      validateParagraphIndex(paragraph_index, docInfo.total_paragraphs);

      const paragraphText = docInfo.paragraphs[paragraph_index].text;

      // Verify the original text exists in the paragraph
      if (!paragraphText.includes(original_text)) {
        throw new DocumentError(
          `Original text "${original_text}" not found in paragraph ${paragraph_index}`,
          'TEXT_NOT_FOUND'
        );
      }

      // If apply_immediately is true, apply the revision
      if (apply_immediately) {
        if (file_path) {
          validateFileWritable(file_path);
        }

        const revisions = await this.replaceText({
          file_path,
          paragraph_index,
          old_text: original_text,
          new_text: suggested_text,
          author,
          date,
        });

        return {
          paragraph_index,
          original_text,
          suggested_text,
          reason,
          applied: true,
          revisions,
        };
      }

      // Otherwise, just return the suggestion
      return {
        paragraph_index,
        original_text,
        suggested_text,
        reason,
        applied: false,
      };
    } catch (error) {
      if (error instanceof DocumentError) {
        throw error;
      }
      handleDocxError(error);
    }
  }
}
