import { useRouteError } from "react-router";
import { ErrorScreen } from "./ErrorBoundary";

export function RouteErrorBoundary() {
	const error = useRouteError();
	return <ErrorScreen error={error} />;
}
