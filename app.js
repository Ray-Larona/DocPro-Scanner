/* ==========================
   GLOBAL VARIABLES
========================== */

console.log("APP JS LOADED");

let cameraStream = null;

let capturedImages = [];

let currentPreviewIndex = null;

let pendingImage = null;

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

    console.log("LOGIN CLICKED");


    let username =
    document.getElementById("username").value.trim();


   let password =
   document.getElementById("password").value.trim();


   console.log("USERNAME:", username);
   console.log("PASSWORD:", password);

    const users = [

        {
            username:"Ray",
            password:"123456"
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

   console.log("VALID USER:", validUser);

    if(!validUser){

        alert("Invalid username or password");

        return;

    }


// Gumamit ng Bootstrap class para siguradong tanggal ang display flex
loginScreen.classList.add("d-none"); 
loginScreen.classList.remove("d-flex"); 

// Ipakita ang home dashboard
homeScreen.style.display = "block";

// Remember that the user is logged in
sessionStorage.setItem("docproLoggedIn", "true");


});

/* ==========================
   RESTORE LOGIN AFTER REFRESH
========================== */

if(
    sessionStorage.getItem("docproLoggedIn") === "true"
){

    loginScreen.classList.add("d-none");
    loginScreen.classList.remove("d-flex");

    homeScreen.style.display = "block";

}

/* ==========================
   DASHBOARD NAVIGATION
========================== */



document
.getElementById("scanCard")
.addEventListener(
"click",
function(){

    homeScreen.style.display = "none";

    scannerScreen.style.display = "block";

    startCamera();

    history.pushState(
        { screen: "scanner" },
        "",
        location.href
    );

});

document
.getElementById("logoutCard")
.addEventListener("click",function(){


    stopCamera();

   sessionStorage.removeItem("docproLoggedIn");
   
   scannerScreen.style.display = "none";
   homeScreen.style.display = "none";

// Ibalik ang flexbox utility ng login screen
loginScreen.classList.remove("d-none");
loginScreen.classList.add("d-flex");


});

/* ==========================
CLOSE CAMERA
========================== */

document
.getElementById("closeCameraBtn")
.addEventListener("click", function(){

    stopCamera();

    scannerScreen.style.display = "none";

    reviewScreen.style.display = "none";

    homeScreen.style.display = "block";

});

/* ==========================
CAMERA START - HIGH RESOLUTION
========================== */

function startCamera(){

    navigator.mediaDevices.getUserMedia({

        video:{

            facingMode:{
                ideal: currentCameraMode
            },

            width:{
                ideal: 3840
            },

            height:{
                ideal: 2160
            },

            frameRate:{
                ideal: 30,
                max: 30
            }
        },

        audio:false

    })

    .then(async function(stream){

        cameraStream = stream;

        camera.srcObject = stream;

        camera.setAttribute("playsinline", "");
        camera.setAttribute("autoplay", "");

        await camera.play();

        console.log(
            "Camera video resolution:",
            camera.videoWidth,
            "x",
            camera.videoHeight
        );


        /* ==========================
           TRY TO ENABLE CONTINUOUS FOCUS
        ========================== */

        const track = stream.getVideoTracks()[0];

        try{

            const capabilities =
                track.getCapabilities();

            const advanced = {};

            if(
                capabilities.focusMode &&
                capabilities.focusMode.includes("continuous")
            ){

                advanced.focusMode = "continuous";

            }

            if(
                capabilities.zoom
            ){

                console.log(
                    "Zoom supported:",
                    capabilities.zoom
                );

            }

            if(
                Object.keys(advanced).length > 0
            ){

                await track.applyConstraints({
                    advanced:[advanced]
                });

            }

        }
        catch(error){

            console.log(
                "Camera enhancement not supported:",
                error
            );

        }

    })

    .catch(function(error){

        console.error(
            "Camera error:",
            error
        );

        alert(
            "Camera permission denied or camera is unavailable."
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


/* ==========================
HIGH RESOLUTION CAPTURE
========================== */

async function capturePhoto(){

    if(!cameraStream){

        alert("Camera not ready");

        return;

    }


    const track =
        cameraStream.getVideoTracks()[0];


    if(!track){

        alert("Camera track not available");

        return;

    }


    /* ==========================
       TRY NATIVE HIGH-RES PHOTO
    ========================== */

    if(
        typeof ImageCapture !== "undefined"
    ){

        try{

            const imageCapture =
                new ImageCapture(track);


            console.log(
                "Taking high-resolution photo..."
            );


            const blob =
                await imageCapture.takePhoto();


            const reader =
                new FileReader();


            reader.onload = function(){

                pendingImage =
                    reader.result;


                currentPreviewIndex =
                    null;


                document
                .getElementById("previewImage")
                .src =
                    pendingImage;


                document
                .getElementById("saveBtn")
                .style.display =
                    "inline-block";


                document
                .getElementById("deleteBtn")
                .style.display =
                    "inline-block";


                const modal =
                    new bootstrap.Modal(
                        document.getElementById(
                            "previewModal"
                        )
                    );


                modal.show();

            };


            reader.readAsDataURL(blob);


            console.log(
                "High-resolution photo captured:",
                blob.size,
                "bytes"
            );


            return;

        }
        catch(error){

            console.warn(
                "Native high-resolution capture failed. Using fallback.",
                error
            );

        }

    }


    /* ==========================
       FALLBACK CAPTURE
       FOR SAFARI / UNSUPPORTED
       BROWSERS
    ========================== */

    if(!camera.videoWidth){

        alert("Camera not ready");

        return;

    }


    canvas.width =
        camera.videoWidth;


    canvas.height =
        camera.videoHeight;


    const ctx =
        canvas.getContext(
            "2d",
            {
                alpha:false
            }
        );


    ctx.imageSmoothingEnabled =
        true;


    ctx.imageSmoothingQuality =
        "high";


    ctx.drawImage(

        camera,

        0,

        0,

        canvas.width,

        canvas.height

    );


    pendingImage =
        canvas.toDataURL(
            "image/jpeg",
            0.98
        );


    currentPreviewIndex =
        null;


    document
    .getElementById("previewImage")
    .src =
        pendingImage;


    document
    .getElementById("saveBtn")
    .style.display =
        "inline-block";


    document
    .getElementById("deleteBtn")
    .style.display =
        "inline-block";


    const modal =
        new bootstrap.Modal(
            document.getElementById(
                "previewModal"
            )
        );


    modal.show();

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

    /* ==========================
       DELETE NEW PHOTO
    ========================== */

    if(pendingImage !== null){

        pendingImage = null;

        const modalElement =
            document.getElementById(
                "previewModal"
            );

        const modal =
            bootstrap.Modal.getInstance(
                modalElement
            );

        if(modal){
            modal.hide();
        }

        document
        .getElementById("saveBtn")
        .style.display = "none";

      
        return;
    }


    /* ==========================
       DELETE SAVED PAGE
    ========================== */

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


        const modalElement =
            document.getElementById(
                "previewModal"
            );

        const modal =
            bootstrap.Modal.getInstance(
                modalElement
            );

        if(modal){
            modal.hide();
        }


        currentPreviewIndex = null;

    }

});


/* ==========================
   SAVE NEW IMAGE
========================== */

document
.getElementById("saveBtn")
.addEventListener(
"click",
function(){

    if(pendingImage === null){

        return;

    }


    /* Save image */

    capturedImages.push(
        pendingImage
    );


    /* Clear temporary image */

    pendingImage = null;


    /* Update pages */

    updateThumbnails();

    updateCounter();


    /* Close preview */

    const modalElement =
        document.getElementById(
            "previewModal"
        );

    const modal =
        bootstrap.Modal.getInstance(
            modalElement
        );

    if(modal){
        modal.hide();
    }


    /* Reset */

    currentPreviewIndex = null;


    /* Button visibility */

    document
    .getElementById("saveBtn")
    .style.display = "none";

   
});

/* ==========================================
   DOCPRO SCANNER V2
   APP.JS PART 3/3
========================================== */



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
  
   history.pushState(
    { screen: "review" },
    "",
    location.href
);



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
/* ==========================
   APP NAVIGATION / ANDROID BACK
========================== */

history.replaceState(
    { screen: "dashboard" },
    "",
    location.href
);


/* ==========================
   SCANNER NAVIGATION
========================== */

document
.getElementById("scanCard")
.addEventListener(
"click",
function(){

    homeScreen.style.display = "none";

    scannerScreen.style.display = "block";

    startCamera();

    history.pushState(
        { screen: "scanner" },
        "",
        location.href
    );

});


/* ==========================
   ANDROID / BROWSER BACK
========================== */

window.addEventListener(
"popstate",
function(event){

    const screen =
        event.state?.screen;


    /* ==========================
       REVIEW → SCANNER
    ========================== */

    if(screen === "scanner"){

        reviewScreen.style.display = "none";

        scannerScreen.style.display = "block";

        startCamera();

        return;

    }


    /* ==========================
       SCANNER → DASHBOARD
    ========================== */

    if(screen === "dashboard"){

        stopCamera();

        scannerScreen.style.display = "none";

        reviewScreen.style.display = "none";

        homeScreen.style.display = "block";

        return;

    }

});
