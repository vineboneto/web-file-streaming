import { sql } from "../src/db.js";

await sql`
  create table products (
    id serial primary key,
    name text not null,
    description text,
    price numeric
  );
`;

sql.end();
