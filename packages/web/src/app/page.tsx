import { HomeFeed } from '@/components/home-feed';

export const revalidate = 120;

export default async function HomePage() {
    return <HomeFeed />;
}
