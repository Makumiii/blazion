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
                rich_text: {},
            },
            Tags: {
                multi_select: {},
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
        },
    });

    console.log('Notion database created successfully.');
    console.log(`Database ID: ${database.id}`);
    console.log('Add this value to your .env file as NOTION_DATABASE_ID.');
}

main().catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
});
