import { parseKpData, parseKpHistory } from '../../lib/api/parsers/kp';

describe('Kp Parser', () => {
  const mockKpData = [
    {
      time_tag: '2023-01-01T00:00:00.000Z',
      kp_index: 3.0,
      estimated_kp: null,
    },
    {
      time_tag: '2023-01-01T01:00:00.000Z',
      kp_index: null,
      estimated_kp: 4.5,
    },
  ];

  describe('parseKpData', () => {
    it('should parse the last Kp value correctly', () => {
      const result = parseKpData(mockKpData);
      expect(result).toEqual({
        kp: 4.5,
        at: '2023-01-01T01:00:00.000Z',
      });
    });

    it('should prefer estimated_kp over kp_index', () => {
      const data = [
        {
          time_tag: '2023-01-01T00:00:00.000Z',
          kp_index: 3.0,
          estimated_kp: 4.0,
        },
      ];
      const result = parseKpData(data);
      expect(result?.kp).toBe(4.0);
    });

    it('should return null for empty data', () => {
      const result = parseKpData([]);
      expect(result).toBeNull();
    });

    it('should return null for invalid data', () => {
      const result = parseKpData([{ invalid: 'data' }]);
      expect(result).toBeNull();
    });
  });

  describe('parseKpHistory', () => {
    it('should parse multiple Kp values', () => {
      const result = parseKpHistory(mockKpData);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        kp: 3.0,
        at: '2023-01-01T00:00:00.000Z',
      });
      expect(result[1]).toEqual({
        kp: 4.5,
        at: '2023-01-01T01:00:00.000Z',
      });
    });

    it('should skip invalid entries', () => {
      const data = [
        mockKpData[0],
        { invalid: 'data' },
        mockKpData[1],
      ];
      const result = parseKpHistory(data);
      expect(result).toHaveLength(2);
    });

    it('should return empty array for invalid input', () => {
      const result = parseKpHistory('invalid' as any);
      expect(result).toEqual([]);
    });
  });
});
