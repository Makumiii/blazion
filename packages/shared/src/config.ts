// Placeholder - will be implemented in Phase 2
export interface BlogEngineConfig {
    notion: {
        integrationKey: string;
        databaseId: string;
    };
    cron: {
        syncInterval: string;
        imageRefreshInterval: string;
    };
    sync: {
        publicOnly: boolean;
    };
    database: {
        path: string;
    };
    server: {
        port: number;
    };
}

export function defineConfig(config: BlogEngineConfig): BlogEngineConfig {
    return config;
}
