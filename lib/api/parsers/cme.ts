export interface CmeEvent {
  id: string;
  startTime: string;
  arrivalTime: string | null; // Predicted Earth arrival
  speed: number; // km/s
  halfAngle: number;
  isEarthDirected: boolean;
  note: string;
}

export interface CmeCountdownData {
  nextArrival: CmeEvent | null;
  recentCmes: CmeEvent[];
  hoursUntilArrival: number | null;
}

export function parseCmeData(data: unknown): CmeEvent[] {
  if (!Array.isArray(data)) return [];

  return data
    .filter((item): item is Record<string, unknown> =>
      item !== null && typeof item === 'object'
    )
    .map((item) => {
      // Find Earth-directed analysis
      const analyses = Array.isArray(item.cmeAnalyses) ? item.cmeAnalyses : [];
      const earthAnalysis = analyses.find(
        (a: Record<string, unknown>) =>
          a.isMostAccurate &&
          Array.isArray(a.enlilList) &&
          a.enlilList.some((e: Record<string, unknown>) => e.isEarthGB)
      ) as Record<string, unknown> | undefined;

      const enlilList = Array.isArray(earthAnalysis?.enlilList) ? earthAnalysis.enlilList : [];
      const enlil = enlilList.find((e: Record<string, unknown>) => e.isEarthGB) as Record<string, unknown> | undefined;

      return {
        id: String(item.activityID || ''),
        startTime: String(item.startTime || ''),
        arrivalTime: (enlil?.arrivalTime as string) || null,
        speed: (earthAnalysis?.speed as number) || 0,
        halfAngle: (earthAnalysis?.halfAngle as number) || 0,
        isEarthDirected: !!enlil,
        note: String(item.note || ''),
      };
    })
    .filter((cme) => cme.id && cme.startTime);
}

export function getNextCmeArrival(cmes: CmeEvent[]): CmeCountdownData {
  const now = new Date();

  // Filter to Earth-directed CMEs with future arrival times
  const upcoming = cmes
    .filter((cme) => {
      if (!cme.isEarthDirected || !cme.arrivalTime) return false;
      return new Date(cme.arrivalTime) > now;
    })
    .sort((a, b) =>
      new Date(a.arrivalTime!).getTime() - new Date(b.arrivalTime!).getTime()
    );

  const nextArrival = upcoming[0] || null;
  const hoursUntilArrival = nextArrival
    ? (new Date(nextArrival.arrivalTime!).getTime() - now.getTime()) / (1000 * 60 * 60)
    : null;

  return {
    nextArrival,
    recentCmes: cmes.slice(0, 5),
    hoursUntilArrival: hoursUntilArrival ? Math.round(hoursUntilArrival) : null,
  };
}
