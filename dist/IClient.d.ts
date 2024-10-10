interface IClient {
    id: string;
    user: string;
    host: string;
    password: string;
    port: number;
    database: string;
    migrationsDir: string;
    manageMigrations: boolean;
}

export type { IClient };
