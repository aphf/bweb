import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import type * as React from "react";

const ContextMenu = ContextMenuPrimitive.Root;
const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
const ContextMenuGroup = ContextMenuPrimitive.Group;
const ContextMenuPortal = ContextMenuPrimitive.Portal;
const ContextMenuSub = ContextMenuPrimitive.Sub;
const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

function ContextMenuSubTrigger({
	className,
	inset,
	children,
	...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & {
	inset?: boolean;
}) {
	return (
		<ContextMenuPrimitive.SubTrigger
			data-slot="context-menu-sub-trigger"
			data-inset={inset}
			className={`flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none focus:bg-white/10 focus:text-elegant-text-primary data-[state=open]:bg-white/10 data-[state=open]:text-elegant-text-primary font-mono text-elegant-text-secondary ${
				inset ? "pl-8" : ""
			} ${className || ""}`}
			{...props}
		>
			{children}
			<ChevronRight className="ml-auto size-3.5" />
		</ContextMenuPrimitive.SubTrigger>
	);
}

function ContextMenuSubContent({
	className,
	...props
}: React.ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
	return (
		<ContextMenuPrimitive.SubContent
			data-slot="context-menu-sub-content"
			className={`z-50 min-w-[8rem] overflow-hidden rounded-md border border-elegant-border bg-elegant-card/95 p-1 text-elegant-text-primary shadow-2xl backdrop-blur-md outline-none animate-in fade-in-80 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 ${className || ""}`}
			{...props}
		/>
	);
}

function ContextMenuContent({
	className,
	...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Content>) {
	return (
		<ContextMenuPrimitive.Portal>
			<ContextMenuPrimitive.Content
				data-slot="context-menu-content"
				className={`z-50 min-w-[12rem] overflow-hidden rounded-lg border border-elegant-border/90 bg-elegant-card/95 p-1 text-elegant-text-primary shadow-2xl backdrop-blur-md outline-none animate-in fade-in-80 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 ${className || ""}`}
				{...props}
			/>
		</ContextMenuPrimitive.Portal>
	);
}

function ContextMenuItem({
	className,
	inset,
	variant = "default",
	...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Item> & {
	inset?: boolean;
	variant?: "default" | "destructive";
}) {
	return (
		<ContextMenuPrimitive.Item
			data-slot="context-menu-item"
			data-inset={inset}
			data-variant={variant}
			className={`relative flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-xs outline-none transition-colors focus:bg-white/10 focus:text-elegant-text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-40 font-mono text-elegant-text-secondary hover:text-elegant-text-primary ${
				variant === "destructive"
					? "text-red-400 focus:bg-red-500/10 focus:text-red-300"
					: ""
			} ${inset ? "pl-8" : ""} ${className || ""}`}
			{...props}
		/>
	);
}

function ContextMenuCheckboxItem({
	className,
	children,
	checked,
	...props
}: React.ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
	return (
		<ContextMenuPrimitive.CheckboxItem
			data-slot="context-menu-checkbox-item"
			className={`relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-2 text-xs outline-none transition-colors focus:bg-white/10 focus:text-elegant-text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-40 font-mono text-elegant-text-secondary ${className || ""}`}
			checked={checked}
			{...props}
		>
			<span className="absolute left-2 flex size-3.5 items-center justify-center">
				<ContextMenuPrimitive.ItemIndicator>
					<Check className="size-3.5" />
				</ContextMenuPrimitive.ItemIndicator>
			</span>
			{children}
		</ContextMenuPrimitive.CheckboxItem>
	);
}

function ContextMenuRadioItem({
	className,
	children,
	...props
}: React.ComponentProps<typeof ContextMenuPrimitive.RadioItem>) {
	return (
		<ContextMenuPrimitive.RadioItem
			data-slot="context-menu-radio-item"
			className={`relative flex cursor-pointer select-none items-center rounded-md py-1.5 pl-8 pr-2 text-xs outline-none transition-colors focus:bg-white/10 focus:text-elegant-text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-40 font-mono text-elegant-text-secondary ${className || ""}`}
			{...props}
		>
			<span className="absolute left-2 flex size-3.5 items-center justify-center">
				<ContextMenuPrimitive.ItemIndicator>
					<Circle className="size-2 fill-current" />
				</ContextMenuPrimitive.ItemIndicator>
			</span>
			{children}
		</ContextMenuPrimitive.RadioItem>
	);
}

function ContextMenuLabel({
	className,
	inset,
	...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Label> & {
	inset?: boolean;
}) {
	return (
		<ContextMenuPrimitive.Label
			data-slot="context-menu-label"
			data-inset={inset}
			className={`px-2.5 py-1.5 text-[11px] font-semibold text-elegant-text-muted uppercase tracking-wider font-mono ${
				inset ? "pl-8" : ""
			} ${className || ""}`}
			{...props}
		/>
	);
}

function ContextMenuSeparator({
	className,
	...props
}: React.ComponentProps<typeof ContextMenuPrimitive.Separator>) {
	return (
		<ContextMenuPrimitive.Separator
			data-slot="context-menu-separator"
			className={`-mx-1 my-1 h-px bg-elegant-border ${className || ""}`}
			{...props}
		/>
	);
}

function ContextMenuShortcut({
	className,
	...props
}: React.ComponentProps<"span">) {
	return (
		<span
			data-slot="context-menu-shortcut"
			className={`ml-auto text-[10px] tracking-widest text-elegant-text-muted font-mono ${className || ""}`}
			{...props}
		/>
	);
}

export {
	ContextMenu,
	ContextMenuCheckboxItem,
	ContextMenuContent,
	ContextMenuGroup,
	ContextMenuItem,
	ContextMenuLabel,
	ContextMenuPortal,
	ContextMenuRadioGroup,
	ContextMenuRadioItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuTrigger,
};
