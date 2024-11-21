import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";

const REMOVE_DELAY = 10_000;
const ANIMATION_DELAY = 600;

export type DownloadValue = {
	total: number;
	progress: number;
	percentual: number;
	addedAt: number;
	isRemoving?: boolean;
};

export type Download = Record<string, DownloadValue>;

export function useDownload() {
	const [download, setDownload] = useState<Download>({});
	const intervalRef = useRef<number | null>(null);
	const timeoutRefs = useRef<Map<string, number>>(new Map());
	const downloads = useMemo(() => {
		return Object.entries(download).map(([key, value]) => ({
			...value,
			name: key,
		}));
	}, [download]);

	useEffect(() => {
		if (!intervalRef.current) {
			intervalRef.current = setInterval(() => {
				let removed = false;

				setDownload((old) => {
					const now = Date.now();

					const updated = Object.fromEntries(
						Object.entries(old).map(([key, v]) => {
							if (v.percentual === 1 && now - v.addedAt >= REMOVE_DELAY) {
								removed = true;
								// Adiciona um temporizador para remoção após a animação
								if (!timeoutRefs.current.has(key)) {
									const timeoutId = window.setTimeout(() => {
										// Remove o item após o tempo de animação
										setDownload((current) => {
											const filtered = Object.fromEntries(
												Object.entries(current).filter(([k]) => k !== key),
											);
											return filtered;
										});
										timeoutRefs.current.delete(key);
									}, ANIMATION_DELAY);

									timeoutRefs.current.set(key, timeoutId);
								}
								return [key, { ...v, isRemoving: true }];
							}
							return [key, v];
						}),
					);

					if (!removed) return old;

					return updated;
				});
			}, 1_000);
		}

		// Limpa o intervalo e temporizadores ao desmontar o componente
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}

			for (const [_, id] of timeoutRefs.current) {
				clearTimeout(id);
			}
			timeoutRefs.current.clear();
		};
	}, []);

	function byFetch() {
		async function fileHandler() {
			try {
				const fileHandle = await window.showSaveFilePicker({
					suggestedName: "great-size-file.xlsx",
					types: [
						{
							description: "Excel Files",
							accept: {
								"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
									[".xlsx"],
							},
						},
					],
				});
				const writable = await fileHandle.createWritable();

				const response = await fetch("http://localhost:3333/streaming", {
					method: "GET",
				});

				if (!response.ok || !response.body) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const reader = response.body.getReader();
				const totalBytes = Number.parseInt(
					response.headers.get("Content-Length") ?? "0",
					10,
				);

				setDownload((old) => ({
					...old,
					[fileHandle.name]: {
						total: totalBytes,
						progress: 0,
						percentual: 0,
						addedAt: Date.now(),
					},
				}));
				while (true) {
					const { done, value } = await reader.read();

					if (done) {
						break;
					}

					setDownload((old) => {
						const current = old[fileHandle.name];
						const progress = value.length + current.progress;
						const percentual =
							current.total === 0 ? 0 : (progress * 100) / current.total / 100;
						return {
							...old,
							[fileHandle.name]: {
								...current,
								progress,
								percentual,
							},
						};
					});

					await writable.write(value);
				}

				await writable.close();
				console.log("Arquivo salvo com sucesso!");
			} catch (error) {
				console.error("Erro ao fazer o download:", error);
			}
		}

		async function anchor() {
			try {
				const response = await fetch("http://localhost:3333/streaming");

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}

				const blob = await response.blob();

				const url = window.URL.createObjectURL(blob);

				const a = document.createElement("a");
				a.href = url;
				a.download = "great-size-file.xlsx";
				document.body.appendChild(a);

				a.click();

				document.body.removeChild(a);
				window.URL.revokeObjectURL(url);

				console.log("Download iniciado com sucesso!");
			} catch (error) {
				console.error("Erro ao fazer o download:", error);
			}
		}

		return {
			fileHandler,
			anchor,
		};
	}

	function byAxios() {
		async function fileHandler() {
			try {
				const fileHandle = await window.showSaveFilePicker({
					suggestedName: "great-size-file.xlsx",
					types: [
						{
							description: "Excel Files",
							accept: {
								"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
									[".xlsx"],
							},
						},
					],
				});
				const writable = await fileHandle.createWritable();

				const response = await axios.get<ReadableStream>(
					"http://localhost:3333/streaming",
					{
						headers: {
							Accept: "text/event-stream",
						},
						responseType: "stream",
						adapter: "fetch",
					},
				);

				const stream = response.data;

				const reader = stream.getReader();
				const totalBytes = Number.parseInt(
					response.headers["content-length"] ?? "0",
					10,
				);

				setDownload((old) => ({
					...old,
					[fileHandle.name]: {
						total: totalBytes,
						progress: 0,
						percentual: 0,
						addedAt: Date.now(),
					},
				}));

				while (true) {
					const { done, value } = await reader.read();

					console.log({ done, value: value?.length });

					if (done) {
						break;
					}

					setDownload((old) => {
						const current = old[fileHandle.name];
						const progress = value.length + current.progress;
						const percentual =
							current.total === 0 ? 0 : (progress * 100) / current.total / 100;
						return {
							...old,
							[fileHandle.name]: {
								...current,
								progress,
								percentual,
							},
						};
					});

					await writable.write(value);
				}

				await writable.close();

				console.log("Arquivo salvo com sucesso!");
			} catch (error) {
				console.error("Erro ao fazer o download:", error);
			}
		}

		async function anchor() {
			try {
				const response = await axios.get("http://localhost:3333/streaming", {
					responseType: "blob", // Configura para tratar a resposta como um blob
				});

				// Criar URL a partir do Blob recebido
				const url = window.URL.createObjectURL(response.data);

				// Criar elemento <a> para disparar o download
				const a = document.createElement("a");
				a.href = url;
				a.download = "great-size-file.xlsx"; // Nome do arquivo para o usuário
				document.body.appendChild(a);

				// Simular clique para iniciar o download
				a.click();

				// Limpar o elemento <a> e liberar o URL criado
				document.body.removeChild(a);
				window.URL.revokeObjectURL(url);

				console.log("Download iniciado com sucesso!");
			} catch (error) {
				console.error("Erro ao fazer o download:", error);
			}
		}

		return {
			fileHandler,
			anchor,
		};
	}

	return {
		downloads,
		byFetch,
		byAxios,
	};
}
