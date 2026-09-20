interface PageHeaderProps {
	currentPath?: string;
	onNavigate?: (dest: string) => void;
	className?: string;
	maxWidth?: string;
}

export const PageHeader = ({ className = "" }: PageHeaderProps) => {
	return (
		<div className={`h-8 w-full shrink-0 ${className}`} aria-hidden="true" />
	);
};
