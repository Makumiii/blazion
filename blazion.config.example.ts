const config = {
    notion: {
        integrationKey: process.env.NOTION_API_KEY ?? 'missing',
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
        linkedin: process.env.SOCIAL_LINKEDIN,
        x: process.env.SOCIAL_X,
        instagram: process.env.SOCIAL_INSTAGRAM,
        linktree: process.env.SOCIAL_LINKTREE,
        email: process.env.SOCIAL_EMAIL,
        phonenumber: process.env.SOCIAL_PHONENUMBER,
        facebook: process.env.SOCIAL_FACEBOOK,
        github: process.env.SOCIAL_GITHUB,
    },
    share: {
        providers: ['x', 'whatsapp', 'facebook', 'linkedin'],
    },
    site: {
        homeHeader: 'Everything Technology',
    },
    packs: [
        {
            name: 'blog',
            enabled: true,
        },
    ],
};

export default config;
