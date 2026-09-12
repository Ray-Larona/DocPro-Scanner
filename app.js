// ==========================================
// 1. CONFIGURATION & AUTHORIZED USERS
// ==========================================
const API_BASE = "https://script.google.com/macros/s/AKfycbyC62g2zIuXUaQ6vG6Y3kG6K1S_T2/exec"; 

const COMPANY_ENDPOINTS = {
    company_a: API_BASE,
    company_b: API_BASE,
    company_c: API_BASE
};

// Valid accounts database
const VALID_USERS = {
    "admin": "1234",
    "user": "pass"
};

let currentCompanyEndpoint = "";
let capturedImages = [];
let mediaStream = null;

// ==========================================
// 2. DOM ELEMENTS
// ==========================================
const loginScreen = document.getElementById("loginScreen");
const appContainer = document.getElementById("appContainer");
const homeScreen = document.getElementById("homeScreen");
const scannerScreen = document.getElementById("scannerScreen");
const reviewScreen = document.getElementById("reviewScreen");

const companySelect = document.getElementById("companySelect");
const usernameInput = document.getElementById("usernameInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const logoutBtn = document.getElementById("logoutBtn");

const openScannerBtn = document.getElementById("openScannerBtn");
const closeScannerBtn = document.getElementById("closeScannerBtn");
const cameraStream = document.getElementById("cameraStream");
const captureBtn = document.getElementById("captureBtn");
const capturedCount = document.getElementById("capturedCount");
const finishScanBtn = document.getElementById("finishScanBtn");

const backToScannerBtn = document.getElementById("backToScannerBtn");
const documentNameInput = document.getElementById("documentName");
const uploadBtn = document.getElementById("uploadBtn");
const uploadStatus = document.getElementById("uploadStatus");
const imageGallery = document.getElementById("imageGallery");
const pageCount = document.getElementById("pageCount");

// ==========================================
// 3. INITIALIZATION & LOGIN
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    checkAuthSession();

    if (loginBtn) {
        loginBtn.addEventListener("click", handleLogin);
    }

    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }

    // Navigation events
    if (openScannerBtn) openScannerBtn.addEventListener("click", startScanner);
    if (closeScannerBtn) closeScannerBtn.addEventListener("click", stopScanner);
    if (captureBtn) captureBtn.addEventListener("click", capturePhoto);
    if (finishScanBtn) finishScanBtn.addEventListener("click", goToReviewScreen);
    if (backToScannerBtn) backToScannerBtn.addEventListener("click", backToScanner);
    if (uploadBtn) uploadBtn.addEventListener("click", uploadPDF);
});

function checkAuthSession() {
    const isLoggedIn = sessionStorage.getItem("isLoggedIn");
    const savedEndpoint = sessionStorage.getItem("companyEndpoint");

    if (isLoggedIn === "true" && savedEndpoint) {
        currentCompanyEndpoint = savedEndpoint;
        showHomeScreen();
    } else {
        showLoginScreen();
    }
}

async function handleLogin() {
    const selectedCompany = companySelect.value;
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    // Check for empty fields
    if (!username || !password) {
        showError("Please enter both username and password.");
        return;
    }

    // STRICT USERNAME AND PASSWORD VERIFICATION
    if (!VALID_USERS[username] || VALID_USERS[username] !== password) {
        showError("Invalid username or password.");
        return;
    }

    currentCompanyEndpoint = COMPANY_ENDPOINTS[selectedCompany];

    if (!currentCompanyEndpoint) {
        showError("Invalid company selected.");
        return;
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Authenticating...`;
    loginError.innerText = "";

    try {
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("companyEndpoint", currentCompanyEndpoint);
        sessionStorage.setItem("username", username);

        showHomeScreen();
    } catch (err) {
        showError("Login failed. Please try again.");
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = `<i class="bi bi-box-arrow-in-right"></i> Login`;
    }
}

function handleLogout() {
    sessionStorage.clear();
    stopCameraStream();
    capturedImages = [];
    usernameInput.value = "";
    passwordInput.value = "";
    loginError.innerText = "";
    showLoginScreen();
}

function showError(msg) {
    loginError.className = "text-danger text-center fw-bold mt-2";
    loginError.innerText = msg;
}

// ==========================================
// 4. SCREEN NAVIGATION FUNCTIONS
// ==========================================
function showLoginScreen() {
    loginScreen.style.display = "flex";
    appContainer.style.display = "none";
}

function showHomeScreen() {
    loginScreen.style.display = "none";
    appContainer.style.display = "block";
    
    if (homeScreen) homeScreen.classList.remove("d-none");
    if (scannerScreen) scannerScreen.classList.add("d-none");
    if (reviewScreen) reviewScreen.classList.add("d-none");
}

// ==========================================
// 5. CAMERA & SCANNER FUNCTIONS
// ==========================================
async function startScanner(e) {
    if (e) e.preventDefault();
    
    homeScreen.classList.add("d-none");
    scannerScreen.classList.remove("d-none");

    try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false
        });
        cameraStream.srcObject = mediaStream;
    } catch (err) {
        alert("Unable to access camera. Please check permissions.");
        console.error(err);
    }
}

function stopCameraStream() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }
}

function stopScanner() {
    stopCameraStream();
    showHomeScreen();
}

function capturePhoto() {
    if (!mediaStream) return;

    const canvas = document.createElement("canvas");
    canvas.width = cameraStream.videoWidth || 640;
    canvas.height = cameraStream.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(cameraStream, 0, 0, canvas.width, canvas.height);

    const imgData = canvas.toDataURL("image/jpeg", 0.8);
    capturedImages.push(imgData);

    if (capturedCount) capturedCount.innerText = capturedImages.length;
}

function goToReviewScreen() {
    if (capturedImages.length === 0) {
        alert("Please capture at least one image before reviewing.");
        return;
    }

    stopCameraStream();
    scannerScreen.classList.add("d-none");
    reviewScreen.classList.remove("d-none");

    renderGallery();
}

function backToScanner() {
    reviewScreen.classList.add("d-none");
    startScanner();
}

function renderGallery() {
    if (pageCount) pageCount.innerText = capturedImages.length;
    imageGallery.innerHTML = "";

    capturedImages.forEach((src, idx) => {
        const col = document.createElement("div");
        col.className = "col-4 position-relative";
        col.innerHTML = `
            <img src="${src}" class="img-fluid rounded border shadow-sm" style="height: 100px; object-fit: cover; width: 100%;">
            <button onclick="removeImage(${idx})" class="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 rounded-circle p-0" style="width: 20px; height: 20px; line-height: 1;">&times;</button>
        `;
        imageGallery.appendChild(col);
    });
}

window.removeImage = function(index) {
    capturedImages.splice(index, 1);
    renderGallery();
    if (capturedCount) capturedCount.innerText = capturedImages.length;
    if (capturedImages.length === 0) {
        backToScanner();
    }
};

// ==========================================
// 6. PDF GENERATION & UPLOAD
// ==========================================
async function uploadPDF() {
    const docName = documentNameInput.value.trim() || `Scan_${Date.now()}`;

    if (capturedImages.length === 0) {
        uploadStatus.className = "text-danger mt-2";
        uploadStatus.innerText = "No scanned images to upload.";
        return;
    }

    uploadBtn.disabled = true;
    uploadStatus.className = "text-info mt-2";
    uploadStatus.innerText = "Generating PDF and uploading...";

    try {
        const pdfDoc = await PDFLib.PDFDocument.create();

        for (const base64Img of capturedImages) {
            const imageBytes = await fetch(base64Img).then(res => res.arrayBuffer());
            const jpgImage = await pdfDoc.embedJpg(imageBytes);
            const page = pdfDoc.addPage([jpgImage.width, jpgImage.height]);
            page.drawImage(jpgImage, {
                x: 0,
                y: 0,
                width: jpgImage.width,
                height: jpgImage.height
            });
        }

        const pdfBytes = await pdfDoc.saveBase64({ dataUri: true });

        const response = await fetch(currentCompanyEndpoint, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                filename: `${docName}.pdf`,
                fileData: pdfBytes
            })
        });

        uploadStatus.className = "text-success mt-2";
        uploadStatus.innerText = "Uploaded successfully!";

        setTimeout(() => {
            capturedImages = [];
            if (capturedCount) capturedCount.innerText = "0";
            documentNameInput.value = "";
            uploadStatus.innerText = "";
            showHomeScreen();
        }, 1500);

    } catch (err) {
        console.error(err);
        uploadStatus.className = "text-danger mt-2";
        uploadStatus.innerText = "Upload failed. Please try again.";
    } finally {
        uploadBtn.disabled = false;
    }
}
