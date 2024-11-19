import { useEffect, useMemo, useRef, useState } from "react";

function CardDownload({
	children,
	status,
}: { children: React.ReactNode; status: "completed" | "pendent" }) {
	return (
		<div
			className={`
				flex space-x-2 max-w-lg w-full justify-center items-center py-2 px-3 font-semibold rounded-md
				${status === "pendent" ? "bg-[#646cff]" : "bg-green-500"}
			`}
		>
			{children}
		</div>
	);
}

type DownloadValue = {
	total: number;
	progress: number;
	percentual: number;
	addedAt: number;
};

type Download = Record<string, DownloadValue>;

const REMOVE_DELAY = 10_000; // Tempo para remover (10 segundos)

function App() {
	const [download, setDownload] = useState<Download>({});
	const intervalRef = useRef<number | null>(null);
	const downloads = useMemo(() => {
		return Object.entries(download).map(([key, value]) => ({
			...value,
			name: key,
		}));
	}, [download]);

	async function onDownloadDemand() {
		try {
			const response = await fetch("http://localhost:3333/streaming", {
				method: "GET",
			});

			if (!response.ok || !response.body) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

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

	useEffect(() => {
		if (!intervalRef.current) {
			intervalRef.current = setInterval(() => {
				setDownload((old) => {
					const now = Date.now();
					// Filtra os downloads que ainda não completaram o tempo
					const updated = Object.fromEntries(
						Object.entries(old).filter(
							([, v]) =>
								!(v.percentual === 1 && now - v.addedAt >= REMOVE_DELAY),
						),
					);

					return updated;
				});
			}, 1_000);
		}

		// Limpa o intervalo ao desmontar o componente
		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, []);

	return (
		<main className="flex flex-col justify-center items-center w-screen">
			<h1>Web File Streaming</h1>
			<div className="mt-10 space-x-2">
				<button type="button" onClick={onDownloadDemand}>
					Downloading Streaming
				</button>
				<button type="button">Send Streaming</button>

				<div className="absolute bottom-20 left-0 right-0 z-10">
					<div className="w-full max-h-32 pt-16 overflow-auto flex flex-col space-y-2 justify-center items-center">
						{downloads.map((v) => {
							return (
								<CardDownload
									key={v.name}
									status={v.percentual === 1 ? "completed" : "pendent"}
								>
									<span className="truncate">{v.name}</span>
									<div>
										<span>
											{v.percentual.toLocaleString("pt-BR", {
												style: "percent",
												minimumFractionDigits: 2,
											})}
											/100,00%
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
