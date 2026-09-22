import { describe, expect, it } from "vitest";
import {
	ATTRIBUTION_COOKIE,
	getInboundSource,
	getOutboundTarget,
	handleOutboundRedirect,
	handleSocialRedirect,
} from "./social-redirect";

describe("social-redirect", () => {
	it("maps /via/* inbound paths to sources", () => {
		expect(getInboundSource("/via/x")).toBe("x");
		expect(getInboundSource("/via/twitter")).toBe("x");
		expect(getInboundSource("/via/github")).toBe("github");
		expect(getInboundSource("/via/gh")).toBe("github");
		expect(getInboundSource("/via/linkedin")).toBe("linkedin");
		expect(getInboundSource("/via/li")).toBe("linkedin");
		expect(getInboundSource("/via/telegram")).toBe("telegram");
		expect(getInboundSource("/via/tg")).toBe("telegram");
		expect(getInboundSource("/via/instagram")).toBe("instagram");
		expect(getInboundSource("/via/ig")).toBe("instagram");
		expect(getInboundSource("/via/insta")).toBeNull();
		expect(getInboundSource("/x")).toBeNull();
		expect(getInboundSource("/about")).toBeNull();
		expect(getInboundSource("/api/x")).toBeNull();
	});

	it("maps short outbound paths to profiles", () => {
		expect(getOutboundTarget("/x")).toContain("x.com/bahauddinalam");
		expect(getOutboundTarget("/gh")).toContain("github.com/bahauddin-alam");
		expect(getOutboundTarget("/li")).toContain("linkedin.com");
		expect(getOutboundTarget("/tg")).toContain("t.me/bahauddinalam");
		expect(getOutboundTarget("/ig")).toContain("instagram.com");
		expect(getOutboundTarget("/via/x")).toBeNull();
	});

	it("302s inbound to / with attribution cookie and no UTM in URL", () => {
		const res = handleSocialRedirect(
			new Request("https://bahauddin.org/via/x"),
			"x",
		);
		expect(res.status).toBe(302);
		expect(res.headers.get("Location")).toBe("https://bahauddin.org/");
		expect(res.headers.get("Location")).not.toContain("utm_");
		expect(res.headers.get("Set-Cookie")).toContain(`${ATTRIBUTION_COOKIE}=x`);
		expect(res.headers.get("Cache-Control")).toBe("no-store");
	});

	it("302s outbound to the profile", () => {
		const target = getOutboundTarget("/x");
		expect(target).toBeTruthy();
		const res = handleOutboundRedirect(target as string);
		expect(res.status).toBe(302);
		expect(res.headers.get("Location")).toBe(target);
	});
});
