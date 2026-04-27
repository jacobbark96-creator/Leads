const cheerio = require('cheerio');

async function testScrape() {
  const url = 'https://www.find-government-grants.service.gov.uk/grants';
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  const grants = [];
  $('h2 a').each((i, linkEl) => {
    const parentContainer = $(linkEl).closest('li');
    if (!parentContainer.length) return;
    
    const title = $(linkEl).text().trim();
    const link = $(linkEl).attr('href');

    const details = {};
    // Let's parse dt and dd properly
    parentContainer.find('dl dt').each((j, dt) => {
      const key = $(dt).text().trim();
      const value = $(dt).next('dd').text().trim();
      details[key] = value;
    });

    grants.push({ title, link, details });
  });

  console.log(grants[0]);
}
testScrape();