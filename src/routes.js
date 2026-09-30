import { createCheerioRouter } from '@crawlee/cheerio';

export const router = createCheerioRouter();

const toAbsoluteUrl = (value, pageUrl) => {
    if (!value) return null;

    try {
        return new URL(value, pageUrl).href;
    } catch {
        return null;
    }
};

const extractMp4Url = ($, pageUrl) => {
    const candidates = [
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
    return toAbsoluteUrl(match?.[0]?.replaceAll('\\/', '/'), pageUrl);
};

router.addDefaultHandler(async ({ enqueueLinks, request, log }) => {
    log.info('Enqueueing video detail pages', { url: request.loadedUrl });
    const urls = [];
    $('a[data-role="thumb-link"], a.video-thumb-info__name').each((_, element) => {
        const href = $(element).attr('href');
        const title = $(element).find('.video-thumb-info__name').attr('title') || $(element).attr('title');

        if (href) urls.push({ url: href, userData: { title: title?.trim() || null } });
    });

    await enqueueLinks({
        urls,
        label: 'DETAIL',
    });
});

router.addHandler('DETAIL', async ({ request, $, log, pushData }) => {
    const videoUrl = request.loadedUrl ?? request.url;
    const title = request.userData?.title || $('.video-thumb-info__name').first().attr('title')?.trim() || $('h1').first().text().trim() || $('meta[property="og:title"]').attr('content')?.trim() || null;
    const description = $('.video-description').first().text().trim() || $('[class*="description" i]').first().text().trim() || $('meta[name="description"]').attr('content')?.trim() || null;
    const mp4Url = extractMp4Url($, videoUrl);

    log.info('Saving video metadata', { title, videoUrl });
    await pushData({ title, videoUrl, description, mp4Url });
});
