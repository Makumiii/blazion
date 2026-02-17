import { Client } from '@notionhq/client';
import { loadRuntimeConfig } from '../config';
import { DatabaseService } from '../db';
import { listSetupPackNames, resolveSetupPackRegistration } from '../packs';

function readArg(name: string): string | undefined {
    const arg = process.argv.find((entry) => entry.startsWith(`${name}=`));
    if (!arg) {
        return undefined;
    }
    return arg.split('=')[1];
}

function readBooleanArg(name: string): boolean {
    const value = readArg(name);
    if (!value) {
        return false;
    }
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

async function main(): Promise<void> {
    const pageId = readArg('--page-id');
    const packName = readArg('--pack') ?? 'blog';
    const databaseIdArg = readArg('--database-id');
    const forceCreate = readBooleanArg('--force-create');
    const notionApiKey = process.env.NOTION_API_KEY;

    const pack = resolveSetupPackRegistration(packName);
    if (!pack || !pack.setup) {
        const available = listSetupPackNames().join(', ');
        console.error(`Unknown or non-setup pack "${packName}". Available setup packs: ${available}`);
        process.exit(1);
    }

    const runtime = await loadRuntimeConfig();
    const db = new DatabaseService(runtime.config.database.path);
    db.migrate();
    const existingDatabaseId = db.getPackDatabaseId(pack.name);

    if (databaseIdArg) {
        db.setPackDatabaseId(pack.name, databaseIdArg);
        console.log(`Linked "${pack.name}" pack to existing Notion database: ${databaseIdArg}`);
        return;
    }

    if (existingDatabaseId && !forceCreate) {
        console.log(
            `Pack "${pack.name}" is already linked to Notion database: ${existingDatabaseId}. ` +
                'Skipping creation.',
        );
        console.log(
            'Use --force-create=true to create a new database, or --database-id=<id> to relink to an existing one.',
        );
        return;
    }

    if (!pageId) {
        console.error('Missing required argument: --page-id=<notion-page-id> (unless --database-id is provided).');
        process.exit(1);
    }

    if (!notionApiKey) {
        console.error('Missing required environment variable: NOTION_API_KEY');
        process.exit(1);
    }

    const client = new Client({ auth: notionApiKey });
    const notionDatabaseId = await pack.setup.createDatabase({
        client,
        pageId,
    });

    db.setPackDatabaseId(pack.name, notionDatabaseId);
    console.log('Notion database created successfully.');
    console.log(`Database ID: ${notionDatabaseId}`);
    console.log(`Linked "${pack.name}" pack to the created Notion database in local internal metadata.`);
}

main().catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
});
