import type { ReactNode } from "react";
// biome-ignore lint/correctness/noUnusedImports: React is required at runtime — Cloudflare Pages esbuild compiles JSX to React.createElement()
import * as React from "react";
import {
	Body,
	Container,
	Head,
	Hr,
	Html,
	Img,
	Preview,
	pixelBasedPreset,
	Section,
	Tailwind,
	Text,
} from "react-email";

export type EmailLayoutProps = {
	preview: string;
	appName?: string;
	category?: string;
	children: ReactNode;
};

const logoSrc = "https://bahauddin.org/favicon-96x96.png";

export function EmailLayout({
	preview,
	appName = "Bahauddin Alam",
	category,
	children,
}: EmailLayoutProps) {
	return (
		<Html lang="en" dir="ltr">
			<Tailwind
				config={{
					presets: [pixelBasedPreset],
					theme: {
						extend: {
							colors: {
								background: "#ffffff",
								card: "#f9f8f7",
								border: "#efece6",
								muted: "#71717a",
								dark: "#09090b",
							},
						},
					},
				}}
			>
				<Head />
				<Body
					className="bg-[#ffffff] font-sans text-[#18181b] my-0 mx-auto py-10 px-5"
					style={{
						backgroundColor: "#ffffff",
						color: "#18181b",
						fontFamily:
							"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
						margin: "0 auto",
						padding: "40px 20px",
					}}
				>
					<Preview>{preview}</Preview>
					<Container
						className="max-w-140 mx-auto p-0"
						style={{
							margin: "0 auto",
							maxWidth: "560px",
							padding: 0,
							width: "100%",
						}}
					>
						<Section
							className="mb-6"
							style={{
								marginBottom: "24px",
							}}
						>
							<Img
								alt={appName}
								className="inline-block align-middle mr-2.5 rounded-md"
								height="24"
								src={logoSrc}
								style={{
									borderRadius: "6px",
									display: "inline-block",
									marginRight: "10px",
									verticalAlign: "middle",
								}}
								width="24"
							/>
							<Text
								className="inline-block align-middle my-0 text-[#09090b] text-base font-bold tracking-tight"
								style={{
									color: "#09090b",
									display: "inline-block",
									fontSize: "16px",
									fontWeight: 700,
									letterSpacing: "-0.02em",
									margin: 0,
									verticalAlign: "middle",
								}}
							>
								{appName}
							</Text>
						</Section>

						{children}

						<Hr
							className="border-solid border-[#e4e4e7] mt-8 mb-4"
							style={{
								border: "none",
								borderTop: "1px solid #e4e4e7",
								margin: "32px 0 16px 0",
							}}
						/>
						<Section
							className="text-left"
							style={{
								textAlign: "left",
							}}
						>
							<Text
								className="text-[11px] text-[#a1a1aa] my-0"
								style={{
									color: "#a1a1aa",
									fontSize: "11px",
									margin: 0,
								}}
							>
								{category ? `${appName} • ${category}` : appName}
							</Text>
						</Section>
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}

export default EmailLayout;
