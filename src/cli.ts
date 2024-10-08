#!/usr/bin/env node

import { access, appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { Command } from 'commander';

import MigrationCreate from './migrationCreate';

import PgUtils from '.';

const program = new Command();

const migrationsDir = resolve('migrations');
const configFilePath = resolve('pg-utils.json');
const gitignorePath = resolve('.gitignore');

async function loadClientsConfig(): Promise<Map<string, PgUtils>> {
  try {
    const configFileContent = await readFile(configFilePath, 'utf-8');
    const config = JSON.parse(configFileContent);

    const clientsMap = new Map<string, PgUtils>();

    config.forEach((client: any) => {
      const pgUtilsInstance = new PgUtils(
        client.user,
        client.host,
        client.password,
        client.port,
        client.database,
        client.migrationsDir,
      );
      clientsMap.set(client.id, pgUtilsInstance);
    });

    return clientsMap;
  } catch (error: any) {
    console.error('Erro ao carregar as configurações dos clientes:', error.message);
    throw error;
  }
}

async function handleMigration(dbClient: PgUtils, options: any) {
  try {
    if (options.down) {
      if (typeof options.down === 'string') {
        console.log(
          `Revertendo a migração específica: "${options.down}" para o cliente ${dbClient}`,
        );
        await dbClient.applyMigrationByName(options.down, 'down');
      } else {
        console.log('Revertendo a última migração aplicada.');
        await dbClient.revertLastMigration();
      }
    }

    if (options.up) {
      console.log(
        `Aplicando a migração específica: "${options.up}" para o cliente ${dbClient}`,
      );
      await dbClient.applyMigrationByName(options.up, 'up');
    }

    if (!options.create && !options.down && !options.up) {
      console.log('Aplicando todas as migrações pendentes.');
      await dbClient.applyAllMigrations();
    }
  } catch (err) {
    console.error('Erro ao gerenciar as migrações:', err);
  }
}

program
  .command('init')
  .description(
    'Inicializa o projeto criando o diretório de migrações e o arquivo de configuração pg-utils.json, além de adicionar o arquivo de configuração ao .gitignore.',
  )
  .action(async () => {
    try {
      await mkdir(migrationsDir, { recursive: true });
      console.log(`Diretório "${migrationsDir}" criado com sucesso.`);

      const configContent = [
        {
          id: 'development',
          user: 'dev_user',
          host: 'localhost',
          password: 'dev_password',
          port: 5432,
          database: 'dev_database',
          migrationsDir: 'migrations',
        },
        {
          id: 'production',
          user: 'prod_user',
          host: 'prod-db.example.com',
          password: 'prod_password',
          port: 5432,
          database: 'prod_database',
          migrationsDir: 'migrations',
        },
      ];

      try {
        await access(configFilePath);
        console.log(`Arquivo "${configFilePath}" já existe.`);
      } catch {
        await writeFile(
          configFilePath,
          JSON.stringify(configContent, null, 2),
          'utf-8',
        );
        console.log(`Arquivo de configuração "${configFilePath}" criado com sucesso.`);
      }

      try {
        await access(gitignorePath);
        const gitignoreContent = await readFile(gitignorePath, 'utf-8');

        if (!gitignoreContent.includes('pg-utils.json')) {
          await appendFile(gitignorePath, 'pg-utils.json\n');
          console.log(`Arquivo "${configFilePath}" adicionado ao .gitignore.`);
        } else {
          console.log(`"${configFilePath}" já está no .gitignore.`);
        }
      } catch {
        await writeFile(gitignorePath, 'pg-utils.json\n', 'utf-8');
        console.log(`Arquivo ".gitignore" criado com "${configFilePath}".`);
      }
    } catch (error: any) {
      console.error('Erro ao inicializar o projeto:', error.message);
    }
  });

program
  .command('add')
  .description('Adiciona um novo cliente ao arquivo de configuração pg-utils.json')
  .requiredOption('-i, --id <id>', 'ID do cliente')
  .requiredOption('-u, --user <user>', 'Usuário do banco de dados')
  .requiredOption('-h, --host <host>', 'Host do banco de dados')
  .requiredOption('-p, --password <password>', 'Senha do banco de dados')
  .requiredOption('-P, --port <port>', 'Porta do banco de dados', '5432')
  .requiredOption('-d, --database <database>', 'Nome do banco de dados')
  .action(async (options) => {
    const newClientConfig = {
      id: options.id,
      user: options.user,
      host: options.host,
      password: options.password,
      port: parseInt(options.port, 10),
      database: options.database,
      migrationsDir: 'migrations',
    };

    try {
      await access(configFilePath);

      const configFileContent = await readFile(configFilePath, 'utf-8');
      const config = JSON.parse(configFileContent);

      const idExists = config.some((client: any) => client.id === newClientConfig.id);
      if (idExists) {
        console.error(`Erro: O cliente com ID "${newClientConfig.id}" já existe.`);
        process.exit(1);
      }

      config.push(newClientConfig);

      await writeFile(configFilePath, JSON.stringify(config, null, 2), 'utf-8');
      console.log(`Cliente "${newClientConfig.id}" adicionado com sucesso.`);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.error(
          'Erro: O arquivo de configuração "pg-utils.json" não existe. Por favor, execute o comando "init" primeiro.',
        );
      } else {
        console.error('Erro ao adicionar cliente:', error.message);
      }
    }
  });

program
  .command('create')
  .description(
    'Cria o banco de dados para um cliente específico ou para todos os clientes se nenhum ID for fornecido.',
  )
  .option('-i, --id <id>', 'ID do cliente')
  .action(async (options) => {
    try {
      const clients = await loadClientsConfig();

      if (options.id) {
        const dbClient = clients.get(options.id);
        if (dbClient) {
          try {
            await dbClient.createAndConnectDatabase();
            console.log(
              `Banco de dados para o cliente "${options.id}" criado/conectado com sucesso.`,
            );
          } catch (err: any) {
            console.error(
              `Erro ao criar/conectar banco de dados para o cliente "${options.id}":`,
              err.message,
            );
          }
        } else {
          console.error(`Cliente com ID "${options.id}" não encontrado.`);
        }
      } else {
        for (const [id, dbClient] of clients.entries()) {
          try {
            await dbClient.createAndConnectDatabase();
            console.log(
              `Banco de dados para o cliente "${id}" criado/conectado com sucesso.`,
            );
          } catch (err: any) {
            console.error(
              `Erro ao criar/conectar banco de dados para o cliente "${id}":`,
              err.message,
            );
          }
        }
      }
    } catch (err: any) {
      console.error('Erro ao executar comando:', err.message);
    }
  });

program
  .command('migrate')
  .description('Gerencia as migrações do banco de dados')
  .option('-c, --create <name>', 'Cria uma nova migração com o nome fornecido')
  .option('-d, --down <name>', 'Reverte a última migração aplicada')
  .option('-u, --up <name>', 'Aplicar uma migração especifica')
  .option('-i, --id <id>', 'ID do cliente')
  .action(async (options) => {
    if (options.create) {
      const migrate = new MigrationCreate(migrationsDir);
      await migrate.createMigrationFile(options.create);
      console.log(`Migração "${options.create}" criada com sucesso`);
    } else {
      const clients = await loadClientsConfig();

      if (options.id) {
        const dbClient = clients.get(options.id);

        if (!dbClient) {
          console.error(`Cliente com ID "${options.id}" não encontrado.`);
          process.exit(1);
        }

        await handleMigration(dbClient, options);
      } else {
        for (const [id, dbClient] of clients.entries()) {
          console.log(`Aplicando migrações para o cliente: ${id}`);
          await handleMigration(dbClient, options);
        }
      }
    }
    process.exit(0);
  });

program.parse();
