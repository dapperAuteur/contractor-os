// File: lib/db/schema/index.ts
// Everything the Drizzle client and drizzle-kit see. Tables and views in schema.ts, relations (for
// db.query.*) in relations.ts. See schema.ts's header for how both were made and the porting notes.
export * from './schema';
export * from './relations';
