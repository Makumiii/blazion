import { z } from 'zod';

export const builtinPackNameSchema = z.enum(['blog']);
export type BuiltinPackName = z.infer<typeof builtinPackNameSchema>;

export const packNameSchema = z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9-]*$/, 'Pack names must be lowercase kebab-case (for example "blog").');

export const semverSchema = z
    .string()
    .min(1)
    .regex(
        /^(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/,
        'Version must be valid semver (for example "1.0.0").',
    );

export const packCapabilityFlagsSchema = z
    .object({
        api: z.boolean().optional(),
        web: z.boolean().optional(),
        sync: z.boolean().optional(),
        setup: z.boolean().optional(),
        search: z.boolean().optional(),
    })
    .default({});

export type PackCapabilityFlags = z.infer<typeof packCapabilityFlagsSchema>;

export const packManifestBaseSchema = z.object({
    name: packNameSchema,
    version: semverSchema,
    description: z.string().min(1),
    capabilities: packCapabilityFlagsSchema,
});

export type PackManifestBase = z.infer<typeof packManifestBaseSchema>;
export type PackManifestBaseInput = Omit<PackManifestBase, 'capabilities'> & {
    capabilities?: PackCapabilityFlags;
};

export interface ApiPackContext {
    app: unknown;
    runtime: unknown;
}

export interface SyncPackContext {
    runtime: unknown;
}

export interface SetupPackContext {
    runtime: unknown;
    args: {
        pageId?: string;
        [key: string]: string | undefined;
    };
}

export interface WebPackContext {
    runtime: unknown;
    routes: unknown;
}

export interface SyncExecutionResult {
    synced: number;
    skipped: number;
    errors: number;
    removed: number;
}

export interface ApiPackManifest extends Omit<PackManifestBase, 'capabilities'> {
    capabilities?: PackCapabilityFlags;
    registerApiRoutes: (context: ApiPackContext) => void | Promise<void>;
}

export interface SyncPackManifest extends Omit<PackManifestBase, 'capabilities'> {
    capabilities?: PackCapabilityFlags;
    runSync: (context: SyncPackContext) => Promise<SyncExecutionResult>;
    runImageRefresh?: (context: SyncPackContext) => Promise<SyncExecutionResult>;
}

export interface SetupPackManifest extends Omit<PackManifestBase, 'capabilities'> {
    capabilities?: PackCapabilityFlags;
    runSetup: (context: SetupPackContext) => Promise<void>;
}

export interface WebNavItem {
    label: string;
    href: string;
    order?: number;
}

export const webNavItemSchema = z.object({
    label: z.string().min(1),
    href: z.string().min(1),
    order: z.number().int().optional(),
});

export interface WebPackManifest extends Omit<PackManifestBase, 'capabilities'> {
    capabilities?: PackCapabilityFlags;
    registerWebRoutes: (context: WebPackContext) => void | Promise<void>;
    navigation?: WebNavItem[];
}

function assertFunction(value: unknown, fieldName: string): void {
    if (typeof value !== 'function') {
        throw new Error(`Pack manifest field "${fieldName}" must be a function.`);
    }
}

function parseManifestBase(input: PackManifestBaseInput): PackManifestBase {
    return packManifestBaseSchema.parse({
        ...input,
        capabilities: input.capabilities ?? {},
    });
}

export function defineApiPackManifest(input: ApiPackManifest): ApiPackManifest {
    assertFunction(input.registerApiRoutes, 'registerApiRoutes');
    const parsed = parseManifestBase(input);
    return {
        ...input,
        ...parsed,
        capabilities: {
            ...parsed.capabilities,
            api: true,
        },
    };
}

export function defineSyncPackManifest(input: SyncPackManifest): SyncPackManifest {
    assertFunction(input.runSync, 'runSync');
    if (input.runImageRefresh !== undefined) {
        assertFunction(input.runImageRefresh, 'runImageRefresh');
    }
    const parsed = parseManifestBase(input);
    return {
        ...input,
        ...parsed,
        capabilities: {
            ...parsed.capabilities,
            sync: true,
        },
    };
}

export function defineSetupPackManifest(input: SetupPackManifest): SetupPackManifest {
    assertFunction(input.runSetup, 'runSetup');
    const parsed = parseManifestBase(input);
    return {
        ...input,
        ...parsed,
        capabilities: {
            ...parsed.capabilities,
            setup: true,
        },
    };
}

export function defineWebPackManifest(input: WebPackManifest): WebPackManifest {
    assertFunction(input.registerWebRoutes, 'registerWebRoutes');
    const parsed = parseManifestBase(input);
    const navigation = input.navigation?.map((item) => webNavItemSchema.parse(item));
    return {
        ...input,
        ...parsed,
        capabilities: {
            ...parsed.capabilities,
            web: true,
        },
        navigation,
    };
}

export const packConfigSchema = z.object({
    name: packNameSchema,
    enabled: z.boolean().default(true),
    options: z.record(z.unknown()).default({}),
});

export type PackConfig = z.infer<typeof packConfigSchema>;

export type PackConfigInput =
    | string
    | {
          name: string;
          enabled?: boolean;
          options?: Record<string, unknown>;
      };

export function normalizePackConfig(input: PackConfigInput): PackConfig {
    if (typeof input === 'string') {
        return packConfigSchema.parse({
            name: input,
            enabled: true,
            options: {},
        });
    }

    return packConfigSchema.parse({
        name: input.name,
        enabled: input.enabled ?? true,
        options: input.options ?? {},
    });
}

export function resolveEnabledPackNames(packs: PackConfig[]): string[] {
    return packs.filter((pack) => pack.enabled).map((pack) => pack.name);
}
