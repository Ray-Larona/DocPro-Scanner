/* =========================================
   DocPro Scanner V2
   Stable Capture + Google Drive Upload
========================================= */

console.log("DOCPro APP JS LOADED");

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwOM-UTfKDI8VY8Cd2sIudzC-PwtB-ccDnZe9oYRVtLy0tDbLTP9yQRbmmdk9aSNL01/exec";

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

function isDriveConfigured() {
    const url = String(GOOGLE_SCRIPT_URL || "").trim();
    return /^https:\/\/script\.google\.com\/macros\/s\/[^\s]+\/exec$/.test(url);
}

/* ==========================
   LOGIN SYSTEM
========================== */

document.getElementById("loginBtn").addEventListener("click", function () {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    const users = [
        { username: "Ray", password: "123456" },
        { username: "Dawn", password: "54321" },
        { username: "User", password: "12345" }
    ];

    const validUser = users.find(user =>
        user.username === username && user.password === password
    );

    if (!validUser) {
        alert("Invalid username or password");
        return;
    }

    loginScreen.classList.add("d-none");
    loginScreen.classList.remove("d-flex");
    homeScreen.style.display = "block";
    sessionStorage.setItem("docproLoggedIn", "true");
});

if (sessionStorage.getItem("docproLoggedIn") === "true") {
    loginScreen.classList.add("d-none");
    loginScreen.classList.remove("d-flex");
    homeScreen.style.display = "block";
}

/* ==========================
   DASHBOARD NAVIGATION
========================== */

document.getElementById("scanCard").addEventListener("click", function () {
    homeScreen.style.display = "none";
    scannerScreen.style.display = "block";
    startCamera();
    history.pushState({ screen: "scanner" }, "", location.href);
});

document.getElementById("logoutCard").addEventListener("click", function () {
    stopCamera();
    sessionStorage.removeItem("docproLoggedIn");
    scannerScreen.style.display = "none";
    reviewScreen.style.display = "none";
    homeScreen.style.display = "none";
    loginScreen.classList.remove("d-none");
    loginScreen.classList.add("d-flex");
});

document.getElementById("closeCameraBtn").addEventListener("click", function () {
    stopCamera();
    scannerScreen.style.display = "none";
    reviewScreen.style.display = "none";
    homeScreen.style.display = "block";
});

/* ==========================
   CAMERA
========================== */

async function startCamera() {
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Camera is not supported in this browser. Please use HTTPS in Chrome or Safari.");
        return;
    }

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: currentCameraMode },
                width: { ideal: 1920, max: 3840 },
                height: { ideal: 1080, max: 2160 },
                frameRate: { ideal: 30, max: 30 }
            },
            audio: false
        });

        camera.srcObject = cameraStream;
        await camera.play();
    } catch (error) {
        console.error("Camera start error:", error);
        alert("Unable to start camera. Please allow camera permission and try again.");
    }
}

function stopCamera() {
    if (!cameraStream) return;

    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    camera.srcObject = null;
}

/* ==========================
   CAPTURE BUTTON
========================== */

document.getElementById("captureBtn").addEventListener("click", capturePhoto);

async function capturePhoto() {
    const captureBtn = document.getElementById("captureBtn");

    if (!cameraStream || !camera.videoWidth || !camera.videoHeight) {
        alert("Camera is not ready yet. Please wait a moment and try again.");
        return;
    }

    captureBtn.disabled = true;

    try {
        const frame = document.querySelector(".scan-frame");
        const videoRect = camera.getBoundingClientRect();
        const frameRect = frame.getBoundingClientRect();

        if (!videoRect.width || !videoRect.height || !frameRect.width || !frameRect.height) {
            throw new Error("Camera or scan frame dimensions are not available.");
        }

        /*
         * The video uses object-fit: cover. Convert the visible scan-frame
         * rectangle back into source-video coordinates.
         */
        const sourceWidth = camera.videoWidth;
        const sourceHeight = camera.videoHeight;
        const displayWidth = videoRect.width;
        const displayHeight = videoRect.height;

        const scale = Math.max(
            displayWidth / sourceWidth,
            displayHeight / sourceHeight
        );

        const renderedWidth = sourceWidth * scale;
        const renderedHeight = sourceHeight * scale;
        const offsetX = (displayWidth - renderedWidth) / 2;
        const offsetY = (displayHeight - renderedHeight) / 2;

        const frameLeft = frameRect.left - videoRect.left;
        const frameTop = frameRect.top - videoRect.top;

        let sx = (frameLeft - offsetX) / scale;
        let sy = (frameTop - offsetY) / scale;
        let sw = frameRect.width / scale;
        let sh = frameRect.height / scale;

        sx = Math.max(0, Math.min(sx, sourceWidth - 1));
        sy = Math.max(0, Math.min(sy, sourceHeight - 1));
        sw = Math.min(sw, sourceWidth - sx);
        sh = Math.min(sh, sourceHeight - sy);

        if (sw < 10 || sh < 10) {
            throw new Error("Scan frame crop is too small.");
        }

        canvas.width = Math.round(sw);
        canvas.height = Math.round(sh);

        const ctx = canvas.getContext("2d", { alpha: false });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        ctx.drawImage(
            camera,
            sx, sy, sw, sh,
            0, 0, canvas.width, canvas.height
        );

        pendingImage = canvas.toDataURL("image/jpeg", 0.95);
        currentPreviewIndex = null;

        document.getElementById("previewImage").src = pendingImage;
        document.getElementById("saveBtn").style.display = "inline-block";
        document.getElementById("deleteBtn").style.display = "inline-block";

        const modalElement = document.getElementById("previewModal");
        const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
        modal.show();
    } catch (error) {
        console.error("Capture error:", error);
        alert("Unable to capture the scan frame. Please keep the document inside the frame and try again.");
    } finally {
        captureBtn.disabled = false;
    }
}

/* ==========================
   THUMBNAILS / COUNTER
========================== */

function updateThumbnails() {
    thumbnailContainer.innerHTML = "";

    capturedImages.forEach(function (image, index) {
        const item = document.createElement("div");
        item.className = "thumbnail-item";
        item.innerHTML = `
            <img src="${image}" alt="Page ${index + 1}">
            <span class="thumbnail-number">${index + 1}</span>
        `;
        item.addEventListener("click", function () {
            openPreview(index);
        });
        thumbnailContainer.appendChild(item);
    });
}

function updateCounter() {
    pageCount.innerText = capturedImages.length;
    thumbCounter.innerText = capturedImages.length;
}

/* ==========================
   PREVIEW
========================== */

function openPreview(index) {
    currentPreviewIndex = index;
    pendingImage = null;
    document.getElementById("previewImage").src = capturedImages[index];
    document.getElementById("saveBtn").style.display = "none";
    document.getElementById("deleteBtn").style.display = "inline-block";

    const modalElement = document.getElementById("previewModal");
    bootstrap.Modal.getOrCreateInstance(modalElement).show();
}

/* ==========================
   ROTATE IMAGE
========================== */

document.getElementById("rotateBtn").addEventListener("click", function () {
    let source = null;
    let targetIndex = null;

    if (pendingImage !== null) {
        source = pendingImage;
        targetIndex = null;
    } else if (currentPreviewIndex !== null) {
        source = capturedImages[currentPreviewIndex];
        targetIndex = currentPreviewIndex;
    } else {
        return;
    }

    const img = new Image();
    img.onload = function () {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = img.height;
        tempCanvas.height = img.width;

        const ctx = tempCanvas.getContext("2d");
        ctx.translate(tempCanvas.width / 2, tempCanvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        const rotated = tempCanvas.toDataURL("image/jpeg", 0.95);

        if (targetIndex === null) {
            pendingImage = rotated;
        } else {
            capturedImages[targetIndex] = rotated;
            updateThumbnails();
        }

        document.getElementById("previewImage").src = rotated;
    };
    img.src = source;
});

/* ==========================
   DELETE
========================== */

document.getElementById("deleteBtn").addEventListener("click", function () {
    if (pendingImage !== null) {
        pendingImage = null;
        bootstrap.Modal.getInstance(document.getElementById("previewModal"))?.hide();
        return;
    }

    if (currentPreviewIndex === null) return;

    if (!confirm("Delete this page?")) return;

    capturedImages.splice(currentPreviewIndex, 1);
    updateThumbnails();
    updateCounter();

    bootstrap.Modal.getInstance(document.getElementById("previewModal"))?.hide();
    currentPreviewIndex = null;
});

/* ==========================
   SAVE NEW IMAGE
========================== */

document.getElementById("saveBtn").addEventListener("click", function () {
    if (pendingImage === null) return;

    capturedImages.push(pendingImage);
    pendingImage = null;
    currentPreviewIndex = null;

    updateThumbnails();
    updateCounter();

    bootstrap.Modal.getInstance(document.getElementById("previewModal"))?.hide();
});

/* ==========================
   CONTINUE TO REVIEW
========================== */

document.getElementById("continueBtn").addEventListener("click", function () {
    if (capturedImages.length === 0) {
        alert("Please capture at least one page");
        return;
    }

    stopCamera();
    scannerScreen.style.display = "none";
    reviewScreen.style.display = "block";
    generateReview();
    history.pushState({ screen: "review" }, "", location.href);
});

function generateReview() {
    const container = document.getElementById("reviewContainer");
    container.innerHTML = "";

    capturedImages.forEach(function (image, index) {
        const col = document.createElement("div");
        col.className = "col-lg-4 col-md-6";
        col.innerHTML = `
            <div class="review-card">
                <h5 class="mb-3">Page ${index + 1}</h5>
                <img src="${image}" alt="Page ${index + 1}">
                <div class="text-center mt-3">
                    <button class="btn btn-primary" onclick="openPreview(${index})">
                        View
                    </button>
                </div>
            </div>
        `;
        container.appendChild(col);
    });
}

document.getElementById("backToScannerBtn").addEventListener("click", function () {
    reviewScreen.style.display = "none";
    scannerScreen.style.display = "block";
    startCamera();
});

/* ==========================
   CREATE PDF + UPLOAD
========================== */

document.getElementById("uploadDriveBtn").addEventListener("click", uploadToGoogleDrive);

async function buildPdfBytes() {
    const pdfDoc = await PDFLib.PDFDocument.create();

    for (const imageData of capturedImages) {
        const jpgImage = await pdfDoc.embedJpg(imageData);
        const originalWidth = jpgImage.width;
        const originalHeight = jpgImage.height;
        const pageWidth = 595.28;
        const pageHeight = 841.89;
        const scale = Math.min(pageWidth / originalWidth, pageHeight / originalHeight);
        const drawWidth = originalWidth * scale;
        const drawHeight = originalHeight * scale;
        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        page.drawImage(jpgImage, {
            x: (pageWidth - drawWidth) / 2,
            y: (pageHeight - drawHeight) / 2,
            width: drawWidth,
            height: drawHeight
        });
    }

    return await pdfDoc.save();
}

async function uploadToGoogleDrive() {
    if (!isDriveConfigured()) {
        alert("Google Drive Web App URL is missing or invalid. Check GOOGLE_SCRIPT_URL in app.js.");
        return;
    }

    if (capturedImages.length === 0) {
        alert("Please capture at least one page.");
        return;
    }

    const button = document.getElementById("uploadDriveBtn");
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Uploading...';
    showLoading("Uploading to Google Drive...");

    try {
        const pdfBytes = await buildPdfBytes();
        const binary = String.fromCharCode(...pdfBytes);
        const base64 = btoa(binary);

        const fileName = "DocPro-" +
            new Date().toISOString().replace(/[:.]/g, "-") +
            ".pdf";

        const payload = JSON.stringify({
            action: "uploadPdf",
            fileName,
            mimeType: "application/pdf",
            base64: base64
        });

        /* no-cors + plain POST avoids browser preflight on GitHub Pages. */
        await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            body: payload
        });

        hideLoading();
        button.disabled = false;
        button.innerHTML = '<i class="bi bi-cloud-arrow-up-fill"></i> Upload to Google Drive';

        const successModal = bootstrap.Modal.getOrCreateInstance(document.getElementById("successModal"));
        document.getElementById("successTitle").textContent = "Upload Submitted";
        document.getElementById("successMessage").textContent = "Your PDF was sent to Google Drive.";
        successModal.show();
    } catch (error) {
        console.error("Google Drive upload error:", error);
        hideLoading();
        button.disabled = false;
        button.innerHTML = '<i class="bi bi-cloud-arrow-up-fill"></i> Upload to Google Drive';
        alert("Upload failed. Please check your Google Apps Script Web App URL and deployment settings.");
    }
}

/* ==========================
   LOADING
========================== */

function showLoading(message = "Preparing document...") {
    document.getElementById("loadingMessage").textContent = message;
    document.getElementById("loadingOverlay").style.display = "flex";
}

function hideLoading() {
    document.getElementById("loadingOverlay").style.display = "none";
}

/* ==========================
   NAVIGATION / BROWSER BACK
========================== */

history.replaceState({ screen: "dashboard" }, "", location.href);

window.addEventListener("popstate", function (event) {
    const screen = event.state?.screen;

    if (screen === "scanner") {
        reviewScreen.style.display = "none";
        scannerScreen.style.display = "block";
        startCamera();
        return;
    }

    if (screen === "dashboard") {
        stopCamera();
        scannerScreen.style.display = "none";
        reviewScreen.style.display = "none";
        homeScreen.style.display = "block";
    }
});
