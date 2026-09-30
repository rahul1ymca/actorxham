import { CheerioCrawler, purgeDefaultStorages } from '@crawlee/cheerio';
import { createServer } from 'node:http';
import { beforeAll, describe, expect, it } from 'vitest';

import { router } from '../src/routes.js';

describe('CheerioCrawler', () => {
    beforeAll(async () => {
        await purgeDefaultStorages();
    });

    it('should extract listing title, detail description, and MP4 URL', async () => {
        const server = createServer((request, response) => {
            response.setHeader('content-type', 'text/html');
            if (request.url === '/listing') {
                response.end('<a data-role="thumb-link" href="/video/1"><span class="video-thumb-info__name" title="Listing title"></span></a>');
                return;
            }

            response.end('<h1>Detail heading</h1><div class="video-description">Video description</div><video><source src="/media/video.mp4" type="video/mp4"></video>');
        });
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
        const { port } = server.address();

        const crawler = new CheerioCrawler({
            maxRequestsPerCrawl: 10,
            requestHandler: router,
        });

        await crawler.run(`http://127.0.0.1:${port}/listing`);
        await new Promise((resolve) => server.close(resolve));

        expect(crawler.stats.state.requestsFinished).toBe(2);

        const { items } = await crawler.getData();
        expect(items).toHaveLength(1);
        expect(items[0]).toMatchObject({
            title: 'Listing title',
            videoUrl: `http://127.0.0.1:${port}/video/1`,
            description: 'Video description',
            mp4Url: `http://127.0.0.1:${port}/media/video.mp4`,
        });
    }, 30_000);
});
