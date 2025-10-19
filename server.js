const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import preprocessing pipeline
const preprocessor = require('./preprocessor');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini API for image descriptions
if (process.env.GEMINI_API_KEY) {
  preprocessor.initializeGemini(process.env.GEMINI_API_KEY);
  console.log('Gemini API initialized for image descriptions');
} else {
  console.warn('GEMINI_API_KEY not found - image descriptions will be disabled');
}

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

// NEW: Full preprocessing pipeline endpoint
app.post('/api/preprocess-document', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const outputFormat = req.body.format || 'mmd';
    const generateDescriptions = req.body.generateDescriptions !== 'false';
    const documentTitle = req.body.title || req.file.originalname;
    const isPDF = req.file.mimetype === 'application/pdf';

    console.log(`Starting preprocessing for: ${documentTitle}`);

    let markdownContent = '';

    // Step 1: Convert to Markdown using Mathpix
    if (isPDF) {
      console.log('Processing PDF with Mathpix...');
      
      // Create form data for PDF upload
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      formData.append('options_json', JSON.stringify({
        conversion_formats: {
          html: true,
          md: true
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

      const pdfId = submitResponse.data.pdf_id;

      if (!pdfId) {
        fs.unlinkSync(filePath);
        return res.status(500).json({ 
          error: 'Failed to get PDF ID from Mathpix',
          details: 'No pdf_id returned in response'
        });
      }

      // Poll for completion
      let attempts = 0;
      const maxAttempts = 60;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const statusResponse = await axios.get(
          `https://api.mathpix.com/v3/pdf/${pdfId}`,
          {
            headers: {
              'app_id': MATHPIX_APP_ID,
              'app_key': MATHPIX_APP_KEY
            }
          }
        );

        if (statusResponse.data.status === 'completed') {
          // Get HTML result if format is html, otherwise markdown
          const fileExtension = outputFormat === 'html' ? 'html' : 'md';
          const resultResponse = await axios.get(
            `https://api.mathpix.com/v3/pdf/${pdfId}.${fileExtension}`,
            {
              headers: {
                'app_id': MATHPIX_APP_ID,
                'app_key': MATHPIX_APP_KEY
              }
            }
          );

          markdownContent = typeof resultResponse.data === 'string' 
            ? resultResponse.data 
            : JSON.stringify(resultResponse.data);
          break;
        } else if (statusResponse.data.status === 'error') {
          fs.unlinkSync(filePath);
          return res.status(500).json({ 
            error: 'PDF processing failed',
            details: statusResponse.data.error || 'Unknown error'
          });
        }

        attempts++;
      }

      if (!markdownContent) {
        fs.unlinkSync(filePath);
        return res.status(500).json({ 
          error: 'PDF processing timeout',
          details: 'Document took too long to process'
        });
      }
    } else {
      // Process image
      console.log('Processing image with Mathpix...');
      
      const base64Image = fs.readFileSync(filePath).toString('base64');
      
      const response = await axios.post(
        'https://api.mathpix.com/v3/text',
        {
          src: `data:${req.file.mimetype};base64,${base64Image}`,
          formats: ['text', 'latex_styled']
        },
        {
          headers: {
            'app_id': MATHPIX_APP_ID,
            'app_key': MATHPIX_APP_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      markdownContent = response.data.text || response.data.latex_styled || '';
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    console.log('Mathpix conversion complete. Starting accessibility preprocessing...');

    // Step 2: Run through preprocessing pipeline
    const preprocessingResult = await preprocessor.preprocessDocument(markdownContent, {
      title: documentTitle,
      generateDescriptions: generateDescriptions,
      format: outputFormat
    });

    console.log('Preprocessing complete!');

    res.json({
      success: true,
      data: {
        originalMarkdown: preprocessingResult.originalContent,
        enrichedMarkdown: preprocessingResult.enrichedMarkdown,
        accessibleHTML: preprocessingResult.accessibleHTML,
        images: preprocessingResult.images,
        mathConversions: preprocessingResult.mathConversions,
        metadata: preprocessingResult.metadata
      }
    });

  } catch (error) {
    console.error('Error in preprocessing pipeline:', error.response?.data || error.message);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ 
      error: 'Failed to preprocess document',
      details: error.response?.data?.error || error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

