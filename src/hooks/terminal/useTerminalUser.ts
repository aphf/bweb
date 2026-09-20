import { useEffect, useState } from "react";
import { checkAdmin } from "../../utils/authApi";

export const useTerminalUser = () => {
	const [user, setUser] = useState("neo");

	useEffect(() => {
		checkAdmin().then((authenticated) => {
			if (authenticated) setUser("root");
		});
	}, []);

	return {
		user,
		setUser,
	};
};
