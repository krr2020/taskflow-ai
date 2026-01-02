import { useEffect, useState } from "react";

interface Feature {
	id: string;
	title: string;
	status: string;
}

interface ProjectData {
	project: {
		name: string;
		description: string;
	};
	features: Feature[];
}

function App() {
	const [data, setData] = useState<ProjectData | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		fetch("/api/project")
			.then((res) => {
				if (!res.ok) throw new Error("Failed to load project data");
				return res.json();
			})
			.then(setData)
			.catch((err) => setError(String(err)));
	}, []);

	if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
	if (!data) return <div className="p-4">Loading...</div>;

	return (
		<div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
			<header className="bg-white border-b px-6 py-4">
				<h1 className="text-xl font-bold">{data.project.name}</h1>
				<p className="text-gray-500 text-sm">{data.project.description}</p>
			</header>

			<main className="p-6 max-w-5xl mx-auto">
				<h2 className="text-lg font-semibold mb-4">Features</h2>
				<div className="grid gap-4">
					{data.features.map((feature) => (
						<div
							key={feature.id}
							className="bg-white p-4 rounded-lg shadow-sm border"
						>
							<div className="flex justify-between items-center">
								<h3 className="font-medium text-lg">{feature.title}</h3>
								<span
									className={`px-2 py-1 rounded text-xs font-medium uppercase ${getStatusColor(feature.status)}`}
								>
									{feature.status}
								</span>
							</div>
							<div className="text-xs text-gray-400 mt-2">ID: {feature.id}</div>
						</div>
					))}
				</div>
			</main>
		</div>
	);
}

function getStatusColor(status: string) {
	switch (status) {
		case "completed":
			return "bg-green-100 text-green-700";
		case "in-progress":
			return "bg-blue-100 text-blue-700";
		case "blocked":
			return "bg-red-100 text-red-700";
		default:
			return "bg-gray-100 text-gray-700";
	}
}

export default App;
