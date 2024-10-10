import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { IClient } from './IClient';
import PgUtils from './pgUtils';

class ClientsManager {
  private static instance: ClientsManager;
  private clientsMap: Map<string, PgUtils> = new Map();
  private configFilePath = resolve('pg-utils.json');

  private constructor() {}

  public static async getInstance(): Promise<ClientsManager> {
    if (!ClientsManager.instance) {
      ClientsManager.instance = new ClientsManager();
      await ClientsManager.instance.loadClientsConfig();
    }
    return ClientsManager.instance;
  }

  private async loadClientsConfig(): Promise<void> {
    try {
      const configFileContent = await readFile(this.configFilePath, 'utf-8');
      const config = JSON.parse(configFileContent);

      config.forEach((client: IClient) => {
        const pgUtilsInstance = new PgUtils(
          client.user,
          client.host,
          client.password,
          client.port,
          client.database,
          client.migrationsDir,
          client.manageMigrations,
        );
        this.clientsMap.set(client.id, pgUtilsInstance);
      });
    } catch (error: any) {
      console.error('Erro ao carregar as configurações dos clientes:', error.message);
      throw error;
    }
  }

  public getClientById(id: string): PgUtils | undefined {
    return this.clientsMap.get(id);
  }

  public getAllClients(): Map<string, PgUtils> {
    return this.clientsMap;
  }

  public getClientsWithManageMigrations(): Map<string, PgUtils> {
    const clientsWithMigrations = new Map<string, PgUtils>();

    this.clientsMap.forEach((client, id) => {
      if (client.getManageMigrations()) {
        clientsWithMigrations.set(id, client);
      }
    });

    return clientsWithMigrations;
  }
}

export default ClientsManager;
