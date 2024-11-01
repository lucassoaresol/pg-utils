import pkg from 'pg';

const { Pool, Client } = pkg;

export interface IDataDict {
  [key: string]: any;
}

export type ClientType = InstanceType<typeof Client>;
export type PoolType = InstanceType<typeof Pool>;

export type WhereCondition<T> =
  | T
  | { value: T; mode: 'not' }
  | { lt?: T; lte?: T; gt?: T; gte?: T };

export type WhereClause<T> = {
  [K in keyof T]?: WhereCondition<T[K]>;
} & {
  OR?: WhereClause<T>;
};

export type SelectFields<T> = {
  [K in keyof T]?: boolean;
};

export type JoinParams<T> = {
  table: string;
  on: { [key: string]: string };
  type?: 'INNER' | 'LEFT' | 'RIGHT';
  select?: SelectFields<T>;
};

export type SearchParams<T> = {
  table: string;
  where?: WhereClause<T> & { OR?: WhereClause<T> };
  orderBy?: { [K in keyof T]?: 'ASC' | 'DESC' };
  select?: SelectFields<T>;
  joins?: JoinParams<any>[];
  limit?: number;
};
