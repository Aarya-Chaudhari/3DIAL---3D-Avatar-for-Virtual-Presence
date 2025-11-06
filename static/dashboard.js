// =============================
// Selected Base Avatar (male/female)
// =============================
let selectedBaseAvatar = "female"; // will hold 'male' or 'female'


// =============================
// Gender selection before avatar creation
// =============================
function showParameterSelection() {
  const container = document.getElementById("avatarDisplay");
  container.innerHTML = `
    <div style="text-align:center; color:#fff;">
      <h3>Select your avatar type:</h3>
      <button id="maleBtn" class="btn">Male</button>
      <button id="femaleBtn" class="btn">Female</button>
    </div>
  `;

  document.getElementById("maleBtn").addEventListener("click", () => {
    selectedBaseAvatar = "male";
    showAvatarOptions();
  });

  document.getElementById("femaleBtn").addEventListener("click", () => {
    selectedBaseAvatar = "female";
    showAvatarOptions();
  });
}

// =============================
// Show avatar options (camera/upload)
// =============================
function showAvatarOptions() {
  const container = document.getElementById("avatarDisplay");
  container.innerHTML = `
    <div style="display:flex; flex-direction: column; gap:8px;">
      <button id="cameraBtn" class="btn">📷 Capture with Camera</button>
      <input type="file" id="fileInput" accept="image/*" multiple>
      <button id="uploadBtn" class="btn">⬆ Upload Files</button>
      <model-viewer id="avatarViewer" style="width:100%; height:500px; display:none;" 
        auto-rotate camera-controls></model-viewer>
    </div>
  `;
   // Add event listeners
  document.getElementById("cameraBtn").addEventListener("click", startCameraCapture);
  document.getElementById("uploadBtn").addEventListener("click", () => {
    const files = document.getElementById("fileInput").files;
    if(files.length === 0){ alert("Select files"); return; }
    capturedFrames = []; 
    for(let i=0;i<files.length;i++) capturedFrames.push(files[i]);
    sendFramesToBackend();
  });
}

// =============================
// Camera Capture
// =============================
let capturedFrames = [], videoStream = null, currentAngle = 0;
const cameraAngles = ["Look straight","Turn slightly left","Turn slightly right","Look up","Look down"];

function startCameraCapture() {
  capturedFrames = [];
  currentAngle = 0;
  const container = document.getElementById("avatarDisplay");
  container.innerHTML = `
    <video id="video" autoplay playsinline style="max-width:300px; border:1px solid #000;"></video>
    <p id="instruction">${cameraAngles[currentAngle]}</p>
    <button id="captureBtn" class="btn">Capture</button>
  `;
  navigator.mediaDevices.getUserMedia({ video:true })
    .then(stream => {
      videoStream = stream;
      document.getElementById("video").srcObject = stream;
      document.getElementById("captureBtn").addEventListener("click", capturePhoto);
    })
    .catch(err => alert("Camera error: "+err));
}

function capturePhoto() {
  const video = document.getElementById("video");
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  canvas.toBlob(blob => {
    capturedFrames.push(new File([blob], `frame_${currentAngle}.png`));
    currentAngle++;
    if(currentAngle < cameraAngles.length){
      document.getElementById("instruction").innerText = cameraAngles[currentAngle];
    } else {
      stopCamera();
      sendFramesToBackend();
    }
  }, "image/png");
}

function stopCamera() {
  if(videoStream) videoStream.getTracks().forEach(t => t.stop());
}

// =============================
// Send images to backend
// =============================
function sendFramesToBackend() {
  if(capturedFrames.length===0){ alert("No images!"); return; }

  const formData = new FormData();
  capturedFrames.forEach((file,i)=>formData.append("images",file,`frame_${i}.png`));
  if(selectedBaseAvatar) formData.append("baseAvatar", selectedBaseAvatar);

  showLoading("Processing images and updating avatar...");

  fetch("/process-images", {method:"POST", body:formData})
    .then(res => res.json())
    .then(data => {
      if(!data.success) throw new Error("Landmark detection failed");
      showAvatarOptions();
      return fetch("/update-avatar", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({landmarksFolder:data.landmarksFolder, baseAvatar:selectedBaseAvatar})
      });
    })
    .then(res => res.json())
    .then(data => {
      hideLoading();
      if(data.success && data.avatarPath){
        updateAvatarViewer(data.avatarPath);
      } else { alert("Failed to update avatar"); }
    })
    .catch(err => { hideLoading(); console.error(err); alert(err.message); });
}

// =============================
// Upload files
// =============================
function uploadFiles() {
  const fileInput = document.getElementById("fileInput");
  if(fileInput.files.length === 0) { alert("Select files to upload!"); return; }

  capturedFrames = [];
  for(let i=0;i<fileInput.files.length;i++){
    capturedFrames.push(fileInput.files[i]);
  }
  sendFramesToBackend();
}

// =============================
// Avatar Viewer Update
// =============================
function updateAvatarViewer(avatarPath) {
  const container = document.getElementById("avatarDisplay");
  container.innerHTML = `
    <model-viewer
      id="avatarViewer"
      src="${avatarPath}"
      style="width:100%; height:500px; display:block; background-color:#222;"
      auto-rotate
      camera-controls
      camera-orbit="0deg 80deg 1.5m"
      camera-target="0 1.5 0"
      min-camera-orbit="-90deg 0deg 0.5m"
      max-camera-orbit="90deg 180deg 3m"
    ></model-viewer>
  `;
}

// =============================
// View Base Avatar
// =============================
function viewBaseAvatar() {
    if(!selectedBaseAvatar){
      alert("Select avatar parameters first!");
      return;
    }

    const container = document.getElementById("avatarDisplay");
    container.innerHTML = ""; 

    fetch(`/base-avatar?gender=${selectedBaseAvatar}`)
        .then(res => {
            if (!res.ok) throw new Error("Avatar not found");
            return res.blob();
        })
        .then(blob => {
            const url = URL.createObjectURL(blob);
            updateAvatarViewer(url);
        })
        .catch(err => {
            container.innerHTML = `<p style="color:#fff; text-align:center; font-size:1.2rem;">
                Create your avatar first!
            </p>`;
        });
}

// =============================
// Show Modify Avatar Form
// =============================
function showModifyForm() {
  document.getElementById("avatarDisplay").innerHTML = `
    <div style="text-align:center; color:#fff; padding:20px;">
      <h3 style="color:#00ffcc; text-shadow:0 0 10px #00ffcc;">🧑‍🎨 Customize Your Avatar</h3>

      <label>Hair Color:</label>
      <input type="color" id="hairColor" value="#000000"><br><br>

      <label>Skin Tone:</label>
      <input type="color" id="skinColor" value="#f1c27d"><br><br>

      <label>Clothes Color:</label>
      <input type="color" id="clothesColor" value="#3366ff"><br><br>

      <button onclick="updateAvatar()" 
        style="padding:12px 25px; font-size:16px; border:none; border-radius:25px; 
               background:#00ffcc; color:#000; cursor:pointer; font-weight:bold; 
               box-shadow:0 0 20px #00ffcc;">
        ✅ Apply Changes
      </button>
    </div>
  `;
}

// =============================
// Send customization request
// =============================
async function updateAvatar() {
  const hair = document.getElementById("hairColor").value;
  const skin = document.getElementById("skinColor").value;
  const clothes = document.getElementById("clothesColor").value;
  const gender = document.querySelector('input[name="gender"]:checked')?.value || "male";

  try {
    showLoading("Updating avatar...");

    const response = await fetch("http://localhost:5000/modify_avatar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hairColor: hair,
        skinTone: skin,
        clothColor: clothes,
        gender: gender
      })
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    const data = await response.json();
    console.log("Backend response:", data);

    if (!data.updated_avatar_url) throw new Error("No avatar URL returned");

    // Use full URL for model-viewer
    const avatarURL = `http://localhost:5000${data.updated_avatar_url}?t=${Date.now()}`;

    document.getElementById("avatarDisplay").innerHTML = `
      <model-viewer
        id="avatarViewer"
        src="${avatarURL}"
        style="width:100%; height:400px; background:#222;"
        auto-rotate
        camera-controls
      ></model-viewer>
    `;

  } catch (err) {
    console.error(err);
    alert("Error updating avatar: " + err.message);
  } finally {
    hideLoading();
  }
}


// =============================
// Loading animation (spinner)
// =============================
function showLoading(msg) {
  document.getElementById("avatarDisplay").innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#fff;">
  <div class="loader"></div>
  <p style="margin-top:15px; font-size:16px; font-weight:500;">${msg}</p>
</div>

<style>
  .loader {
    display: inline-block;
    width: 50px;
    height: 50px;
    position: relative;
  }

  .loader:after {
    content: " ";
    display: block;
    width: 44px;
    height: 44px;
    margin: 3px;
    border-radius: 50%;
    border: 4px solid #3498db;
    border-color: #3498db transparent #3498db transparent;
    animation: dual-ring 1.2s linear infinite;
  }

  @keyframes dual-ring {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  /* Optional: add a subtle pulse effect */
  .loader {
    animation: pulse 1.2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.7; }
    50% { transform: scale(1.1); opacity: 1; }
  }
</style>
`;
}

function hideLoading() {
  document.getElementById("avatarDisplay").innerHTML = "";
}
// =============================
// Show form for text + voice input
// =============================
function showVoiceCloneForm() {
  const container = document.getElementById("avatarDisplay");
  container.innerHTML = `
    <div style="text-align:center; color:#fff; padding:20px;">
      <h3>Clone Your Voice</h3>

      <textarea id="textInput" rows="3" 
        style="width:500px; padding:10px; border-radius:10px; 
               border:2px solid #00ffcc; background:#111; color:#fff; 
               resize:none; font-size:20px; box-shadow:0 0 10px #00ffcc inset;" 
        placeholder="Enter text to speak..."></textarea>
      
      <br><br>

      <div style="display:flex; align-items:center; justify-content:center; gap:20px;">

        <!-- Upload Voice -->
        <div>
          <label for="voiceInput" 
            style="display:inline-block; padding:10px 20px; background:#00ffcc; 
                   color:#000; border-radius:25px; cursor:pointer; font-weight:bold; 
                   box-shadow:0 0 15px #00ffcc; transition:0.3s;">
            Upload Voice Sample
          </label>
          <input type="file" id="voiceInput" class="voiceInput" accept="audio/*" style="display:none;">
          <div id="uploadedAudio"></div>
        </div>

        <!-- Record Voice -->
        <div>
          <button type="button" id="recordBtn" style="padding:10px 20px; background:#00ffcc; 
                   color:#000; border-radius:25px; cursor:pointer; font-weight:bold; 
                   box-shadow:0 0 15px #00ffcc; transition:0.3s;">🎤 Record Voice</button>
          <div id="recordedAudio"></div>
        </div>

      </div>

      <br><br>
      <button onclick="sendVoiceAndText()" class="btn">Submit & Clone Voice</button>
    </div>
  `;

  // Display uploaded file
  document.getElementById("voiceInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if(file){
    document.getElementById("uploadedAudio").innerHTML = `
      <p style="color:#00ffcc; font-weight:bold;">${file.name}</p>
    `;
  }
});

  // Handle voice recording
  const recordBtn = document.getElementById("recordBtn");
  let mediaRecorder, audioChunks;

  recordBtn.addEventListener("click", async () => {
    if(recordBtn.innerText.includes("🎤 Record Voice")){
      // Start recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunks, { type: "audio/wav" });
        const audioURL = URL.createObjectURL(blob);
        document.getElementById("recordedAudio").innerHTML = `
          <audio controls src="${audioURL}" style="width:200px;"></audio>
        `;
        // Save blob to a hidden input for submission
        window.recordedBlob = blob;
      };
      mediaRecorder.start();
      recordBtn.innerText = "🛑 Stop Recording";
    } else {
      // Stop recording
      mediaRecorder.stop();
      recordBtn.innerText = "🎤 Record Voice";
    }
  });
}

// =============================
// Send text + optional voice to backend & play result
// =============================
function sendVoiceAndText() {
  const textInput = document.getElementById("textInput").value.trim();
  const audioFile = document.getElementById("voiceInput").files[0]; // uploaded
  const recordedBlob = window.recordedBlob; // recorded

  if (!textInput) {
    alert("Please enter some text first!");
    return;
  }

  const formData = new FormData();
  formData.append("text", textInput);

  // Use recorded voice if available, else uploaded voice
  if(recordedBlob){
    formData.append("speaker_audio", recordedBlob, "recorded_voice.wav");
  } else if(audioFile){
    formData.append("speaker_audio", audioFile);
  }

  showLoading("Generating cloned voice...");

  fetch("/clone-voice", {  // 👉 your Flask backend
    method: "POST",
    body: formData
  })
    .then(res => {
      if(!res.ok) throw new Error("Voice generation failed!");
      return res.blob();
    })
    .then(blob => {
      hideLoading();
      const audioURL = URL.createObjectURL(blob);

      document.getElementById("avatarDisplay").innerHTML += `
        <br><br>
        <p style="color:#fff;">Generated Cloned Voice:</p>
        <audio controls autoplay src="${audioURL}" style="width:80%;"></audio>
      `;
    })
    .catch(err => {
      hideLoading();
      console.error(err);
      alert("Error: " + err.message);
    });
}

async function animateAvatarWithVoice() {
    const res = await fetch("/get-avatar-animation");
    const data = await res.json();

    if (data.error) {
        alert("Error: " + data.error);
        return;
    }

    const avatarViewer = document.getElementById("avatarViewer");
    avatarViewer.src = data.avatar_url;
    avatarViewer.style.display = "block";

    const audio = new Audio(data.voice_url);
    audio.play();

    const mouthLevels = data.mouth_levels;
    const emotions = data.emotions;
    const totalFrames = mouthLevels.length;
    const frameRate = 60;
    let frame = 0;

    function animate() {
        if (!avatarViewer.model) {
            requestAnimationFrame(animate);
            return;
        }

        // Lip-sync mapping
        avatarViewer.model.morphTargetInfluences['mouthOpen'] = mouthLevels[frame];

        // Emotion mapping (blendshapes)
        avatarViewer.model.morphTargetInfluences['happy'] = emotions.happy[frame];
        avatarViewer.model.morphTargetInfluences['sad'] = emotions.sad[frame];
        avatarViewer.model.morphTargetInfluences['angry'] = emotions.angry[frame];

        frame++;
        if (frame < totalFrames) {
            setTimeout(() => requestAnimationFrame(animate), 1000 / frameRate);
        }
    }

    requestAnimationFrame(animate);
}


// =============================
// Fullscreen toggle for avatar viewer
// =============================
function toggleFullScreenDisplay() {
    const display = document.getElementById("avatarDisplay");
    const modelViewer = document.getElementById("avatarViewer");

    if (!display) return;

    // Decide what to fullscreen — modelViewer if visible, else avatarDisplay
    const target =
        modelViewer && modelViewer.style.display !== "none"
            ? modelViewer
            : display;

    if (!document.fullscreenElement) {
        // Enter fullscreen
        if (target.requestFullscreen) {
            target.requestFullscreen();
        } else if (target.webkitRequestFullscreen) { // Safari
            target.webkitRequestFullscreen();
        } else if (target.msRequestFullscreen) { // IE11
            target.msRequestFullscreen();
        }
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { // Safari
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE11
            document.msExitFullscreen();
        }
    }
}



// =============================
// Download currently displayed file (GLB/audio/video)
// =============================  
function downloadDisplayedFile() {
    const display = document.getElementById("avatarDisplay");
    if (!display) {
        alert("Display area not found!");
        return;
    }

    let fileSrc = "";
    let fileName = "download";
    let fileExt = "";

    // Detect based on the child element type
    const model = display.querySelector("model-viewer");
    const audio = display.querySelector("audio");
    const video = display.querySelector("video");

    if (model) {
        fileSrc = model.getAttribute("src");
        fileExt = ".glb";
    } 
    else if (audio) {
        fileSrc = audio.getAttribute("src");
        fileExt = ".wav";
    } 
    else if (video) {
        fileSrc = video.getAttribute("src");
        fileExt = ".mp4"; // (or ".mp3" if your system actually generates MP3)
    }

    if (!fileSrc) {
        alert("No file currently displayed!");
        return;
    }

    // Create a link and trigger download
    const link = document.createElement("a");
    link.href = fileSrc;
    link.download = fileName + fileExt;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function playMedia() {
    const display = document.getElementById("avatarDisplay");
    const media = display.querySelector("audio, video"); // detect audio or video

    if (!media) {
        alert("No audio or video to play!");
        return;
    }

    media.play();
}

function pauseMedia() {
    const display = document.getElementById("avatarDisplay");
    const media = display.querySelector("audio, video");

    if (!media) {
        alert("No audio or video to pause!");
        return;
    }

    media.pause();
}

// ------------------- Avatar Creation -------------------
async function createMyAvatar() {
    const avatarDisplay = document.getElementById("avatarDisplay");
    avatarDisplay.innerHTML = ""; // Clear previous content

    // Create RPM iframe
    const rpmFrame = document.createElement("iframe");
    rpmFrame.id = "rpmFrame";
    rpmFrame.src = "https://readyplayer.me/avatar?frameApi";
    rpmFrame.allow = "camera *; microphone *";
    rpmFrame.style = "width:100%; height:700px; border:none;";
    avatarDisplay.appendChild(rpmFrame);

    // Listen for export message from RPM
    window.addEventListener("message", async function rpmListener(event) {
        const json = event.data;
        if (!json || json.source !== "readyplayerme") return;

        // Triggered when user clicks Next/Export in iframe
        if (json.eventName === "v1.avatar.exported") {
            const avatarUrl = json.data.url;
            console.log("Avatar URL received:", avatarUrl);

            // Remove iframe after export
            rpmFrame.remove();

            // Send URL to backend to download & save
            const res = await fetch("/download_avatar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ avatar_url: avatarUrl })
            });
            const data = await res.json();

            if (data.status === "saved") {
                console.log("Avatar saved locally at:", data.local_path);

                // Display the saved avatar in model-viewer
                let viewer = document.getElementById("avatarViewer");
                if (!viewer) {
                    viewer = document.createElement("model-viewer");
                    viewer.id = "avatarViewer";
                    viewer.style.width = "100%";
                    viewer.style.height = "500px";
                    viewer.cameraControls = true;
                    viewer.autoRotate = true;
                    avatarDisplay.appendChild(viewer);
                }

                viewer.src = data.local_path;
                viewer.style.display = "block";
            }

            // Remove listener after first use
            window.removeEventListener("message", rpmListener);
        }
    });
}

function saveAvatar() {
    const avatarDisplay = document.getElementById("avatarDisplay");
    avatarDisplay.innerHTML = "";

    const container = document.createElement("div");
    container.style = `
        background: #1a1a1a;
        color: #0ff;
        padding: 30px 20px;
        border-radius: 12px;
        max-width: 450px;
        margin: 50px auto;
        text-align: center;
        box-shadow: 0 0 20px #0ff;
        font-family: sans-serif;
    `;

    container.innerHTML = `
        <h2 style="margin-bottom:15px;">Paste your Ready Player Me avatar URL</h2>
        <input id="avatarUrlInput" type="text" placeholder="https://..." style="
            width: 90%;
            padding: 10px;
            border-radius: 6px;
            border: none;
            outline: none;
            margin-bottom: 15px;
            font-size: 14px;
        ">
        <button id="save" class="btn" style="
            background: #0ff;
            color: #000;
            font-weight: bold;
            padding: 8px 18px;
            border-radius: 6px;
            border: none;
            cursor: pointer;
        ">Save Avatar</button>
        <p id="message" style="margin-top:12px; color:#0ff;"></p>
    `;

    avatarDisplay.appendChild(container);
    const messageEl = document.getElementById("message");

    document.getElementById("save").addEventListener("click", async () => {
        const url = document.getElementById("avatarUrlInput").value.trim();
        if (!url) {
            messageEl.textContent = "Please enter a valid URL!";
            return;
        }

        showLoading("Saving avatar, please wait...");

        try {
            const res = await fetch("/download_avatar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ avatar_url: url })
            });
            const data = await res.json();
            hideLoading();

            if (data.status === "saved") {
                showLoading("Avatar saved successfully! Rendering...");
                setTimeout(() => container.remove(), 1000);

                // Render the avatar using the saved URL
                viewAvatar();
                captureFrontVideo();
            } else {
                avatarDisplay.textContent = "Failed to save avatar: " + data.msg;
            }
        } catch (err) {
            hideLoading();
            console.error(err);
            avatarDisplay.textContent = "Error saving avatar. Check console.";
        }
    });
}

async function viewAvatar() {
    const avatarDisplay = document.getElementById("avatarDisplay");
    avatarDisplay.innerHTML = "";
    showLoading("Loading your avatar...");

    try {
        const res = await fetch("/get_avatar_url");
        const data = await res.json();
        const avatarUrl = data.avatar_url;
        console.log("Fetched avatar URL:", avatarUrl);

        if (!avatarUrl) {
            avatarDisplay.innerHTML = "<p style='color:#f00;text-align:center;'>No avatar URL found.</p>";
            hideLoading();
            return;
        }
        hideLoading();
        // Create model-viewer dynamically
        const viewer = document.createElement("model-viewer");
        viewer.id = "avatarViewer";
        viewer.src = avatarUrl;       // use the saved URL
        viewer.style.width = "100%";
        viewer.style.height = "500px";
        viewer.cameraControls = true;
        viewer.autoRotate = false; // stop rotation for front view

        avatarDisplay.appendChild(viewer);

       
    } catch (err) {
        hideLoading();
        console.error(err);
        avatarDisplay.innerHTML = "<p style='color:#f00;text-align:center;'>Failed to load avatar.</p>";
    }
}
async function convertGLBtoMP4() {  
  showLoading("Generating lipsynced presentation...");
  let avatarUrl;

  try {
    // Fetch avatar URL from your backend
    const res = await fetch("/get_avatar_url");
    const data = await res.json();
    avatarUrl = data.avatar_url;
    console.log("Fetched avatar URL:", avatarUrl);

    if (!avatarUrl) {
      console.log("No avatar URL found for conversion.");
      return;
    }
  } catch (err) {
    console.error("Error fetching avatar URL:", err);
    return;
  }

  try {
    // Fetch the actual GLB file from the URL
    const glbResponse = await fetch(avatarUrl);
    const glbBlob = await glbResponse.blob();

    const formData = new FormData();
    formData.append("file", glbBlob, "avatar.glb");

    // Send GLB file to Flask backend for conversion
    const response = await fetch("/convert_glb_to_mp4", {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error:", errorData);
      console.log("Conversion failed: " + (errorData.error || "Unknown error"));
      return;
    }

    // Convert the MP4 file to a downloadable blob
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);

    // Trigger download

    console.log("Conversion successful! MP4 downloaded.");

    // Proceed to generate lipsynced presentation
    generatePresentation();

  } catch (error) {
    console.error("Request failed:", error);
    console.log("An error occurred while converting the file.");
  }
}

async function generatePresentation() {
    showLoading("Generating lipsynced presentation...");
    try {
        const res = await fetch("wav2lip/generate_presentation", { method: "POST" });
        const data = await res.json();

        if (res.ok && data.video_path) {
            console.log("✅ Presentation created:", data.video_path);
            viewPreviousPresentation();

        } else {
            console.error("❌ Error:", data.error);
            console.log(`Error generating video: ${data.error}`);
        }
    } catch (err) {
        console.error("❌ Network or server error:", err);
        console.log("Something went wrong while generating the presentation.");
    }
}


function viewClonedVoice()
    {
    const audioURL = "/view-cloned-voice"; // the Flask route

    document.getElementById("avatarDisplay").innerHTML = `
        <div style="width:100%; height:200px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#222; border-radius:8px;">
            <h3 style="color:#fff; margin-bottom:10px;">Cloned Voice Playback</h3>
            <audio controls autoplay src="${audioURL}" style="width:80%;"></audio>
        </div>
    `;
}

// =============================
// Dashboard Button Event Listeners
// =============================
window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("createAvatarBtn").addEventListener("click", createMyAvatar);
  document.getElementById("viewAvatarBtn").addEventListener("click", viewAvatar);
  document.getElementById("saveAvatarBtn").addEventListener("click", saveAvatar);
  document.getElementById("cloneVoiceBtn").addEventListener("click", showVoiceCloneForm); 
  document.getElementById("presentationBtn").addEventListener("click", showPresentationOptions);
  document.getElementById("viewClonedVoiceBtn").addEventListener("click", () => viewClonedVoice())
    
    document.getElementById("modifyVoiceBtn").addEventListener("click", () => {
    avatarDisplay.innerHTML = `
        <h2>Modify Cloned Voice</h2>
        <form id="modifyForm">
            <label>Speed:
                <input type="number" name="speed" step="0.1" value="1.0">
            </label>
            <label>Volume (dB):
                <input type="number" name="volume" step="0.1" value="0">
            </label>
            <label>Pitch (semitones):
                <input type="number" name="pitch" step="1" value="0">
            </label>
            <label>Emotion:
                <select name="emotion">
                    <option value="">None</option>
                    <option value="happy">Happy</option>
                    <option value="sad">Sad</option>
                    <option value="angry">Angry</option>
                    <option value="calm">Calm</option>
                </select>
            </label>
            <button type="submit" class="btn">Apply Modification</button>
        </form>
        <div id="resultAudio"></div>
    `;

    const form = document.getElementById("modifyForm");
    const resultDiv = document.getElementById("resultAudio");
    const clonedVoicePath = "cloned_voices/cloned_voice.wav"; // adjust path if needed

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        showLoading("Applying modifications...");

        const payload = {
            parameter: null,  // we will send all values at once
            speed: parseFloat(form.speed.value),
            volume: parseFloat(form.volume.value),
            pitch: parseFloat(form.pitch.value),
            emotion: form.emotion.value,
            input_file: clonedVoicePath
        };

        try {
            const response = await fetch("/modify-voice", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if(result.success){
                resultDiv.innerHTML = `<p>Modified Voice:</p>
                                       <audio controls src="${result.output_url}"></audio>`;
            } else {
                resultDiv.innerHTML = `<p style="color:red;">Error: ${result.error}</p>`;
            }
        } catch(err){
            resultDiv.innerHTML = `<p style="color:red;">Request failed</p>`;
        } finally {
            hideLoading();
            viewClonedVoice();
        }
    });
});

  document.getElementById("fullscreenBtn").addEventListener("click",toggleFullScreenDisplay);
  document.getElementById("playBtn").addEventListener("click", playMedia);
  document.getElementById("pauseBtn").addEventListener("click", pauseMedia);

  document.getElementById("downloadBtn").addEventListener("click", downloadDisplayedFile);

  document.getElementById("EnableInteractiveAvatarBtn").addEventListener("click", enableInteractiveAvatar);
  document.getElementById("InteractWithAvatarBtn").addEventListener("click", loadInteractiveAvatar);
});


const chatBtn = document.getElementById('chatbotButton');
const chatWindow = document.getElementById('chatWindow');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendBtn = document.getElementById('sendBtn');
const voiceBtn = document.getElementById('voiceBtn');

chatBtn.addEventListener('click', () => {
  chatWindow.style.display = chatWindow.style.display === 'flex' ? 'none' : 'flex';
});

sendBtn.addEventListener('click', () => {
  const msg = chatInput.value.trim();
  if (!msg) return;
  appendMessage('user', msg);
  chatInput.value = '';
  sendMessageToServer(msg);
});

chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendBtn.click();
});

// 🎤 Voice input
voiceBtn.addEventListener('click', () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    appendMessage('bot', "Sorry, your browser doesn't support speech recognition.");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.start();

  recognition.onstart = () => console.log('Speech recognition started');
  recognition.onerror = (event) => {
    console.error(event.error);
    appendMessage('bot', "Voice recognition error: " + event.error);
  };
  recognition.onresult = (event) => {
    const voiceText = event.results[0][0].transcript;
    appendMessage('user', voiceText);
    sendMessageToServer(voiceText);
  };
  recognition.onend = () => console.log('Speech recognition ended');
});

// 💬 Append message to chat
function appendMessage(sender, text) {
  const msgEl = document.createElement('div');
  msgEl.className = sender === 'user' ? 'userMsg' : 'botMsg';
  msgEl.textContent = text;
  chatMessages.appendChild(msgEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return msgEl;
}

// 🧩 Send message to Flask backend
function sendMessageToServer(message) {
  // Add loading (thinking...) message
  const loadingEl = appendMessage('bot', '...');
  let dots = 1;
  const dotInterval = setInterval(() => {
    dots = (dots % 3) + 1;
    loadingEl.textContent = '.'.repeat(dots);
  }, 400);

  fetch('/chat_with_3dial', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  })
    .then(res => res.json())
    .then(data => {
      clearInterval(dotInterval);
      loadingEl.remove(); // remove the "..." once reply arrives

      appendMessage('bot', data.reply);

      if (data.action === 'navigate' && data.target) {
        triggerNavigation(data.target);
      }
    })
    .catch(err => {
      clearInterval(dotInterval);
      loadingEl.remove();
      console.error("Chat API error:", err);
      appendMessage('bot', "Sorry, there was an error.");
    });
}

// 🧭 Navigation animation (UI guidance)
function triggerNavigation(target) {
  const el = document.querySelector(`#${target}`);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.add('highlight');
  setTimeout(() => el.classList.remove('highlight'), 3000);
}

// Profile Popup Toggle
const profileImg = document.querySelector('.profile img');
const profilePopup = document.getElementById('profilePopup');

profileImg.addEventListener('click', () => {
  profilePopup.style.display =
    profilePopup.style.display === 'block' ? 'none' : 'block';
});

// Hide popup when clicking outside
document.addEventListener('click', (e) => {
  if (!profilePopup.contains(e.target) && !profileImg.contains(e.target)) {
    profilePopup.style.display = 'none';
  }
});

// =============================
// Enable interactive avatar
// =============================
async function enableInteractiveAvatar() {
    const avatarDisplay = document.getElementById("avatarDisplay");
    avatarDisplay.innerHTML = ""; // clear previous content

    // Create form
    const form = document.createElement("form");
    form.innerHTML = `
        <div id="avatarFormContainer" style="
    background: #1e1e2f;
    color: #ffffff;
    padding: 30px;
    border-radius: 16px;
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.2);
    max-width: 500px;
    margin: 20px auto;
    font-family: 'Poppins', sans-serif;
    text-align: left;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
">
  <h3 style="
      text-align: center;
      color: #00e0ff;
      margin-bottom: 20px;
  ">🧠 Enable Interactive Avatar</h3>

  <label style="display:block; font-weight:500; margin-bottom:6px; color:#b8e0ff;">Role / Profession:</label>
  <input type="text" id="role" required placeholder="e.g., Software Engineer" style="
      width: 100%;
      background: #2a2a40;
      color: #fff;
      border: 1px solid #00e0ff;
      border-radius: 8px;
      padding: 10px;
      font-size: 14px;
      outline: none;
      margin-bottom: 15px;
  ">

  <label style="display:block; font-weight:500; margin-bottom:6px; color:#b8e0ff;">Intention / Purpose of the Video:</label>
  <input type="text" id="intention" required placeholder="e.g., Explain my project" style="
      width: 100%;
      background: #2a2a40;
      color: #fff;
      border: 1px solid #00e0ff;
      border-radius: 8px;
      padding: 10px;
      font-size: 14px;
      outline: none;
      margin-bottom: 15px;
  ">

  <label style="display:block; font-weight:500; margin-bottom:6px; color:#b8e0ff;">Perspective / Tone:</label>
  <input type="text" id="perspective" required placeholder="e.g., Formal and informative" style="
      width: 100%;
      background: #2a2a40;
      color: #fff;
      border: 1px solid #00e0ff;
      border-radius: 8px;
      padding: 10px;
      font-size: 14px;
      outline: none;
      margin-bottom: 15px;
  ">

  <label style="display:block; font-weight:500; margin-bottom:6px; color:#b8e0ff;">Key Points (comma-separated):</label>
  <textarea id="keypoints" rows="4" placeholder="e.g., Introduction, Working, Results" style="
      width: 100%;
      background: #2a2a40;
      color: #fff;
      border: 1px solid #00e0ff;
      border-radius: 8px;
      padding: 10px;
      font-size: 14px;
      outline: none;
      margin-bottom: 15px;
      resize: vertical;
  "></textarea>

  <button type="submit" style="
      width: 100%;
      background: linear-gradient(90deg, #00c6ff, #0072ff);
      border: none;
      border-radius: 10px;
      color: white;
      padding: 12px;
      font-size: 16px;
      cursor: pointer;
      transition: all 0.3s ease;
  "
  onmouseover="this.style.background='linear-gradient(90deg, #00e0ff, #00aaff)'; this.style.boxShadow='0 0 15px rgba(0, 255, 255, 0.4)';"
  onmouseout="this.style.background='linear-gradient(90deg, #00c6ff, #0072ff)'; this.style.boxShadow='none';"
  >💾 Save & Enable</button>
</div>

    `;

    avatarDisplay.appendChild(form);

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const data = {
            role: document.getElementById("role").value,
            intention: document.getElementById("intention").value,
            perspective: document.getElementById("perspective").value,
            keypoints: document.getElementById("keypoints").value
        };

        try {
            const res = await fetch("/interactive/enable_interactive_avatar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (res.ok) {
                avatarDisplay.innerHTML = `
                    <p>✅ <strong>Interactive Avatar Enabled!</strong></p>
                    <p>You can now interact with your avatar using your defined context.</p>
                `;
                console.log("Interactive avatar setup complete:", result);
            } else {
                alert("Error: " + result.error);
            }
        } catch (err) {
            console.error("❌ Network error:", err);
            alert("Something went wrong while enabling the interactive avatar.");
        }
    });
}

async function loadInteractiveAvatar() {
    const avatarDisplay = document.getElementById("avatarDisplay");
    avatarDisplay.innerHTML = "";

    // Show loading while checking
    showLoading("Checking interactive avatar status...");

    try {
        const statusRes = await fetch("/check-interactive-status");
        const statusData = await statusRes.json();

        if (!statusData.enabled) {
            avatarDisplay.innerHTML = `
                <p style="color:#f00;">⚠️ Interactive avatar not set up yet. Please enable it first.</p>
                <button onclick="enableInteractiveAvatar()" class="btn">Enable Interactive Avatar</button>
            `;
            return; // wait for user to enable
        }

        // Show loading while preparing container
        showLoading("Loading interactive avatar...");

        avatarDisplay.innerHTML = `
            <video id="interactiveVideo" width="75%" controls autoplay></video><br><br>
            <div id="interactiveChat" style="
                display: flex; 
                align-items: center; 
                gap: 10px; 
                margin-top: 15px;
                background-color: #f8f9fa; 
                padding: 8px 12px; 
                border-radius: 12px; 
                box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                width: 75%;
            ">
                <input type="text" id="userQuery" placeholder="Ask your avatar..." 
                    style="
                        flex: 1; 
                        padding: 10px 14px; 
                        border-radius: 10px; 
                        border: 1px solid #ddd; 
                        font-size: 14px; 
                        outline: none;
                    ">
                <button onclick="sendInteractiveQuery()" 
                    style="
                        padding: 10px 16px; 
                        border: none; 
                        background-color: #3b82f6; 
                        color: white; 
                        border-radius: 10px; 
                        cursor: pointer; 
                        font-weight: 500;
                        transition: background-color 0.2s;
                    " 
                    onmouseover="this.style.backgroundColor='#2563eb'" 
                    onmouseout="this.style.backgroundColor='#3b82f6'">
                    Send
                </button>
                <button id="micBtn" 
                    style="
                        padding: 10px 14px; 
                        border: none; 
                        background-color: #10b981; 
                        color: white; 
                        border-radius: 50%; 
                        cursor: pointer; 
                        font-size: 16px;
                        transition: background-color 0.2s;
                    "
                    onmouseover="this.style.backgroundColor='#059669'" 
                    onmouseout="this.style.backgroundColor='#10b981'">                    
                    <i class="fa-solid fa-microphone"></i>
                </button>
            </div>
        `;

        // Render last generated interactive video if exists
        const usernameRes = await fetch("/get_username");
        const usernameData = await usernameRes.json();
        const username = usernameData.username;

        const lastVideoPath = `/user_data/interactive_profiles/${username}_interactive.mp4`;

        // Preload the last video
        const videoEl = document.getElementById("interactiveVideo");
        videoEl.src = lastVideoPath;
        videoEl.load();
        videoEl.play();

        const micBtn = document.getElementById("micBtn");
const userInput = document.getElementById("userQuery");

let recognition;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false; // stop after single utterance
    recognition.interimResults = false; // only final results
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        micBtn.style.backgroundColor = '#059669'; // indicate recording
    };

    recognition.onend = () => {
        micBtn.style.backgroundColor = '#10b981'; // revert button color
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript; // fill input box with speech
        sendInteractiveQuery(); // optionally send automatically
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        alert("Mic error: " + event.error);
    };
} else {
    micBtn.disabled = true;
    micBtn.title = "Speech recognition not supported in this browser.";
}

// Attach click listener
micBtn.addEventListener('click', () => {
    if (recognition) {
        recognition.start();
    }
});

    } catch (err) {
        avatarDisplay.innerHTML = `<p style="color:#f00;">❌ Error loading interactive avatar.</p>`;
        console.error(err);
    }
}

async function sendInteractiveQuery() {
    const query = document.getElementById("userQuery").value.trim();
    if (!query) return;

    // Show loading while AI + video processing happens
    showLoading("Generating response, please wait...");

    try {
        const res = await fetch("/interactive-query", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({query})
        });

        const data = await res.json();
        if (data.error) {
            alert("Error: " + data.error);
            return;
        }

        // Render the generated interactive video
        const avatarDisplay = document.getElementById("avatarDisplay");
        avatarDisplay.innerHTML = `
            <video id="interactiveVideo" width="75%" controls 
            src="{data.video_path}" autoplay></video><br><br>
            <div id="interactiveChat" 
            style="
                display: flex; 
                align-items: center; 
                gap: 10px; 
                margin-top: 15px;
                background-color: #f8f9fa; 
                padding: 8px 12px; 
                border-radius: 12px; 
                box-shadow: 0 2px 6px rgba(0,0,0,0.1);
                width: 75%;
            ">
                <input type="text" id="userQuery" placeholder="Ask your avatar..." 
                    style="
                        flex: 1; 
                        padding: 10px 14px; 
                        border-radius: 10px; 
                        border: 1px solid #ddd; 
                        font-size: 14px; 
                        outline: none;
                    ">
                <button onclick="sendInteractiveQuery()" 
                    style="
                        padding: 10px 16px; 
                        border: none; 
                        background-color: #3b82f6; 
                        color: white; 
                        border-radius: 10px; 
                        cursor: pointer; 
                        font-weight: 500;
                        transition: background-color 0.2s;
                    " 
                    onmouseover="this.style.backgroundColor='#2563eb'" 
                    onmouseout="this.style.backgroundColor='#3b82f6'">
                    Send
                </button>
                <button id="micBtn" 
                    style="
                        padding: 10px 14px; 
                        border: none; 
                        background-color: #10b981; 
                        color: white; 
                        border-radius: 50%; 
                        cursor: pointer; 
                        font-size: 16px;
                        transition: background-color 0.2s;
                    "
                    onmouseover="this.style.backgroundColor='#059669'" 
                    onmouseout="this.style.backgroundColor='#10b981'">
                    <i class="fa-solid fa-microphone"></i>
                </button>
            </div>
        `;

        

        // Grab references
const micBtn = document.getElementById("micBtn");
const userInput = document.getElementById("userQuery");

let recognition;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false; // stop after single utterance
    recognition.interimResults = false; // only final results
    recognition.lang = 'en-US';

    recognition.onstart = () => {
        micBtn.style.backgroundColor = '#059669'; // indicate recording
    };

    recognition.onend = () => {
        micBtn.style.backgroundColor = '#10b981'; // revert button color
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript; // fill input box with speech
        sendInteractiveQuery(); // optionally send automatically
    };

    recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        alert("Mic error: " + event.error);
    };
} else {
    micBtn.disabled = true;
    micBtn.title = "Speech recognition not supported in this browser.";
}

// Attach click listener
micBtn.addEventListener('click', () => {
    if (recognition) {
        recognition.start();
    }
});


    } catch (err) {
        const avatarDisplay = document.getElementById("avatarDisplay");
        avatarDisplay.innerHTML = `<p style="color:#f00;">❌ Error generating response.</p>`;
        console.error(err);
    }
}


function showPresentationOptions() {
    const avatarDisplay = document.getElementById("avatarDisplay");

    // Clear any previous content
    avatarDisplay.innerHTML = "";

    // Create container
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    container.style.justifyContent = "center";
    container.style.gap = "20px";
    container.style.padding = "30px";
    container.style.border = "2px dashed #ccc";
    container.style.borderRadius = "20px";
    container.style.width = "600px";
    container.style.margin = "auto";
    container.style.textAlign = "center";

    // Heading
    const heading = document.createElement("h2");
    heading.textContent = "🎥 Presentation Options";
    heading.style.marginBottom = "10px";
    container.appendChild(heading);

    // Option 1 — View Previous Video
    const prevContainer = document.createElement("div");
    const prevDesc = document.createElement("p");
    prevDesc.textContent = "Watch the most recently generated presentation video.";
    const prevBtn = document.createElement("button");
    prevBtn.textContent = "▶️ View Previous Presentation";
    prevBtn.style.padding = "10px 20px";
    prevBtn.style.border = "none";
    prevBtn.style.borderRadius = "10px";
    prevBtn.style.background = "#6c63ff";
    prevBtn.style.color = "white";
    prevBtn.style.cursor = "pointer";
    prevBtn.onclick = viewPreviousPresentation;
    prevContainer.appendChild(prevDesc);
    prevContainer.appendChild(prevBtn);

    // Option 2 — Generate New Video
    const newContainer = document.createElement("div");
    const newDesc = document.createElement("p");
    newDesc.textContent = "Generate a new lipsynced presentation using your avatar and the latest cloned voice.";
    const newBtn = document.createElement("button");
    newBtn.textContent = "⚙️ Generate New Presentation";
    newBtn.style.padding = "10px 20px";
    newBtn.style.border = "none";
    newBtn.style.borderRadius = "10px";
    newBtn.style.background = "#28a745";
    newBtn.style.color = "white";
    newBtn.style.cursor = "pointer";
    newBtn.onclick = generatePresentation;
    newContainer.appendChild(newDesc);
    newContainer.appendChild(newBtn);

    // Append all elements
    container.appendChild(prevContainer);
    container.appendChild(newContainer);

    // Add to avatarDisplay
    avatarDisplay.appendChild(container);
}


async function viewPreviousPresentation() {
  let username;
   try {
        const res = await fetch("/get_username");
        const data = await res.json();
        if (res.ok) {
          username = data.username;
        } else {
            console.error("Error:", data.error);
            return null;
        }
    } catch (err) {
        console.error("Network error:", err);
        return null;
    }
    const videoPath = `/static/presentations/${username}_presentation.mp4`;
    const avatarDisplay = document.getElementById("avatarDisplay");

    avatarDisplay.innerHTML = "<p>🎬 Loading previous presentation...</p>";

    const res = await fetch(videoPath, { method: "HEAD" });
    console.log("Fetch response for previous presentation:", res);
    if (res.ok) {
        avatarDisplay.innerHTML = "";

        const video = document.createElement("video");
        video.src = videoPath;
        video.controls = true;
        video.autoplay = false;
        video.style.width = "100%";

        avatarDisplay.appendChild(video);
    } else {
        avatarDisplay.innerHTML = "<p>⚠️ No previous presentation found. Try generating a new one!</p>";
    }
}