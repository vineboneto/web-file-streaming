import axios from "axios";
import fs from "node:fs";
import FormData from "form-data";
import { AxiosError } from "axios";

const api = axios.create({
	baseURL: "http://localhost:3333",
	headers: {
		"Content-Type": "application/json",
	},
});

export async function streamFile() {
	console.time("stream");
	try {
		const response = await api.get("/download", {
			responseType: "stream",
		});

		const writer = fs.createWriteStream("temp/temp.xlsx");

		response.data.pipe(writer);

		writer.on("finish", () => {
			console.log("File downloaded successfully!");
		});

		writer.on("error", (error) => {
			console.error("Error writing file:", error);
		});
	} catch (err) {
		if (err instanceof AxiosError) {
			console.log("err", err.response.data);
		}
	}
	console.timeEnd("stream");
}

export async function writeFileParallel() {
	console.time("write");
	try {
		const promises = Array.from(
			{ length: 5 },
			() => () => api.post("/write-file", {}),
		);
		const responses = await Promise.all(promises.map((p) => p()));
		console.log(responses.map((response) => [response.status, response.data]));
	} catch (err) {
		if (err instanceof AxiosError) {
			console.log("err", err.response.data);
		}
	}
	console.timeEnd("write");
}

export async function writeFile() {
	console.time("write");
	try {
		const response = await api.post("/write-file", {});
		console.log(response.status, response.data);
	} catch (err) {
		if (err instanceof AxiosError) {
			console.log("err", err.response.data);
		}
	}
	console.timeEnd("write");
}

export async function sendFile() {
	console.time("send-file");

	const form = new FormData();

	const filePath = "./great-size-file.xlsx";
	const file = await fs.promises.readFile(filePath);

	form.append("file", file, "great-size-file.xlsx");

	try {
		const response = await api.post("/send-file", form, {
			headers: {
				...form.getHeaders(),
			},
		});

		console.log("Arquivo enviado com sucesso!", response.status, response.data);
	} catch (err) {
		if (err instanceof AxiosError) {
			console.error("Erro ao enviar o arquivo:", err.response?.data);
		}
	}

	console.timeEnd("send-file");
}

export async function sendFileStream() {
	console.time("send-file-stream");

	const form = new FormData();

	// Caminho do arquivo
	const filePath = "./great-size-file.xlsx";

	// Lendo o arquivo como stream
	const fileStream = fs.createReadStream(filePath);

	form.append("file", fileStream, {
		contentType: "binary/octet-stream",
		// knownLength: (await fs.promises.stat(filePath)).size,
		filename: "./great-size-file.xlsx",
	});

	try {
		const response = await axios.post(
			"http://localhost:3333/send-file-stream",
			form,
			{
				headers: {
					...form.getHeaders(),
				},
			},
		);

		console.log("Arquivo enviado com sucesso!", response.status, response.data);
	} catch (err) {
		console.log(err.message);
		console.error("Erro ao enviar o arquivo:", err.response?.data);
	}

	console.timeEnd("send-file-stream");
}

async function main() {
	const [, , command] = process.argv; // Pega o terceiro argumento da linha de comando

	switch (command) {
		case "streamFile":
			await streamFile();
			break;
		case "writeFileParallel":
			await writeFileParallel();
			break;
		case "writeFile":
			await writeFile();
			break;
		case "sendFile":
			await sendFile();
			break;
		case "sendFileStream":
			await sendFileStream();
			break;
		default:
			console.log(
				"Comando inválido. Use 'streamFile', 'writeFileParallel', 'sendFile', 'sendFileStream' ou 'writeFile'.",
			);
			break;
	}
}

// Chama a função principal
main();