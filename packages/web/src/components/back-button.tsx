'use client';

import { useRouter } from 'next/navigation';

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
        <button type="button" onClick={onBack} className="back-link" aria-label="Go back">
            <span aria-hidden="true">←</span>
        </button>
    );
}
