import { useRef } from "react";
import { CardDownload } from "./components/cards/card-download";
import { useDownload } from "./hooks/use-download";
import axios from "axios";
import { BASE_URL } from "./constants";

type WebSocketChannelRequest = "upload-file";

const url = `ws://${BASE_URL.replace("http://", "")}/ws`;

let ws: WebSocket | null = null;

let isOpen = false;

const socket = {
	connect: () => {
		if (isOpen) return;
		isOpen = true;
		ws = new WebSocket(url);

		console.log(ws.readyState);

		if (ws && ws.readyState === WebSocket.OPEN) {
			console.log("A conexão WebSocket já está aberta.");
			return ws; // Retorna a conexão existente
		}

		ws.onopen = () => {
			console.log("Conexão WebSocket aberta.");
		};

		ws.onmessage = (en) => {
			console.log({ data: en.data });
		};

		ws.onclose = () => {
			console.log("Conexão WebSocket fechada");
		};

		ws.onerror = (err) => {
			console.error("Erro WebSocket:", err);
			ws?.close();
		};

		return ws;
	},
	send: <T = unknown>({
		channel,
		data,
	}: { channel: WebSocketChannelRequest; data: T }) => {
		let attempt = 0; // Contador de tentativas
		const maxAttempts = 3; // Número máximo de tentativas

		const trySend = () => {
			if (ws && ws.readyState === WebSocket.OPEN) {
				ws.send(JSON.stringify({ channel, data }));
				console.log("Mensagem enviada com sucesso.");
			} else {
				if (attempt < maxAttempts) {
					attempt++; // Incrementa a tentativa
					console.log(
						`Tentativa ${attempt} de ${maxAttempts} falhou. Tentando novamente...`,
					);
					socket.connect(); // Tenta reconectar
					setTimeout(() => {
						trySend(); // Tenta enviar novamente após 1 segundo
					}, 1_000);
				} else {
					console.log(
						"WebSocket não está aberto. Máximo de tentativas atingido.",
					);
				}
			}
		};

		trySend(); // Chama a função de envio
	},
};

const sendFile = async (file: File) => {
	return new Promise((resolve, reject) => {
		const chunkSize = 1024 * 64; // 64 KB
		let offset = 0;

		// Função para enviar o próximo chunk
		const sendNextChunk = () => {
			const chunk = file.slice(offset, offset + chunkSize);
			const reader = new FileReader();

			reader.onload = () => {
				const arrayBuffer = reader.result as ArrayBuffer;

				// Envia o chunk do arquivo
				socket.send({
					channel: "upload-file",
					data: {
						status: "upload",
						chunk: Array.from(new Uint8Array(arrayBuffer)), // Converte o chunk para array
					},
				});

				offset += chunkSize;

				if (offset < file.size) {
					sendNextChunk(); // Continua enviando os chunks
				} else {
					console.log("Arquivo enviado completamente!");
					// Envia o sinal de fim de upload
					socket.send({
						channel: "upload-file",
						data: { status: "end-upload" },
					});

					// Resolva a Promise ao terminar o upload
					reader.abort(); // Aborta a leitura do arquivo, se necessário
					resolve(null);
				}
			};

			reader.onerror = (err) => {
				reject(err);
				reader.abort(); // Caso ocorra erro, aborta a leitura
			};

			reader.readAsArrayBuffer(chunk); // Lê o chunk como ArrayBuffer
		};

		sendNextChunk(); // Começa o envio dos chunks
	});
};

socket.connect();

function App() {
	const { downloads, byAxios } = useDownload();
	const download = byAxios();
	const fileRefFormData = useRef<HTMLInputElement | null>(null);
	const fileRefWebSocket = useRef<HTMLInputElement | null>(null);

	async function sendByAxios(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];
		if (!file) return;

		const formData = new FormData();
		formData.append("file", file);

		try {
			const response = await axios.post(
				`${BASE_URL}/send-file-stream-by-formdata`,
				formData,
			);
			console.log("Resposta do servidor:", response.data);
		} catch (error) {
			console.error("Erro ao enviar o arquivo:", error);
		}
	}

	function openFileExplorer(
		ref: React.MutableRefObject<HTMLInputElement | null>,
	) {
		if (ref.current) {
			console.log("click");
			console.log(ref.current.id);
			ref.current.click();
		}
	}

	async function sendByWebsocket(event: React.ChangeEvent<HTMLInputElement>) {
		try {
			console.log("Send Socket");
			const file = event.target.files?.[0];
			if (!file) return;

			// Envia o sinal de início do upload
			socket.send({
				channel: "upload-file",
				data: { status: "start-upload" },
			});

			await sendFile(file);
			console.log("Finalizado");
		} finally {
			if (fileRefWebSocket.current) fileRefWebSocket.current.value = "";
		}
	}

	return (
		<main className="flex flex-col justify-center items-center w-screen">
			<h1>Web File Streaming</h1>
			<div className="mt-10 space-x-2">
				<button type="button" onClick={download.fileHandler}>
					Downloading By FileHandle
				</button>
				<button type="button" onClick={download.anchor}>
					Downloading By Anchor
				</button>
				<button type="button" onClick={download.staticFile}>
					Downloading Static File
				</button>
				<button type="button" onClick={() => openFileExplorer(fileRefFormData)}>
					Send File By Form Data
				</button>
				<button
					type="button"
					onClick={() => openFileExplorer(fileRefWebSocket)}
				>
					Send File By Streaming
				</button>
				<input
					type="file"
					accept=".xls,.xlsx"
					id="formdata"
					ref={fileRefFormData}
					style={{ display: "none" }}
					onChange={(e) => sendByAxios(e)}
				/>
				<input
					type="file"
					accept=".xls,.xlsx"
					id="streaming"
					ref={fileRefWebSocket}
					style={{ display: "none" }}
					onChange={(e) => sendByWebsocket(e)}
				/>

				<div className="absolute bottom-20 left-0 right-0 z-10">
					<div className="w-full pt-16 overflow-auto flex flex-col space-y-2 justify-center items-center">
						{downloads.map((v) => {
							return (
								<CardDownload
									key={v.name}
									isRemoving={v.isRemoving}
									status={v.percentual === 1 ? "completed" : "pendent"}
								>
									<span className="truncate">{v.name}</span>
									<div>
										<span className="font-bold">
											{v.percentual.toLocaleString("pt-BR", {
												style: "percent",
												minimumFractionDigits: 2,
											})}
										</span>
									</div>
								</CardDownload>
							);
						})}
					</div>
				</div>
			</div>
		</main>
	);
}

export default App;
