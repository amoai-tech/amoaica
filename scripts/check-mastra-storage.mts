import assert from "node:assert/strict";
import { storage } from "../src/mastra/storage";

const usesPg = !!(process.env.POSTGRES_URL?.trim() || process.env.DATABASE_URL?.trim());
assert.equal(storage.constructor.name, usesPg ? "PostgresStore" : "LibSQLStore");
assert.equal(storage.id, usesPg ? "amoaica-mastra" : "amoaica-mastra-local");
console.log(usesPg ? "PASS: PostgreSQL backend selected" : "PASS: local-only file storage selected");
