import Fastify from "fastify";
import fs from "node:fs";
import path from "node:path";
import cors from "@fastify/cors";
import { monitorMemory } from "./memory.js";
import { generateExcelFile } from "./excel.js";
import {
	queue,
	runThread,
	runFork,
	queueThread,
	queueFork,
} from "./excel-run.js";

monitorMemory();

const app = Fastify({
	logger: true,
});

app.register(cors, {
	origin: "*",
});

app.get("/", (req, reply) => reply.send("ok"));

app.post("/write-file", async (req, reply) => {
	try {
		// const result = await queueThread.pushAsync(req.id);
		// const result = await runThread();
		// const result = await runFork();
		const result = await queueFork.pushAsync(req.id);

		return reply.send(result);
	} catch (err) {
		console.log(err);
		throw err;
	}
});

app.get("/download", async (req, reply) => {
	console.log(req.id);
	const filePath = path.resolve("great-size-file.xlsx");
	const stats = await fs.promises.stat(filePath);
	const stream = fs.createReadStream(filePath);

	reply.header("Content-Type", "application/octet-stream");
	reply.header("Content-Length", stats.size);
	reply.header("content-disposition", "attachment; filename=test.xlsx");

	return reply.send(stream);
});

app.listen({
	host: "0.0.0.0",
	port: 3333,
});
