const fs = require("fs");
const express = require("express");
const mediaType = {
  "css": "text/css",
  "gif": "image/gif",
  "html": "text/html",
  "ico": "image/x-icon",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "js": "text/javascript",
  "json": "application/json",
  "pdf": "application/pdf",
  "png": "image/png",
  "svg": "image/svg+xml",
  "swf": "application/x-shockwave-flash",
  "tiff": "image/tiff",
  "txt": "text/plain",
  "wav": "audio/x-wav",
  "wma": "audio/x-ms-wma",
  "wmv": "video/x-ms-wmv",
  "xml": "text/xml"
};

function redirect(pathname, response, contenttype) {
    fs.readFile(pathname.substr(1),(err, data) => {
      if (err) {
         response.writeHead(404, {'Content-Type': 'text/html'});
      }else{	         
          if(contenttype) response.write(data.toString, contenttype);
         else response.write(data.toString());		
      }
      response.end();
   });
}

function commonMedia(request, response) {
    var mediaName = request.params.name;
    console.log(mediaName.substr(mediaName.lastIndexOf(".")).toLowerCase());
    response.setHeader("Content-Type",mediaType[mediaName.substr(mediaName.lastIndexOf(".") + 1).toLowerCase()]);
    var content =  fs.readFileSync("media/" + mediaName,"binary");   
    response.writeHead(200, "Ok");
    response.write(content,"binary"); //格式必须为 binary，否则会出错
    response.end();
}

function commonJavascript (request, response) {
    let jsName = request.params.name;
    redirect("/frontend/js/" + jsName, response);
}

function commonCss(request, response) {
    let cssName = request.params.name;
    redirect("/frontend/css/" + cssName, response);
}

function commonFonts(request, response) {
    let cssName = request.params.name;
    redirect("/frontend/fonts/" + cssName, response);
}

exports.commonOpenApi = new express.Router()
    .get("/js/:name", commonJavascript)
    .get("/css/:name", commonCss)
    .get("/media/:name", commonMedia)
    .get("/fonts/:name", commonFonts);