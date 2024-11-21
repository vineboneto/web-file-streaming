import axios from "axios";
import fs from "node:fs";
import { AxiosError } from "axios";

console.time();

// const promises = Array.from({ length: 10 }, () => () => {
// 	return axios.get("http://localhost:3333/streaming", {
// 		responseType: "stream",
// 	});
// });
try {
	const response = await axios.get("http://localhost:3333/streaming", {
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

// const responses = await Promise.all(promises.map((v) => v()));

// console.log(responses.map((v) => [v.status, v.data]));

console.timeEnd();
