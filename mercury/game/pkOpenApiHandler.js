const express = require("express");
const utils = require("../utils");
const logger = utils.logger;
const pkHandler = require("../game/pk");

function checkPkMessageByPkid(request, response) {
    let pkid = request.params.pkid;
    let pkObject= pkHandler.getPkObject(pkid);
    logger.debug("count: " + pkObject.count);

    response.send("count: " + pkObject.count + " que: " + pkObject.que);
    response.end();
}

function getAllPkUser(request, response) {
    const pkids = pkHandler.listPkObjectId();
    let buildPkUserMessage = [];

    pkids.forEach(pkid => {
        const pkObj = pkHandler.getPkObject(pkid);
        const outputObj= {
            pkid: pkid,
            count: pkObj.count,
            red: pkObj.red,
            blue: pkObj.blue
        };
        buildPkUserMessage.push(outputObj);
    })
    utils.respondWithOk(buildPkUserMessage, null, response) ;
}

function checkMatchList(request, response) {
    let handler = pkHandler.candidates;
    response.send(pkHandler.candidates);
    response.end();
}

exports.pkOpenApi = new express.Router()
    .get("/listPkUser", getAllPkUser)
    .get("/check", checkMatchList)
    .get("/checkByPkid/:pkid", checkPkMessageByPkid);