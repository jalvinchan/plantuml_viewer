import fs from 'node:fs';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadScript, rootDir } from './load-script.js';

beforeAll(() => {
  loadScript('js/samples.js');
});

describe('sample catalog', () => {
  it('matches the Markdown sample files', () => {
    const readme = fs.readFileSync(path.join(rootDir, 'README.md'), 'utf8');
    const expected = [
      'samples/welcome.md',
      'samples/oauth2.md',
      'samples/architecture.md',
      'samples/mindmap.md',
      'samples/activity.md',
      'samples/state.md'
    ];

    expect(window.StudioSamples.map(sample => sample.file)).toEqual(expected);
    window.StudioSamples.forEach(sample => {
      expect(sample.content).toBe(fs.readFileSync(path.join(rootDir, sample.file), 'utf8'));
      expect(readme).toContain(path.basename(sample.file));
    });
  });
});
