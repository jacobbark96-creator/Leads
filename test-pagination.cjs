const cheerio = require('cheerio');

async function testPagination() {
  const url = 'https://www.find-government-grants.service.gov.uk/grants?page=2';
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  console.log('Next links on page 2:', $('a:contains("Next")').length);
}
testPagination();