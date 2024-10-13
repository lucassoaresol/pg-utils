import pkg from 'pg';

declare const Pool: typeof pkg.Pool;
interface IDataDict {
    [key: string]: any;
}
type PoolType = InstanceType<typeof Pool>;
type WhereCondition<T> = T | {
    value: T;
    mode: 'not';
};
type WhereClause<T> = {
    [K in keyof T]?: WhereCondition<T[K]>;
} & {
    OR?: WhereClause<T>;
};
type SelectFields<T> = {
    [K in keyof T]?: boolean;
};
type SearchParams<T> = {
    table: string;
    where?: WhereClause<T> & {
        OR?: WhereClause<T>;
    };
    orderBy?: {
        [K in keyof T]?: 'ASC' | 'DESC';
    };
    select?: SelectFields<T>;
};

export type { IDataDict, PoolType, SearchParams, SelectFields, WhereClause, WhereCondition };
