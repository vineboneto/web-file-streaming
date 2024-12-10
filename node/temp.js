import { sql } from "./src/db.js";

async function query1() {
	await sql`select pg_sleep(30)`;
	console.log("finish query 1");
	await sql.end();
}

async function query2() {
	await sql`select pg_sleep(60)`;
	console.log("finish query 2");
}

await query1();

await query2();

sql.end();
