const {Builder, By, Key, until} = require('selenium-webdriver');
const firefox = require('selenium-webdriver/firefox');
const chalk = require('chalk');
const cheerio = require('cheerio');

let hardCodedUser = 'bashmybumble@gmail.com'
let hardCodedPassword = '@Bash123!'

let driver;

async function sleep(time) {
  await driver.sleep(time);
}





(async () => {

  try {
    console.log(chalk.green("-------- Starting browser ---------"));

    const rootUrl = 'https://rarity.tools';
    const alienURL = 'https://rarity.tools/cryptopunks?filters=%24Punk%2520Type%240%3Atrue';
    const apeURL = 'https://rarity.tools/cryptopunks?filters=%24Punk%2520Type%241%3Atrue';
    const zombieURL = 'https://rarity.tools/cryptopunks?filters=%24Punk%2520Type%244%3Atrue';
    const femaleURL = 'https://rarity.tools/cryptopunks?filters=%24Punk%2520Type%242%3Atrue';
    const maleURL = 'https://rarity.tools/cryptopunks?filters=%24Punk%2520Type%243%3Atrue';


    // Options for headless mode

    // options = new firefox.Options();
    // options = options.headless();
    
    // Pass Options object for the Selenium-Webdriver

    // driver = await new Builder().forBrowser('firefox').setFirefoxOptions(options).build();
    driver = await new Builder().forBrowser('firefox').build();
    await driver.get(femaleURL);
    await sleep(3000);
    let htmlBody = await driver.getPageSource();

    
    let $ = cheerio.load(htmlBody);

    // Get partial url of each item
    let partialUrlsArray = []
    $('.flex.flex-row.flex-wrap.justify-start').find('div.mb-2.border.transition-all').each(  function(index, element){
        let urlPartialView =  $(this).find('.overflow-hidden.rounded-md').find('a').attr('href');
        partialUrlsArray.push(urlPartialView)
    })


    // async function for retrieve the details data from every single Partial View
    console.log(chalk.magenta('-------- Starting to retrieve data from each single item --------'));
    console.log(chalk.magenta(`-------- Number of items: ${partialUrlsArray.length} --------`));
    const asyncLoop = async _ => {
        for (let index = 0; index < partialUrlsArray.length; index++) {

            let itemDetails = {};
            const url = partialUrlsArray[index];

            await driver.get(`${rootUrl}${url}`)
            await sleep(2500);
            let htmlPartialView = await driver.getPageSource();
            let view$ = cheerio.load(htmlPartialView);
    
            let textView = view$('.z-30').find('div').text();
            
            // get Rarity Rank Number
            itemDetails.rarityRank = view$('span.font-bold:nth-child(1)').text();
            

            // get Type and Id
            let typeAndId =  view$('.text-left').text().replace(/\s/g, '').split('#');
            itemDetails.type = typeAndId[0];
            itemDetails.id = typeAndId[1];

            //get Rarity 
            let rarityScrore = view$('div.px-2:nth-child(2)').text().replace(/\s/g, '');
            let owner = view$('a.block:nth-child(3)').text().replace(/\s/g, '');
            itemDetails.rarityScrore = rarityScrore;
            itemDetails.owner = owner.split(':')[1];

            console.log(JSON.stringify(itemDetails, null, 2));
            
        }
    }

    asyncLoop();



    href="/cryptopunks/view/2890?filters=%24Punk%2520Type%240%3Atrue"

} catch (error) {
    console.log(chalk.red(`-------- CRASH! ---------`));
    console.log(error)
    //await driver.close();
}
})();