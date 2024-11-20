import { CardDownload } from "./components/cards/card-download";
import { useDownload } from "./hooks/use-download";

function App() {
	const { downloads, setDownload } = useDownload();

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

	async function onDownloadByAnchor() {
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

	return (
		<main className="flex flex-col justify-center items-center w-screen">
			<h1>Web File Streaming</h1>
			<div className="mt-10 space-x-2">
				<button type="button" onClick={onDownloadDemand}>
					Downloading By FileHandle
				</button>
				<button type="button" onClick={onDownloadByAnchor}>
					Downloading By Anchor
				</button>
				<button type="button">Send File</button>

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
