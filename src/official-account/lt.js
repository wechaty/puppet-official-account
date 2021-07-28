const localtunnel = require('localtunnel');

(async () => {
  const tunnel = await localtunnel({ 
      port: 3000,
    });

  // the assigned public url for your tunnel
  // i.e. https://abcdefgjhij.localtunnel.me
  console.log(tunnel.url)

  tunnel.on('close', () => {
    // tunnels are closed
  });
})();