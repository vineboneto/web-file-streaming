import Fastify from "fastify";
import fs from "node:fs";
import path from 'node:path'
import cors from "@fastify/cors";

const app = Fastify({
	logger: true,
});

app.register(cors, {
	origin: "*",
});

app.get("/", (req, reply) => reply.send("ok"));

app.get("/streaming", async (req, reply) => {
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
