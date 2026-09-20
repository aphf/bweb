import type { FileSystemNode } from "../fileSystem";
import type { Command } from "./types";

interface GitCommit {
	hash: string;
	fullHash: string;
	head: boolean;
	author: string;
	date: string;
	subject: string;
	body?: string;
	files?: string[];
}

const DEFAULT_COMMITS: GitCommit[] = [
	{
		hash: "a7f8c12",
		fullHash: "a7f8c129e4bfd81023a81204859a1029c78201fe",
		head: true,
		author: "Bahauddin Alam <git@bahauddin.org>",
		date: "Tue Aug 18 11:30:00 2026 +0530",
		subject: "feat: add persistent D1 VFS, crypto tools & enhanced curl client",
		body: "Implemented mkdir, touch, cp, mv, tree, openssl, base64, and github integration.",
	},
	{
		hash: "4d9e2b1",
		fullHash: "4d9e2b1849a023910c2834918239014829381023",
		head: false,
		author: "Bahauddin Alam <git@bahauddin.org>",
		date: "Tue Aug 18 04:05:00 2026 +0530",
		subject: "perf: optimize web font delivery & critical rendering path",
		body: "SubsetFonts, font-display: swap, and preloaded WOFF2 glyph subsets.",
	},
	{
		hash: "e3c19f0",
		fullHash: "e3c19f0923841029384019283401928340192834",
		head: false,
		author: "Bahauddin Alam <git@bahauddin.org>",
		date: "Tue Aug 18 02:15:00 2026 +0530",
		subject: "feat: integrate Resend transactional emails with D1 idempotency",
		body: "Configured resilient retries, markdown escaping, and multi-channel alerting.",
	},
	{
		hash: "b812a04",
		fullHash: "b812a04918239018230918230918230918230918",
		head: false,
		author: "Bahauddin Alam <git@bahauddin.org>",
		date: "Mon Aug 17 12:45:00 2026 +0530",
		subject:
			"feat: add interactive process viewer (htop) and ping latency visualizer",
		body: "Full-screen process table with memory, CPU graphs, and live ICMP animation.",
	},
	{
		hash: "92a7f33",
		fullHash: "92a7f33918230918230918230918230918230918",
		head: false,
		author: "Bahauddin Alam <git@bahauddin.org>",
		date: "Mon Aug 17 10:15:00 2026 +0530",
		subject: "ui: polish Neosphere desktop window manager and dock shortcuts",
		body: "Glassmorphic KDE-style titlebars, spotlight launcher, and smooth drag-and-drop.",
	},
	{
		hash: "10ef8c2",
		fullHash: "10ef8c2019283019283019283019283019283019",
		head: false,
		author: "Bahauddin Alam <git@bahauddin.org>",
		date: "Sun Aug 16 09:00:00 2026 +0530",
		subject: "initial commit: Neosphere OS v2.0",
		body: "Cloudflare Pages + React + Tailwind CSS edge portfolio architecture.",
	},
];

const stagedFiles = new Set<string>();
const committedFiles = new Set<string>();

const GIT_COMMITS_STORAGE_KEY = "neosphere_git_commits:v1";

const loadUserCommits = (): GitCommit[] => {
	try {
		const raw = localStorage.getItem(GIT_COMMITS_STORAGE_KEY);
		if (raw) return JSON.parse(raw);
	} catch {}
	return [];
};

const saveUserCommits = (commits: GitCommit[]) => {
	try {
		localStorage.setItem(GIT_COMMITS_STORAGE_KEY, JSON.stringify(commits));
	} catch {}
};

const getAllPublicFiles = (
	publicNode: FileSystemNode | undefined,
	prefix = "public",
): Array<{ path: string; node: FileSystemNode }> => {
	if (publicNode?.type !== "directory" || !publicNode.children) {
		return [];
	}
	const results: Array<{ path: string; node: FileSystemNode }> = [];
	for (const [name, child] of Object.entries(publicNode.children)) {
		const fullPath = `${prefix}/${name}`;
		if (child.type === "file") {
			results.push({ path: fullPath, node: child });
		} else if (child.type === "directory") {
			results.push(...getAllPublicFiles(child, fullPath));
		}
	}
	return results;
};

export const gitCommands: Record<string, Command> = {
	git: {
		description:
			"Interactive Git version control (add, commit, status, log, diff, reset)",
		usage: "git [add|commit|status|log|diff|reset|branch|remote|help]",
		execute: (args, { fileSystem, user }) => {
			const sub = args[0]?.toLowerCase();

			if (!sub || sub === "help" || sub === "--help" || sub === "-h") {
				return (
					<div className="flex flex-col gap-1 text-sm font-mono">
						<div className="text-elegant-accent font-bold">
							Git Version Control (Neosphere OS)
						</div>
						<div className="grid grid-cols-[160px_1fr] gap-x-2 gap-y-0.5 text-xs mt-1">
							<span className="text-elegant-text-primary">git status</span>
							<span className="text-elegant-text-muted">
								Show staged, unstaged, and untracked files
							</span>
							<span className="text-elegant-text-primary">
								git add &lt;path&gt; | .
							</span>
							<span className="text-elegant-text-muted">
								Stage file(s) for commit
							</span>
							<span className="text-elegant-text-primary">
								git commit -m "msg"
							</span>
							<span className="text-elegant-text-muted">
								Record staged changes to repository
							</span>
							<span className="text-elegant-text-primary">
								git reset [path]
							</span>
							<span className="text-elegant-text-muted">
								Unstage changes from the index
							</span>
							<span className="text-elegant-text-primary">git diff</span>
							<span className="text-elegant-text-muted">
								Show file diffs and inspection
							</span>
							<span className="text-elegant-text-primary">
								git log [--oneline]
							</span>
							<span className="text-elegant-text-muted">
								Show commit history logs
							</span>
							<span className="text-elegant-text-primary">git branch</span>
							<span className="text-elegant-text-muted">
								List repository branches
							</span>
							<span className="text-elegant-text-primary">git remote -v</span>
							<span className="text-elegant-text-muted">
								List configured remotes
							</span>
						</div>
					</div>
				);
			}

			const publicDir = fileSystem.home?.children?.neo?.children?.public;
			const allFiles = getAllPublicFiles(publicDir);

			if (sub === "add") {
				const targets = args.slice(1);
				if (targets.length === 0) {
					return "Nothing specified, nothing added.\nMaybe you wanted to say 'git add .'?";
				}

				if (
					targets.includes(".") ||
					targets.includes("-A") ||
					targets.includes("public")
				) {
					for (const f of allFiles) {
						stagedFiles.add(f.path);
					}
					return "";
				}

				for (const target of targets) {
					const normalized = target.replace(/^\.\//, "").replace(/^\/+/, "");
					const match = allFiles.find(
						(f) =>
							f.path === normalized ||
							f.path === `public/${normalized}` ||
							f.path.startsWith(`${normalized}/`) ||
							f.path.startsWith(`public/${normalized}/`),
					);
					if (match) {
						stagedFiles.add(match.path);
					} else {
						return `fatal: pathspec '${target}' did not match any files in workspace`;
					}
				}
				return "";
			}

			if (sub === "reset" || (sub === "restore" && args.includes("--staged"))) {
				const targets = args.filter(
					(a) => a !== "reset" && a !== "restore" && a !== "--staged",
				);
				if (targets.length === 0 || targets.includes(".")) {
					stagedFiles.clear();
					return "Unstaged all changes.";
				}

				for (const target of targets) {
					const normalized = target.replace(/^\.\//, "").replace(/^\/+/, "");
					stagedFiles.delete(normalized);
					stagedFiles.delete(`public/${normalized}`);
				}
				return "";
			}

			if (sub === "commit") {
				let message = "";
				const mIdx = args.indexOf("-m");
				if (mIdx !== -1 && args[mIdx + 1]) {
					message = args
						.slice(mIdx + 1)
						.join(" ")
						.replace(/^["']|["']$/g, "");
				}

				if (!message) {
					return "error: switch 'm' requires a value\nUsage: git commit -m <message>";
				}

				if (stagedFiles.size === 0) {
					return (
						<div className="font-mono text-sm leading-relaxed">
							<div>On branch main</div>
							<div className="text-elegant-text-muted text-xs">
								Your branch is up to date with 'origin/main'.
							</div>
							<div className="text-elegant-text-secondary text-xs mt-1">
								no changes added to commit (use "git add" to stage)
							</div>
						</div>
					);
				}

				const hash = Math.random().toString(16).substring(2, 9);
				const fullHash =
					`${hash}${Math.random().toString(16).substring(2)}${Math.random().toString(16).substring(2)}`.padEnd(
						40,
						"0",
					);
				const stagedList = Array.from(stagedFiles);

				const newCommit: GitCommit = {
					hash,
					fullHash,
					head: true,
					author: `${user} <${user}@neosphere.local>`,
					date: new Date().toUTCString(),
					subject: message,
					files: stagedList,
				};

				const existingUserCommits = loadUserCommits();
				const updated = [newCommit, ...existingUserCommits];
				saveUserCommits(updated);

				for (const f of stagedList) {
					committedFiles.add(f);
				}
				stagedFiles.clear();

				const fileCount = stagedList.length;
				return (
					<div className="flex flex-col font-mono text-xs gap-0.5">
						<div className="text-yellow-400 font-bold">
							[main {hash}] {message}
						</div>
						<div className="text-elegant-text-secondary">
							{fileCount} file{fileCount > 1 ? "s" : ""} changed,{" "}
							{fileCount * 12} insertions(+)
						</div>
						{stagedList.map((f) => (
							<div key={f} className="text-green-400">
								create mode 100644 {f}
							</div>
						))}
					</div>
				);
			}

			if (sub === "status") {
				const stagedList: string[] = [];
				const untrackedList: string[] = [];

				for (const f of allFiles) {
					if (stagedFiles.has(f.path)) {
						stagedList.push(f.path);
					} else if (!committedFiles.has(f.path)) {
						untrackedList.push(f.path);
					}
				}

				const isClean = stagedList.length === 0 && untrackedList.length === 0;

				return (
					<div className="flex flex-col gap-2 font-mono text-xs leading-relaxed">
						<div>
							On branch{" "}
							<span className="text-elegant-accent font-bold">main</span>
						</div>
						<div className="text-elegant-text-muted">
							Your branch is up to date with 'origin/main'.
						</div>

						{stagedList.length > 0 && (
							<div className="flex flex-col gap-1 mt-1">
								<div className="text-green-400 font-semibold">
									Changes to be committed:
								</div>
								<div className="text-elegant-text-muted pl-2 text-[11px]">
									(use "git reset &lt;file&gt;..." to unstage)
								</div>
								<div className="flex flex-col pl-4 text-green-400">
									{stagedList.map((f) => (
										<div key={f}>new file: {f}</div>
									))}
								</div>
							</div>
						)}

						{untrackedList.length > 0 && (
							<div className="flex flex-col gap-1 mt-1">
								<div className="text-red-400 font-semibold">
									Untracked files:
								</div>
								<div className="text-elegant-text-muted pl-2 text-[11px]">
									(use "git add &lt;file&gt;..." to include in what will be
									committed)
								</div>
								<div className="flex flex-col pl-4 text-red-400">
									{untrackedList.map((f) => (
										<div key={f}>{f}</div>
									))}
								</div>
							</div>
						)}

						{isClean && (
							<div className="text-green-400 mt-1">
								nothing to commit, working tree clean
							</div>
						)}
					</div>
				);
			}

			if (sub === "diff") {
				if (stagedFiles.size === 0) {
					return (
						<span className="text-elegant-text-muted font-mono text-xs">
							No staged or modified changes to diff. Use 'git add .' first.
						</span>
					);
				}

				return (
					<div className="flex flex-col font-mono text-xs gap-3">
						{Array.from(stagedFiles).map((filepath) => (
							<div key={filepath} className="flex flex-col">
								<div className="text-elegant-text-primary font-bold">
									diff --git a/{filepath} b/{filepath}
								</div>
								<div className="text-elegant-text-muted">
									new file mode 100644
								</div>
								<div className="text-elegant-text-muted">--- /dev/null</div>
								<div className="text-elegant-text-muted">+++ b/{filepath}</div>
								<div className="text-cyan-400">@@ -0,0 +1,3 @@</div>
								<div className="text-green-400">
									+[workspace file created in ~/public]
								</div>
								<div className="text-green-400">+{filepath}</div>
							</div>
						))}
					</div>
				);
			}

			if (sub === "branch") {
				return (
					<div className="font-mono text-sm">
						<span className="text-green-400 font-bold">* main</span>
					</div>
				);
			}

			if (sub === "remote") {
				return (
					<div className="flex flex-col font-mono text-xs">
						<div>
							origin https://github.com/bahauddin-alam/neosphere.git (fetch)
						</div>
						<div>
							origin https://github.com/bahauddin-alam/neosphere.git (push)
						</div>
					</div>
				);
			}

			if (sub === "log") {
				const oneline = args.includes("--oneline");
				let limit = 20;
				const nIdx = args.indexOf("-n");
				if (nIdx !== -1 && args[nIdx + 1]) {
					limit = parseInt(args[nIdx + 1], 10) || 20;
				}

				const userCommits = loadUserCommits();
				const allCommits = [...userCommits, ...DEFAULT_COMMITS].slice(0, limit);

				if (oneline) {
					return (
						<div className="flex flex-col font-mono text-xs gap-1">
							{allCommits.map((c, i) => (
								<div key={c.hash} className="flex gap-2">
									<span className="text-yellow-400 font-bold">{c.hash}</span>
									{i === 0 && (
										<span className="text-cyan-400 font-bold">
											(HEAD -&gt; main, origin/main)
										</span>
									)}
									<span className="text-elegant-text-primary">{c.subject}</span>
								</div>
							))}
						</div>
					);
				}

				return (
					<div className="flex flex-col font-mono text-xs gap-3">
						{allCommits.map((c, i) => (
							<div key={c.hash} className="flex flex-col gap-0.5">
								<div className="flex gap-2 items-center">
									<span className="text-yellow-400 font-bold">
										commit {c.fullHash}
									</span>
									{i === 0 && (
										<span className="text-cyan-400 font-bold">
											(HEAD -&gt; main, origin/main)
										</span>
									)}
								</div>
								<div className="text-elegant-text-secondary">
									Author: {c.author}
								</div>
								<div className="text-elegant-text-muted">Date: {c.date}</div>
								<div className="text-elegant-text-primary font-semibold mt-1 pl-4">
									{c.subject}
								</div>
								{c.body && (
									<div className="text-elegant-text-muted pl-4 text-[11px]">
										{c.body}
									</div>
								)}
							</div>
						))}
					</div>
				);
			}

			return `git: '${sub}' is not a recognized git command. See 'git --help'.`;
		},
	},
};
