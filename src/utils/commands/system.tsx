import React, { Suspense } from "react";
import { applyTheme, getInitialTheme } from "../../hooks/useTheme";
import type { FileSystemNode } from "../fileSystem";
import {
	getPublicRelativePath,
	isPathInPublic,
	resolvePath,
	resolvePathArray,
	writeFile,
} from "../fileSystemUtils";
import type { Command } from "./types";

const LazyHtop = React.lazy(() =>
	import("../../components/Htop").then((m) => ({ default: m.Htop })),
);
const LazyNano = React.lazy(() =>
	import("../../components/Nano").then((m) => ({ default: m.Nano })),
);
const LazyTerminalExit = React.lazy(() =>
	import("../../components/TerminalExit").then((m) => ({
		default: m.TerminalExit,
	})),
);

export const systemCommands: Record<string, Command> = {
	theme: {
		description: "Toggle or set the site theme (light, dark, toggle)",
		usage: "theme [light|dark|toggle]",
		execute: (args) => {
			const current = getInitialTheme();
			const mode = args[0]?.toLowerCase();

			if (!mode || mode === "toggle") {
				const next = current === "dark" ? "light" : "dark";
				applyTheme(next);
				return `Switched theme to ${next} mode.`;
			}

			if (mode === "light" || mode === "dark") {
				applyTheme(mode as "light" | "dark");
				return `Switched theme to ${mode} mode.`;
			}

			return "Usage: theme [light|dark|toggle]";
		},
	},
	whoami: {
		description: "Print current user",
		execute: (_args, { user }) => user,
	},
	date: {
		description: "Print current date",
		execute: () => new Date().toString(),
	},
	echo: {
		description: "Display a line of text",
		execute: (args) => args.join(" "),
	},
	clear: {
		description: "Clear the terminal output",
		execute: () => "",
	},
	fastfetch: {
		description: "Display system information (fast)",
		execute: () => {
			const baseDays = 45;
			const baseHours = 10;
			const baseMins = 38;

			const now = new Date();
			const extraMins = now.getMinutes();
			const extraHours = now.getHours() % 12;

			const totalMins = baseMins + extraMins;
			const totalHours = baseHours + extraHours + Math.floor(totalMins / 60);
			const totalDays = baseDays + Math.floor(totalHours / 24);

			const finalMins = totalMins % 60;
			const finalHours = totalHours % 24;

			const uptimeStr = `${totalDays} days, ${finalHours} hours, ${finalMins} mins`;

			const memUsed = 4.2;
			const memTotal = 16.0;
			const memPercent = Math.round((memUsed / memTotal) * 100);

			return (
				<div className="flex gap-6 font-mono text-sm leading-tight">
					<div className="hidden md:block text-elegant-accent whitespace-pre select-none shrink-0 text-xs leading-tight">
						{`                   -\`
                  .o+\`
                 \`ooo/
                \`+oooo:
                \`+oooooo:
                -+oooooo+:
              \`/:-:++oooo+:
             \`/++++/+++++++:
            \`/++++++++++++++:
           \`/+++ooooooooooooo/\`
          ./ooosssso++osssssso+\`
         .oossssso-\`\`\`\`/ossssss+\`
        -osssssso.      :ssssssso.
       :osssssss/        osssso+++.
      /ossssssss/        +ssssooo/-
    \`/ossssso+/:-        -:/+osssso+-
   \`+sso+:-\`                 \`.-/+oso:
  \`++:.                           \`-/+/
  .\`                                 \`/`}
					</div>

					<div className="flex flex-col justify-center space-y-0 text-elegant-text-primary flex-1 min-w-0 text-sm">
						<div className="mb-0.5">
							<span className="text-elegant-accent font-bold">
								neo@neosphere
							</span>
						</div>
						<div className="text-elegant-accent mb-1">{"─".repeat(17)}</div>

						<div>
							<span className="text-elegant-accent font-bold">OS:</span>{" "}
							<span className="text-elegant-text-secondary">
								Neosphere OS v2.0 LTS x86_64
							</span>
						</div>
						<div>
							<span className="text-elegant-accent font-bold">Host:</span>{" "}
							<span className="text-elegant-text-secondary">
								Cloudflare Workers (Virtual)
							</span>
						</div>
						<div>
							<span className="text-elegant-accent font-bold">Kernel:</span>{" "}
							<span className="text-elegant-text-secondary">
								6.8.0-matrix-generic
							</span>
						</div>
						<div>
							<span className="text-elegant-accent font-bold">Uptime:</span>{" "}
							<span className="text-elegant-text-secondary">{uptimeStr}</span>
						</div>
						<div>
							<span className="text-elegant-accent font-bold">Packages:</span>{" "}
							<span className="text-elegant-text-secondary">
								1337 (pacman), 42 (cargo)
							</span>
						</div>
						<div>
							<span className="text-elegant-accent font-bold">Shell:</span>{" "}
							<span className="text-elegant-text-secondary">bash 5.2.21</span>
						</div>
						<div>
							<span className="text-elegant-accent font-bold">Terminal:</span>{" "}
							<span className="text-elegant-text-secondary">/dev/pts/0</span>
						</div>
						<div>
							<span className="text-elegant-accent font-bold">CPU:</span>{" "}
							<span className="text-elegant-text-secondary">
								8 x Virtual Core @ 3.40 GHz
							</span>
						</div>
						<div>
							<span className="text-elegant-accent font-bold">GPU:</span>{" "}
							<span className="text-elegant-text-secondary">
								WebGL 2.0 Renderer
							</span>
						</div>
						<div>
							<span className="text-elegant-accent font-bold">Memory:</span>{" "}
							<span className="text-elegant-text-secondary">
								{memUsed.toFixed(2)} GiB / {memTotal.toFixed(2)} GiB (
								{memPercent}%)
							</span>
						</div>
						<div>
							<span className="text-elegant-accent font-bold">Disk (/):</span>{" "}
							<span className="text-elegant-text-secondary">
								40.11 GiB / 95.82 GiB (42%)
							</span>
						</div>
						<div>
							<span className="text-elegant-accent font-bold">Local IP:</span>{" "}
							<span className="text-elegant-text-secondary">10.0.0.100</span>
						</div>
						<div>
							<span className="text-elegant-accent font-bold">Locale:</span>{" "}
							<span className="text-elegant-text-secondary">en_US.UTF-8</span>
						</div>

						<div className="mt-2 flex gap-1">
							<div className="w-6 h-3 bg-gray-800"></div>
							<div className="w-6 h-3 bg-red-600"></div>
							<div className="w-6 h-3 bg-green-600"></div>
							<div className="w-6 h-3 bg-yellow-600"></div>
							<div className="w-6 h-3 bg-blue-600"></div>
							<div className="w-6 h-3 bg-purple-600"></div>
							<div className="w-6 h-3 bg-cyan-600"></div>
							<div className="w-6 h-3 bg-gray-400"></div>
						</div>
						<div className="flex gap-1">
							<div className="w-6 h-3 bg-gray-600"></div>
							<div className="w-6 h-3 bg-red-500"></div>
							<div className="w-6 h-3 bg-green-500"></div>
							<div className="w-6 h-3 bg-yellow-400"></div>
							<div className="w-6 h-3 bg-blue-500"></div>
							<div className="w-6 h-3 bg-purple-500"></div>
							<div className="w-6 h-3 bg-cyan-400"></div>
							<div className="w-6 h-3 bg-white"></div>
						</div>
					</div>
				</div>
			);
		},
	},
	neofetch: {
		description: "Display system information (alias for fastfetch)",
		execute: (_args, context) => {
			return systemCommands.fastfetch.execute([], context);
		},
	},
	htop: {
		description: 'Interactive process viewer (Simulated) - Press "q" to quit',
		execute: (_args, { setFullScreen }) => {
			if (setFullScreen) {
				setFullScreen(
					<Suspense
						fallback={
							<div
								className="p-4 text-elegant-text-muted font-mono"
								aria-live="polite"
							>
								Loading Htop…
							</div>
						}
					>
						<LazyHtop onExit={() => setFullScreen(null)} />
					</Suspense>,
				);
				return "";
			}
			return "Error: Fullscreen mode not supported";
		},
	},
	nano: {
		description: "Nano text editor",
		usage: "nano <filename>",
		execute: async (
			args,
			{ setFullScreen, currentPath, fileSystem, setFileSystem },
		) => {
			const filenameArg = args.length > 0 ? args[0] : undefined;

			const isVisitorNote = (name: string) => {
				return (
					currentPath[currentPath.length - 1] === "visitors_notes" ||
					name?.includes("visitors_notes/")
				);
			};

			const loadFilename = filenameArg;
			let contentToEdit = "";

			if (loadFilename) {
				if (isVisitorNote(loadFilename)) {
					const cleanName = loadFilename.includes("visitors_notes/")
						? loadFilename.split("visitors_notes/")[1]
						: loadFilename;
					if (cleanName) {
						try {
							const res = await fetch(`/api/notes/${cleanName}`);
							if (res.ok) {
								const data = await res.json();
								contentToEdit = data.content;
							}
						} catch {}
					}
				} else {
					const node = resolvePath(fileSystem, currentPath, loadFilename);
					contentToEdit =
						node && node.type === "file" ? node.content || "" : "";
				}
			}

			if (setFullScreen) {
				setFullScreen(
					<Suspense
						fallback={
							<div
								className="p-4 text-elegant-text-muted font-mono"
								aria-live="polite"
							>
								Loading Nano…
							</div>
						}
					>
						<LazyNano
							filename={loadFilename}
							initialContent={contentToEdit}
							onSaveAs={async (
								newFilename,
								newContent,
								commitMsg,
								authorName,
							) => {
								let targetIsVisitor = false;
								let cleanName = newFilename;

								if (currentPath[currentPath.length - 1] === "visitors_notes") {
									targetIsVisitor = true;
								} else if (newFilename.includes("visitors_notes/")) {
									targetIsVisitor = true;
									cleanName = newFilename.split("visitors_notes/")[1];
								}

								if (targetIsVisitor) {
									const checkRes = await fetch(`/api/notes/${cleanName}`);
									const exists = checkRes.status === 200;

									let res: Response;
									if (exists) {
										res = await fetch(`/api/notes/${cleanName}`, {
											method: "PUT",
											headers: { "Content-Type": "application/json" },
											body: JSON.stringify({
												content: newContent,
												commit_msg: commitMsg,
												author_name: authorName,
											}),
										});
									} else {
										res = await fetch("/api/notes", {
											method: "POST",
											headers: { "Content-Type": "application/json" },
											body: JSON.stringify({
												filename: cleanName,
												content: newContent,
												commit_msg: commitMsg,
												author_name: authorName,
											}),
										});
									}

									if (!res.ok) {
										const err = await res.json();
										throw new Error(err.error || res.statusText);
									}
									if (setFileSystem) {
										setFileSystem((prev: Record<string, FileSystemNode>) => {
											const updated = structuredClone(prev);
											const visitorsDir =
												updated.home?.children?.neo?.children?.visitors_notes;
											if (visitorsDir?.children) {
												visitorsDir.children[cleanName] = {
													type: "file",
													content: newContent,
													size: newContent.length,
													lastModified: Date.now(),
													author: authorName || "visitor",
												};
											}
											return updated;
										});
									}
								} else {
									const targetArray = resolvePathArray(
										currentPath,
										newFilename,
									);
									const isPublic = isPathInPublic(targetArray);

									if (setFileSystem) {
										const newFS = writeFile(
											fileSystem,
											currentPath,
											newFilename,
											newContent,
											authorName || "neo",
										);
										setFileSystem(newFS);
									}

									if (isPublic) {
										const relPath = getPublicRelativePath(targetArray);
										if (relPath) {
											try {
												await fetch("/api/public_fs", {
													method: "POST",
													headers: { "Content-Type": "application/json" },
													body: JSON.stringify({
														path: relPath,
														type: "file",
														content: newContent,
														author: authorName || "neo",
													}),
												});
											} catch (e) {
												console.warn("D1 save warning:", e);
											}
										}
									}
								}
							}}
							onExit={() => setFullScreen(null)}
						/>
					</Suspense>,
				);
				return "";
			}
			return "Error: Fullscreen mode not supported";
		},
	},
	exit: {
		description: "Exit and close the terminal session",
		usage: "exit",
		execute: (_args, { closeTerminal, setIsInputVisible, resetTerminal }) => {
			setIsInputVisible(false);
			return (
				<Suspense
					fallback={
						<div
							className="text-elegant-text-muted font-mono"
							aria-live="polite"
						>
							Closing session…
						</div>
					}
				>
					<LazyTerminalExit
						onClose={closeTerminal}
						onDone={() => setIsInputVisible(true)}
						onReset={resetTerminal}
					/>
				</Suspense>
			);
		},
	},
	quit: {
		description: "Exit and close the terminal session (alias for exit)",
		usage: "quit",
		execute: (args, context) => systemCommands.exit.execute(args, context),
	},
};
