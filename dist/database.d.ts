interface IDataDict {
    [key: string]: any;
}
type WhereCondition<T> = T | {
    value: T;
    mode: 'not';
};
type WhereClause<T> = {
    [K in keyof T]?: WhereCondition<T[K]>;
};
type SearchParams<T> = {
    table: string;
    where?: WhereClause<T> & {
        OR?: WhereClause<T>;
    };
    orderBy?: {
        [K in keyof T]?: 'ASC' | 'DESC';
    };
    fields?: string[];
};
declare class Database {
    private user;
    private host;
    private password;
    private port;
    private database;
    private pool;
    constructor(user: string, host: string, password: string, port: number, database: string);
    connectPool(): Promise<void>;
    beginTransaction(): Promise<void>;
    commitTransaction(): Promise<void>;
    rollbackTransaction(): Promise<void>;
    executeMigration(sql: string): Promise<void>;
    createDatabase(): Promise<void>;
    insertIntoTable(tableName: string, dataDict: IDataDict, returningColumn?: string): Promise<number | string>;
    updateIntoTable(tableName: string, dataDict: IDataDict, referenceColumn?: string): Promise<void>;
    findMany<T>({ table, fields, orderBy, where, }: SearchParams<T>): Promise<T[]>;
    searchUniqueByField<T>(table: string, field: string, value: any, fields?: string[] | null): Promise<T | null>;
    deleteFromTable(tableName: string, id: number | string, idColumn?: string): Promise<void>;
    query<T = any>(queryText: string, params?: any[]): Promise<T[]>;
}

export { Database as default };
