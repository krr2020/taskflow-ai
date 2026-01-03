import { Link, useParams } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useProjectData } from "../hooks/useProjectData";
import { useTaskData } from "../hooks/useTaskData";
import { createSlug, getStatusColor } from "../utils";

export function TaskDetailPage() {
	const { featureId, storyId, taskId } = useParams();
	const {
		data: projectData,
		error: projectError,
		loading: projectLoading,
	} = useProjectData();
	const {
		task: fullTask,
		error: taskError,
		loading: taskLoading,
	} = useTaskData(taskId);

	if (projectLoading || taskLoading)
		return <div className="p-4 dark:text-white">Loading...</div>;
	if (projectError)
		return (
			<div className="p-4 text-red-500">
				Error loading project: {projectError}
			</div>
		);
	if (taskError)
		return (
			<div className="p-4 text-red-500">Error loading task: {taskError}</div>
		);
	if (!projectData || !fullTask) return null;

	const feature = projectData.features.find((f) => f.id === featureId);
	if (!feature)
		return <div className="p-4 text-red-500">Feature not found</div>;

	const story = feature.stories?.find((s) => s.id === storyId);
	if (!story) return <div className="p-4 text-red-500">Story not found</div>;

	// We use the full task data fetched from the API
	const task = fullTask;

	return (
		<Layout
			projectName={projectData.project.name}
			projectDescription={projectData.project.description}
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
				<Link
					to={`/feature/${feature.id}/${createSlug(feature.title)}/story/${story.id}/${createSlug(story.title)}`}
					className="hover:text-gray-900 dark:hover:text-white hover:underline transition-colors"
				>
					Story {story.id}
				</Link>
				<span>/</span>
				<span className="text-gray-900 font-medium dark:text-white">
					Task {task.id}
				</span>
			</nav>

			<div className="bg-white rounded-lg shadow-sm border p-6 mb-6 dark:bg-gray-800 dark:border-gray-700">
				<div className="flex items-start justify-between gap-4 mb-6">
					<div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-white">
							{task.title}
						</h1>
						<p className="text-sm text-gray-500 mt-1 dark:text-gray-400 font-mono">
							ID: {task.id}
						</p>
					</div>
					<span
						className={`px-3 py-1 rounded-full text-sm font-medium uppercase ${getStatusColor(task.status)}`}
					>
						{task.status}
					</span>
				</div>

				<div className="grid gap-6">
					{task.description && (
						<div>
							<h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 dark:text-gray-400">
								Description
							</h2>
							<p className="text-gray-700 leading-relaxed dark:text-gray-300">
								{task.description}
							</p>
						</div>
					)}

					{task.skill && (
						<div>
							<h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 dark:text-gray-400">
								Skill Required
							</h2>
							<span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium dark:bg-purple-900 dark:text-purple-300">
								{task.skill}
							</span>
						</div>
					)}

					{task.estimatedHours !== undefined && (
						<div>
							<h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 dark:text-gray-400">
								Estimated Time
							</h2>
							<span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium dark:bg-blue-900 dark:text-blue-300">
								{task.estimatedHours} hours
							</span>
						</div>
					)}

					{task.dependencies && task.dependencies.length > 0 && (
						<div>
							<h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 dark:text-gray-400">
								Dependencies
							</h2>
							<div className="flex flex-wrap gap-2">
								{task.dependencies.map((dep) => (
									<span
										key={dep}
										className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-mono dark:bg-gray-700 dark:text-gray-300"
									>
										{dep}
									</span>
								))}
							</div>
						</div>
					)}

					{task.context && task.context.length > 0 && (
						<div>
							<h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 dark:text-gray-400">
								Context
							</h2>
							<ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
								{task.context.map((ctx) => (
									<li key={ctx}>{ctx}</li>
								))}
							</ul>
						</div>
					)}

					{task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
						<div>
							<h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2 dark:text-gray-400">
								Acceptance Criteria
							</h2>
							<ul className="space-y-2 text-gray-700 dark:text-gray-300">
								{task.acceptanceCriteria.map((criteria) => (
									<li key={criteria} className="flex gap-2 items-start">
										<span className="text-blue-500 mt-1.5">•</span>
										<span>{criteria}</span>
									</li>
								))}
							</ul>
						</div>
					)}

					{task.subtasks && task.subtasks.length > 0 && (
						<div>
							<h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 dark:text-gray-400">
								Subtasks
							</h2>
							<div className="space-y-2">
								{task.subtasks.map((subtask) => (
									<div
										key={subtask.id}
										className="bg-gray-50 rounded p-3 border flex items-center justify-between gap-4 dark:bg-gray-700 dark:border-gray-600"
									>
										<div className="flex items-center gap-3">
											<div
												className={`w-2 h-2 rounded-full ${subtask.status === "completed" ? "bg-green-500" : "bg-gray-300"}`}
											></div>
											<span className="text-gray-700 dark:text-gray-200">
												{subtask.description}
											</span>
										</div>
										<span
											className={`px-2 py-0.5 rounded text-xs font-medium uppercase ${getStatusColor(subtask.status)}`}
										>
											{subtask.status}
										</span>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</Layout>
	);
}
