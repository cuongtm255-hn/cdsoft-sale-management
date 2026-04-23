import { createConnection } from 'mysql2/promise';

export interface MysqlDatabaseBootstrapOptions {
  host: string;
  port: number;
  username: string;
  password?: string;
  database: string;
}

export async function ensureMysqlDatabaseExists(
  options: MysqlDatabaseBootstrapOptions,
): Promise<void> {
  const connection = await createConnection({
    host: options.host,
    port: options.port,
    user: options.username,
    password: options.password,
    multipleStatements: false,
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${options.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await connection.end();
  }
}
