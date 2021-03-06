window.addEventListener("load", Ready); 
 
function Ready(){ 
    if(window.File && window.FileReader){ //These are the relevant HTML5 objects that we are going to use 
        document.getElementById('UploadButton').addEventListener('click', StartUpload);
        document.getElementById('copyButton').addEventListener('click', areaUpload);		
        document.getElementById('FileBox').addEventListener('change', FileChosen);
    }
    else
    {
        document.getElementById('UploadArea').innerHTML = "Your Browser Doesn't Support The File API Please Update Your Browser";
    }
	writeh2("Get Started...");
}
var SelectedFile;
function FileChosen(evnt) {
    SelectedFile = evnt.target.files[0];
    document.getElementById('NameBox').value = SelectedFile.name;
}
var socket = io.connect('http://default-environment.9b98yidmia.us-west-2.elasticbeanstalk.com'); //   http://localhost:3000
var FReader;
var Name;
function writeh2(message){
	var target = document.getElementById("message-h2");
	target.innerHTML = " ";
	var addString = "";
	var count = 0;
	var typing = setInterval(function(){
		if (count < message.length){
			addString += message[count];
			target.innerHTML = addString;
		}else{
			clearInterval(typing);
		}
		count++;
	},100);
}
function StartUpload(){
    if(document.getElementById('FileBox').value != "")
    {
        FReader = new FileReader();
        Name = Date.now() + document.getElementById('NameBox').value;
        var Content = "<span id='NameArea'>Uploading " + SelectedFile.name + " as " + Name + "</span>";
        Content += '<div id="ProgressContainer"><progress id ="uploadProgress"></progress></div><span id="percent">0%</span>';
        Content += "<span id='Uploaded'> - <span id='MB'>0</span>/" + Math.round(SelectedFile.size / 1048576) + "MB</span>";
        document.getElementById('UploadArea').innerHTML = Content;
		writeh2("Started...");
        FReader.onload = function(evnt){
            socket.emit('Upload', { 'Name' : Name, Data : evnt.target.result });
        }
		socket.emit('Start', { 'Name' : Name, 'Size' : SelectedFile.size });
        }
        

    else
    {
        alert("Please Select A File");
    }
}
function areaUpload(){
	 Name = Date.now() + "list";
	var textToWrite = document.getElementById("list-area").value;
	 var textFileAsBlob = new Blob([textToWrite], {type:'text/plain'});
	var Content = "<span id='NameArea'>Uploading list as " + Name + "</span>";
        Content += '<div id="ProgressContainer"><progress id ="uploadProgress"></progress></div><span id="percent">0%</span>';
        Content += "<span id='Uploaded'> - <span id='MB'>0</span>/" + Math.round(textFileAsBlob.size / 1048576) + "MB</span>";
        document.getElementById('UploadArea').innerHTML = Content;	
	 socket.emit("blobSend", {data:textFileAsBlob, name:Name});
}
socket.on('MoreData', function (data){
    UpdateBar(data['Percent']);
    var Place = data['Place'] * 524288; //The Next Blocks Starting Position
    var NewFile; //The Variable that will hold the new Block of Data
    if (SelectedFile.slice){
       NewFile = SelectedFile.slice(Place, Place + Math.min(524288, (SelectedFile.size-Place)));
    }
    else if(SelectedFile.webkitSlice) 
        NewFile = SelectedFile.webkitSlice(Place, Place + Math.min(524288, (SelectedFile.size-Place)));
    else
        NewFile = SelectedFile.mozSlice(Place, Place + Math.min(524288, (SelectedFile.size-Place)));
    FReader.readAsBinaryString(NewFile);
});
socket.on('Done', function (data){
    var Content = "List Successfully Uploaded. Downloading files from URLs";   
    document.getElementById('UploadArea').innerHTML = Content;
	document.getElementById("list-area").disabled = true;
});
function reload(){
	location.reload();
}
socket.on('fileDone',function(){
    document.getElementById('file-link').innerHTML = '<div id ="success-container"><a class="btn btn-success" href="/getFile" target="black">Download Zip</a>'+
	'<div> <span id="minutes-left"></span>:<span id="seconds-left"></span> Left to download. We give you half an hour to download the file and then delete it to'+
	' save space on our server.<br> This keeps our cost down and the service free to you.</div><button class="btn btn-warning" id="reload">Upload Another List</button> Save this file first!<div>';
	 document.getElementById('reload').addEventListener('click', reload);
	  document.getElementById('getProgress').innerHTML = "";
	var timeLeft = 1800;
	writeh2("Download Your Zip Now!");
     setInterval(function() {
         if (timeLeft < 1) {
             document.getElementById('file-link').innerHTML = '<div id="out-of-time">Time to download expired. If you forgot to download you list you can ' + 
			 ' upload it again</div><button class="btn btn-warning" id="reload">Upload Another List</button>';
         } else {
             seconds = timeLeft % 60;
             seconds < 10 ? seconds = "0" + seconds :seconds = seconds;
             minutes = Math.floor(timeLeft / 60);
             document.getElementById('seconds-left').innerHTML = seconds;
             document.getElementById('minutes-left').innerHTML = minutes;
             timeLeft--;
        }
     }, 1000);	
});
var totalFiles=0;
socket.on('startGet',function(passFiles){
	    totalFiles = passFiles;
        var Content = "<span id='NameArea'></span>";
        Content += '<div class="ProgressContainer" id="getProgress"><progress id ="downloadProgress"></progress></div><span id="getpercent">0</span>%';
        Content += "<span id='downloaded'> - <span id='files'>0</span> " + " Lines Processed </span><span id='goodFiles'>0</span>" 
        + " Files Downloaded <span id='badUrl'>0</span> Bad Urls ";
		Content += '<span id="emptyLines">0</span> empty Lines';
		 document.getElementById('downloadarea').innerHTML = Content;
		 downloadProgress.value=0;
});
socket.on('fileGot',function(data){
	var currentLine = data.number;
	var fileName = data.name;
    document.getElementById('files').innerHTML = currentLine;
	document.getElementById('goodFiles').innerHTML = currentLine - badUrls;
	 document.getElementById('downloadProgress').value = currentLine / totalFiles;
	 document.getElementById('getpercent').innerHTML = Math.round(currentLine / totalFiles *100);
	  document.getElementById('NameArea').innerHTML = fileName;
});
var badUrls = 0;
socket.on("badUrl",function(){
	badUrls++;
	document.getElementById('badUrl').innerHTML = badUrls;
});
var emptyLines = 0;
socket.on("emptyLine",function(){
	totalFiles--;
	emptyLines++;
	document.getElementById('emptyLines').innerHTML = emptyLines;
})
function Refresh(){
    location.reload(true);
} 
function UpdateBar(percent){
    document.getElementById('uploadProgress').value = percent;
    document.getElementById('percent').innerHTML = (Math.round(percent*100)/100) + '%';
    var MBDone = Math.round(((percent/100.0) * SelectedFile.size) / 1048576);
    document.getElementById('MB').innerHTML = MBDone;
}