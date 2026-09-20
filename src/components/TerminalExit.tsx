import { useEffect, useRef, useState } from "react";

interface TerminalExitProps {
	onClose?: () => void;
	onDone?: () => void;
	onReset?: () => void;
}

const FUN_QUOTES = [
	"See you space cowboy...",
	"Hasta la vista, baby.",
	"Disconnecting from the matrix...",
	"Process finished with exit code 0.",
	"Shutting down NeoSphere OS session.",
];

export const TerminalExit = ({
	onClose,
	onDone,
	onReset,
}: TerminalExitProps) => {
	const [step, setStep] = useState(0);
	const [quote] = useState(() => {
		return FUN_QUOTES[Math.floor(Math.random() * FUN_QUOTES.length)];
	});

	const callbacksRef = useRef({ onClose, onDone, onReset });
	useEffect(() => {
		callbacksRef.current = { onClose, onDone, onReset };
	});

	useEffect(() => {
		const t1 = setTimeout(() => setStep(1), 300);
		const t2 = setTimeout(() => setStep(2), 600);
		const t3 = setTimeout(() => setStep(3), 900);
		const t4 = setTimeout(() => setStep(4), 1200);
		const t5 = setTimeout(() => setStep(5), 1500);
		const t6 = setTimeout(() => {
			if (callbacksRef.current.onClose) {
				callbacksRef.current.onClose();
			} else {
				window.dispatchEvent(new CustomEvent("close-terminal"));
			}
		}, 3500);
		const t7 = setTimeout(() => {
			callbacksRef.current.onDone?.();
			callbacksRef.current.onReset?.();
		}, 3800);

		return () => {
			clearTimeout(t1);
			clearTimeout(t2);
			clearTimeout(t3);
			clearTimeout(t4);
			clearTimeout(t5);
			clearTimeout(t6);
			clearTimeout(t7);
			callbacksRef.current.onReset?.();
			callbacksRef.current.onDone?.();
		};
	}, []);

	return (
		<div className="flex flex-col gap-1 font-mono text-sm leading-relaxed my-1 select-none">
			<div className="text-elegant-text-primary">logout</div>

			{step >= 1 && (
				<div className="text-elegant-text-secondary">
					<span className="text-elegant-accent">[session]</span> Saving history
					and environment...
				</div>
			)}

			{step >= 2 && (
				<div className="text-elegant-text-secondary">
					<span className="text-elegant-accent">[system]</span> Terminating
					active processes (PID: 1337)...
				</div>
			)}

			{step >= 3 && (
				<div className="text-elegant-text-secondary">
					<span className="text-elegant-accent">[auth]</span> Connection to
					neosphere closed.
				</div>
			)}

			{step >= 4 && (
				<div className="text-elegant-accent italic font-semibold my-0.5">
					&gt; "{quote}"
				</div>
			)}

			{step >= 5 && (
				<div className="flex items-center gap-2 mt-1">
					<span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
						[Process completed]
					</span>
					<span className="text-xs text-elegant-text-muted">exit code 0</span>
				</div>
			)}
		</div>
	);
};

export default TerminalExit;
