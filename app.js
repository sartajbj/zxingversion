document.addEventListener('DOMContentLoaded', () => {
    const codeReader = new ZXing.BrowserMultiFormatReader();
    
    // UI Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const btnUpload = document.getElementById('btn-upload');
    const btnCamera = document.getElementById('btn-camera');
    const btnPaste = document.getElementById('btn-paste');
    const btnStopCamera = document.getElementById('btn-stop-camera');
    
    const cameraContainer = document.getElementById('camera-container');
    const videoPreview = document.getElementById('video-preview');
    
    const resultCard = document.getElementById('result-card');
    const resultText = document.getElementById('result-text');
    const resultType = document.getElementById('result-type');
    const btnCopy = document.getElementById('btn-copy');
    const btnOpenLink = document.getElementById('btn-open-link');
    const btnShare = document.getElementById('btn-share');

    let activeStream = null;

    // File Upload Handlers
    btnUpload.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            decodeImageFile(e.target.files[0]);
        }
    });

    // Drag & Drop Handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#10b981';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '#cbd5e1';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#cbd5e1';
        if (e.dataTransfer.files.length > 0) {
            decodeImageFile(e.dataTransfer.files[0]);
        }
    });

    // Clipboard Paste Handler
    btnPaste.addEventListener('click', pasteFromClipboard);
    window.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                decodeImageFile(file);
            }
        }
    });

    async function pasteFromClipboard() {
        try {
            const clipboardItems = await navigator.clipboard.read();
            for (const item of clipboardItems) {
                const imageType = item.types.find(type => type.startsWith('image/'));
                if (imageType) {
                    const blob = await item.getType(imageType);
                    decodeImageFile(blob);
                    return;
                }
            }
            alert('No image found in clipboard.');
        } catch (err) {
            alert('Clipboard access denied. Try pressing Ctrl + V.');
        }
    }

    // Decode Function
    function decodeImageFile(file) {
        const imgUrl = URL.createObjectURL(file);
        codeReader.decodeFromImageUrl(imgUrl)
            .then((result) => {
                showResult(result.text, result.format);
            })
            .catch(() => {
                showResult('Could not detect a valid barcode or QR code. Please try a clearer image.', 'ERROR');
            })
            .finally(() => {
                URL.revokeObjectURL(imgUrl);
            });
    }

    // Camera Scan Logic
    btnCamera.addEventListener('click', async () => {
        cameraContainer.style.display = 'block';
        try {
            codeReader.decodeFromVideoDevice(undefined, 'video-preview', (result, err) => {
                if (result) {
                    showResult(result.text, result.format);
                    stopCamera();
                }
            });
        } catch (err) {
            alert('Camera permission denied or camera not found.');
            cameraContainer.style.display = 'none';
        }
    });

    btnStopCamera.addEventListener('click', stopCamera);

    function stopCamera() {
        codeReader.reset();
        cameraContainer.style.display = 'none';
    }

    // Display Output Handling
    function showResult(text, format) {
        resultCard.style.display = 'block';
        resultText.textContent = text;
        resultType.textContent = format || 'SCAN';

        if (isValidURL(text)) {
            btnOpenLink.href = text;
            btnOpenLink.style.display = 'inline-flex';
        } else {
            btnOpenLink.style.display = 'none';
        }

        resultCard.scrollIntoView({ behavior: 'smooth' });
    }

    function isValidURL(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Copy to Clipboard
    btnCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(resultText.textContent).then(() => {
            const originalText = btnCopy.textContent;
            btnCopy.textContent = 'Copied!';
            setTimeout(() => btnCopy.textContent = originalText, 2000);
        });
    });

    // Share Web API
    btnShare.addEventListener('click', () => {
        if (navigator.share) {
            navigator.share({
                title: 'ZXing Scan Result',
                text: resultText.textContent
            });
        } else {
            alert('Sharing is not supported on this browser.');
        }
    });
});
