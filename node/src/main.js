import Fastify from "fastify";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { pipeline } from "node:stream/promises";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { monitorMemory } from "./memory.js";
import { v7 as uuidv7 } from "uuid";
import { generateExcelFile } from "./excel.js";
import {
	queue,
	runThread,
	runFork,
	queueThread,
	queueFork,
} from "./excel-run.js";

monitorMemory();

const serverFactory = (handler, opts) => {
	const server = http.createServer((req, res) => {
		if (req.url === "/send-file-stream-by-http" && req.method === "POST") {
			const output = path.join("tempfile.xlsx");
			const writeStream = fs.createWriteStream(output);

			const processData = async (chunk) => {
				// console.log("Delay before writing chunk...");
				// // Atraso de 1 segundo (1000ms)
				// await new Promise((resolve) => setTimeout(resolve, 1_000));
				// console.log("Writing chunk:", chunk.length);
				writeStream.write(chunk);
			};

			req.on("data", async (chunk) => {
				await processData(chunk);
			});

			req.on("end", async () => {
				writeStream.end();
				console.log("End");
				res.statusCode = 200;
				res.end("Processado com sucesso");
			});
			return;
		}

		handler(req, res);
	});

	return server;
};

const app = Fastify({
	logger: true,
	requestTimeout: 1_000 * 60 * 60,
	serverFactory,
});

app.register(multipart);

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

/**
 * Recebe o arquivo e escreve de uma vez
 */
app.post("/send-file", async (req, reply) => {
	try {
		const data = await req.file();

		// Caminho onde o arquivo será salvo no servidor
		const filePath = path.join("public", data.filename);

		// Escrevendo o arquivo no disco
		await fs.promises.writeFile(filePath, await data.toBuffer());

		reply.send();
	} catch (err) {
		console.log(err);
		throw err;
	}
});

/**
 * Recebe o arquivo (o arquivo precisar ser recebido inteiro) e escreve em stream
 */
app.post("/send-file-stream-by-formdata", async (req, reply) => {
	try {
		const filePath = path.join("public", "great-size-file.xlsx");
		const writeStream = fs.createWriteStream(filePath);

		for await (const part of req.parts({
			limits: { fileSize: Number.POSITIVE_INFINITY },
		})) {
			if (part.type === "file") {
				await pipeline(part.file, writeStream);
				console.log("Parte de 1MB escrita. Aguardando 1 segundo...");
			}
		}

		// Respondendo com sucesso
		reply.send({ message: "Arquivo recebido e salvo com sucesso!" });
	} catch (err) {
		console.error("Erro ao processar o arquivo:", err);
		reply
			.status(500)
			.send({ error: "Erro ao processar o arquivo", message: err.message });
	}
});

// Canalizador de fluxo
app.addContentTypeParser("*", (request, payload, done) => {
	done();
});
/**
 * Possível de travar o event-loop dependendo do número de requisições
 */
app.post("/send-file-stream-by-fastify", (req, reply) => {
	const output = path.join(`tempfile-${req.id}.xlsx`);
	const writeStream = fs.createWriteStream(output);

	const processData = async (chunk) => {
		console.log("write");
		console.log("Delay before writing chunk...");
		await new Promise((resolve) => setTimeout(resolve, 100));
		console.log("Writing chunk:", chunk.length);
		writeStream.write(chunk);
	};

	req.raw.on("data", async (chunk) => {
		await processData(chunk);
	});

	req.raw.on("end", async () => {
		console.log("End");
		writeStream.end();
		reply.send("Processado com sucesso");
	});
	return;
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
