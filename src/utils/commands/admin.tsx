import React, { Suspense } from "react";
import type { InboxMessage } from "../../components/InboxMessageItem";
import { checkAdmin, logout } from "../authApi";
import type { Command } from "./types";

const LazyInboxMessageItem = React.lazy(() =>
	import("../../components/InboxMessageItem").then((m) => ({
		default: m.InboxMessageItem,
	})),
);

export const adminCommands: Record<string, Command> = {
	admin: {
		description: "Administrative tools and help",
		execute: async (args) => {
			if (args[0] === "-h" || args[0] === "--help") {
				return (
					<div className="flex flex-col gap-2 text-sm">
						<div className="text-elegant-accent font-bold">Admin Tools</div>
						<div className="grid grid-cols-[100px_1fr] gap-x-2">
							<span className="text-elegant-text-primary">login</span>
							<span>Authenticate as admin</span>
							<span className="text-elegant-text-primary">inbox</span>
							<span>View/Manage messages (Requires Login)</span>
							<span className="text-elegant-text-primary">alerts</span>
							<span>Configure notifications (Requires Login)</span>
						</div>
					</div>
				);
			}

			const isLoggedIn = await checkAdmin();

			if (!isLoggedIn) {
				return (
					<div className="text-elegant-text-secondary">
						Admin tools require authentication.
						<br />
						Usage:{" "}
						<span className="text-elegant-text-primary">
							login &lt;password&gt;
						</span>
					</div>
				);
			}

			return (
				<div className="flex flex-col gap-2 text-sm">
					<div className="text-elegant-accent font-bold">
						Authenticated (Admin)
					</div>
					<div>You have access to the following tools:</div>
					<div className="grid grid-cols-[100px_1fr] gap-x-2 mt-1">
						<span className="text-elegant-text-primary font-bold">inbox</span>
						<span className="text-elegant-text-muted">
							View, filter, and delete messages.
						</span>

						<span className="text-elegant-text-primary font-bold">alerts</span>
						<span className="text-elegant-text-muted">
							Configure notification channels.
						</span>

						<span className="text-elegant-text-primary font-bold">rm</span>
						<span className="text-elegant-text-muted">
							Remove a visitor note or public file.
						</span>

						<span className="text-elegant-text-primary font-bold">logout</span>
						<span className="text-elegant-text-muted">End admin session.</span>
					</div>
					<div className="mt-2 text-elegant-text-muted text-xs">
						Type <span className="text-elegant-text-primary">inbox -h</span> or{" "}
						<span className="text-elegant-text-primary">alerts -h</span> for
						details.
					</div>
				</div>
			);
		},
	},
	login: {
		description: "Login as admin",
		usage: "login [password]",
		execute: async (args, { user, setUser }) => {
			if (user === "root") return "Already logged in as root.";
			if (args.length === 0) return "Usage: login <password>";
			const password = args[0];

			try {
				const res = await fetch("/api/auth/login", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ password }),
				});

				if (!res.ok) {
					const data = await res.json();
					return `Error: ${data.error || "Login failed"}`;
				}

				if (setUser) setUser("root");
				return "Logged in successfully as root.";
			} catch (e: unknown) {
				return `Error: ${e instanceof Error ? e.message : "Unknown error"}`;
			}
		},
	},
	logout: {
		description: "Logout from admin session",
		execute: async (_args, { user, setUser }) => {
			if (user !== "root") {
				return "Error: You are not logged in.";
			}
			try {
				await logout();
			} catch (e: unknown) {
				console.error("Logout failed:", e);
			}
			if (setUser) setUser("neo");
			return "Logged out successfully.";
		},
	},
	inbox: {
		description: "View contact messages",
		execute: async (args, { user }) => {
			if (user !== "root")
				return 'Error: You must be logged in. Use "login <password>" first.';

			const arg = args[0]?.toLowerCase();

			if (arg === "-h" || arg === "--help" || arg === "help") {
				return (
					<div className="flex flex-col gap-2 text-sm max-w-lg">
						<div className="text-elegant-accent font-bold mb-1">
							Inbox Management
						</div>
						<div className="grid grid-cols-[120px_1fr] gap-x-2 gap-y-1">
							<span className="text-elegant-text-primary font-bold">inbox</span>
							<span className="text-elegant-text-muted">
								View all messages (latest 100)
							</span>

							<span className="text-elegant-text-primary font-bold">
								inbox day
							</span>
							<span className="text-elegant-text-muted">
								View messages from last 24h
							</span>

							<span className="text-elegant-text-primary font-bold">
								inbox week
							</span>
							<span className="text-elegant-text-muted">
								View messages from last 7 days
							</span>

							<span className="text-elegant-text-primary font-bold">
								inbox month
							</span>
							<span className="text-elegant-text-muted">
								View messages from last 30 days
							</span>

							<span className="text-elegant-text-primary font-bold">
								inbox [date]
							</span>
							<span className="text-elegant-text-muted">
								View messages from YYYY-MM-DD
							</span>

							<span className="text-elegant-text-primary font-bold">
								inbox delete [id]
							</span>
							<span className="text-elegant-text-muted">
								Delete a specific message by ID
							</span>
						</div>
					</div>
				);
			}

			if (arg === "delete") {
				const id = args[1];
				if (!id) return "Usage: inbox delete <id>";

				try {
					const res = await fetch(`/api/contact/inbox?id=${id}`, {
						method: "DELETE",
					});
					if (!res.ok) throw new Error("Failed to delete message");
					return `Message ${id} deleted successfully.`;
				} catch (e: unknown) {
					return `Error: ${e instanceof Error ? e.message : "Unknown error"}`;
				}
			}

			let query = "";
			if (["day", "week", "month", "year"].includes(arg)) {
				query = `?period=${arg}`;
			} else if (arg?.match(/^\d{4}-\d{2}-\d{2}$/)) {
				query = `?date=${arg}`;
			}

			try {
				const res = await fetch(`/api/contact/inbox${query}`);

				if (res.status === 401) {
					return "Error: Session expired or unauthorized. Please login again.";
				}

				if (!res.ok) throw new Error("Failed to fetch inbox");

				const messages = await res.json();

				if (messages.length === 0) return "Inbox is empty.";

				return (
					<div className="flex flex-col gap-4 font-mono text-sm">
						<div className="text-elegant-accent font-bold mb-2">
							Inbox ({messages.length})
						</div>
						<Suspense
							fallback={
								<div className="text-elegant-text-muted">Loading messages…</div>
							}
						>
							{messages.map((msg: InboxMessage) => (
								<LazyInboxMessageItem key={msg.id} msg={msg} />
							))}
						</Suspense>
					</div>
				);
			} catch (e: unknown) {
				return `Error: ${e instanceof Error ? e.message : "Unknown error"}`;
			}
		},
	},
	alerts: {
		description: "Configure notification channels (Admin only)",
		usage: "alerts [telegram|email|both|off]",
		execute: async (args, { user }) => {
			if (user !== "root")
				return 'Error: You must be logged in. Use "login <password>" first.';

			const mode = args[0]?.toLowerCase();

			if (mode === "-h" || mode === "--help" || mode === "help") {
				return (
					<div className="flex flex-col gap-2 text-sm max-w-lg">
						<div className="text-elegant-accent font-bold text-base mb-1">
							Alerts Configuration
						</div>
						<div className="text-elegant-text-secondary mb-2">
							Manage which channels receive notifications when a user submits
							the contact form.
						</div>

						<div className="flex flex-col gap-1">
							<div className="text-elegant-text-primary font-bold border-b border-elegant-border pb-1 mb-1">
								Available Modes
							</div>
							<div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-1">
								<span className="text-elegant-accent font-mono">telegram</span>
								<span className="text-elegant-text-muted">
									Send notifications via Telegram Bot only.
								</span>

								<span className="text-elegant-accent font-mono">email</span>
								<span className="text-elegant-text-muted">
									Send email notifications only.
								</span>

								<span className="text-elegant-accent font-mono">both</span>
								<span className="text-elegant-text-muted">
									Send to both Telegram and Email.
								</span>

								<span className="text-elegant-accent font-mono">off</span>
								<span className="text-elegant-text-muted">
									Disable all notifications (messages still saved).
								</span>
							</div>
						</div>

						<div className="flex flex-col gap-1 mt-2">
							<div className="text-elegant-text-primary font-bold border-b border-elegant-border pb-1 mb-1">
								Usage Examples
							</div>
							<div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-1 text-xs">
								<span className="text-elegant-accent font-mono">alerts</span>
								<span className="text-elegant-text-muted">
									View current notification setting
								</span>
								<span className="text-elegant-accent font-mono">
									alerts email
								</span>
								<span className="text-elegant-text-muted">
									Enable email alerts only
								</span>
								<span className="text-elegant-accent font-mono">
									alerts both
								</span>
								<span className="text-elegant-text-muted">
									Enable Telegram + email alerts
								</span>
								<span className="text-elegant-accent font-mono">
									alerts off
								</span>
								<span className="text-elegant-text-muted">
									Mute all notifications
								</span>
							</div>
						</div>
					</div>
				);
			}

			const validModes = ["telegram", "email", "both", "off"];

			if (!mode) {
				try {
					const res = await fetch("/api/admin/config", {
						method: "GET",
					});
					if (!res.ok) throw new Error(res.statusText);
					const config = await res.json();
					const current = config.notification_channels || "telegram,email";
					return `Current alerts: ${current.replace(",", " & ")}`;
				} catch (e: unknown) {
					return `Error fetching config: ${e instanceof Error ? e.message : "Unknown error"}`;
				}
			}

			if (!validModes.includes(mode))
				return "Usage: alerts [telegram|email|both|off]";

			let value = "";
			if (mode === "telegram") value = "telegram";
			if (mode === "email") value = "email";
			if (mode === "both") value = "telegram,email";
			if (mode === "off") value = "none";

			try {
				const res = await fetch("/api/admin/config", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ key: "notification_channels", value }),
				});

				if (!res.ok) {
					const data = await res.json();
					return `Error: ${data.error || "Failed to update settings"}`;
				}
				return `Alerts updated to: ${mode}`;
			} catch (e: unknown) {
				return `Error: ${e instanceof Error ? e.message : "Unknown error"}`;
			}
		},
	},
};
