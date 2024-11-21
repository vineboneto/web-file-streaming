import { CardDownload } from "./components/cards/card-download";
import { useDownload } from "./hooks/use-download";

function App() {
	const { downloads, byAxios } = useDownload();

	const download = byAxios();

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
