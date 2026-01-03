import { Route, Routes } from "react-router-dom";
import { FeatureDetailPage } from "./pages/FeatureDetailPage";
import { FeatureListPage } from "./pages/FeatureListPage";
import { StoryDetailPage } from "./pages/StoryDetailPage";
import { TaskDetailPage } from "./pages/TaskDetailPage";

export default function App() {
	return (
		<Routes>
			<Route path="/" element={<FeatureListPage />} />
			<Route
				path="/feature/:featureId/:featureSlug"
				element={<FeatureDetailPage />}
			/>
			<Route
				path="/feature/:featureId/:featureSlug/story/:storyId/:storySlug"
				element={<StoryDetailPage />}
			/>
			<Route
				path="/task/:featureId/:featureSlug/:storyId/:storySlug/:taskId/:taskSlug"
				element={<TaskDetailPage />}
			/>
		</Routes>
	);
}
