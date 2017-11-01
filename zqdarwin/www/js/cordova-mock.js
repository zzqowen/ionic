/*!
* ngCordova
* v0.0.1
* Copyright 2014 Drifty Co. http://drifty.com/
* See LICENSE in this repository for license information
*/

(function(){
  /****************************************************************
  * Barcode Scanner
  * link :   https://github.com/wildabeast/BarcodeScanner


  var barcodeScanner = {};

  barcodeScanner.scan = function (successCallback, errorCallback) {

  var data = {
  text: '102342340234',
  format: 'QR_CODE',
  cancelled: false
};

successCallback(data);
};

cordova.plugins.barcodeScanner = barcodeScanner;
*/
if (window.cordova) {
  console.log('skip mocking');
  return;
}

console.log('start mocking');

window.cordova = {
  getAppVersion: function (cb) {
    cb('7.8.9');
  },
};

if (!window.plugins) {
  window.plugins = {};
}

window.plugins.NativeAudio = {
  play: function () {
    console.log('NativeAudio.play');
  }
};

window.$cordovaFileTransfer = {
  upload: function (url, file, opts) {
    return new Promise(function (resolve, reject) {
      resolve({response: 'http://myserver/path'});
    });
  },
};

window.Wechat = {
  isInstalled: function (cb) {
    cb(true);
  },

  auth: function (scope, state, cb) {
    cb('code1234');
  },

  sendPaymentRequest: function (req, onSuccess, onError) {
    onSuccess({status: 'ok'});
  }
};

window.inAppPurchase = {
  getProducts: function (products) {
    return new Promise(function (resolve, reject) {
      resolve([1]);
    })
  },

  buy: function (opt) {
    return new Promise(function (resolve, reject) {
      opt == 6 ? resolve('done') : reject('fail');
    })
  },
};

window.PushNotification = {
  init: function () {
    console.log('PushNotification.init');

    return {
      on: function () {
        console.log('PushNotification.on');
      },
      setApplicationIconBadgeNumber: function () {
        console.log('PushNotification.setApplicationIconBadgeNumber');
      },
      unregister: function () {
        console.log('PushNotification.unregister');
      }
    }
  }
};

window.Media = function(src, successCallback, errorCallback, statusCallback) {
  this.src = src;
  this.successCallback = successCallback;
  this.errorCallback = errorCallback;
  this.statusCallback = statusCallback;
  this._duration = -1;
  this._position = -1;
  console.log('Media.ctor');

  this.startRecordWithCompression = function (opts) {
    console.log('Media.startRecordWithCompression');
  };

  this.stopRecord = function () {
    console.log('Media.stopRecord');
  };

  this.play = function () {
    console.log('Media.play');
    setTimeout(successCallback, 6000);
  };

  this.stop = function () {
    console.log('Media.stop');
    //setTimeout(successCallback, 1000);
  };
};

var MediaFile = {
  Audio: '535435b0-a959-11e6-b8bf-87482243b8bf_1479011179659.m4a',
  Photo: 'https://s3-us-west-2.amazonaws.com/238493/0ab6b6d0-a9da-11e6-8e41-cbb8679e933c_1479066462909.jpg'
};

var getFile = function (file) {
  return file.endsWith('.m4a') ? MediaFile.Audio : MediaFile.Photo;
};

window.FileTransfer = function () {
  this.upload = function (filePath, uri, resolve, reject, options, trustAllHosts) {
    var responseFile = getFile(filePath)
    console.log('FileTransfer.upload ret', responseFile);
    resolve({
      response: responseFile
    });
  };
};

window.CameraPopoverOptions = function () {
  console.log('CameraPopoverOptions');
}

window.addEventListener('load', function () {
  console.log('init after load');
  Camera.PopoverArrowDirection = {
    ARROW_UP : 1,
    ARROW_DOWN : 2,
    ARROW_LEFT : 4,
    ARROW_RIGHT : 8,
    ARROW_ANY : 15
  };
});

window.resolveLocalFileSystemURL = function (file, success, error) {
  console.log('resolveLocalFileSystemURL');
  // setTimeout(() => success({ toURL: () => getFile(file) }));

  setTimeout(function(){
    return success({
      toURL: function(){
        getFile(file);
      }
    })
  })
};

/****************************************************************
* Camera
*/

var Camera = {
  DestinationType: {
    DATA_URL: 0,      // Return image as base64-encoded string
    FILE_URI: 1,      // Return image file URI
    NATIVE_URI: 2     // Return image native URI (e.g., assets-library:// on iOS or content:// on Android)
  },

  PictureSourceType: {
    PHOTOLIBRARY: 0,
    CAMERA: 1,
    SAVEDPHOTOALBUM: 2
  },

  EncodingType: {
    JPEG: 0,               // Return JPEG encoded image
    PNG: 1                 // Return PNG encoded image
  },

  MediaType: {
    PICTURE: 0,    // allow selection of still pictures only. DEFAULT. Will return format specified via DestinationType
    VIDEO: 1,      // allow selection of video only, WILL ALWAYS RETURN FILE_URI
    ALLMEDIA: 2   // allow selection from all media types
  },

  Direction: {
    BACK: 0,      // Use the back-facing camera
    FRONT: 1      // Use the front-facing camera
  }
};

var camera = {};

camera.getPicture = function (successCallback, errorCallback, options) {

  var quality = options.quality || 50;
  var destinationType = options.destinationType || Camera.DestinationType.FILE_URI;
  var sourceType = options.sourceType || Camera.PictureSourceType.CAMERA;
  var targetWidth = options.targetWidth || -1;
  var targetHeight = options.targetHeight || -1;
  var encodingType = options.encodingType || Camera.EncodingType.JPEG;
  var mediaType = options.mediaType || Camera.MediaType.PICTURE;
  var allowEdit = !!options.allowEdit;
  var correctOrientation = !!options.correctOrientation;
  var saveToPhotoAlbum = !!options.saveToPhotoAlbum;
  var popoverOptions = options.popoverOptions || null;
  var cameraDirection = options.cameraDirection || Camera.Direction.BACK;

  successCallback(MediaFile.Photo);
};

camera.cleanup = function (successCallback, errorCallback) {
  successCallback();
};


window.navigator.camera = camera;
window.Camera = Camera;

/****************************************************************
* Contacts
*/

var contacts = {};

var ContactError = function(err) {
  this.code = (typeof err != 'undefined' ? err : null);
};

ContactError.UNKNOWN_ERROR = 0;
ContactError.INVALID_ARGUMENT_ERROR = 1;
ContactError.TIMEOUT_ERROR = 2;
ContactError.PENDING_OPERATION_ERROR = 3;
ContactError.IO_ERROR = 4;
ContactError.NOT_SUPPORTED_ERROR = 5;
ContactError.PERMISSION_DENIED_ERROR = 20;

var ContactName = function(formatted, familyName, givenName, middle, prefix, suffix) {
  this.formatted = formatted || null;
  this.familyName = familyName || null;
  this.givenName = givenName || null;
  this.middleName = middle || null;
  this.honorificPrefix = prefix || null;
  this.honorificSuffix = suffix || null;
};

var ContactField = function(type, value, pref) {
  this.id = null;
  this.type = (type && type.toString()) || null;
  this.value = (value && value.toString()) || null;
  this.pref = (typeof pref != 'undefined' ? pref : false);
};

var ContactAddress = function(pref, type, formatted, streetAddress, locality, region, postalCode, country) {
  this.id = null;
  this.pref = (typeof pref != 'undefined' ? pref : false);
  this.type = type || null;
  this.formatted = formatted || null;
  this.streetAddress = streetAddress || null;
  this.locality = locality || null;
  this.region = region || null;
  this.postalCode = postalCode || null;
  this.country = country || null;
};

var ContactOrganization = function(pref, type, name, dept, title) {
  this.id = null;
  this.pref = (typeof pref != 'undefined' ? pref : false);
  this.type = type || null;
  this.name = name || null;
  this.department = dept || null;
  this.title = title || null;
};

var Contact = function(id, displayName, name, nickname, phoneNumbers, emails, addresses, ims, organizations, birthday, note, photos, categories, urls) {
  this.id = id || null;
  this.rawId = null;
  this.displayName = displayName || null;
  this.name = name || null; // ContactName
  this.nickname = nickname || null;
  this.phoneNumbers = phoneNumbers || null; // ContactField[]
  this.emails = emails || null; // ContactField[]
  this.addresses = addresses || null; // ContactAddress[]
  this.ims = ims || null; // ContactField[]
  this.organizations = organizations || null; // ContactOrganization[]
  this.birthday = birthday || null;
  this.note = note || null;
  this.photos = photos || null; // ContactField[]
  this.categories = categories || null; // ContactField[]
  this.urls = urls || null; // ContactField[]
};


contacts.fieldType = {
  addresses:      "addresses",
  birthday:       "birthday",
  categories:     "categories",
  country:        "country",
  department:     "department",
  displayName:    "displayName",
  emails:         "emails",
  familyName:     "familyName",
  formatted:      "formatted",
  givenName:      "givenName",
  honorificPrefix: "honorificPrefix",
  honorificSuffix: "honorificSuffix",
  id:             "id",
  ims:            "ims",
  locality:       "locality",
  middleName:     "middleName",
  name:           "name",
  nickname:       "nickname",
  note:           "note",
  organizations:  "organizations",
  phoneNumbers:   "phoneNumbers",
  photos:         "photos",
  postalCode:     "postalCode",
  region:         "region",
  streetAddress:  "streetAddress",
  title:          "title",
  urls:           "urls"
};

contacts.create = function (properties) {

  var contact = {
    id: 0,
    rawId: 0,
    displayName: 'John',
    name: new ContactName(null, 'Doe', 'John'),
    nickname: 'Johnny',
    phoneNumbers: [new ContactField('Number', 12345678)],
    emails: new ContactField('Array', [ 'john@doe.com' ]),
    addresses: new ContactAddress(null, 'home', null, 'Street Address', null, 'South', 12345, 'US'),
    ims: new ContactField(),
    organizations: new ContactOrganization(false, false, 'Organization', 'Department', 'Title'),
    birthday: null,
    note: null,
    photos: new ContactField(),
    categories: new ContactField(),
    urls: new ContactField()
  };

  var params = Object.keys(contact).map(function (data) {
    return contact[data];
  });

  return new (Contact.bind.apply(Contact, params))();
};

contacts.find = function (fields, successCB, errorCB, options) {

  if (!fields.length) {
    return errorCB && errorCB(new ContactError(ContactError.INVALID_ARGUMENT_ERROR));
  }

  options = options || { filter: '', multiple: true };

  console.log('Searching for a contact with fields %s using options %O', fields, options);

  successCB([ this.create() ]);

};

contacts.pickContact = function (successCB, errorCB) {

  if (successCB && typeof successCB === 'function') {
    return successCB(this.create());
  }

  errorCB();
};

window.navigator.contacts = window.navigator.contacts || {};
window.navigator.contacts.create = contacts.create;
window.navigator.contacts.find = contacts.find;
window.navigator.contacts.pickContact = contacts.pickContact;
window.navigator.contacts.fieldType = contacts.fieldType;

/****************************************************************
* Device
*/

function Device() {
  this.available = true;
  this.platform = 'iOS';
  this.version = '7.1';
  this.uuid = '599F9C00-92DC-4B5C-9464-7971F01F8370';
  this.cordova = '3.6.0';
  this.model = 'iPhone 5,1';
  this.name = 'iPhone 5,1 - deprecated';
}

window.device = new Device();

/****************************************************************
* Device Motion
*/

var running = false;
var timers = {};

var accelerometer = {
  getCurrentAcceleration: function (successCallback, errorCallback, options) {

    var data = {
      x: -4.434294622159458,
      y: 19.345115933827113,
      z: -14.282339264520889,
      timestamp: (new Date()).getTime()
    };

    successCallback(data);
  },

  watchAcceleration: function (successCallback, errorCallback, options) {
    var frequency = (options && options.frequency && typeof options.frequency == 'number') ? options.frequency : 10000;

    var id = 12345;
    running = true;

    function getRandomInt(min, max) {
      return Math.random() * (max - min) + min;
    }

    var data = {
      x: getRandomInt(-4, 0),
      y: getRandomInt(10, 20),
      z: getRandomInt(-10, 0),
      timestamp: (new Date()).getTime()
    };

    timers[id] = {
      timer: window.setInterval(function () {
        successCallback(data);
      }, frequency)
    };

    return id;
  },

  clearWatch: function (id) {
    console.log('id: ' + id);
    console.log('timers id: ' + timers[id]);

    if (id && timers[id]) {
      running = false;
      window.clearInterval(timers[id].timer);
      delete timers[id];
    }
  }
};


navigator.accelerometer = accelerometer;

/****************************************************************
* Device Orientation
*/

var running = false;
var timers = {};


function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

var compass = {};

compass.getCurrentHeading = function (successCallback, errorCallback, options) {

  var data = {
    magneticHeading: getRandomFloat(0, 359.99),
    trueHeading: getRandomFloat(0, 359.99),
    headingAccuracy: 5,
    timestamp: (new Date()).getTime()
  };

  successCallback(data);
};

compass.watchHeading = function (successCallback, errorCallback, options) {
  var frequency = (options && options.frequency && typeof options.frequency == 'number') ? options.frequency : 10000;

  var id = 12345;
  running = true;

  var data = {
    magneticHeading: getRandomFloat(0, 359.99),
    trueHeading: getRandomFloat(0, 359.99),
    headingAccuracy: 5,
    timestamp: (new Date()).getTime()
  };

  timers[id] = {
    timer: window.setInterval(function () {
      successCallback(data);
    }, frequency)
  };

  return id;
};

compass.clearWatch = function (id) {
  console.log('id: ' + id);
  console.log('timers id: ' + timers[id]);

  if (id && timers[id]) {
    running = false;
    window.clearInterval(timers[id].timer);
    delete timers[id];
  }
};


navigator.compass = compass;

/****************************************************************
* Dialogs
*/

var notification = {};

notification.alert = function (message, callback, title, buttonName) {
  window.alert(message);
  callback();
};


notification.confirm = function (message, callback, title, buttonName) {
  if (window.confirm(message)) {
    callback(1);
  }
  else {
    callback(2);
  }
};

notification.prompt = function (message, callback, title, buttonName, defaultText) {
  var res = window.prompt(message, defaultText);
  if (res !== null) {
    callback({input1: res, buttonIndex: 1});
  }
  else {
    callback({input1: res, buttonIndex: 2});
  }
};

notification.beep = function (frequency) {
  frequency = frequency || 3;
  window.alert('Beep x' + frequency);
};

window.navigator.notification = notification;





/****************************************************************
* File
*/

window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;

window.resolveLocalFileSystemURL = window.resolveLocalFileSystemURL || window.webkitResolveLocalFileSystemURL;

/****************************************************************
* Flashlight
*/

function Flashlight() {
  this._isSwitchedOn = false;
}

Flashlight.prototype = {

  available: function (callback) {
    callback(true);
  },

  switchOn: function (successCallback, errorCallback) {
    this._isSwitchedOn = true;
    successCallback(true);
  },

  switchOff: function (successCallback, errorCallback) {
    this._isSwitchedOn = false;
    successCallback(true);
  },

  toggle: function (successCallback, errorCallback) {
    if (this._isSwitchedOn) {
      this.switchOff(successCallback, errorCallback);
    } else {
      this.switchOn(successCallback, errorCallback);
    }
  }
};

window.plugins.flashlight = new Flashlight();



/****************************************************************
* Globalization
*/

var globalization = {};
var language = (navigator.language) ?  navigator.language : "en-US";

globalization.getPreferredLanguage = function (successCallback, errorCallback) {
  successCallback({value: language});
};

globalization.getLocaleName = function (successCallback, errorCallback) {
  successCallback({value: language});
};

globalization.getFirstDayOfWeek = function (successCallback, errorCallback) {
  successCallback({value: 1});
};

globalization.dateToString = function (date, successCallback, errorCallback) {

};

globalization.getCurrencyPattern = function (currencyCode, successCallback, errorCallback) {

};

window.navigator.globalization = globalization;

/*
if (!window.cordova) {
var cordova = {};
}

if (!cordova.plugins) {
cordova.plugins = {};
}
*/

if (!window.plugins) {
  window.plugins = {};
}

var Connection = {
  UNKNOWN: "unknown",
  ETHERNET: "ethernet",
  WIFI: "wifi",
  CELL_2G: "2g",
  CELL_3G: "3g",
  CELL_4G: "4g",
  CELL: "cellular",
  NONE: "none"
};


var connection = {};
connection.type = "Connection.WIFI";


window.navigator.connection = connection;
window.Connection = Connection;

var progress = {};

progress.show = function (type, dim, label, detail) {
  return true;
};

progress.showSimple = function (dim) {
  return true;

};

progress.showSimpleWithLabel = function (dim, label) {
  return true;
};

progress.showSimpleWithLabelDetail = function (dim, label, detail) {

  return true;
};

progress.showDeterminate = function (dim, timeout) {
  return true;
};

progress.showDeterminateWithLabel = function (dim, timeout, label) {
  return true;
};

progress.showAnnular = function (dim, timeout) {
  return true;
};

progress.showAnnularWithLabel = function (dim, timeout, label) {
  return true;
};

progress.showBar = function (dim, timeout) {
  return true;
};

progress.showBarWithLabel = function (dim, timeout, label) {
  return true;
};


progress.showSuccess = function (dim, label) {
  return true;

};

progress.showText = function (dim, label, position) {
  return true;
};


progress.hide = function () {
  return true;
};

window.ProgressIndicator = progress;

/****************************************************************
* SplashScreen
*/

if (!navigator.splashscreen)
navigator.splashscreen = {};

navigator.splashscreen.show = function() {
  return true;
};

navigator.splashscreen.hide = function() {
  return true;
};
function Toast() {
}

Toast.prototype.show = function (message, duration, position, successCallback, errorCallback) {
  console.log("Toast has been called, message:" + message + ", duration:" + duration + ", position: " + position);
};

Toast.prototype.showWithOptions = function (options, successCallback, errorCallback) {
  this.show(options.message, options.duration, options.position, successCallback, errorCallback);
};

Toast.prototype.showShortTop = function (message, successCallback, errorCallback) {
  this.show(message, "short", "top", successCallback, errorCallback);
};

Toast.prototype.showShortCenter = function (message, successCallback, errorCallback) {
  this.show(message, "short", "center", successCallback, errorCallback);
};

Toast.prototype.showShortBottom = function (message, successCallback, errorCallback) {
  this.show(message, "short", "bottom", successCallback, errorCallback);
};

Toast.prototype.showLongTop = function (message, successCallback, errorCallback) {
  this.show(message, "long", "top", successCallback, errorCallback);
};

Toast.prototype.showLongCenter = function (message, successCallback, errorCallback) {
  this.show(message, "long", "center", successCallback, errorCallback);
};

Toast.prototype.showLongBottom = function (message, successCallback, errorCallback) {
  this.show(message, "long", "bottom", successCallback, errorCallback);
};

window.plugins.toast = new Toast();

/****************************************************************
* Vibration
*/

var vibration = {};

vibration.vibrateWithPattern = function (pattern, repeat) {
  repeat = typeof repeat !== 'undefined' ? repeat : -1;
  pattern.unshift(0);
  console.log('Vibrating %d times with pattern %s.', repeat, pattern.toString());
};

vibration.cancelVibration = function () {
  console.log('Cancelling vibration.');
};

vibration.vibrate = function (param) {

  if (param && typeof param === 'number') {
    console.log('Vibrating for %sms.', param);
  }
  else if (typeof param === 'object' && param.length === 1)
  {
    if (param[0] === 0) {
      return this.cancelVibration();
    }

    console.log('Vibrating for %sms.', param[0]);
  }
  else if (typeof param === 'object' && param.length > 1)
  {
    this.vibrateWithPattern(param, -1);
  }
  else {
    this.cancelVibration();
  }
};

window.navigator.notification.vibrateWithPattern = vibration.vibrateWithPattern;
window.navigator.notification.cancelVibration = vibration.cancelVibration;
window.navigator.notification.vibrate = vibration.vibrate;
window.navigator.vibrate = vibration.vibrate;

})();
