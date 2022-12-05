// @ts-check
// above inits typescript bridge to JSDOC Annotations and type comments for IDE Support.
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


// TODO make sure that the git repo in /etc/nixos is clean
//  app.post('/writeconfig',(req, res) => fs.writeFileSync('/etc/nixos/configuration.nix', '{...}', 'utf8'))
  
const fs = await import('node:fs');
const child_process = await('node:child_process');

// https://github.com/tree-sitter/node-tree-sitter
// interface SyntaxNode // https://github.com/tree-sitter/node-tree-sitter/blob/master/tree-sitter.d.ts#L52
const nixParser = new (await import('tree-sitter')).default();
nixParser.setLanguage((await import('tree-sitter-nix')));

// read the current system config
// ignore imported files in configuration.nix
// separate api endpoint for configText to avoid json overhead
const routes = {
 '/readconfig': (req, res) => fs
  .readFileSync('/etc/nixos/configuration.nix', 'utf8').pipe(res)),
 '/parseconfig': (req, res) => {
    // read the current system config
    // ignore imported files in configuration.nix
    //const configText = fs.readFileSync('/etc/nixos/configuration.nix', 'utf8');
    //const configTree = nixParser.parse(configText);
    //res.setHeader(json)
    const iteratorFilterNode = (syntaxNode) => ({
        type: syntaxNode.type,
        typeId: syntaxNode.typeId,
        //text: syntaxNode.text,
        children: [...syntaxNode.children].map(iteratorFilterNode),
        startIndex: syntaxNode.startIndex,
        endIndex: syntaxNode.endIndex,
        isNamed: syntaxNode.isNamed,
        name: syntaxNode.name, // ?
    });
    
    res.json(iteratorFilterNode(configTree.rootNode));
  }),
  '/getschema': (req, res) => {
      // get schema of all valid config options
      // based on nix-gui/nixui/options/nix_eval.py
      const name = 'get_all_nixos_options';
      const expr = `(import ./src/lib.nix).${name}`;
      console.log(expr)

      const proc = child_process.spawnSync(
          "nix-instantiate", [ '--eval', '--expr', expr, '--json',
            // fix: error: cannot convert a function application to JSON
            '--strict' ], { encoding: 'utf8', maxBuffer: 1/0 }
      );
      res.send(proc.stdout + proc.stderr);
  },
};

import('./fs.js')

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
