import { X } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";

export interface PromptConfig {
	isOpen: boolean;
	title: string;
	message?: string;
	defaultValue: string;
	onConfirm: (value: string) => void;
}

export interface AlertConfig {
	isOpen: boolean;
	message: string;
	type: "error" | "success" | "info";
}

export interface ConfirmConfig {
	isOpen: boolean;
	title: string;
	message: string;
	confirmLabel: string;
	onConfirm: () => void;
}

interface ActionModalsProps {
	promptConfig?: PromptConfig | null;
	setPromptConfig?: (config: PromptConfig | null) => void;

	alertConfig?: AlertConfig | null;
	setAlertConfig?: (config: AlertConfig | null) => void;

	confirmConfig?: ConfirmConfig | null;
	setConfirmConfig?: (config: ConfirmConfig | null) => void;
}

export const ActionModals = ({
	promptConfig,
	setPromptConfig,
	alertConfig,
	setAlertConfig,
	confirmConfig,
	setConfirmConfig,
}: ActionModalsProps) => {
	return (
		<>
			{promptConfig && setPromptConfig && (
				<PromptModal
					config={promptConfig}
					onClose={() => setPromptConfig(null)}
				/>
			)}

			{confirmConfig && setConfirmConfig && (
				<dialog
					open
					aria-modal="true"
					aria-labelledby="confirm-modal-title"
					className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in border-0 w-full h-full max-w-none max-h-none m-0"
					onKeyDown={(e) => {
						if (e.key === "Escape") setConfirmConfig(null);
					}}
				>
					<div className="bg-elegant-card border border-elegant-border p-4 rounded-lg max-w-sm w-full shadow-2xl">
						<h3
							id="confirm-modal-title"
							className="text-lg font-bold text-elegant-text-primary mb-2"
						>
							{confirmConfig.title}
						</h3>
						<p className="text-elegant-text-muted mb-6">
							{confirmConfig.message}
						</p>
						<div className="flex justify-end gap-3">
							<button
								type="button"
								onClick={() => setConfirmConfig(null)}
								className="px-4 py-2 text-elegant-text-muted hover:text-elegant-text-primary rounded outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={() => {
									confirmConfig.onConfirm();
									setConfirmConfig(null);
								}}
								className={`px-4 py-2 rounded font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-elegant-accent ${confirmConfig.confirmLabel === "Delete" ? "bg-red-500 text-white hover:bg-red-600" : "bg-elegant-accent text-elegant-bg font-semibold hover:bg-elegant-accent-hover"}`}
							>
								{confirmConfig.confirmLabel}
							</button>
						</div>
					</div>
				</dialog>
			)}

			{alertConfig && setAlertConfig && (
				<div
					role="status"
					aria-live="polite"
					className="fixed top-24 left-1/2 -translate-x-1/2 z-70"
				>
					<div
						className={`px-4 py-2 rounded border shadow-lg flex items-center gap-2 text-sm font-mono backdrop-blur-sm ${
							alertConfig.type === "error"
								? "bg-red-500/10 border-red-500/40 text-red-400"
								: alertConfig.type === "success"
									? "bg-elegant-accent/10 border-elegant-accent/40 text-elegant-accent"
									: "bg-elegant-card border-elegant-border text-elegant-text-primary"
						}`}
					>
						<span>{alertConfig.message}</span>
						<button
							type="button"
							aria-label="Dismiss notification"
							onClick={() => setAlertConfig(null)}
							className="ml-1 opacity-60 hover:opacity-100 rounded outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent transition-opacity"
						>
							<X size={12} aria-hidden="true" />
						</button>
					</div>
				</div>
			)}
		</>
	);
};

const PromptModal: React.FC<{ config: PromptConfig; onClose: () => void }> = ({
	config,
	onClose,
}) => {
	const [value, setValue] = useState(config.defaultValue);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	return (
		<dialog
			open
			aria-modal="true"
			aria-labelledby="prompt-modal-title"
			className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in border-0 w-full h-full max-w-none max-h-none m-0"
		>
			<div className="bg-elegant-card border border-elegant-border p-4 rounded-lg max-w-sm w-full shadow-2xl">
				<h3
					id="prompt-modal-title"
					className="text-lg font-bold text-elegant-text-primary mb-4"
				>
					{config.title}
				</h3>
				<input
					ref={inputRef}
					aria-label={config.title}
					value={value}
					onChange={(e) => setValue(e.target.value)}
					className="w-full bg-elegant-bg border border-elegant-border rounded p-2 text-elegant-text-primary focus:border-elegant-accent outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent mb-6"
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							config.onConfirm(value);
							onClose();
						}
						if (e.key === "Escape") onClose();
					}}
				/>
				<div className="flex justify-end gap-3">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 text-elegant-text-muted hover:text-elegant-text-primary rounded outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={() => {
							config.onConfirm(value);
							onClose();
						}}
						className="px-4 py-2 bg-elegant-accent text-elegant-bg font-semibold rounded hover:bg-elegant-accent-hover outline-none focus-visible:ring-2 focus-visible:ring-elegant-accent transition-colors"
					>
						Confirm
					</button>
				</div>
			</div>
		</dialog>
	);
};
