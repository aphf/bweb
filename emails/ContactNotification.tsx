import * as React from "react";
import { Column, Heading, Img, Row, Section, Text } from "react-email";
import { EmailLayout } from "./components/email-layout";

export interface ContactNotificationEmailProps {
	name: string;
	email: string;
	message: string;
	timestamp?: string;
	ip?: string;
	city?: string;
	country?: string;
	userAgent?: string;
	appName?: string;
}

const getAssetUrl = (file: string) =>
	process.env.NODE_ENV === "production"
		? `https://bahauddin.org/assets/${file}`
		: `/static/${file}`;

const fromIconSrc = getAssetUrl("from-icon.png");
const globeIconSrc = getAssetUrl("globe-icon.png");
const deviceIconSrc = getAssetUrl("device-icon.png");
const timeIconSrc = getAssetUrl("time-icon.png");

function formatUserAgent(ua?: string): string | undefined {
	if (!ua) return undefined;
	let os = "";
	if (ua.includes("Windows")) {
		os = "Windows";
	} else if (ua.includes("Macintosh") || ua.includes("Mac OS")) {
		os = "macOS";
	} else if (ua.includes("iPhone")) {
		os = "iPhone";
	} else if (ua.includes("iPad")) {
		os = "iPad";
	} else if (ua.includes("Android")) {
		os = "Android";
	} else if (ua.includes("Linux")) {
		os = "Linux";
	}

	let browser = "";
	if (ua.includes("Chrome") && !ua.includes("Edg") && !ua.includes("OPR")) {
		browser = "Chrome";
	} else if (ua.includes("Safari") && !ua.includes("Chrome")) {
		browser = "Safari";
	} else if (ua.includes("Firefox")) {
		browser = "Firefox";
	} else if (ua.includes("Edg")) {
		browser = "Edge";
	}

	if (browser && os) {
		return `${browser} on ${os}`;
	}
	if (browser) return browser;
	if (os) return os;
	return ua.length > 40 ? `${ua.slice(0, 37)}...` : ua;
}

export function ContactNotificationEmail({
	name,
	email,
	message,
	timestamp = "Aug 18, 2026 at 6:50 AM UTC",
	ip,
	city,
	country,
	userAgent,
	appName = "Bahauddin Alam",
}: ContactNotificationEmailProps) {
	const formattedDevice = formatUserAgent(userAgent);
	const paragraphs = message.split("\n\n");

	const cleanSnippet = message.trim().replace(/\s+/g, " ");
	const previewText =
		cleanSnippet.length > 90 ? `${cleanSnippet.slice(0, 87)}...` : cleanSnippet;

	const locationParts = [city, country].filter(Boolean);
	const locationStr =
		locationParts.length > 0 ? locationParts.join(", ") : undefined;
	let ipAndLocation: string | undefined;
	if (ip && locationStr) {
		ipAndLocation = `${ip} - ${locationStr}`;
	} else if (ip) {
		ipAndLocation = ip;
	} else if (locationStr) {
		ipAndLocation = locationStr;
	}

	const metadataItems = [
		{
			id: "from",
			icon: fromIconSrc,
			label: "From",
			content: (
				<Text className="mt-0.5 mb-0 text-sm text-[#52525b] leading-normal">
					{name} ({email})
				</Text>
			),
			show: true,
		},
		{
			id: "location",
			icon: globeIconSrc,
			label: "IP & approximate location",
			content: (
				<Text className="mt-0.5 mb-0 text-sm text-[#52525b] leading-normal">
					{ipAndLocation}
				</Text>
			),
			show: Boolean(ipAndLocation),
		},
		{
			id: "device",
			icon: deviceIconSrc,
			label: "Device",
			content: (
				<Text className="mt-0.5 mb-0 text-sm text-[#52525b] leading-normal">
					{formattedDevice}
				</Text>
			),
			show: Boolean(formattedDevice),
		},
		{
			id: "time",
			icon: timeIconSrc,
			label: "Time",
			content: (
				<Text className="mt-0.5 mb-0 text-sm text-[#52525b] leading-normal">
					{timestamp}
				</Text>
			),
			show: Boolean(timestamp),
		},
	].filter((item) => item.show);

	return (
		<EmailLayout
			appName={appName}
			category="Contact Notification"
			preview={previewText}
		>
			<Heading
				as="h1"
				className="text-2xl font-bold text-[#09090b] mb-4 leading-tight"
			>
				New message from {name}
			</Heading>

			<Text className="text-base text-[#3f3f46] leading-relaxed mb-4">
				Hey Bahauddin,{" "}
				<strong className="text-[#09090b] font-semibold">{name}</strong> reached
				out to you through your website:
			</Text>

			<Section className="my-5 rounded-2xl bg-[#F9F8F7] border border-solid border-[#EFECE6] p-5">
				{paragraphs.map((paragraph) => (
					<Text
						key={paragraph}
						className="text-base text-[#18181b] leading-relaxed font-sans"
						style={{ margin: "0 0 12px 0" }}
					>
						{paragraph
							.split("\n")
							.reduce<(string | React.ReactNode)[]>((acc, line) => {
								if (acc.length > 0) {
									acc.push(
										<br
											key={`br-${paragraph.slice(0, 8)}-${acc.length}-${line}`}
										/>,
									);
								}
								acc.push(line);
								return acc;
							}, [])}
					</Text>
				))}
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
								{item.content}
							</Column>
						</Row>
					</Section>
				))}
			</Section>

			<Text className="mt-4 mb-2 text-xs text-[#71717a] leading-relaxed">
				You can reply directly to this email to respond back to{" "}
				<strong className="text-[#09090b] font-semibold">{name}</strong> (
				{email}).
			</Text>
		</EmailLayout>
	);
}

ContactNotificationEmail.PreviewProps = {
	name: "Sarah Connor",
	email: "sarah.connor@example.com",
	message:
		"Hi Bahauddin,\n\nI came across your portfolio and terminal project. Are you available for freelance projects this quarter? We'd love to chat about a collaboration.",
	timestamp: "Aug 18, 2026 at 6:50 AM UTC",
	ip: "192.0.2.42",
	city: "San Francisco",
	country: "United States",
	userAgent:
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
	appName: "Bahauddin Alam",
} satisfies ContactNotificationEmailProps;

export default ContactNotificationEmail;
