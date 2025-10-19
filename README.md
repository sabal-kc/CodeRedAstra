# STEM-Access Preprocessing Engine

A comprehensive accessibility preprocessing engine for STEM documents that converts PDFs and images into fully accessible formats with AI-generated image descriptions and MathML equations. Built with Mathpix API for document processing and Google Gemini for WCAG-compliant accessibility enhancements.

## 🌟 Features

### Core Functionality
- **PDF & Image Support**: Upload PDFs, PNG, JPG, JPEG, GIF, or BMP files
- **Dual Mode Operation**: 
  - **Basic Mode**: Simple Mathpix conversion to MMD/HTML
  - **STEM-Access Mode**: Full accessibility preprocessing pipeline

### STEM-Access Mode (Accessibility Pipeline)
- **🤖 AI-Powered Image Descriptions**: Gemini-generated WCAG 2.1 Level AA compliant descriptions
- **🔢 MathML Conversion**: Convert LaTeX equations to accessible MathML
- **📊 Chart & Graph Analysis**: Detailed descriptions of visual data
- **♿ Screen Reader Optimized**: Fully accessible HTML output
- **📈 Processing Metadata**: Track images processed, math conversions, and more

### User Experience
- **Beautiful UI**: Modern, responsive design with gradient colors and smooth animations
- **Drag & Drop**: Intuitive file upload with drag-and-drop support
- **Real-time Preview**: See rendered preview, raw markdown, and accessible HTML
- **Multiple Download Options**: Download markdown or fully accessible HTML
- **Progress Tracking**: Visual feedback during all processing stages
- **Mobile Responsive**: Works on all devices

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Mathpix API credentials (APP_ID and APP_KEY) - **Included**
- Google Gemini API key (for STEM-Access mode) - **Optional but recommended**

### Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd /Users/sabalkc/hackathon-codered
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables** in `.env` file:
   ```
   MATHPIX_APP_ID=codered_hackathon_56fe2b
   MATHPIX_APP_KEY=ff0bed7ad43e32610ad9316a8b6ebaec19529953041b70c943925c0c5541518d
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```
   or
   ```
   source env.sh
   ```

4. **Start the server**:
   ```bash
   npm start
   ```

5. **Open your browser** and navigate to:
   ```
   http://localhost:3000
   ```

## 📖 How to Use

### Basic Mode
1. **Toggle OFF** the STEM-Access Mode switch
2. **Select Output Format**: Choose between MMD (Markdown) or HTML
3. **Upload File**: Click to browse or drag and drop your PDF or image
4. **Convert**: Click "Convert" to get basic Mathpix output

### STEM-Access Mode (Recommended for Accessibility)
1. **Toggle ON** the STEM-Access Mode switch (enabled by default)
2. **Select Output Format**: Choose your preferred format
3. **Upload File**: Drop your STEM document (PDF or image)
4. **Processing**: The system will:
   - Convert document using Mathpix
   - Extract and analyze all images
   - Generate AI descriptions with Gemini
   - Convert LaTeX to MathML
   - Create fully accessible HTML
5. **View Results**:
   - **Preview Tab**: Rendered markdown with image descriptions
   - **Raw Markdown Tab**: Source markdown with enrichments
   - **Accessible HTML Tab**: WCAG-compliant HTML with MathML
   - **Metadata**: View processing statistics
6. **Export**:
   - **Copy**: Copy markdown to clipboard
   - **Download**: Save markdown file
   - **Download HTML**: Save fully accessible HTML document

## 🎯 STEM-Access Pipeline

The preprocessing engine implements a sophisticated pipeline for STEM document accessibility:

### Step 1: Document Deconstruction (Mathpix)
- PDFs and images are processed by Mathpix API
- Extracts structured text, tables, and equations
- Converts visual equations to LaTeX notation
- Preserves document structure

### Step 2: Image Enrichment (Gemini AI)
- Identifies all images in the document
- Each image is analyzed by Google Gemini
- Generates comprehensive, WCAG-compliant descriptions including:
  - Overview of visual content
  - Data trends and patterns
  - Specific values and measurements
  - Technical terminology in context

### Step 3: Math Accessibility (MathML)
- LaTeX equations are converted to MathML
- Both inline and display math supported
- Screen reader compatible
- Preserves mathematical semantics

### Step 4: Accessible HTML Generation
- Creates fully structured HTML5 document
- Semantic HTML tags for proper navigation
- ARIA labels for enhanced accessibility
- Embedded CSS for consistent rendering
- Image descriptions integrated inline

## 🎨 Screenshots

The app features a beautiful gradient purple theme with:
- Clean, modern interface
- Smooth animations and transitions
- Responsive design for all screen sizes
- Real-time progress indicators
- Toast notifications for user feedback

## 🔧 Technical Details

### Backend (Node.js + Express)

- **File Upload**: Uses Multer middleware for handling multipart/form-data
- **API Integration**: Axios for making requests to Mathpix API
- **Image Conversion**: Direct processing via `/v3/text` endpoint
- **PDF Conversion**: Asynchronous processing via `/v3/pdf` endpoint with polling

### Frontend

- **Vanilla JavaScript**: No framework dependencies
- **Marked.js**: For rendering Markdown previews
- **Modern CSS**: Flexbox, gradients, animations, and transitions
- **Responsive Design**: Works on desktop, tablet, and mobile

### API Endpoints

#### POST `/api/convert-image`
Converts an image file to MMD or HTML.
- **Body**: FormData with `file` and `format` fields
- **Returns**: Converted content

#### POST `/api/convert-pdf`
Submits a PDF for conversion.
- **Body**: FormData with `file` and `format` fields
- **Returns**: PDF ID for status checking

#### GET `/api/check-pdf-status/:pdfId`
Checks the processing status of a PDF.
- **Returns**: Status information

#### GET `/api/get-pdf-result/:pdfId/:format`
Retrieves the converted PDF content.
- **Returns**: Converted content in specified format

## 📦 Project Structure

```
hackathon-codered/
├── public/
│   ├── index.html      # Main HTML file with accessibility toggle
│   ├── styles.css      # Stylesheet with new UI elements
│   └── app.js          # Frontend JavaScript with preprocessing
├── uploads/            # Temporary file storage (auto-created)
├── server.js           # Express server with preprocessing endpoint
├── preprocessor.js     # Accessibility preprocessing pipeline
├── package.json        # Dependencies
├── .env                # Environment variables (API credentials)
├── .env.example        # Environment template
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## 🔐 API Credentials

### Mathpix API (Required)
The application is pre-configured with your Mathpix API credentials:
- **APP_ID**: `codered_hackathon_56fe2b`
- **APP_KEY**: `ff0bed7ad43e32610ad9316a8b6ebaec19529953041b70c943925c0c5541518d`

### Gemini API (Required for STEM-Access Mode)
To enable AI-powered image descriptions:
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Create a new API key
4. Add it to your `.env` file:
   ```
   GEMINI_API_KEY=your_actual_api_key_here
   ```

**Note**: Without a Gemini API key, STEM-Access mode will process documents but skip image description generation.

## 🛠️ Development

To run in development mode with auto-reload:

```bash
npm run dev
```

This uses `nodemon` to automatically restart the server when files change.

## 📝 Notes

- **File Size Limit**: Maximum upload size is 50MB
- **Supported Formats**: 
  - Input: PDF, PNG, JPG, JPEG, GIF, BMP
  - Output: MMD (Mathpix Markdown), HTML, or Accessible HTML
- **PDF Processing**: PDFs are processed asynchronously and may take 10-30 seconds
- **Image Descriptions**: Each image adds ~2-3 seconds to processing time
- **Temporary Files**: Uploaded files are automatically deleted after processing
- **MathML Support**: Most modern browsers and screen readers support MathML
- **WCAG Compliance**: Accessible HTML output meets WCAG 2.1 Level AA standards

## 🔬 Use Cases

This preprocessing engine is perfect for:
- **Educational Institutions**: Making STEM textbooks and materials accessible
- **Research**: Converting academic papers for accessibility compliance
- **Documentation**: Creating accessible technical documentation
- **Publishing**: Preparing scientific content for inclusive audiences
- **LMS Integration**: Pre-processing documents before adding to learning platforms
- **Knowledge Bases**: Building accessible STEM content repositories

## 🤝 Contributing

Feel free to fork this project and submit pull requests for any improvements!

## 📄 License

MIT License - feel free to use this project for your hackathon or personal projects.

## 🔗 Resources

- [Mathpix API Documentation](https://docs.mathpix.com/)
- [Mathpix Console](https://mathpix.com/console)
- [Google Gemini API](https://ai.google.dev/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MathML Specification](https://www.w3.org/Math/)
- [Mathpix Markdown Specification](https://mathpix.com/docs/mathpix-markdown/overview)

## 🚀 API Endpoints

### `/api/convert-image` (POST)
Basic image conversion using Mathpix

### `/api/convert-pdf` (POST)
Basic PDF conversion using Mathpix (async)

### `/api/preprocess-document` (POST)
**Full STEM-Access preprocessing pipeline**
- Converts document with Mathpix
- Generates AI image descriptions
- Converts LaTeX to MathML
- Returns enriched markdown and accessible HTML

## 🎉 Ready for Production!

This STEM-Access preprocessing engine is fully functional and ready to integrate into your accessibility pipeline. Perfect for:
- insights-lm-public integration
- LMS platforms
- Document management systems
- Accessibility services
- Educational technology

Transform STEM education with accessible content! 🚀♿📚
