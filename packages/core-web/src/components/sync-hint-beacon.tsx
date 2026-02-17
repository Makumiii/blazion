'use client';

import { useEffect } from 'react';

const SESSION_HINT_SENT_KEY = 'blazion-sync-hint-sent';
const SESSION_ID_KEY = 'blazion-sync-session-id';

function isSyncHintEnabled() {
    const configured = process.env.NEXT_PUBLIC_SYNC_HINT_ENABLED;
    if (configured !== undefined) {
        return configured.trim().toLowerCase() === 'true';
    }
    return process.env.NODE_ENV !== 'production';
}

function apiBaseUrl() {
    const configured =
        process.env.NEXT_PUBLIC_BLAZION_API_URL ??
        process.env.BLAZION_API_URL;
    if (configured && configured.trim().length > 0) {
        return configured.trim();
    }
    if (process.env.NODE_ENV === 'production') {
        console.error(
            'Missing API base URL in production. Set NEXT_PUBLIC_BLAZION_API_URL (or BLAZION_API_URL).',
        );
        return null;
    }
    return 'http://localhost:3000';
}

function getOrCreateSessionId() {
    try {
        const existing = localStorage.getItem(SESSION_ID_KEY);
        if (existing && existing.length > 0) {
            return existing;
        }

        const created = `sess_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
        localStorage.setItem(SESSION_ID_KEY, created);
        return created;
    } catch {
        return `anon_${Date.now().toString(36)}`;
    }
}

export function SyncHintBeacon() {
    useEffect(() => {
        if (!isSyncHintEnabled()) {
            return;
        }

        try {
            if (sessionStorage.getItem(SESSION_HINT_SENT_KEY) === '1') {
                return;
            }
            sessionStorage.setItem(SESSION_HINT_SENT_KEY, '1');
        } catch {
            // Ignore storage errors and still attempt once.
        }

        const controller = new AbortController();
        const sessionId = getOrCreateSessionId();
        const baseUrl = apiBaseUrl();
        if (!baseUrl) {
            return () => controller.abort();
        }

        fetch(`${baseUrl}/api/sync/hint`, {
            method: 'POST',
            headers: {
                'x-sync-session': sessionId,
            },
            keepalive: true,
            signal: controller.signal,
        }).catch(() => {
            // Best-effort only; no UI impact.
        });

        return () => controller.abort();
    }, []);

    return null;
}
