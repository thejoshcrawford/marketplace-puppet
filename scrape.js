const cron = require('node-cron');
const fs = require('fs')
const isPi = require('detect-rpi');

let puppeteer;
if (isPi()) {
    puppeteer = require('puppeteer-core')
} else {
    puppeteer = require('puppeteer')
}

const email = process.argv[2]
const pass = process.argv[3]
const fblogin = process.argv[4]
const fbpass = process.argv[5]

var arrayOfItems;

// UPDATE WITH YOUR LOCATION REFERENCE FROM STEP 4
let locationRef = 'spokane'

// UPDATE WITH ITEMS YOU WANT TO SEARCH FOR
let searchTerms = ['yz']//, 'xtrainer', 'kdx']

const nodemailer = require('nodemailer');

// UPDATE WITH EMAIL YOU WANT TO RECEIVE AT
let emailRecipient = email

// UPDATE WITH YOUR SENDING EMAIL ACCOUNT
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: email,
        pass: pass
    }
});

// UPDATE WITH YOUR SENDING EMAIL ACCOUNT
function sendEmail(emailRecipient, searchTerm, items) {
    var message = "See new items below: \n\n"
    for (var a = 0; a < items.length; a++) {
        var item_string = `${items[a].title} - ${items[a].price}\n${items[a].link}\n\n`;
        message = message + item_string
    }
    const mailOptions = {
        from: '"Marketplace Alert" sending@email.com',
        to: emailRecipient,
        subject: `${items.length} new items listed under ${searchTerm}`,
        text: message
    };
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
}

async function getItems() {
    fs.readFile('./pastItems.json', 'utf-8', function (err, data) {
        arrayOfItems = JSON.parse(data);
    })
    let browser;
    if (isPi()) {
        browser = await puppeteer.launch({executablePath: '/usr/bin/chromium-browser'});
    } else {
        browser = await puppeteer.launch()
    }
    const page = await browser.newPage()

    // login
    await page.goto('https://www.facebook.com/login');
    
    await page.type('#email', fblogin);
    await page.type('#pass', fbpass);
    await page.click('#loginbutton');
    
    await page.waitForNavigation();
    // login

    for (var i = 0; i < searchTerms.length; i++) {
        var newItems = [];
        var searchTerm = searchTerms[i].replace(/ /g, '%20');
        console.log(`\nResults for ${searchTerms[i]}:\n`)
        try {
            await page.goto(`https://www.facebook.com/marketplace/${locationRef}/search/?daysSinceListed=1&sortBy=best_match&query=${searchTerm}&exact=true`,
                { waitUntil: 'load', timeout: 0 } )

            // cookie stuff
    //         const cookiesString = await fs.promises.readFile('./cookies.json') //, (err, data) => {
    //           //  if (err) throw err;
    //             //console.log("data: " + data);
    //    //     });
    //         console.log(`cookeiString: ${cookiesString}`)
    //         const cookies = JSON.parse(cookiesString);
    //         await page.setCookie(...cookies);

    //         // const cookies = await page.cookies();
    //         // await fs.writeFile('./cookies.json', JSON.stringify(cookies, null, 2), (err) => {
    //         //     if (err)
    //         //       console.log(err);
    //         //     else {
    //         //       console.log("File written successfully\n");
    //         //       console.log("The written has the following contents:");
    //         //       console.log(fs.readFileSync("books.txt", "utf8"));
    //         //     }
    //         //   });
            
            let bodyHTML = await page.evaluate(() => document.body.outerHTML);

            //fs.promises.writeFile("./bodyHTML.html", bodyHTML)
            console.log(bodyHTML.split(/(?:"marketplace_search":|,"viewer":)+/)[2])
            const searchResult = JSON.parse(bodyHTML.split(/(?:"marketplace_search":|,"viewer":)+/)[2]);
           
            let items = searchResult["feed_units"]["edges"]
            if (items.length > 1) {
                items.forEach((val, index) => {
                    if (['node']['listing'] === undefined) { // skip the ads
                        return;
                    }

                    var ID = val['node']['listing']['id'];
                    var link = `https://www.facebook.com/marketplace/item/${val['node']['listing']['id']}`;
                    var title = val['node']['listing']['marketplace_listing_title'];
                    var price = val['node']['listing']['listing_price']['formatted_amount'];
                    var item = { title: title, price: price, link: link }
                    if (arrayOfItems.pastItems.includes(ID)) {
                    } else {
                        arrayOfItems.pastItems.push(ID)
                        newItems.push(item);
                        console.log(item)
                    }
                });
            }
            if (newItems.length > 0) {
                //sendEmail(emailRecipient, searchTerms[i], newItems);
                console.log(newItems);
            } else {
                console.log('No new items for ' + searchTerms[i]);
            }
        } catch (error) {
            console.error(error);
        }
    };
    await browser.close()
    fs.writeFile('./pastItems.json', JSON.stringify(arrayOfItems), 'utf-8', function (err) {
        if (err) throw err
        console.log('Updated past items')
    })
}

getItems()

//TO CHANGE CRON TIME SCHEDULE https://www.npmjs.com/package/node-cron
// cron.schedule('*/5 * * * *', function () {
//     getItems()
// });