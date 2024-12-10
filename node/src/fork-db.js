import { sql } from "./db.js";
import process from "node:process";

sql`select pg_sleep(30)`
	.then(() => {
		process.send({ status: "success" });
	})
	.catch((err) => {
		process.send({ status: "error", error: err.message });
	})
	.finally(() => {
		sql.end();
	});
