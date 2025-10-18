# Mathpix Converter Web App

A beautiful, modern web application that converts PDFs and images into Mathpix Markdown (MMD) or HTML using the Mathpix API. Perfect for extracting mathematical equations, scientific content, and structured text from documents.

## 🌟 Features

- **PDF & Image Support**: Upload PDFs, PNG, JPG, JPEG, GIF, or BMP files
- **Dual Output Formats**: Convert to either MMD (Mathpix Markdown) or HTML
- **Beautiful UI**: Modern, responsive design with gradient colors and smooth animations
- **Drag & Drop**: Intuitive file upload with drag-and-drop support
- **Real-time Preview**: See both rendered preview and raw output
- **Copy & Download**: Easily copy to clipboard or download results
- **Progress Tracking**: Visual feedback during conversion process

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Mathpix API credentials (APP_ID and APP_KEY)

### Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd /Users/sabalkc/hackathon-codered
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment variables are already configured** in `.env` file:
   ```
   MATHPIX_APP_ID=codered_hackathon_56fe2b
   MATHPIX_APP_KEY=ff0bed7ad43e32610ad9316a8b6ebaec19529953041b70c943925c0c5541518d
   PORT=3000
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

1. **Select Output Format**: Choose between MMD (Markdown) or HTML format
2. **Upload File**: Click to browse or drag and drop your PDF or image
3. **Convert**: Click the "Convert" button to process your file
4. **View Results**: 
   - Switch between Preview and Raw tabs
   - Preview shows rendered output
   - Raw shows the actual MMD or HTML code
5. **Export**:
   - Click "Copy" to copy the output to clipboard
   - Click "Download" to save the output as a file

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
│   ├── index.html      # Main HTML file
│   ├── styles.css      # Stylesheet
│   └── app.js          # Frontend JavaScript
├── uploads/            # Temporary file storage (auto-created)
├── server.js           # Express server
├── package.json        # Dependencies
├── .env                # Environment variables (API credentials)
├── .env.example        # Environment template
├── .gitignore          # Git ignore rules
└── README.md           # This file
```

## 🔐 API Credentials

The application is pre-configured with your Mathpix API credentials:
- **APP_ID**: `codered_hackathon_56fe2b`
- **APP_KEY**: `ff0bed7ad43e32610ad9316a8b6ebaec19529953041b70c943925c0c5541518d`

These credentials are stored in the `.env` file and loaded using the `dotenv` package.

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
  - Output: MMD (Mathpix Markdown) or HTML
- **PDF Processing**: PDFs are processed asynchronously and may take a few seconds
- **Temporary Files**: Uploaded files are automatically deleted after processing

## 🤝 Contributing

Feel free to fork this project and submit pull requests for any improvements!

## 📄 License

MIT License - feel free to use this project for your hackathon or personal projects.

## 🔗 Resources

- [Mathpix API Documentation](https://docs.mathpix.com/)
- [Mathpix Console](https://mathpix.com/console)
- [Mathpix Markdown Specification](https://mathpix.com/docs/mathpix-markdown/overview)

## 🎉 Hackathon Ready!

This app is fully functional and ready to demo at your hackathon. Enjoy converting those PDFs and images! 🚀
