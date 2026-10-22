/**
 * Markdown & PlantUML Renderer
 * Integrates Marked, Highlight.js, DOMPurify, and PlantUMLEncoder.
 */
(function(global) {
  'use strict';

  function sharedDefaults() {
    const shared = global.StudioConfig && global.StudioConfig.DEFAULT_SETTINGS;
    return Object.assign({
      server: 'http://localhost:8080',
      format: 'svg',
      service: 'plantuml',
      gfm: true,
      breaks: true
    }, shared || {});
  }

  let currentOptions = sharedDefaults();
  let diagramCounter = 0;

  // PlantUML keywords that identify a diagram
  const PUML_START_REGEX = /^\s*@(startuml|startmindmap|startwbs|startgantt|startjson|startyaml|startsalt|startditaa|startstate|startarchimate|startchronology|startnwdiag|startboard)/i;

  function isPlantUML(code, lang) {
    const l = (lang || '').trim().toLowerCase();
    if (l === 'plantuml' || l === 'puml' || l === 'uml') {
      return true;
    }
    // Check if content begins with @start...
    if (PUML_START_REGEX.test(code.trim())) {
      return true;
    }
    return false;
  }

  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  function createPlantUMLBlock(sourceCode) {
    diagramCounter++;
    const diagramId = 'puml-diagram-' + diagramCounter;
    const cleanSource = sourceCode.trim();
    const normalized = global.PlantUMLEncoder.normalize(cleanSource);
    
    let diagramUrl = '';
    let encodeError = null;
    try {
      diagramUrl = global.PlantUMLEncoder.buildUrl(normalized, {
        server: currentOptions.server,
        format: currentOptions.format,
        service: currentOptions.service
      });
    } catch (err) {
      encodeError = err.message || 'Failed to encode PlantUML';
    }

    const safeSource = escapeHtml(cleanSource);
    const safeUrl = escapeHtml(diagramUrl);
    const safeError = escapeHtml(encodeError || '');

    return `
<div class="plantuml-card" id="${diagramId}" data-diagram-id="${diagramId}">
  <div class="plantuml-toolbar">
    <div class="plantuml-toolbar-left">
      <span class="plantuml-tag">PlantUML</span>
      <span class="plantuml-format-badge">${currentOptions.format.toUpperCase()}</span>
      <span class="plantuml-status-indicator" title="Status: Loading"></span>
    </div>
    <div class="plantuml-toolbar-right">
      <button type="button" class="tool-btn btn-zoom" data-action="zoom" title="Zoom & Pan inspection">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/><path d="M11 8v6"/><path d="M8 11h6"/></svg>
        <span>Zoom</span>
      </button>
      <button type="button" class="tool-btn btn-copy-src" data-action="copy-src" title="Copy PlantUML source code">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        <span>Source</span>
      </button>
      <button type="button" class="tool-btn btn-download" data-action="download" title="Download diagram image">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        <span>Save</span>
      </button>
      <a class="tool-btn btn-open" href="${safeUrl}" target="_blank" rel="noopener noreferrer" title="Open image in new browser tab">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
        <span>Open</span>
      </a>
    </div>
  </div>
  <div class="plantuml-content">
    <div class="plantuml-loading">
      <div class="loading-spinner"></div>
      <span class="loading-text">Rendering diagram...</span>
    </div>
    <div class="plantuml-error" style="display: ${encodeError ? 'flex' : 'none'};">
      <div class="error-header">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e5534b" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <strong>Diagram Render Error</strong>
      </div>
      <p class="error-desc">${safeError || 'Diagram could not be loaded from server. Check your syntax or connection.'}</p>
      <pre class="error-code">${safeSource}</pre>
    </div>
    ${!encodeError ? `<img class="plantuml-img" src="${safeUrl}" alt="PlantUML Diagram" />` : ''}
  </div>
  <textarea class="plantuml-raw-source" style="display:none;" readonly>${safeSource}</textarea>
</div>
`;
  }

  function setupMarked() {
    const markedLib = global.marked;
    if (!markedLib) {
      console.error('Marked library not loaded');
      return;
    }
    const renderer = new markedLib.Renderer();

    // Custom code block renderer
    renderer.code = function(code, lang) {
      // In Marked v13, parameter might be token object or string
      let rawCode = code;
      let language = lang;
      if (typeof code === 'object' && code !== null) {
        rawCode = code.text || '';
        language = code.lang || '';
      }

      if (isPlantUML(rawCode, language)) {
        return createPlantUMLBlock(rawCode);
      }

      // Regular code block with copy button and syntax highlighting
      const hljsLib = global.hljs;
      const validLang = !!(hljsLib && language && hljsLib.getLanguage && hljsLib.getLanguage(language));
      let highlighted;
      try {
        if (validLang && hljsLib.highlight) {
          highlighted = hljsLib.highlight(rawCode, { language: language }).value;
        } else if (hljsLib && hljsLib.highlightAuto) {
          highlighted = hljsLib.highlightAuto(rawCode).value;
        } else {
          highlighted = escapeHtml(rawCode);
        }
      } catch {
        highlighted = escapeHtml(rawCode);
      }

      const displayLang = escapeHtml(language || 'text');
      const safeCode = escapeHtml(rawCode);

      return `
<div class="code-block-wrapper">
  <div class="code-block-header">
    <span class="code-lang">${displayLang}</span>
    <button type="button" class="btn-copy-code" data-action="copy-code" title="Copy code">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
      <span>Copy</span>
    </button>
  </div>
  <pre><code class="hljs language-${displayLang}">${highlighted}</code></pre>
  <textarea class="code-raw" style="display:none;" readonly>${safeCode}</textarea>
</div>
`;
    };

    markedLib.setOptions({
      renderer: renderer,
      gfm: currentOptions.gfm,
      breaks: currentOptions.breaks,
      pedantic: false
    });
  }

  function setOptions(opts) {
    currentOptions = Object.assign({}, currentOptions, opts || {});
    setupMarked();
  }

  function getOptions() {
    return Object.assign({}, currentOptions);
  }

  function walkTokens(tokens, visit) {
    (tokens || []).forEach(token => {
      visit(token);
      if (token.tokens) walkTokens(token.tokens, visit);
      (token.items || []).forEach(item => walkTokens(item.tokens, visit));
    });
  }

  /**
   * Count PlantUML fences using the same Markdown parser as rendering.
   */
  function countDiagrams(markdownText) {
    const markedLib = global.marked;
    if (!markdownText || !markedLib || typeof markedLib.lexer !== 'function') return 0;
    let tokens;
    try {
      tokens = markedLib.lexer(markdownText);
    } catch {
      return 0;
    }
    let count = 0;
    walkTokens(tokens, token => {
      if (token.type === 'code' && isPlantUML(token.text || '', token.lang || '')) {
        count += 1;
      }
    });
    return count;
  }

  function safeText(markdownText) {
    return `<pre>${escapeHtml(markdownText)}</pre>`;
  }

  /**
   * Parse markdown string into sanitized HTML.
   * Without DOMPurify, return escaped source instead of unsanitized HTML.
   */
  function render(markdownText) {
    if (!markdownText) return '';
    const purifyLib = global.DOMPurify;
    const markedLib = global.marked;
    if (!purifyLib || !markedLib) {
      return safeText(markdownText);
    }

    diagramCounter = 0;
    setupMarked();
    const rawHtml = markedLib.parse(markdownText);

    let cleanHtml;
    try {
      cleanHtml = purifyLib.sanitize(rawHtml, {
        USE_PROFILES: { html: true, svg: true },
        ADD_TAGS: ['img', 'svg', 'path', 'circle', 'line', 'polyline', 'rect', 'textarea'],
        ADD_ATTR: [
          'target',
          'rel',
          'loading',
          'data-action',
          'data-diagram-id',
          'stroke-width',
          'stroke',
          'fill',
          'viewBox',
          'd',
          'cx',
          'cy',
          'r',
          'x',
          'y',
          'x1',
          'y1',
          'x2',
          'y2',
          'rx',
          'ry',
          'points'
        ]
      });
    } catch {
      return safeText(markdownText);
    }

    return cleanHtml;
  }

  /**
   * Post-process the preview container to attach image listeners and interactions
   */
  function postProcess(containerEl) {
    if (!containerEl) return;

    const cards = containerEl.querySelectorAll('.plantuml-card');
    cards.forEach(card => {
      const img = card.querySelector('.plantuml-img');
      const loading = card.querySelector('.plantuml-loading');
      const errorDiv = card.querySelector('.plantuml-error');
      const statusIndicator = card.querySelector('.plantuml-status-indicator');

      if (!img) return;

      function onLoaded() {
        card.classList.add('loaded');
        card.classList.remove('has-error');
        if (loading) loading.style.display = 'none';
        if (errorDiv) errorDiv.style.display = 'none';
        img.style.display = 'block';
        if (statusIndicator) {
          statusIndicator.classList.add('ready');
          statusIndicator.classList.remove('error');
          statusIndicator.title = 'Status: Rendered successfully';
        }
      }

      function onError() {
        card.classList.remove('loaded');
        card.classList.add('has-error');
        if (loading) loading.style.display = 'none';
        img.style.display = 'none';
        if (errorDiv) errorDiv.style.display = 'flex';
        if (statusIndicator) {
          statusIndicator.classList.remove('ready');
          statusIndicator.classList.add('error');
          statusIndicator.title = 'Status: Render failed';
        }
      }

      if (img.complete && img.naturalHeight !== 0) {
        onLoaded();
      } else {
        img.addEventListener('load', onLoaded, { once: true });
        img.addEventListener('error', onError, { once: true });
      }
    });

    // Code block copy buttons
    const codeWrappers = containerEl.querySelectorAll('.code-block-wrapper');
    codeWrappers.forEach(wrap => {
      const copyBtn = wrap.querySelector('.btn-copy-code');
      const rawText = wrap.querySelector('.code-raw');
      if (copyBtn && rawText) {
        copyBtn.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(rawText.value);
            const span = copyBtn.querySelector('span');
            if (span) {
              const orig = span.textContent;
              span.textContent = 'Copied!';
              setTimeout(() => { span.textContent = orig; }, 1800);
            }
          } catch (e) {
            console.error('Clipboard copy failed:', e);
          }
        });
      }
    });
  }

  global.MarkdownRenderer = {
    render,
    setOptions,
    getOptions,
    postProcess,
    isPlantUML,
    countDiagrams
  };
})(typeof window !== 'undefined' ? window : globalThis);
