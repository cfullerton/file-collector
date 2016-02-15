var fs = require('fs');
var http = require('http');
var inputFile = "images.csv";
var LineByLineReader = require('line-by-line');
var uris =[];
var fs = require('fs'),
    request = require('request');

var download = function(uri, filename, callback){
  
     console.log(uri);
    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  
};
lr = new LineByLineReader(inputFile);
lr.on('error', function (err) {
	// 'err' contains error object
        console.log(err);
});

lr.on('line', function (line) {
     lr.pause();
     if (line){
         var fileName = line.split("/");
         fileName = fileName[fileName.length-1];
         console.log(fileName);	
         download(line,fileName,function(){
            lr.resume();
            console.log('done');
         });
     }else {
          lr.resume();
          console.log('empty line');
     }   
    
});

lr.on('end', function () {
  console.log("all done!")
});
 