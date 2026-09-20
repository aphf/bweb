import { describe, expect, it } from "vitest";
import { getDomainMilestone, parseMonitoredDomains } from "./domain";

describe("getDomainMilestone", () => {
	it("returns null beyond the 30-day window", () => {
		expect(getDomainMilestone(31)).toBeNull();
		expect(getDomainMilestone(365)).toBeNull();
	});

	it("matches exact milestone days", () => {
		expect(getDomainMilestone(30)).toBe(30);
		expect(getDomainMilestone(20)).toBe(20);
		expect(getDomainMilestone(10)).toBe(10);
		expect(getDomainMilestone(5)).toBe(5);
		expect(getDomainMilestone(2)).toBe(2);
		expect(getDomainMilestone(1)).toBe(1);
	});

	it("falls into the next band down on missed days", () => {
		expect(getDomainMilestone(29)).toBe(30);
		expect(getDomainMilestone(15)).toBe(20);
		expect(getDomainMilestone(9)).toBe(10);
		expect(getDomainMilestone(3)).toBe(5);
	});

	it("treats expired domains as most urgent", () => {
		expect(getDomainMilestone(0)).toBe(1);
		expect(getDomainMilestone(-5)).toBe(1);
	});
});

describe("parseMonitoredDomains", () => {
	it("parses comma-separated domains", () => {
		expect(parseMonitoredDomains("bahauddin.org,bahauddin.in")).toEqual([
			"bahauddin.org",
			"bahauddin.in",
		]);
	});

	it("trims, lowercases, and strips trailing dots", () => {
		expect(parseMonitoredDomains("  Example.COM. , Foo.Bar ")).toEqual([
			"example.com",
			"foo.bar",
		]);
	});

	it("drops entries without a dot", () => {
		expect(parseMonitoredDomains("localhost,example.com")).toEqual([
			"example.com",
		]);
	});

	it("returns [] for missing or non-string values", () => {
		expect(parseMonitoredDomains(undefined)).toEqual([]);
		expect(parseMonitoredDomains("")).toEqual([]);
		expect(parseMonitoredDomains(42)).toEqual([]);
	});
});
