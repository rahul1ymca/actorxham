import { createCheerioRouter } from '@crawlee/cheerio';

export const router = createCheerioRouter();

const toAbsoluteUrl = (value, pageUrl) => {
    if (typeof value !== 'string' || !value.trim()) return null;

    try {
        return new URL(value.trim().replaceAll('\\/', '/'), pageUrl).href;
    } catch {
        return null;
    }
};

const extractInitials = ($) => {
    for (const script of $('script').toArray()) {
        const content = $(script).html() ?? '';
        const assignment = content.match(/(?:window\.)?initials\s*=\s*/);
        if (!assignment) continue;

        const start = content.indexOf('{', assignment.index + assignment[0].length);
        if (start < 0) continue;

        let depth = 0;
        let quote = false;
        let escaped = false;
        for (let index = start; index < content.length; index += 1) {
            const character = content[index];
            if (quote) {
                if (escaped) escaped = false;
                else if (character === '\\') escaped = true;
                else if (character === '"') quote = false;
                continue;
            }
            if (character === '"') quote = true;
            else if (character === '{') depth += 1;
            else if (character === '}' && --depth === 0) {
                try {
                    return JSON.parse(content.slice(start, index + 1));
                } catch {
                    break;
                }
            }
        }
    }

    return null;
};

const firstString = (...values) => values.find((value) => typeof value === 'string' && value.trim())?.trim() || null;

const extractMp4Url = ($, pageUrl) => {
    const model = extractInitials($)?.videoModel;
    const modelSources = model?.sources;
    const candidates = [
        modelSources?.mp4,
        modelSources?.standard,
        modelSources?.hls,
        $('video source[src$=".mp4" i]').first().attr('src'),
        $('video[src$=".mp4" i]').first().attr('src'),
        $('[data-video-url*=".mp4" i]').first().attr('data-video-url'),
        $('[data-src*=".mp4" i]').first().attr('data-src'),
        $('meta[property="og:video:secure_url"]').attr('content'),
        $('meta[property="og:video:url"]').attr('content'),
        $('meta[property="og:video"]').attr('content'),
    ];

    for (const candidate of candidates) {
        const url = toAbsoluteUrl(candidate, pageUrl);
        if (url?.toLowerCase().includes('.mp4')) return url;
    }

    const match = $.html().match(/https?:\/\/[^"'\s]+\.mp4(?:\?[^"'\s]*)?/i);
    return toAbsoluteUrl(match?.[0], pageUrl);
};

router.addDefaultHandler(async ({ enqueueLinks, request, $, log }) => {
    log.info('Enqueueing video detail pages', { url: request.loadedUrl });
    const urls = [];
    $('a.video-thumb__title, a.video-thumb__image-container, a[data-role="thumb-link"], a.video-thumb-info__name').each(
        (_, element) => {
            const href = $(element).attr('href');
            const title =
                $(element).find('.video-thumb-info__name, .video-thumb__title').attr('title') ||
                $(element).attr('title') ||
                $(element).text();

            if (href) urls.push({ url: href, userData: { title: title?.trim() || null } });
        },
    );

    const titlesByUrl = new Map(
        urls.map(({ url, userData }) => [new URL(url, request.loadedUrl ?? request.url).href, userData]),
    );
    await enqueueLinks({
        urls: urls.map(({ url }) => url),
        label: 'DETAIL',
        transformRequestFunction: (requestOptions) => ({
            ...requestOptions,
            label: 'DETAIL',
            userData: titlesByUrl.get(requestOptions.url),
        }),
    });

    await enqueueLinks({
        selector: 'a.pager__item[data-page], a[rel="next"]',
    });
});

router.addHandler('DETAIL', async ({ request, $, log, pushData }) => {
    const videoUrl = request.loadedUrl ?? request.url;
    const model = extractInitials($)?.videoModel;
    const title = firstString(
        $('h1').first().text(),
        $('meta[property="og:title"]').attr('content'),
        request.userData?.title,
    );
    const description = firstString(
        $('.video-description').first().text(),
        $('meta[name="description"]').attr('content'),
        $('[class*="description" i]').first().text(),
    );
    const thumbnailUrl = toAbsoluteUrl($('meta[property="og:image"]').attr('content') || model?.thumbnail, videoUrl);
    const mp4Url = extractMp4Url($, videoUrl);
    const quality = model?.sources?.types ?? null;

    log.info('Saving video metadata', { title, videoUrl, hasMp4Url: Boolean(mp4Url) });
    await pushData({
        title,
        videoUrl,
        description,
        thumbnailUrl,
        mp4Url,
        duration: model?.duration ?? null,
        quality,
    });
});
