import { useSolarStormStore } from '../../lib/state/useStore';

// Mock the API functions
jest.mock('../../lib/api/swpc', () => ({
  getKpNow: jest.fn(() => Promise.resolve({ kp: 4.5, at: '2023-01-01T00:00:00.000Z' })),
  getSolarWindRecent: jest.fn(() => Promise.resolve({
    points: [
      { at: '2023-01-01T00:00:00.000Z', bz: -5.5, speed: 450, density: 8.2 },
    ],
  })),
  getOvation: jest.fn(() => Promise.resolve({
    updated: '2023-01-01T00:00:00.000Z',
    cells: [],
  })),
  getAlerts: jest.fn(() => Promise.resolve([])),
  clearCache: jest.fn(() => Promise.resolve()),
}));

describe('SolarStorm Store', () => {
  beforeEach(() => {
    // Reset store state
    const store = useSolarStormStore.getState();
    store.kp = null;
    store.bz = null;
    store.speed = null;
    store.density = null;
    store.error = null;
  });

  it('should initialize with default values', () => {
    const state = useSolarStormStore.getState();
    
    expect(state.kp).toBeNull();
    expect(state.kpThreshold).toBe(5);
    expect(state.requireBzGate).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('should update Kp threshold', () => {
    const { setKpThreshold } = useSolarStormStore.getState();
    
    setKpThreshold(6);
    
    const state = useSolarStormStore.getState();
    expect(state.kpThreshold).toBe(6);
  });

  it('should toggle Bz gate', () => {
    const { toggleBzGate } = useSolarStormStore.getState();
    
    const initialValue = useSolarStormStore.getState().requireBzGate;
    toggleBzGate();
    
    const newValue = useSolarStormStore.getState().requireBzGate;
    expect(newValue).toBe(!initialValue);
  });

  it('should refresh Kp data', async () => {
    const { refreshKP } = useSolarStormStore.getState();
    
    await refreshKP();
    
    const state = useSolarStormStore.getState();
    expect(state.kp).toBe(4.5);
    expect(state.kpUpdatedAt).toBe('2023-01-01T00:00:00.000Z');
  });

  it('should refresh solar wind data', async () => {
    const { refreshSW } = useSolarStormStore.getState();
    
    await refreshSW();
    
    const state = useSolarStormStore.getState();
    expect(state.bz).toBe(-5.5);
    expect(state.speed).toBe(450);
    expect(state.density).toBe(8.2);
  });
});
