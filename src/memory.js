import process from "node:process";

function formatMemoryUsage(memoryUsage) {
	return {
		rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`,
		heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
		heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
		external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)}MB`,
	};
}

function printMonitorMemory() {
	const memoryUsage = process.memoryUsage();
	console.log("Memory Usage:", formatMemoryUsage(memoryUsage));
}

export function monitorMemory() {
	setInterval(printMonitorMemory, 2_000);
}
