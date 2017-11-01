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
const yyHandle = require('./yunying/yyHandler');

// local vars
const app = express();
process.env.LOG_FOLDER = './yunyinglog/';
const logger = utils.logger;

app.set('json spaces', 2);
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(morgan(':date[iso] :url :status :res[content-length] - :response-time ms', { "stream": logger.stream }));
app.use('/api', requestHandlers.webApi);
app.use("/sms", smsHandler.api);
app.use('/logs', loggerHandler.logsApi);
app.use('/', requestHandlers.openApi);
app.use("/question",questionHandler.questionOpenApi);
app.use("/common", commonHandler.commonOpenApi);
app.use("/yy", yyHandle.api);

logger.info(`db=${globals.databaseUrl}`);

var useHttp = process.env.HTTP || false;
var port = 9088;
var server = http.Server(app);

process.on('SIGINT', function() {
  logger.info("Yunying Service shut down" );
  process.exit( );
});

server.listen(port, function(){
  logger.info(useHttp ? "HTTPS" : "HTTP", "Yunying listening on port", port);
});
