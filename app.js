/* ==========================
   GLOBAL VARIABLES
========================== */
console.log("APP JS LOADED");

let cameraStream = null;
let capturedImages = [];
let currentPreviewIndex = null;
let currentCameraMode = "environment";
let tempCapturedImage = null; // Para sa pansamantalang kuha ng camera

const loginScreen = document.getElementById("loginScreen");
const homeScreen = document.getElementById("homeScreen");
const scannerScreen = document.getElementById("scannerScreen");
const reviewScreen = document.getElementById("reviewScreen");

const camera = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const thumbnailContainer = document.getElementById("thumbnailContainer");
const pageCount = document.getElementById("pageCount");
const thumbCounter = document.getElementById("thumbCounter");

// Initialize Bootstrap Modal once to prevent memory leaks and backdrop glitches
const previewModalElement = document.getElementById("previewModal");
const previewModal = previewModalElement ? bootstrap.Modal.getOrCreateInstance(previewModalElement) : null;

/* ==========================
   LOGIN SYSTEM
========================== */
document.getElementById("loginBtn").addEventListener("click", function(event) {
    event.preventDefault(); // Pigilan ang form reload glitch
    console.log("LOGIN CLICKED");

    let username = document.getElementById("username").value.trim();
    let password = document.getElementById("password").value.trim();

    // PRO-TIP: Good for prototypes, but secure this via backend for production!
    const users = [
        { username: "Ray", password: "1926" },
        { username: "Dawn", password: "54321" },
        { username: "User", password: "12345" }
    ];

    let validUser = users.find(function(user) {
        return user.username === username && user.password === password;
    });

    if (!validUser) {
        alert("Invalid username or password");
        return;
    }

    // Ayos sa Layout: Itago ang login gamit ang Bootstrap class utility
    loginScreen.classList.add("d-none");
    loginScreen.classList.remove("d-flex");
    homeScreen.style.display = "block";

    // Back Button Protect: Gagawa ng history state para sa dashboard
    history.pushState({ page: 'dashboard' }, 'Dashboard', '#dashboard');
});

/* ==========================
   DASHBOARD NAVIGATION
========================== */
document.getElementById("scanCard").addEventListener("click", function() {
    homeScreen.style.display = "none";
    scannerScreen.style.display = "block";
    startCamera();
});

document.getElementById("logoutCard").addEventListener("click", function() {
    stopCamera();
    scannerScreen.style.display = "none";
    homeScreen.style.display = "none";
    
    // Ibalik ang login screen layout
    loginScreen.classList.remove("d-none");
    loginScreen.classList.add("d-flex");

    // I-reset ang history state ng browser
    history.replaceState({ page: 'login' }, 'Login', ' ');
});

/* ==========================
   CAMERA FUNCTIONS
========================== */
function startCamera() {
    navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: currentCameraMode } },
        audio: false
    })
    .then(function(stream) {
        cameraStream = stream;
        camera.srcObject = stream;
    })
    .catch(function(error) {
        console.error(error);
        alert("Camera permission denied");
    });
}

function stopCamera() {
    if (cameraStream) {
        let tracks = cameraStream.getTracks();
        tracks.forEach(function(track) {
            track.stop();
        });
        cameraStream = null;
    }
}

/* ==========================
   CAPTURE & CONFIRMATION FLOW
========================== */
document.getElementById("captureBtn").addEventListener("click", function() {
    capturePhoto();
});

function capturePhoto() {
    if (!camera.videoWidth) {
        alert("Camera not ready");
        return;
    }

    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;

    let ctx = canvas.getContext("2d");
    ctx.drawImage(camera, 0, 0, canvas.width, canvas.height);

    // Itabi muna ang image sa temporary variable
    tempCapturedImage = canvas.toDataURL("image/jpeg", 0.95);

    // Ipakita ang litrato sa modal
    document.getElementById("previewImage").src = tempCapturedImage;

    // I-set ang modal para sa CONFIRMATION MODE
    currentPreviewIndex = null;
    document.getElementById("rotateBtn").style.display = "none";
    document.getElementById("replaceBtn").style.display = "none";
    document.getElementById("deleteBtn").style.display = "none";
    document.getElementById("saveNewScanBtn").style.display = "inline-block";

    // Buksan ang modal safely
    if (previewModal) previewModal.show();
}

/* ==========================
   SAVE NEW SCAN ACTION
========================== */
document.getElementById("saveNewScanBtn").addEventListener("click", function() {
    if (tempCapturedImage) {
        // I-save na sa listahan at i-update ang UI
        capturedImages.push(tempCapturedImage);
        updateThumbnails();
        updateCounter();
        
        tempCapturedImage = null; // Linisin ang variable

        // I-sara ang modal safely
        if (previewModal) previewModal.hide();
    }
});

/* ==========================
   THUMBNAILS & COUNTER
========================== */
function updateThumbnails() {
    thumbnailContainer.innerHTML = "";
    capturedImages.forEach(function(image, index) {
        let item = document.createElement("div");
        item.className = "thumbnail-item";
        item.innerHTML = `
            <img src="${image}">
            <span class="thumbnail-number">${index + 1}</span>
        `;
        item.addEventListener("click", function() {
            openPreview(index);
        });
        thumbnailContainer.appendChild(item);
    });
}

/* ==========================
   OPEN PREVIEW (EDIT MODE)
========================== */
function openPreview(index) {
    currentPreviewIndex = index;

    let previewImage = document.getElementById("previewImage");
    previewImage.src = capturedImages[index];

    // I-set ang modal para sa EDIT MODE
    document.getElementById("rotateBtn").style.display = "inline-block";
    document.getElementById("replaceBtn").style.display = "inline-block";
    document.getElementById("deleteBtn").style.display = "inline-block";
    document.getElementById("saveNewScanBtn").style.display = "none";

    if (previewModal) previewModal.show();
}

function updateCounter() {
    let total = capturedImages.length;
    pageCount.innerText = total;
    thumbCounter.innerText = total;
}

/* ==========================
   EDIT ACTIONS (ROTATE, DELETE, REPLACE)
========================== */
document.getElementById("rotateBtn").addEventListener("click", function() {
    if (currentPreviewIndex === null) return;

    let img = new Image();
    img.src = capturedImages[currentPreviewIndex];
    img.onload = function() {
        let tempCanvas = document.createElement("canvas");
        tempCanvas.width = img.height;
        tempCanvas.height = img.width;

        let ctx = tempCanvas.getContext("2d");
        ctx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        ctx.rotate(90 * Math.PI / 180);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        capturedImages[currentPreviewIndex] = tempCanvas.toDataURL("image/jpeg", 0.95);
        document.getElementById("previewImage").src = capturedImages[currentPreviewIndex];
        updateThumbnails();
    };
});

document.getElementById("deleteBtn").addEventListener("click", function() {
    if (currentPreviewIndex === null) return;

    let confirmDelete = confirm("Delete this page?");
    if (confirmDelete) {
        capturedImages.splice(currentPreviewIndex, 1);
        updateThumbnails();
        updateCounter();

        if (previewModal) previewModal.hide();

        currentPreviewIndex = null;
    }
});

// FIXED: Instantly snapshots live feed to replace the selected page
document.getElementById("replaceBtn").addEventListener("click", function() {
    if (currentPreviewIndex === null) return;

    if (!camera.videoWidth) {
        alert("Camera not ready to replace");
        return;
    }

    // Capture instantly from the background live stream
    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;
    let ctx = canvas.getContext("2d");
    ctx.drawImage(camera, 0, 0, canvas.width, canvas.height);

    let replacedImage = canvas.toDataURL("image/jpeg", 0.95);
    
    // Update data array and UI elements instantly without timers
    capturedImages[currentPreviewIndex] = replacedImage;
    document.getElementById("previewImage").src = replacedImage;
    updateThumbnails();
});

/* ==========================
   ADD SCAN BUTTON & REVIEW
========================== */
document.getElementById("addPageBtn").addEventListener("click", function() {
    alert("Ready for next page");
});

document.getElementById("continueBtn").addEventListener("click", function() {
    if (capturedImages.length === 0) {
        alert("Please capture at least one page");
        return;
    }
    stopCamera();
    scannerScreen.style.display = "none";
    reviewScreen.style.display = "block";
    generateReview();
});

function generateReview() {
    let container = document.getElementById("reviewContainer");
    container.innerHTML = "";

    capturedImages.forEach(function(image, index) {
        let col = document.createElement("div");
        col.className = "col-lg-4 col-md-6";
        col.innerHTML = `
            <div class="review-card">
                <h5 class="mb-3">Page ${index + 1}</h5>
                <img src="${image}">
                <div class="text-center mt-3">
                    <button class="btn btn-primary" onclick="openPreview(${index})">View</button>
                </div>
            </div>
        `;
        container.appendChild(col);
    });
}

document.getElementById("backToScannerBtn").addEventListener("click", function() {
    reviewScreen.style.display = "none";
    scannerScreen.style.display = "block";
    startCamera();
});

/* ==========================
   PDF LIB & GENERATION
========================== */
document.getElementById("createPdfBtn").addEventListener("click", async function() {
    if (capturedImages.length === 0) return;

    showLoading();
    const pdfDoc = await PDFLib.PDFDocument.create();

    for (let imageData of capturedImages) {
        let jpgImage = await pdfDoc.embedJpg(imageData);
        let page = pdfDoc.addPage();
        let size = jpgImage.scaleToFit(page.getWidth(), page.getHeight());

        page.drawImage(jpgImage, {
            x: (page.getWidth() - size.width) / 2,
            y: (page.getHeight() - size.height) / 2,
            width: size.width,
            height: size.height
        });
    }

    let pdfBytes = await pdfDoc.save();
    downloadPDF(pdfBytes);
    hideLoading();
});

function downloadPDF(bytes) {
    let blob = new Blob([bytes], { type: "application/pdf" });
    let url = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.href = url;
    link.download = "DocPro-Document.pdf";
    link.click();
    URL.revokeObjectURL(url);
}

function showLoading() {
    document.getElementById("loadingOverlay").style.display = "flex";
}

function hideLoading() {
    document.getElementById("loadingOverlay").style.display = "none";
}

/* ==========================
   PHYSICAL BACK BUTTON PROTECTION (MOBILE PHONE)
========================== */
window.addEventListener('popstate', function(event) {
    const isUserLoggedIn = loginScreen.classList.contains("d-none");

    if (isUserLoggedIn) {
        history.pushState({ page: 'dashboard' }, 'Dashboard', '#dashboard');
        
        if (scannerScreen.style.display === "block") {
            stopCamera();
            scannerScreen.style.display = "none";
            homeScreen.style.display = "block";
        } else if (reviewScreen.style.display === "block") {
            reviewScreen.style.display = "none";
            homeScreen.style.display = "block";
        }
    }
});
