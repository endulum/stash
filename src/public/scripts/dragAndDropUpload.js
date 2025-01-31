const overlay = document.getElementById("dragndrop-overlay");
const overlayText = overlay.querySelector("p");

let dragTarget = null;

function hideOverlay() {
  table.classList.remove("no-events");
  overlay.style.opacity = 0;
}

function revealOverlay() {
  overlayText.textContent = "Upload file";
  table.classList.add("no-events");
  overlay.style.opacity = 1;
}

async function sendUpload(file) {
  const formData = new FormData();
  formData.append("upload", file);
  formData.append(
    "location",
    table.dataset.dirid !== "" ? table.dataset.dirid : "home"
  );

  overlayText.textContent = "Uploading...";
  const response = await fetch("/file/drop", {
    method: "POST",
    body: formData,
  });

  try {
    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const errors = await response.json();
        showUploadError(errors[Object.keys(errors)[0]]);
      } else {
        const text = await response.text();
        if (!text.startsWith("<")) showUploadError(text);
        else showUploadError();
      }
    } else {
      const json = await response.json();
      const newFileId = json.newFileId;
      window.location.href = `/file/${newFileId}`;
    }
  } catch (e) {
    console.error(e);
    showUploadError();
  }
}

function showUploadError(err) {
  overlayText.textContent =
    err ?? "Something went wrong when uploading this file. Try again.";
  setTimeout(() => {
    hideOverlay();
  }, 5000);
}

window.addEventListener("dragover", (e) => {
  e.preventDefault();
});

table.addEventListener("dragenter", (e) => {
  e.preventDefault();
  dragTarget = e.target;
  revealOverlay();
});

table.addEventListener("dragleave", (e) => {
  e.preventDefault();
  if (e.target === dragTarget) hideOverlay();
});

table.addEventListener("drop", (e) => {
  e.preventDefault();
  sendUpload(e.dataTransfer.files[0]);
});
