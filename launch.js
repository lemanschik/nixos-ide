const html6 = `<!DOCTYPE html>
<html lang="en" type="module">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${encodeURIComponent('')}APP</title>
    <style>
      html {
        background:${encodeURIComponent('#000000')};
        color: aliceblue;
      }
    </style>
</head>
<body>
    <h1>Loading...</h1>    
</body>
</html>`

// TODO: Apply total args overwrite patch but this is only a poc 
const appMode = { channel: "stable", headless: false,
    defaultViewport: null, // Fix window-size
    ignoreDefaultArgs: [
      '--enable-automation', // No Automation futures
      '--enable-blink-features=IdleDetection' // Disable experimental default flag
    ],
    args: [ //--window-position=0,0 --window-size=1,1
      '--enable-features=NetworkService',
      `--app=data:text/html,${html6}`, // Load the App
      '--no-default-browser-check', // Suppress browser check
      //'--window-size=800,800',
      '--start-maximized',
    ],
    //ignoreHTTPSErrors: true, userDataDir: './myUserDataDir', //width: 800, //top: 20,
};

const disableGoogleKeysMissingMessage = () => {
    process.env.GOOGLE_API_KEY = "no";
    process.env.GOOGLE_DEFAULT_CLIENT_ID="no";
    process.env.GOOGLE_DEFAULT_CLIENT_SECRET="no";
}

disableGoogleKeysMissingMessage();

(async () => {
  const browser = await puppeteer.launch(appMode);
  const openPages = await browser.pages();
  openPages.forEach(async (page, i) => {
    if (i === 0) {
      const preloadScript = () => {}
      await page.evaluateOnNewDocument(preloadScript);
      //await page.goto('');// Read localstorage last viewed goto last viewed or offer interface.
    } else {
      page.close(); // Close eventual existing popups 
    }
  });
})();
