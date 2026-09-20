import { Component, type ErrorInfo, type ReactNode, useEffect } from "react";

interface ErrorScreenProps {
	error: unknown;
}

export function ErrorScreen({ error }: ErrorScreenProps) {
	useEffect(() => {
		const errStr =
			error instanceof Error
				? error.message
				: error == null
					? ""
					: String(error);
		if (
			/loading dynamically imported module|failed to fetch dynamically imported module|importing a module script failed/i.test(
				errStr,
			)
		) {
			const lastReload = sessionStorage.getItem("chunk_reload_retry");
			const now = Date.now();
			if (!lastReload || now - Number(lastReload) > 8_000) {
				sessionStorage.setItem("chunk_reload_retry", String(now));
				window.location.reload();
			}
		}
	}, [error]);

	return (
		<div className="flex flex-col items-center justify-center h-screen bg-elegant-bg text-elegant-text-primary font-mono cursor-default select-none">
			<div className="border border-elegant-accent p-8 rounded shadow-[0_0_15px_rgba(201,166,107,0.3)] max-w-2xl w-full mx-4">
				<h1 className="text-2xl font-bold text-elegant-accent mb-4">
					SYSTEM MALFUNCTION
				</h1>
				<div className="bg-elegant-card p-4 rounded mb-6 border border-elegant-border">
					<p className="text-elegant-text-secondary mb-2">
						&gt; Critical error detected in the neural matrix.
					</p>
					<p className="text-red-400 wrap-break-word font-mono text-sm">
						{error instanceof Error
							? error.toString()
							: error == null
								? "Unknown error"
								: String(error)}
					</p>
				</div>
				<button
					type="button"
					onClick={() => window.location.reload()}
					className="bg-elegant-accent text-elegant-bg px-4 py-2 font-bold hover:bg-elegant-accent-hover transition-colors rounded uppercase text-sm tracking-wider"
				>
					System Reboot
				</button>
			</div>
		</div>
	);
}

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error("Uncaught error:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return <ErrorScreen error={this.state.error} />;
		}

		return this.props.children;
	}
}
