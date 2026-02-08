export default function HomePage() {
    return (
        <main className="min-h-screen p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-4">
                    Blog Engine
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                    A beautiful blog powered by Notion
                </p>

                <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <h2 className="text-xl font-semibold mb-2">🚧 Under Construction</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        The frontend is being built. Check back soon!
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-gray-500">
                        <li>✓ Phase 1: Monorepo Foundation</li>
                        <li>○ Phase 2: Shared Types & Config</li>
                        <li>○ Phase 3: API Core & Notion Integration</li>
                        <li>○ Phase 4: API Endpoints & Cron Jobs</li>
                        <li>○ Phase 5: Next.js Frontend</li>
                        <li>○ Phase 6: Integration & Polish</li>
                    </ul>
                </div>
            </div>
        </main>
    );
}
