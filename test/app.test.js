import { jest } from '@jest/globals';
import { getNearestShops } from '../src/app.js';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('getNearestShops', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ token: 'test-token' }),
      })
    );
  });

  it('should return an array when the input is valid', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve([
            {
              name: 'Test Coffee Shop',
              x: '47.581',
              y: '-122.316',
            },
          ]),
      })
    );

    const result = await getNearestShops({ x: 47.6, y: -122.4 });
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return sorted coffee shops by distance', async () => {
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve([
            {
              name: 'Test Coffee Shop',
              x: '47.581',
              y: '-122.316',
            },
          ]),
      })
    );

    const result = await getNearestShops({ x: 47.6, y: -122.4 });
    expect(result).toEqual([{ name: 'Test Coffee Shop', distance: expect.any(Number) }]);
  });

  it('should return an empty array when no coordinates are provided', async () => {
    const result = await getNearestShops();
    expect(result).toEqual([]);
  });

  it('should throw an error when API request fails', async () => {
    mockFetch.mockReset();

    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ token: 'test-token' }),
      })
    );

    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 503,
      })
    );

    await expect(getNearestShops({ x: 47.6, y: -122.4 })).rejects.toThrow(
      'Service unavailable. Please try again later.'
    );
  });

  it('should handle non-numeric coordinates gracefully', async () => {
    const result = await getNearestShops({ x: 'invalid', y: 'data' });
    expect(result).toEqual([]);
  });
});
