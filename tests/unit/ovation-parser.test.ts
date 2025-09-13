import { parseOvationData } from '../../lib/api/parsers/ovation';

describe('Ovation Parser', () => {
  it('parses coordinates as array of objects', () => {
    const data = {
      updated: '2023-01-01T00:00:00Z',
      coordinates: [
        { lat: 60, lon: -120, aurora: 0.6 },
        { lat: 65, lon: -100, prob: 75 },
      ],
    };
    const result = parseOvationData(data)!;
    expect(result.cells.length).toBe(2);
    expect(result.cells[0]).toEqual({ lat: 60, lon: -120, prob: 60 });
    expect(result.cells[1]).toEqual({ lat: 65, lon: -100, prob: 75 });
  });

  it('parses coordinates as tuple array [lon, lat, prob]', () => {
    const data = {
      updated: '2023-01-01T00:00:00Z',
      coordinates: [
        [-150, 62, 0.8],
        [20, 55, 35],
      ],
    };
    const result = parseOvationData(data)!;
    expect(result.cells.length).toBe(2);
    // 0.8 => 80
    expect(result.cells[0]).toEqual({ lat: 62, lon: -150, prob: 80 });
    expect(result.cells[1]).toEqual({ lat: 55, lon: 20, prob: 35 });
  });

  it('parses data array with [lat, lon, prob]', () => {
    const data = {
      data: [
        [60, -120, 0.5],
        [62, -110, 45],
      ],
    };
    const result = parseOvationData(data)!;
    expect(result.cells.length).toBe(2);
    expect(result.cells[0]).toEqual({ lat: 60, lon: -120, prob: 50 });
    expect(result.cells[1]).toEqual({ lat: 62, lon: -110, prob: 45 });
  });
});

