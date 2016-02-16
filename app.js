var fs = require('fs-extra');
var http = require('http');
var inputFile = "images.csv";
var LineByLineReader = require('line-by-line');
var uris = [];
var request = require('request');
var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var Files = {};
var archiver = require('archiver');
io.on('connection', function() {
    console.log("a user connected");
});
app.get('/', function(req, res) {
    res.sendfile('index.html');
});
app.get('/getFile', function(req, res) {
    res.sendfile(zipName);
});
app.get('/public/*', function(req, res){
    var uid = req.params.uid,
        path = req.params[0] ? req.params[0] : 'index.html';
    res.sendfile(path, {root: './public'});
});
io.sockets.on('connection', function(socket) {
    socket.on('Start', function(data) { //data contains the variables that we passed through in the html file
        var Name = data['Name'];
        Files[Name] = { //Create a new Entry in The Files Variable
            FileSize: data['Size'],
            Data: "",
            Downloaded: 0
        }
        var Place = 0;
        try {
            var Stat = fs.statSync('Temp/' + Name);
            if (Stat.isFile()) {
                Files[Name]['Downloaded'] = Stat.size;
                Place = Stat.size / 524288;
            }
        } catch (er) {} //It's a New File
        fs.open("Temp/" + Name, "a", 0755, function(err, fd) {
            if (err) {
                console.log(err);
            } else {
                Files[Name]['Handler'] = fd; //We store the file handler so we can write to it later
                socket.emit('MoreData', {
                    'Place': Place,
                    Percent: 0
                });
            }
        });
    });
    socket.on('Upload', function(data) {
        var Name = data['Name'];
        Files[Name]['Downloaded'] += data['Data'].length;
        Files[Name]['Data'] += data['Data'];
        if (Files[Name]['Downloaded'] == Files[Name]['FileSize']) //If File is Fully Uploaded
        {
            fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function(err, Writen) {
                socket.emit('Done', {});
                inputFile = "Temp/" + Name;
                var lineCount = 0; 
                lr = new LineByLineReader(inputFile);
                lr.on('error', function(err) {
                    // 'err' contains error object
                    console.log(err);
                });
                lr.on('line', function(line) {
                     lineCount++;
                });
                lr.on('end', function() {
                    socket.emit("startGet", lineCount);
                    downloadFiles();
                });                	   
            });
            socket.emit('done', {});
        } else if (Files[Name]['Data'].length > 10485760) { //If the Data Buffer reaches 10MB
            fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function(err, Writen) {
                Files[Name]['Data'] = ""; //Reset The Buffer
                var Place = Files[Name]['Downloaded'] / 524288;
                var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
                socket.emit('MoreData', {
                    'Place': Place,
                    'Percent': Percent
                });
            });
        } else {
            var Place = Files[Name]['Downloaded'] / 524288;
            var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
            socket.emit('MoreData', {
                'Place': Place,
                'Percent': Percent
            });
        }
    });
socket.on("blobSend",function(sentObject){
	var blobName = sentObject.name;
	var blobData = sentObject.data;
	inputFile = "Temp/" + blobName + ".txt";
	fs.writeFile(inputFile, blobData, function(err) {
        if(err) {
            return console.log(err);
        }
        socket.emit('Done', {});
                
                var lineCount = 0; 
                lr = new LineByLineReader(inputFile);
                lr.on('error', function(err) {
                    // 'err' contains error object
                    console.log(err);
                });
                lr.on('line', function(line) {
                     lineCount++;
                });
                lr.on('end', function() {
                    socket.emit("startGet", lineCount);
                    downloadFiles();
                });       
    });
});
function zipIt(){
	  zipName = __dirname +  '/zips/' + Date.now() + '.zip';
     var output = fs.createWriteStream(zipName);
                var archive = archiver('zip');

                output.on('close', function() {
                    console.log(archive.pointer() + ' total bytes');
                    console.log('archiver has been finalized and the output file descriptor has closed.');
					socket.emit('fileDone');
					fs.remove(exportDir, function(err){
                        if (err) return console.error(err);  
                    });
					fs.remove(inputFile, function(err){
                        if (err) return console.error(err);  
                    });
					setTimeout(function() {
						fs.remove(zipName, function(err){
                            if (err) return console.error(err);  
                        });
					}, 1800000);
                });

                archive.on('error', function(err) {
                    throw err;
                });
               
                archive.pipe(output);
				archive.bulk([{
                     expand: true,
                     cwd: exportDir + "/",
                     src: ['*']
                }]);	
			    archive.finalize();
				
}
var download = function(uri, filename, callback) {
    console.log(uri);
	request(uri, function (error, response, body) {
         if (!error && response.statusCode == 200) {
            request(uri).pipe(fs.createWriteStream(exportDir +"/" + filename)).on('close', callback);   
         }else{
			 socket.emit("badUrl",{});
			 callback();
		 }
   })     
};

function downloadFiles() {
	 exportDir = 'export-files/' + Date.now();

     if (!fs.existsSync(exportDir)){
         fs.mkdirSync(exportDir);
     }
	var upLineCount = 0;
    lr = new LineByLineReader(inputFile);
    lr.on('error', function(err) {
        // 'err' contains error object
        console.log(err);
    });

    lr.on('line', function(line) {
        lr.pause();
        if (line) {
            var fileName = line.split("/");
            fileName = fileName[fileName.length - 1];
            console.log(fileName);
            download(line, fileName, function() {
                lr.resume();
				upLineCount++;
				socket.emit("fileGot", {number:upLineCount,name:fileName});
                console.log('done');
            });
        } else {
            lr.resume();
		    socket.emit("emptyLine", {})
            console.log('empty line');
        }

    });

    lr.on('end', function() {
        zipIt();
        console.log("all done!");
    });
}
});
server.listen(8081); //   3000