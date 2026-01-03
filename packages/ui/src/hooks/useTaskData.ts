import { useEffect, useState } from "react";
import type { Task } from "../types";

export function useTaskData(taskId: string | undefined) {
	const [task, setTask] = useState<Task | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		if (!taskId) {
			setLoading(false);
			return;
		}

		setLoading(true);
		fetch(`/api/tasks/${taskId}`)
			.then((res) => {
				if (!res.ok) throw new Error("Failed to load task data");
				return res.json();
			})
			.then((data) => {
				setTask(data);
				setLoading(false);
			})
			.catch((err) => {
				setError(String(err));
				setLoading(false);
			});
	}, [taskId]);

	return { task, error, loading };
}
