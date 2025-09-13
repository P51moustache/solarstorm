// Mock the 'expo' package early to avoid importing winter runtime in Jest
jest.mock('expo', () => ({
  __esModule: true,
  default: {},
}));

