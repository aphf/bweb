import { useEffect, useState } from "react";
import {
	SiC,
	SiCplusplus,
	SiCss,
	SiDart,
	SiDocker,
	SiGnubash,
	SiGo,
	SiHtml5,
	SiJavascript,
	SiKotlin,
	SiLua,
	SiOpenjdk,
	SiPhp,
	SiPython,
	SiRuby,
	SiRust,
	SiSharp,
	SiSvelte,
	SiSwift,
	SiTypescript,
	SiVuedotjs,
} from "react-icons/si";
import LoadingState from "../../components/LoadingState";
import type { Command } from "./types";

function getLanguageIcon(lang: string) {
	const l = lang.toLowerCase();
	switch (l) {
		case "typescript":
			return <SiTypescript className="inline-block text-[#3178C6]" size={13} />;
		case "javascript":
			return <SiJavascript className="inline-block text-[#F7DF1E]" size={13} />;
		case "python":
			return <SiPython className="inline-block text-[#3776AB]" size={13} />;
		case "rust":
			return <SiRust className="inline-block text-[#DEA584]" size={13} />;
		case "go":
			return <SiGo className="inline-block text-[#00ADD8]" size={13} />;
		case "html":
			return <SiHtml5 className="inline-block text-[#E34F26]" size={13} />;
		case "css":
			return <SiCss className="inline-block text-[#1572B6]" size={13} />;
		case "c++":
		case "cpp":
			return <SiCplusplus className="inline-block text-[#00599C]" size={13} />;
		case "c":
			return <SiC className="inline-block text-[#A8B9CC]" size={13} />;
		case "c#":
		case "csharp":
			return <SiSharp className="inline-block text-[#239120]" size={13} />;
		case "java":
			return <SiOpenjdk className="inline-block text-[#ED8B00]" size={13} />;
		case "php":
			return <SiPhp className="inline-block text-[#777BB4]" size={13} />;
		case "ruby":
			return <SiRuby className="inline-block text-[#CC342D]" size={13} />;
		case "swift":
			return <SiSwift className="inline-block text-[#F05138]" size={13} />;
		case "kotlin":
			return <SiKotlin className="inline-block text-[#7F52FF]" size={13} />;
		case "dart":
			return <SiDart className="inline-block text-[#0175C2]" size={13} />;
		case "shell":
		case "bash":
			return <SiGnubash className="inline-block text-[#4EAA25]" size={13} />;
		case "lua":
			return <SiLua className="inline-block text-[#000080]" size={13} />;
		case "vue":
			return <SiVuedotjs className="inline-block text-[#4FC08D]" size={13} />;
		case "svelte":
			return <SiSvelte className="inline-block text-[#FF3E00]" size={13} />;
		case "dockerfile":
			return <SiDocker className="inline-block text-[#2496ED]" size={13} />;
		default:
			return (
				<span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
			);
	}
}

interface GitHubData {
	user: {
		login: string;
		name: string | null;
		avatar_url: string;
		bio: string | null;
		html_url: string;
		location: string | null;
		company: string | null;
		blog: string | null;
		public_repos: number;
		followers: number;
		following: number;
		created_at: string;
		updated_at: string;
		twitter_username: string | null;
	};
	repos: Array<{
		id: number;
		name: string;
		html_url: string;
		language: string | null;
		stargazers_count: number;
		forks_count: number;
		description: string | null;
	}>;
}

const profileCache = new Map<string, GitHubData>();

function StaticGitHubProfile({ data }: { data: GitHubData }) {
	const { user: u, repos } = data;

	const createdDate = new Date(u.created_at).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
	const updatedDate = new Date(u.updated_at).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});

	const yearsActive = Math.max(
		1,
		new Date().getFullYear() - new Date(u.created_at).getFullYear(),
	);

	const langCounts: Record<string, number> = {};
	let totalCounted = 0;
	if (Array.isArray(repos)) {
		for (const r of repos) {
			if (r.language) {
				langCounts[r.language] = (langCounts[r.language] || 0) + 1;
				totalCounted++;
			}
		}
	}
	const topLanguages = Object.entries(langCounts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 4)
		.map(([name, count]) => ({
			name,
			percent: Math.round((count / (totalCounted || 1)) * 100),
		}));

	return (
		<div className="flex flex-col gap-3 font-mono text-sm max-w-2xl">
			<div className="flex items-start gap-3 border-b border-elegant-border pb-3">
				{u.avatar_url && (
					<img
						src={u.avatar_url}
						alt={u.login}
						className="w-12 h-12 rounded-full border border-elegant-border object-cover shrink-0 mt-0.5 shadow-xs"
						loading="lazy"
					/>
				)}
				<div className="flex flex-col flex-1 min-w-0">
					<div className="text-elegant-accent font-bold text-base">
						{u.name ? `${u.name} (${u.login})` : u.login}
					</div>
					{u.bio && (
						<div className="text-elegant-text-secondary text-xs mt-0.5 italic">
							"{u.bio}"
						</div>
					)}
					<a
						href={u.html_url}
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs text-elegant-accent hover:underline mt-1 truncate"
					>
						{u.html_url}
					</a>
				</div>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs text-elegant-text-secondary">
				<div>
					<span className="text-elegant-text-muted">Location: </span>
					<span className="text-elegant-text-primary">
						{u.location ? (
							u.location
						) : (
							<span className="text-elegant-text-muted italic">null</span>
						)}
					</span>
				</div>
				<div>
					<span className="text-elegant-text-muted">Company: </span>
					<span className="text-elegant-text-primary">
						{u.company ? (
							u.company
						) : (
							<span className="text-elegant-text-muted italic">null</span>
						)}
					</span>
				</div>
				<div>
					<span className="text-elegant-text-muted">Blog: </span>
					<span className="text-elegant-text-primary">
						{u.blog ? (
							<a
								href={u.blog.startsWith("http") ? u.blog : `https://${u.blog}`}
								target="_blank"
								rel="noopener noreferrer"
								className="text-elegant-accent hover:underline"
							>
								{u.blog}
							</a>
						) : (
							<span className="text-elegant-text-muted italic">null</span>
						)}
					</span>
				</div>
				<div>
					<span className="text-elegant-text-muted">Public Repos: </span>
					<span className="text-elegant-accent font-bold">
						{u.public_repos ?? 0}
					</span>
				</div>
				<div>
					<span className="text-elegant-text-muted">Followers: </span>
					<span className="text-elegant-accent font-bold">
						{u.followers ?? 0}
					</span>
				</div>
				<div>
					<span className="text-elegant-text-muted">Following: </span>
					<span className="text-elegant-accent font-bold">
						{u.following ?? 0}
					</span>
				</div>
				<div>
					<span className="text-elegant-text-muted">Created: </span>
					<span className="text-elegant-text-primary">
						{createdDate} ({yearsActive}y)
					</span>
				</div>
				<div>
					<span className="text-elegant-text-muted">Last Active: </span>
					<span className="text-elegant-text-primary">{updatedDate}</span>
				</div>
				<div>
					<span className="text-elegant-text-muted">Twitter/X: </span>
					<span className="text-elegant-text-primary">
						{u.twitter_username ? (
							`@${u.twitter_username}`
						) : (
							<span className="text-elegant-text-muted italic">null</span>
						)}
					</span>
				</div>
			</div>

			{topLanguages.length > 0 && (
				<div className="flex items-center gap-2 flex-wrap text-xs border-t border-elegant-border pt-2.5">
					<span className="text-elegant-text-muted font-medium">
						Primary Languages:
					</span>
					{topLanguages.map((l) => (
						<div
							key={l.name}
							className="flex items-center gap-1.5 bg-elegant-card px-2.5 py-1 rounded-md border border-elegant-border shadow-xs"
						>
							{getLanguageIcon(l.name)}
							<span className="text-elegant-text-primary font-medium">
								{l.name}
							</span>
							<span className="text-elegant-text-muted text-[11px]">
								({l.percent}%)
							</span>
						</div>
					))}
				</div>
			)}

			{Array.isArray(repos) && repos.length > 0 && (
				<div className="flex flex-col gap-2 mt-1 border-t border-elegant-border pt-2.5">
					<div className="text-elegant-text-primary font-bold text-xs">
						Recent Public Repositories:
					</div>
					<div className="flex flex-col gap-2">
						{repos.slice(0, 5).map((r) => (
							<div
								key={r.id}
								className="flex flex-col text-xs bg-elegant-card p-2.5 rounded-md border border-elegant-border shadow-xs"
							>
								<div className="flex justify-between items-center">
									<a
										href={r.html_url}
										target="_blank"
										rel="noopener noreferrer"
										className="text-elegant-accent font-bold hover:underline"
									>
										{r.name}
									</a>
									<div className="flex items-center gap-3 text-elegant-text-muted text-[11px]">
										{r.language && (
											<span className="flex items-center gap-1 font-medium">
												{getLanguageIcon(r.language)}
												{r.language}
											</span>
										)}
										<span>★ {r.stargazers_count}</span>
										<span>⑂ {r.forks_count}</span>
									</div>
								</div>
								{r.description && (
									<div className="text-elegant-text-muted mt-1 truncate">
										{r.description}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

function GitHubInspector({
	username,
	entryId,
	updateHistory,
}: {
	username: string;
	entryId?: string;
	updateHistory?: (id: string, node: React.ReactNode) => void;
}) {
	const cached = profileCache.get(username.toLowerCase());
	const [state, setState] = useState<{
		loading: boolean;
		error: string | null;
		data: GitHubData | null;
	}>({
		loading: !cached,
		error: null,
		data: cached || null,
	});

	useEffect(() => {
		if (cached) return;

		const controller = new AbortController();

		Promise.all([
			fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
				signal: controller.signal,
			}),
			fetch(
				`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=30`,
				{ signal: controller.signal },
			),
		])
			.then(([userRes, reposRes]) => {
				if (controller.signal.aborted) return;

				if (userRes.status === 404) {
					const errorMsg = `github: user '${username}' not found`;
					if (!controller.signal.aborted) {
						setState({ loading: false, error: errorMsg, data: null });
						if (entryId && updateHistory) {
							updateHistory(
								entryId,
								<div className="font-mono text-sm text-red-400">
									{errorMsg}
								</div>,
							);
						}
					}
					return;
				}
				if (userRes.status === 403) {
					const errorMsg =
						"github: API rate limit exceeded. Please try again in a few minutes.";
					if (!controller.signal.aborted) {
						setState({ loading: false, error: errorMsg, data: null });
						if (entryId && updateHistory) {
							updateHistory(
								entryId,
								<div className="font-mono text-sm text-red-400">
									{errorMsg}
								</div>,
							);
						}
					}
					return;
				}
				if (!userRes.ok) {
					const errorMsg = `github: error fetching profile (${userRes.statusText})`;
					if (!controller.signal.aborted) {
						setState({ loading: false, error: errorMsg, data: null });
						if (entryId && updateHistory) {
							updateHistory(
								entryId,
								<div className="font-mono text-sm text-red-400">
									{errorMsg}
								</div>,
							);
						}
					}
					return;
				}

				return Promise.all([
					userRes.json(),
					reposRes.ok ? reposRes.json() : Promise.resolve([]),
				]).then(([u, repos]) => {
					if (controller.signal.aborted) return;
					const fetchedData: GitHubData = { user: u, repos };

					profileCache.set(username.toLowerCase(), fetchedData);

					if (!controller.signal.aborted) {
						setState({
							loading: false,
							error: null,
							data: fetchedData,
						});
						if (entryId && updateHistory) {
							updateHistory(
								entryId,
								<StaticGitHubProfile data={fetchedData} />,
							);
						}
					}
				});
			})
			.catch((e: unknown) => {
				if (
					!controller.signal.aborted &&
					!(e instanceof DOMException && e.name === "AbortError")
				) {
					const errorMsg = `github: error fetching data: ${e instanceof Error ? e.message : String(e)}`;
					setState({
						loading: false,
						error: errorMsg,
						data: null,
					});
					if (entryId && updateHistory) {
						updateHistory(
							entryId,
							<div className="font-mono text-sm text-red-400">{errorMsg}</div>,
						);
					}
				}
			});

		return () => {
			controller.abort();
		};
	}, [username, cached, entryId, updateHistory]);

	if (state.loading) {
		return (
			<div className="py-1">
				<LoadingState
					label={`Inspecting @${username} on GitHub…`}
					variant="Orbit"
				/>
			</div>
		);
	}

	if (state.error) {
		return <div className="font-mono text-sm text-red-400">{state.error}</div>;
	}

	if (!state.data) return null;

	return <StaticGitHubProfile data={state.data} />;
}

export const portfolioCommands: Record<string, Command> = {
	skills: {
		description: "Display technical skills and stack overview",
		execute: () => {
			const skillCategories = [
				{
					category: "Frontend Development",
					items: [
						{ name: "React / Next.js", level: 95, exp: "Advanced" },
						{ name: "TypeScript", level: 90, exp: "Advanced" },
						{ name: "Tailwind CSS", level: 98, exp: "Master" },
						{ name: "Framer Motion", level: 88, exp: "Proficient" },
					],
				},
				{
					category: "Backend & Systems",
					items: [
						{ name: "Node.js / Express", level: 90, exp: "Advanced" },
						{ name: "Python / FastAPI", level: 85, exp: "Proficient" },
						{ name: "Go / Gin", level: 80, exp: "Proficient" },
						{ name: "Rust / C++", level: 75, exp: "Intermediate" },
					],
				},
				{
					category: "Cloud, Edge & DevOps",
					items: [
						{
							name: "Cloudflare (Workers, D1, KV)",
							level: 92,
							exp: "Advanced",
						},
						{
							name: "AWS (S3, Lambda, CloudFront)",
							level: 82,
							exp: "Proficient",
						},
						{ name: "Linux / Shell Scripting", level: 90, exp: "Advanced" },
						{ name: "Git / CI/CD Pipelines", level: 92, exp: "Advanced" },
					],
				},
			];

			const renderBar = (level: number) => {
				const totalBars = 20;
				const filledBars = Math.round((level / 100) * totalBars);
				const emptyBars = totalBars - filledBars;
				return `[${"█".repeat(filledBars)}${"░".repeat(emptyBars)}] ${level}%`;
			};

			return (
				<div className="flex flex-col gap-4 font-mono text-sm max-w-2xl">
					<div className="text-elegant-accent font-bold text-base border-b border-elegant-border pb-1">
						⚡ Technical Skills & Proficiencies
					</div>
					{skillCategories.map((cat) => (
						<div key={cat.category} className="flex flex-col gap-1.5">
							<div className="text-elegant-text-primary font-bold text-xs uppercase tracking-wider">
								{cat.category}
							</div>
							<div className="grid grid-cols-1 gap-1 pl-2">
								{cat.items.map((item) => (
									<div
										key={item.name}
										className="grid grid-cols-[160px_1fr_100px] gap-2 items-center text-xs"
									>
										<span className="text-elegant-text-secondary font-medium">
											{item.name}
										</span>
										<span className="text-elegant-accent font-mono">
											{renderBar(item.level)}
										</span>
										<span className="text-elegant-text-muted text-right">
											{item.exp}
										</span>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			);
		},
	},
	tech: {
		description: "Alias for skills",
		execute: (args, context) => portfolioCommands.skills.execute(args, context),
	},
	github: {
		description:
			"Inspect GitHub profile stats, creation date, and top repositories",
		usage: "github [username]",
		execute: (args, { entryId, updateHistory }) => {
			const username = args[0] || "bahauddin-alam";
			const cached = profileCache.get(username.toLowerCase());
			if (cached) {
				return <StaticGitHubProfile data={cached} />;
			}
			return (
				<GitHubInspector
					username={username}
					entryId={entryId}
					updateHistory={updateHistory}
				/>
			);
		},
	},
	send: {
		description: "Send a direct message from the CLI",
		usage:
			'send --name "Name" --email "email" --msg "message" OR send [name] [email] [message...]',
		execute: async (args) => {
			if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
				return (
					<div className="flex flex-col gap-1 text-sm font-mono max-w-lg">
						<div className="text-elegant-accent font-bold">
							Send Direct Message
						</div>
						<div className="text-xs text-elegant-text-secondary">Usage:</div>
						<div className="text-xs text-elegant-accent pl-2">
							send --name "Jane Doe" --email "jane@example.com" --msg "Loved
							your portfolio!"
						</div>
						<div className="text-xs text-elegant-accent pl-2">
							send "Jane Doe" "jane@example.com" "Loved your portfolio!"
						</div>
					</div>
				);
			}

			let name = "";
			let email = "";
			let message = "";

			for (let i = 0; i < args.length; i++) {
				if ((args[i] === "--name" || args[i] === "-n") && args[i + 1]) {
					name = args[i + 1];
					i++;
				} else if ((args[i] === "--email" || args[i] === "-e") && args[i + 1]) {
					email = args[i + 1];
					i++;
				} else if ((args[i] === "--msg" || args[i] === "-m") && args[i + 1]) {
					message = args.slice(i + 1).join(" ");
					break;
				}
			}

			if (!name && !email && !message) {
				if (args.length >= 3) {
					name = args[0];
					email = args[1];
					message = args.slice(2).join(" ");
				} else if (args.length === 1) {
					return "send: missing recipient email and name. Use: send --name 'Name' --email 'email' --msg 'message'";
				}
			}

			if (!name || !email || !message) {
				return "send: required fields missing. Usage: send --name 'Name' --email 'email' --msg 'message'";
			}

			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				return `send: invalid email format '${email}'`;
			}

			try {
				const res = await fetch("/api/contact", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ name, email, message }),
				});

				if (!res.ok) {
					const err = await res.json();
					return `send: error sending message: ${err.error || res.statusText}`;
				}

				return (
					<div className="flex flex-col gap-1 font-mono text-sm bg-green-950/30 border border-green-500/30 p-3 rounded max-w-lg">
						<div className="text-green-400 font-bold flex items-center gap-2">
							✓ Message successfully delivered!
						</div>
						<div className="text-xs text-elegant-text-secondary mt-1 grid grid-cols-[70px_1fr] gap-x-2">
							<span className="text-elegant-text-muted">From:</span>
							<span className="text-elegant-text-primary">
								{name} &lt;{email}&gt;
							</span>
							<span className="text-elegant-text-muted">Message:</span>
							<span className="text-elegant-text-primary italic">
								"{message}"
							</span>
							<span className="text-elegant-text-muted">Status:</span>
							<span className="text-green-400">
								Persisted to D1 & dispatched to notifications
							</span>
						</div>
					</div>
				);
			} catch (e: unknown) {
				return `send: network error: ${e instanceof Error ? e.message : String(e)}`;
			}
		},
	},
	msg: {
		description: "Alias for send",
		execute: (args, context) => portfolioCommands.send.execute(args, context),
	},
	gallery: {
		description: "Open Gallery",
		execute: (_args, { navigate }) => {
			if (navigate) {
				navigate("/gallery");
				return "";
			}
			return "Navigation not supported";
		},
	},
	about: {
		description: "Open About page",
		execute: (_args, { navigate }) => {
			if (navigate) {
				navigate("/about");
				return "";
			}
			return "Navigation not supported";
		},
	},
	contact: {
		description: "Open Contact page",
		execute: (_args, { navigate }) => {
			if (navigate) {
				navigate("/contact");
				return "";
			}
			return "Navigation not supported";
		},
	},
	projects: {
		description: "Open Projects page",
		execute: (_args, { navigate }) => {
			if (navigate) {
				navigate("/projects");
				return "";
			}
			return "Navigation not supported";
		},
	},
	notes: {
		description: "View visitor notes",
		execute: (_args, { navigate }) => {
			if (navigate) {
				navigate("/notes");
				return "";
			}
			return "Error: Navigation not supported";
		},
	},
};
