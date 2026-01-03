import { Link } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useProjectData } from "../hooks/useProjectData";
import { createSlug, getStatusColor } from "../utils";

export function FeatureListPage() {
	const { data, error, loading } = useProjectData();

	if (loading) return <div className="p-4 dark:text-white">Loading...</div>;
	if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
	if (!data) return null;

	return (
		<Layout
			projectName={data.project.name}
			projectDescription={data.project.description}
		>
			<h2 className="text-2xl font-semibold mb-6 dark:text-white">Features</h2>
			<div className="grid gap-4">
				{data.features.map((feature) => (
					<Link
						key={feature.id}
						to={`/feature/${feature.id}/${createSlug(feature.title)}`}
						className="block bg-white rounded-lg shadow-sm border p-6 hover:shadow-md hover:border-blue-300 transition-all dark:bg-gray-800 dark:border-gray-700 dark:hover:border-blue-500"
					>
						<div className="flex justify-between items-start">
							<div>
								<div className="flex items-center gap-2 mb-2">
									<span className="text-gray-400 text-sm font-mono dark:text-gray-500">
										Feature {feature.id}
									</span>
									<h3 className="text-xl font-medium text-gray-900 dark:text-white">
										{feature.title}
									</h3>
								</div>
								{feature.description && (
									<p className="text-gray-600 mb-4 dark:text-gray-300 line-clamp-2">
										{feature.description}
									</p>
								)}
								<div className="text-sm text-gray-500 dark:text-gray-400">
									{feature.stories?.length || 0} stories •{" "}
									{feature.stories?.reduce(
										(sum, s) => sum + (s.tasks?.length || 0),
										0,
									) || 0}{" "}
									tasks
								</div>
							</div>
							<span
								className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(feature.status)}`}
							>
								{feature.status}
							</span>
						</div>
					</Link>
				))}
			</div>
		</Layout>
	);
}
