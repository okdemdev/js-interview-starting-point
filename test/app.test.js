import { jest } from '@jest/globals';
import { getNearestShops } from '../src/app.js';

const mockFetch = jest.fn(() =>
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

global.fetch = mockFetch;

describe('App', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should return an array when the input is valid', async () => {
    const result = await getNearestShops({
      x: 47.6,
      y: -122.4,
    });

    expect(Array.isArray(result)).toBe(true);
  });
});
