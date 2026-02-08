import './globals.css';

export const metadata = {
    title: 'Blog Engine',
    description: 'A beautiful blog powered by Notion',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
