// AZ Quotes scraper - CheerioCrawler implementation
import { Actor, log } from 'apify';
import { CheerioCrawler, Dataset } from 'crawlee';
import { load as cheerioLoad } from 'cheerio';

// Single-entrypoint main
await Actor.init();

async function main() {
    try {
        const input = (await Actor.getInput()) || {};
        const {
            authorLetter = '', searchAuthor = '', topic = '', results_wanted: RESULTS_WANTED_RAW = 100,
            max_pages: MAX_PAGES_RAW = 999, startUrl, startUrls, url, proxyConfiguration,
        } = input;

        const RESULTS_WANTED = Number.isFinite(+RESULTS_WANTED_RAW) ? Math.max(1, +RESULTS_WANTED_RAW) : Number.MAX_SAFE_INTEGER;
        const MAX_PAGES = Number.isFinite(+MAX_PAGES_RAW) ? Math.max(1, +MAX_PAGES_RAW) : 999;

        const toAbs = (href, base = 'https://www.azquotes.com') => {
            try { return new URL(href, base).href; } catch { return null; }
        };

        const cleanText = (html) => {
            if (!html) return '';
            const $ = cheerioLoad(html);
            $('script, style, noscript, iframe').remove();
            return $.root().text().replace(/\s+/g, ' ').trim();
        };

        const buildStartUrl = (letter, searchAuth, topicFilter) => {
            if (topicFilter) {
                const slug = topicFilter.toLowerCase().replace(/\s+/g, '-');
                return `https://www.azquotes.com/quotes/topics/${slug}.html`;
            }
            if (searchAuth) {
                return `https://www.azquotes.com/quotes/authors.html`;
            }
            if (letter) {
                return `https://www.azquotes.com/quotes/authors/${letter.toLowerCase()}/`;
            }
            return 'https://www.azquotes.com/quotes/authors.html';
        };

        const initial = [];
        if (startUrls && typeof startUrls === 'string') {
            // Parse string URLs separated by newlines or commas
            const urls = startUrls.split(/[\n,]+/).map(url => url.trim()).filter(url => url);
            initial.push(...urls);
        }
        if (Array.isArray(startUrls) && startUrls.length) initial.push(...startUrls);
        if (startUrl) initial.push(startUrl);
        if (url) initial.push(url);
        if (!initial.length) initial.push(buildStartUrl(authorLetter, searchAuthor, topic));

        const proxyConf = proxyConfiguration ? await Actor.createProxyConfiguration({ ...proxyConfiguration }) : undefined;

        let saved = 0;
        const seenQuotes = new Set();

        function extractFromJsonLd($) {
            const scripts = $('script[type="application/ld+json"]');
            for (let i = 0; i < scripts.length; i++) {
                try {
                    const parsed = JSON.parse($(scripts[i]).html() || '');
                    const arr = Array.isArray(parsed) ? parsed : [parsed];
                    for (const e of arr) {
                        if (!e) continue;
                        const t = e['@type'] || e.type;
                        if (t === 'Person' || (Array.isArray(t) && t.includes('Person'))) {
                            return {
                                author: e.name || null,
                                bio: e.description || null,
                                birthDate: e.birthDate || null,
                                deathDate: e.deathDate || null,
                            };
                        }
                    }
                } catch (e) { /* ignore parsing errors */ }
            }
            return null;
        }

        function findAuthorLinks($, base) {
            const links = new Set();
            $('a[href]').each((_, a) => {
                const href = $(a).attr('href');
                if (!href) return;
                if (/\/author\/\d+-/i.test(href)) {
                    const abs = toAbs(href, base);
                    if (abs && !abs.includes('/tag/') && !abs.includes('/quote/')) links.add(abs);
                }
            });
            return [...links];
        }

        function extractQuotesFromPage($, pageUrl) {
            const quotes = [];
            const authorJsonLd = extractFromJsonLd($);
            
            $('.wrap-q-r').each((_, elem) => {
                try {
                    const quoteElem = $(elem);
                    const quoteText = quoteElem.find('.b-qt').first().text().trim();
                    if (!quoteText) return;

                    const quoteId = `${quoteText.substring(0, 50)}`;
                    if (seenQuotes.has(quoteId)) return;
                    seenQuotes.add(quoteId);

                    const authorName = quoteElem.find('.qa-name').first().text().trim() || 
                                      (authorJsonLd ? authorJsonLd.author : null) ||
                                      $('h1').first().text().replace(' Quotes', '').trim();
                    
                    const authorLink = quoteElem.find('.qa-name a').attr('href');
                    const authorUrl = authorLink ? toAbs(authorLink) : pageUrl;

                    const tags = [];
                    quoteElem.find('.topics a').each((_, tag) => {
                        const tagText = $(tag).text().trim();
                        if (tagText) tags.push(tagText);
                    });

                    const likes = quoteElem.find('.vote-up').text().trim() || '0';

                    quotes.push({
                        quote: quoteText,
                        author: authorName,
                        author_url: authorUrl,
                        tags: tags.length > 0 ? tags : null,
                        likes: likes,
                        source: pageUrl,
                    });
                } catch (err) {
                    log.warning(`Failed to parse quote: ${err.message}`);
                }
            });

            return quotes;
        }

        function findNextPage($, base, currentPageNo) {
            const nextLink = $('a.next, a[rel="next"]').attr('href');
            if (nextLink) return toAbs(nextLink, base);
            
            const pageLinks = $('a[href*="/page/"]');
            for (let i = 0; i < pageLinks.length; i++) {
                const href = $(pageLinks[i]).attr('href');
                if (href && href.includes(`/page/${currentPageNo + 1}`)) {
                    return toAbs(href, base);
                }
            }
            
            return null;
        }

        const crawler = new CheerioCrawler({
            proxyConfiguration: proxyConf,
            maxRequestRetries: 3,
            useSessionPool: true,
            maxConcurrency: 10,
            requestHandlerTimeoutSecs: 60,
            async requestHandler({ request, $, enqueueLinks, log: crawlerLog }) {
                const label = request.userData?.label || 'LIST';
                const pageNo = request.userData?.pageNo || 1;

                if (label === 'LIST') {
                    const authorLinks = findAuthorLinks($, request.url);
                    crawlerLog.info(`LIST ${request.url} -> found ${authorLinks.length} author links`);

                    if (authorLinks.length > 0) {
                        const remaining = RESULTS_WANTED - saved;
                        const toEnqueue = authorLinks.slice(0, Math.min(50, Math.max(0, remaining * 2)));
                        if (toEnqueue.length) {
                            await enqueueLinks({ urls: toEnqueue, userData: { label: 'AUTHOR', pageNo: 1 } });
                        }
                    }

                    if (saved < RESULTS_WANTED && pageNo < MAX_PAGES) {
                        const next = findNextPage($, request.url, pageNo);
                        if (next) await enqueueLinks({ urls: [next], userData: { label: 'LIST', pageNo: pageNo + 1 } });
                    }
                    return;
                }

                if (label === 'AUTHOR') {
                    if (saved >= RESULTS_WANTED) return;
                    
                    try {
                        const quotes = extractQuotesFromPage($, request.url);
                        crawlerLog.info(`AUTHOR ${request.url} -> found ${quotes.length} quotes (page ${pageNo})`);

                        const remaining = RESULTS_WANTED - saved;
                        const toSave = quotes.slice(0, Math.max(0, remaining));
                        
                        if (toSave.length > 0) {
                            await Dataset.pushData(toSave);
                            saved += toSave.length;
                            crawlerLog.info(`Saved ${toSave.length} quotes, total: ${saved}/${RESULTS_WANTED}`);
                        }

                        if (saved < RESULTS_WANTED && pageNo < MAX_PAGES) {
                            const next = findNextPage($, request.url, pageNo);
                            if (next) {
                                await enqueueLinks({ urls: [next], userData: { label: 'AUTHOR', pageNo: pageNo + 1 } });
                            }
                        }
                    } catch (err) {
                        crawlerLog.error(`AUTHOR ${request.url} failed: ${err.message}`);
                    }
                }
            }
        });

        await crawler.run(initial.map(u => ({ url: u, userData: { label: /\/author\/\d+/.test(u) ? 'AUTHOR' : 'LIST', pageNo: 1 } })));
        log.info(`Finished. Saved ${saved} quotes`);
    } finally {
        await Actor.exit();
    }
}

main().catch(err => { console.error(err); process.exit(1); });
