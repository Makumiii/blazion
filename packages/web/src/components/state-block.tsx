import Link from 'next/link';

interface StateBlockProps {
    title: string;
    message: string;
    actionHref?: string;
    actionLabel?: string;
}

export function StateBlock({
    title,
    message,
    actionHref,
    actionLabel,
}: StateBlockProps) {
    return (
        <section className="state-block" role="status" aria-live="polite">
            <h2>{title}</h2>
            <p>{message}</p>
            {actionHref && actionLabel ? <Link href={actionHref}>{actionLabel}</Link> : null}
        </section>
    );
}
