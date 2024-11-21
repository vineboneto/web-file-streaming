import process from "node:process";
import { generateExcelFile } from "./excel.js";

generateExcelFile()
	.then(() => {
		process.send({ status: "success" });
	})
	.catch((err) => {
		process.send({ status: "error", error: err.message });
	});
