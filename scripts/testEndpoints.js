const http = require('http');

// Simple helper to send HTTP request
function makeRequest({ path, method = 'GET', body = null, headers = {} }) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const reqHeaders = { ...headers };
    if (data) {
      reqHeaders['Content-Type'] = 'application/json';
      reqHeaders['Content-Length'] = Buffer.byteLength(data);
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port: 9000,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: responseData ? JSON.parse(responseData) : null,
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              rawBody: responseData,
            });
          }
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('Testing Delivery Backend Endpoints...');

  try {
    // 1. Test Health endpoint
    const health = await makeRequest({ path: '/health' });
    console.log('1. /health -> Status:', health.statusCode, health.body);

    // 2. Test 404 handler
    const notFound = await makeRequest({ path: '/non-existent-path' });
    console.log('2. 404 handler -> Status:', notFound.statusCode, notFound.body);

    // 3. Test /login with missing parameters
    const loginEmpty = await makeRequest({ path: '/login', method: 'POST', body: {} });
    console.log('3. /login with empty body -> Status:', loginEmpty.statusCode, loginEmpty.body);

    // 4. Test /logout
    const logout = await makeRequest({ path: '/logout' });
    console.log('4. /logout -> Status:', logout.statusCode, logout.body);

    console.log('All basic endpoint tests completed!');
    process.exit(0);
  } catch (err) {
    console.error('Test failed with error:', err.message);
    process.exit(1);
  }
}

runTests();
