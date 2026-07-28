// ZXing Barcode & QR Reader Engine
document.addEventListener('DOMContentLoaded', () => {
  // HTML Elements Reference
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const btnUpload = document.getElementById('btn-upload');
  const btnCamera = document.getElementById('btn-camera');
  const btnPaste = document.getElementById('btn-paste');
  const resultContainer = document.getElementById('result-container');
  const badgeFormat = document.getElementById('badge-format');
  const historyList = document.getElementById('history-list');

  // Initialize ZXing MultiFormat Reader
  const codeReader = new ZXing.BrowserMultiFormatReader();

  // Load Saved History
  loadHistory();

  // 1. File Upload Triggers
  btnUpload.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      processImageFile(e.target.files[0]);
    }
  });

  // 2. Drag & Drop Handlers
  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag-over');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag-over');
    }, false);
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) processImageFile(files[0]);
  });

  // 3. Clipboard Paste Support (Ctrl + V)
  window.addEventListener('paste', (e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (let item of items) {
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        processImageFile(item.getAsFile());
        break;
      }
    }
  });

  btnPaste.addEventListener('click', async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            processImageFile(blob);
            return;
          }
        }
      }
      alert('Clipboard me koi image nahi mili!');
    } catch (err) {
      alert('Image paste karne ke liye Keyboard se Ctrl + V press karein.');
    }
  });

  // 4. Live Camera Scanning
  let isCameraActive = false;
  btnCamera.addEventListener('click', async () => {
    if (isCameraActive) {
      codeReader.reset();
      btnCamera.innerText = 'Open Camera';
      isCameraActive = false;
      return;
    }

    try {
      const videoInputDevices = await codeReader.listVideoInputDevices();
      if (videoInputDevices.length === 0) {
        alert('Device par camera nahi mila.');
        return;
      }
      
      const selectedDeviceId = videoInputDevices[0].deviceId;
      resultContainer.innerHTML = `<p class="text-xs text-emerald-400 animate-pulse">Camera active hai... Scan ho raha hai...</p>`;
      btnCamera.innerText = 'Stop Camera';
      isCameraActive = true;

      codeReader.decodeFromVideoDevice(selectedDeviceId, undefined, (result) => {
        if (result) {
          handleScanSuccess(result.getText(), result.getBarcodeFormat());
          codeReader.reset();
          btnCamera.innerText = 'Open Camera';
          isCameraActive = false;
        }
      });
    } catch (err) {
      alert('Camera access error: ' + err);
    }
  });

  // 5. Decode Image File
  function processImageFile(file) {
    const imgUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = imgUrl;

    resultContainer.innerHTML = `<p class="text-xs text-slate-400 animate-pulse">Barcode decode ho raha hai...</p>`;

    img.onload = () => {
      codeReader.decodeFromImageElement(img)
        .then(result => {
          handleScanSuccess(result.getText(), result.getBarcodeFormat());
          URL.revokeObjectURL(imgUrl);
        })
        .catch(() => {
          resultContainer.innerHTML = `
            <div class="text-center space-y-1">
              <p class="text-xs font-semibold text-rose-400">❌ Image me barcode read nahi ho saka.</p>
              <p class="text-[10px] text-slate-500">Koshish karein image saaf aur clear ho.</p>
            </div>`;
          badgeFormat.innerText = "Error";
          URL.revokeObjectURL(imgUrl);
        });
    };
  }

  // 6. Dynamic Smart Result Actions
  function handleScanSuccess(rawText, format) {
    badgeFormat.innerText = format || "DECODED";
    saveToHistory(rawText);

    // Wi-Fi QR Code Parser
    if (rawText.startsWith('WIFI:')) {
      const ssid = rawText.match(/S:(.*?);/)?.[1] || 'Unknown';
      const password = rawText.match(/P:(.*?);/)?.[1] || '';
      const security = rawText.match(/T:(.*?);/)?.[1] || 'WPA';

      resultContainer.innerHTML = `
        <div class="w-full space-y-3 text-left">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2">
            <span class="text-xs font-bold text-emerald-400">📶 Wi-Fi QR Code</span>
            <span class="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">${security}</span>
          </div>
          <div>
            <p class="text-[10px] text-slate-500 font-semibold">NETWORK NAME (SSID)</p>
            <p class="text-sm font-bold text-slate-200">${ssid}</p>
          </div>
          <div>
            <p class="text-[10px] text-slate-500 font-semibold">PASSWORD</p>
            <div class="flex items-center gap-2 mt-0.5">
              <input type="password" id="wifi-pass-field" value="${password}" readonly class="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-emerald-400 font-mono w-full focus:outline-none">
              <button id="btn-toggle-pass" class="text-xs bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded text-slate-300">Show</button>
            </div>
          </div>
          <button id="btn-copy-wifi" class="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition">
            📋 Copy Password
          </button>
        </div>
      `;

      document.getElementById('btn-toggle-pass').addEventListener('click', (e) => {
        const field = document.getElementById('wifi-pass-field');
        if (field.type === 'password') {
          field.type = 'text';
          e.target.innerText = 'Hide';
        } else {
          field.type = 'password';
          e.target.innerText = 'Show';
        }
      });

      document.getElementById('btn-copy-wifi').addEventListener('click', () => {
        navigator.clipboard.writeText(password);
        alert('Password copy ho gaya!');
      });

      return;
    }

    // Web URL Parser
    if (rawText.startsWith('http://') || rawText.startsWith('https://')) {
      resultContainer.innerHTML = `
        <div class="w-full space-y-3 text-left">
          <div class="flex items-center justify-between border-b border-slate-800 pb-2">
            <span class="text-xs font-bold text-emerald-400">🔗 Web Link Found</span>
          </div>
          <p class="text-xs font-mono text-slate-300 break-all bg-slate-900 p-2 rounded border border-slate-800">${rawText}</p>
          <div class="grid grid-cols-2 gap-2">
            <a href="${rawText}" target="_blank" rel="noopener noreferrer" class="py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl text-center shadow-lg">Open Link</a>
            <button id="btn-copy-raw" class="py-2 bg-slate-800 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700">Copy Link</button>
          </div>
        </div>
      `;

      document.getElementById('btn-copy-raw').addEventListener('click', () => {
        navigator.clipboard.writeText(rawText);
        alert('URL copy ho gaya!');
      });

      return;
    }

    // Default Plain Text / Barcode Numbers
    resultContainer.innerHTML = `
      <div class="w-full space-y-3 text-left">
        <div class="border-b border-slate-800 pb-2">
          <span class="text-xs font-bold text-slate-400">📄 Decoded Result</span>
        </div>
        <p class="text-xs font-mono text-emerald-400 break-all bg-slate-900 p-2.5 rounded-xl border border-slate-800">${rawText}</p>
        <button id="btn-copy-text" class="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition">
          📋 Copy Text
        </button>
      </div>
    `;

    document.getElementById('btn-copy-text').addEventListener('click', () => {
      navigator.clipboard.writeText(rawText);
      alert('Content copy ho gaya!');
    });
  }

  // 7. Local Storage History Manager
  function saveToHistory(text) {
    let history = JSON.parse(localStorage.getItem('zxing_history') || '[]');
    if (!history.includes(text)) {
      history.unshift(text);
      if (history.length > 5) history.pop();
      localStorage.setItem('zxing_history', JSON.stringify(history));
      loadHistory();
    }
  }

  function loadHistory() {
    let history = JSON.parse(localStorage.getItem('zxing_history') || '[]');
    if (history.length === 0) {
      historyList.innerHTML = `<p class="text-[11px] text-slate-600 italic">Abhi tak koi history nahi hai.</p>`;
      return;
    }

    historyList.innerHTML = history.map(item => `
      <div class="p-1.5 bg-slate-900 rounded border border-slate-800 truncate text-[11px] text-slate-300 hover:text-emerald-400 cursor-pointer" onclick="navigator.clipboard.writeText('${item.replace(/'/g, "\\'")}'); alert('Copied!');">
        ${item}
      </div>
    `).join('');
  }
});
