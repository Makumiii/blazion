import { Client } from '@notionhq/client';

function readArg(name: string): string | undefined {
    const arg = process.argv.find((entry) => entry.startsWith(`${name}=`));
    if (!arg) {
        return undefined;
    }
    return arg.split('=')[1];
}

async function main(): Promise<void> {
    const pageId = readArg('--page-id');
    const notionApiKey = process.env.NOTION_API_KEY;

    if (!pageId) {
        console.error('Missing required argument: --page-id=<notion-page-id>');
        process.exit(1);
    }

    if (!notionApiKey) {
        console.error('Missing required environment variable: NOTION_API_KEY');
        process.exit(1);
    }

    const client = new Client({ auth: notionApiKey });

    const database = await client.databases.create({
        parent: {
            type: 'page_id',
            page_id: pageId,
        },
        title: [
            {
                type: 'text',
                text: {
                    content: 'Blog Posts',
                },
            },
        ],
        properties: {
            Title: {
                title: {},
            },
            Slug: {
                rich_text: {},
            },
            Summary: {
                rich_text: {},
            },
            Author: {
                people: {},
            },
            Tags: {
                multi_select: {},
            },
            Segment: {
                select: {
                    options: [
                        { name: 'engineering', color: 'blue' },
                        { name: 'product', color: 'purple' },
                        { name: 'career', color: 'orange' },
                    ],
                },
            },
            Status: {
                select: {
                    options: [
                        { name: 'draft', color: 'gray' },
                        { name: 'pending', color: 'yellow' },
                        { name: 'ready', color: 'green' },
                    ],
                },
            },
            Published: {
                date: {},
            },
            Banner: {
                files: {},
            },
            Featured: {
                checkbox: {},
            },
        },
    });

    try {
        await client.databases.update({
            database_id: database.id,
            properties: {
                'Related Posts': {
                    relation: {
                        database_id: database.id,
                        single_property: {},
                    },
                },
            },
        });
    } catch (error) {
        console.warn(
            'Warning: could not auto-create "Related Posts" relation property. Add it manually in Notion if needed.',
        );
        console.warn(error);
    }

    console.log('Notion database created successfully.');
    console.log(`Database ID: ${database.id}`);
    console.log('Add this value to your .env file as NOTION_DATABASE_ID.');
}

main().catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
});
