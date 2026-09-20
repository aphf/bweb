import { useEffect, useState } from "react";
import LoadingState from "../../components/LoadingState";
import type { Command } from "./types";

// Mirror src/parse.ts shapes from x-profile-api — local copy to avoid cross-repo import
interface XStats {
	tweets: number | null;
	following: number | null;
	followers: number | null;
}

interface XProfile {
	id: string | null;
	handle: string | null;
	name: string | null;
	bio: string | null;
	location: string | null;
	avatar: string | null;
	avatarSmall: string | null;
	banner: string | null;
	url: string | null;
	joined: string | null;
	verified: boolean;
	stats: XStats;
}

interface XTweet {
	id: string;
	url: string | null;
	text: string | null;
	createdAt: string | null;
	pinned: boolean;
	replies: number | null;
	likes: number | null;
	retweets: number | null;
	quotes: number | null;
	views: number | null;
	images: string[];
	quotedUrl: string | null;
}

interface XData {
	profile: XProfile;
	tweets: XTweet[];
	meta?: { source: string; stale: boolean; cachedAt: string };
}

const xCache = new Map<string, XData>();

function sanitizeHandle(raw: string): string {
	let v = raw.trim();
	v = v.replace(/^@+/, "");
	v = v.replace(/^https?:\/\/(www\.)?(x\.com|twitter\.com)\//i, "");
	v = v.split("/")[0].split("?")[0].split("#")[0];
	return v;
}

function fmtDate(iso: string | null): string {
	if (!iso) return "—";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	return d.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function fmtNum(n: number | null): string {
	if (n === null || n === undefined) return "—";
	return new Intl.NumberFormat("en-US").format(n);
}

function StaticXProfile({
	data,
	fallbackHandle,
}: {
	data: XData;
	fallbackHandle: string;
}) {
	const p = data.profile;
	const handle = p.handle || fallbackHandle;
	const displayName = p.name ? `${p.name} (@${handle})` : `@${handle}`;
	const profileUrl = `https://x.com/${handle}`;
	const joinedDate = fmtDate(p.joined);

	return (
		<div className="flex flex-col gap-3 font-mono text-sm max-w-2xl">
			{p.banner && (
				<div className="w-full h-24 rounded-md overflow-hidden border border-elegant-border shadow-xs">
					<img
						src={p.banner}
						alt={`${handle} banner`}
						className="w-full h-full object-cover"
						loading="lazy"
					/>
				</div>
			)}

			<div className="flex items-start gap-3 border-b border-elegant-border pb-3">
				{p.avatar || p.avatarSmall ? (
					<img
						src={p.avatar || p.avatarSmall || ""}
						alt={handle}
						className="w-12 h-12 rounded-full border border-elegant-border object-cover shrink-0 mt-0.5 shadow-xs"
						loading="lazy"
					/>
				) : (
					<div className="w-12 h-12 rounded-full border border-elegant-border bg-elegant-card flex items-center justify-center text-elegant-text-muted font-bold text-lg shrink-0 mt-0.5 shadow-xs">
						{handle.charAt(0).toUpperCase()}
					</div>
				)}
				<div className="flex flex-col flex-1 min-w-0">
					<div className="flex items-center gap-2 flex-wrap">
						<span className="text-elegant-accent font-bold text-base">
							{displayName}
						</span>
						{p.verified && (
							<span
								className="inline-flex items-center shrink-0"
								title="Verified"
								role="img"
								aria-label="Verified"
							>
								<svg
									viewBox="0 0 22 22"
									xmlns="http://www.w3.org/2000/svg"
									className="w-[18px] h-[18px] shrink-0"
									aria-hidden="true"
								>
									<path
										d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
										fill="#1d9bf0"
									/>
								</svg>
							</span>
						)}
					</div>
					{p.bio && (
						<div className="text-elegant-text-secondary text-xs mt-0.5 italic whitespace-pre-wrap break-words">
							{p.bio}
						</div>
					)}
					<a
						href={profileUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="text-xs text-elegant-accent hover:underline mt-1 truncate"
					>
						{profileUrl}
					</a>
				</div>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs text-elegant-text-secondary">
				<div>
					<span className="text-elegant-text-muted">Location: </span>
					<span className="text-elegant-text-primary">
						{p.location ? (
							p.location
						) : (
							<span className="text-elegant-text-muted italic">null</span>
						)}
					</span>
				</div>
				<div>
					<span className="text-elegant-text-muted">Followers: </span>
					<span className="text-elegant-accent font-bold">
						{fmtNum(p.stats.followers)}
					</span>
				</div>
				<div>
					<span className="text-elegant-text-muted">Following: </span>
					<span className="text-elegant-accent font-bold">
						{fmtNum(p.stats.following)}
					</span>
				</div>
				<div>
					<span className="text-elegant-text-muted">Tweets: </span>
					<span className="text-elegant-accent font-bold">
						{fmtNum(p.stats.tweets)}
					</span>
				</div>
				<div>
					<span className="text-elegant-text-muted">Joined: </span>
					<span className="text-elegant-text-primary">{joinedDate}</span>
				</div>
				<div>
					<span className="text-elegant-text-muted">Verified: </span>
					<span className="text-elegant-text-primary">
						{p.verified ? "True" : "False"}
					</span>
				</div>
			</div>
		</div>
	);
}

function XInspector({
	username,
	fresh,
	entryId,
	updateHistory,
}: {
	username: string;
	fresh?: boolean;
	entryId?: string;
	updateHistory?: (id: string, node: React.ReactNode) => void;
}) {
	const cached = xCache.get(username.toLowerCase());
	const [state, setState] = useState<{
		loading: boolean;
		error: string | null;
		data: XData | null;
	}>({
		loading: !cached,
		error: null,
		data: cached || null,
	});

	useEffect(() => {
		if (cached) return;

		const controller = new AbortController();

		fetch(
			`/api/x?username=${encodeURIComponent(username)}${fresh ? "&fresh=1" : ""}`,
			{ signal: controller.signal },
		)
			.then(async (res) => {
				if (controller.signal.aborted) return;

				let body: unknown = null;
				const text = await res.text();
				try {
					body = text ? JSON.parse(text) : null;
				} catch {
					body = null;
				}

				if (res.status === 404) {
					const msg =
						(body as { message?: string })?.message ||
						`x: user '@${username}' not found`;
					const errorMsg = msg.includes("@")
						? msg
						: `x: user '@${username}' not found`;
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

				if (res.status === 400) {
					const msg =
						(body as { message?: string })?.message || "invalid handle";
					const errorMsg = `x: ${msg}`;
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

				if (res.status === 500) {
					const msg =
						(body as { message?: string })?.message ||
						"x: service not configured. Set X_API_URL on the server.";
					const errorMsg = `x: ${msg}`;
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

				if (!res.ok) {
					const msg =
						(body as { message?: string })?.message ||
						`error fetching profile (${res.statusText})`;
					const errorMsg = `x: ${msg}`;
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

				const fetchedData = body as XData;
				xCache.set(username.toLowerCase(), fetchedData);

				if (!controller.signal.aborted) {
					setState({ loading: false, error: null, data: fetchedData });
					if (entryId && updateHistory) {
						updateHistory(
							entryId,
							<StaticXProfile data={fetchedData} fallbackHandle={username} />,
						);
					}
				}
			})
			.catch((e: unknown) => {
				if (
					!controller.signal.aborted &&
					!(e instanceof DOMException && e.name === "AbortError")
				) {
					const errorMsg = `x: error fetching data: ${e instanceof Error ? e.message : String(e)}`;
					setState({ loading: false, error: errorMsg, data: null });
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
	}, [username, fresh, cached, entryId, updateHistory]);

	if (state.loading) {
		return (
			<div className="py-1">
				<LoadingState label={`Fetching @${username} on X…`} variant="Orbit" />
			</div>
		);
	}

	if (state.error) {
		return <div className="font-mono text-sm text-red-400">{state.error}</div>;
	}

	if (!state.data) return null;

	return <StaticXProfile data={state.data} fallbackHandle={username} />;
}

export const xCommands: Record<string, Command> = {
	x: {
		description: "Inspect X/Twitter profile stats",
		usage: "x [username]",
		execute: (args, { entryId, updateHistory }) => {
			const fresh =
				args.includes("--fresh") ||
				args.includes("-f") ||
				args.includes("--fresh=1");
			const filtered = args.filter(
				(a) => a !== "--fresh" && a !== "-f" && a !== "--fresh=1",
			);
			let raw = filtered[0] || "bahauddinalam";
			raw = sanitizeHandle(raw) || "bahauddinalam";
			const username = raw;

			const cached = xCache.get(username.toLowerCase());
			if (cached && !fresh) {
				return <StaticXProfile data={cached} fallbackHandle={username} />;
			}
			return (
				<XInspector
					username={username}
					fresh={fresh}
					entryId={entryId}
					updateHistory={updateHistory}
				/>
			);
		},
	},
	twitter: {
		description: "Alias for x",
		usage: "twitter [username]",
		execute: (args, context) => xCommands.x.execute(args, context),
	},
};
