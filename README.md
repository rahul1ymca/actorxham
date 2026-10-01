# Video Metadata Scraper Actor

<!-- This is an Apify template readme -->

This Actor uses [Crawlee](https://crawlee.dev/) and [Cheerio](https://cheerio.js.org/) directly. It crawls listing pages, follows video links and pagination, and stores each video's title, description, thumbnail, page URL, duration, available qualities, and MP4 URL in the Apify Dataset. It does not use Firecrawl or execute page JavaScript.

## Quick Start

Once you've installed the dependencies, start the Actor:

```bash
apify run
```

Once your Actor is ready, you can push it to the Apify Console:

```bash
apify login # first, you need to log in if you haven't already done so

apify push
```

## Project Structure

```text
.actor/
├── actor.json # Actor config: name, version, env vars, runtime settings
├── dataset_schema.json # Structure and representation of data produced by an Actor
├── input_schema.json # Input validation & Console form definition
└── output_schema.json # Specifies where an Actor stores its output
src/
└── main.js # Actor entry point and orchestrator
storage/ # Local storage (mirrors Cloud during development)
├── datasets/ # Output items (JSON objects)
├── key_value_stores/ # Files, config, INPUT
└── request_queues/ # Pending crawl requests
Dockerfile # Container image definition
```

For more information, see the [Actor definition](https://docs.apify.com/platform/actors/development/actor-definition) documentation.

## How it works

This JavaScript Actor uses Cheerio to scrape video metadata into a dataset.

- The crawler starts with URLs from `startUrls`, follows video links (`.video-thumb__title`, `.video-thumb__image-container`, and legacy selectors), and enqueues `a.pager__item[data-page]`/`a[rel="next"]` pagination links.
- On each detail page it reads stable `h1`, Open Graph/meta tags, and the JSON assigned to `window.initials` when that data is embedded in the HTML.
- Each dataset item contains `title`, `videoUrl`, `description`, `thumbnailUrl`, `mp4Url`, `duration`, and `quality`.
- Because this Actor uses Cheerio, data rendered only after client-side JavaScript runs (including a runtime-only `window.initials`) cannot be extracted without switching to Playwright.

## What's included

- **[Apify SDK](https://docs.apify.com/sdk/js)** - toolkit for building [Actors](https://apify.com/actors)
- **[Crawlee](https://crawlee.dev/)** - web scraping and browser automation library
- **[Input schema](https://docs.apify.com/platform/actors/development/input-schema)** - define and easily validate a schema for your Actor's input
- **[Dataset](https://docs.apify.com/sdk/python/docs/concepts/storages#working-with-datasets)** - store structured data where each object stored has the same attributes
- **[Cheerio](https://cheerio.js.org/)** - a fast, flexible & elegant library for parsing and manipulating HTML and XML
- **[Proxy configuration](https://docs.apify.com/platform/proxy)** - rotate IP addresses to prevent blocking

## Resources

- [Quick Start](https://docs.apify.com/platform/actors/development/quick-start) guide for building your first Actor
- [Video tutorial](https://www.youtube.com/watch?v=yTRHomGg9uQ) on building a scraper using CheerioCrawler
- [Written tutorial](https://docs.apify.com/academy/web-scraping-for-beginners/challenge) on building a scraper using CheerioCrawler
- [Web scraping with Cheerio in 2023](https://blog.apify.com/web-scraping-with-cheerio/)
- How to [scrape a dynamic page](https://blog.apify.com/what-is-a-dynamic-page/) using Cheerio
- [Integration with Zapier](https://apify.com/integrations), Make, Google Drive and others
- [Video guide on getting data using Apify API](https://www.youtube.com/watch?v=ViYYDHSBAKM)

## Creating Actors with templates

[How to create Apify Actors with web scraping code templates](https://www.youtube.com/watch?v=u-i-Korzf8w)

## Getting started

For complete information [see this article](https://docs.apify.com/platform/actors/development#build-actor-at-apify-console). In short, you will:

1. Build the Actor
2. Run the Actor

## Pull the Actor for local development

If you would like to develop locally, you can pull the existing Actor from Apify console using Apify CLI:

1. Install `apify-cli`

    **Using Homebrew**

    ```bash
    brew install apify-cli
    ```

    **Using NPM**

    ```bash
    npm -g install apify-cli
    ```

2. Pull the Actor by its unique `<ActorId>`, which is one of the following:
    - unique name of the Actor to pull (e.g. "apify/hello-world")
    - or ID of the Actor to pull (e.g. "E2jjCZBezvAZnX8Rb")

    You can find both by clicking on the Actor title at the top of the page, which will open a modal containing both Actor unique name and Actor ID.

    This command will copy the Actor into the current directory on your local machine.

    ```bash
    apify pull <ActorId>
    ```

## Documentation reference

To learn more about Apify and Actors, take a look at the following resources:

- [Apify SDK for JavaScript documentation](https://docs.apify.com/sdk/js)
- [Apify SDK for Python documentation](https://docs.apify.com/sdk/python)
- [Apify Platform documentation](https://docs.apify.com/platform)
- [Join our developer community on Discord](https://discord.com/invite/jyEM2PRvMU)
