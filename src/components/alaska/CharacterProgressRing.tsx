const MAX_LENGTH = 500;

export function CharacterProgressRing({ length }: { length: number }) {
	if (length < 450) return null;

	const percentage = Math.min(100, (length / MAX_LENGTH) * 100);
	const radius = 8;
	const circumference = 2 * Math.PI * radius;
	const strokeDashoffset = circumference - (percentage / 100) * circumference;

	const isAtLimit = length >= 500;
	const strokeColor = isAtLimit ? "#ef4444" : "#f59e0b";

	return (
		<div
			className="relative flex items-center justify-center size-5 cursor-default select-none group"
			role="status"
			aria-label={`Character count: ${length} of ${MAX_LENGTH}`}
		>
			<svg
				className="size-4 -rotate-90 transform"
				viewBox="0 0 20 20"
				aria-hidden="true"
			>
				<circle
					cx="10"
					cy="10"
					r={radius}
					className="stroke-elegant-border"
					strokeWidth="2"
					fill="transparent"
				/>
				<circle
					cx="10"
					cy="10"
					r={radius}
					stroke={strokeColor}
					strokeWidth="2"
					strokeDasharray={circumference}
					strokeDashoffset={strokeDashoffset}
					strokeLinecap="round"
					fill="transparent"
					className="transition-[stroke-dashoffset] duration-150"
				/>
			</svg>

			<div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-black/90 dark:bg-white/90 text-white dark:text-black text-[9px] font-mono px-1.5 py-0.5 whitespace-nowrap shadow-md pointer-events-none z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
				{length}/{MAX_LENGTH}
			</div>
		</div>
	);
}
