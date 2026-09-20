// biome-ignore lint/correctness/noUnusedImports: React is required at runtime — Cloudflare Pages esbuild compiles JSX to React.createElement()
import * as React from "react";
import {
	Button,
	Column,
	Heading,
	Img,
	Link,
	Row,
	Section,
	Text,
} from "react-email";
import { EmailLayout } from "./components/email-layout";

export interface SpotifyReauthNotificationProps {
	daysRemaining: number;
	reauthorizeBy: string;
	reauthorizeUrl: string;
	appName?: string;
}

const getAssetUrl = (file: string) => `https://bahauddin.org/assets/${file}`;

const alertIconSrc = getAssetUrl("alert-icon.png");
const timeIconSrc = getAssetUrl("time-icon.png");
const questionIconSrc = getAssetUrl("question-icon.png");

export function SpotifyReauthNotificationEmail({
	daysRemaining,
	reauthorizeBy,
	reauthorizeUrl,
	appName = "Bahauddin Alam",
}: SpotifyReauthNotificationProps) {
	const previewText =
		daysRemaining <= 1
			? "Spotify access expires today. Reauthorize to keep the music widget active."
			: `Spotify access expires within ${daysRemaining} days. Reauthorize to keep the music widget active.`;

	const metadataItems = [
		{
			id: "expiration",
			icon: alertIconSrc,
			label: "Expiration",
			content: reauthorizeBy,
		},
		{
			id: "days",
			icon: timeIconSrc,
			label: "Time Remaining",
			content:
				daysRemaining <= 1
					? "Less than 24 hours"
					: `${daysRemaining} days or less`,
		},
		{
			id: "impact",
			icon: questionIconSrc,
			label: "Service Impact",
			content:
				"Currently Playing desktop widget will fall back to idle state once expired.",
		},
	];

	return (
		<EmailLayout
			appName={appName}
			category="Spotify Reauthorization"
			preview={previewText}
		>
			<Heading
				as="h1"
				className="text-2xl font-bold text-[#09090b] mb-4 leading-tight"
			>
				Spotify Reauthorization
			</Heading>

			<Text className="text-base text-[#3f3f46] leading-relaxed mb-6">
				Your Spotify 6-month token is expiring soon. Please reauthorize your
				account to keep the live music widget active and updating smoothly.
			</Text>

			<Section className="my-6 text-center" style={{ textAlign: "center" }}>
				<Button
					className="box-border bg-[#1DB954] text-white rounded-xl px-7 py-3.5 font-semibold text-sm inline-block text-center no-underline shadow-sm"
					href={reauthorizeUrl}
					style={{
						backgroundColor: "#1DB954",
						color: "#ffffff",
						borderRadius: "12px",
						padding: "14px 28px",
						fontWeight: 600,
						fontSize: "14px",
						display: "inline-block",
						textDecoration: "none",
						textAlign: "center",
					}}
				>
					Reauthorize Spotify Account
				</Button>
			</Section>

			<Section className="my-6 rounded-2xl bg-[#F9F8F7] border border-solid border-[#EFECE6] overflow-hidden">
				{metadataItems.map((item, index) => (
					<Section
						key={item.id}
						className={`px-5 py-3.5 ${
							index < metadataItems.length - 1
								? "border-b border-solid border-[#EFECE6]"
								: ""
						}`}
					>
						<Row>
							<Column
								className="w-8 align-top pt-0.5"
								style={{ width: "32px", verticalAlign: "top" }}
							>
								<Img
									alt=""
									className="block"
									height="16"
									src={item.icon}
									width="16"
								/>
							</Column>
							<Column className="align-top" style={{ verticalAlign: "top" }}>
								<Text className="my-0 text-sm font-semibold text-[#09090b] leading-tight">
									{item.label}
								</Text>
								<Text className="mt-0.5 mb-0 text-sm text-[#52525b] leading-normal">
									{item.content}
								</Text>
							</Column>
						</Row>
					</Section>
				))}
			</Section>

			<Text className="mt-4 mb-2 text-xs text-[#71717a] leading-relaxed">
				Button not working?{" "}
				<Link
					href={reauthorizeUrl}
					className="text-[#1DB954] underline"
					style={{ color: "#1DB954" }}
				>
					Open the Spotify reauthorization page
				</Link>
				.
			</Text>
		</EmailLayout>
	);
}

SpotifyReauthNotificationEmail.PreviewProps = {
	daysRemaining: 22,
	reauthorizeBy: "2026-09-15T12:00:00.000Z",
	reauthorizeUrl:
		"https://bahauddin.org/reauthorize/c6a2b8e4-7d31-4a25-9e1b-4f8a3c9e1234",
	appName: "Bahauddin Alam",
} satisfies SpotifyReauthNotificationProps;

export default SpotifyReauthNotificationEmail;
