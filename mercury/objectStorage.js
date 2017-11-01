const oss = require('ali-oss');
const fs = require("fs");
const utils = require("./utils");

var useOss = process.env.OSS || false;

const store = oss({
  endpoint: process.env.ALI_ENDPOINT,
  accessKeyId: process.env.ALI_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALI_ACCESS_KEY_SECRET,
  bucket: process.env.ALI_BUCKET,
  region: process.env.ALI_REGION,
  cname: true,
});
store.useBucket(process.env.ALI_BUCKET);

const logger = utils.logger;

function getUploadSignatureUrl(name){
  var url = store.signatureUrl(name, {
    expires: 600, // expire after 10 minutes
    method: 'PUT'
  });
  return url;
}

function getThumbnailName(name){
  return "thumb/" + name;
}

function requestFileUploadUrl(prefix, fileRequest, loopback){
  if (!fileRequest) return null;
  var fileName = fileRequest.fileName;
  if (!fileName) return null;
  if (prefix) prefix += '/';
  var result = {original: fileName};
  if (loopback){
    result.name = fileName;
    result.url = getUploadSignatureUrl(fileName);
  }
  else{
    result.name = prefix + utils.getRandomFileName(fileName);
    result.url = getUploadSignatureUrl(result.name);
  }
  if (fileRequest.thumbnail)
    result.thumbnail = getUploadSignatureUrl(getThumbnailName(result.name));
  logger.debug("requestFileUploadUrl", prefix, fileRequest, result);
  return result;
};

function requestFileDownloadUrl(fileName){
  if (!fileName) return null;
  var url = store.signatureUrl(fileName, {
    expires: 3600*24*30, // expire after 30 days
    method: 'GET'
  });
  logger.debug("getFileDownloadUrl", fileName, url);
  return url;
};

function processUrls(post){
  if (!useOss || !post) return post;
  post.photoFiles.forEach((photo) => {
    photo.thumbnail = requestFileDownloadUrl(getThumbnailName(photo.src));
    photo.src = requestFileDownloadUrl(photo.src);
  });
  post.audioFiles.forEach((audio) => { audio.src = requestFileDownloadUrl(audio.src); });
  return post;
};

exports.requestFileUploadUrl = requestFileUploadUrl;
exports.processUrls = processUrls;
