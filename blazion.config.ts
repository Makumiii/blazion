const config = {
    notion: {
        integrationKey: process.env.NOTION_API_KEY ?? 'missing',
        databaseId: process.env.NOTION_DATABASE_ID ?? 'missing',
    },
    cron: {
        syncInterval: '*/30 * * * *',
        imageRefreshInterval: '0 * * * *',
    },
    sync: {
        publicOnly: true,
    },
    database: {
        path: './data/blog.db',
    },
    server: {
        port: Number(process.env.PORT ?? 3000),
    },
    socials: {
        linkedin: 'https://www.linkedin.com/in/john-makumi-20a98a2bb/',
        x: 'https://x.com/dev_maks',
        instagram: process.env.SOCIAL_INSTAGRAM,
        linktree: process.env.SOCIAL_LINKTREE,
        email: process.env.SOCIAL_EMAIL,
        phonenumber: process.env.SOCIAL_PHONENUMBER,
        facebook: process.env.SOCIAL_FACEBOOK,
        github: 'https://github.com/Makumiii',
    },
};

export default config;
