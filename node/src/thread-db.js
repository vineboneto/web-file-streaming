import { sql } from "./db.js";
import { parentPort } from "node:worker_threads";

sql`select pg_sleep(30)`
	.then(() => {
		parentPort.postMessage({ status: "success" });
	})
	.catch((err) => {
		parentPort.postMessage({ status: "error", error: err.message });
	})
	.finally(() => {
		sql.end();
	});
