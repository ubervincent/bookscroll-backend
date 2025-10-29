import { DataSource } from 'typeorm';

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

export const dataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgress', 
  database: 'bookscroll',
  entities: [process.env.NODE_ENV === 'development' ? 'src/**/*.entity{.ts,.js}' : 'dist/**/*.entity{.ts,.js}'],
  synchronize: true,
});