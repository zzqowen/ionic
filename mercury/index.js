const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const https = require('https');
const fs = require('fs');
const commonHandler = require("./common/commonHandler"); 
const smsCommon = require("./sms/smsCommon");
const dateUtils = require("./common/dateUtils");
const morgan = require('morgan');
const socketio = require('socket.io');
const loggerHandler = require("./logsView/logsHandler");
const urlencodedParser = bodyParser.urlencoded({ extended: false });
const questionHandler = require("./game/questionHandler");
const pkOpenApi = require("./game/pkOpenApiHandler");
const pkHandler = require("./game/pk");
require('dotenv').load();

var globals = require("./globals");
var pushHandlers = require("./pushHandlers");
var requestHandlers = require("./requestHandlers");
var smsHandler = require("./sms/RegistHandler");
var utils = require('./utils');

// local vars
const app = express();
const logger = utils.logger;

app.set('json spaces', 2);
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(morgan(':date[iso] :url :status :res[content-length] - :response-time ms', { "stream": logger.stream }));
app.use('/apple-app-site-association', express.static('apple-app-site-association'));
app.use('/.well-known/assetlinks.json', express.static('.well-known/assetlinks.json'));
app.use('/post/*', express.static('redirect.html'));
app.use('/user/*', express.static('redirect.html'));
app.use('/invite/*', express.static('redirect.html'));
app.use('/pkInvite/*', express.static('redirect.html'));
app.use('/api', requestHandlers.webApi);
app.use("/sms", smsHandler.api);
app.use('/logs',loggerHandler.logsApi);
app.use('/', requestHandlers.openApi);
app.use('/api/game', questionHandler.pkApi);
app.use('/game', pkOpenApi.pkOpenApi);
// 加题目时打开 
app.use("/question",questionHandler.questionOpenApi);
app.use("/common", commonHandler.commonOpenApi);
// comment out below line if testing apn in sandbox
logger.info(`db=${globals.databaseUrl}`);

process.env.NODE_ENV = 'production';

var sslPath = 'ssl/';
if (process.env.SSLINTERNAL) sslPath = 'ssl-internal/';
else if (process.env.SSLDEBUG) sslPath = 'ssld/';
logger.info('loading certificate from', sslPath);

const options = {
  key: fs.readFileSync(sslPath + 'key.pem'),
  cert: fs.readFileSync(sslPath + 'cert.pem')
};

var useHttp = process.env.HTTP || true;
var port;
var server;

if (useHttp){
  port = process.env.PORT || 8080;
  server = http.Server(app);
}
else
{
  port = process.env.PORT || 443;
  server = https.createServer(options, app);
}

var io = socketio(server);
io.on('connection', function (socket) {
  logger.debug('socket.connection');
  socket.emit('online', {userSettings: globals.userSettings});
  var userId = null;

  socket.on(globals.message.register, function (msg) {
    if (msg.cookie == undefined) return;
    logger.debug('client connected', msg, socket.id);
    pushHandlers.registerSocket(msg.cookie, socket).then(function(id){ 
      userId = id;
      logger.debug("reconnect userid: " + userId);
      pkHandler.connectPk(userId, true);
     });
  });

  socket.on('disconnect', function () {
    logger.debug("client disconnected", socket.id);
    pkHandler.connectPk(userId, false);
    pushHandlers.unregisterSocket(userId);
  });
});

process.on('SIGINT', function() {
  logger.info("Service shut down" );
  process.exit( );
});

server.listen(port, function(){
  logger.info(useHttp ? "HTTP" : "HTTPS", "listening on port", port);
});
