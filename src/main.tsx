import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

// Auto-recover from stale chunks on new deployments / network glitches
window.addEventListener("vite:preloadError", () => {
	const lastReload = sessionStorage.getItem("chunk_reload_retry");
	const now = Date.now();
	if (!lastReload || now - Number(lastReload) > 8_000) {
		sessionStorage.setItem("chunk_reload_retry", String(now));
		window.location.reload();
	}
});

const rootElement = document.getElementById("root");
if (rootElement) {
	createRoot(rootElement).render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
}
