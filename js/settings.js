/**
 * Settings validation, migration, and the settings dialog.
 */
(function (global) {
  'use strict';

  const config = global.StudioConfig;
  if (!config) {
    throw new Error('StudioConfig must be loaded before settings.');
  }

  function isAllowed(options, id) {
    return options.some(option => option.id === id);
  }

  function serviceForAddress(address, explicitService) {
    if (String(address || '').toLowerCase().includes('kroki.io')) return 'kroki';
    return explicitService === 'kroki' ? 'kroki' : 'plantuml';
  }

  function validateSettings(raw) {
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const server = config.normalizeServer(source.server) || config.DEFAULT_SETTINGS.server;
    const format = isAllowed(config.FORMATS, source.format) ? source.format : config.DEFAULT_SETTINGS.format;
    const requestedService = isAllowed(config.SERVICES, source.service) ? source.service : config.DEFAULT_SETTINGS.service;
    return {
      server,
      format,
      service: serviceForAddress(server, requestedService)
    };
  }

  function presetFor(settings) {
    const server = config.normalizeServer(settings && settings.server);
    const presets = Object.keys(config.SERVER_PRESETS);
    for (let i = 0; i < presets.length; i += 1) {
      const id = presets[i];
      if (server === config.SERVER_PRESETS[id].server) return id;
    }
    return config.CUSTOM_PRESET.id;
  }

  function readJson(storage, key) {
    try {
      const raw = storage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function loadSettings(storage) {
    const current = readJson(storage, config.STORAGE_KEYS.settings);
    if (current) {
      return { settings: validateSettings(current), migrated: false };
    }

    const legacy = readJson(storage, config.STORAGE_KEYS.settingsV1);
    if (legacy) {
      const settings = validateSettings(legacy);
      try {
        storage.setItem(config.STORAGE_KEYS.settings, JSON.stringify(settings));
      } catch {
        // Keep the migrated settings in memory when storage is unavailable.
      }
      return { settings, migrated: true };
    }

    return { settings: validateSettings(config.DEFAULT_SETTINGS), migrated: false };
  }

  function saveSettings(storage, settings) {
    const clean = validateSettings(settings);
    storage.setItem(config.STORAGE_KEYS.settings, JSON.stringify(clean));
    return clean;
  }

  function fillSelect(select, options) {
    select.replaceChildren();
    options.forEach(option => {
      const element = document.createElement('option');
      element.value = option.id;
      element.textContent = option.label;
      select.appendChild(element);
    });
  }

  function syncForm(elements) {
    const preset = elements.preset.value;
    const isCustom = preset === config.CUSTOM_PRESET.id;
    elements.customFields.hidden = !isCustom;
    elements.help.textContent = isCustom
      ? config.CUSTOM_PRESET.help
      : (config.SERVER_PRESETS[preset] ? config.SERVER_PRESETS[preset].help : '');
  }

  function fillForm(elements, settings) {
    const preset = presetFor(settings);
    elements.preset.value = preset;
    elements.format.value = settings.format;
    elements.url.value = preset === config.CUSTOM_PRESET.id ? settings.server : '';
    elements.service.value = settings.service === 'kroki' ? 'kroki' : 'plantuml';
    syncForm(elements);
  }

  function settingsFromForm(elements) {
    const format = elements.format.value;
    const preset = elements.preset.value;
    if (preset !== config.CUSTOM_PRESET.id) {
      const chosen = config.SERVER_PRESETS[preset] || config.SERVER_PRESETS.local;
      return {
        ok: true,
        settings: validateSettings({
          server: chosen.server,
          format,
          service: chosen.service
        })
      };
    }

    const entered = elements.url.value.trim();
    if (!entered) {
      return { ok: false, error: 'Enter a server address.' };
    }
    const server = config.normalizeServer(entered);
    if (!server) {
      return { ok: false, error: 'Enter an http:// or https:// server address.' };
    }
    return {
      ok: true,
      settings: validateSettings({
        server,
        format,
        service: serviceForAddress(server, elements.service.value)
      })
    };
  }

  function bindSettingsDialog(elements, hooks) {
    const presetOptions = Object.keys(config.SERVER_PRESETS).map(id => ({
      id,
      label: config.SERVER_PRESETS[id].label
    }));
    presetOptions.push(config.CUSTOM_PRESET);
    fillSelect(elements.preset, presetOptions);
    fillSelect(elements.format, config.FORMATS);
    fillSelect(elements.service, config.SERVICES);

    elements.openButton.addEventListener('click', () => {
      fillForm(elements, hooks.getSettings());
      elements.modal.classList.add('open');
    });

    elements.preset.addEventListener('change', () => {
      if (elements.preset.value === config.CUSTOM_PRESET.id && !elements.url.value.trim()) {
        const current = hooks.getSettings();
        elements.url.value = current.server;
        elements.service.value = current.service === 'kroki' ? 'kroki' : 'plantuml';
      }
      syncForm(elements);
    });

    elements.url.addEventListener('input', () => {
      if (elements.url.value.toLowerCase().includes('kroki.io')) {
        elements.service.value = 'kroki';
      }
    });

    function close() {
      elements.modal.classList.remove('open');
    }

    elements.closeButton.addEventListener('click', close);
    elements.cancelButton.addEventListener('click', close);
    elements.saveButton.addEventListener('click', () => {
      const result = settingsFromForm(elements);
      if (!result.ok) {
        hooks.onError(result.error);
        return;
      }
      hooks.onSave(result.settings);
      close();
    });

    return {
      close,
      isOpen: () => elements.modal.classList.contains('open')
    };
  }

  global.StudioSettings = {
    validateSettings,
    loadSettings,
    saveSettings,
    presetFor,
    serviceForAddress,
    bindSettingsDialog
  };
})(typeof window !== 'undefined' ? window : globalThis);
