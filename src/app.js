async function getToken() {
  const API_URL = 'https://api-challenge.agilefreaks.com/v1/tokens';
  console.log('Fetching authorization token...');

  try {
    const response = await fetchWithTimeout(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.log('Token request failed. Please try again.');
      process.exit(0);
    }

    const { token } = await response.json();
    return token;
  } catch (error) {
    console.log('Failed to connect to authentication service. Please try again.');
    process.exit(0);
  }
}

async function fetchShops(url, token, retryCount = 1, shouldRetryToken = true) {
  console.log('Fetching nearby coffee shops...');

  try {
    const response = await fetchWithTimeout(`${url}?token=${token}`, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 401 && shouldRetryToken) {
        console.log('Token is invalid or expired. Generating new token in 5 seconds...');
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const newToken = await getToken();
        console.log('New token has been generated, retrying request...');
        return fetchShops(url, newToken, retryCount, false);
      }

      if (response.status === 503 && retryCount > 0) {
        console.log('Service unavailable. Retrying in 5 seconds...');
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return fetchShops(url, token, retryCount - 1, shouldRetryToken);
      }

      handleApiError(response.status);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format from API');
    }

    return data;
  } catch (error) {
    if (error.name === 'AbortError' && retryCount > 0) {
      console.log('Request timed out. Retrying in 5 seconds...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return fetchShops(url, token, retryCount - 1, shouldRetryToken);
    }
    throw error;
  }
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
    401: 'Token is invalid or expired. Please try with a different token.',
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

  if (isNaN(position.x) || isNaN(position.y)) {
    console.error('Please provide valid x and y coordinates');
    return [];
  }

  console.log('\nStarting search...');

  try {
    let token;
    try {
      token = await getToken();
    } catch (error) {
      console.log('Failed to get token. Trying one more time...');
      await new Promise((resolve) => setTimeout(resolve, 3000));
      token = await getToken(); // Second attempt
    }

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
    if (error.message.includes('Token is invalid')) {
      console.log('Token is invalid or expired. Please try with a different token.');
      process.exit(0);
    }
    console.log(error.message);
    process.exit(0);
  }
}
