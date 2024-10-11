import pkg from 'pg';

const { Pool, Client } = pkg;

interface IDataDict {
  [key: string]: any;
}

type PoolType = InstanceType<typeof Pool>;

class Database {
  private pool: PoolType;

  constructor(
    private user: string,
    private host: string,
    private password: string,
    private port: number,
    private database: string,
  ) {
    this.pool = new Pool({
      user: this.user,
      host: this.host,
      password: this.password,
      port: this.port,
      database: this.database,
    });
  }

  public async connectPool(): Promise<void> {
    try {
      await this.pool.connect();
      console.log(`Conexão com o banco de dados "${this.database}" foi estabelecida.`);
    } catch (err) {
      console.error('Erro ao conectar ao pool:', err);
      throw err;
    }
  }

  public async beginTransaction(): Promise<void> {
    try {
      await this.pool.query('BEGIN');
      console.log('Transação iniciada.');
    } catch (err) {
      console.error('Erro ao iniciar a transação:', err);
      throw err;
    }
  }

  public async commitTransaction(): Promise<void> {
    try {
      await this.pool.query('COMMIT');
      console.log('Transação comitada.');
    } catch (err) {
      console.error('Erro ao comitar a transação:', err);
      throw err;
    }
  }

  public async rollbackTransaction(): Promise<void> {
    try {
      await this.pool.query('ROLLBACK');
      console.log('Transação revertida.');
    } catch (err) {
      console.error('Erro ao reverter a transação:', err);
      throw err;
    }
  }

  public async executeMigration(sql: string): Promise<void> {
    try {
      await this.pool.query(sql);
      console.log('Migração executada com sucesso.');
    } catch (err) {
      console.error('Erro ao executar migração:', err);
      throw err;
    }
  }

  public async createDatabase(): Promise<void> {
    const client = new Client({
      user: this.user,
      host: this.host,
      password: this.password,
      port: this.port,
      database: 'postgres',
    });

    try {
      await client.connect();
      await client.query(`CREATE DATABASE "${this.database}"`);
      console.log(`Banco de dados "${this.database}" criado com sucesso.`);
    } catch (err: any) {
      if (err.code === '42P04') {
        console.log(`Banco de dados "${this.database}" já existe.`);
      } else {
        console.error('Erro ao criar o banco de dados:', err);
      }
    } finally {
      await client.end();
    }
  }

  public async insertIntoTable(
    tableName: string,
    dataDict: IDataDict,
    returningColumn = 'id',
  ): Promise<number | string> {
    const columns = Object.keys(dataDict);
    const values = columns.map((col) => dataDict[col]);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING ${returningColumn};
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0][returningColumn];
  }

  public async updateIntoTable(
    tableName: string,
    dataDict: IDataDict,
    referenceColumn = 'id',
  ): Promise<void> {
    const columns = Object.keys(dataDict).filter((key) => key !== referenceColumn);
    const values = columns.map((col) => dataDict[col]);

    const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');

    const query = `
    UPDATE ${tableName}
    SET ${setClause}
    WHERE ${referenceColumn} = $${columns.length + 1};
  `;

    await this.pool.query(query, [...values, dataDict[referenceColumn]]);
  }

  public async searchAll<T>(
    table: string,
    fields: string[] | null = null,
    orderBy: { [key: string]: 'ASC' | 'DESC' } | null = null,
  ): Promise<T[]> {
    let query: string = '';

    if (fields && fields.length > 0) {
      const selectedFields = fields.join(', ');
      query = `SELECT ${selectedFields} FROM ${table}`;
    } else {
      query = `SELECT * FROM ${table}`;
    }

    if (orderBy && Object.keys(orderBy).length > 0) {
      const ordering = Object.keys(orderBy)
        .map((key) => `${key} ${orderBy[key]}`)
        .join(', ');

      query += ` ORDER BY ${ordering}`;
    }

    query += ';';

    const result = await this.pool.query(query);
    return result.rows as T[];
  }

  public async searchUniqueByField<T>(
    table: string,
    field: string,
    value: any,
    fields: string[] | null = null,
  ): Promise<T | null> {
    let query: string;

    if (fields && fields.length > 0) {
      if (fields.length === 1) {
        query = `
          SELECT ${fields[0]}
          FROM ${table}
          WHERE ${field} = $1
          LIMIT 1;
        `;
      } else {
        const selectedFields = fields.join(', ');
        query = `
          SELECT ${selectedFields}
          FROM ${table}
          WHERE ${field} = $1
          LIMIT 1;
        `;
      }
    } else {
      query = `
        SELECT *
        FROM ${table}
        WHERE ${field} = $1
        LIMIT 1;
      `;
    }

    const result = await this.pool.query(query, [value]);

    if (result.rows.length > 0) {
      return result.rows[0] as T;
    } else {
      return null;
    }
  }

  public async deleteFromTable(
    tableName: string,
    id: number | string,
    idColumn: string = 'id',
  ): Promise<void> {
    const query = `
      DELETE FROM ${tableName}
      WHERE ${idColumn} = $1;
    `;

    await this.pool.query(query, [id]);
  }

  public async query<T = any>(queryText: string, params: any[] = []): Promise<T[]> {
    try {
      const result = await this.pool.query(queryText, params);
      return result.rows as T[];
    } catch (err) {
      console.error('Erro ao executar query:', err);
      throw err;
    }
  }
}

export default Database;
