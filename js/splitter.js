/**
 * Draggable editor/preview split.
 */
(function (global) {
  'use strict';

  function readPosition(storage, storageKey) {
    try {
      return storage.getItem(storageKey);
    } catch {
      return null;
    }
  }

  function writePosition(storage, storageKey, position) {
    try {
      storage.setItem(storageKey, position);
    } catch {
      // The layout still updates when persistence is unavailable.
    }
  }

  function initSplitter(options) {
    const splitter = options.splitter;
    const workspace = options.workspace;
    const storage = options.storage;
    const storageKey = options.storageKey;
    const savedPosition = readPosition(storage, storageKey);
    if (savedPosition) {
      document.documentElement.style.setProperty('--split-pos', savedPosition);
    }

    let isResizing = false;

    function onMouseMove(event) {
      if (!isResizing) return;
      const rect = workspace.getBoundingClientRect();
      const offset = event.clientX - rect.left;
      const clamped = Math.max(260, Math.min(offset, rect.width - 260));
      const position = `${((clamped / rect.width) * 100).toFixed(2)}%`;
      document.documentElement.style.setProperty('--split-pos', position);
      writePosition(storage, storageKey, position);
    }

    function onMouseUp() {
      if (!isResizing) return;
      isResizing = false;
      splitter.classList.remove('active');
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }

    splitter.addEventListener('mousedown', event => {
      event.preventDefault();
      isResizing = true;
      splitter.classList.add('active');
      document.body.style.cursor = 'col-resize';
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });

    splitter.addEventListener('dblclick', () => {
      document.documentElement.style.setProperty('--split-pos', '50%');
      writePosition(storage, storageKey, '50%');
    });
  }

  global.StudioSplitter = { init: initSplitter };
})(typeof window !== 'undefined' ? window : globalThis);
