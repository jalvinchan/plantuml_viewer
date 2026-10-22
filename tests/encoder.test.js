import { beforeAll, describe, expect, it } from 'vitest';
import { loadScript } from './load-script.js';

beforeAll(() => {
  loadScript('vendor/pako.min.js');
  loadScript('js/config.js');
  loadScript('js/plantuml-encoder.js');
});

describe('PlantUML encoder', () => {
  const source = '@startuml\nA -> B\n@enduml';

  it('uses the shared default server', () => {
    const url = window.PlantUMLEncoder.buildUrl(source);
    expect(url.startsWith(`${window.StudioConfig.DEFAULT_SETTINGS.server}/svg/`)).toBe(true);
    expect(url).not.toContain('A -> B');
  });

  it('builds a Kroki URL when the service is Kroki', () => {
    const url = window.PlantUMLEncoder.buildUrl(source, {
      server: 'https://kroki.io',
      service: 'kroki',
      format: 'png'
    });
    expect(url.startsWith('https://kroki.io/plantuml/png/')).toBe(true);
  });

  it('wraps bare diagram text with PlantUML sentinels', () => {
    expect(window.PlantUMLEncoder.normalize('Alice -> Bob')).toBe('@startuml\nAlice -> Bob\n@enduml');
  });

  it('keeps the PlantUML alphabet stable', () => {
    expect(window.PlantUMLEncoder.encode('A')).toMatch(/^[0-9A-Za-z\-_]+$/);
  });
});
