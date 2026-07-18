/* ==========================
   GLOBAL VARIABLES
========================== */

console.log("APP JS LOADED");

let cameraStream = null;

let capturedImages = [];

let currentPreviewIndex = null;

let currentCameraMode = "environment";



const loginScreen = document.getElementById("loginScreen");

const homeScreen = document.getElementById("homeScreen");

const scannerScreen = document.getElementById("scannerScreen");

const reviewScreen = document.getElementById("reviewScreen");



const camera = document.getElementById("camera");

const canvas = document.getElementById("canvas");

const thumbnailContainer = document.getElementById("thumbnailContainer");

const pageCount = document.getElementById("pageCount");

const thumbCounter = document.getElementById("thumbCounter");



/* ==========================
   LOGIN SYSTEM
========================== */

document
.getElementById("loginBtn")
.addEventListener("click", function(){


document
.getElementById("loginBtn")
.addEventListener("click", function(){

    console.log("LOGIN CLICKED");

    let username =
    document.getElementById("username").value.trim();

    let password =
    document.getElementById("password").value.trim();

});



    const users = [

        {
            username:"Ray",
            password:"1926"
        },

        {
            username:"Dawn",
            password:"54321"
        },

        {
            username:"User",
            password:"12345"
        }

    ];



    let validUser = users.find(function(user){


        return user.username === username &&
               user.password === password;


    });



    if(!validUser){


        alert("Invalid username or password");

        return;


    }



    loginScreen.style.display = "none";

    homeScreen.style.display = "block";


});



/* ==========================
   DASHBOARD NAVIGATION
========================== */



document
.getElementById("scanCard")
.addEventListener("click",function(){


    homeScreen.style.display="none";

    scannerScreen.style.display="block";


    startCamera();


});





document
.getElementById("logoutCard")
.addEventListener("click",function(){


    stopCamera();


    scannerScreen.style.display="none";

    homeScreen.style.display="none";

    loginScreen.style.display="flex";


});





/* ==========================
   CAMERA START
========================== */


function startCamera(){


    navigator
    .mediaDevices
    .getUserMedia({

        video:{

            facingMode:{
                ideal:currentCameraMode
            }

        },

        audio:false

    })


    .then(function(stream){


        cameraStream = stream;


        camera.srcObject = stream;



    })


    .catch(function(error){


        console.error(error);


        alert(
            "Camera permission denied"
        );


    });


}





/* ==========================
   CAMERA STOP
========================== */


function stopCamera(){


    if(cameraStream){


        let tracks =
        cameraStream.getTracks();



        tracks.forEach(function(track){


            track.stop();


        });



        cameraStream=null;


    }


}





/* ==========================
   CAPTURE BUTTON
========================== */


document
.getElementById("captureBtn")
.addEventListener("click",function(){


    capturePhoto();


});



function capturePhoto(){


    if(!camera.videoWidth){


        alert("Camera not ready");

        return;

    }



    canvas.width =
    camera.videoWidth;



    canvas.height =
    camera.videoHeight;



    let ctx =
    canvas.getContext("2d");



    ctx.drawImage(

        camera,

        0,

        0,

        canvas.width,

        canvas.height

    );



    let imageData =
    canvas.toDataURL(
        "image/jpeg",
        0.95
    );



    capturedImages.push(imageData);



    updateThumbnails();



    updateCounter();



}
/* ==========================================
   DOCPRO SCANNER V2
   APP.JS PART 2/3
========================================== */


/* ==========================
   UPDATE THUMBNAILS
========================== */


function updateThumbnails(){


    thumbnailContainer.innerHTML="";


    capturedImages.forEach(function(image,index){


        let item =
        document.createElement("div");


        item.className =
        "thumbnail-item";


        item.innerHTML = `

            <img src="${image}">

            <span class="thumbnail-number">

                ${index + 1}

            </span>

        `;



        item.addEventListener(
            "click",
            function(){

                openPreview(index);

            }
        );



        thumbnailContainer.appendChild(item);



    });


}





/* ==========================
   PAGE COUNTER
========================== */


function updateCounter(){


    let total =
    capturedImages.length;



    pageCount.innerText =
    total;



    thumbCounter.innerText =
    total;



}





/* ==========================
   OPEN PREVIEW
========================== */


function openPreview(index){


    currentPreviewIndex = index;



    let previewImage =
    document.getElementById(
        "previewImage"
    );



    previewImage.src =
    capturedImages[index];



    let modal =
    new bootstrap.Modal(
        document.getElementById(
            "previewModal"
        )
    );



    modal.show();



}





/* ==========================
   ROTATE IMAGE
========================== */


document
.getElementById("rotateBtn")
.addEventListener(
"click",
function(){


    if(currentPreviewIndex === null){

        return;

    }



    let img =
    new Image();



    img.src =
    capturedImages[currentPreviewIndex];



    img.onload=function(){


        let tempCanvas =
        document.createElement(
            "canvas"
        );



        tempCanvas.width =
        img.height;



        tempCanvas.height =
        img.width;



        let ctx =
        tempCanvas.getContext(
            "2d"
        );



        ctx.translate(
            tempCanvas.width / 2,
            tempCanvas.height / 2
        );


        ctx.rotate(
            90 * Math.PI / 180
        );



        ctx.drawImage(

            img,

            -img.width / 2,

            -img.height / 2

        );



        capturedImages[currentPreviewIndex] =
        tempCanvas.toDataURL(
            "image/jpeg",
            0.95
        );



        document
        .getElementById(
            "previewImage"
        )
        .src =
        capturedImages[currentPreviewIndex];



        updateThumbnails();



    };


});





/* ==========================
   DELETE IMAGE
========================== */


document
.getElementById("deleteBtn")
.addEventListener(
"click",
function(){


    if(currentPreviewIndex === null){

        return;

    }



    let confirmDelete =
    confirm(
        "Delete this page?"
    );



    if(confirmDelete){


        capturedImages.splice(
            currentPreviewIndex,
            1
        );



        updateThumbnails();

        updateCounter();



        bootstrap
        .Modal
        .getInstance(
            document.getElementById(
                "previewModal"
            )
        )
        .hide();



        currentPreviewIndex=null;



    }


});





/* ==========================
   REPLACE IMAGE
========================== */


document
.getElementById("replaceBtn")
.addEventListener(
"click",
function(){


    if(currentPreviewIndex === null){

        return;

    }



    capturePhoto();



    capturedImages.splice(

        currentPreviewIndex,

        1,

        capturedImages[
            capturedImages.length - 1
        ]

    );



    capturedImages.pop();



    updateThumbnails();



    document
    .getElementById(
        "previewImage"
    )
    .src =
    capturedImages[currentPreviewIndex];



});
/* ==========================================
   DOCPRO SCANNER V2
   APP.JS PART 3/3
========================================== */


/* ==========================
   ADD SCAN BUTTON
========================== */

document
.getElementById("addPageBtn")
.addEventListener(
"click",
function(){

    // Camera stays open
    // User can capture another page

    alert("Ready for next page");

});



/* ==========================
   CONTINUE TO REVIEW
========================== */


document
.getElementById("continueBtn")
.addEventListener(
"click",
function(){


    if(capturedImages.length === 0){

        alert(
            "Please capture at least one page"
        );

        return;

    }



    stopCamera();


    scannerScreen.style.display="none";

    reviewScreen.style.display="block";


    generateReview();



});





/* ==========================
   GENERATE REVIEW PAGE
========================== */


function generateReview(){


    let container =
    document.getElementById(
        "reviewContainer"
    );



    container.innerHTML="";



    capturedImages.forEach(
    function(image,index){



        let col =
        document.createElement(
            "div"
        );



        col.className =
        "col-lg-4 col-md-6";



        col.innerHTML = `

        <div class="review-card">


            <h5 class="mb-3">

                Page ${index + 1}

            </h5>


            <img src="${image}">


            <div class="text-center mt-3">


                <button
                class="btn btn-primary"
                onclick="openPreview(${index})">

                    View

                </button>


            </div>


        </div>

        `;



        container.appendChild(col);



    });


}





/* ==========================
   BACK TO SCANNER
========================== */


document
.getElementById("backToScannerBtn")
.addEventListener(
"click",
function(){


    reviewScreen.style.display="none";


    scannerScreen.style.display="block";


    startCamera();


});





/* ==========================
   CREATE PDF
========================== */


document
.getElementById("createPdfBtn")
.addEventListener(
"click",
async function(){



    if(capturedImages.length===0){

        return;

    }



    showLoading();



    const pdfDoc =
    await PDFLib.PDFDocument.create();




    for(
        let imageData of capturedImages
    ){



        let jpgImage =
        await pdfDoc.embedJpg(
            imageData
        );



        let page =
        pdfDoc.addPage();



        let size =
        jpgImage.scaleToFit(
            page.getWidth(),
            page.getHeight()
        );



        page.drawImage(
            jpgImage,
            {

                x:
                (page.getWidth()-size.width)/2,


                y:
                (page.getHeight()-size.height)/2,


                width:
                size.width,


                height:
                size.height

            }
        );


    }




    let pdfBytes =
    await pdfDoc.save();




    downloadPDF(
        pdfBytes
    );



    hideLoading();



});





/* ==========================
   PDF DOWNLOAD
========================== */


function downloadPDF(bytes){


    let blob =
    new Blob(
        [bytes],
        {
            type:
            "application/pdf"
        }
    );



    let url =
    URL.createObjectURL(
        blob
    );



    let link =
    document.createElement(
        "a"
    );


    link.href=url;


    link.download =
    "DocPro-Document.pdf";



    link.click();



    URL
    .revokeObjectURL(
        url
    );



}





/* ==========================
   LOADING
========================== */


function showLoading(){


    document
    .getElementById(
        "loadingOverlay"
    )
    .style.display="flex";



}



function hideLoading(){


    document
    .getElementById(
        "loadingOverlay"
    )
    .style.display="none";



}
