import { z } from 'zod';

export const builtinPackNameSchema = z.enum(['blog']);
export type BuiltinPackName = z.infer<typeof builtinPackNameSchema>;

export const packConfigSchema = z.object({
    name: z.string().min(1),
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

