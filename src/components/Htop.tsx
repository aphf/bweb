import type React from "react";
import { useEffect, useReducer, useRef, useState } from "react";

interface MultiColorBarProps {
	label: string;
	segments: number[];
	showMem?: { used: number; total: number };
}

const CPU_BAR_COLORS = [
	"bg-green-500",
	"bg-blue-500",
	"bg-red-500",
	"bg-amber-400",
	"bg-fuchsia-500",
	"bg-cyan-400",
];

const MEM_BAR_COLORS = ["bg-green-500", "bg-blue-500", "bg-amber-400"];

const SWP_BAR_COLORS = ["bg-red-500"];

const MultiColorBar: React.FC<MultiColorBarProps> = ({
	label,
	segments,
	showMem,
}) => {
	const sum = segments.reduce((a, b) => a + b, 0);
	const barWidth = showMem ? (showMem.used / showMem.total) * 100 : sum;

	const colors = label.includes("Mem")
		? MEM_BAR_COLORS
		: label.includes("Swp")
			? SWP_BAR_COLORS
			: CPU_BAR_COLORS;

	const segmentItems = segments.map((seg, idx) => ({
		id: `${label}-seg-${idx}`,
		seg,
		colorClass: colors[idx % colors.length],
	}));

	const labelColor = label.includes("Mem")
		? "text-cyan-400"
		: label.includes("Swp")
			? "text-red-400"
			: "text-cyan-400";

	return (
		<div className="flex items-center font-mono text-sm leading-tight">
			<span className={`w-6 ${labelColor} font-bold`}>{label}</span>
			<span className="text-gray-400 mx-1 font-bold">[</span>
			<div className="flex-1 flex items-center bg-black/50 overflow-hidden h-3">
				<div className="flex w-full h-3 relative">
					{segmentItems.map((item) => {
						const width = showMem ? (item.seg / showMem.total) * 100 : item.seg;
						return item.seg > 0 ? (
							<div
								key={item.id}
								className={`h-full ${item.colorClass}`}
								style={{ width: `${width}%` }}
							/>
						) : null;
					})}
				</div>
			</div>
			<span className="text-gray-400 ml-1 font-bold">]</span>
			{showMem ? (
				<span className="ml-2 text-cyan-300 font-bold w-24 text-right">
					{showMem.used.toFixed(0)}M/{showMem.total.toFixed(0)}M
				</span>
			) : (
				<span className="ml-2 text-green-400 font-bold w-12 text-right">
					{barWidth.toFixed(1)}%
				</span>
			)}
		</div>
	);
};

interface Process {
	pid: number;
	user: string;
	pri: number;
	ni: number;
	virt: string;
	res: string;
	shr: string;
	s: "R" | "S" | "D" | "Z" | "T";
	cpu: number;
	mem: number;
	time: string;
	cmd: string;
}

interface CpuCore {
	id: string;
	values: number[];
}

interface SystemState {
	cpu: CpuCore[];
	mem: { used: number; total: number };
	swp: { used: number; total: number };
	tasks: { total: number; threads: number; running: number };
	loadAvg: number[];
	uptime: number;
}

interface SystemAction {
	type: "tick";
	randomness: {
		cpu: number[][];
		mem: number;
		swp: number;
		running: [number, number];
		load: number[];
	};
}

const INITIAL_SYSTEM_STATE: SystemState = {
	cpu: [
		{ id: "cpu0", values: [15, 10, 5, 2] },
		{ id: "cpu1", values: [20, 8, 3, 1] },
		{ id: "cpu2", values: [12, 6, 2, 1] },
		{ id: "cpu3", values: [18, 7, 4, 2] },
	],
	mem: { used: 154, total: 416 },
	swp: { used: 101, total: 416 },
	tasks: { total: 63, threads: 109, running: 1 },
	loadAvg: [0.84, 0.45, 1.12],
	uptime: 45 * 24 * 3600 + 10 * 3600 + 38 * 60 + 51,
};

const CPU_MAX = [100, 30, 10, 5];
const LOAD_FACTORS = [1, 2, 5];

const systemReducer = (
	state: SystemState,
	action: SystemAction,
): SystemState => {
	const { randomness } = action;

	const cpu = state.cpu.map((core, i) => ({
		...core,
		values: core.values.map((v, j) =>
			Math.max(0, Math.min(CPU_MAX[j], v + randomness.cpu[i][j])),
		),
	}));

	const mem = {
		...state.mem,
		used: Math.max(
			100,
			Math.min(state.mem.total - 10, state.mem.used + randomness.mem),
		),
	};

	const swp = {
		...state.swp,
		used: Math.max(
			50,
			Math.min(state.swp.total - 10, state.swp.used + randomness.swp),
		),
	};

	const runningDelta =
		randomness.running[0] > 0.8 ? (randomness.running[1] > 0.5 ? 1 : -1) : 0;
	const running = Math.max(1, Math.min(5, state.tasks.running + runningDelta));

	const loadAvg = state.loadAvg.map((val, i) =>
		Math.max(0.1, val + (randomness.load[i] * 0.2 - 0.1) / LOAD_FACTORS[i]),
	);

	return {
		...state,
		cpu,
		mem,
		swp,
		tasks: { ...state.tasks, running, total: 63 + (running - 1) },
		loadAvg,
		uptime: state.uptime + 1,
	};
};

const formatUptime = (sec: number) => {
	const days = Math.floor(sec / 86400);
	const hours = Math.floor((sec % 86400) / 3600);
	const mins = Math.floor((sec % 3600) / 60);
	const secs = sec % 60;
	return `${days} days, ${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const PROCESSES: Process[] = [
	{
		pid: 1948254,
		user: "x",
		pri: 20,
		ni: 0,
		virt: "8104",
		res: "4200",
		shr: "2856",
		s: "R",
		cpu: 3.2,
		mem: 1.0,
		time: "0:00.26",
		cmd: "htop",
	},
	{
		pid: 1,
		user: "root",
		pri: 20,
		ni: 0,
		virt: "25252",
		res: "8276",
		shr: "5360",
		s: "S",
		cpu: 0.0,
		mem: 1.9,
		time: "28:31.02",
		cmd: "/sbin/init splash",
	},
	{
		pid: 300,
		user: "root",
		pri: 20,
		ni: 0,
		virt: "29136",
		res: "3400",
		shr: "2764",
		s: "S",
		cpu: 0.0,
		mem: 0.8,
		time: "8:43.91",
		cmd: "/usr/lib/systemd/systemd-journald",
	},
	{
		pid: 351,
		user: "systemd-ti",
		pri: 20,
		ni: 0,
		virt: "92228",
		res: "1300",
		shr: "1144",
		s: "S",
		cpu: 0.0,
		mem: 0.3,
		time: "0:16.35",
		cmd: "/usr/lib/systemd/systemd-timesyncd",
	},
	{
		pid: 378,
		user: "root",
		pri: 20,
		ni: 0,
		virt: "35752",
		res: "1440",
		shr: "1348",
		s: "S",
		cpu: 0.0,
		mem: 0.3,
		time: "0:10.55",
		cmd: "/usr/lib/systemd/systemd-udevd",
	},
	{
		pid: 383,
		user: "systemd-ti",
		pri: 20,
		ni: 0,
		virt: "92228",
		res: "1300",
		shr: "0",
		s: "S",
		cpu: 0.0,
		mem: 0.3,
		time: "0:00.01",
		cmd: "/usr/lib/systemd/systemd-timesyncd",
	},
	{
		pid: 510,
		user: "rpc",
		pri: 20,
		ni: 0,
		virt: "6840",
		res: "332",
		shr: "296",
		s: "S",
		cpu: 0.0,
		mem: 0.1,
		time: "0:08.28",
		cmd: "/usr/sbin/rpcbind -f -w",
	},
	{
		pid: 519,
		user: "root",
		pri: 20,
		ni: 0,
		virt: "5008",
		res: "240",
		shr: "236",
		s: "S",
		cpu: 0.0,
		mem: 0.1,
		time: "0:00.01",
		cmd: "/usr/sbin/blkmapd",
	},
	{
		pid: 568,
		user: "root",
		pri: 20,
		ni: 0,
		virt: "302M",
		res: "3860",
		shr: "3248",
		s: "S",
		cpu: 0.0,
		mem: 0.9,
		time: "0:00.96",
		cmd: "/usr/libexec/accounts-daemon",
	},
	{
		pid: 570,
		user: "avahi",
		pri: 20,
		ni: 0,
		virt: "5920",
		res: "1328",
		shr: "1032",
		s: "S",
		cpu: 0.0,
		mem: 0.3,
		time: "5:38.85",
		cmd: "avahi-daemon: running [xs.local]",
	},
	{
		pid: 571,
		user: "root",
		pri: 20,
		ni: 0,
		virt: "13000",
		res: "392",
		shr: "388",
		s: "S",
		cpu: 0.0,
		mem: 0.1,
		time: "0:00.25",
		cmd: "/usr/libexec/bluetooth/bluetoothd",
	},
	{
		pid: 572,
		user: "root",
		pri: 20,
		ni: 0,
		virt: "6980",
		res: "800",
		shr: "704",
		s: "S",
		cpu: 0.0,
		mem: 0.2,
		time: "0:42.53",
		cmd: "/usr/sbin/cron -f",
	},
	{
		pid: 574,
		user: "messagebus",
		pri: 20,
		ni: 0,
		virt: "9748",
		res: "2736",
		shr: "1364",
		s: "S",
		cpu: 0.0,
		mem: 0.6,
		time: "27:16.03",
		cmd: "/usr/bin/dbus-daemon --system --address=systemd: --nofork --nopidfile --systemd-activation",
	},
	{
		pid: 579,
		user: "polkitd",
		pri: 20,
		ni: 0,
		virt: "302M",
		res: "3944",
		shr: "3064",
		s: "S",
		cpu: 0.0,
		mem: 0.9,
		time: "0:01.88",
		cmd: "/usr/lib/polkit-1/polkitd --no-debug --log-level=notice",
	},
	{
		pid: 580,
		user: "avahi",
		pri: 20,
		ni: 0,
		virt: "5656",
		res: "236",
		shr: "232",
		s: "S",
		cpu: 0.0,
		mem: 0.1,
		time: "0:00.00",
		cmd: "avahi-daemon: chroot helper",
	},
	{
		pid: 584,
		user: "root",
		pri: 20,
		ni: 0,
		virt: "18864",
		res: "4988",
		shr: "4540",
		s: "S",
		cpu: 1.2,
		mem: 1.2,
		time: "3:45.06",
		cmd: "/usr/lib/systemd/systemd-logind",
	},
	{
		pid: 585,
		user: "root",
		pri: 20,
		ni: 0,
		virt: "399M",
		res: "3520",
		shr: "2932",
		s: "S",
		cpu: 0.0,
		mem: 0.8,
		time: "0:03.15",
		cmd: "/usr/libexec/udisks2/udisksd",
	},
	{
		pid: 621,
		user: "root",
		pri: 20,
		ni: 0,
		virt: "302M",
		res: "3860",
		shr: "0",
		s: "S",
		cpu: 0.0,
		mem: 0.9,
		time: "0:00.00",
		cmd: "/usr/libexec/accounts-daemon",
	},
	{
		pid: 622,
		user: "root",
		pri: 20,
		ni: 0,
		virt: "302M",
		res: "3860",
		shr: "0",
		s: "S",
		cpu: 0.0,
		mem: 0.9,
		time: "0:00.09",
		cmd: "/usr/libexec/accounts-daemon",
	},
	{
		pid: 641,
		user: "root",
		pri: 20,
		ni: 0,
		virt: "399M",
		res: "3520",
		shr: "0",
		s: "S",
		cpu: 0.0,
		mem: 0.8,
		time: "1:41.54",
		cmd: "/usr/libexec/udisks2/udisksd",
	},
	{
		pid: 642,
		user: "root",
		pri: 20,
		ni: 0,
		virt: "399M",
		res: "3520",
		shr: "0",
		s: "S",
		cpu: 0.0,
		mem: 0.8,
		time: "0:01.52",
		cmd: "/usr/libexec/udisks2/udisksd",
	},
	{
		pid: 648,
		user: "polkitd",
		pri: 20,
		ni: 0,
		virt: "302M",
		res: "3944",
		shr: "0",
		s: "S",
		cpu: 0.0,
		mem: 0.9,
		time: "2:51.35",
		cmd: "/usr/lib/polkit-1/polkitd --no-debug --log-level=notice",
	},
	{
		pid: 649,
		user: "polkitd",
		pri: 20,
		ni: 0,
		virt: "302M",
		res: "3944",
		shr: "0",
		s: "S",
		cpu: 0.0,
		mem: 0.9,
		time: "0:00.00",
		cmd: "/usr/lib/polkit-1/polkitd --no-debug --log-level=notice",
	},
	{
		pid: 650,
		user: "root",
		pri: 20,
		ni: 0,
		virt: "399M",
		res: "3520",
		shr: "0",
		s: "S",
		cpu: 0.0,
		mem: 0.8,
		time: "0:00.14",
		cmd: "/usr/libexec/udisks2/udisksd",
	},
	{
		pid: 651,
		user: "root",
		pri: 20,
		ni: 0,
		virt: "302M",
		res: "3860",
		shr: "0",
		s: "S",
		cpu: 0.0,
		mem: 0.9,
		time: "0:00.45",
		cmd: "/usr/libexec/accounts-daemon",
	},
	{
		pid: 652,
		user: "polkitd",
		pri: 20,
		ni: 0,
		virt: "302M",
		res: "3944",
		shr: "0",
		s: "S",
		cpu: 0.0,
		mem: 0.9,
		time: "0:01.44",
		cmd: "/usr/lib/polkit-1/polkitd --no-debug --log-level=notice",
	},
	{
		pid: 654,
		user: "root",
		pri: 20,
		ni: 0,
		virt: "333M",
		res: "3424",
		shr: "2232",
		s: "S",
		cpu: 0.0,
		mem: 0.8,
		time: "13:17.37",
		cmd: "/usr/sbin/NetworkManager --no-daemon",
	},
	{
		pid: 690,
		user: "root",
		pri: 20,
		ni: 0,
		virt: "316M",
		res: "2528",
		shr: "0",
		s: "S",
		cpu: 0.0,
		mem: 0.6,
		time: "0:00.00",
		cmd: "/usr/sbin/ModemManager",
	},
	{
		pid: 692,
		user: "root",
		pri: 20,
		ni: 0,
		virt: "316M",
		res: "2528",
		shr: "0",
		s: "S",
		cpu: 0.0,
		mem: 0.6,
		time: "0:00.00",
		cmd: "/usr/sbin/ModemManager",
	},
];

interface HtopProps {
	onExit: () => void;
}

export const Htop = ({ onExit }: HtopProps) => {
	const [system, dispatch] = useReducer(systemReducer, INITIAL_SYSTEM_STATE);
	const { cpu, mem, swp, tasks, loadAvg, uptime } = system;
	const [selectedIndex, setSelectedIndex] = useState(0);
	const scrollRef = useRef<HTMLDivElement>(null);
	const [processes] = useState<Process[]>(PROCESSES);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "q" || e.key === "Q" || (e.key === "c" && e.ctrlKey)) {
				onExit();
			} else if (e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedIndex((prev) => Math.min(processes.length - 1, prev + 1));
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedIndex((prev) => Math.max(0, prev - 1));
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onExit, processes.length]);

	useEffect(() => {
		if (scrollRef.current) {
			const selectedElement = scrollRef.current.children[
				selectedIndex
			] as HTMLElement;
			if (selectedElement) {
				selectedElement.scrollIntoView({
					block: "nearest",
					behavior: "smooth",
				});
			}
		}
	}, [selectedIndex]);

	useEffect(() => {
		const interval = setInterval(() => {
			dispatch({
				type: "tick",
				randomness: {
					cpu: Array.from({ length: INITIAL_SYSTEM_STATE.cpu.length }, () =>
						Array.from({ length: 4 }, () => Math.random() * 10 - 5),
					),
					mem: Math.random() * 4 - 2,
					swp: Math.random() * 2 - 1,
					running: [Math.random(), Math.random()],
					load: Array.from({ length: 3 }, () => Math.random()),
				},
			});
		}, 1000);

		return () => clearInterval(interval);
	}, []);

	return (
		<div className="w-full h-full bg-elegant-bg text-elegant-text-secondary font-mono text-sm select-none overflow-hidden flex flex-col p-2">
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 mb-2 shrink-0">
				<div className="space-y-0">
					{cpu.map((core) => (
						<MultiColorBar
							key={core.id}
							label={core.id.replace("cpu", "")}
							segments={core.values}
						/>
					))}
					<MultiColorBar label="Mem" segments={[mem.used]} showMem={mem} />
					<MultiColorBar label="Swp" segments={[swp.used]} showMem={swp} />
				</div>
				<div className="space-y-0 text-sm flex flex-col justify-center">
					<div className="text-neutral-400">
						Tasks:{" "}
						<span className="text-cyan-400 font-bold">{tasks.total}</span>,{" "}
						<span className="text-cyan-400 font-bold">{tasks.threads}</span>{" "}
						thr;{" "}
						<span className="text-green-400 font-bold">{tasks.running}</span>{" "}
						running
					</div>
					<div className="text-neutral-400">
						Load average:{" "}
						<span className="text-green-400 font-bold">
							{loadAvg.map((n) => n.toFixed(2)).join(" ")}
						</span>
					</div>
					<div className="text-neutral-400">
						Uptime:{" "}
						<span className="text-cyan-400 font-bold">
							{formatUptime(uptime)}
						</span>
					</div>
				</div>
			</div>

			<div className="flex-1 overflow-auto border-t border-b border-neutral-800 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent">
				<div className="min-w-150 flex flex-col h-full">
					<div className="bg-[#004f4f] text-cyan-200 font-bold flex px-1 py-0.5 shrink-0 sticky top-0 z-10 select-none">
						<span className="w-16">PID</span>
						<span className="w-20">USER</span>
						<span className="w-10 text-right">PRI</span>
						<span className="w-10 text-right">NI</span>
						<span className="w-14 text-right">VIRT</span>
						<span className="w-14 text-right">RES</span>
						<span className="w-14 text-right">SHR</span>
						<span className="w-8">S</span>
						<span className="w-12 text-right">CPU%</span>
						<span className="w-12 text-right">MEM%</span>
						<span className="w-20 ml-2">TIME+</span>
						<span className="flex-1">Command</span>
					</div>
					<div ref={scrollRef} className="flex-1">
						{processes.map((p, idx) => {
							const isHighlighted = idx === selectedIndex;
							const isRunning = p.s === "R";
							const userColor =
								p.user === "root"
									? "text-red-400 font-bold"
									: p.user.includes("systemd")
										? "text-amber-400"
										: p.user === "x" || p.user === "neo"
											? "text-green-400 font-medium"
											: "text-cyan-300";

							return (
								<button
									type="button"
									key={p.pid}
									className={`flex w-full text-left bg-transparent border-0 px-1 py-0 ${
										isHighlighted
											? "bg-[#008080] text-black font-bold"
											: "hover:bg-neutral-900 cursor-pointer"
									}`}
									onClick={() => setSelectedIndex(idx)}
								>
									<span
										className={`w-16 ${isHighlighted ? "text-black" : "text-cyan-400 font-medium"}`}
									>
										{p.pid}
									</span>
									<span
										className={`w-20 ${isHighlighted ? "text-black" : userColor}`}
									>
										{p.user}
									</span>
									<span
										className={`w-10 text-right ${isHighlighted ? "text-black" : "text-neutral-400"}`}
									>
										{p.pri}
									</span>
									<span
										className={`w-10 text-right ${isHighlighted ? "text-black" : "text-neutral-400"}`}
									>
										{p.ni}
									</span>
									<span
										className={`w-14 text-right ${isHighlighted ? "text-black" : "text-neutral-300"}`}
									>
										{p.virt}
									</span>
									<span
										className={`w-14 text-right ${isHighlighted ? "text-black" : "text-neutral-300"}`}
									>
										{p.res}
									</span>
									<span
										className={`w-14 text-right ${isHighlighted ? "text-black" : "text-neutral-300"}`}
									>
										{p.shr}
									</span>
									<span
										className={`w-8 ${
											isHighlighted
												? "text-black"
												: isRunning
													? "text-green-400 font-bold"
													: "text-neutral-400"
										}`}
									>
										{p.s}
									</span>
									<span
										className={`w-12 text-right ${
											isHighlighted
												? "text-black"
												: p.cpu > 1
													? "text-green-400 font-bold"
													: p.cpu > 0
														? "text-green-300"
														: "text-neutral-400"
										}`}
									>
										{p.cpu.toFixed(1)}
									</span>
									<span
										className={`w-12 text-right ${isHighlighted ? "text-black" : p.mem > 5 ? "text-cyan-300 font-bold" : "text-neutral-400"}`}
									>
										{p.mem.toFixed(1)}
									</span>
									<span
										className={`w-20 ml-2 ${isHighlighted ? "text-black" : "text-neutral-300"}`}
									>
										{p.time}
									</span>
									<span
										className={`flex-1 truncate ${isHighlighted ? "text-black font-bold" : "text-green-400 font-medium"}`}
									>
										{p.cmd}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			</div>

			<div className="mt-2 flex gap-1 flex-wrap shrink-0 border-t border-neutral-800 pt-1">
				{[
					{ key: "1", label: "Help" },
					{ key: "2", label: "Setup" },
					{ key: "3", label: "Search" },
					{ key: "4", label: "Filter" },
					{ key: "5", label: "Tree" },
					{ key: "6", label: "Sort" },
					{ key: "7", label: "Nice-" },
					{ key: "8", label: "Nice+" },
					{ key: "9", label: "Kill" },
					{ key: "10", label: "Quit", action: onExit },
				].map((btn) => (
					<button
						type="button"
						key={btn.key}
						onClick={btn.action}
						className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs cursor-pointer flex items-center overflow-hidden rounded-none border border-neutral-700"
					>
						<span className="bg-cyan-500 text-black font-bold px-1.5 py-0.5 mr-1">
							{btn.key}
						</span>
						<span className="pr-1.5 py-0.5">{btn.label}</span>
					</button>
				))}

				<button
					type="button"
					onClick={onExit}
					className="ml-auto bg-red-600 hover:bg-red-500 text-white px-2 py-0.5 text-xs font-bold animate-pulse cursor-pointer transition-colors"
				>
					Press 'Q' to quit
				</button>
			</div>
		</div>
	);
};
