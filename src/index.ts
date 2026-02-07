#!/usr/bin/env node
/**
 * Entry point for docs-comment-mcp server
 */

import { DocsCommentServer } from './server.js';

async function main() {
  try {
    const server = new DocsCommentServer();
    await server.run();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
