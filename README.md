# AZ Quotes Scraper

Extract thousands of inspirational quotes from AZ Quotes with author information, topics, and popularity metrics. Perfect for content creators, researchers, motivational apps, and quote databases.

## What Does This Actor Do?

This scraper efficiently collects quotes from [AZ Quotes](https://www.azquotes.com/), one of the largest quote databases on the internet. Extract quotes by:

- **Author Letter**: Browse authors alphabetically (A-Z)
- **Specific Author**: Target quotes from your favorite authors
- **Topic/Category**: Find quotes about specific themes like inspiration, love, success, or wisdom
- **Custom URLs**: Scrape from any author or topic page directly

The actor automatically handles pagination, deduplicates results, and structures data for immediate use.

---

## Key Features

<ul>
  <li>🚀 <strong>Fast & Efficient</strong> - Collects hundreds of quotes in minutes</li>
  <li>📊 <strong>Rich Data</strong> - Includes quote text, author, tags, likes, and source URLs</li>
  <li>🎯 <strong>Flexible Filtering</strong> - Search by author, topic, or letter</li>
  <li>♻️ <strong>Smart Deduplication</strong> - Automatically removes duplicate quotes</li>
  <li>🔄 <strong>Pagination Support</strong> - Handles multi-page author profiles seamlessly</li>
  <li>🌐 <strong>Proxy Ready</strong> - Built-in proxy rotation for reliable scraping</li>
</ul>

---

## Use Cases

<table>
  <tr>
    <td><strong>📱 Mobile Apps</strong></td>
    <td>Build daily quote apps and motivational content platforms</td>
  </tr>
  <tr>
    <td><strong>📚 Content Marketing</strong></td>
    <td>Curate inspirational content for social media and blogs</td>
  </tr>
  <tr>
    <td><strong>🎓 Research</strong></td>
    <td>Analyze quote patterns, author influence, and topic trends</td>
  </tr>
  <tr>
    <td><strong>💼 Business</strong></td>
    <td>Create leadership training materials and motivational resources</td>
  </tr>
  <tr>
    <td><strong>🤖 AI Training</strong></td>
    <td>Build datasets for natural language processing and chatbots</td>
  </tr>
</table>

---

## Input Configuration

Configure the scraper using these input parameters:

### Basic Options

<table>
  <thead>
    <tr>
      <th>Field</th>
      <th>Type</th>
      <th>Description</th>
      <th>Example</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>authorLetter</code></td>
      <td>String</td>
      <td>Filter authors by first letter (A-Z)</td>
      <td><code>"a"</code></td>
    </tr>
    <tr>
      <td><code>searchAuthor</code></td>
      <td>String</td>
      <td>Target a specific author by name</td>
      <td><code>"Albert Einstein"</code></td>
    </tr>
    <tr>
      <td><code>topic</code></td>
      <td>String</td>
      <td>Filter by topic/theme</td>
      <td><code>"inspirational"</code></td>
    </tr>
    <tr>
      <td><code>startUrl</code></td>
      <td>String</td>
      <td>Scrape from a specific URL</td>
      <td><code>"https://www.azquotes.com/author/4399-Albert_Einstein"</code></td>
    </tr>
    <tr>
      <td><code>startUrls</code></td>
      <td>Array</td>
      <td>Multiple URLs to scrape</td>
      <td><code>["url1", "url2"]</code></td>
    </tr>
  </tbody>
</table>

### Control Options

<table>
  <thead>
    <tr>
      <th>Field</th>
      <th>Type</th>
      <th>Default</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>results_wanted</code></td>
      <td>Integer</td>
      <td>100</td>
      <td>Maximum number of quotes to collect</td>
    </tr>
    <tr>
      <td><code>max_pages</code></td>
      <td>Integer</td>
      <td>10</td>
      <td>Maximum pages to visit per author/topic</td>
    </tr>
    <tr>
      <td><code>proxyConfiguration</code></td>
      <td>Object</td>
      <td>Residential</td>
      <td>Proxy settings for reliable scraping</td>
    </tr>
  </tbody>
</table>

---

## Input Examples

### Example 1: Scrape Quotes by Topic

```json
{
  "topic": "inspirational",
  "results_wanted": 50,
  "max_pages": 5
}
```

### Example 2: Scrape Quotes from Specific Author

```json
{
  "searchAuthor": "Maya Angelou",
  "results_wanted": 100,
  "max_pages": 10
}
```

### Example 3: Browse Authors by Letter

```json
{
  "authorLetter": "e",
  "results_wanted": 200,
  "max_pages": 8
}
```

### Example 4: Scrape from Custom URLs

```json
{
  "startUrls": [
    "https://www.azquotes.com/author/4399-Albert_Einstein",
    "https://www.azquotes.com/author/15644-Oscar_Wilde"
  ],
  "results_wanted": 150
}
```

---

## Output Format

Each quote is saved with the following structure:

```json
{
  "quote": "Weak people revenge. Strong people forgive. Intelligent People Ignore.",
  "author": "Albert Einstein",
  "author_url": "https://www.azquotes.com/author/4399-Albert_Einstein",
  "tags": ["Strong", "Revenge", "Intelligent"],
  "likes": "2934",
  "source": "https://www.azquotes.com/author/4399-Albert_Einstein"
}
```

### Output Fields

<table>
  <thead>
    <tr>
      <th>Field</th>
      <th>Type</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><code>quote</code></td>
      <td>String</td>
      <td>The complete quote text</td>
    </tr>
    <tr>
      <td><code>author</code></td>
      <td>String</td>
      <td>Name of the quote author</td>
    </tr>
    <tr>
      <td><code>author_url</code></td>
      <td>String</td>
      <td>Direct link to author's page</td>
    </tr>
    <tr>
      <td><code>tags</code></td>
      <td>Array</td>
      <td>Topics/themes associated with the quote</td>
    </tr>
    <tr>
      <td><code>likes</code></td>
      <td>String</td>
      <td>Number of likes/votes the quote received</td>
    </tr>
    <tr>
      <td><code>source</code></td>
      <td>String</td>
      <td>URL where the quote was found</td>
    </tr>
  </tbody>
</table>

---

## Dataset Export

Export your scraped quotes in multiple formats:

- **JSON** - Structured data for applications and APIs
- **CSV** - Easy import into Excel, Google Sheets, or databases
- **XML** - Compatible with various content management systems
- **Excel** - Direct import for analysis and reporting
- **HTML** - Ready-to-use web content

---

## Performance & Limits

<table>
  <tr>
    <td><strong>Speed</strong></td>
    <td>~50-100 quotes per minute</td>
  </tr>
  <tr>
    <td><strong>Recommended Limit</strong></td>
    <td>100-500 quotes per run</td>
  </tr>
  <tr>
    <td><strong>Concurrent Requests</strong></td>
    <td>10 parallel connections</td>
  </tr>
  <tr>
    <td><strong>Timeout</strong></td>
    <td>60 seconds per page</td>
  </tr>
  <tr>
    <td><strong>Retries</strong></td>
    <td>3 automatic retries on failure</td>
  </tr>
</table>

---

## Best Practices

### 🎯 Optimize Your Scraping

- **Use Proxies**: Always enable proxy configuration to avoid rate limiting
- **Set Reasonable Limits**: Start with 100-200 quotes to test, then scale up
- **Target Specific Authors**: More efficient than browsing by letter
- **Monitor Usage**: Check your Apify usage dashboard regularly

### ⚠️ Important Notes

- Respect the website's terms of service and robots.txt
- Use reasonable rate limits to avoid overloading servers
- Data is for personal/research use - check licensing for commercial applications
- Quote attribution is included - always credit original authors

### 🔧 Troubleshooting

<dl>
  <dt><strong>No results returned?</strong></dt>
  <dd>Check that your author name or topic is spelled correctly. Try using <code>startUrl</code> with a direct link instead.</dd>
  
  <dt><strong>Rate limiting errors?</strong></dt>
  <dd>Enable proxy configuration and reduce <code>max_pages</code>. Consider spreading scraping across multiple runs.</dd>
  
  <dt><strong>Missing quotes?</strong></dt>
  <dd>Increase <code>results_wanted</code> and <code>max_pages</code>. Some authors have quotes across many pages.</dd>
  
  <dt><strong>Duplicate quotes?</strong></dt>
  <dd>The scraper includes built-in deduplication, but if issues persist, check that you're not scraping the same URL multiple times.</dd>
</dl>

---

## Popular Topics to Explore

Here are some popular topics you can search for:

<ul style="columns: 3; -webkit-columns: 3; -moz-columns: 3;">
  <li>inspirational</li>
  <li>love</li>
  <li>life</li>
  <li>success</li>
  <li>motivational</li>
  <li>wisdom</li>
  <li>happiness</li>
  <li>friendship</li>
  <li>leadership</li>
  <li>change</li>
  <li>courage</li>
  <li>faith</li>
  <li>hope</li>
  <li>dreams</li>
  <li>freedom</li>
</ul>

---

## Pricing

This actor runs on the Apify platform with usage-based pricing:

- **Compute Units**: Charged per hour of run time
- **Proxy Usage**: Additional cost for proxy requests (recommended)
- **Free Tier**: Apify offers free credits monthly for testing

💡 **Tip**: Optimize your input settings to reduce costs while getting quality results.

---

## Support & Feedback

<table>
  <tr>
    <td>📧 <strong>Issues?</strong></td>
    <td>Report bugs or request features through the Apify Console</td>
  </tr>
  <tr>
    <td>⭐ <strong>Enjoying this actor?</strong></td>
    <td>Rate it on Apify Store to help others discover it</td>
  </tr>
  <tr>
    <td>💬 <strong>Questions?</strong></td>
    <td>Contact through Apify platform messaging</td>
  </tr>
</table>

---

## Version History

- **v1.0.0** - Initial release with full AZ Quotes scraping capabilities

---

## Legal & Compliance

This actor is provided for educational and research purposes. Users are responsible for:

- Complying with AZ Quotes' terms of service
- Respecting copyright and intellectual property rights
- Using scraped data ethically and legally
- Implementing appropriate rate limiting

The actor developer is not responsible for misuse of this tool.

---

<p align="center">
  <strong>Ready to start collecting inspirational quotes?</strong><br>
  Configure your input settings and launch the actor now!
</p>
