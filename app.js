/* ==========================================================================
   DOCPRO SCANNER V2 - COMPLETE APP LOGIC WITH MULTI-COMPANY SUPPORT
   ========================================================================== */

// --- MULTI-COMPANY CONFIGURATION ---
// Palitan ang mga URL na ito batay sa Web App URLs ng bawat kumpanya
const COMPANY_CONFIG = {
    companyA: {
        name: "Company A",
        scriptUrl: "https://script.google.com/macros/s/AKfycbwBrfysXkwEbtWjoFxBHduzLIgiXZOCcmSSDfyvuhI87xXLbi8I-fxQu8nFIHNYk6mtBw/exec"
    },
    companyB: {
        name: "Company B",
        scriptUrl: "YOUR_GOOGLE_APPS_SCRIPT_URL_FOR_COMPANY_B"
    }
};

// --- GLOBAL VARIABLES & STATE ---
let activeGoogleScriptUrl = ""; // Dynamic URL batay sa napiling kumpanya
let currentStream = null;
let facingMode = "environment"; // Back camera default
let scannedPages = [];          // List of saved Base64 Image URLs
let tempCapturedImage = null;   // Temporarily holds newly captured image
let currentPreviewIndex = null; // Index if viewing an already-saved thumbnail
let currentRotation = 0;

// LocalStorage History
let scannedHistory = JSON.parse(localStorage.getItem("docpro_history")) || [];

// --- WAIT UNTIL DOM IS FULLY LOADED ---
document.addEventListener("DOMContentLoaded", () => {

    // --- DOM ELEMENTS ---
    const loginScreen = document.getElementById("loginScreen");
    const homeScreen = document.getElementById("homeScreen");
    const scannerScreen = document.getElementById("scannerScreen");
    const reviewScreen = document.getElementById("reviewScreen");

    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const companySelect = document.getElementById("companySelect");
    const loginBtn = document.getElementById("loginBtn");

    const scanCard = document.getElementById("scanCard");
    const documentsCard = document.getElementById("documentsCard");
    const logoutCard = document.getElementById("logoutCard");

    const video = document.getElementById("camera");
    const canvas = document.getElementById("canvas");
    const captureBtn = document.getElementById("captureBtn");
    const continueBtn = document.getElementById("continueBtn");
    const closeCameraBtn = document.getElementById("closeCameraBtn");
    const pageCountSpan = document.getElementById("pageCount");
    const thumbCounter = document.getElementById("thumbCounter");
    const thumbnailContainer = document.getElementById("thumbnailContainer");

    // Modals
    const previewModalElement = document.getElementById("previewModal");
    const previewModal = previewModalElement ? new bootstrap.Modal(previewModalElement) : null;
    const previewImage = document.getElementById("previewImage");
    const rotateBtn = document.getElementById("rotateBtn");
    const deleteBtn = document.getElementById("deleteBtn");
    const saveBtn = document.getElementById("saveBtn");

    const documentsModalElement = document.getElementById("documentsModal");
    const documentsModal = documentsModalElement ? new bootstrap.Modal(documentsModalElement) : null;

    // Review Screen
    const reviewContainer = document.getElementById("reviewContainer");
    const backToScannerBtn = document.getElementById("backToScannerBtn");
    const uploadDriveBtn = document.getElementById("uploadDriveBtn");

    // Overlay & Success Modal
    const loadingOverlay = document.getElementById("loadingOverlay");
    const loadingMessage = document.getElementById("loadingMessage");
    const loadingProgress = document.getElementById("loadingProgress");
    const successModalElement = document.getElementById("successModal");
    const successModal = successModalElement ? new bootstrap.Modal(successModalElement) : null;

    /* ==========================================================================
       1. LOGIN & NAVIGATION
       ========================================================================== */

    if (loginBtn) {
        loginBtn.addEventListener("click", () => {
            const user = usernameInput.value.trim();
            const pass = passwordInput.value.trim();
            const selectedCompanyKey = companySelect ? companySelect.value : "companyA";

            if (user !== "" && pass !== "") {
                // Set the active script URL dynamically based on chosen company
                if (COMPANY_CONFIG[selectedCompanyKey]) {
                    activeGoogleScriptUrl = COMPANY_CONFIG[selectedCompanyKey].scriptUrl;
                } else {
                    alert("Selected company configuration not found.");
                    return;
                }

                loginScreen.classList.add("d-none");
                loginScreen.classList.remove("d-flex");
                loginScreen.style.display = "none";

                homeScreen.style.display = "block";
            } else {
                alert("Please enter your Username and Password.");
            }
        });
    }

    if (logoutCard) {
        logoutCard.addEventListener("click", () => {
            if (confirm("Are you sure you want to log out?")) {
                resetAppToHome();
                homeScreen.style.display = "none";

                loginScreen.classList.remove("d-none");
                loginScreen.classList.add("d-flex");
                loginScreen.style.display = "";

                usernameInput.value = "";
                passwordInput.value = "";
                activeGoogleScriptUrl = "";
            }
        });
    }

    if (scanCard) {
        scanCard.addEventListener("click", () => {
            homeScreen.style.display = "none";
            scannerScreen.style.display = "block";
            startCamera();
        });
    }

    if (documentsCard) {
        documentsCard.addEventListener("click", () => {
            renderDocumentsList();
            if (documentsModal) {
                documentsModal.show();
            }
        });
    }

    /* ==========================================================================
       2. CAMERA & SCANNER LOGIC
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
            console.error("Camera access error:", err);
            alert("Unable to access camera. Please ensure camera permissions are enabled in your browser.");
        }
    }

    function stopCamera() {
        if (currentStream) {
            currentStream.getTracks().forEach(track => track.stop());
            currentStream = null;
        }
    }

    if (closeCameraBtn) {
        closeCameraBtn.addEventListener("click", () => {
            resetAppToHome();
        });
    }

    // Capture Image -> Open Preview Modal for confirmation
    if (captureBtn) {
        captureBtn.addEventListener("click", () => {
            if (!currentStream) return;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            tempCapturedImage = canvas.toDataURL("image/jpeg", 0.92);
            currentPreviewIndex = null; // Denotes new capture
            currentRotation = 0;

            previewImage.src = tempCapturedImage;
            previewImage.style.transform = "rotate(0deg)";

            if (previewModal) previewModal.show();
        });
    }

    function updateThumbnails() {
        if (!thumbnailContainer) return;

        const count = scannedPages.length;
        if (pageCountSpan) pageCountSpan.innerText = count;
        if (thumbCounter) thumbCounter.innerText = count;

        thumbnailContainer.innerHTML = "";
        thumbnailContainer.style.display = "block";

        scannedPages.forEach((imgData, index) => {
            const wrapper = document.createElement("div");
            wrapper.className = "position-relative mb-2 d-inline-block me-2 me-md-0";

            const img = document.createElement("img");
            img.src = imgData;
            img.className = "img-thumbnail rounded";
            img.style.cursor = "pointer";
            img.style.width = "70px";
            img.style.height = "90px";
            img.style.objectFit = "cover";

            img.addEventListener("click", () => {
                openPreviewFromThumbnail(index);
            });

            const badge = document.createElement("span");
            badge.className = "position-absolute top-0 start-0 translate-middle badge rounded-pill bg-primary";
            badge.innerText = index + 1;

            wrapper.appendChild(img);
            wrapper.appendChild(badge);
            thumbnailContainer.appendChild(wrapper);
        });

        requestAnimationFrame(() => {
            const lastChild = thumbnailContainer.lastElementChild;
            if (lastChild) {
                lastChild.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "end" });
            }
        });
    }

    /* ==========================================================================
       3. PREVIEW & EDIT DECISION
       ========================================================================== */

    function openPreviewFromThumbnail(index) {
        currentPreviewIndex = index;
        tempCapturedImage = null;
        currentRotation = 0;

        previewImage.src = scannedPages[index];
        previewImage.style.transform = `rotate(${currentRotation}deg)`;
        if (previewModal) previewModal.show();
    }

    if (rotateBtn) {
        rotateBtn.addEventListener("click", () => {
            currentRotation = (currentRotation + 90) % 360;
            previewImage.style.transform = `rotate(${currentRotation}deg)`;
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener("click", () => {
            let targetImage = (currentPreviewIndex !== null) ? scannedPages[currentPreviewIndex] : tempCapturedImage;

            if (!targetImage) return;

            if (currentRotation !== 0) {
                const img = new Image();
                img.src = targetImage;
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

                    const finalRotatedImage = rotCanvas.toDataURL("image/jpeg", 0.92);

                    if (currentPreviewIndex !== null) {
                        scannedPages[currentPreviewIndex] = finalRotatedImage;
                    } else {
                        scannedPages.push(finalRotatedImage);
                    }

                    finishSaveProcess();
                };
            } else {
                if (currentPreviewIndex === null) {
                    scannedPages.push(tempCapturedImage);
                }
                finishSaveProcess();
            }
        });
    }

    function finishSaveProcess() {
        tempCapturedImage = null;
        currentPreviewIndex = null;
        updateThumbnails();
        if (previewModal) previewModal.hide();
    }

    if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
            if (currentPreviewIndex !== null) {
                scannedPages.splice(currentPreviewIndex, 1);
                updateThumbnails();
            }
            tempCapturedImage = null;
            currentPreviewIndex = null;
            if (previewModal) previewModal.hide();
        });
    }

    /* ==========================================================================
       4. REVIEW SCREEN & GOOGLE DRIVE UPLOAD
       ========================================================================== */

    if (continueBtn) {
        continueBtn.addEventListener("click", () => {
            if (scannedPages.length === 0) {
                alert("Please capture and save at least one page before continuing.");
                return;
            }

            stopCamera();
            scannerScreen.style.display = "none";
            reviewScreen.style.display = "block";
            renderReviewGrid();
        });
    }

    if (backToScannerBtn) {
        backToScannerBtn.addEventListener("click", () => {
            reviewScreen.style.display = "none";
            scannerScreen.style.display = "block";
            startCamera();
            updateThumbnails();
        });
    }

    function renderReviewGrid() {
        reviewContainer.innerHTML = "";

        scannedPages.forEach((imgSrc, idx) => {
            const col = document.createElement("div");
            col.className = "col-md-3 col-6 mb-3";

            col.innerHTML = `
                <div class="card h-100 shadow-sm">
                    <img src="${imgSrc}" class="card-img-top" style="object-fit: cover; height: 200px;">
                    <div class="card-body p-2 d-flex justify-content-between align-items-center">
                        <small class="fw-bold">Page ${idx + 1}</small>
                        <button class="btn btn-sm btn-outline-danger btn-remove-page" data-index="${idx}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            reviewContainer.appendChild(col);
        });

        document.querySelectorAll(".btn-remove-page").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const idx = parseInt(e.currentTarget.getAttribute("data-index"));
                scannedPages.splice(idx, 1);
                updateThumbnails();
                if (scannedPages.length === 0) {
                    reviewScreen.style.display = "none";
                    scannerScreen.style.display = "block";
                    startCamera();
                } else {
                    renderReviewGrid();
                }
            });
        });
    }

    if (uploadDriveBtn) {
        uploadDriveBtn.addEventListener("click", async () => {
            if (scannedPages.length === 0) {
                alert("No pages to upload.");
                return;
            }

            if (!activeGoogleScriptUrl) {
                alert("No company selected. Please log in again.");
                return;
            }

            showLoading("Generating PDF & Uploading to Google Drive...", 20);

            try {
                // 1. Generate PDF from scanned images using pdf-lib
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

                    const percent = Math.round(((i + 1) / scannedPages.length) * 50) + 20;
                    updateLoadingProgress(percent);
                }

                // 2. Convert to raw Base64 string (strip data URI header)
                const pdfDataUri = await pdfDoc.saveAsBase64({ dataUri: true });
                const rawBase64 = pdfDataUri.split(",")[1] || pdfDataUri;
                const fileName = `DocPro-Scan-${Date.now()}.pdf`;

                updateLoadingProgress(80);

                // 3. Send payload matching chosen company URL
                await fetch(activeGoogleScriptUrl, {
                    method: "POST",
                    mode: "no-cors",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        action: "uploadPdf",
                        fileName: fileName,
                        base64: rawBase64
                    })
                });

                updateLoadingProgress(100);

                // 4. Save entry to local history
                saveToHistory(fileName, scannedPages.length);

                hideLoading();
                if (successModal) successModal.show();

            } catch (error) {
                console.error("Upload Error:", error);
                hideLoading();
                alert("An error occurred while uploading to Google Drive.");
            }
        });
    }

    // Return to Dashboard automatically after closing Success Modal
    if (successModalElement) {
        successModalElement.addEventListener("hidden.bs.modal", () => {
            resetAppToHome();
        });
    }

    /* ==========================================================================
       5. HISTORY MANAGEMENT
       ========================================================================== */

    function renderDocumentsList() {
        const listContainer = document.getElementById("documentsList");
        if (!listContainer) return;

        listContainer.innerHTML = "";

        if (scannedHistory.length === 0) {
            listContainer.innerHTML = `
                <li class="list-group-item text-center text-muted py-4">
                    <i class="bi bi-inbox display-6 d-block mb-2"></i>
                    No scanned document history found.
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

    const clearHistoryBtn = document.getElementById("clearHistoryBtn");
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener("click", () => {
            if (confirm("Are you sure you want to clear your scan history?")) {
                scannedHistory = [];
                localStorage.removeItem("docpro_history");
                renderDocumentsList();
            }
        });
    }

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
       6. HELPERS
       ========================================================================== */

    function resetAppToHome() {
        stopCamera();
        scannedPages = [];
        tempCapturedImage = null;
        updateThumbnails();
        reviewScreen.style.display = "none";
        scannerScreen.style.display = "none";
        homeScreen.style.display = "block";
    }

    function showLoading(msg, percent) {
        if (loadingMessage) loadingMessage.innerText = msg;
        updateLoadingProgress(percent);
        if (loadingOverlay) loadingOverlay.style.display = "flex";
    }

    function updateLoadingProgress(percent) {
        if (loadingProgress) {
            loadingProgress.style.width = `${percent}%`;
            loadingProgress.innerText = `${percent}%`;
        }
    }

    function hideLoading() {
        if (loadingOverlay) loadingOverlay.style.display = "none";
    }
});
