import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const createSequelizeInstance = () => {
  const logging = process.env.DB_LOGGING === 'true' ? console.log : false;

  const dialectOptions = process.env.DB_SSL === 'true'
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {};

  const pool = {
    max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    min: parseInt(process.env.DB_POOL_MIN || '0', 10),
    acquire: parseInt(process.env.DB_POOL_ACQUIRE || '30000', 10),
    idle: parseInt(process.env.DB_POOL_IDLE || '10000', 10),
  };

  // 1. Connection via full DATABASE_URL (PostgreSQL, MySQL, CockroachDB, etc.)
  if (process.env.DATABASE_URL) {
    console.log('[Database] Connecting via DATABASE_URL connection string...');
    return new Sequelize(process.env.DATABASE_URL, {
      dialectOptions,
      pool,
      logging,
    });
  }

  // 2. Connection via individual environment variables
  const dialect = (process.env.DB_DIALECT || 'sqlite').toLowerCase();

  if (dialect === 'sqlite') {
    const storagePath = process.env.SQLITE_STORAGE || process.env.DB_STORAGE || path.resolve(__dirname, '../../database.sqlite');
    return new Sequelize({
      dialect: 'sqlite',
      storage: storagePath,
      logging,
    });
  }

  // PostgreSQL, MySQL, MariaDB, MSSQL
  const host = process.env.DB_HOST || 'localhost';
  const defaultPort = dialect === 'postgres' ? 5432 : 3306;
  const port = parseInt(process.env.DB_PORT || String(defaultPort), 10);
  const database = process.env.DB_NAME || 'rideshare';
  const username = process.env.DB_USER || (dialect === 'postgres' ? 'postgres' : 'root');
  const password = process.env.DB_PASSWORD || process.env.DB_PASS || '';

  return new Sequelize(database, username, password, {
    host,
    port,
    dialect,
    dialectOptions,
    pool,
    logging,
  });
};

export const sequelize = createSequelizeInstance();

export const connectSQL = async () => {
  try {
    const dialect = sequelize.getDialect().toLowerCase();
    
    // Auto-create database in MySQL if it doesn't exist
    if (dialect === 'mysql' && !process.env.DATABASE_URL) {
      try {
        const mysql = await import('mysql2/promise');
        const host = process.env.DB_HOST || 'localhost';
        const port = parseInt(process.env.DB_PORT || '3306', 10);
        const user = process.env.DB_USER || 'root';
        const password = process.env.DB_PASSWORD || process.env.DB_PASS || '';
        const database = process.env.DB_NAME || 'Intern_1';

        const tempConn = await mysql.default.createConnection({ host, port, user, password });
        await tempConn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
        await tempConn.end();
      } catch (initErr) {
        // Continue to sequelize authentication
      }
    }

    await sequelize.authenticate();
    const config = sequelize.config;
    console.log(`[SQL Database] Connected successfully using dialect: ${sequelize.getDialect().toUpperCase()}`);
    if (sequelize.getDialect() === 'sqlite') {
      console.log(`[SQL Storage] SQLite file path: ${config.storage}`);
    } else {
      console.log(`[SQL Target] Host: ${config.host}:${config.port} | Database: ${config.database} | User: ${config.username}`);
    }
  } catch (error) {
    console.error(`[SQL Error] Connection failed to ${sequelize.getDialect()}:`, error.message);
    console.error('Check your .env database configuration settings.');
    process.exit(1);
  }
};

export default sequelize;
