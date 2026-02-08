const WORDS_PER_MINUTE = 220;

function countWords(text) {
    if (!text || typeof text !== 'string') {
        return 0;
    }
    const tokens = text.trim().split(/\s+/).filter(Boolean);
    return tokens.length;
}

function wordsFromRichTextArray(entries) {
    if (!Array.isArray(entries)) {
        return 0;
    }
    let total = 0;
    for (const entry of entries) {
        if (typeof entry === 'string') {
            total += countWords(entry);
            continue;
        }
        if (Array.isArray(entry) && typeof entry[0] === 'string') {
            total += countWords(entry[0]);
        }
    }
    return total;
}

function wordsFromRecordMap(recordMap) {
    const blockMap = recordMap?.block;
    if (!blockMap || typeof blockMap !== 'object') {
        return 0;
    }

    let total = 0;
    for (const blockEntry of Object.values(blockMap)) {
        const properties = blockEntry?.value?.properties;
        if (!properties || typeof properties !== 'object') {
            continue;
        }

        for (const value of Object.values(properties)) {
            total += wordsFromRichTextArray(value);
        }
    }

    return total;
}

function wordsFromBlocks(blocks) {
    if (!Array.isArray(blocks)) {
        return 0;
    }

    let total = 0;
    for (const block of blocks) {
        if (!block || typeof block !== 'object') {
            continue;
        }
        const blockType = block.type;
        const payload = blockType ? block[blockType] : null;
        if (!payload || typeof payload !== 'object') {
            continue;
        }

        if (Array.isArray(payload.rich_text)) {
            for (const rich of payload.rich_text) {
                if (typeof rich?.plain_text === 'string') {
                    total += countWords(rich.plain_text);
                }
            }
        }

        if (Array.isArray(payload.caption)) {
            for (const rich of payload.caption) {
                if (typeof rich?.plain_text === 'string') {
                    total += countWords(rich.plain_text);
                }
            }
        }
    }

    return total;
}

export function estimateReadTime(content) {
    if (!content || typeof content !== 'object') {
        return null;
    }

    let words = 0;
    if (content.renderMode === 'recordMap') {
        words = wordsFromRecordMap(content.recordMap);
    } else if (content.renderMode === 'blocks') {
        words = wordsFromBlocks(content.blocks);
    }

    if (words <= 0) {
        return null;
    }

    return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
