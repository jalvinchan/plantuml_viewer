/**
 * Shared defaults for the studio.
 * Script order: load this before the encoder, renderer, and settings.
 */
(function (global) {
  'use strict';

  const STORAGE_KEYS = {
    content: 'markdown_plantuml_content_v1',
    settings: 'markdown_plantuml_settings_v2',
    settingsV1: 'markdown_plantuml_settings_v1',
    theme: 'markdown_plantuml_theme_v1',
    split: 'markdown_plantuml_split_v1'
  };

  const DEFAULT_SETTINGS = {
    server: 'http://localhost:8080',
    format: 'svg',
    service: 'plantuml'
  };

  const FORMATS = [
    { id: 'svg', label: 'SVG' },
    { id: 'png', label: 'PNG' }
  ];

  const SERVICES = [
    { id: 'plantuml', label: 'PlantUML server' },
    { id: 'kroki', label: 'Kroki' }
  ];

  const SERVER_PRESETS = {
    local: {
      label: 'Local PlantUML server',
      server: 'http://localhost:8080',
      service: 'plantuml',
      help: 'Sends diagrams to a PlantUML server on this computer, at http://localhost:8080. Start that server before rendering.'
    },
    official: {
      label: 'Official PlantUML server',
      server: 'https://www.plantuml.com/plantuml',
      service: 'plantuml',
      help: 'Sends diagrams to plantuml.com. This needs an internet connection.'
    },
    kroki: {
      label: 'Kroki',
      server: 'https://kroki.io',
      service: 'kroki',
      help: 'Sends diagrams to kroki.io, which runs PlantUML for you. This needs an internet connection.'
    }
  };

  const CUSTOM_PRESET = {
    id: 'custom',
    label: 'Custom server',
    help: 'Use this when the server is not one of the choices above.'
  };

  function normalizeServer(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';
    let url;
    try {
      url = new URL(trimmed);
    } catch {
      return '';
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
    url.username = '';
    url.password = '';
    url.hash = '';
    return url.toString().replace(/\/+$/, '');
  }

  global.StudioConfig = {
    STORAGE_KEYS,
    DEFAULT_SETTINGS,
    FORMATS,
    SERVICES,
    SERVER_PRESETS,
    CUSTOM_PRESET,
    normalizeServer
  };
})(typeof window !== 'undefined' ? window : globalThis);
