# Comment on Specific Text Feature

## Overview

The `addComment` method now supports commenting on specific text within a paragraph, not just entire paragraphs.

## Usage

### 1. Comment on Entire Paragraph (Original Behavior)

```typescript
await service.addComment({
  file_path: 'document.docx',
  comment_text: 'This is a comment on the entire paragraph',
  paragraph_index: 0,
  author: 'AI Assistant',
  initials: 'AI'
});
```

### 2. Comment on Specific Text (by text string)

```typescript
await service.addComment({
  file_path: 'document.docx',
  comment_text: 'This word needs clarification',
  paragraph_index: 0,
  text: 'specific word', // The text to comment on
  author: 'AI Assistant',
  initials: 'AI'
});
```

### 3. Comment on Position Range (by character positions)

```typescript
await service.addComment({
  file_path: 'document.docx',
  comment_text: 'This range needs review',
  paragraph_index: 0,
  start_pos: 10, // Character index (0-based)
  end_pos: 25,   // Character index (0-based)
  author: 'AI Assistant',
  initials: 'AI'
});
```

## Implementation Details

### Type Definition

```typescript
export interface AddCommentInput {
  file_path: string;
  comment_text: string;
  paragraph_index: number;
  text?: string;        // Optional: specific text to comment on
  start_pos?: number;   // Optional: start position (character index)
  end_pos?: number;     // Optional: end position (character index)
  author?: string;
  initials?: string;
}
```

### Behavior

1. **If `text` is provided**: The method searches for the text within the paragraph and adds a comment to that specific text range.

2. **If `start_pos` and `end_pos` are provided**: The method adds a comment to the specified character range (0-based indexing).

3. **If neither is provided**: The method comments on the entire paragraph (original behavior).

### OOXML Structure

The implementation correctly follows Word OOXML specifications:

- `w:commentRangeStart` marks the beginning of the commented text
- `w:commentRangeEnd` marks the end of the commented text
- `w:commentReference` links to the actual comment content
- These elements are inserted at the run level (`w:r`), not paragraph level

### Run Splitting

When the target text is in the middle of a run, the implementation:

1. Splits the run at the start position
2. Inserts `commentRangeStart`
3. Keeps the commented text
4. Inserts `commentRangeEnd` and `commentReference`
5. Continues with remaining text

### Multi-Run Support

If the target text spans multiple runs, the implementation:

1. Finds the start run and end run
2. Inserts `commentRangeStart` before the first character of the range
3. Preserves all runs within the range
4. Inserts `commentRangeEnd` and `commentReference` after the last character

## Error Handling

- **TEXT_NOT_FOUND**: Thrown when the specified text is not found in the paragraph
- **RANGE_NOT_FOUND**: Thrown when the position range is invalid or out of bounds
- **INVALID_INPUT**: Thrown when neither text nor position range is provided (when trying to comment on specific text)
- **INVALID_RANGE**: Thrown when start_pos >= end_pos or start_pos < 0

## Testing

A manual test script is provided at `test-comment-on-text.js`. To use it:

1. Place a sample `.docx` file named `sample.docx` in the project root
2. Run: `node test-comment-on-text.js`
3. Check the generated `test-comment-text.docx` file

## Compatibility

- Fully compatible with Microsoft Word 2016+
- Follows OOXML WordprocessingML specification
- Comments are visible in Word's review pane
- Commented text is highlighted in the document
