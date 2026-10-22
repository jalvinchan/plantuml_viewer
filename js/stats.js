/**
 * Editor statistics. Diagram totals come from the Markdown parser.
 */
(function (global) {
  'use strict';

  function summarize(text) {
    const source = text || '';
    const words = source.trim() ? (source.trim().match(/\S+/g) || []).length : 0;
    const renderer = global.MarkdownRenderer;
    const diagrams = renderer && typeof renderer.countDiagrams === 'function'
      ? renderer.countDiagrams(source)
      : 0;
    return {
      words,
      chars: source.length,
      diagrams
    };
  }

  global.StudioStats = { summarize };
})(typeof window !== 'undefined' ? window : globalThis);
