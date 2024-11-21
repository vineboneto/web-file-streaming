import { generateExcelFile } from "./excel.js";
import { parentPort } from "node:worker_threads";

generateExcelFile()
	.then(() => {
		parentPort.postMessage({ status: "success" });
	})
	.catch((err) => {
		parentPort.postMessage({ status: "error", error: err.message });
	});
