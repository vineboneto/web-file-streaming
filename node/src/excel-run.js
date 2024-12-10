import async from "async";
import { Worker } from "node:worker_threads";
import { fork } from "node:child_process";
import { generateExcelFile } from "./excel.js";

export const queue = async.queue(async (task) => {
	await generateExcelFile();
	return task;
}, 5);

export const queueThread = async.queue(async (task) => {
	const result = await runThread();
	return { task, result };
}, 5);

export const queueFork = async.queue(async (task) => {
	const result = await runFork();
	return { task, result };
}, 5);

export const queueForkDB = async.queue(async (task) => {
	const result = await runForkDB();
	return { task, result };
}, 5);

export const queueThreadDB = async.queue(async (task) => {
	const result = await runThreadDB();
	return { task, result };
}, 5);

export function runThread() {
	return new Promise((resolve, reject) => {
		const worker = new Worker("./src/excel-thread.js");

		worker.on("message", (msg) => {
			if (msg.status === "success") {
				resolve("Arquivo Excel gerado com sucesso!");
			} else if (msg.status === "error") {
				reject(new Error(`Erro ao gerar o arquivo Excel: ${msg.error}`));
			}
		});

		worker.on("error", (err) => {
			reject(new Error(`Erro no worker: ${err.message}`));
		});

		worker.on("exit", (code) => {
			if (code !== 0) {
				reject(new Error(`Worker finalizado com código ${code}`));
			}
		});
	});
}

export function runFork() {
	return new Promise((resolve, reject) => {
		// Cria o processo filho que executará o arquivo `excel-thread.js`
		const child = fork("./src/excel-fork.js");

		// Escuta a mensagem do processo filho
		child.on("message", (msg) => {
			if (msg.status === "success") {
				resolve("Arquivo Excel gerado com sucesso!");
			} else if (msg.status === "error") {
				reject(new Error(`Erro ao gerar o arquivo Excel: ${msg.error}`));
			}
		});

		// Escuta erros no processo filho
		child.on("error", (err) => {
			reject(new Error(`Erro no processo filho: ${err.message}`));
		});

		// Escuta quando o processo filho terminar
		child.on("exit", (code) => {
			if (code !== 0) {
				reject(new Error(`Processo filho finalizado com código ${code}`));
			}
		});
	});
}

export function runThreadDB() {
	return new Promise((resolve, reject) => {
		const worker = new Worker("./src/thread-db.js");

		worker.on("message", (msg) => {
			if (msg.status === "success") {
				resolve("Arquivo Excel gerado com sucesso!");
			} else if (msg.status === "error") {
				reject(new Error(`Erro ao gerar o arquivo Excel: ${msg.error}`));
			}
		});

		worker.on("error", (err) => {
			reject(new Error(`Erro no worker: ${err.message}`));
		});

		worker.on("exit", (code) => {
			if (code !== 0) {
				reject(new Error(`Worker finalizado com código ${code}`));
			}
		});
	});
}

export function runForkDB() {
	return new Promise((resolve, reject) => {
		const child = fork("./src/fork-db.js");

		child.on("message", (msg) => {
			if (msg.status === "success") {
				resolve("Arquivo Excel gerado com sucesso!");
			} else if (msg.status === "error") {
				reject(new Error(`Erro ao gerar o arquivo Excel: ${msg.error}`));
			}
		});

		child.on("error", (err) => {
			reject(new Error(`Erro no processo filho: ${err.message}`));
		});

		child.on("exit", (code) => {
			if (code !== 0) {
				reject(new Error(`Processo filho finalizado com código ${code}`));
			}
		});
	});
}
