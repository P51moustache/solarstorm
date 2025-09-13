import { parsePlasmaData } from '../../lib/api/parsers/plasma';

describe('Plasma Parser', () => {
  it('parses headered CSV-like JSON rows', () => {
    const data = [
      ['time_tag', 'density', 'speed'],
      ['2023-01-01T00:00:00.000Z', '7.3', '420'],
      ['2023-01-01T00:05:00.000Z', '', ''],
      ['2023-01-01T00:10:00.000Z', '8.1', '510'],
    ];

    const result = parsePlasmaData(data);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ time_tag: '2023-01-01T00:00:00.000Z', speed: 420, density: 7.3 });
    expect(result[1]).toEqual({ time_tag: '2023-01-01T00:05:00.000Z', speed: null, density: null });
    expect(result[2]).toEqual({ time_tag: '2023-01-01T00:10:00.000Z', speed: 510, density: 8.1 });
  });

  it('returns empty array for invalid shape', () => {
    expect(parsePlasmaData([] as any)).toEqual([]);
    expect(parsePlasmaData({} as any)).toEqual([]);
  });
});

