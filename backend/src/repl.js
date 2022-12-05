// I guess this should some how link the process shell to a other process shell node-pty is using the network.
// i do not know what nix repl is exactly but maybe it returns UTF 8 as it is a console app it should be 
// C String new line terminated 
// found https://github.com/edolstra/nix-repl/blob/master/nix-repl.cc

/* while (true) {
    // When continuing input from previous lines, don't print a prompt, just align to the same
    // number of chars as the prompt.
    const char * prompt = input.empty() ? "nix-repl> " : "          ";
    if (!getLine(input, prompt)) {
        std::cout << std::endl;
        break;
    }

    try {
        if (!removeWhitespace(input).empty() && !processLine(input)) return;
    } catch (ParseError & e) {
        if (e.msg().find("unexpected $end") != std::string::npos) {
            // For parse errors on incomplete input, we continue waiting for the next line of
            // input without clearing the input so far.
            continue;
        } else {
          printMsg(lvlError, format(error + "%1%%2%") % (settings.showTrace ? e.prefix() : "") % e.msg());
        }
    } catch (Error & e) {
        printMsg(lvlError, format(error + "%1%%2%") % (settings.showTrace ? e.prefix() : "") % e.msg());
    } catch (Interrupted & e) {
        printMsg(lvlError, format(error + "%1%%2%") % (settings.showTrace ? e.prefix() : "") % e.msg());
    }

    // We handled the current input fully, so we should clear it and read brand new input.
    input.clear();
    std::cout << std::endl;
} */


// Looks compatible


/*
FIXME this breaks on parallel requests
-> the requests hang forever
https://stackoverflow.com/questions/22107144/node-js-express-and-parallel-queues
*/

//const port = app.settings.port;

const nixReplEnv = { ...process.env };
// TODO: This does not look efficent i need to look how the original string looks like.
const nixPath = Object.fromEntries(
    (process.env.NIX_PATH || '')
        .split(':').map((kv)=>kv.split('=')).map(([key, value]) => [
          value ? key : '', 
          value?.join('=') || key
        ]);
);
console.log({ nixPath });
console.log(`info: nixos-config: ${(nixReplEnv.NIXOS_CONFIG = nixPath['nixos-config'] || '/etc/nixos/configuration.nix')}`);

const connections = [];
const repl = await import('node:repl');
const myEval = (cmd, context, filename, callback) =>
  callback(null, cmd);
const myWriter = (output) =>  output.toUpperCase();
    
// add some transfom streams do not want to waist to much time now 
// eval: myEval, writer: myWriter useColor: true
// .spawn('nix', ['repl', '<nixpkgs/nixos>'],
//console.log(`nixReplProcess: exit code ${code} signal ${signal}`);
//console.log(`nixReplProcess: error ${error}`);
//name: 'xterm-color', cols: 80, rows: 40, //cwd: process.env.HOME, env: nixReplEnv,
    
connections.push((await import('node:net')).createServer((socket) => {
// repl.start({ prompt: 'Node.js via stdin> ', input: process.stdin,  output: process.stdout });
  repl.start({
    prompt: 'Node.js via Unix socket> ',
    input: socket,
    output: socket,
  }).on('exit', () => {
    socket.end();
  });
}).listen('/tmp/node-repl-sock'));
   
    try {
  function handleInit(data) {
    
    // prompt is ready
    //process.stdout.write(`loading the config object to cache for faster access ... `)
    //nixReplProcess.write('builtins.attrNames config\r');
    console.log(`repl init done\ndone\n\ntry this:\ncurl http://localhost:${port}/repl --get --data-urlencode 'q=builtins.toJSON (builtins.attrNames options)'\n`)
    //nixReplProcess.removeListener("data", replResponseHandler); // not working
    //nixReplProcess.onData(replDefaultHandler);

  }



  // handle response from repl

  let replResponseBuffer = [];
  const queryStack = [];

  nixReplProcess.onData((data) => {

    //console.dir({replResponseHandler: { data }});

// set nixPath env

      replResponseBuffer.push(data);

      if (data.endsWith('nix-repl> ')) {
        // TODO better. avoid false matches
        //   here he implements something
        if (queryStack.length == 0) {
          console.log(`no response handler -> ignore repl response`);
          replResponseBuffer = [];
          return;
        }

        const replResponse = replResponseBuffer.join('');
        replResponseBuffer = [];
        const query = queryStack.shift();
        //console.log(`send response to api client`);
        //replResponse.startsWith(`${query.clientQuery}\r\r\n`)
        const startToken = '\x1B[35;1m';
        const endToken = '\x1B[0m\r\n';
        const bodyStart = replResponse.indexOf(startToken) + startToken.length;
        const bodyEnd = replResponse.lastIndexOf(endToken)
        // TODO avoid the double-encoding of json as nix string -> get "raw output" of nix repl?
        const bodyJsonJson = replResponse.slice(bodyStart, bodyEnd);
        let bodyJson = '';
        try {
          bodyJson = JSON.parse(bodyJsonJson);
        }
        catch (e) {
          // json SyntaxError
          console.log(`FIXME json SyntaxError. replResponse = ${replResponse}`)
          bodyJson = ''
          // TODO send http status != 200
        }
          
          
        //const bodyJsonStart = bodyJson.length < 80 ? bodyJson : `${bodyJson.slice(0, 76)} ...`;
        console.log(`> ${query.clientQuery}`)
        console.log(bodyJsonStart)
        console.log();
        //console.dir({ bodyJson });
        //query.sendResponse(bodyJson);
        // TODO better? remove the onData listener
        //nixReplProcess.removeListener("data", replResponseHandler);
        //nixReplProcess.onData(replDefaultHandler);
      }
    }
    else {  handleInit(data);  }
  });

  // wants to handle json at /repl via query parms as get request something unsave in general not clever
  app.get('/repl', async function(req, res) {
    const clientQuery = req.query.q;
    if (!clientQuery) { res.send("");   return;   }
    queryStack.push({ clientQuery, sendResponse: (data) => res.send(data) });
    nixReplProcess.write(`${clientQuery}\r`);
  });

} catch (e) { /** NoOp */ }
