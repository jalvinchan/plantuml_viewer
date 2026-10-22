import { beforeAll, describe, expect, it } from 'vitest';
import { loadScript } from './load-script.js';

beforeAll(() => {
  loadScript('js/export.js');
});

function previewWithDiagram() {
  const preview = document.createElement('article');
  preview.innerHTML = `
    <div class="plantuml-card">
      <div class="plantuml-toolbar"><button type="button">Zoom</button></div>
      <div class="plantuml-content">
        <img class="plantuml-img" src="http://diagram.example/svg/abc" alt="Diagram">
      </div>
      <textarea class="plantuml-raw-source">secret</textarea>
    </div>
  `;
  return preview;
}

describe('standalone export', () => {
  it('inlines styles and embeds a diagram image', async () => {
    const preview = previewWithDiagram();
    const blob = new Blob(['<svg xmlns="http://www.w3.org/2000/svg"></svg>'], { type: 'image/svg+xml' });
    const result = await window.StudioExport.buildStandaloneHtml(preview, {
      title: 'Export <test>',
      fetch: async () => ({ ok: true, blob: async () => blob })
    });

    expect(result.failures).toEqual([]);
    expect(result.html).toContain('<style>');
    expect(result.html).not.toContain('cdnjs.cloudflare.com');
    expect(result.html).not.toContain('Zoom');
    expect(result.html).not.toContain('secret');
    expect(result.html).toContain('data:image/svg+xml;base64,');
    expect(result.html).toContain('&lt;test&gt;');
  });

  it('keeps the remote image and reports a blocked read', async () => {
    const preview = previewWithDiagram();
    const result = await window.StudioExport.buildStandaloneHtml(preview, {
      fetch: async () => {
        throw new TypeError('Failed to fetch');
      }
    });

    expect(result.failures).toHaveLength(1);
    expect(result.html).toContain('http://diagram.example/svg/abc');
    expect(result.html).not.toContain('cdnjs.cloudflare.com');
  });
});
