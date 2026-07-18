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



function login(){

let password =
document.getElementById("password").value;


let user =
USERS.find(
u => u.password === password
);


if(user){


document.getElementById(
"loginScreen"
).style.display="none";


document.getElementById(
"homeScreen"
).style.display="block";


sessionStorage.setItem(
"role",
user.role
);


}
else{

alert("Invalid password");

}

}




function logout(){

sessionStorage.clear();


document.getElementById(
"homeScreen"
).style.display="none";


document.getElementById(
"loginScreen"
).style.display="block";


document.getElementById(
"password"
).value="";

}






function openScanner(){


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


let video =
document.getElementById("camera");


video.srcObject = stream;


})


.catch(function(error){

alert(
"Camera Error: " + error.message
);

});


}







function capturePhoto(){


let video =
document.getElementById("camera");


let canvas =
document.getElementById("canvas");


let preview =
document.getElementById("preview");



canvas.width =
video.videoWidth;


canvas.height =
video.videoHeight;



let ctx =
canvas.getContext("2d");



ctx.drawImage(
video,
0,
0,
canvas.width,
canvas.height
);



preview.src =
canvas.toDataURL("image/png");



preview.style.display="block";


video.style.display="none";



document.getElementById(
"retakeBtn"
).style.display="block";


document.getElementById(
"continueBtn"
).style.display="block";


}





function retakePhoto(){


let video =
document.getElementById("camera");


let preview =
document.getElementById("preview");



video.style.display="block";


preview.style.display="none";



document.getElementById(
"retakeBtn"
).style.display="none";


document.getElementById(
"continueBtn"
).style.display="none";


}





function continueScan(){


alert(
"Next: PDF Conversion"
);


}






function closeCamera(){


let video =
document.getElementById("camera");



if(video.srcObject){


video.srcObject
.getTracks()
.forEach(
track=>track.stop()
);


}



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
