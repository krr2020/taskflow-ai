import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface LayoutProps {
	children: ReactNode;
	projectName?: string;
	projectDescription?: string;
}

export function Layout({
	children,
	projectName,
	projectDescription,
}: LayoutProps) {
	return (
		<div className="min-h-screen bg-gray-50 text-gray-900 font-sans dark:bg-gray-900 dark:text-gray-100">
			<header className="bg-white border-b px-6 py-4 sticky top-0 z-10 dark:bg-gray-800 dark:border-gray-700">
				<div className="flex items-center justify-between">
					<Link
						to="/"
						className="text-xl font-bold hover:text-blue-600 transition-colors"
					>
						{projectName || "TaskFlow"}
					</Link>
					{projectDescription && (
						<p className="text-gray-500 text-sm dark:text-gray-400">
							{projectDescription}
						</p>
					)}
				</div>
			</header>

			<main className="p-6 max-w-5xl mx-auto">{children}</main>
		</div>
	);
}
