import * as PopoverPrimitive from "@radix-ui/react-popover";
import type * as React from "react";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;
const PopoverClose = PopoverPrimitive.Close;
const PopoverPortal = PopoverPrimitive.Portal;

function PopoverContent({
	className,
	align = "end",
	side = "top",
	sideOffset = 8,
	...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
	return (
		<PopoverPrimitive.Portal>
			<PopoverPrimitive.Content
				align={align}
				side={side}
				sideOffset={sideOffset}
				className={`z-50 w-72 rounded-xl border border-elegant-border bg-elegant-card/95 p-3.5 text-elegant-text-primary shadow-2xl backdrop-blur-md outline-none font-mono text-sm transition-[transform,opacity] animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ${className || ""}`}
				{...props}
			/>
		</PopoverPrimitive.Portal>
	);
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={`flex flex-col gap-1 text-left ${className || ""}`}
			{...props}
		/>
	);
}

function PopoverTitle({ className, ...props }: React.ComponentProps<"h3">) {
	return (
		<h3
			className={`font-semibold text-xs text-elegant-text-muted uppercase tracking-wider ${className || ""}`}
			{...props}
		/>
	);
}

function PopoverDescription({
	className,
	...props
}: React.ComponentProps<"p">) {
	return (
		<p
			className={`text-xs text-elegant-text-secondary ${className || ""}`}
			{...props}
		/>
	);
}

export {
	Popover,
	PopoverAnchor,
	PopoverClose,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverPortal,
	PopoverTitle,
	PopoverTrigger,
};
