const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');

async function run() {
  const migrationsDir = __dirname;
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  const connection = await pool.getConnection();
  try {
    let totalStatements = 0;
    for (const file of files) {
      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');
      const statements = sql
        .split(';')
        .map((statement) => statement.trim())
        .filter(Boolean);
      for (const statement of statements) {
        await connection.query(statement);
      }
      console.log(`${file}: ${statements.length} statements executed.`);
      totalStatements += statements.length;
    }
    console.log(`Migration complete: ${totalStatements} statements executed across ${files.length} files.`);
  } finally {
    connection.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});