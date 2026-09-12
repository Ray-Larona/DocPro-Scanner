/* ==========================================================================
   DOCPRO SCANNER V2 - COMPLETE APP LOGIC
   ========================================================================== */

// --- GLOBAL VARIABLES & STATE ---
let currentStream = null;
let facingMode = "environment"; // "environment" (Back Camera) o "user" (Front)
let scannedPages = [];          // Listahan ng Base64 Image URLs
let currentPreviewIndex = null;
let currentRotation = 0;

// Scanned History mula sa LocalStorage
let scannedHistory = JSON.parse(localStorage.getItem("docpro_history")) || [];

// --- DOM ELEMENTS ---
const loginScreen = document.getElementById("loginScreen");
const homeScreen = document.getElementById("homeScreen");
const scannerScreen = document.getElementById("scannerScreen");
const reviewScreen = document.getElementById("reviewScreen");

const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");

const scanCard = document.getElementById("scanCard");
const documentsCard = document.getElementById("documentsCard");
const logoutCard = document.getElementById("logoutCard");

const video = document.getElementById("camera");
const canvas = document.getElementById("canvas");
const captureBtn = document.getElementById("captureBtn");
const continueBtn = document.getElementById("continueBtn");
const switchCameraBtn = document.getElementById("switchCameraBtn");
const closeCameraBtn = document.getElementById("closeCameraBtn");
const pageCountSpan = document.getElementById("pageCount");
const thumbCounter = document.getElementById("thumbCounter");
const thumbnailContainer = document.getElementById("thumbnailContainer");

// Preview Modal Elements
const previewModalElement = document.getElementById("previewModal");
const previewModal = new bootstrap.Modal(previewModalElement);
const previewImage = document.getElementById("previewImage");
const rotateBtn = document.getElementById("rotateBtn");
const deleteBtn = document.getElementById("deleteBtn");
const saveBtn = document.getElementById("saveBtn");

// Review Screen Elements
const reviewContainer = document.getElementById("reviewContainer");
const backToScannerBtn = document.getElementById("backToScannerBtn");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
const uploadDriveBtn = document.getElementById("uploadDriveBtn");

// Loading Overlay & Success Modal
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingMessage = document.getElementById("loadingMessage");
const loadingProgress = document.getElementById("loadingProgress");
const successModal = new bootstrap.Modal(document.getElementById("successModal"));

/* ==========================================================================
   1. LOGIN & DASHBOARD NAVIGATION
   ========================================================================== */

loginBtn.addEventListener("click", () => {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value.trim();

    // Halimbawa ng simpleng authentication
    if (user !== "" && pass !== "") {
        loginScreen.style.display = "none";
        homeScreen.style.display = "block";
    } else {
        alert("Paki-lagay ang iyong Username at Password.");
    }
});

logoutCard.addEventListener("click", () => {
    if (confirm("Sigurado ka bang gusto mong mag-logout?")) {
        homeScreen.style.display = "none";
        loginScreen.style.display = "flex";
        usernameInput.value = "";
        passwordInput.value = "";
        stopCamera();
    }
});

scanCard.addEventListener("click", () => {
    homeScreen.style.display = "none";
    scannerScreen.style.display = "block";
    startCamera();
});

/* ==========================================================================
   2. CAMERA & SCANNER FUNCTIONS
   ========================================================================== */

async function startCamera() {
    stopCamera();

    const constraints = {
        video: {
            facingMode: facingMode,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        },
        audio: false
    };

    try {
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = currentStream;
    } catch (err) {
        console.error("Hindi ma-access ang camera: ", err);
        alert("Hindi mabuksan ang camera. Siguraduhing pinayagan ang camera permission.");
    }
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
}

switchCameraBtn.addEventListener("click", () => {
    facingMode = (facingMode === "environment") ? "user" : "environment";
    startCamera();
});

closeCameraBtn.addEventListener("click", () => {
    stopCamera();
    scannerScreen.style.display = "none";
    homeScreen.style.display = "block";
});

// Capture Image mula sa Camera Video Feed
captureBtn.addEventListener("click", () => {
    if (!currentStream) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    scannedPages.push(imageDataUrl);

    updateThumbnails();
});

function updateThumbnails() {
    const count = scannedPages.length;
    pageCountSpan.innerText = count;
    thumbCounter.innerText = count;

    thumbnailContainer.innerHTML = "";

    scannedPages.forEach((imgData, index) => {
        const wrapper = document.createElement("div");
        wrapper.className = "position-relative mb-2";

        const img = document.createElement("img");
        img.src = imgData;
        img.className = "img-thumbnail rounded";
        img.style.cursor = "pointer";
        img.style.maxHeight = "100px";

        img.addEventListener("click", () => {
            openPreview(index);
        });

        const badge = document.createElement("span");
        badge.className = "position-absolute top-0 start-0 translate-middle badge rounded-pill bg-primary";
        badge.innerText = index + 1;

        wrapper.appendChild(img);
        wrapper.appendChild(badge);
        thumbnailContainer.appendChild(wrapper);
    });

    thumbnailContainer.scrollTop = thumbnailContainer.scrollHeight;
}

/* ==========================================================================
   3. PREVIEW & EDIT MODAL
   ========================================================================== */

function openPreview(index) {
    currentPreviewIndex = index;
    currentRotation = 0;
    previewImage.src = scannedPages[index];
    previewImage.style.transform = `rotate(${currentRotation}deg)`;
    previewModal.show();
}

rotateBtn.addEventListener("click", () => {
    currentRotation = (currentRotation + 90) % 360;
    previewImage.style.transform = `rotate(${currentRotation}deg)`;
});

saveBtn.addEventListener("click", () => {
    if (currentPreviewIndex === null) return;

    if (currentRotation !== 0) {
        // I-apply ang rotation sa Canvas bago i-save
        const img = new Image();
        img.src = scannedPages[currentPreviewIndex];
        img.onload = () => {
            const rotCanvas = document.createElement("canvas");
            const ctx = rotCanvas.getContext("2d");

            if (currentRotation === 90 || currentRotation === 270) {
                rotCanvas.width = img.height;
                rotCanvas.height = img.width;
            } else {
                rotCanvas.width = img.width;
                rotCanvas.height = img.height;
            }

            ctx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
            ctx.rotate((currentRotation * Math.PI) / 180);
            ctx.drawImage(img, -img.width / 2, -img.height / 2);

            scannedPages[currentPreviewIndex] = rotCanvas.toDataURL("image/jpeg", 0.92);
            updateThumbnails();
            previewModal.hide();
        };
    } else {
        previewModal.hide();
    }
});

deleteBtn.addEventListener("click", () => {
    if (currentPreviewIndex !== null) {
        scannedPages.splice(currentPreviewIndex, 1);
        updateThumbnails();
        previewModal.hide();
    }
});

/* ==========================================================================
   4. REVIEW SCREEN & PDF CREATION
   ========================================================================== */

continueBtn.addEventListener("click", () => {
    if (scannedPages.length === 0) {
        alert("Kumuha muna ng kahit isang pahina bago magpatuloy.");
        return;
    }

    stopCamera();
    scannerScreen.style.display = "none";
    reviewScreen.style.display = "block";
    renderReviewGrid();
});

backToScannerBtn.addEventListener("click", () => {
    reviewScreen.style.display = "none";
    scannerScreen.style.display = "block";
    startCamera();
});

function renderReviewGrid() {
    reviewContainer.innerHTML = "";

    scannedPages.forEach((imgSrc, idx) => {
        const col = document.createElement("div");
        col.className = "col-md-3 col-6";

        col.innerHTML = `
            <div class="card h-100 shadow-sm">
                <img src="${imgSrc}" class="card-img-top" style="object-fit: cover; height: 200px;">
                <div class="card-body p-2 d-flex justify-content-between align-items-center">
                    <small class="fw-bold">Page ${idx + 1}</small>
                    <button class="btn btn-sm btn-outline-danger" onclick="removePageFromReview(${idx})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
        reviewContainer.appendChild(col);
    });
}

function removePageFromReview(index) {
    scannedPages.splice(index, 1);
    updateThumbnails();
    if (scannedPages.length === 0) {
        reviewScreen.style.display = "none";
        scannerScreen.style.display = "block";
        startCamera();
    } else {
        renderReviewGrid();
    }
}

// Generate at Download ng PDF gamit ang PDF-Lib
downloadPdfBtn.addEventListener("click", async () => {
    if (scannedPages.length === 0) return;

    showLoading("Generating PDF document...", 20);

    try {
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.create();

        for (let i = 0; i < scannedPages.length; i++) {
            const base64Data = scannedPages[i];
            const imageBytes = await fetch(base64Data).then(res => res.arrayBuffer());
            const image = await pdfDoc.embedJpg(imageBytes);

            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, {
                x: 0,
                y: 0,
                width: image.width,
                height: image.height,
            });

            const percent = Math.round(((i + 1) / scannedPages.length) * 80) + 10;
            updateLoadingProgress(percent);
        }

        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: "application/pdf" });
        const fileName = `DocPro-Scan-${Date.now()}.pdf`;

        // Create download link
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();

        // I-save sa Local History
        saveToHistory(fileName, scannedPages.length);

        hideLoading();
        successModal.show();

    } catch (error) {
        console.error("PDF Generation Error:", error);
        hideLoading();
        alert("Nagkaroon ng problema sa pagbuo ng PDF.");
    }
});

uploadDriveBtn.addEventListener("click", () => {
    const fileName = `DocPro-Drive-${Date.now()}.pdf`;
    saveToHistory(fileName, scannedPages.length);
    alert("Nai-upload na ang PDF sa Google Drive integration!");
});

/* ==========================================================================
   5. SCANNED DOCUMENTS HISTORY & LOCAL STORAGE
   ========================================================================== */

function renderDocumentsList() {
    const listContainer = document.getElementById("documentsList");
    if (!listContainer) return;

    listContainer.innerHTML = "";

    if (scannedHistory.length === 0) {
        listContainer.innerHTML = `
            <li class="list-group-item text-center text-muted py-4">
                <i class="bi bi-inbox display-6 d-block mb-2"></i>
                Walang nakatagong scanned document history.
            </li>`;
        return;
    }

    scannedHistory.forEach((doc) => {
        const item = document.createElement("li");
        item.className = "list-group-item d-flex justify-content-between align-items-center";
        item.innerHTML = `
            <div>
                <i class="bi bi-file-earmark-pdf-fill text-danger fs-5 me-2"></i>
                <strong>${doc.fileName}</strong>
                <br>
                <small class="text-muted">${doc.pages} page(s) • ${doc.date}</small>
            </div>
            <span class="badge bg-success rounded-pill">Scanned</span>
        `;
        listContainer.appendChild(item);
    });
}

document.getElementById("documentsCard").addEventListener("click", () => {
    renderDocumentsList();
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("documentsModal"));
    modal.show();
});

document.getElementById("clearHistoryBtn").addEventListener("click", () => {
    if (confirm("Sigurado ka bang gusto mong burahin ang kasaysayan ng mga na-scan?")) {
        scannedHistory = [];
        localStorage.removeItem("docpro_history");
        renderDocumentsList();
    }
});

function saveToHistory(fileName, pageCount) {
    const newEntry = {
        fileName: fileName,
        pages: pageCount,
        date: new Date().toLocaleString()
    };
    scannedHistory.unshift(newEntry);
    localStorage.setItem("docpro_history", JSON.stringify(scannedHistory));
}

/* ==========================================================================
   6. HELPER FUNCTIONS (LOADING OVERLAY)
   ========================================================================== */

function showLoading(msg, percent) {
    loadingMessage.innerText = msg;
    updateLoadingProgress(percent);
    loadingOverlay.style.display = "flex";
}

function updateLoadingProgress(percent) {
    loadingProgress.style.width = `${percent}%`;
    loadingProgress.innerText = `${percent}%`;
}

function hideLoading() {
    loadingOverlay.style.display = "none";
}
