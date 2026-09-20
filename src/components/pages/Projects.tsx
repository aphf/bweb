import { IconFolderOpenFill18 } from "nucleo-ui-essential-fill-18";
import { SiGithub } from "react-icons/si";
import { useNavigate } from "react-router";
import { useSEO } from "../../hooks/useSEO";
import { Dock } from "../Dock";
import { PageHeader } from "../PageHeader";

const PROJECTS = [
	{
		title: "Terminal Portfolio",
		description:
			"A retro-futuristic terminal interface built with React, TypeScript, and Tailwind CSS. Features a simulated file system, command history, and immersive CLI experience.",
		tech: ["React", "TypeScript", "Tailwind"],
		link: "https://github.com/bahauddin-alam",
	},
];

export const Projects = () => {
	const navigate = useNavigate();
	const onExit = () => navigate("/");

	useSEO({
		title: "Projects | Bahauddin Alam",
		description:
			"Showcase of my recent projects. From web applications to system tools, explore what I've built.",
		url: "https://bahauddin.org/projects",
	});

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
						currentPath="projects"
						onNavigate={handleNavigate}
						maxWidth="max-w-7xl"
					/>

					<main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-28 lg:pt-8 lg:pb-32">
						<section aria-labelledby="projects-heading">
							<div className="flex items-center gap-3 mb-6">
								<IconFolderOpenFill18
									className="text-elegant-text-muted"
									size={24}
									aria-hidden="true"
								/>
								<h1
									id="projects-heading"
									className="text-xl font-bold text-elegant-text-primary text-balance"
								>
									Featured Projects
								</h1>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
								{PROJECTS.map((project) => (
									<article
										key={project.title}
										className="bg-elegant-card border border-elegant-border rounded-sm p-6 flex flex-col h-full hover:border-elegant-text-muted transition-colors group relative overflow-hidden"
									>
										<div
											className="absolute top-0 left-0 w-1 h-full bg-elegant-border group-hover:bg-elegant-accent transition-colors"
											aria-hidden="true"
										/>

										<h2 className="text-lg font-bold text-elegant-text-primary mb-2 flex items-center justify-between text-balance">
											{project.title}
											<a
												href={project.link}
												target="_blank"
												rel="noopener noreferrer"
												aria-label={`View ${project.title} on GitHub`}
												className="text-elegant-text-muted hover:text-elegant-text-primary rounded outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent p-1 transition-colors"
											>
												<SiGithub size={18} aria-hidden="true" />
											</a>
										</h2>

										<p className="text-sm text-elegant-text-secondary mb-6 grow leading-relaxed">
											{project.description}
										</p>

										<div className="flex flex-wrap gap-2 mt-auto">
											{project.tech.map((t) => (
												<span
													key={t}
													className="text-xs px-2 py-1 bg-elegant-bg border border-elegant-border rounded text-elegant-text-muted"
												>
													{t}
												</span>
											))}
										</div>
									</article>
								))}
							</div>
						</section>
					</main>
				</div>

				<Dock
					onNavigate={handleNavigate}
					currentPage="Projects"
					className="py-3"
				/>
			</div>
		</div>
	);
};
