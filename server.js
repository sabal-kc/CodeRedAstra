const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Mathpix API configuration
const MATHPIX_APP_ID = process.env.MATHPIX_APP_ID;
const MATHPIX_APP_KEY = process.env.MATHPIX_APP_KEY;

// Helper function to convert file to base64
function fileToBase64(filePath) {
  const fileData = fs.readFileSync(filePath);
  return fileData.toString('base64');
}

// Route to convert image to MMD/HTML
app.post('/api/convert-image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const base64Image = fileToBase64(filePath);
    const outputFormat = req.body.format || 'mmd';
    
    // Map frontend format names to Mathpix API format names for /v3/text endpoint
    const formatMap = {
      'mmd': 'text',  // For images, get text which includes markdown
      'html': 'html'
    };
    
    const mathpixFormat = formatMap[outputFormat] || 'text';

    // Call Mathpix API
    const response = await axios.post(
      'https://api.mathpix.com/v3/text',
      {
        src: `data:${req.file.mimetype};base64,${base64Image}`,
        formats: [mathpixFormat, 'latex_styled']
      },
      {
        headers: {
          'app_id': MATHPIX_APP_ID,
          'app_key': MATHPIX_APP_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      data: response.data,
      format: outputFormat
    });

  } catch (error) {
    console.error('Error converting image:', error.response?.data || error.message);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: 'Failed to convert image',
      details: error.response?.data?.error || error.message
    });
  }
});

// Route to convert PDF to MMD/HTML
app.post('/api/convert-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const outputFormat = req.body.format || 'mmd';
    
    // Map frontend format names to Mathpix API format names
    const formatMap = {
      'mmd': 'md',
      'html': 'html'
    };
    
    const mathpixFormat = formatMap[outputFormat] || 'md';

    // Create form data for PDF upload
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    formData.append('options_json', JSON.stringify({
      conversion_formats: {
        [mathpixFormat]: true,
        docx: true
      }
    }));

    // Submit PDF for processing
    const submitResponse = await axios.post(
      'https://api.mathpix.com/v3/pdf',
      formData,
      {
        headers: {
          'app_id': MATHPIX_APP_ID,
          'app_key': MATHPIX_APP_KEY,
          ...formData.getHeaders()
        }
      }
    );

    console.log('Mathpix PDF response:', JSON.stringify(submitResponse.data, null, 2));

    const pdfId = submitResponse.data.pdf_id;

    if (!pdfId) {
      // Clean up uploaded file
      fs.unlinkSync(filePath);
      return res.status(500).json({ 
        error: 'Failed to get PDF ID from Mathpix',
        details: 'No pdf_id returned in response',
        response: submitResponse.data
      });
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      pdf_id: pdfId,
      message: 'PDF submitted for processing. Use /api/check-pdf-status to check status.'
    });

  } catch (error) {
    console.error('Error converting PDF:', error.response?.data || error.message);
    console.error('Full error:', error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: 'Failed to convert PDF',
      details: error.response?.data?.error || error.response?.data || error.message,
      fullError: error.response?.data
    });
  }
});

// Route to check PDF processing status
app.get('/api/check-pdf-status/:pdfId', async (req, res) => {
  try {
    const { pdfId } = req.params;

    const response = await axios.get(
      `https://api.mathpix.com/v3/pdf/${pdfId}`,
      {
        headers: {
          'app_id': MATHPIX_APP_ID,
          'app_key': MATHPIX_APP_KEY
        }
      }
    );

    res.json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('Error checking PDF status:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to check PDF status',
      details: error.response?.data?.error || error.message
    });
  }
});

// Route to get PDF result
app.get('/api/get-pdf-result/:pdfId/:format', async (req, res) => {
  try {
    const { pdfId, format } = req.params;
    
    // Map frontend format names to Mathpix API format names
    const formatMap = {
      'mmd': 'md',
      'html': 'html'
    };
    
    const mathpixFormat = formatMap[format] || 'md';

    const response = await axios.get(
      `https://api.mathpix.com/v3/pdf/${pdfId}.${mathpixFormat}`,
      {
        headers: {
          'app_id': MATHPIX_APP_ID,
          'app_key': MATHPIX_APP_KEY
        }
      }
    );

    res.json({
      success: true,
      content: response.data
    });

  } catch (error) {
    console.error('Error getting PDF result:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to get PDF result',
      details: error.response?.data?.error || error.message
    });
  }
});

// Serve the frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

