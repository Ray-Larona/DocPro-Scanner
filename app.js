/**
 * DocPro Scanner V2 - Complete Main Engine (app.js)
 * Includes Login Authentication, Dynamic Multi-Company Backend Switching,
 * Camera Image Processing, and PDF Streaming to Google Apps Script.
 */

// ==========================================
// 1. CONFIGURATION & STATE
// ==========================================

// Credentials for Authentication (Change as needed)
const ALLOWED_USERS = [
  { username: "Ray", password: "123456" }, //otaku
  { username: "Dawn", password: "54321" }, //otaku
   { username: "User1", password: "12345" },
  { username: "User2", password: "112233" } 
];


// Endpoints mapped to Company Selection Key
const COMPANY_ENDPOINTS = {
  company_a: "https://script.google.com/macros/s/AKfycbwBrfysXkwEbtWjoFxBHduzLIgiXZOCcmSSDfyvuhI87xXLbi8I-fxQu8nFIHNYk6mtBw/exec",
  company_b: "https://script.google.com/macros/s/AKfycbx_EXAMPLE_COMPANY_B/exec",
  company_c: "https://script.google.com/macros/s/AKfycbx_EXAMPLE_COMPANY_C/exec"
};

let activeGoogleScriptUrl = "";
let capturedImages = [];
let mediaStream = null;

// ==========================================
// 2. AUTHENTICATION MODULE
// ==========================================

function login() {
  const userInput = document.getElementById("usernameInput")?.value.trim();
  const passInput = document.getElementById("passwordInput")?.value.trim();
  const companyKey = document.getElementById("companySelect")?.value;
  const loginError = document.getElementById("loginError");

  if (!userInput || !passInput) {
    showError(loginError, "Pakilagay ang username at password.");
    return;
  }

  // Check Credentials
  if (userInput === AUTH_CREDENTIALS.username && passInput === AUTH_CREDENTIALS.password) {
    if (!COMPANY_ENDPOINTS[companyKey]) {
      showError(loginError, "Pumili ng tamang kompanya.");
      return;
    }

    // Set active dynamic endpoint
    activeGoogleScriptUrl = COMPANY_ENDPOINTS[companyKey];

    // Session UI State Swap
    document.getElementById("loginScreen").classList.add("hidden");
    document.getElementById("appContainer").classList.remove("hidden");
    
    // Reset login error message if any
    if (loginError) loginError.innerText = "";
    
    // Auto start camera after successful auth
    initCamera();
  } else {
    showError(loginError, "Maling Username o Password!");
  }
}

function logout() {
  stopCamera();
  capturedImages = [];
  renderGallery();
  
  // Clear inputs
  if (document.getElementById("usernameInput")) document.getElementById("usernameInput").value = "";
  if (document.getElementById("passwordInput")) document.getElementById("passwordInput").value = "";

  document.getElementById("appContainer").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
}

function showError(element, text) {
  if (element) {
    element.innerText = text;
    element.style.color = "red";
  } else {
    alert(text);
  }
}

// ==========================================
// 3. CAMERA & CAPTURE MODULE
// ==========================================

async function initCamera() {
  const videoElement = document.getElementById("cameraStream");
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false
    });
    if (videoElement) {
      videoElement.srcObject = mediaStream;
      videoElement.play();
    }
  } catch (err) {
    alert("Hindi ma-access ang camera: " + err.message);
  }
}

function stopCamera() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
}

function capturePhoto() {
  const videoElement = document.getElementById("cameraStream");
  if (!videoElement) return;

  const canvas = document.createElement("canvas");
  canvas.width = videoElement.videoWidth || 1280;
  canvas.height = videoElement.videoHeight || 720;
  
  const ctx = canvas.getContext("2d");
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

  // Convert to high-quality JPEG Data URL
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  capturedImages.push(dataUrl);

  renderGallery();
}

function deletePhoto(index) {
  capturedImages.splice(index, 1);
  renderGallery();
}

function renderGallery() {
  const galleryContainer = document.getElementById("imageGallery");
  if (!galleryContainer) return;

  galleryContainer.innerHTML = "";
  capturedImages.forEach((imgSrc, idx) => {
    const card = document.createElement("div");
    card.className = "gallery-card";
    card.innerHTML = `
      <img src="${imgSrc}" alt="Scan ${idx + 1}" />
      <button onclick="deletePhoto(${idx})" class="btn-delete">Burahin</button>
    `;
    galleryContainer.appendChild(card);
  });

  const countDisplay = document.getElementById("pageCount");
  if (countDisplay) countDisplay.innerText = capturedImages.length;
}

// ==========================================
// 4. CLIENT-SIDE PDF GENERATION (pdf-lib)
// ==========================================

async function generatePdfBase64() {
  if (capturedImages.length === 0) {
    throw new Error("Walang nakakapturang larawan para gawing PDF.");
  }

  // Uses global PDFLib script loaded in HTML
  const { PDFDocument } = PDFLib;
  const pdfDoc = await PDFDocument.create();

  for (const dataUrl of capturedImages) {
    const imageBytes = await fetch(dataUrl).then(res => res.arrayBuffer());
    const image = await pdfDoc.embedJpg(imageBytes);

    // Standard A4 Dimensions in points (595.28 x 841.89)
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    // Calculate aspect ratio fit
    const imgAspect = image.width / image.height;
    const pageAspect = width / height;

    let renderWidth = width;
    let renderHeight = height;

    if (imgAspect > pageAspect) {
      renderHeight = width / imgAspect;
    } else {
      renderWidth = height * imgAspect;
    }

    const x = (width - renderWidth) / 2;
    const y = (height - renderHeight) / 2;

    page.drawImage(image, {
      x: x,
      y: y,
      width: renderWidth,
      height: renderHeight
    });
  }

  const pdfBytes = await pdfDoc.saveAsBase64({ dataUri: false });
  return pdfBytes;
}

// ==========================================
// 5. UPLOAD ENGINE TO GOOGLE APPS SCRIPT
// ==========================================

async function uploadDocument() {
  const statusElement = document.getElementById("uploadStatus");
  const docNameInput = document.getElementById("documentName");
  const fileName = (docNameInput?.value.trim() || "DocPro_Scan") + "_" + Date.now() + ".pdf";

  if (capturedImages.length === 0) {
    alert("Mag-scan muna ng kahit isang page bago i-upload.");
    return;
  }

  if (statusElement) statusElement.innerText = "Ginagawang PDF at ina-upload...";

  try {
    const base64Pdf = await generatePdfBase64();

    const payload = {
      action: "uploadPdf",
      fileName: fileName,
      base64: base64Pdf
    };

    // Google Apps Script requires text/plain body under no-cors mode
    await fetch(activeGoogleScriptUrl, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain"
      },
      body: JSON.stringify(payload)
    });

    if (statusElement) statusElement.innerText = "Na-upload na nang matagumpay!";
    
    // Reset workspace after success
    setTimeout(() => {
      capturedImages = [];
      if (docNameInput) docNameInput.value = "";
      renderGallery();
      if (statusElement) statusElement.innerText = "";
    }, 2000);

  } catch (err) {
    console.error(err);
    if (statusElement) statusElement.innerText = "Nagka-error sa pag-upload: " + err.message;
  }
}

// ==========================================
// 6. INIT BINDINGS
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  // Bind Login Button
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", login);
  }

  // Bind Logout Button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

  // Bind Capture Button
  const captureBtn = document.getElementById("captureBtn");
  if (captureBtn) {
    captureBtn.addEventListener("click", capturePhoto);
  }

  // Bind Upload Button
  const uploadBtn = document.getElementById("uploadBtn");
  if (uploadBtn) {
    uploadBtn.addEventListener("click", uploadDocument);
  }
});
