import { createPlaywrightRouter } from '@crawlee/playwright';

export const router = createPlaywrightRouter();

const toAbsoluteUrl = (value, pageUrl) => {
    if (typeof value !== 'string' || !value.trim()) return null;

    try {
        return new URL(value.trim().replaceAll('\\/', '/'), pageUrl).href;
    } catch {
        return null;
    }
};

const firstString = (...values) => values.find((value) => typeof value === 'string' && value.trim())?.trim() || null;

const confirmAgeGate = async (page, log) => {
    const pageText = (
        await page
            .locator('body')
            .innerText()
            .catch(() => '')
    ).toLowerCase();
    if (!/\b(?:18\+|18 years|age verification|verify your age|are you 18)\b/.test(pageText)) return false;

    const confirmation = page
        .getByRole('button', {
            name: /(?:i am|yes,? i am|enter|continue).*(?:18|adult)|(?:18|adult).*(?:enter|continue)/i,
        })
        .first();
    if (await confirmation.isVisible().catch(() => false)) {
        await confirmation.click();
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        log.info('Confirmed visible age gate');
        return true;
    }

    const linkConfirmation = page
        .getByRole('link', {
            name: /(?:i am|yes,? i am|enter|continue).*(?:18|adult)|(?:18|adult).*(?:enter|continue)/i,
        })
        .first();
    if (await linkConfirmation.isVisible().catch(() => false)) {
        await linkConfirmation.click();
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        log.info('Confirmed visible age gate');
        return true;
    }

    log.warning('Age verification page detected, but no normal confirmation control was found');
    return false;
};

const extractVideoData = async (page) =>
    page.evaluate(() => {
        const model = window.initials?.videoModel;
        const meta = (selector, attribute = 'content') => document.querySelector(selector)?.getAttribute(attribute);
        const text = (selector) => document.querySelector(selector)?.textContent?.trim();

        return {
            title: text('h1') || meta('meta[property="og:title"]'),
            description: text('.video-description') || meta('meta[name="description"]'),
            thumbnailUrl: meta('meta[property="og:image"]') || model?.thumbnail,
            mp4Url:
                model?.sources?.mp4 ||
                model?.sources?.standard ||
                model?.sources?.hls ||
                document.querySelector('video source')?.src ||
                document.querySelector('video')?.src ||
                meta('meta[property="og:video:secure_url"]') ||
                meta('meta[property="og:video:url"]') ||
                meta('meta[property="og:video"]'),
            duration: model?.duration ?? null,
            quality: model?.sources?.types ?? null,
        };
    });

router.addDefaultHandler(async ({ page, enqueueLinks, request, log }) => {
    await page.waitForLoadState('domcontentloaded');
    await confirmAgeGate(page, log);
    const videos = await page.$$eval(
        'a.video-thumb__title, a.video-thumb__image-container, a[data-role="thumb-link"], a.video-thumb-info__name',
        (elements) =>
            elements.map((element) => ({
                url: element.href,
                title:
                    element.querySelector('.video-thumb-info__name, .video-thumb__title')?.getAttribute('title') ||
                    element.getAttribute('title') ||
                    element.textContent?.trim() ||
                    null,
            })),
    );
    const titlesByUrl = new Map(videos.map(({ url, title }) => [url, { title }]));

    log.info('Enqueueing video detail pages', { url: request.loadedUrl ?? request.url, count: videos.length });
    await enqueueLinks({
        urls: videos.map(({ url }) => url),
        label: 'DETAIL',
        transformRequestFunction: (requestOptions) => ({
            ...requestOptions,
            label: 'DETAIL',
            userData: titlesByUrl.get(requestOptions.url),
        }),
    });
    await enqueueLinks({ selector: 'a.pager__item[data-page], a[rel="next"]' });
});

router.addHandler('DETAIL', async ({ page, request, log, pushData }) => {
    await page.waitForLoadState('domcontentloaded');
    await confirmAgeGate(page, log);
    await page.waitForTimeout(500);

    const videoUrl = request.loadedUrl ?? request.url;
    const extracted = await extractVideoData(page);
    const title = firstString(extracted.title, request.userData?.title);

    log.info('Saving video metadata', { title, videoUrl, hasMp4Url: Boolean(extracted.mp4Url) });
    await pushData({
        title,
        videoUrl,
        description: firstString(extracted.description),
        thumbnailUrl: toAbsoluteUrl(extracted.thumbnailUrl, videoUrl),
        mp4Url: toAbsoluteUrl(extracted.mp4Url, videoUrl),
        duration: extracted.duration,
        quality: extracted.quality,
    });
});
