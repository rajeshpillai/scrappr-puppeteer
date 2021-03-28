const puppeteer = require("puppeteer");
const chalk = require("chalk");
var fs = require("fs");

// MY OCD of colorful console.logs for debugging... IT HELPS
const error = chalk.bold.red;
const success = chalk.keyword("green");

// Extract scolling items
function extractItems() {
  let anchors = [...document.querySelectorAll("a.name")];
  let spans = [...document.querySelectorAll("span.total")];
  const items = anchors.map((anchor,i) => {
    return {
      title: anchor.textContent,
      link: anchor.getAttribute("href"),
      duration: spans[i]?.textContent
    }
  });

  return items;
}

// Build HTML
function buildHTML(items) {
  let html = ``;

  let body = items.map(item => {
    html += `
      <li>
        <a href="${item.link}">${item.title}</a>
        <span>${item.duration}</span>
      </li>
    `
    return `
      <ul>
        ${html}
      </ul>
    `;
  })

  fs.writeFile("index.html", html, function(err) {
    if (err) throw err;
    console.log("Saved!");
  });
}

async function scrapeInfiniteScrollItems(
  page,
  extractItems,
  itemTargetCount,
  scrollDelay = 1000,
) {
  let items = [];
  try {
    let previousHeight;
    while (items.length < itemTargetCount) {
      items = await page.evaluate(extractItems);
      previousHeight = await page.evaluate('document.body.scrollHeight');
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
      await page.waitFor(scrollDelay);
    }
  } catch(e) { }
  return items;
}


(async () => {
  try {
    // open the headless browser
    var browser = await puppeteer.launch({ headless: false });
    // open a new page
    var page = await browser.newPage();
    // enter url in page
    // https://pixabay.com/music
    // https://news.ycombinator.com/news

    //page.setUserAgent(`'User-Agent','Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/36.0.1941.0 Safari/537.36`);
    await page.goto('https://pixabay.com/music'); //, {waitUntil: 'networkidle2'});


    const items = await scrapeInfiniteScrollItems(page, extractItems, 1);
    
    console.log({items});

    await browser.close();
    // Writing the news inside a json file
    fs.writeFile("pixabay.json", JSON.stringify(items), function(err) {
      if (err) throw err;
      console.log("Saved!");
    });
    console.log(success("Browser Closed"));


    // Build HTML
    buildHTML(items);

  } catch (err) {
    // Catch and display errors
    console.log(error(err));
    await browser.close();
    console.log(error("Browser Closed"));
  }
  
})();