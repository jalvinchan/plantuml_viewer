import { beforeAll, describe, expect, it } from 'vitest';
import { loadScript } from './load-script.js';

beforeAll(() => {
  loadScript('vendor/marked.min.js');
  loadScript('js/config.js');
  loadScript('js/renderer.js');
  loadScript('js/stats.js');
});

describe('document statistics', () => {
  it('counts words and one fenced diagram', () => {
    expect(window.StudioStats.summarize('hello world').words).toBe(2);
    const stats = window.StudioStats.summarize('```plantuml\n@startuml\nA -> B\n@enduml\n```');
    expect(stats.diagrams).toBe(1);
  });
});
