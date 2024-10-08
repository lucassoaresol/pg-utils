import PgUtils from './pgUtils.js';
import './database.js';

declare class ClientsManager {
    private static instance;
    private clientsMap;
    private configFilePath;
    private constructor();
    static getInstance(): Promise<ClientsManager>;
    private loadClientsConfig;
    getClientById(id: string): PgUtils | undefined;
    getAllClients(): Map<string, PgUtils>;
}

export { ClientsManager as default };
