# Darwin app

# DOCUMENTATION:
### To setup the project
* cd into <darwin_folder>
git init
git remote add prod ssh://<username>@git.aihuawen.com/huawen/darwin.git/
git remote -v
git pull origin master
sudo npm install -g cordova@7.0.1 ionic@2.2.1 bower gulp
npm install
sudo gem install cocoapods
pod setup
ionic platform add browser ios android

### to start the client in browser
* cd into <darwin_folder>
gulp
ionic serve

### to overcome CORS issue in chrome
* install plugin from https://chrome.google.com/webstore/detail/allow-control-allow-origi/nlfbmbojpeacfghkpbjhddihlkkiljbi?hl=en

### to update cordova plugins
* npm install -g cordova-plugin-update
* cordova-plugin-update

* cd into your project:
```
cd darwin
```

* Setup this project to use Sass:
```
ionic setup sass
```

* Develop in the browser with live reload:
```
ionic serve
```

* Add a platform (ios or Android):
```
ionic platform add ios [android]
```

* Build your app:
```
gulp
ionic build <PLATFORM>
```

* Simulate your app:
```
ionic emulate <PLATFORM>
```

* Run your app on a device:
```
ionic run <PLATFORM>
```

* Package an app using Ionic package service:
```
ionic package <MODE> <PLATFORM>
```

* Generate icon and splash screen:
```
ionic resources
```

For more help use ```ionic --help``` or visit the Ionic docs: http://ionicframework.com/docs
