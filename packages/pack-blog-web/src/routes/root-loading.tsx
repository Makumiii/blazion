import { HomeFeedSkeleton } from '../components/home-feed-skeleton';

export default function Loading() {
    return (
        <main className="shell home-shell" aria-busy="true" aria-live="polite">
            <HomeFeedSkeleton rows={4} showControls />
        </main>
    );
}
