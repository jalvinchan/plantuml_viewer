import { beforeAll, describe, expect, it } from 'vitest';
import { loadScript } from './load-script.js';

beforeAll(() => {
  loadScript('js/config.js');
  loadScript('js/settings.js');
});

function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };
}

describe('settings storage', () => {
  it('migrates version 1 settings and drops unsafe values', () => {
    const storage = memoryStorage();
    storage.setItem('markdown_plantuml_settings_v1', JSON.stringify({
      server: 'javascript:alert(1)',
      format: 'png',
      service: 'kroki'
    }));

    const result = window.StudioSettings.loadSettings(storage);

    expect(result.migrated).toBe(true);
    expect(result.settings).toEqual({
      server: 'http://localhost:8080',
      format: 'png',
      service: 'kroki'
    });
    expect(JSON.parse(storage.getItem('markdown_plantuml_settings_v2'))).toEqual(result.settings);
    expect(storage.getItem('markdown_plantuml_settings_v1')).toContain('javascript:alert(1)');
  });

  it('prefers version 2 settings over version 1', () => {
    const storage = memoryStorage();
    storage.setItem('markdown_plantuml_settings_v1', JSON.stringify({
      server: 'https://old.example.com',
      format: 'png',
      service: 'plantuml'
    }));
    storage.setItem('markdown_plantuml_settings_v2', JSON.stringify({
      server: 'https://new.example.com/plantuml',
      format: 'svg',
      service: 'plantuml'
    }));

    const result = window.StudioSettings.loadSettings(storage);

    expect(result.migrated).toBe(false);
    expect(result.settings.server).toBe('https://new.example.com/plantuml');
  });

  it('recognizes a preset URL with a trailing slash', () => {
    expect(window.StudioSettings.presetFor({
      server: 'https://www.plantuml.com/plantuml/',
      service: 'plantuml'
    })).toBe('official');
  });

  it('rejects a non-HTTP custom address from the dialog', () => {
    document.body.innerHTML = `
      <div id="settings-modal"></div>
      <button id="open" type="button"></button>
      <button id="close" type="button"></button>
      <button id="cancel" type="button"></button>
      <button id="save" type="button"></button>
      <select id="preset"></select>
      <p id="help"></p>
      <div id="custom"></div>
      <input id="url">
      <select id="format"></select>
      <select id="service"></select>
    `;
    const errors = [];
    const saved = [];
    const dialog = window.StudioSettings.bindSettingsDialog({
      modal: document.getElementById('settings-modal'),
      openButton: document.getElementById('open'),
      closeButton: document.getElementById('close'),
      cancelButton: document.getElementById('cancel'),
      saveButton: document.getElementById('save'),
      preset: document.getElementById('preset'),
      help: document.getElementById('help'),
      customFields: document.getElementById('custom'),
      url: document.getElementById('url'),
      format: document.getElementById('format'),
      service: document.getElementById('service')
    }, {
      getSettings: () => window.StudioConfig.DEFAULT_SETTINGS,
      onSave: settings => saved.push(settings),
      onError: message => errors.push(message)
    });

    document.getElementById('open').click();
    expect(document.getElementById('preset').value).toBe('local');
    expect(document.getElementById('custom').hidden).toBe(true);

    document.getElementById('preset').value = 'custom';
    document.getElementById('preset').dispatchEvent(new Event('change'));
    document.getElementById('url').value = 'ftp://example.com';
    document.getElementById('save').click();

    expect(errors).toEqual(['Enter an http:// or https:// server address.']);
    expect(saved).toEqual([]);
    expect(dialog.isOpen()).toBe(true);
  });
});
