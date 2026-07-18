const USERS = [

{
password:"ray1926",
role:"ADMIN"
},

{
password:"dawn1234",
role:"USER"
},

{
password:"12345",
role:"User2"
}

];


let scannedPages = [];

let currentStream = null;



function login(){

let password =
document.getElementById("password").value;


let user =
USERS.find(
u=>u.password===password
);


if(user){

document.getElementById(
"loginScreen"
).style.display="none";


document.getElementById(
"homeScreen"
).style.display="block";


}
else{

alert("Invalid password");

}

}




function logout(){

location.reload();

}





function openScanner(){

scannedPages=[];


document.getElementById(
"homeScreen"
).style.display="none";


document.getElementById(
"cameraScreen"
).style.display="block";


startCamera();

}




function startCamera(){

navigator.mediaDevices.getUserMedia({

video:{
facingMode:"environment"
}

})


.then(function(stream){

currentStream=stream;


document.getElementById(
"camera"
).srcObject=stream;


});


}




function capturePhoto(){


let video =
document.getElementById("camera");


let canvas =
document.getElementById("canvas");


canvas.width=
video.videoWidth;


canvas.height=
video.videoHeight;



let ctx =
canvas.getContext("2d");


ctx.drawImage(
video,
0,
0
);



let image =
canvas.toDataURL(
"image/png"
);



scannedPages.push(image);



document.getElementById(
"preview"
).src=image;


document.getElementById(
"preview"
).style.display="block";


video.style.display="none";


document.getElementById(
"captureBtn"
).style.display="none";


document.getElementById(
"scanActions"
).style.display="block";



stopCamera();


}




function addScan(){


document.getElementById(
"preview"
).style.display="none";


document.getElementById(
"scanActions"
).style.display="none";


document.getElementById(
"captureBtn"
).style.display="block";


document.getElementById(
"camera"
).style.display="block";


startCamera();


}




function continueScan(){


alert(
"Pages scanned: "
+
scannedPages.length
+
"\nNext: PDF Creation"
);


}




function stopCamera(){


if(currentStream){

currentStream
.getTracks()
.forEach(
track=>track.stop()
);

}

}




function closeCamera(){

stopCamera();


document.getElementById(
"cameraScreen"
).style.display="none";


document.getElementById(
"homeScreen"
).style.display="block";


}




function openGallery(){

alert(
"Gallery next step"
);

}
