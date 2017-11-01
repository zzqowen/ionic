const fs = require("fs");
const path = require('path');
const sharp = require('sharp');
const multer = require('multer');
const uuid = require('node-uuid');
const formidable = require("formidable");

const utils = require('../utils');
const globals = require('../globals');

var dir = path.resolve(__dirname, '../media');
if (!fs.existsSync(dir)){
  fs.mkdirSync(dir);
}

//upload img with from
exports.upload2 = function(req, res){
  let form = new formidable.IncomingForm();
  form.uploadDir = 'media/';
  form.keepExtensions = true;
  form.parse(req, function(err, fields, files){
    if(err) return utils.respondWithError(err, err, req, res);
    let path = files.image.path;
    let fileName = path.substr(path.lastIndexOf('/')+1);
    let localFile = dir + '/' + fileName;
    let fileUri = 'https://svc.aihuawen.com/file/'+fileName;
    if (fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.png')){
      let localThumbFile = `${dir}/thumb_${fileName}`;
      sharp(localFile).resize(globals.sharpQuality, null).toFile(localThumbFile, function(err){
        res.end(fileUri);
      })
    }else{
      res.end(fileUri);
    }
  })
}



var upload = multer({
  storage : multer.diskStorage({
    destination: function (req, file, callback) {
      callback(null, dir);
    },
    filename: (req, file, cb) => cb(null, `s_${Date.now()}_${uuid.v1()}.${file.originalname.split('.').pop()}`),
  })
}).single('file');

exports.uploadImg = function(req, res){
  var isPhoto = req.body&&req.body.isPhoto;
  upload(req,res,function(err) {
    if(err) {
      return res.end("Error uploading file.");
    }
    if (!req.file) return res.end("Invalid file");
    var fileKey = req.file.filename;
    var localFile = dir + '/' + fileKey;
    var fileUri = 'https://svc.aihuawen.com/file/' + fileKey;

    // generate thumbnail
    if (isPhoto || fileKey.toLowerCase().endsWith('.jpg') || fileKey.toLowerCase().endsWith('.png')) {
      var localThumbFile = `${dir}/thumb_${fileKey}`;
      sharp(localFile).resize(globals.sharpQuality, null).toFile(localThumbFile, function(err) {
        res.end(fileUri);
      });
    } else {
      res.end(fileUri);
    }
  });
};
