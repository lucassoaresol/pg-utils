import pkg from 'pg';

const { Pool } = pkg;

export interface IDataDict {
  [key: string]: any;
}

export type PoolType = InstanceType<typeof Pool>;

export type WhereCondition<T> = T | { value: T; mode: 'not' };

export type WhereClause<T> = {
  [K in keyof T]?: WhereCondition<T[K]>;
} & {
  OR?: WhereClause<T>;
};

export type SelectFields<T> = {
  [K in keyof T]?: boolean;
};

export type SearchParams<T> = {
  table: string;
  where?: WhereClause<T> & { OR?: WhereClause<T> };
  orderBy?: { [K in keyof T]?: 'ASC' | 'DESC' };
  select?: SelectFields<T>;
};
