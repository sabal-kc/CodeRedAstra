// Global state
let selectedFile = null;
let outputFormat = 'mmd';
let currentOutput = null;

// DOM elements
const uploadContainer = document.getElementById('uploadContainer');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeBtn = document.getElementById('removeBtn');
const convertBtn = document.getElementById('convertBtn');
const progressContainer = document.getElementById('progressContainer');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const outputSection = document.getElementById('outputSection');
const previewContent = document.getElementById('previewContent');
const rawContent = document.getElementById('rawContent');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const notification = document.getElementById('notification');

// Format selector
document.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.format-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        outputFormat = btn.dataset.format;
    });
});

// Tab switcher
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
    });
});

// File upload handlers
uploadContainer.addEventListener('click', () => fileInput.click());
browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// Drag and drop
uploadContainer.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadContainer.classList.add('drag-over');
});

uploadContainer.addEventListener('dragleave', () => {
    uploadContainer.classList.remove('drag-over');
});

uploadContainer.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadContainer.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
    }
});

// Handle file selection
function handleFile(file) {
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp'];
    
    if (!allowedTypes.includes(file.type)) {
        showNotification('Please select a valid PDF or image file', 'error');
        return;
    }

    selectedFile = file;
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    uploadContainer.style.display = 'none';
    fileInfo.style.display = 'flex';
    convertBtn.disabled = false;
}

// Remove file
removeBtn.addEventListener('click', () => {
    selectedFile = null;
    fileInput.value = '';
    uploadContainer.style.display = 'block';
    fileInfo.style.display = 'none';
    convertBtn.disabled = true;
    outputSection.style.display = 'none';
});

// Convert button
convertBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    const isPDF = selectedFile.type === 'application/pdf';
    
    convertBtn.disabled = true;
    progressContainer.style.display = 'block';
    outputSection.style.display = 'none';

    try {
        if (isPDF) {
            await convertPDF();
        } else {
            await convertImage();
        }
    } catch (error) {
        showNotification('Conversion failed: ' + error.message, 'error');
    } finally {
        convertBtn.disabled = false;
        progressContainer.style.display = 'none';
    }
});

// Convert image
async function convertImage() {
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('format', outputFormat);

    progressText.textContent = 'Converting image...';
    progressFill.style.width = '50%';

    const response = await fetch('/api/convert-image', {
        method: 'POST',
        body: formData
    });

    const result = await response.json();

    if (!result.success) {
        throw new Error(result.details || 'Conversion failed');
    }

    progressFill.style.width = '100%';
    
    // Extract the content based on format
    let content = '';
    if (outputFormat === 'mmd') {
        // For markdown/mmd, use text field which contains markdown
        content = result.data.text || result.data.latex_styled || '';
    } else if (outputFormat === 'html') {
        content = result.data.html || '';
    }

    displayOutput(content);
    showNotification('Image converted successfully!', 'success');
}

// Convert PDF
async function convertPDF() {
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('format', outputFormat);

    progressText.textContent = 'Uploading PDF...';
    progressFill.style.width = '30%';

    const submitResponse = await fetch('/api/convert-pdf', {
        method: 'POST',
        body: formData
    });

    const submitResult = await submitResponse.json();

    console.log('Submit result:', submitResult);

    if (!submitResult.success) {
        throw new Error(submitResult.details || 'PDF upload failed');
    }

    const pdfId = submitResult.pdf_id;
    
    if (!pdfId) {
        throw new Error('No PDF ID received from server. Response: ' + JSON.stringify(submitResult));
    }
    
    progressText.textContent = 'Processing PDF...';
    progressFill.style.width = '60%';

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts * 2 seconds = 2 minutes max
    
    while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResponse = await fetch(`/api/check-pdf-status/${pdfId}`);
        const statusResult = await statusResponse.json();

        if (statusResult.success && statusResult.data.status === 'completed') {
            progressText.textContent = 'Retrieving result...';
            progressFill.style.width = '90%';

            const resultResponse = await fetch(`/api/get-pdf-result/${pdfId}/${outputFormat}`);
            const resultData = await resultResponse.json();

            if (resultData.success) {
                progressFill.style.width = '100%';
                let content = '';
                
                if (typeof resultData.content === 'string') {
                    content = resultData.content;
                } else if (typeof resultData.content === 'object') {
                    content = JSON.stringify(resultData.content, null, 2);
                }

                displayOutput(content);
                showNotification('PDF converted successfully!', 'success');
                return;
            }
        } else if (statusResult.success && statusResult.data.status === 'error') {
            throw new Error('PDF processing failed');
        }

        attempts++;
        progressText.textContent = `Processing PDF... (${Math.round((60 + attempts) / maxAttempts * 30)}%)`;
    }

    throw new Error('PDF processing timeout');
}

// Display output
function displayOutput(content) {
    currentOutput = content;
    
    // Display raw content
    rawContent.textContent = content;
    
    // Display preview
    if (outputFormat === 'mmd') {
        // Use marked.js to render markdown
        previewContent.innerHTML = marked.parse(content);
    } else if (outputFormat === 'html') {
        previewContent.innerHTML = content;
    }
    
    outputSection.style.display = 'block';
    outputSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Copy to clipboard
copyBtn.addEventListener('click', () => {
    if (!currentOutput) return;
    
    navigator.clipboard.writeText(currentOutput).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy', 'error');
    });
});

// Download file
downloadBtn.addEventListener('click', () => {
    if (!currentOutput) return;
    
    const extension = outputFormat === 'mmd' ? 'md' : 'html';
    const blob = new Blob([currentOutput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `converted.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('File downloaded!', 'success');
});

// Helper functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function showNotification(message, type = 'info') {
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

