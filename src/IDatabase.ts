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
  | { value: any; mode: 'ilike' }
  | { lt?: any; lte?: any; gt?: any; gte?: any };

export type WhereClause = {
  [key: string]: WhereCondition;
} & {
  OR?: WhereClause;
};

export type SelectFields = {
  [key: string]: boolean;
};

export type JoinParams = {
  table: string;
  alias?: string;
  on: { [key: string]: string };
  type?: 'INNER' | 'LEFT' | 'RIGHT';
};

export type SearchParams = {
  table: string;
  alias?: string;
  where?: WhereClause & { OR?: WhereClause };
  orderBy?: { [key: string]: 'ASC' | 'DESC' };
  select?: SelectFields;
  joins?: JoinParams[];
  limit?: number;
};
