# mercury project

### to setup the project
* mkdir <mercury>
* cd into <mercury>
* git init
* git remote add origin ssh://<your_user>@git.aihuawen.com/huawen/mercury.git/
* npm install

### to install mongodb on ubuntu server through ssh
* sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 0C49F3730359A14518585931BC711F9BA15703C6
* lsb_release -a
* echo "deb [ arch=amd64,arm64 ] http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.4 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.4.list
* sudo apt-get update
* sudo apt-get install -y mongodb-org
* sudo service mongod start

### to install mongodb on local macbook 
* brew update
* brew install mongodb
* sudo mongod

### to start the service
* node index.js

### to kill the server
ps aux | grep "node index.js"
kill -9 <process_id_of_node_index.js>

### to start mongo shell
* mongo
> use mercury
switched to db mercury
> db.users.find({})

### to restart server
$ ssh root@aihuawen.net
$ sudo service mercury restart
# config
$ cat /etc/init/mercury.conf
# log
$ tail /data/log/service.log -n 40
# to exit shell
$ ~.
or
$ exit

