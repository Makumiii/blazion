'use client';

import { useRouter } from 'next/navigation';
import { Button } from './ui/button';

export function BackButton() {
    const router = useRouter();

    const onBack = () => {
        if (window.history.length > 1) {
            router.back();
            return;
        }
        router.push('/');
    };

    return (
        <Button type="button" variant="unstyled" onClick={onBack} className="back-link" aria-label="Go back">
            <span aria-hidden="true">←</span>
        </Button>
    );
}
