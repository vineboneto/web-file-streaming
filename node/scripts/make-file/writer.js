// main.js
import { Worker } from "node:worker_threads";
import fs from "node:fs";
import path from "node:path";

await fs.promises.rm("big-great-size-file.xlsx", { force: true });

// Função para monitorar o uso de memória
function formatMemoryUsage(memoryUsage) {
	return {
		rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`,
		heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
		heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
		external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)}MB`,
	};
}

function monitorMemory() {
	const memoryUsage = process.memoryUsage();
	console.log("Memory Usage:", formatMemoryUsage(memoryUsage));
}

// Monitoramento de memória (executando a cada 2 segundos)
setInterval(monitorMemory, 2000);

// Criar e rodar o worker para gerar o arquivo Excel
const worker = new Worker(
	path.join(process.cwd(), "scripts/make-file", "worker.js"),
);

worker.on("message", (msg) => {
	if (msg.status === "success") {
		console.log("Arquivo Excel gerado com sucesso!");
		process.exit(0);
	} else if (msg.status === "error") {
		console.error("Erro ao gerar o arquivo Excel:", msg.error);
		process.exit(1);
	}
});

worker.on("error", (err) => {
	console.error("Erro no worker:", err);
});

worker.on("exit", (code) => {
	if (code !== 0) {
		console.error(`Worker finalizado com código ${code}`);
	}
});
