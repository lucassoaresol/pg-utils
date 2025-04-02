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

      await this.listenerClient.query(`LISTEN ${channel}`);
      this.listenerClient.on('notification', (msg) => {
        const payload = msg.payload ? JSON.parse(msg.payload) : null;
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

  private buildWhereClause(
    where?: WhereClause,
    values?: any[],
    mainTableAlias?: string,
  ): {
    clause: string;
    values: any[];
  } {
    if (!where) return { clause: '', values: [] };

    const andConditions: string[] = [];
    const orConditions: string[] = [];
    const whereValues: any[] = values ? [...values] : [];

    const processCondition = (
      key: string,
      condition: any,
      conditionsArray: string[],
      alias?: string,
    ) => {
      const column = alias && !key.includes('.') ? `${alias}.${key}` : key;

      if (condition === null || condition === undefined) {
        conditionsArray.push(`${column} IS NULL`);
      } else if (Array.isArray(condition)) {
        const placeholders = condition
          .map((_, i) => `$${whereValues.length + i + 1}`)
          .join(', ');
        conditionsArray.push(`${column} IN (${placeholders})`);
        whereValues.push(...condition);
      } else if (typeof condition === 'object') {
        if ('value' in condition && 'mode' in condition) {
          if (condition.mode === 'not') {
            if (condition.value === null) {
              conditionsArray.push(`${column} IS NOT NULL`);
            } else if (Array.isArray(condition.value)) {
              const placeholders = condition.value
                .map((_: any, i: number) => `$${whereValues.length + i + 1}`)
                .join(', ');
              conditionsArray.push(`${column} NOT IN (${placeholders})`);
              whereValues.push(...condition.value);
            } else {
              conditionsArray.push(`${column} != $${whereValues.length + 1}`);
              whereValues.push(condition.value);
            }
          } else if (condition.mode === 'ilike') {
            conditionsArray.push(`${column} ILIKE $${whereValues.length + 1}`);
            whereValues.push(`%${condition.value}%`);
          } else {
            conditionsArray.push(`${column} = $${whereValues.length + 1}`);
            whereValues.push(condition.value);
          }
        } else if (
          'lt' in condition ||
          'lte' in condition ||
          'gt' in condition ||
          'gte' in condition
        ) {
          if (condition.lt !== undefined) {
            conditionsArray.push(`${column} < $${whereValues.length + 1}`);
            whereValues.push(condition.lt);
          }
          if (condition.lte !== undefined) {
            conditionsArray.push(`${column} <= $${whereValues.length + 1}`);
            whereValues.push(condition.lte);
          }
          if (condition.gt !== undefined) {
            conditionsArray.push(`${column} > $${whereValues.length + 1}`);
            whereValues.push(condition.gt);
          }
          if (condition.gte !== undefined) {
            conditionsArray.push(`${column} >= $${whereValues.length + 1}`);
            whereValues.push(condition.gte);
          }
        }
      } else {
        conditionsArray.push(`${column} = $${whereValues.length + 1}`);
        whereValues.push(condition);
      }
    };

    Object.keys(where).forEach((key) => {
      if (key !== 'OR') {
        const condition = where[key];
        processCondition(key, condition, andConditions, mainTableAlias);
      }
    });

    if (where.OR) {
      Object.keys(where.OR).forEach((key) => {
        const condition = where.OR![key];
        processCondition(key, condition, orConditions, mainTableAlias);
      });
    }

    let clause = '';
    if (andConditions.length > 0 || orConditions.length > 0) {
      clause += ' WHERE ';
      if (andConditions.length > 0) {
        clause += `(${andConditions.join(' AND ')})`;
      }
      if (orConditions.length > 0) {
        if (andConditions.length > 0) clause += ' AND ';
        clause += `(${orConditions.join(' OR ')})`;
      }
    }

    return { clause, values: whereValues };
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
    select?: SelectFields;
  }): Promise<T | void> {
    const columns = Object.keys(dataDict).filter((col) => dataDict[col] !== undefined);
    const values = columns.map((col) => dataDict[col]);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');

    let returningClause = '';
    if (select && Object.keys(select).length > 0) {
      const selectedFields = Object.keys(select)
        .filter((key) => select[key])
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

  public async updateIntoTable({
    table,
    dataDict,
    where,
  }: {
    table: string;
    dataDict: IDataDict;
    where?: WhereClause;
  }): Promise<void> {
    const columns = Object.keys(dataDict).filter((col) => dataDict[col] !== undefined);
    const values = columns.map((col) => dataDict[col]);

    const setClause = columns.map((col, index) => `${col} = $${index + 1}`).join(', ');

    const { clause: whereClause, values: whereValues } = this.buildWhereClause(where, [
      ...values,
    ]);

    const query = `UPDATE ${table} SET ${setClause}${whereClause};`;

    await this.pool.query(query, whereValues);
  }

  public async findMany<T>({
    table,
    alias,
    orderBy,
    select,
    where,
    joins,
    limit,
    offset,
    groupBy,
  }: SearchParams): Promise<T[]> {
    let query: string = '';
    let query_aux: string = '';
    const selectedFields: string[] = [];
    const existingAliases = new Set<string>();

    const mainTableAlias = alias || this.createAlias(table, existingAliases);

    if (alias) {
      existingAliases.add(alias);
    }

    if (select && Object.keys(select).length > 0) {
      selectedFields.push(
        ...Object.keys(select)
          .filter((key) => select[key] === true)
          .map((key) => {
            if (key.includes(' AS ')) {
              const keySplit = key.split(' AS ');
              const originalKey = keySplit[0];
              const keyAlias = keySplit.at(-1);
              if (!originalKey.includes('.')) {
                return `${mainTableAlias}.${originalKey} AS ${keyAlias}`;
              } else {
                return `${originalKey} AS ${keyAlias}`;
              }
            } else {
              if (!key.includes('.')) {
                return `${mainTableAlias}.${key}`;
              }
              const slSplit = key.split('.');
              const slAlias = slSplit[0];
              if (slAlias !== mainTableAlias) {
                return `${key} AS ${slAlias}_${slSplit.at(-1)}`;
              }
            }
            return key;
          }),
      );
    } else {
      selectedFields.push(`${mainTableAlias}.*`);
    }

    if (joins && joins.length > 0) {
      for (const join of joins) {
        const joinAlias = join.alias || this.createAlias(join.table, existingAliases);

        if (join.alias) {
          existingAliases.add(join.alias);
        }

        const joinType = join.type || 'INNER';

        if (!select) {
          const joinColumns = await this.findMany<{ column_name: string }>({
            table: 'information_schema.columns',
            alias: 'i',
            where: { table_name: join.table },
            select: { column_name: true },
          });

          selectedFields.push(
            ...joinColumns.map(
              (column) =>
                `${joinAlias}.${column.column_name} AS ${joinAlias}_${column.column_name}`,
            ),
          );
        }

        const joinConditions = Object.keys(join.on)
          .map((key) => {
            const column = !key.includes('.') ? `${mainTableAlias}.${key}` : key;
            return `${column} = ${joinAlias}.${join.on[key]}`;
          })
          .join(' AND ');

        query_aux += ` ${joinType} JOIN ${join.table} AS ${joinAlias} ON ${joinConditions}`;
      }
    }

    query = `SELECT ${selectedFields.join(', ')} FROM ${table} AS ${mainTableAlias} ${query_aux}`;

    const { clause: whereClause, values: whereValues } = this.buildWhereClause(
      where,
      undefined,
      mainTableAlias,
    );
    query += whereClause;

    if (groupBy && groupBy.length > 0) {
      const groupByClause = groupBy
        .map((key) => (!key.includes('.') ? `${mainTableAlias}.${key}` : key))
        .join(', ');
      query += ` GROUP BY ${groupByClause}`;
    }

    if (orderBy && Object.keys(orderBy).length > 0) {
      const ordering = Object.keys(orderBy)
        .map((key) =>
          !key.includes('.')
            ? `${mainTableAlias}.${key} ${orderBy[key]}`
            : `${key} ${orderBy[key]}`,
        )
        .join(', ');

      query += ` ORDER BY ${ordering}`;
    }

    if (limit) {
      query += ` LIMIT ${limit}`;
    }

    if (offset) {
      query += ` OFFSET ${offset}`;
    }

    query += ';';

    const result = await this.pool.query(query, whereValues);

    const cleanedResult = this.mapNullToUndefinedInArray(result.rows);

    return cleanedResult as T[];
  }

  public async findFirst<T>(params: SearchParams): Promise<T | null> {
    const result = await this.findMany<T>({ ...params, limit: 1 });

    return result.length > 0 ? result[0] : null;
  }

  public async deleteFromTable({
    table,
    where,
  }: {
    table: string;
    where?: WhereClause;
  }): Promise<void> {
    const { clause: whereClause, values: whereValues } = this.buildWhereClause(where);
    const query = `DELETE FROM ${table}${whereClause};`;
    await this.pool.query(query, whereValues);
  }

  public async count({
    table,
    alias,
    where,
    joins,
  }: Omit<
    SearchParams,
    'select' | 'orderBy' | 'limit' | 'offset' | 'groupBy'
  >): Promise<number> {
    let query: string = '';
    let query_aux: string = '';
    const existingAliases = new Set<string>();

    const mainTableAlias = alias || this.createAlias(table, existingAliases);

    if (alias) {
      existingAliases.add(alias);
    }

    if (joins && joins.length > 0) {
      for (const join of joins) {
        const joinAlias = join.alias || this.createAlias(join.table, existingAliases);

        if (join.alias) {
          existingAliases.add(join.alias);
        }

        const joinType = join.type || 'INNER';

        const joinConditions = Object.keys(join.on)
          .map((key) => {
            const column = !key.includes('.') ? `${mainTableAlias}.${key}` : key;
            return `${column} = ${joinAlias}.${join.on[key]}`;
          })
          .join(' AND ');

        query_aux += ` ${joinType} JOIN ${join.table} AS ${joinAlias} ON ${joinConditions}`;
      }
    }

    query = `SELECT COUNT(*) AS total FROM ${table} AS ${mainTableAlias} ${query_aux}`;

    const { clause: whereClause, values: whereValues } = this.buildWhereClause(
      where,
      undefined,
      mainTableAlias,
    );
    query += whereClause;

    query += ';';

    const result = await this.pool.query(query, whereValues);

    return result.rows[0]?.total ? parseInt(result.rows[0].total, 10) : 0;
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
