import { getAlertLevel, parseAlertsData } from '../../lib/api/parsers/alerts';

describe('Alerts Parser', () => {
  it('filters geomagnetic and K-index alerts and sorts by time', () => {
    const data = [
      { issue_datetime: '2023-01-01T00:10:00.000Z', message: 'ALERT: Geomagnetic K-Index of 5 observed' },
      { issue_datetime: '2023-01-01T00:05:00.000Z', message: 'ALERT: GEOMAGNETIC STORM G2 WARNING' },
      { issue_datetime: '2023-01-01T00:03:00.000Z', message: 'Some other message' },
    ];

    const result = parseAlertsData(data as any);
    expect(result).toHaveLength(2);
    // Sorted newest first
    expect(result[0].issue_datetime).toBe('2023-01-01T00:10:00.000Z');
    expect(result[1].issue_datetime).toBe('2023-01-01T00:05:00.000Z');
  });

  it('maps messages to alert levels', () => {
    expect(getAlertLevel('GEOMAGNETIC STORM G3')).toBe('G3');
    expect(getAlertLevel('Geomagnetic K-Index of 6')).toBe('G2');
    expect(getAlertLevel('Geomagnetic K-Index of 4')).toBe('K4');
    expect(getAlertLevel('No alert')).toBeNull();
  });
});

