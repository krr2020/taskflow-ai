import { useEffect, useState } from "react";
import type { ProjectData } from "../types";

export function useProjectData() {
	const [data, setData] = useState<ProjectData | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		fetch("/api/project")
			.then((res) => {
				if (!res.ok) throw new Error("Failed to load project data");
				return res.json();
			})
			.then((data) => {
				setData(data);
				setLoading(false);
			})
			.catch((err) => {
				setError(String(err));
				setLoading(false);
			});
	}, []);

	return { data, error, loading };
}
