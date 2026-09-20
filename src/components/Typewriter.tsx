import { useEffect, useEffectEvent, useState } from "react";

interface TypewriterProps {
	text: string;
	speed?: number;
	onComplete?: () => void;
}

export const Typewriter = ({
	text,
	speed = 10,
	onComplete,
}: TypewriterProps) => {
	const [currentLength, setCurrentLength] = useState(0);
	const [prevText, setPrevText] = useState(text);

	if (text !== prevText) {
		setPrevText(text);
		setCurrentLength(0);
	}

	const complete = useEffectEvent(() => onComplete?.());

	useEffect(() => {
		if (currentLength >= text.length) return;

		const timer = setTimeout(() => {
			const nextLength = currentLength + 1;
			setCurrentLength(nextLength);
			if (nextLength >= text.length) complete();
		}, speed);
		return () => clearTimeout(timer);
	}, [currentLength, text.length, speed]);

	return <span>{text.substring(0, currentLength)}</span>;
};
