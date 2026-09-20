export interface PingLoop {
	stop: () => void;
}

interface PingLoopOptions {
	host: string;
	count?: number;
	isRunning: () => boolean;
	nextSequence: () => number;
	currentIp: () => string | null;
	onIp: (ip: string) => void;
	onRtt: (rtt: number) => void;
	onLine: (line: string) => void;
	onComplete: () => void;
}

export const startPingLoop = ({
	host,
	count,
	isRunning,
	nextSequence,
	currentIp,
	onIp,
	onRtt,
	onLine,
	onComplete,
}: PingLoopOptions): PingLoop => {
	let timer: ReturnType<typeof setTimeout> | null = null;
	let controller: AbortController | null = null;
	let stopped = false;

	const stop = () => {
		stopped = true;
		if (timer) clearTimeout(timer);
		controller?.abort();
	};

	const scheduleNext = (ping: () => void) => {
		if (!stopped && isRunning()) timer = setTimeout(ping, 1000);
	};

	const ping = async () => {
		if (stopped || !isRunning()) return;

		const sequence = nextSequence();
		controller = new AbortController();
		const requestController = controller;

		try {
			const start = performance.now();
			const response = await fetch(
				`/api/ping?host=${encodeURIComponent(host)}`,
				{
					signal: requestController.signal,
					headers: { "Content-Type": "application/json" },
				},
			);
			if (stopped || requestController.signal.aborted) return;

			if (!response.ok) {
				throw new Error(
					response.status === 404
						? "Ping service unavailable"
						: `HTTP ${response.status}`,
				);
			}

			const data = await response.json();
			if (stopped || requestController.signal.aborted) return;
			if (data.error) throw new Error(data.error);

			const time = data.time
				? data.time.toFixed(1)
				: (performance.now() - start).toFixed(1);
			let ip = currentIp();
			if (data.ip && data.ip !== "unknown" && data.ip !== ip) {
				onIp(data.ip);
				ip = data.ip;
			}

			onRtt(parseFloat(time));
			onLine(
				`64 bytes from ${host} (${ip || "unknown"}): icmp_seq=${sequence} ttl=${data.ttl || 64} time=${time} ms`,
			);

			if (count && sequence >= count) {
				onComplete();
				return;
			}
			scheduleNext(ping);
		} catch (error: unknown) {
			if (stopped || requestController.signal.aborted) return;

			const message = error instanceof Error ? error.message : "";
			if (message.includes("DNS") || message.includes("ENOTFOUND")) {
				onLine(`ping: ${host}: Name or service not known`);
				onComplete();
				return;
			}

			const line =
				message.includes("Network") || message.includes("Failed to fetch")
					? `From ${currentIp() || "unknown"}: icmp_seq=${sequence} Destination Host Unreachable`
					: `Request timeout for icmp_seq=${sequence}`;
			onLine(line);
			scheduleNext(ping);
		}
	};

	void ping();
	return { stop };
};
