import { useEffect, useState } from "react";
import type { Feature } from "../types";

export function useFeatureData(featureId: string | undefined) {
	const [feature, setFeature] = useState<Feature | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState<boolean>(true);

	useEffect(() => {
		if (!featureId) {
			setLoading(false);
			return;
		}

		setLoading(true);
		fetch(`/api/features/${featureId}`)
			.then((res) => {
				if (!res.ok) throw new Error("Failed to load feature data");
				return res.json();
			})
			.then((data) => {
				setFeature(data);
				setLoading(false);
			})
			.catch((err) => {
				setError(String(err));
				setLoading(false);
			});
	}, [featureId]);

	return { feature, error, loading };
}
