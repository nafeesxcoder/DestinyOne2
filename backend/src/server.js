const http = require('http');
const app = require('./app');
const env = require('./config/env');
const realtime = require('./services/realtime');
const giftMaintenance = require('./jobs/giftMaintenance');

const server = http.createServer(app);
realtime.init(server);

server.listen(env.port, () => {
  console.log(`DestinyOne backend running on http://localhost:${env.port}`);
  giftMaintenance.start();
});
