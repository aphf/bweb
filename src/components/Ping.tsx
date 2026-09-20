import { useCallback, useEffect, useRef, useState } from "react";
import { type PingLoop, startPingLoop } from "../utils/pingLoop";

export interface PingLine {
	id: number;
	text: string;
}

export interface PingStats {
	tx: number;
	rx: number;
	loss: number;
	min: number;
	avg: number;
	max: number;
}

export interface PingOutputProps {
	host: string;
	ip: string | null;
	lines: PingLine[];
	stats: PingStats | null;
}

export const PingOutput = ({ host, ip, lines, stats }: PingOutputProps) => {
	return (
		<div className="text-elegant-text-primary">
			{ip && (
				<div className="mb-1">
					PING {host} ({ip}) 56(84) bytes of data.
				</div>
			)}
			{lines.map((line) => (
				<div key={line.id}>{line.text}</div>
			))}
			{stats && (
				<>
					<div className="mt-2 text-elegant-text-primary">
						--- {host} ping statistics ---
					</div>
					<div className="text-elegant-text-primary">
						{stats.tx} packets transmitted, {stats.rx} received,{" "}
						{stats.loss.toFixed(0)}% packet loss, time {stats.tx}000ms
					</div>
					{stats.rx > 0 && (
						<div className="text-elegant-text-primary">
							rtt min/avg/max/mdev = {stats.min.toFixed(3)}/
							{stats.avg.toFixed(3)}/{stats.max.toFixed(3)}/
							{((stats.max - stats.min) / 2).toFixed(3)} ms
						</div>
					)}
				</>
			)}
		</div>
	);
};

interface PingProps {
	host: string;
	onComplete: () => void;
	count?: number; // Optional: limit number of pings
	onFinish?: (staticNode: React.ReactNode) => void;
}

export const Ping = ({ host, onComplete, count, onFinish }: PingProps) => {
	const [lines, setLines] = useState<PingLine[]>([]);
	const [isRunning, setIsRunning] = useState(true);
	const [stats, setStats] = useState<PingStats | null>(null);

	// Use refs to avoid stale closures
	const seqRef = useRef(1);
	const rttsRef = useRef<number[]>([]);
	const lineIdRef = useRef(0);
	const linesRef = useRef<PingLine[]>([]);
	const loopRef = useRef<PingLoop | null>(null);
	const isFinalizedRef = useRef(false);
	const isRunningRef = useRef(isRunning);

	// Initial IP is null to prevent showing fake IP
	const [ip, setIp] = useState<string | null>(null);
	const ipRef = useRef(ip);

	const onCompleteRef = useRef(onComplete);
	const onFinishRef = useRef(onFinish);

	useEffect(() => {
		onCompleteRef.current = onComplete;
		onFinishRef.current = onFinish;
	});

	// Validate hostname
	const isValidHost = useCallback((hostname: string): boolean => {
		if (!hostname || hostname.trim() === "") return false;
		// Basic validation - allows domain names and IPs
		const pattern =
			/^[a-zA-Z0-9][a-zA-Z0-9-_.]+[a-zA-Z0-9]$|^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
		return pattern.test(hostname);
	}, []);

	const pushLine = useCallback((text: string) => {
		lineIdRef.current += 1;
		const newLine = { id: lineIdRef.current, text };
		linesRef.current.push(newLine);
		setLines((prev) => [...prev, newLine]);
	}, []);

	const finalizePing = useCallback(
		(cancelled: boolean = false) => {
			if (isFinalizedRef.current) return;
			isFinalizedRef.current = true;
			setIsRunning(false);
			isRunningRef.current = false;

			if (cancelled) {
				pushLine("^C");
			}

			const rtts = rttsRef.current;
			const min = rtts.length ? Math.min(...rtts) : 0;
			const max = rtts.length ? Math.max(...rtts) : 0;
			const avg = rtts.length
				? rtts.reduce((a, b) => a + b, 0) / rtts.length
				: 0;

			const transmitted = seqRef.current - 1;
			const received = rtts.length;
			const loss =
				transmitted > 0 ? ((transmitted - received) / transmitted) * 100 : 0;

			const calculatedStats: PingStats = {
				tx: transmitted,
				rx: received,
				loss: loss,
				min: Number.isFinite(min) ? min : 0,
				avg: Number.isFinite(avg) ? avg : 0,
				max: Number.isFinite(max) ? max : 0,
			};

			setStats(calculatedStats);

			onCompleteRef.current?.();

			if (onFinishRef.current) {
				onFinishRef.current(
					<PingOutput
						host={host}
						ip={ipRef.current}
						lines={[...linesRef.current]}
						stats={calculatedStats}
					/>,
				);
			}
		},
		[host, pushLine],
	);

	useEffect(() => {
		if (!isValidHost(host)) {
			pushLine(`ping: ${host}: Name or service not known`);
			finalizePing(false);
			return;
		}

		const loop = startPingLoop({
			host,
			count,
			isRunning: () => isRunningRef.current,
			nextSequence: () => seqRef.current++,
			currentIp: () => ipRef.current,
			onIp: (newIp) => {
				ipRef.current = newIp;
				setIp(newIp);
			},
			onRtt: (rtt) => rttsRef.current.push(rtt),
			onLine: pushLine,
			onComplete: () => finalizePing(false),
		});
		loopRef.current = loop;

		return () => {
			loop.stop();
			if (!isFinalizedRef.current) {
				finalizePing(true);
			}
		};
	}, [host, count, isValidHost, finalizePing, pushLine]);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.ctrlKey && e.key === "c" && isRunningRef.current) {
				loopRef.current?.stop();
				finalizePing(true);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [finalizePing]);

	return (
		<div className="text-elegant-text-primary">
			{ip && (
				<div className="mb-1">
					PING {host} ({ip}) 56(84) bytes of data.
				</div>
			)}
			{lines.map((line) => (
				<div key={line.id}>{line.text}</div>
			))}
			{stats && (
				<>
					<div className="mt-2 text-elegant-text-primary">
						--- {host} ping statistics ---
					</div>
					<div className="text-elegant-text-primary">
						{stats.tx} packets transmitted, {stats.rx} received,{" "}
						{stats.loss.toFixed(0)}% packet loss, time {stats.tx}000ms
					</div>
					{stats.rx > 0 && (
						<div className="text-elegant-text-primary">
							rtt min/avg/max/mdev = {stats.min.toFixed(3)}/
							{stats.avg.toFixed(3)}/{stats.max.toFixed(3)}/
							{((stats.max - stats.min) / 2).toFixed(3)} ms
						</div>
					)}
				</>
			)}
			{isRunning && (
				<button
					type="button"
					onClick={() => {
						loopRef.current?.stop();
						finalizePing(true);
					}}
					className="mt-2 px-3 py-1 text-xs text-elegant-text-muted border border-elegant-border rounded hover:bg-white/10 hover:text-elegant-text-primary active:bg-white/20 transition-colors cursor-pointer select-none"
				>
					⏹ Stop (Ctrl+C)
				</button>
			)}
		</div>
	);
};
