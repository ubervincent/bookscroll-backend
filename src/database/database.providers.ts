import { DataSource, DataSourceOptions } from 'typeorm';

export const databaseProviders = [
  {
    provide: 'DATA_SOURCE',
    useFactory: async () => {
      if (!dataSource.isInitialized) {
        await dataSource.initialize();
      }

      return dataSource;
    },
  },
];

export const dataSource = new DataSource(
  process.env.DATABASE_URL ? {
    type: 'postgres',
    entities: [process.env.NODE_ENV === 'development' ? 'src/**/*.entity{.ts,.js}' : 'dist/**/*.entity{.ts,.js}'],
    synchronize: true,
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  } as DataSourceOptions : {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgress', 
    database: process.env.DB_DATABASE || 'bookscroll',
    entities: [process.env.NODE_ENV === 'development' ? 'src/**/*.entity{.ts,.js}' : 'dist/**/*.entity{.ts,.js}'],
    synchronize: true,
  },
);