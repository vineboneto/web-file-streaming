import { useEffect, useMemo, useRef, useState } from "react";

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

	return {
		downloads,
		setDownload,
	};
}
