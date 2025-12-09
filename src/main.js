// AZ Quotes Scraper - Optimized production-ready implementation
import { Actor, log } from 'apify';
import { gotScraping } from 'got-scraping';
import { load as cheerioLoad } from 'cheerio';

// User-Agent pool for stealth
const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

const randomUserAgent = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
const randomDelay = () => Math.floor(Math.random() * 150) + 100; // 100-250ms (faster)

await Actor.init();

async function main() {
    try {
        const input = (await Actor.getInput()) || {};
        const {
            authorLetter = '',
            searchAuthor = '',
            topic = '',
            results_wanted: RESULTS_WANTED_RAW = 100,
            max_pages: MAX_PAGES_RAW = 10,
            startUrl,
            startUrls,
            url,
            proxyConfiguration,
        } = input;

        const RESULTS_WANTED = Number.isFinite(+RESULTS_WANTED_RAW) ? Math.max(1, +RESULTS_WANTED_RAW) : 100;
        const MAX_PAGES = Number.isFinite(+MAX_PAGES_RAW) ? Math.max(1, +MAX_PAGES_RAW) : 10;

        const proxyConf = proxyConfiguration ? await Actor.createProxyConfiguration(proxyConfiguration) : undefined;

        const toAbs = (href, base = 'https://www.azquotes.com') => {
            try { return new URL(href, base).href; } catch { return null; }
        };

        const buildStartUrl = (letter, searchAuth, topicFilter) => {
            if (topicFilter) {
                const slug = topicFilter.toLowerCase().replace(/\s+/g, '-');
                return `https://www.azquotes.com/quotes/topics/${slug}.html`;
            }
            if (searchAuth) {
                // For author search, start from the first letter of the author's name
                const firstLetter = searchAuth.trim()[0].toLowerCase();
                if (firstLetter && /[a-z]/.test(firstLetter)) {
                    return `https://www.azquotes.com/quotes/authors/${firstLetter}/`;
                }
                return 'https://www.azquotes.com/quotes/authors.html';
            }
            if (letter) {
                return `https://www.azquotes.com/quotes/authors/${letter.toLowerCase()}/`;
            }
            return 'https://www.azquotes.com/quotes/authors.html';
        };

        const initial = [];
        if (typeof startUrls === 'string' && startUrls.trim()) {
            const urls = startUrls.split(/[\n,]+/).map(u => u.trim()).filter(u => u);
            initial.push(...urls);
        }
        if (Array.isArray(startUrls) && startUrls.length) initial.push(...startUrls);
        if (startUrl) initial.push(startUrl);
        if (url) initial.push(url);
        if (!initial.length) initial.push(buildStartUrl(authorLetter, searchAuthor, topic));

        let saved = 0;
        const seenQuotes = new Set();
        const processedUrls = new Set();

        // Extract quotes from HTML
        function extractQuotesFromPage($, pageUrl) {
            const quotes = [];

            $('ul.list-quotes li').each((_, li) => {
                try {
                    const $li = $(li);
                    const $block = $li.find('.wrap-block');

                    if (!$block.length) return;

                    // Extract quote text
                    const quoteText = $block.find('p a.title').text().trim();
                    if (!quoteText || quoteText.length < 10) return;

                    // Extract author
                    const authorName = $block.find('.author a').text().trim();
                    if (!authorName) return;

                    // Extract quote URL
                    const quoteHref = $block.find('a.title').attr('href');
                    const quoteUrl = quoteHref ? toAbs(quoteHref) : pageUrl;

                    // Extract tags
                    const tags = [];
                    $block.find('.mytags a').each((_, tag) => {
                        const tagText = $(tag).text().trim();
                        if (tagText) tags.push(tagText);
                    });

                    // Extract likes
                    const likesText = $block.find('.heart24').first().text().trim();
                    const likes = likesText || '0';

                    // Create unique ID for deduplication
                    const quoteId = `${quoteText.substring(0, 100)}-${authorName}`;
                    if (seenQuotes.has(quoteId)) return;
                    seenQuotes.add(quoteId);

                    quotes.push({
                        quote: quoteText,
                        author: authorName,
                        author_url: pageUrl,
                        tags: tags.length > 0 ? tags : null,
                        likes: likes,
                        source: quoteUrl,
                    });
                } catch (err) {
                    log.warning(`Failed to parse quote: ${err.message}`);
                }
            });

            return quotes;
        }

        // Find author links from listing pages
        function findAuthorLinks($, baseUrl, searchAuthorName = null) {
            const links = new Set();

            $('a[href]').each((_, a) => {
                const href = $(a).attr('href');
                if (!href) return;

                // Match author URLs: /author/####-Author-Name
                if (/\/author\/\d+-[A-Za-z-_]+/.test(href)) {
                    const abs = toAbs(href, baseUrl);
                    if (abs && !abs.includes('/tag/') && !abs.includes('/quote/')) {
                        // If searching for specific author, filter by name
                        if (searchAuthorName) {
                            const authorText = $(a).text().trim();
                            const normalizedSearch = searchAuthorName.toLowerCase().replace(/\s+/g, '');
                            const normalizedAuthor = authorText.toLowerCase().replace(/\s+/g, '');

                            // Check if author name matches (partial or full match)
                            if (normalizedAuthor.includes(normalizedSearch) || normalizedSearch.includes(normalizedAuthor)) {
                                log.info(`✓ Found matching author: ${authorText} for search "${searchAuthorName}"`);
                                links.add(abs);
                            }
                        } else {
                            links.add(abs);
                        }
                    }
                }
            });

            return [...links];
        }

        // Find next page URL
        function findNextPage($, baseUrl) {
            // Try rel="next" link in HTML head
            const nextLink = $('link[rel="next"]').attr('href');
            if (nextLink) {
                const nextUrl = toAbs(nextLink, baseUrl);
                log.debug(`Found next page via rel="next": ${nextUrl}`);
                return nextUrl;
            }

            // Try pagination links in the page
            const currentPage = baseUrl.match(/[?&]p=(\d+)/);
            const currentPageNo = currentPage ? parseInt(currentPage[1], 10) : 1;

            // Look for next page link (try both query param formats)
            const nextPageNo = currentPageNo + 1;
            const nextPageLink = $(`a[href*="?p=${nextPageNo}"], a[href*="&p=${nextPageNo}"]`).first().attr('href');
            if (nextPageLink) {
                const nextUrl = toAbs(nextPageLink, baseUrl);
                log.debug(`Found next page via pagination link: ${nextUrl}`);
                return nextUrl;
            }

            log.debug(`No next page found for: ${baseUrl}`);
            return null;
        }

        // Fetch page with got-scraping (with retry logic)
        async function fetchPage(pageUrl, proxyUrl = null, retries = 3) {
            await new Promise(resolve => setTimeout(resolve, randomDelay()));

            for (let attempt = 1; attempt <= retries; attempt++) {
                const options = {
                    url: pageUrl,
                    headers: {
                        'User-Agent': randomUserAgent(),
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Referer': 'https://www.azquotes.com/',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                    },
                    responseType: 'text',
                    timeout: {
                        request: 10000, // Reduced to 10 seconds
                    },
                    retry: {
                        limit: 0, // We handle retries manually
                    },
                    // Throw on error to catch 5xx responses
                    throwHttpErrors: true,
                };

                // Use proxy only if provided and not disabled by previous failures
                const useProxy = proxyUrl && (attempt === 1 || !options.proxyFallbackTriggered);

                if (useProxy) {
                    options.proxyUrl = proxyUrl;
                }

                try {
                    log.debug(`Fetching ${pageUrl} (attempt ${attempt}/${retries})${useProxy ? ' via proxy' : ' direct'}`);

                    // Create a strict timeout promise
                    const timeoutPromise = new Promise((_, reject) => {
                        setTimeout(() => reject(new Error('StrictTimeout')), 10000); // 10s strict timeout
                    });

                    // Race between request and strict timeout
                    const response = await Promise.race([
                        gotScraping(options),
                        timeoutPromise
                    ]);

                    return response.body;
                } catch (err) {
                    const isLastAttempt = attempt === retries;

                    // Check for various error types including strict timeout and proxy errors
                    const isTimeout = err.message === 'StrictTimeout' || err.name === 'TimeoutError' || err.message.includes('Timeout');
                    const isProxyError = err.response && (err.response.statusCode >= 500 || err.response.statusCode === 403 || err.response.statusCode === 407);
                    const isNetworkError = err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT';

                    if (isTimeout || isProxyError || isNetworkError) {
                        const errorType = isTimeout ? 'Timeout' : (isProxyError ? `Proxy Error ${err.response.statusCode}` : `Network Error ${err.code}`);
                        log.warning(`${errorType} on ${pageUrl} (attempt ${attempt}/${retries})`);

                        // Aggressive Fallback: If proxy failed in ANY way, try direct connection immediately on next attempt
                        if (proxyUrl && attempt < retries) {
                            log.info(`Proxy failed. Switching to direct connection for next attempt.`);
                            options.proxyFallbackTriggered = true;
                            // Disable proxy for next loop iteration
                            proxyUrl = null;
                        }
                    } else {
                        log.warning(`Error fetching ${pageUrl} (attempt ${attempt}/${retries}): ${err.message}`);
                    }

                    if (isLastAttempt) {
                        // Final fallback attempt without proxy if we haven't tried it yet
                        if (proxyUrl && (isTimeout || isProxyError || isNetworkError)) {
                            log.info(`Final attempt failed with proxy. Trying one last time direct: ${pageUrl}`);
                            try {
                                options.proxyUrl = undefined;
                                const response = await gotScraping(options);
                                return response.body;
                            } catch (fallbackErr) {
                                log.error(`Failed even without proxy ${pageUrl}: ${fallbackErr.message}`);
                                throw fallbackErr;
                            }
                        }

                        log.error(`Failed to fetch ${pageUrl} after ${retries} attempts: ${err.message}`);
                        throw err;
                    }

                    // Exponential backoff before retry (reduced for faster startup)
                    const backoffMs = Math.min(500 * Math.pow(2, attempt - 1), 2000);
                    await new Promise(resolve => setTimeout(resolve, backoffMs));
                }
            }
        }

        // Process a single URL (author page or listing page)
        async function processUrl(pageUrl, label = 'UNKNOWN', pageNo = 1) {
            if (processedUrls.has(pageUrl)) {
                log.debug(`Skipping already processed URL: ${pageUrl}`);
                return [];
            }
            processedUrls.add(pageUrl);

            const proxyUrl = proxyConf ? await proxyConf.newUrl() : null;
            const html = await fetchPage(pageUrl, proxyUrl);
            const $ = cheerioLoad(html);

            const results = [];

            if (label === 'LIST') {
                // Find author links (filter by searchAuthor if provided)
                const authorLinks = findAuthorLinks($, pageUrl, searchAuthor);
                log.info(`LIST ${pageUrl} -> Found ${authorLinks.length} author links${searchAuthor ? ` matching "${searchAuthor}"` : ''}`);

                for (const authorUrl of authorLinks) {
                    if (saved >= RESULTS_WANTED) break;
                    results.push({ url: authorUrl, label: 'AUTHOR', pageNo: 1 });
                }

                // Check for next page
                if (saved < RESULTS_WANTED && pageNo < MAX_PAGES) {
                    const nextUrl = findNextPage($, pageUrl);
                    if (nextUrl) {
                        results.push({ url: nextUrl, label: 'LIST', pageNo: pageNo + 1 });
                    }
                }
            } else if (label === 'AUTHOR') {
                // Extract quotes from author page
                const quotes = extractQuotesFromPage($, pageUrl);
                log.info(`AUTHOR ${pageUrl} -> Found ${quotes.length} quotes (page ${pageNo})`);

                if (quotes.length > 0) {
                    const remaining = RESULTS_WANTED - saved;
                    const toSave = quotes.slice(0, Math.max(0, remaining));

                    if (toSave.length > 0) {
                        await Actor.pushData(toSave);
                        saved += toSave.length;
                        log.info(`✓ Saved ${toSave.length} quotes, total: ${saved}/${RESULTS_WANTED}`);
                    }
                }

                // Check for next page (continue if we haven't reached the limit and there are more quotes)
                if (saved < RESULTS_WANTED && pageNo < MAX_PAGES) {
                    const nextUrl = findNextPage($, pageUrl);
                    if (nextUrl) {
                        log.info(`➜ Queueing next page: ${nextUrl} (page ${pageNo + 1})`);
                        results.push({ url: nextUrl, label: 'AUTHOR', pageNo: pageNo + 1 });
                    } else {
                        log.info(`No more pages found for author at page ${pageNo}`);
                    }
                }
            }

            return results;
        }

        // BFS queue processing
        const queue = initial.map(u => ({
            url: u,
            label: /(\/author\/\d+-|\/quotes\/topics\/)/.test(u) ? 'AUTHOR' : 'LIST',
            pageNo: 1,
        }));

        while (queue.length > 0 && saved < RESULTS_WANTED) {
            const { url, label, pageNo } = queue.shift();

            log.debug(`Queue: ${queue.length} remaining, processing ${label} page ${pageNo}`);

            try {
                const newUrls = await processUrl(url, label, pageNo);

                // Add new URLs to queue (limit queue size)
                for (const item of newUrls) {
                    if (saved >= RESULTS_WANTED) break;
                    if (queue.length < 100) { // Prevent queue explosion
                        queue.push(item);
                    }
                }
            } catch (err) {
                log.error(`Failed to process ${url}: ${err.message}`);
            }
        }

        log.info(`🎉 Finished! Saved ${saved} quotes total.`);
    } catch (err) {
        log.error(`Fatal error: ${err.message}`);
        throw err;
    } finally {
        await Actor.exit();
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
