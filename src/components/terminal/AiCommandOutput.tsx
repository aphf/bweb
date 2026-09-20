import { Loader2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { streamAiResponse } from "../../utils/aiApi";

function StreamingTextOutput({
	text,
	isStreaming,
}: {
	text: string;
	isStreaming: boolean;
}) {
	return (
		<div className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-elegant-text-primary py-1">
			{text}
			{isStreaming && (
				<span className="inline-block w-2 h-4 ml-0.5 bg-emerald-500 animate-pulse align-middle" />
			)}
		</div>
	);
}

export function AiCommandOutput({
	prompt,
	entryId,
	updateHistory,
}: {
	prompt: string;
	entryId?: string;
	updateHistory?: (id: string, output: React.ReactNode) => void;
}) {
	const [state, setState] = useState<{
		loading: boolean;
		error: string | null;
		data: {
			response: string;
			isStreaming: boolean;
		} | null;
	}>({
		loading: true,
		error: null,
		data: null,
	});

	useEffect(() => {
		const controller = new AbortController();

		void streamAiResponse(
			prompt,
			controller.signal,
			(currentText) => {
				if (!controller.signal.aborted) {
					setState({
						loading: false,
						error: null,
						data: { response: currentText, isStreaming: true },
					});
				}
			},
			(finalResponse) => {
				if (!controller.signal.aborted) {
					setState({
						loading: false,
						error: null,
						data: { response: finalResponse, isStreaming: false },
					});
					if (entryId && updateHistory) {
						updateHistory(
							entryId,
							<StreamingTextOutput text={finalResponse} isStreaming={false} />,
						);
					}
				}
			},
			(errMsg) => {
				if (!controller.signal.aborted) {
					setState({ loading: false, error: errMsg, data: null });
				}
			},
		);

		return () => {
			controller.abort();
		};
	}, [prompt, entryId, updateHistory]);

	if (state.loading) {
		return (
			<div className="py-1">
				<div className="flex items-center gap-2 text-xs font-mono text-elegant-text-muted animate-pulse">
					<Loader2 size={13} className="animate-spin text-elegant-accent" />
					<span>Connecting to Alaska...</span>
				</div>
			</div>
		);
	}

	if (state.error) {
		return (
			<div className="font-mono text-sm text-red-500 dark:text-red-400 py-1">
				❌ {state.error}
			</div>
		);
	}

	if (!state.data) return null;

	return (
		<StreamingTextOutput
			text={state.data.response}
			isStreaming={state.data.isStreaming}
		/>
	);
}
