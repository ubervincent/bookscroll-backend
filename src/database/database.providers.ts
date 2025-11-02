import { DataSource, DataSourceOptions } from 'typeorm';
import { Book } from '../book/entities/book.entity';
import { Snippet } from '../book/entities/snippet.entity';
import { Theme } from '../book/entities/theme.entity';

let dataSource: DataSource | null = null;

export const databaseProviders = [
  {
    provide: 'DATA_SOURCE',
    useFactory: async () => {
      // Create DataSource here, not at module load time
      if (!dataSource) {
        
        const entities = [Book, Snippet, Theme];
        
        dataSource = new DataSource(
          process.env.DATABASE_URL ? {
            type: 'postgres',
            entities: entities,
            synchronize: true,
            url: process.env.DATABASE_URL,
            ssl: false,
          } as DataSourceOptions : {
            type: 'postgres',
            host: process.env.DB_HOST || 'localhost',
            port: 5432,
            username: process.env.DB_USERNAME || 'postgres',
            password: process.env.DB_PASSWORD || 'postgress',
            database: process.env.DB_DATABASE || 'bookscroll',
            entities: entities,
            synchronize: true,
          }
        );
      }
      
      if (!dataSource.isInitialized) {
        await dataSource.initialize();

        try {
          await dataSource.query('CREATE EXTENSION IF NOT EXISTS vector');
        } catch (error: any) {
          console.warn('Could not enable pgvector extension:', error.message);
        }
      }

      return dataSource;
    },
  },
];