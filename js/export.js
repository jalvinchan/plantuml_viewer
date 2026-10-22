/**
 * Standalone HTML export. Styles are inlined and diagram images are embedded
 * when the browser is allowed to read them from the PlantUML server.
 */
(function (global) {
  'use strict';

  const EXPORT_CSS = `
    body { margin: 0; padding: 40px 20px; background: #fff; color: #1f2328; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .markdown-body { max-width: 900px; margin: 0 auto; }
    .markdown-body h1, .markdown-body h2, .markdown-body h3 { line-height: 1.25; margin: 1.4em 0 0.6em; }
    .markdown-body p, .markdown-body ul, .markdown-body ol, .markdown-body blockquote, .markdown-body table { margin: 0 0 16px; }
    .markdown-body a { color: #0969da; }
    .markdown-body blockquote { padding-left: 16px; color: #656d76; border-left: 4px solid #d0d7de; }
    .markdown-body table { border-collapse: collapse; }
    .markdown-body th, .markdown-body td { padding: 6px 13px; border: 1px solid #d0d7de; }
    .markdown-body code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.92em; }
    .code-block-wrapper { margin: 16px 0; border: 1px solid #d0d7de; border-radius: 6px; overflow: hidden; }
    .code-block-header { padding: 6px 12px; background: #f6f8fa; border-bottom: 1px solid #d0d7de; font-size: 11px; font-weight: 600; color: #656d76; }
    .code-block-wrapper pre { margin: 0; padding: 14px; background: #f6f8fa; overflow: auto; }
    .plantuml-card { margin: 24px 0; border: 1px solid #d0d7de; border-radius: 8px; overflow: hidden; background: #fff; }
    .plantuml-content { padding: 20px; display: flex; justify-content: center; }
    .plantuml-img { max-width: 100%; height: auto; }
    .plantuml-error { display: flex; flex-direction: column; gap: 8px; width: 100%; color: #cf222e; }
    .plantuml-error pre { white-space: pre-wrap; color: #1f2328; }
  `;

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    })[character]);
  }

  function bytesToBase64(bytes) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let index = 0; index < bytes.length; index += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
    }
    return btoa(binary);
  }

  async function blobToDataUrl(blob) {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const type = blob.type || 'application/octet-stream';
    return `data:${type};base64,${bytesToBase64(bytes)}`;
  }

  function stripEditorControls(root) {
    root.querySelectorAll([
      '.plantuml-toolbar',
      '.plantuml-loading',
      '.plantuml-raw-source',
      '.code-raw',
      '.btn-copy-code'
    ].join(',')).forEach(element => element.remove());
  }

  async function embedDiagrams(root, fetchImpl) {
    const failures = [];
    const images = root.querySelectorAll('img.plantuml-img');
    for (let index = 0; index < images.length; index += 1) {
      const image = images[index];
      const src = image.src;
      if (!src || src.startsWith('data:')) continue;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetchImpl(src, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        image.src = await blobToDataUrl(await response.blob());
      } catch {
        failures.push({
          src,
          message: 'The browser could not read this diagram from the PlantUML server.'
        });
      } finally {
        clearTimeout(timer);
      }
    }
    return failures;
  }

  async function buildStandaloneHtml(previewEl, options) {
    const settings = options || {};
    const fetchImpl = settings.fetch || global.fetch.bind(global);
    const clone = previewEl.cloneNode(true);
    stripEditorControls(clone);
    const failures = await embedDiagrams(clone, fetchImpl);
    const title = escapeHtml(settings.title || 'Exported Markdown & PlantUML');
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>${EXPORT_CSS}</style>
</head>
<body>
  <article class="markdown-body">
    ${clone.innerHTML}
  </article>
</body>
</html>`;
    return { html, failures };
  }

  function downloadText(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  global.StudioExport = {
    buildStandaloneHtml,
    downloadText
  };
})(typeof window !== 'undefined' ? window : globalThis);
