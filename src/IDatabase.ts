import pkg from 'pg';

const { Pool, Client } = pkg;

export interface IDataDict {
  [key: string]: any;
}

export type ClientType = InstanceType<typeof Client>;
export type PoolType = InstanceType<typeof Pool>;

export type WhereCondition =
  | any
  | { value: any; mode: 'not' }
  | { lt?: any; lte?: any; gt?: any; gte?: any };

export type WhereField = any | { value: WhereCondition; alias: string };

export type WhereClause = {
  [key: string]: WhereField;
} & {
  OR?: WhereClause;
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
  where?: WhereClause & { OR?: WhereClause };
  orderBy?: { [K in keyof T]?: 'ASC' | 'DESC' };
  select?: SelectFields<T>;
  joins?: JoinParams<any>[];
  limit?: number;
};
