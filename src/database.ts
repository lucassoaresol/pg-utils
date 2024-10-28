import { EventEmitter } from 'node:events';

import pkg from 'pg';

import {
  ClientType,
  IDataDict,
  PoolType,
  SearchParams,
  SelectFields,
  WhereClause,
} from './IDatabase';

const { Pool, Client } = pkg;

class Database extends EventEmitter {
  private pool: PoolType;
  private listenerClient: ClientType;

  constructor(
    private user: string,
    private host: string,
    private password: string,
    private port: number,
    private database: string,
  ) {
    super();
    this.pool = new Pool({
      user: this.user,
      host: this.host,
      password: this.password,
      port: this.port,
      database: this.database,
    });

    this.listenerClient = new Client({
      user: this.user,
      host: this.host,
      password: this.password,
      port: this.port,
      database: this.database,
    });
  }

  public async listenToEvents(channel: string): Promise<void> {
    try {
      await this.listenerClient.connect();
      console.log(`Escutando o canal "${channel}" para eventos...`);

      await this.listenerClient.query(`LISTEN ${channel}`);
      this.listenerClient.on('notification', (msg) => {
        const payload = msg.payload ? JSON.parse(msg.payload) : null;
        console.log(`Notificação recebida no canal "${channel}":`, payload);
        this.emit(channel, payload);
      });
    } catch (err) {
      console.error('Erro ao escutar eventos:', err);
      throw err;
    }
  }

  public async stopListening(): Promise<void> {
    try {
      await this.listenerClient.end();
      console.log('Parou de escutar eventos.');
    } catch (err) {
      console.error('Erro ao parar o listener:', err);
      throw err;
    }
  }

  private createAlias = (table: string, existingAliases: Set<string>): string => {
    const parts = table.split('_');
    let alias = parts.map((part) => part[0]).join('');
    let counter = 0;

    while (existingAliases.has(alias)) {
      counter++;
      alias = parts.map((part) => part[0]).join('') + counter;
    }

    existingAliases.add(alias);

    return alias;
  };

  private mapNullToUndefined<T extends Record<string, unknown>>(row: T): T {
    const mappedRow: Partial<T> = {};

    for (const key in row) {
      if (Object.prototype.hasOwnProperty.call(row, key)) {
        const value = row[key];
        mappedRow[key] = value === null ? undefined : value;
      }
    }

    return mappedRow as T;
  }

  private mapNullToUndefinedInArray<T extends Record<string, unknown>>(
    array: T[],
  ): T[] {
    return array.map((item) => this.mapNullToUndefined(item));
  }

  private processCondition(
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
  }): Promise<T | void> {
    const columns = Object.keys(dataDict).filter((col) => dataDict[col] !== undefined);
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
      const mappedResult = this.mapNullToUndefined(result.rows[0]);
      return mappedResult as T;
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
    const columns = Object.keys(dataDict).filter((col) => dataDict[col] !== undefined);
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
          this.processCondition(key, condition, andConditions, whereValues);
        }
      });

      if (where.OR) {
        Object.keys(where.OR).forEach((key) => {
          const condition = where.OR![key as keyof T];
          this.processCondition(key, condition, orConditions, whereValues);
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
    joins,
  }: SearchParams<T>): Promise<T[]> {
    let query: string = '';
    let query_aux: string = '';
    const selectedFields: string[] = [];
    const whereValues: any[] = [];
    const existingAliases = new Set<string>();

    const mainTableAlias = this.createAlias(table, existingAliases);

    if (select && Object.keys(select).length > 0) {
      selectedFields.push(
        ...Object.keys(select)
          .filter((key) => select[key as keyof T] === true)
          .map((key) => `${mainTableAlias}.${key}`),
      );
    } else {
      selectedFields.push(`${mainTableAlias}.*`);
    }

    if (joins && joins.length > 0) {
      for (const join of joins) {
        const joinAlias = this.createAlias(join.table, existingAliases);
        const joinType = join.type || 'INNER';

        if (join.select && Object.keys(join.select).length > 0) {
          selectedFields.push(
            ...Object.keys(join.select)
              .filter((key) => join.select![key as keyof T] === true)
              .map((key) => `${joinAlias}.${key} AS ${joinAlias}_${key}`),
          );
        } else {
          const joinColumns = await this.query(
            'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
            [join.table],
          );

          selectedFields.push(
            ...joinColumns.map(
              (column: { column_name: string }) =>
                `${joinAlias}.${column.column_name} AS ${joinAlias}_${column.column_name}`,
            ),
          );
        }

        const joinConditions = Object.keys(join.on)
          .map((key) => `${mainTableAlias}.${key} = ${joinAlias}.${join.on[key]}`)
          .join(' AND ');

        query_aux += ` ${joinType} JOIN ${join.table} AS ${joinAlias} ON ${joinConditions}`;
      }
    }

    query = `SELECT ${selectedFields.join(', ')} FROM ${table} AS ${mainTableAlias} ${query_aux}`;

    if (where) {
      const andConditions: string[] = [];
      const orConditions: string[] = [];

      Object.keys(where).forEach((key) => {
        if (key !== 'OR') {
          const condition = where[key as keyof T];
          this.processCondition(
            `${mainTableAlias}.${key}`,
            condition,
            andConditions,
            whereValues,
          );
        }
      });

      if (where.OR) {
        Object.keys(where.OR).forEach((key) => {
          const condition = where.OR![key as keyof T];
          this.processCondition(
            `${mainTableAlias}.${key}`,
            condition,
            orConditions,
            whereValues,
          );
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
        .map((key) => `${mainTableAlias}.${key} ${orderBy[key as keyof T]}`)
        .join(', ');

      query += ` ORDER BY ${ordering}`;
    }

    query += ';';

    const result = await this.pool.query(query, whereValues);

    const cleanedResult = this.mapNullToUndefinedInArray(result.rows);

    return cleanedResult as T[];
  }

  public async findFirst<T>({
    table,
    orderBy,
    select,
    where,
    joins,
  }: SearchParams<T>): Promise<T | null> {
    let query: string = '';
    let query_aux: string = '';
    const selectedFields: string[] = [];
    const whereValues: any[] = [];
    const existingAliases = new Set<string>();

    const mainTableAlias = this.createAlias(table, existingAliases);

    if (select && Object.keys(select).length > 0) {
      selectedFields.push(
        ...Object.keys(select)
          .filter((key) => select[key as keyof T] === true)
          .map((key) => `${mainTableAlias}.${key}`),
      );
    } else {
      selectedFields.push(`${mainTableAlias}.*`);
    }

    if (joins && joins.length > 0) {
      for (const join of joins) {
        const joinAlias = this.createAlias(join.table, existingAliases);
        const joinType = join.type || 'INNER';

        if (join.select && Object.keys(join.select).length > 0) {
          selectedFields.push(
            ...Object.keys(join.select)
              .filter((key) => join.select![key as keyof T] === true)
              .map((key) => `${joinAlias}.${key} AS ${joinAlias}_${key}`),
          );
        } else {
          const joinColumns = await this.query(
            'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
            [join.table],
          );

          selectedFields.push(
            ...joinColumns.map(
              (column: { column_name: string }) =>
                `${joinAlias}.${column.column_name} AS ${joinAlias}_${column.column_name}`,
            ),
          );
        }

        const joinConditions = Object.keys(join.on)
          .map((key) => `${mainTableAlias}.${key} = ${joinAlias}.${join.on[key]}`)
          .join(' AND ');

        query_aux += ` ${joinType} JOIN ${join.table} AS ${joinAlias} ON ${joinConditions}`;
      }
    }

    query = `SELECT ${selectedFields.join(', ')} FROM ${table} AS ${mainTableAlias} ${query_aux}`;

    if (where) {
      const andConditions: string[] = [];
      const orConditions: string[] = [];

      Object.keys(where).forEach((key) => {
        if (key !== 'OR') {
          const condition = where[key as keyof T];
          this.processCondition(
            `${mainTableAlias}.${key}`,
            condition,
            andConditions,
            whereValues,
          );
        }
      });

      if (where.OR) {
        Object.keys(where.OR).forEach((key) => {
          const condition = where.OR![key as keyof T];
          this.processCondition(
            `${mainTableAlias}.${key}`,
            condition,
            orConditions,
            whereValues,
          );
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
        .map((key) => `${mainTableAlias}.${key} ${orderBy[key as keyof T]}`)
        .join(', ');

      query += ` ORDER BY ${ordering}`;
    }

    query += ';';

    const result = await this.pool.query(query, whereValues);

    if (result.rows.length > 0) {
      const mappedResult = this.mapNullToUndefined(result.rows[0]);
      return mappedResult as T;
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
          this.processCondition(key, condition, andConditions, whereValues);
        }
      });

      if (where.OR) {
        Object.keys(where.OR).forEach((key) => {
          const condition = where.OR![key as keyof T];
          this.processCondition(key, condition, orConditions, whereValues);
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
