/**
 * Zoom and pan viewer for rendered diagrams.
 */
(function (global) {
  'use strict';

  function initLightbox(elements) {
    const state = {
      scale: 1,
      translateX: 0,
      translateY: 0,
      isDragging: false,
      startX: 0,
      startY: 0
    };

    function updateTransform() {
      elements.imageWrapper.style.transform = `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`;
    }

    function open(src) {
      elements.image.src = src;
      state.scale = 1;
      state.translateX = 0;
      state.translateY = 0;
      updateTransform();
      elements.modal.classList.add('open');
    }

    function close() {
      elements.modal.classList.remove('open');
      elements.image.src = '';
    }

    elements.closeButton.addEventListener('click', close);
    elements.modal.addEventListener('click', event => {
      if (event.target === elements.modal || event.target === elements.viewport) close();
    });

    elements.zoomIn.addEventListener('click', () => {
      state.scale = Math.min(state.scale * 1.25, 6);
      updateTransform();
    });
    elements.zoomOut.addEventListener('click', () => {
      state.scale = Math.max(state.scale / 1.25, 0.2);
      updateTransform();
    });
    elements.zoomReset.addEventListener('click', () => {
      state.scale = 1;
      state.translateX = 0;
      state.translateY = 0;
      updateTransform();
    });
    elements.zoomFit.addEventListener('click', () => {
      if (!elements.image.naturalWidth) return;
      const viewport = elements.viewport.getBoundingClientRect();
      const scaleX = (viewport.width - 60) / elements.image.naturalWidth;
      const scaleY = (viewport.height - 60) / elements.image.naturalHeight;
      state.scale = Math.min(scaleX, scaleY, 1.5);
      state.translateX = 0;
      state.translateY = 0;
      updateTransform();
    });

    elements.viewport.addEventListener('wheel', event => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? 0.85 : 1.15;
      state.scale = Math.max(0.15, Math.min(state.scale * delta, 8));
      updateTransform();
    }, { passive: false });

    elements.viewport.addEventListener('mousedown', event => {
      if (event.target.closest('.lightbox-controls') || event.target.closest('.lightbox-header')) return;
      state.isDragging = true;
      state.startX = event.clientX - state.translateX;
      state.startY = event.clientY - state.translateY;
      elements.viewport.classList.add('panning');
    });

    window.addEventListener('mousemove', event => {
      if (!state.isDragging) return;
      state.translateX = event.clientX - state.startX;
      state.translateY = event.clientY - state.startY;
      updateTransform();
    });

    window.addEventListener('mouseup', () => {
      if (!state.isDragging) return;
      state.isDragging = false;
      elements.viewport.classList.remove('panning');
    });

    return {
      open,
      close,
      isOpen: () => elements.modal.classList.contains('open')
    };
  }

  global.StudioLightbox = { init: initLightbox };
})(typeof window !== 'undefined' ? window : globalThis);
