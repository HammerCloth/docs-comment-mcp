/**
 * Text diff utility for character-level comparison
 */

export interface DiffOperation {
  type: 'equal' | 'insert' | 'delete';
  text: string;
}

/**
 * Calculate position-based character diff
 * Compares characters at the same position, preserving unchanged characters
 * This is the most intuitive diff for document editing
 */
export function calculatePositionDiff(oldText: string, newText: string): DiffOperation[] {
  const operations: DiffOperation[] = [];
  const maxLen = Math.max(oldText.length, newText.length);

  let i = 0;
  while (i < maxLen) {
    const oldChar = i < oldText.length ? oldText[i] : null;
    const newChar = i < newText.length ? newText[i] : null;

    if (oldChar === newChar && oldChar !== null) {
      // Same character at same position - keep it
      if (operations.length > 0 && operations[operations.length - 1].type === 'equal') {
        operations[operations.length - 1].text += oldChar;
      } else {
        operations.push({ type: 'equal', text: oldChar });
      }
      i++;
    } else if (oldChar !== null && newChar !== null) {
      // Different characters at same position - delete old, insert new
      if (operations.length > 0 && operations[operations.length - 1].type === 'delete') {
        operations[operations.length - 1].text += oldChar;
      } else {
        operations.push({ type: 'delete', text: oldChar });
      }

      if (operations.length > 0 && operations[operations.length - 1].type === 'insert') {
        operations[operations.length - 1].text += newChar;
      } else {
        operations.push({ type: 'insert', text: newChar });
      }
      i++;
    } else if (oldChar !== null) {
      // Old text is longer - delete remaining
      if (operations.length > 0 && operations[operations.length - 1].type === 'delete') {
        operations[operations.length - 1].text += oldChar;
      } else {
        operations.push({ type: 'delete', text: oldChar });
      }
      i++;
    } else if (newChar !== null) {
      // New text is longer - insert remaining
      if (operations.length > 0 && operations[operations.length - 1].type === 'insert') {
        operations[operations.length - 1].text += newChar;
      } else {
        operations.push({ type: 'insert', text: newChar });
      }
      i++;
    }
  }

  return operations;
}

/**
 * Calculate character-level diff between two strings
 * Uses a simple but effective algorithm similar to Myers diff
 */
export function calculateDiff(oldText: string, newText: string): DiffOperation[] {
  const operations: DiffOperation[] = [];

  // Use dynamic programming to find the longest common subsequence
  const m = oldText.length;
  const n = newText.length;

  // Create DP table
  const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

  // Fill DP table
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldText[i - 1] === newText[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the diff
  let i = m;
  let j = n;
  const result: DiffOperation[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldText[i - 1] === newText[j - 1]) {
      result.unshift({ type: 'equal', text: oldText[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'insert', text: newText[j - 1] });
      j--;
    } else if (i > 0) {
      result.unshift({ type: 'delete', text: oldText[i - 1] });
      i--;
    }
  }

  // Merge consecutive operations of the same type
  for (const op of result) {
    if (operations.length > 0 && operations[operations.length - 1].type === op.type) {
      operations[operations.length - 1].text += op.text;
    } else {
      operations.push(op);
    }
  }

  return operations;
}

/**
 * Calculate word-level diff for better readability
 */
export function calculateWordDiff(oldText: string, newText: string): DiffOperation[] {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);

  const m = oldWords.length;
  const n = newWords.length;

  const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldWords[i - 1] === newWords[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = m;
  let j = n;
  const result: DiffOperation[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      result.unshift({ type: 'equal', text: oldWords[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'insert', text: newWords[j - 1] });
      j--;
    } else if (i > 0) {
      result.unshift({ type: 'delete', text: oldWords[i - 1] });
      i--;
    }
  }

  const operations: DiffOperation[] = [];
  for (const op of result) {
    if (operations.length > 0 && operations[operations.length - 1].type === op.type) {
      operations[operations.length - 1].text += op.text;
    } else {
      operations.push(op);
    }
  }

  return operations;
}
