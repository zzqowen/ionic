var express = require("express");
var fs = require("fs");
var path = require("path");
var globals = require("../globals");
var utils = require("../utils");
var logger = utils.logger;
var logReader = require('n-readlines');
var logsdir = globals.rootDir + "/logs/";

function logsDownload(request, response) {
    var fileName = request.params.filename;
    var filePath = path.join(globals.rootDir + "/logs/" + fileName + ".log");
    var stats = fs.statSync(filePath);
    if (stats.isFile()) {
        response.set({
            "Content-Type": "application/octet-stream",
            "Content-Disposition": 'attachement; filename=' + fileName + ".log",
            "Content-Length": stats.size
        });
        fs.createReadStream(filePath).pipe(response);
    } else {
        res.end(404);
    }
}

function readLogsAsync() {
    return new Promise(function (resolve, reject) {
        fs.readdir(logsdir, function (err, files) {
            if (err) {
                logger.error(err);
                return reject(err);
            }
            var curFiles = [];
            files.forEach(function (file) {
                var time = file.split('.')[0];
                curFiles.push({
                    time: time,
                    fileName: file
                });
            });
            curFiles.sort(function (a, b) {
                if (a.time == "current") return -1;
                return b.time > a.time ? 1 : -1;
            });
            return resolve(curFiles);
        });
    });
};

function listLogs(request, response) {
    readLogsAsync().then(function (files) {
        var datalist = [];
        var page = request.params.curPage;
        var pageSize = request.params.pageSize;
        var length = files.length;
        var totalPage = Math.floor(parseFloat(length) / parseFloat(pageSize));
        if (length % pageSize > 0) totalPage++;
        var beginIndex = (page - 1) * pageSize;
        for (var i = 0; i < pageSize && beginIndex < files.length; i++, beginIndex++)
            datalist.push({value: files[beginIndex].fileName, rownum: beginIndex + 1});
        utils.respondWithOk(
            {
                status: globals.ok,
                data: datalist,
                curPage: page,
                pageSize: pageSize,
                total: totalPage
            },
            request, response
        );
    });
}

function listAllLogs(request,response) {
    readLogsAsync().then(function(files) {
        utils.respondWithOk(files, request, response);
    });
}

function showCurrentLogs(request,response) {
    request.params.fileName = "current";
    showLogsDetail(request, response);
}

function showLogsDetail(request, response) {
    logger.debug(request.params);
    var fileName = request.params.fileName;
    var lineReader = new logReader(globals.rootDir + "/logs/" + fileName + ".log");
    var line ;
    var str = [];
    while (line = lineReader.next()) {
        str.push(JSON.parse(line.toString()));
    }
    response.send(str);
    response.end();

}

exports.logsApi = new express.Router()
    .get("/list", listAllLogs)
    .get("/list/:curPage/:pageSize", listLogs)
    .get("/download/:filename", logsDownload)
    .get("/read/:fileName", showLogsDetail)
    .get("/read/current", showCurrentLogs);