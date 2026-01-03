import { Link, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useProjectData } from "../hooks/useProjectData";
import { createSlug, getStatusColor } from "../utils";

export function StoryDetailPage() {
	const { featureId, storyId } = useParams();
	const { data, error, loading } = useProjectData();

	if (loading) return <div className="p-4 dark:text-white">Loading...</div>;
	if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
	if (!data) return null;

	const feature = data.features.find((f) => f.id === featureId);
	if (!feature)
		return <div className="p-4 text-red-500">Feature not found</div>;

	const story = feature.stories?.find((s) => s.id === storyId);
	if (!story) return <div className="p-4 text-red-500">Story not found</div>;

	return (
		<Layout
			projectName={data.project.name}
			projectDescription={data.project.description}
		>
			<nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 dark:text-gray-400 flex-wrap">
				<Link
					to="/"
					className="hover:text-gray-900 dark:hover:text-white hover:underline transition-colors"
				>
					Features
				</Link>
				<span>/</span>
				<Link
					to={`/feature/${feature.id}/${createSlug(feature.title)}`}
					className="hover:text-gray-900 dark:hover:text-white hover:underline transition-colors"
				>
					Feature {feature.id}
				</Link>
				<span>/</span>
				<span className="text-gray-900 font-medium dark:text-white">
					Story {story.id}
				</span>
			</nav>

			<div className="bg-white rounded-lg shadow-sm border p-6 mb-8 dark:bg-gray-800 dark:border-gray-700">
				<div className="flex items-start justify-between gap-4 mb-4">
					<div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
							{story.title}
						</h1>
						<p className="text-sm text-gray-500 mt-1 dark:text-gray-400 font-mono">
							ID: {story.id}
						</p>
					</div>
					<span
						className={`px-3 py-1 rounded-full text-sm font-medium uppercase ${getStatusColor(story.status)}`}
					>
						{story.status}
					</span>
				</div>

				{story.description && (
					<div className="prose max-w-none dark:prose-invert">
						<p className="text-gray-700 dark:text-gray-300 leading-relaxed">
							{story.description}
						</p>
					</div>
				)}
			</div>

			<h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
				Tasks
			</h2>
			<div className="grid gap-3">
				{story.tasks && story.tasks.length > 0 ? (
					story.tasks.map((task) => (
						<Link
							key={task.id}
							to={`/task/${feature.id}/${createSlug(feature.title)}/${story.id}/${createSlug(story.title)}/${task.id}/${createSlug(task.title)}`}
							className="block bg-white rounded-lg border p-4 hover:border-blue-400 hover:shadow-sm transition-all dark:bg-gray-800 dark:border-gray-700 dark:hover:border-blue-500"
						>
							<div className="flex justify-between items-start gap-4">
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-1">
										<span className="text-gray-400 text-xs font-mono dark:text-gray-500">
											Task {task.id}
										</span>
										<h3 className="text-lg font-medium text-gray-900 dark:text-white">
											{task.title}
										</h3>
									</div>
									{task.description && (
										<p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
											{task.description}
										</p>
									)}
								</div>
								<span
									className={`px-2 py-0.5 rounded text-xs font-medium uppercase whitespace-nowrap ${getStatusColor(task.status)}`}
								>
									{task.status}
								</span>
							</div>
						</Link>
					))
				) : (
					<div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed dark:bg-gray-800 dark:border-gray-700">
						<p className="text-gray-500 dark:text-gray-400">
							No tasks defined for this story
						</p>
					</div>
				)}
			</div>
		</Layout>
	);
}
