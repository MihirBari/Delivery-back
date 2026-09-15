const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../config/.env') });

async function initDatabase() {
  console.log('--- Initializing Delivery Management System Database ---');
  console.log(`Connecting to: ${process.env.DB_HOST}:${process.env.DB_PORT || 3306} as ${process.env.DB_USER}`);

  let connection;
  try {
    // First connect without database selected to ensure DB exists
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT) || 3306,
      multipleStatements: true,
      connectTimeout: 10000,
    });

    console.log('Connected to MySQL server successfully!');

    // Read schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Executing schema.sql...');
    await connection.query(schemaSql);
    console.log('Tables created successfully!');

    // Check if seed flag is provided or run seed
    const shouldSeed = process.argv.includes('--seed') || true;
    if (shouldSeed) {
      const seedPath = path.join(__dirname, 'seed.sql');
      if (fs.existsSync(seedPath)) {
        console.log('Executing seed.sql...');
        const seedSql = fs.readFileSync(seedPath, 'utf8');
        await connection.query(seedSql);
        console.log('Seed data inserted successfully!');
      }
    }

    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Error during database initialization:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

initDatabase();
