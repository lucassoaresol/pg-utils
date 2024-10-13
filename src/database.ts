import pkg from 'pg';

import {
  IDataDict,
  PoolType,
  SearchParams,
  SelectFields,
  WhereClause,
} from './IDatabase';

const { Pool, Client } = pkg;

function processCondition(
  key: string,
  condition: any,
  conditionsArray: string[],
  whereValues: any[],
) {
  if (condition === null || condition === undefined) {
    conditionsArray.push(`${key} IS NULL`);
  } else if (typeof condition === 'object') {
    if ('value' in condition && 'mode' in condition) {
      if (condition.mode === 'not') {
        if (condition.value === null) {
          conditionsArray.push(`${key} IS NOT NULL`);
        } else {
          conditionsArray.push(`${key} != $${whereValues.length + 1}`);
          whereValues.push(condition.value);
        }
      } else {
        conditionsArray.push(`${key} = $${whereValues.length + 1}`);
        whereValues.push(condition.value);
      }
    } else if (
      'lt' in condition ||
      'lte' in condition ||
      'gt' in condition ||
      'gte' in condition
    ) {
      if (condition.lt !== undefined) {
        conditionsArray.push(`${key} < $${whereValues.length + 1}`);
        whereValues.push(condition.lt);
      }
      if (condition.lte !== undefined) {
        conditionsArray.push(`${key} <= $${whereValues.length + 1}`);
        whereValues.push(condition.lte);
      }
      if (condition.gt !== undefined) {
        conditionsArray.push(`${key} > $${whereValues.length + 1}`);
        whereValues.push(condition.gt);
      }
      if (condition.gte !== undefined) {
        conditionsArray.push(`${key} >= $${whereValues.length + 1}`);
        whereValues.push(condition.gte);
      }
    }
  } else {
    conditionsArray.push(`${key} = $${whereValues.length + 1}`);
    whereValues.push(condition);
  }
}

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

  public async insertIntoTable<T>({
    table,
    dataDict,
    select,
  }: {
    table: string;
    dataDict: IDataDict;
    select?: SelectFields<T>;
  }): Promise<T[] | void> {
    const columns = Object.keys(dataDict);
    const values = columns.map((col) => dataDict[col]);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');

    let returningClause = '';
    if (select && Object.keys(select).length > 0) {
      const selectedFields = Object.keys(select)
        .filter((key) => select[key as keyof T])
        .join(', ');

      if (selectedFields.length > 0) {
        returningClause = `RETURNING ${selectedFields}`;
      }
    }

    const query = `
    INSERT INTO ${table} (${columns.join(', ')})
    VALUES (${placeholders})
    ${returningClause};
  `;

    const result = await this.pool.query(query, values);

    if (returningClause && result.rows.length > 0) {
      return result.rows as T[];
    }
  }

  public async updateIntoTable<T>({
    table,
    dataDict,
    where,
  }: {
    table: string;
    dataDict: IDataDict;
    where?: WhereClause<T>;
  }): Promise<void> {
    const columns = Object.keys(dataDict);
    const values = columns.map((col) => dataDict[col]);

    const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');

    let query = `UPDATE ${table} SET ${setClause}`;

    const whereValues: any[] = [...values];

    if (where) {
      const andConditions: string[] = [];
      const orConditions: string[] = [];

      Object.keys(where).forEach((key) => {
        if (key !== 'OR') {
          const condition = where[key as keyof T];
          processCondition(key, condition, andConditions, whereValues);
        }
      });

      if (where.OR) {
        Object.keys(where.OR).forEach((key) => {
          const condition = where.OR![key as keyof T];
          processCondition(key, condition, orConditions, whereValues);
        });
      }

      if (andConditions.length > 0 || orConditions.length > 0) {
        query += ' WHERE ';
        if (andConditions.length > 0) {
          query += `(${andConditions.join(' AND ')})`;
        }
        if (orConditions.length > 0) {
          if (andConditions.length > 0) {
            query += ' OR ';
          }
          query += `(${orConditions.join(' OR ')})`;
        }
      }
    }

    query += ';';

    await this.pool.query(query, whereValues);
  }

  public async findMany<T>({
    table,
    orderBy,
    select,
    where,
  }: SearchParams<T>): Promise<T[]> {
    let query: string = '';
    const whereValues: any[] = [];

    if (select && Object.keys(select).length > 0) {
      const selectedFields = Object.keys(select)
        .filter((key) => select[key as keyof T] === true)
        .join(', ');

      query =
        selectedFields.length > 0
          ? `SELECT ${selectedFields} FROM ${table}`
          : `SELECT * FROM ${table}`;
    } else {
      query = `SELECT * FROM ${table}`;
    }

    if (where) {
      const andConditions: string[] = [];
      const orConditions: string[] = [];

      Object.keys(where).forEach((key) => {
        if (key !== 'OR') {
          const condition = where[key as keyof T];
          processCondition(key, condition, andConditions, whereValues);
        }
      });

      if (where.OR) {
        Object.keys(where.OR).forEach((key) => {
          const condition = where.OR![key as keyof T];
          processCondition(key, condition, orConditions, whereValues);
        });
      }

      if (andConditions.length > 0 || orConditions.length > 0) {
        query += ' WHERE ';
        if (andConditions.length > 0) {
          query += `(${andConditions.join(' AND ')})`;
        }
        if (orConditions.length > 0) {
          if (andConditions.length > 0) {
            query += ' OR ';
          }
          query += `(${orConditions.join(' OR ')})`;
        }
      }
    }

    if (orderBy && Object.keys(orderBy).length > 0) {
      const ordering = Object.keys(orderBy)
        .map((key) => `${key} ${orderBy[key as keyof T]}`)
        .join(', ');

      query += ` ORDER BY ${ordering}`;
    }

    query += ';';

    const result = await this.pool.query(query, whereValues);

    return result.rows as T[];
  }

  public async findFirst<T>({
    table,
    orderBy,
    select,
    where,
  }: SearchParams<T>): Promise<T | null> {
    let query: string = '';
    const whereValues: any[] = [];

    if (select && Object.keys(select).length > 0) {
      const selectedFields = Object.keys(select)
        .filter((key) => select[key as keyof T] === true)
        .join(', ');

      query =
        selectedFields.length > 0
          ? `SELECT ${selectedFields} FROM ${table}`
          : `SELECT * FROM ${table}`;
    } else {
      query = `SELECT * FROM ${table}`;
    }

    if (where) {
      const andConditions: string[] = [];
      const orConditions: string[] = [];

      Object.keys(where).forEach((key) => {
        if (key !== 'OR') {
          const condition = where[key as keyof T];
          processCondition(key, condition, andConditions, whereValues);
        }
      });

      if (where.OR) {
        Object.keys(where.OR).forEach((key) => {
          const condition = where.OR![key as keyof T];
          processCondition(key, condition, orConditions, whereValues);
        });
      }

      if (andConditions.length > 0 || orConditions.length > 0) {
        query += ' WHERE ';
        if (andConditions.length > 0) {
          query += `(${andConditions.join(' AND ')})`;
        }
        if (orConditions.length > 0) {
          if (andConditions.length > 0) {
            query += ' OR ';
          }
          query += `(${orConditions.join(' OR ')})`;
        }
      }
    }

    if (orderBy && Object.keys(orderBy).length > 0) {
      const ordering = Object.keys(orderBy)
        .map((key) => `${key} ${orderBy[key as keyof T]}`)
        .join(', ');

      query += ` ORDER BY ${ordering}`;
    }

    query += ';';

    const result = await this.pool.query(query, whereValues);

    if (result.rows.length > 0) {
      return result.rows[0] as T;
    } else {
      return null;
    }
  }

  public async deleteFromTable<T>({
    table,
    where,
  }: {
    table: string;
    where?: WhereClause<T>;
  }): Promise<void> {
    let query = `DELETE FROM ${table}`;

    const whereValues: any[] = [];

    if (where) {
      const andConditions: string[] = [];
      const orConditions: string[] = [];

      Object.keys(where).forEach((key) => {
        if (key !== 'OR') {
          const condition = where[key as keyof T];
          processCondition(key, condition, andConditions, whereValues);
        }
      });

      if (where.OR) {
        Object.keys(where.OR).forEach((key) => {
          const condition = where.OR![key as keyof T];
          processCondition(key, condition, orConditions, whereValues);
        });
      }

      if (andConditions.length > 0 || orConditions.length > 0) {
        query += ' WHERE ';
        if (andConditions.length > 0) {
          query += `(${andConditions.join(' AND ')})`;
        }
        if (orConditions.length > 0) {
          if (andConditions.length > 0) {
            query += ' OR ';
          }
          query += `(${orConditions.join(' OR ')})`;
        }
      }
    }

    query += ';';

    await this.pool.query(query, whereValues);
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
