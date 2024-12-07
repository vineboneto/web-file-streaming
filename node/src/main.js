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
import { clear } from "node:console";

// monitorMemory();

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
				writeStream.end(); // se o arquivo não tiver sido escirto completo por causa de algum delay, pode corremper a escrita, pois o write não pode ser chamado após o end
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
	logger: false,
	requestTimeout: 1_000 * 60 * 60,
	serverFactory,
});

app.register(multipart);

app.register(await import("@fastify/static"), {
	root: path.join(process.cwd(), "/public"),
	prefix: "/public/",
});

await app.register(await import("@fastify/websocket"));

app.register(cors, {
	origin: "*",
});

app.get("/", (req, reply) => reply.send("ok"));

const wsactions = {
	/**
	 * Lida com as operações de upload.
	 * @param {import('@fastify/websocket')} socket
	 * @param {{status: "start-upload" | "end-upload" | "upload"; chunk?: number[]}} data
	 * @param {{ fileStream: fs.WriteStream; receivedBytes: number; fileName: string }} fileState
	 */
	handleUpload: (socket, { status, chunk }, fileState) => {
		try {
			if (status === "start-upload") {
				const fileName = `uploaded-file-${Date.now()}.xlsx`;
				fileState.fileStream = fs.createWriteStream(path.join(fileName));
				console.log(`Iniciando o upload do arquivo: ${fileName}`);
				fileState.fileName = fileName;
			} else if (status === "upload") {
				// // Escreve o pedaço do arquivo no fluxo
				fileState.fileStream.write(Buffer.from(chunk));
				fileState.receivedBytes += chunk.length;
				// console.log(`Recebido ${fileState.receivedBytes} bytes`);
			} else if (status === "end-upload") {
				// // Finaliza o arquivo quando o upload é concluído
				fileState.fileStream.end(); // Finaliza o arquivo
				socket.send(
					JSON.stringify({
						channel: "upload-file",
						data: {
							status: "completed",
							fileName: fileState.fileName,
						},
					}),
				);
				fileState.fileName = "";
				fileState.fileStream = null;
				fileState.receivedBytes = 0;
			}
		} catch (err) {
			fileState.fileName = "";
			fileState.fileStream = null;
			fileState.receivedBytes = 0;
			throw err;
		}
	},
};

const PING_INTERVAL = 10_000;

const ACTIVE_CONN = {};

app.get("/ws", { websocket: true }, (socket, req) => {
	const clientIp = req.ip; // Obtém o IP do cliente (isso pode variar dependendo do seu setup)

	// Verifica se já existe uma conexão ativa para esse IP
	if (ACTIVE_CONN[clientIp]) {
		console.log(`Já existe uma conexão ativa para o IP: ${clientIp}`);
		ACTIVE_CONN[clientIp].socket.close();
		console.log("Substituindo conexão");
		ACTIVE_CONN[clientIp].socket = socket;
	} else {
		ACTIVE_CONN[clientIp] = {
			socket,
		};
	}

	console.log("Conexão estabelecida");

	const fileState = {
		fileStream: null,
		fileName: "",
		receivedBytes: 0,
	};

	let isAlive = true;

	socket.on("message", (data) => {
		isAlive = true;
		try {
			/**
			 * Faz o parsing de uma mensagem recebida.
			 *
			 * @param {string} data - A string JSON recebida que será analisada.
			 * @return {{ data: unknown; channel: "upload-file"; } | null}
			 */
			function parseMessage(data) {
				try {
					return JSON.parse(data);
				} catch {
					return null;
				}
			}

			const message = parseMessage(data);
			if (!message) return;

			switch (message.channel) {
				case "upload-file":
					wsactions.handleUpload(
						socket,
						{ ...message.data, chunk: message.data.chunk || 0 },
						fileState,
					);
					break;
				default:
					console.error("Canal desconhecido:", message.channel);
					socket.close();
			}
		} catch (err) {
			socket.close();
			console.error("Erro ao processar mensagem:", err);
		}
	});

	const pingInterval = setInterval(() => {
		if (!isAlive) {
			console.log("Conexão perdida com o cliente");
			clearInterval(pingInterval);
			socket.terminate();
			return;
		}

		isAlive = false;
		socket.ping();
	}, PING_INTERVAL);

	socket.on("pong", () => {
		// console.log("pong");
		isAlive = true;
	});

	socket.on("close", () => {
		console.log("Conexão WebSocket fechada");
		clearInterval(pingInterval);
	});

	socket.on("error", (err) => {
		console.error("Erro WebSocket:", err);
		clearInterval(pingInterval);
	});
});

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
	console.log("aqui");
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
app.addContentTypeParser(
	"application/octet-stream",
	(request, payload, done) => {
		done();
	},
);
/**
 * Possível de travar o event-loop dependendo do número de requisições
 */
app.post("/send-file-stream-by-fastify", async (req, reply) => {
	const output = path.join(`tempfile-${req.id}.xlsx`);
	const writeStream = fs.createWriteStream(output);

	await pipeline(req.raw, writeStream);

	return reply.send("Arquivo Processado com sucesso");
});

app.post("/json", async (req, reply) => {
	reply.send(req.body);
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

const port = process.env.PORT || 3333;

app.listen({
	host: "0.0.0.0",
	port,
});
