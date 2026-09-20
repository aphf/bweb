import { useEffect, useState } from "react";

const chevron = Array.from({ length: 9 }, (_, i) => {
	const r = Math.floor(i / 3);
	const c = i % 3;
	return (c + Math.abs(r - 1)) * 90;
});

const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
const orbit = Array.from({ length: 9 }, (_, i) => {
	const k = ORBIT_ORDER.indexOf(i);
	return k === -1 ? null : k * 110;
});

const PATTERNS: Record<
	string,
	{ delays: (number | null)[]; dur: number; round: boolean }
> = {
	Drive: { delays: chevron, dur: 650, round: false },
	Dots: { delays: chevron, dur: 650, round: true },
	Orbit: { delays: orbit, dur: 950, round: false },
};

function LoaderGrid({
	delays,
	dur,
	round,
}: {
	delays: (number | null)[];
	dur: number;
	round: boolean;
}) {
	return (
		<span
			aria-hidden
			className="grid shrink-0 grid-cols-[repeat(3,4px)] gap-[1.5px]"
		>
			{delays.map((delay, index) => (
				<span
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed pixel grid indices
					key={index}
					className={`size-1 bg-emerald-400 ${round ? "rounded-full" : "rounded-[1px]"}`}
					style={{
						opacity: delay === null ? 0.07 : 0.2,
						animation:
							delay === null
								? "none"
								: `pixel-on ${dur}ms ease-in-out ${delay}ms infinite`,
					}}
				/>
			))}
		</span>
	);
}

function useElapsed() {
	const [ds, setDs] = useState(0);
	useEffect(() => {
		const t = setInterval(() => setDs((d) => d + 1), 100);
		return () => clearInterval(t);
	}, []);
	const total = ds / 10;
	if (total < 60) return `${total.toFixed(1)}s`;
	return `${Math.floor(total / 60)}m ${(total % 60).toFixed(1)}s`;
}

export default function LoadingState({
	label = "Loading",
	variant = "Orbit",
}: {
	label?: string;
	variant?: "Drive" | "Dots" | "Orbit";
}) {
	const elapsed = useElapsed();
	const { delays, dur, round } = PATTERNS[variant] ?? PATTERNS.Orbit;

	return (
		<div
			role="status"
			className="flex w-fit items-center gap-2.5 font-mono py-1"
		>
			<LoaderGrid delays={delays} dur={dur} round={round} />
			<span
				className="bg-clip-text text-[13px] font-mono font-medium text-transparent"
				style={{
					backgroundImage:
						"linear-gradient(90deg, var(--elegant-text-muted) 35%, var(--elegant-text-primary) 50%, var(--elegant-text-muted) 65%)",
					backgroundSize: "200% 100%",
					animation: "shimmer-text 1.4s linear infinite",
				}}
			>
				{label}
			</span>
			<span className="font-mono text-[12px] text-elegant-text-muted tabular-nums">
				{elapsed}
			</span>
		</div>
	);
}
