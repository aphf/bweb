"use client";

import { motion, type Variants } from "motion/react";

import {
	getVariants,
	type IconProps,
	IconWrapper,
	useAnimateIconContext,
} from "@/components/animate-ui/icons/icon";

type Volume2Props = IconProps<keyof typeof animations>;

const animations = {
	default: {
		speaker: {
			initial: { scale: 1 },
			animate: {
				scale: [1, 0.94, 1.04, 1],
				transition: {
					duration: 1.2,
					ease: "easeInOut",
					repeat: Infinity,
					repeatDelay: 0.2,
				},
			},
		},
		wave1: {
			initial: { opacity: 0.3, scale: 0.85, originX: "11px", originY: "12px" },
			animate: {
				opacity: [0.3, 1, 0.3],
				scale: [0.85, 1.05, 0.85],
				transition: {
					duration: 1.2,
					ease: "easeInOut",
					repeat: Infinity,
					repeatDelay: 0.2,
				},
			},
		},
		wave2: {
			initial: { opacity: 0.1, scale: 0.8, originX: "11px", originY: "12px" },
			animate: {
				opacity: [0.1, 0.2, 1, 0.1],
				scale: [0.8, 0.9, 1.1, 0.8],
				transition: {
					duration: 1.2,
					delay: 0.15,
					ease: "easeInOut",
					repeat: Infinity,
					repeatDelay: 0.2,
				},
			},
		},
	} satisfies Record<string, Variants>,
} as const;

function IconComponent({ size = 16, ...props }: Volume2Props) {
	const { controls } = useAnimateIconContext();
	const variants = getVariants(animations);

	return (
		<motion.svg
			xmlns="http://www.w3.org/2000/svg"
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={2}
			strokeLinecap="round"
			strokeLinejoin="round"
			{...props}
		>
			<motion.polygon
				points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"
				variants={variants.speaker}
				initial="initial"
				animate={controls}
			/>
			<motion.path
				d="M15.54 8.46a5 5 0 0 1 0 7.07"
				variants={variants.wave1}
				initial="initial"
				animate={controls}
			/>
			<motion.path
				d="M19.07 4.93a10 10 0 0 1 0 14.14"
				variants={variants.wave2}
				initial="initial"
				animate={controls}
			/>
		</motion.svg>
	);
}

function Volume2(props: Volume2Props) {
	return <IconWrapper icon={IconComponent} {...props} />;
}

export {
	Volume2,
	Volume2 as Volume2Icon,
	type Volume2Props,
	type Volume2Props as Volume2IconProps,
	animations,
};
