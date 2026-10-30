import { error } from '@sveltejs/kit';
import { connect, databaseUrl, migrate, type Sql } from './db.ts';

let sql: Sql | null = null;
let ready: Promise<void> | null = null;

/** Connexion partagée par les routes `/api`, schéma créé au premier appel. */
export async function db(): Promise<Sql> {
  const url = databaseUrl();
  if (!url) error(503, 'DATABASE_URL non défini : base PostgreSQL indisponible');
  sql ??= connect(url);
  ready ??= migrate(sql).catch((e) => {
    ready = null;
    throw e;
  });
  try {
    await ready;
  } catch (e) {
    error(503, `Base PostgreSQL injoignable : ${(e as Error).message}`);
  }
  return sql;
}
