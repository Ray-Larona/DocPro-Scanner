/* ==========================================================================
   DOCPRO SCANNER V2 - COMPLETE APP LOGIC
   ========================================================================== */

// --- GLOBAL VARIABLES & STATE ---
let currentStream = null;
let facingMode = "environment"; // Back camera default
let scannedPages = [];          // Listahan ng Base64 Image URLs
let currentPreviewIndex = null;
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

            if (user !== "" && pass !== "") {
                loginScreen.style.display = "none";
                homeScreen.style.display = "block";
            } else {
                alert("Paki-lagay ang iyong Username at Password.");
            }
        });
    }

    if (logoutCard) {
        logoutCard.addEventListener("click", () => {
            if (confirm("Sigurado ka bang gusto mong mag-logout?")) {
                homeScreen.style.display = "none";
                loginScreen.style.display = "flex";
                usernameInput.value = "";
                passwordInput.value = "";
                stopCamera();
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
            alert("Hindi mabuksan ang camera. Siguraduhing pinayagan ang camera permission sa browser.");
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
            stopCamera();
            scannerScreen.style.display = "none";
            homeScreen.style.display = "block";
        });
    }

    if (captureBtn) {
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
    }

    function updateThumbnails() {
        const count = scannedPages.length;
        if (pageCountSpan) pageCountSpan.innerText = count;
        if (thumbCounter) thumbCounter.innerText = count;

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
       3. PREVIEW & EDIT
       ========================================================================== */

    function openPreview(index) {
        currentPreviewIndex = index;
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
            if (currentPreviewIndex === null) return;

            if (currentRotation !== 0) {
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
                    if (previewModal) previewModal.hide();
                };
            } else {
                if (previewModal) previewModal.hide();
            }
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener("click", () => {
            if (currentPreviewIndex !== null) {
                scannedPages.splice(currentPreviewIndex, 1);
                updateThumbnails();
                if (previewModal) previewModal.hide();
            }
        });
    }

    /* ==========================================================================
       4. REVIEW SCREEN & UPLOAD
       ========================================================================== */

    if (continueBtn) {
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
    }

    if (backToScannerBtn) {
        backToScannerBtn.addEventListener("click", () => {
            reviewScreen.style.display = "none";
            scannerScreen.style.display = "block";
            startCamera();
        });
    }

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
                        <button class="btn btn-sm btn-outline-danger btn-remove-page" data-index="${idx}">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            reviewContainer.appendChild(col);
        });

        // Add Event Listener sa mga Delete Buttons sa Review Grid
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
        uploadDriveBtn.addEventListener("click", () => {
            if (scannedPages.length === 0) return;

            showLoading("Uploading to Google Drive...", 50);

            setTimeout(() => {
                const fileName = `DocPro-Drive-${Date.now()}.pdf`;
                saveToHistory(fileName, scannedPages.length);

                hideLoading();
                if (successModal) successModal.show();
            }, 1500);
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

    if (documentsCard) {
        documentsCard.addEventListener("click", () => {
            renderDocumentsList();
            const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("documentsModal"));
            modal.show();
        });
    }

    const clearHistoryBtn = document.getElementById("clearHistoryBtn");
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener("click", () => {
            if (confirm("Sigurado ka bang gusto mong burahin ang history?")) {
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
