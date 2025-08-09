// libraries/Database.js
const { Pool } = require('pg');
require('dotenv').config();

class Database {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
    });

    this.pool.on('connect', () => {
      console.log('Connecté à la base de données PostgreSQL');
    });

    this.pool.on('error', (err) => {
      console.error('Erreur inattendue sur le client inactif', err);
      process.exit(-1);
    });
  }

  async query(text, params) {
    const client = await this.pool.connect();
    try {
      const res = await client.query(text, params);
      return res;
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  async close() {
    await this.pool.end();
    console.log('Connexion à la base de données fermée');
  }
}

module.exports = new Database();