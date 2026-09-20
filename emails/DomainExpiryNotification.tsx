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

export interface DomainExpiryNotificationProps {
	domain: string;
	expiresAt: string;
	daysRemaining: number;
	renewUrl?: string;
	registrar?: string;
	appName?: string;
}

const getAssetUrl = (file: string) => `https://bahauddin.org/assets/${file}`;

const alertIconSrc = getAssetUrl("alert-icon.png");
const timeIconSrc = getAssetUrl("time-icon.png");
const globeIconSrc = getAssetUrl("globe-icon.png");
const questionIconSrc = getAssetUrl("question-icon.png");

function formatExpiryDate(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return iso;
	return date.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		timeZone: "UTC",
	});
}

export function DomainExpiryNotificationEmail({
	domain,
	expiresAt,
	daysRemaining,
	renewUrl,
	registrar,
	appName = "Bahauddin Alam",
}: DomainExpiryNotificationProps) {
	const days = Math.max(0, Math.ceil(daysRemaining));
	const formattedExpiry = formatExpiryDate(expiresAt);

	const previewText =
		days <= 1
			? `${domain} expires tomorrow (${formattedExpiry})`
			: `${domain} expires in ${days} days on ${formattedExpiry}.`;

	const metadataItems = [
		{
			id: "domain",
			icon: globeIconSrc,
			label: "Domain",
			content: domain,
		},
		{
			id: "expiration",
			icon: alertIconSrc,
			label: "Expiration",
			content: `${formattedExpiry} (${expiresAt})`,
		},
		{
			id: "days",
			icon: timeIconSrc,
			label: "Time Remaining",
			content: days <= 1 ? "< 24 hours" : `< ${days} days`,
		},
		...(registrar
			? [
					{
						id: "registrar",
						icon: questionIconSrc,
						label: "Registrar",
						content: registrar,
					},
				]
			: []),
	];

	return (
		<EmailLayout
			appName={appName}
			category="Domain Expiry"
			preview={previewText}
		>
			<Heading
				as="h1"
				className="text-2xl font-bold text-[#09090b] mb-4 leading-tight"
			>
				{days <= 1
					? `${domain} expires tomorrow`
					: `${domain} expires in ${days} days`}
			</Heading>

			<Text className="text-base text-[#3f3f46] leading-relaxed mb-6">
				Your domain{" "}
				<strong className="text-[#09090b] font-semibold">{domain}</strong>{" "}
				expires on{" "}
				<strong className="text-[#09090b] font-semibold">
					{formattedExpiry}
				</strong>
				. Please renew before expiry.
			</Text>

			{renewUrl ? (
				<Section className="my-6 text-center" style={{ textAlign: "center" }}>
					<Button
						className="box-border bg-[#09090b] text-white rounded-xl px-7 py-3.5 font-semibold text-sm inline-block text-center no-underline shadow-sm"
						href={renewUrl}
						style={{
							backgroundColor: "#09090b",
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
						Renew {domain} now
					</Button>
				</Section>
			) : null}

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

			{renewUrl ? (
				<Text className="mt-4 mb-2 text-xs text-[#71717a] leading-relaxed">
					Button not working?{" "}
					<Link
						href={renewUrl}
						className="text-[#09090b] underline"
						style={{ color: "#09090b" }}
					>
						Open the renewal page for {domain}
					</Link>
					.
				</Text>
			) : null}
		</EmailLayout>
	);
}

DomainExpiryNotificationEmail.PreviewProps = {
	domain: "bahauddin.org",
	expiresAt: "2026-10-20T00:00:00.000Z",
	daysRemaining: 10,
	renewUrl: "https://dash.cloudflare.com/login",
	registrar: "Cloudflare Registrar",
	appName: "Bahauddin Alam",
} satisfies DomainExpiryNotificationProps;

export default DomainExpiryNotificationEmail;
