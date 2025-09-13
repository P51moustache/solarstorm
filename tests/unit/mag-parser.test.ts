import { parseMagData } from '../../lib/api/parsers/mag';

describe('Mag Parser', () => {
  it('parses headered CSV-like JSON rows', () => {
    const data = [
      ['time_tag', 'bz_gsm', 'bt'],
      ['2023-01-01T00:00:00.000Z', '-4.2', '6.1'],
      ['2023-01-01T00:05:00.000Z', 'null', '5.9'],
      ['2023-01-01T00:10:00.000Z', '-5.5', '7.2'],
    ];

    const result = parseMagData(data);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ time_tag: '2023-01-01T00:00:00.000Z', bz: -4.2, bt: 6.1 });
    expect(result[1]).toEqual({ time_tag: '2023-01-01T00:10:00.000Z', bz: -5.5, bt: 7.2 });
  });

  it('returns empty array for invalid shape', () => {
    expect(parseMagData([] as any)).toEqual([]);
    expect(parseMagData({} as any)).toEqual([]);
  });
});

