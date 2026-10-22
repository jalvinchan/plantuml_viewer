/**
 * PlantUML & Kroki Encoder
 * Handles PlantUML text normalization, deflate compression,
 * and PlantUML 64 / Base64URL encoding for live diagram rendering.
 */
(function(global) {
  'use strict';

  // PlantUML custom 64-character alphabet
  const PLANTUML_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

  function encode6bit(b) {
    return PLANTUML_ALPHABET.charAt(b) || '?';
  }

  function append3bytes(b1, b2, b3) {
    const c1 = b1 >> 2;
    const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
    const c3 = ((b2 & 0x0F) << 2) | (b3 >> 6);
    const c4 = b3 & 0x3F;
    return (
      encode6bit(c1 & 0x3F) +
      encode6bit(c2 & 0x3F) +
      encode6bit(c3 & 0x3F) +
      encode6bit(c4 & 0x3F)
    );
  }

  function encodePlantUML64(data) {
    let r = '';
    const len = data.length;
    const isString = typeof data === 'string';
    const getByte = i => (isString ? data.charCodeAt(i) : data[i]);

    for (let i = 0; i < len; i += 3) {
      if (i + 2 === len) {
        r += append3bytes(getByte(i), getByte(i + 1), 0);
      } else if (i + 1 === len) {
        r += append3bytes(getByte(i), 0, 0);
      } else {
        r += append3bytes(getByte(i), getByte(i + 1), getByte(i + 2));
      }
    }
    return r;
  }

  // Base64URL encoder (RFC 4648 §5) for Kroki
  function base64UrlEncode(bytes) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Normalize PlantUML source code.
   * Auto-wraps with @startuml ... @enduml if no @start... block is detected.
   */
  function normalize(code) {
    if (!code) return '';
    let text = code.trim();
    const hasStart = /^@start[a-z]+/i.test(text);
    if (!hasStart) {
      text = `@startuml\n${text}\n@enduml`;
    }
    return text;
  }

  /**
   * Synchronously compress using pako (raw deflate without header/checksum)
   */
  function deflateRawSync(bytes) {
    if (typeof global.pako !== 'undefined' && global.pako.deflateRaw) {
      return global.pako.deflateRaw(bytes, { level: 9 });
    }
    throw new Error('pako library is required for synchronous PlantUML encoding.');
  }

  /**
   * Synchronously compress with standard zlib header for Kroki
   */
  function deflateSync(bytes) {
    if (typeof global.pako !== 'undefined' && global.pako.deflate) {
      return global.pako.deflate(bytes, { level: 9 });
    }
    throw new Error('pako library is required for synchronous Kroki encoding.');
  }

  /**
   * Async fallback using browser native CompressionStream('deflate-raw')
   */
  async function deflateRawAsync(bytes) {
    if (typeof CompressionStream !== 'undefined') {
      const cs = new CompressionStream('deflate-raw');
      const writer = cs.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const reader = cs.readable.getReader();
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      const out = new Uint8Array(totalLen);
      let off = 0;
      for (const c of chunks) {
        out.set(c, off);
        off += c.length;
      }
      return out;
    }
    throw new Error('No deflate implementation available.');
  }

  /**
   * Encode PlantUML source for standard PlantUML server
   */
  function encode(text) {
    const norm = normalize(text);
    const utf8 = new TextEncoder().encode(norm);
    try {
      const deflated = deflateRawSync(utf8);
      return encodePlantUML64(deflated);
    } catch (e) {
      // If pako is missing, try async or fail
      console.warn('Sync deflate failed, attempting fallback:', e);
      throw e;
    }
  }

  /**
   * Encode PlantUML source for Kroki (base64url)
   */
  function encodeForKroki(text) {
    const norm = normalize(text);
    const utf8 = new TextEncoder().encode(norm);
    const deflated = deflateSync(utf8);
    return base64UrlEncode(deflated);
  }

  /**
   * Build diagram URL based on server and format
   */
  function defaultRequestOptions() {
    const shared = global.StudioConfig && global.StudioConfig.DEFAULT_SETTINGS;
    return {
      server: (shared && shared.server) || 'http://localhost:8080',
      format: (shared && shared.format) || 'svg',
      service: (shared && shared.service) || 'plantuml'
    };
  }

  function buildUrl(text, options) {
    const opts = Object.assign(defaultRequestOptions(), options || {});

    const cleanServer = (opts.server || '').trim().replace(/\/+$/, '');
    const format = (opts.format || 'svg').toLowerCase();

    // Check if server is Kroki
    const isKroki = opts.service === 'kroki' || cleanServer.includes('kroki.io');

    if (isKroki) {
      const krokiCode = encodeForKroki(text);
      return `${cleanServer}/plantuml/${format}/${krokiCode}`;
    }

    // Standard PlantUML server
    const plantumlCode = encode(text);
    return `${cleanServer}/${format}/${plantumlCode}`;
  }

  global.PlantUMLEncoder = {
    encode,
    encodeForKroki,
    normalize,
    buildUrl,
    deflateRawSync,
    deflateRawAsync
  };
})(typeof window !== 'undefined' ? window : globalThis);
