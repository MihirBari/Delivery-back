const mysql = require('mysql2');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'aspadmin',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  timezone: '+00:00',
  dateStrings: true,
};

// Create regular pool (compatible with express-mysql-session and callback code if needed)
const pool = mysql.createPool(dbConfig);

// Create promise-based pool for modern async/await
const promisePool = pool.promise();

// Function to test connectivity
const testConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log(`[Database] Successfully connected to MySQL at ${dbConfig.host}:${dbConfig.port}, Database: ${dbConfig.database}`);
    connection.release();
    return true;
  } catch (error) {
    console.warn(`[Database Warning] Could not connect to MySQL server at ${dbConfig.host}:${dbConfig.port} - ${error.message}`);
    return false;
  }
};

module.exports = {
  pool,
  promisePool,
  testConnection,
};
