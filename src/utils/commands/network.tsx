import { IconLockFill18 } from "nucleo-ui-essential-fill-18";
import React, { Suspense } from "react";
import { resolvePath } from "../fileSystemUtils";
import type { Command } from "./types";

const LazyPing = React.lazy(() =>
	import("../../components/Ping").then((m) => ({ default: m.Ping })),
);

export const networkCommands: Record<string, Command> = {
	curl: {
		description:
			"Transfer data from or to a server (supports -I, -v, -X, -H, -d)",
		usage: "curl [-I] [-v] [-X METHOD] [-H 'Header: Value'] [-d 'data'] <url>",
		execute: async (args) => {
			if (args.length === 0)
				return "curl: try 'curl --help' for more information";

			if (args.includes("--help") || args.includes("-h")) {
				return (
					<div className="flex flex-col gap-1 font-mono text-xs">
						<div className="text-elegant-accent font-bold">
							curl (HTTP Client for Neosphere)
						</div>
						<div className="grid grid-cols-[140px_1fr] gap-x-2 gap-y-1 mt-1">
							<span className="text-elegant-text-primary">-I, --head</span>
							<span className="text-elegant-text-muted">
								Show response headers only
							</span>
							<span className="text-elegant-text-primary">-v, --verbose</span>
							<span className="text-elegant-text-muted">
								Make the operation more talkative
							</span>
							<span className="text-elegant-text-primary">-X, --request</span>
							<span className="text-elegant-text-muted">
								Specify request command (GET, POST, etc.)
							</span>
							<span className="text-elegant-text-primary">-H, --header</span>
							<span className="text-elegant-text-muted">
								Pass custom header to server
							</span>
							<span className="text-elegant-text-primary">-d, --data</span>
							<span className="text-elegant-text-muted">HTTP POST data</span>
							<span className="text-elegant-text-primary">-s, --silent</span>
							<span className="text-elegant-text-muted">Silent mode</span>
						</div>
					</div>
				);
			}

			let isHead = false;
			let isVerbose = false;
			let method = "GET";
			const headers: Record<string, string> = {};
			let data: string | undefined;
			let url = "";

			for (let i = 0; i < args.length; i++) {
				const a = args[i];
				if (a === "-I" || a === "--head") {
					isHead = true;
					method = "HEAD";
				} else if (a === "-v" || a === "--verbose") {
					isVerbose = true;
				} else if (a === "-s" || a === "--silent") {
				} else if ((a === "-X" || a === "--request") && args[i + 1]) {
					method = args[i + 1].toUpperCase();
					i++;
				} else if ((a === "-H" || a === "--header") && args[i + 1]) {
					const h = args[i + 1];
					const colonIdx = h.indexOf(":");
					if (colonIdx !== -1) {
						headers[h.substring(0, colonIdx).trim()] = h
							.substring(colonIdx + 1)
							.trim();
					}
					i++;
				} else if ((a === "-d" || a === "--data") && args[i + 1]) {
					data = args[i + 1];
					if (method === "GET") method = "POST";
					if (!headers["Content-Type"])
						headers["Content-Type"] = "application/x-www-form-urlencoded";
					i++;
				} else if (!a.startsWith("-")) {
					url = a;
				}
			}

			if (!url) return "curl: no URL specified!";

			let fetchUrl = url;
			if (fetchUrl.startsWith("/")) {
				fetchUrl = `${window.location.origin}${fetchUrl}`;
			} else if (
				!fetchUrl.startsWith("http://") &&
				!fetchUrl.startsWith("https://")
			) {
				fetchUrl = `https://${fetchUrl}`;
			}

			const parsedUrl = new URL(fetchUrl);

			try {
				const startTime = performance.now();
				const response = await fetch(fetchUrl, {
					method,
					headers,
					body: data,
				});
				const endTime = performance.now();
				const duration = Math.round(endTime - startTime);

				const responseHeaders: Record<string, string> = {};
				response.headers.forEach((val, key) => {
					responseHeaders[key] = val;
				});

				let bodyText = "";
				if (!isHead && response.status !== 204) {
					bodyText = await response.text();
					try {
						const json = JSON.parse(bodyText);
						bodyText = JSON.stringify(json, null, 2);
					} catch {}
				}

				if (isHead) {
					return (
						<div className="flex flex-col font-mono text-xs text-elegant-text-primary">
							<div className="text-cyan-400 font-bold">
								HTTP/1.1 {response.status} {response.statusText}
							</div>
							{Object.entries(responseHeaders).map(([k, v]) => (
								<div key={k}>
									<span className="text-yellow-400">{k}:</span> {v}
								</div>
							))}
						</div>
					);
				}

				if (isVerbose) {
					return (
						<div className="flex flex-col font-mono text-xs gap-1">
							<div className="text-elegant-text-muted">
								* Connected to {parsedUrl.hostname} ({parsedUrl.protocol}) in{" "}
								{duration}ms
							</div>
							<div className="text-cyan-300">
								&gt; {method} {parsedUrl.pathname}
								{parsedUrl.search} HTTP/1.1
							</div>
							<div className="text-cyan-300">
								&gt; Host: {parsedUrl.hostname}
							</div>
							<div className="text-cyan-300">
								&gt; User-Agent: curl/8.4.0 (Neosphere OS)
							</div>
							<div className="text-cyan-300">&gt; Accept: */*</div>
							{Object.entries(headers).map(([k, v]) => (
								<div key={k} className="text-cyan-300">
									&gt; {k}: {v}
								</div>
							))}
							<div className="text-elegant-text-muted">
								* Request sent, awaiting response...
							</div>
							<div className="text-green-400 font-bold">
								&lt; HTTP/1.1 {response.status} {response.statusText}
							</div>
							{Object.entries(responseHeaders).map(([k, v]) => (
								<div key={k} className="text-green-300">
									&lt; {k}: {v}
								</div>
							))}
							<div className="text-elegant-text-muted mb-1">
								* Connection closed. Body ({bodyText.length} bytes):
							</div>
							<pre className="text-elegant-text-primary bg-black/30 p-2 rounded whitespace-pre-wrap overflow-x-auto">
								{bodyText}
							</pre>
						</div>
					);
				}

				return (
					<pre className="font-mono text-xs text-elegant-text-primary whitespace-pre-wrap overflow-x-auto">
						{bodyText}
					</pre>
				);
			} catch (_e: unknown) {
				return (
					<div className="flex flex-col gap-1 font-mono text-xs text-red-400">
						<div>curl: (7) Failed to connect to {fetchUrl}</div>
						<div className="text-elegant-text-muted text-[11px] mt-1 bg-red-950/20 border border-red-500/20 p-2 rounded">
							💡 <strong>Browser CORS Notice:</strong> Browsers restrict
							cross-origin network requests unless the target server returns
							'Access-Control-Allow-Origin' headers.
							<br />
							Endpoints like same-origin routes (
							<code className="text-elegant-accent">
								/api/weather?city=London
							</code>
							, <code className="text-elegant-accent">/api/notes</code>) or open
							APIs (
							<code className="text-elegant-accent">
								https://api.github.com/users/bahauddin-alam
							</code>
							) work seamlessly.
						</div>
					</div>
				);
			}
		},
	},
	fetch: {
		description: "Alias for curl",
		execute: (args, context) => networkCommands.curl.execute(args, context),
	},
	openssl: {
		description:
			"Cryptographic utilities (rand, genrsa, genpkey) executed 100% in browser",
		usage: "openssl rand [-hex|-base64] <bytes> OR openssl genrsa [bits]",
		execute: async (args) => {
			const sub = args[0]?.toLowerCase();

			const noticeBanner = (
				<div className="text-[11px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 p-2 rounded mb-2 font-mono flex items-start gap-2">
					<IconLockFill18
						size={16}
						className="shrink-0 text-emerald-400 mt-0.5"
						aria-hidden="true"
					/>
					<span>
						<strong>Security Notice:</strong> Cryptographic keys and randomness
						are generated 100% locally in your browser using the native Web
						Crypto API. No private keys or sensitive data leave your device.
					</span>
				</div>
			);

			if (!sub || sub === "help" || sub === "-h") {
				return (
					<div className="flex flex-col gap-2 font-mono text-sm max-w-lg">
						<div className="text-elegant-accent font-bold">
							OpenSSL Browser Cryptography Suite
						</div>
						{noticeBanner}
						<div className="grid grid-cols-[180px_1fr] gap-x-2 gap-y-1 text-xs">
							<span className="text-elegant-text-primary">
								openssl rand -hex &lt;bytes&gt;
							</span>
							<span className="text-elegant-text-muted">
								Generate random hex string
							</span>
							<span className="text-elegant-text-primary">
								openssl rand -base64 &lt;bytes&gt;
							</span>
							<span className="text-elegant-text-muted">
								Generate random base64 string
							</span>
							<span className="text-elegant-text-primary">
								openssl genrsa [bits]
							</span>
							<span className="text-elegant-text-muted">
								Generate RSA private key (2048/4096)
							</span>
							<span className="text-elegant-text-primary">openssl genpkey</span>
							<span className="text-elegant-text-muted">
								Generate private key
							</span>
						</div>
					</div>
				);
			}

			if (sub === "rand") {
				let format: "hex" | "base64" = "hex";
				let byteCount = 32;

				for (let i = 1; i < args.length; i++) {
					if (args[i] === "-hex") format = "hex";
					else if (args[i] === "-base64") format = "base64";
					else if (!Number.isNaN(parseInt(args[i], 10))) {
						byteCount = Math.min(1024, Math.max(1, parseInt(args[i], 10)));
					}
				}

				const array = new Uint8Array(byteCount);
				crypto.getRandomValues(array);

				let output = "";
				if (format === "hex") {
					output = Array.from(array)
						.map((b) => b.toString(16).padStart(2, "0"))
						.join("");
				} else {
					output = btoa(String.fromCharCode(...array));
				}

				return (
					<div className="flex flex-col font-mono text-sm">
						{noticeBanner}
						<div className="text-elegant-accent break-all select-all">
							{output}
						</div>
					</div>
				);
			}

			if (sub === "genrsa" || sub === "genpkey") {
				let bits = 2048;
				for (let i = 1; i < args.length; i++) {
					const parsed = parseInt(args[i], 10);
					if (parsed === 1024 || parsed === 2048 || parsed === 4096) {
						bits = parsed;
					}
				}

				try {
					const keyPair = await crypto.subtle.generateKey(
						{
							name: "RSA-OAEP",
							modulusLength: bits,
							publicExponent: new Uint8Array([1, 0, 1]),
							hash: "SHA-256",
						},
						true,
						["encrypt", "decrypt"],
					);

					const exported = await crypto.subtle.exportKey(
						"pkcs8",
						keyPair.privateKey,
					);
					const exportedAsBase64 = btoa(
						String.fromCharCode(...new Uint8Array(exported)),
					);
					const pemLines = exportedAsBase64.match(/.{1,64}/g)?.join("\n");
					const pemHeader = ["-----BEGIN", "PRIVATE", "KEY-----"].join(" ");
					const pemFooter = ["-----END", "PRIVATE", "KEY-----"].join(" ");
					const pem = `${pemHeader}\n${pemLines}\n${pemFooter}`;

					return (
						<div className="flex flex-col font-mono text-xs max-w-xl">
							{noticeBanner}
							<div className="text-elegant-text-muted mb-1">
								Generating RSA private key, {bits} bit long modulus (2
								primes)...
							</div>
							<pre className="text-elegant-text-primary bg-elegant-card p-3 rounded border border-elegant-border select-all overflow-x-auto whitespace-pre font-mono text-xs">
								{pem}
							</pre>
						</div>
					);
				} catch (e: unknown) {
					return `openssl: key generation failed: ${e instanceof Error ? e.message : String(e)}`;
				}
			}

			return `openssl: unknown command '${sub}'. Usage: openssl [rand|genrsa|genpkey]`;
		},
	},
	base64: {
		description: "Base64 encode or decode text and files",
		usage: "base64 [-d|--decode] [-e|--encode] [string|file]",
		execute: (args, { currentPath, fileSystem }) => {
			if (args.length === 0) return "Usage: base64 [-d|--decode] [string|file]";

			const isDecode = args.includes("-d") || args.includes("--decode");
			const targets = args.filter(
				(a) => a !== "-d" && a !== "--decode" && a !== "-e" && a !== "--encode",
			);

			if (targets.length === 0)
				return "base64: missing input string or file operand";

			const rawInput = targets.join(" ");

			const node = resolvePath(fileSystem, currentPath, targets[0]);
			const input =
				node && node.type === "file" ? node.content || "" : rawInput;

			try {
				if (isDecode) {
					const binaryString = atob(input.trim());
					const bytes = Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
					const decoded = new TextDecoder().decode(bytes);
					return decoded;
				} else {
					const bytes = new TextEncoder().encode(input);
					const binaryString = Array.from(bytes, (b) =>
						String.fromCharCode(b),
					).join("");
					return btoa(binaryString);
				}
			} catch (e: unknown) {
				return `base64: invalid input (${e instanceof Error ? e.message : "decode error"})`;
			}
		},
	},
	ping: {
		description: "Measure latency to a host",
		usage: "ping [-c count] <host>",
		execute: (args, { setIsInputVisible, updateHistory, entryId }) => {
			if (args.length === 0) return "Usage: ping [-c count] <host>";

			let host = args[0];
			let count: number | undefined;

			if (args[0] === "-c") {
				if (args.length < 3) return "Usage: ping [-c count] <host>";
				count = parseInt(args[1], 10);
				if (Number.isNaN(count) || count <= 0) return "ping: invalid count";
				host = args[2];
			}

			setIsInputVisible(false);
			return (
				<Suspense
					fallback={
						<div
							className="text-elegant-text-muted font-mono"
							aria-live="polite"
						>
							Starting ping…
						</div>
					}
				>
					<LazyPing
						host={host}
						count={count}
						onComplete={() => setIsInputVisible(true)}
						onFinish={(staticNode) => {
							if (entryId && updateHistory) {
								updateHistory(entryId, staticNode);
							}
						}}
					/>
				</Suspense>
			);
		},
	},
	weather: {
		description: "Get weather for a city",
		usage: "weather <city>",
		execute: async (args) => {
			if (args.length === 0) return "Usage: weather <city>";
			const city = args.join(" ");
			try {
				const res = await fetch(
					`/api/weather?city=${encodeURIComponent(city)}`,
				);

				if (res.status === 404) return `Error: City '${city}' not found.`;
				if (!res.ok) {
					const err = await res.json();
					return `Error: ${err.error || res.statusText}`;
				}

				const data = await res.json();
				const temp = Math.round(data.main.temp);
				const desc = data.weather[0].description;
				const humidity = data.main.humidity;
				const wind = data.wind.speed;
				const country = data.sys.country;
				const name = data.name;

				return (
					<div className="text-sm">
						<div className="text-elegant-accent font-bold mb-1">
							Weather Report: {name}, {country}
						</div>
						<div className="grid grid-cols-2 gap-x-4 gap-y-1 max-w-xs text-elegant-text-secondary">
							<span>Temperature:</span>{" "}
							<span className="text-elegant-text-primary">{temp}°C</span>
							<span>Condition:</span>{" "}
							<span className="text-elegant-text-primary capitalize">
								{desc}
							</span>
							<span>Humidity:</span>{" "}
							<span className="text-elegant-text-primary">{humidity}%</span>
							<span>Wind:</span>{" "}
							<span className="text-elegant-text-primary">{wind} m/s</span>
						</div>
					</div>
				);
			} catch {
				return `Error fetching weather for ${city}`;
			}
		},
	},
};
