async function getToken() {
  const API_URL = 'https://api-challenge.agilefreaks.com/v1/tokens';
  console.log('Fetching authorization token...');

  const response = await fetchWithTimeout(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Token request failed with status ${response.status}`);
  }

  const { token } = await response.json();
  return token;
}

async function fetchShops(url, token) {
  console.log('Fetching nearby coffee shops...');

  const response = await fetchWithTimeout(`${url}?token=${token}`, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    handleApiError(response.status);
  }

  return response.json();
}

async function fetchWithTimeout(url, options, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function handleApiError(status) {
  const errorMessages = {
    401: 'Authentication failed. Please try again with a new token.',
    406: 'Invalid request format. Please check the Accept header.',
    503: 'Service unavailable. Please try again later.',
    504: 'Request timed out. Please try again.',
  };

  throw new Error(errorMessages[status] || `API request failed with status ${status}`);
}

/**
 * Calculates Euclidean distance between two points.
 * @param {{x: number, y: number}} point1
 * @param {{x: number, y: number}} point2
 * @returns {number}
 */
const calculateDistance = ({ x: x1, y: y1 }, { x: x2, y: y2 }) =>
  Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);

/**
 * Fetches and returns the nearest coffee shops.
 * @param {{x: number, y: number}} [position]
 * @returns {Promise<Array<{name: string, distance: number}>>}
 */
export async function getNearestShops(position) {
  const API_URL = 'https://api-challenge.agilefreaks.com/v1/coffee_shops';

  if (!position) {
    const [x, y] = process.argv.slice(2).map(Number);
    if (isNaN(x) || isNaN(y)) {
      console.error('Please provide valid x and y coordinates');
      return [];
    }
    position = { x, y };
  }

  console.log('\nStarting search...');

  try {
    const token = await getToken();
    const shops = await fetchShops(API_URL, token);

    console.log('Calculating distances...');
    const nearestShops = shops
      .map(({ name, x, y }) => ({
        name,
        distance: Number(
          calculateDistance(position, { x: parseFloat(x), y: parseFloat(y) }).toFixed(4)
        ),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);

    console.log('\nNearest coffee shops:');
    nearestShops.forEach(({ name, distance }) => console.log(`${name}, ${distance}`));

    return nearestShops;
  } catch (error) {
    console.error('\nError:', error.message);
    return [];
  }
}
