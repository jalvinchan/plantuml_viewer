import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadScript, rootDir } from './load-script.js';

beforeAll(() => {
  loadScript('vendor/pako.min.js');
  loadScript('vendor/marked.min.js');
  loadScript('vendor/purify.min.js');
  loadScript('vendor/highlight.min.js');
  loadScript('js/config.js');
  loadScript('js/plantuml-encoder.js');
  loadScript('js/renderer.js');
});

describe('Markdown renderer', () => {
  const diagram = '```plantuml\n@startuml\nA -> B\n@enduml\n```';

  it('counts one diagram when a fence also contains @startuml', () => {
    expect(window.MarkdownRenderer.countDiagrams(diagram)).toBe(1);
    const html = window.MarkdownRenderer.render(diagram);
    expect(html.match(/plantuml-card/g)).toHaveLength(1);
  });

  it('counts the diagrams in the welcome sample without the prose examples', () => {
    const welcome = fs.readFileSync(path.join(rootDir, 'samples/welcome.md'), 'utf8');
    expect(window.MarkdownRenderer.countDiagrams(welcome)).toBe(4);
  });

  it('renders Markdown when DOMPurify is available', () => {
    const html = window.MarkdownRenderer.render('**bold**');
    expect(html).toContain('<strong>bold</strong>');
  });

  it('returns escaped source when DOMPurify is unavailable', () => {
    const purify = window.DOMPurify;
    delete window.DOMPurify;
    try {
      const html = window.MarkdownRenderer.render('**bold** <script>alert(1)</script>');
      expect(html).not.toContain('<script>');
      expect(html).not.toContain('<strong>');
      expect(html).toContain('&lt;script&gt;');
    } finally {
      window.DOMPurify = purify;
    }
  });
});
