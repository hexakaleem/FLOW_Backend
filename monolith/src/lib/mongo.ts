import mongoose from 'mongoose';
import { config } from '../config';

function buildDatabaseUri(baseUri: string, databaseName: string): string {
  const url = new URL(baseUri);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

export const authDb = mongoose.createConnection(
  buildDatabaseUri(config.mongo.uri, 'flow_auth'),
  config.mongo.options,
);

export const usersDb = mongoose.createConnection(
  buildDatabaseUri(config.mongo.uri, 'flow_users'),
  config.mongo.options,
);

export const fleetDb = mongoose.createConnection(
  buildDatabaseUri(config.mongo.uri, 'flow_fleet'),
  config.mongo.options,
);

export const loadsDb = mongoose.createConnection(
  buildDatabaseUri(config.mongo.uri, 'flow_loads'),
  config.mongo.options,
);

export const docsDb = mongoose.createConnection(
  buildDatabaseUri(config.mongo.uri, 'flow_documents'),
  config.mongo.options,
);

export async function connectDatabases(): Promise<void> {
  const connections = [
    { conn: authDb, name: 'flow_auth' },
    { conn: usersDb, name: 'flow_users' },
    { conn: fleetDb, name: 'flow_fleet' },
    { conn: loadsDb, name: 'flow_loads' },
    { conn: docsDb, name: 'flow_documents' },
  ];

  for (const { conn, name } of connections) {
    conn.on('error', (error) => {
      console.error(`[MONGO] ${name} connection error:`, error.message);
    });
    conn.on('disconnected', () => {
      console.warn(`[MONGO] ${name} disconnected`);
    });
  }

  // Use asPromise() which handles both already-connected and pending states
  await Promise.all(
    connections.map(async ({ conn, name }) => {
      try {
        await conn.asPromise();
        console.log(`[MONGO] ${name} connected`);
      } catch (error: any) {
        console.error(`[MONGO] ${name} failed:`, error?.message || error);
        throw error;
      }
    }),
  );

  console.log('[MONGO] All 5 database connections established');
}
