#!/usr/bin/env node

import { access, appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { Command } from 'commander';

import ClientsManager from './clientsManager';
import { generateDbDiagramFile } from './diagramGenerator';
import { IClient } from './IClient';
import MigrationCreate from './migrationCreate';
import MigrationManager from './migrationManager';

const program = new Command();

const migrationsDir = resolve('migrations');
const configFilePath = resolve('pg-utils.json');
const gitignorePath = resolve('.gitignore');

async function handleMigration(dbClient: MigrationManager, options: any) {
  try {
    if (options.down) {
      console.log('Revertendo a última migração aplicada.');
      await dbClient.revertLastMigration();
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

      const configContent: IClient[] = [
        {
          id: 'development',
          user: 'dev_user',
          host: 'localhost',
          password: 'dev_password',
          port: 5432,
          database: 'dev_database',
          migrationsDir: 'migrations',
          manageMigrations: true,
        },
        {
          id: 'production',
          user: 'prod_user',
          host: 'prod-db.example.com',
          password: 'prod_password',
          port: 5432,
          database: 'prod_database',
          migrationsDir: 'migrations',
          manageMigrations: false,
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
  .option('-m, --manageMigrations', 'Ativar gerenciamento de migrações', false)
  .action(async (options) => {
    const newClientConfig = {
      id: options.id,
      user: options.user,
      host: options.host,
      password: options.password,
      port: parseInt(options.port, 10),
      database: options.database,
      migrationsDir: 'migrations',
      manageMigrations: options.manageMigrations || false,
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
      const clientsManager = await ClientsManager.getInstance();

      if (options.id) {
        const dbClient = clientsManager.getClientById(options.id);
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
        const allClients = clientsManager.getClientsWithManageMigrations();
        for (const [id, dbClient] of allClients.entries()) {
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
  .option('-c, --create <name...>', 'Cria uma nova migração com o nome fornecido')
  .option('-d, --down', 'Reverte a última migração aplicada')
  .option('-i, --id <id>', 'ID do cliente')
  .action(async (options) => {
    if (options.create) {
      const name = options.create.join(' ');
      const migrate = new MigrationCreate(migrationsDir);
      await migrate.createMigrationFile(name);
      console.log(`Migração "${name}" criada com sucesso`);
    } else {
      const clientsManager = await ClientsManager.getInstance();

      if (options.id) {
        const dbClient = clientsManager.getClientById(options.id);

        if (!dbClient) {
          console.error(`Cliente com ID "${options.id}" não encontrado.`);
          process.exit(1);
        }

        const migrations = await dbClient.getMigrations();

        if (!migrations) {
          console.log('Gerenciamento de migrações não está ativado para este cliente.');
          process.exit(1);
        }

        await handleMigration(migrations, options);
      } else {
        const allClients = clientsManager.getClientsWithManageMigrations();
        for (const [id, dbClient] of allClients.entries()) {
          console.log(`Aplicando migrações para o cliente: ${id}`);
          const migrations = await dbClient.getMigrations();
          await handleMigration(migrations!, options);
        }
      }
    }
    process.exit(0);
  });

program
  .command('diagram')
  .description(
    'Gera um diagrama do banco de dados com base nas migrações e salva no formato dbdiagram.io',
  )
  .option(
    '-o, --output <file>',
    'Caminho do arquivo de saída do diagrama (padrão: dbdiagram.txt)',
    'dbdiagram.txt',
  )
  .action(async (options) => {
    const outputFile = resolve(options.output);
    options.output || resolve('dbdiagram.txt');
    try {
      await generateDbDiagramFile(migrationsDir, outputFile);
      console.log(`Diagrama gerado com sucesso no arquivo: ${outputFile}`);
    } catch (error: any) {
      console.error('Erro ao gerar o diagrama:', error.message);
    }
  });

program.parse();
