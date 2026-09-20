import { IconHouse2Fill18 } from "nucleo-ui-essential-fill-18";
import { useLocation, useNavigate } from "react-router";
import { useSEO } from "../../hooks/useSEO";
import { Dock } from "../Dock";
import { PageHeader } from "../PageHeader";

export const NotFound = () => {
	const location = useLocation();
	const navigate = useNavigate();

	useSEO({
		title: "404 - Page Not Found | Bahauddin Alam",
		description:
			"The requested memory sector or route does not exist in Neosphere OS. Explore available pages or return to the desktop.",
		url: "https://bahauddin.org/404",
	});

	const onExit = () => navigate("/");

	const handleNavigate = (dest: string) => {
		if (dest === "Terminal") {
			onExit();
			window.dispatchEvent(new CustomEvent("open-terminal"));
		} else if (dest === "Files") {
			onExit();
			window.dispatchEvent(new CustomEvent("open-filemanager"));
		} else if (dest === "Home") {
			onExit();
		} else {
			navigate(`/${dest.toLowerCase()}`);
		}
	};

	return (
		<div className="h-full w-full bg-elegant-bg text-elegant-text-secondary font-mono selection:bg-elegant-accent/20 overflow-hidden">
			<div className="h-full flex flex-col">
				<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
					<PageHeader
						currentPath="404"
						onNavigate={handleNavigate}
						maxWidth="max-w-4xl"
					/>

					<main className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-28 lg:pt-12 lg:pb-32 flex flex-col items-center justify-center">
						<section
							aria-labelledby="not-found-heading"
							className="w-full bg-elegant-card border border-elegant-border rounded-sm p-6 sm:p-8 shadow-2xl relative overflow-hidden"
						>
							<div className="flex items-center gap-2 pb-4 mb-6 border-b border-elegant-border">
								<span
									className="inline-block size-2 rounded-full bg-red-500 animate-pulse"
									aria-hidden="true"
								/>
								<span className="text-xs uppercase tracking-wider font-semibold text-elegant-text-primary">
									{"HTTP 404 // NOT FOUND"}
								</span>
							</div>

							<div className="mb-6">
								<div className="flex items-baseline gap-3 mb-2">
									<span
										className="text-4xl sm:text-6xl font-black tracking-tighter text-elegant-text-primary select-none"
										aria-hidden="true"
									>
										404
									</span>
									<h1
										id="not-found-heading"
										className="text-lg sm:text-xl font-bold text-elegant-text-primary"
									>
										Page Not Found
									</h1>
								</div>
								<p className="text-sm text-elegant-text-secondary leading-relaxed">
									The page{" "}
									<code className="text-elegant-accent font-semibold px-1.5 py-0.5 rounded bg-elegant-bg border border-elegant-border break-all">
										{location.pathname}
									</code>{" "}
									does not exist or may have been moved.
								</p>
							</div>

							<div className="mb-6 p-3 sm:p-4 rounded bg-elegant-bg border border-elegant-border text-xs leading-relaxed overflow-x-auto select-text font-mono">
								<div className="text-elegant-text-muted mb-1">
									$ neosphere resolve --path &quot;{location.pathname}&quot;
								</div>
								<div className="text-red-400 font-semibold">
									ENOENT: No such file or directory
								</div>
							</div>

							<div>
								<button
									type="button"
									onClick={onExit}
									className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-sm bg-elegant-accent text-elegant-bg font-bold text-xs uppercase tracking-wider hover:bg-elegant-accent-hover transition-colors shadow-sm cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent"
								>
									<IconHouse2Fill18 size={14} aria-hidden="true" />
									<span>Return to Desktop</span>
								</button>
							</div>
						</section>
					</main>
				</div>

				<Dock onNavigate={handleNavigate} currentPage="" className="py-3" />
			</div>
		</div>
	);
};

export default NotFound;
