import { Link, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useFeatureData } from "../hooks/useFeatureData";
import { useProjectData } from "../hooks/useProjectData";
import { createSlug, getStatusColor } from "../utils";

export function FeatureDetailPage() {
	const { featureId } = useParams();
	const {
		data: projectData,
		error: projectError,
		loading: projectLoading,
	} = useProjectData();
	const {
		feature: fullFeature,
		error: featureError,
		loading: featureLoading,
	} = useFeatureData(featureId);

	if (projectLoading || featureLoading)
		return <div className="p-4 dark:text-white">Loading...</div>;
	if (projectError)
		return (
			<div className="p-4 text-red-500">
				Error loading project: {projectError}
			</div>
		);
	if (featureError)
		return (
			<div className="p-4 text-red-500">
				Error loading feature: {featureError}
			</div>
		);
	if (!projectData || !fullFeature) return null;

	// Use fullFeature for details, but we might want to check if it matches projectData
	const feature = fullFeature;

	return (
		<Layout
			projectName={projectData.project.name}
			projectDescription={projectData.project.description}
		>
			<nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 dark:text-gray-400">
				<Link
					to="/"
					className="hover:text-gray-900 dark:hover:text-white hover:underline transition-colors"
				>
					Features
				</Link>
				<span>/</span>
				<span className="text-gray-900 font-medium dark:text-white">
					Feature {feature.id}
				</span>
			</nav>

			<div className="bg-white rounded-lg shadow-sm border p-6 mb-8 dark:bg-gray-800 dark:border-gray-700">
				<div className="flex items-start justify-between gap-4 mb-4">
					<div>
						<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
							{feature.title}
						</h1>
						<p className="text-sm text-gray-500 mt-1 dark:text-gray-400 font-mono">
							ID: {feature.id}
						</p>
					</div>
					<span
						className={`px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wide ${getStatusColor(feature.status)}`}
					>
						{feature.status}
					</span>
				</div>

				{feature.description && (
					<div className="prose max-w-none dark:prose-invert">
						<p className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
							{feature.description}
						</p>
					</div>
				)}
			</div>

			<h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
				Stories
			</h2>
			<div className="grid gap-4">
				{feature.stories && feature.stories.length > 0 ? (
					feature.stories.map((story) => (
						<Link
							key={story.id}
							to={`/feature/${feature.id}/${createSlug(feature.title)}/story/${story.id}/${createSlug(story.title)}`}
							className="block bg-white rounded-lg border p-5 hover:border-blue-400 hover:shadow-md transition-all dark:bg-gray-800 dark:border-gray-700 dark:hover:border-blue-500"
						>
							<div className="flex justify-between items-start">
								<div>
									<div className="flex items-center gap-2 mb-1">
										<span className="text-gray-400 text-xs font-mono dark:text-gray-500">
											Story {story.id}
										</span>
										<h3 className="text-lg font-medium text-gray-900 dark:text-white">
											{story.title}
										</h3>
									</div>
									<div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
										{story.tasks?.length || 0} tasks
									</div>
								</div>
								<span
									className={`px-2 py-1 rounded text-xs font-medium uppercase ${getStatusColor(story.status)}`}
								>
									{story.status}
								</span>
							</div>
						</Link>
					))
				) : (
					<div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed dark:bg-gray-800 dark:border-gray-700">
						<p className="text-gray-500 dark:text-gray-400">
							No stories defined for this feature
						</p>
					</div>
				)}
			</div>
		</Layout>
	);
}
