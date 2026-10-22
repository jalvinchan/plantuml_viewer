/**
 * Application wiring for Markdown & PlantUML Live Studio.
 */
(function () {
  'use strict';

  const config = window.StudioConfig;
  const keys = config.STORAGE_KEYS;

  const editor = document.getElementById('editor');
  const preview = document.getElementById('preview');
  const splitter = document.getElementById('splitter');
  const workspace = document.getElementById('workspace');
  const sampleSelect = document.getElementById('sample-select');
  const btnClear = document.getElementById('btn-clear');
  const btnCopyMd = document.getElementById('btn-copy-md');
  const btnCopyHtml = document.getElementById('btn-copy-html');
  const btnExportHtml = document.getElementById('btn-export-html');
  const btnExportMd = document.getElementById('btn-export-md');
  const btnThemeToggle = document.getElementById('btn-theme-toggle');
  const statWords = document.getElementById('stat-words');
  const statChars = document.getElementById('stat-chars');
  const statDiagrams = document.getElementById('stat-diagrams');
  const toastContainer = document.getElementById('toast-container');

  let currentSettings = window.StudioSettings.loadSettings(localStorage).settings;
  let renderTimeout = null;

  function showToast(message, duration = 2200) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.2s ease';
      setTimeout(() => toast.remove(), 250);
    }, duration);
  }

  function updateStats(text) {
    const stats = window.StudioStats.summarize(text);
    statWords.textContent = `${stats.words} words`;
    statChars.textContent = `${stats.chars} chars`;
    statDiagrams.textContent = `${stats.diagrams} diagram${stats.diagrams === 1 ? '' : 's'}`;
  }

  function showRenderError(message) {
    preview.replaceChildren();
    const box = document.createElement('div');
    box.className = 'plantuml-error';
    const paragraph = document.createElement('p');
    paragraph.textContent = message;
    box.appendChild(paragraph);
    preview.appendChild(box);
  }

  function renderContent() {
    const content = editor.value;
    updateStats(content);

    if (!content.trim()) {
      preview.innerHTML = `
        <div class="empty-preview">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <p>Type Markdown on the left or select a sample from the toolbar.</p>
        </div>
      `;
      return;
    }

    try {
      preview.innerHTML = window.MarkdownRenderer.render(content);
      window.MarkdownRenderer.postProcess(preview);
    } catch (error) {
      console.error('Rendering error:', error);
      showRenderError(`Render error: ${error.message || 'Unknown error'}`);
    }
  }

  function scheduleRender(delay = 250) {
    clearTimeout(renderTimeout);
    renderTimeout = setTimeout(() => {
      renderContent();
      saveContent();
    }, delay);
  }

  function saveContent() {
    try {
      localStorage.setItem(keys.content, editor.value);
    } catch (error) {
      console.warn('LocalStorage save failed:', error);
    }
  }

  function sampleById(id) {
    return (window.StudioSamples || []).find(sample => sample.id === id) || null;
  }

  function loadInitialContent() {
    let saved = null;
    try {
      saved = localStorage.getItem(keys.content);
    } catch {
      // Keep the welcome sample when stored content cannot be read.
    }

    if (saved && saved.trim()) {
      editor.value = saved;
      renderContent();
      return;
    }

    const welcome = sampleById('welcome');
    editor.value = welcome ? welcome.content : '';
    renderContent();
  }

  function applySettings(settings) {
    currentSettings = window.StudioSettings.saveSettings(localStorage, settings);
    window.MarkdownRenderer.setOptions(currentSettings);
    renderContent();
  }

  function initTheme() {
    let theme = null;
    try {
      theme = localStorage.getItem(keys.theme);
    } catch {
      // Fall through to the system color preference.
    }
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    applyTheme(theme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(keys.theme, theme);
    } catch {
      // Theme still applies for this session.
    }

    const themeIcon = btnThemeToggle.querySelector('span');
    if (themeIcon) themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';

    const darkHljs = document.getElementById('hljs-dark-theme');
    const lightHljs = document.getElementById('hljs-light-theme');
    if (darkHljs && lightHljs) {
      if (theme === 'dark') {
        darkHljs.removeAttribute('disabled');
        lightHljs.setAttribute('disabled', 'disabled');
      } else {
        lightHljs.removeAttribute('disabled');
        darkHljs.setAttribute('disabled', 'disabled');
      }
    }
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  function populateSamples() {
    const placeholder = sampleSelect.querySelector('option[value=""]');
    sampleSelect.replaceChildren();
    if (placeholder) {
      sampleSelect.appendChild(placeholder);
    }
    (window.StudioSamples || []).forEach(sample => {
      const option = document.createElement('option');
      option.value = sample.id;
      option.textContent = sample.label;
      sampleSelect.appendChild(option);
    });
  }

  function downloadTextFile(filename, content, mimeType) {
    window.StudioExport.downloadText(filename, content, mimeType);
  }

  function initPreviewEvents(lightbox) {
    preview.addEventListener('click', async event => {
      const button = event.target.closest('button, a');
      const image = event.target.closest('.plantuml-img');
      if (image && !button) {
        lightbox.open(image.src);
        return;
      }
      if (!button) return;

      const action = button.getAttribute('data-action');
      const card = button.closest('.plantuml-card');
      if (!action || !card) return;

      const rawSource = card.querySelector('.plantuml-raw-source');
      const cardImage = card.querySelector('.plantuml-img');
      if (action === 'zoom' && cardImage && cardImage.src) {
        lightbox.open(cardImage.src);
      } else if (action === 'copy-src' && rawSource) {
        try {
          await navigator.clipboard.writeText(rawSource.value);
          showToast('PlantUML source copied to clipboard!');
        } catch (error) {
          console.error(error);
          showToast('Failed to copy');
        }
      } else if (action === 'download' && cardImage && cardImage.src) {
        try {
          showToast('Preparing diagram download...');
          const response = await fetch(cardImage.src);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          const extension = currentSettings.format === 'png' ? 'png' : 'svg';
          link.download = `plantuml-diagram-${Date.now()}.${extension}`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(url);
          showToast('Diagram downloaded!');
        } catch (error) {
          console.warn('Fetch failed, fallback direct download:', error);
          window.open(cardImage.src, '_blank');
        }
      }
    });
  }

  function initHeaderActions() {
    populateSamples();

    sampleSelect.addEventListener('change', () => {
      const sample = sampleById(sampleSelect.value);
      if (!sample) return;
      editor.value = sample.content;
      renderContent();
      saveContent();
      showToast(`Loaded sample: ${sample.label}`);
    });

    btnClear.addEventListener('click', () => {
      if (editor.value.trim() && !confirm('Are you sure you want to clear the editor?')) return;
      editor.value = '';
      sampleSelect.value = '';
      renderContent();
      saveContent();
      editor.focus();
    });

    btnCopyMd.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(editor.value);
        showToast('Markdown copied to clipboard!');
      } catch {
        showToast('Failed to copy');
      }
    });

    btnCopyHtml.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(preview.innerHTML);
        showToast('Rendered HTML copied to clipboard!');
      } catch {
        showToast('Failed to copy');
      }
    });

    btnExportHtml.addEventListener('click', async () => {
      btnExportHtml.disabled = true;
      try {
        const result = await window.StudioExport.buildStandaloneHtml(preview, {
          title: 'Exported Markdown & PlantUML'
        });
        downloadTextFile(`document-${Date.now()}.html`, result.html, 'text/html;charset=utf-8');
        if (result.failures.length) {
          const noun = result.failures.length === 1 ? 'diagram' : 'diagrams';
          showToast(`Exported HTML, but ${result.failures.length} ${noun} could not be embedded. The PlantUML server blocked the browser from reading the image, so those diagrams still need that server.`, 5600);
        } else {
          showToast('Exported standalone HTML.');
        }
      } catch (error) {
        console.error(error);
        showToast('Could not export HTML.');
      } finally {
        btnExportHtml.disabled = false;
      }
    });

    btnExportMd.addEventListener('click', () => {
      downloadTextFile(`document-${Date.now()}.md`, editor.value, 'text/markdown;charset=utf-8');
      showToast('Exported Markdown file!');
    });

    btnThemeToggle.addEventListener('click', toggleTheme);

    return window.StudioSettings.bindSettingsDialog({
      modal: document.getElementById('settings-modal'),
      openButton: document.getElementById('btn-settings'),
      closeButton: document.getElementById('settings-close'),
      cancelButton: document.getElementById('settings-cancel'),
      saveButton: document.getElementById('settings-save'),
      preset: document.getElementById('select-server-preset'),
      help: document.getElementById('server-preset-help'),
      customFields: document.getElementById('custom-server-fields'),
      url: document.getElementById('input-server-url'),
      format: document.getElementById('select-format'),
      service: document.getElementById('select-service')
    }, {
      getSettings: () => currentSettings,
      onSave: settings => {
        applySettings(settings);
        showToast('Settings saved!');
      },
      onError: showToast
    });
  }

  function initKeyboardShortcuts(lightbox, settingsDialog) {
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (lightbox.isOpen()) lightbox.close();
        if (settingsDialog.isOpen()) settingsDialog.close();
      }

      if (event.key === 'Tab' && document.activeElement === editor) {
        event.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = `${editor.value.slice(0, start)}  ${editor.value.slice(end)}`;
        editor.selectionStart = editor.selectionEnd = start + 2;
        scheduleRender(100);
      }
    });

    editor.addEventListener('input', () => scheduleRender(250));
  }

  function init() {
    window.MarkdownRenderer.setOptions(currentSettings);
    initTheme();
    window.StudioSplitter.init({
      splitter,
      workspace,
      storage: localStorage,
      storageKey: keys.split
    });
    const lightbox = window.StudioLightbox.init({
      modal: document.getElementById('lightbox-modal'),
      image: document.getElementById('lightbox-img'),
      imageWrapper: document.getElementById('lightbox-img-wrapper'),
      viewport: document.getElementById('lightbox-viewport'),
      closeButton: document.getElementById('lightbox-close'),
      zoomIn: document.getElementById('lightbox-zoom-in'),
      zoomOut: document.getElementById('lightbox-zoom-out'),
      zoomReset: document.getElementById('lightbox-zoom-reset'),
      zoomFit: document.getElementById('lightbox-zoom-fit')
    });
    initPreviewEvents(lightbox);
    const settingsDialog = initHeaderActions();
    initKeyboardShortcuts(lightbox, settingsDialog);
    loadInitialContent();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
