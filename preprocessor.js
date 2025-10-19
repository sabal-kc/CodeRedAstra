const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const cheerio = require('cheerio');
const { runAccessibilityTests, compareAccessibilityResults } = require('./accessibility-checker');

// Initialize Gemini AI
let genAI = null;
let model = null;

function initializeGemini(apiKey) {
  if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
    // Use the latest Gemini 2.5 Flash model
    model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    console.log('Initialized Gemini with model: gemini-2.5-flash');
  }
}

/**
 * Extract image URLs from Mathpix Markdown content
 */
function extractImageReferences(markdownContent) {
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const images = [];
  let match;
  
  while ((match = imageRegex.exec(markdownContent)) !== null) {
    images.push({
      altText: match[1] || '',
      url: match[2],
      originalMarkdown: match[0]
    });
  }
  
  return images;
}

/**
 * Generate WCAG-compliant alt text for an image using Gemini
 */
async function generateImageDescription(imageUrl, context = '') {
  if (!genAI) {
    console.warn('Gemini API not initialized. Using default description.');
    return 'Image description unavailable - Gemini API not configured';
  }

  try {
    // Use the latest Gemini 2.5 Flash model
    const currentModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    let imageData;
    
    // Check if it's a URL or base64
    if (imageUrl.startsWith('http')) {
      // Download image
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000
      });
      imageData = {
        inlineData: {
          data: Buffer.from(response.data).toString('base64'),
          mimeType: response.headers['content-type'] || 'image/png'
        }
      };
    } else if (imageUrl.startsWith('data:')) {
      // Extract base64 data
      const matches = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        imageData = {
          inlineData: {
            data: matches[2],
            mimeType: matches[1]
          }
        };
      }
    }

    if (!imageData) {
      return 'Image could not be processed';
    }

    const prompt = `Generate a concise, WCAG-compliant image description for this STEM document image.

Context: ${context || 'Scientific/technical document'}

Requirements:
- 2-3 sentences maximum
- Focus on key visual elements and data
- Use clear, accessible language
- Include important values/measurements
- Suitable for screen readers

Provide only the description text.`;

    const result = await currentModel.generateContent([prompt, imageData]);
    const response = await result.response;
    const description = response.text();
    
    return description.trim();
  } catch (error) {
    console.error('Error generating image description:', error.message);
    return `Image description unavailable: ${error.message}`;
  }
}

/**
 * Process content and add image descriptions - works with both HTML and Markdown
 */
async function enrichContentWithImageDescriptions(content, isHTML = false) {
  console.log(`Processing ${isHTML ? 'HTML' : 'Markdown'} for image descriptions...`);
  
  let enrichedContent = content;
  let images = [];
  
  if (isHTML) {
    // For HTML content, use cheerio to find images
    const $ = cheerio.load(content);
    const imgElements = $('img');
    
    if (imgElements.length > 0 && model) {
      console.log(`Found ${imgElements.length} images in HTML, generating descriptions...`);
      
      for (let i = 0; i < imgElements.length; i++) {
        const $img = $(imgElements[i]);
        const src = $img.attr('src');
        const alt = $img.attr('alt') || '';
        
        if (src) {
          console.log(`Processing image ${i + 1}/${imgElements.length}...`);
          
          const description = await generateImageDescription(src);
          
          // Add description div after the image
          const descriptionDiv = `<div class="image-description" role="complementary" aria-label="Image description" id="img-desc-${i}">
<strong>Image Description:</strong> ${description}
</div>`;
          
          $img.after(descriptionDiv);
          
          // Update alt attribute
          $img.attr('alt', description);
          $img.attr('aria-describedby', `img-desc-${i}`);
          
          images.push({
            src: src,
            alt: alt,
            generatedDescription: description
          });
        }
      }
      
      enrichedContent = $.html();
    }
  } else {
    // For Markdown content, use existing logic
    images = extractImageReferences(content);
    
    if (images.length > 0 && model) {
      console.log(`Found ${images.length} images in Markdown, generating descriptions...`);
      
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        console.log(`Processing image ${i + 1}/${images.length}...`);
        
        const description = await generateImageDescription(img.url);
        img.generatedDescription = description;
        
        // Replace in markdown with enriched version
        const enrichedImageMarkdown = `![${img.altText}](${img.url})

<div class="image-description" role="complementary" aria-label="Image description" id="img-desc-${i}">
<strong>Image Description:</strong> ${description}
</div>`;
        
        enrichedContent = enrichedContent.replace(img.originalMarkdown, enrichedImageMarkdown);
      }
    }
  }
  
  return {
    enrichedContent,
    images: images
  };
}

/**
 * Generate accessible HTML from Mathpix output (HTML or Markdown)
 */
async function generateAccessibleHTML(content, title = 'Converted Document', isHTML = false) {
  let htmlContent;
  
  if (isHTML) {
    // Content is already HTML from Mathpix
    htmlContent = content;
  } else {
    // Content is markdown, convert to HTML
    const { marked } = require('marked');
    marked.setOptions({
      breaks: true,
      gfm: true
    });
    htmlContent = marked.parse(content);
  }
  
  // Load into cheerio for manipulation
  const $ = cheerio.load(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
        }
        img {
          max-width: 100%;
          height: auto;
        }
        table {
          border-collapse: collapse;
          width: 100%;
          margin: 20px 0;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 12px;
          text-align: left;
        }
        th {
          background-color: #f4f4f4;
        }
        .math-display {
          display: block;
          margin: 20px 0;
          text-align: center;
          overflow-x: auto;
        }
        .math-inline {
          display: inline;
        }
        code {
          background: #f4f4f4;
          padding: 2px 6px;
          border-radius: 3px;
        }
        pre {
          background: #f4f4f4;
          padding: 15px;
          border-radius: 5px;
          overflow-x: auto;
        }
        .image-description {
          background: #e8f4f8;
          border-left: 4px solid #2196F3;
          padding: 15px;
          margin: 10px 0;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <main role="main">
        ${htmlContent}
      </main>
    </body>
    </html>
  `);

  // Add ARIA labels to tables
  $('table').each((i, elem) => {
    $(elem).attr('role', 'table');
    $(elem).attr('aria-label', `Table ${i + 1}`);
  });

  // Add proper heading hierarchy
  $('h1, h2, h3, h4, h5, h6').each((i, elem) => {
    const $elem = $(elem);
    $elem.attr('id', $elem.text().toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, ''));
  });

  // Update image alt attributes with generated descriptions
  $('img').each((i, elem) => {
    const $img = $(elem);
    const currentAlt = $img.attr('alt') || '';
    
    // Look for associated description div
    const $nextDiv = $img.next('.image-description');
    if ($nextDiv.length > 0) {
      const description = $nextDiv.text().replace('Image Description:', '').trim();
      if (description) {
        $img.attr('alt', description);
        $img.attr('aria-describedby', `img-desc-${i}`);
        $nextDiv.attr('id', `img-desc-${i}`);
      }
    }
  });

  return $.html();
}

/**
 * Main preprocessing pipeline - handles both HTML and Markdown from Mathpix
 */
async function preprocessDocument(content, options = {}) {
  const {
    title = 'Converted Document',
    generateDescriptions = true,
    format = 'mmd'
  } = options;

  console.log('Starting document preprocessing...');
  console.log(`Format: ${format}, Content preview:`, content.substring(0, 200));
  
  const isHTML = format === 'html';
  const result = {
    originalContent: content,
    enrichedMarkdown: content,
    accessibleHTML: null,
    images: [],
    metadata: {
      processedAt: new Date().toISOString(),
      imageCount: 0,
      mathExpressionCount: 0
    },
    accessibilityScore: null
  };

  try {
    // Step 1: Add image descriptions
    console.log('Step 1: Adding image descriptions...');
    const { enrichedContent, images } = await enrichContentWithImageDescriptions(content, isHTML);
    result.enrichedMarkdown = enrichedContent;
    result.images = images;
    result.metadata.imageCount = images.length;
    console.log(`Processed ${images.length} images`);

    // Step 2: Generate accessible HTML
    console.log('Step 2: Generating accessible HTML...');
    result.accessibleHTML = await generateAccessibleHTML(result.enrichedMarkdown, title, isHTML);
    console.log('Accessible HTML generated');

    // Step 3: Run accessibility tests
    console.log('Step 3: Running accessibility tests...');
    
    // Test original HTML
    let originalHTML = content;
    if (!isHTML) {
      // Convert markdown to basic HTML for testing
      const { marked } = require('marked');
      originalHTML = `<!DOCTYPE html><html><body>${marked.parse(content)}</body></html>`;
    }
    
    const beforeScore = await runAccessibilityTests(originalHTML);
    const afterScore = await runAccessibilityTests(result.accessibleHTML);
    
    result.accessibilityScore = compareAccessibilityResults(beforeScore, afterScore);
    console.log('Accessibility testing complete:', result.accessibilityScore.summary);

    console.log('Preprocessing complete!');
    return result;
  } catch (error) {
    console.error('Error in preprocessing pipeline:', error);
    throw error;
  }
}

module.exports = {
  initializeGemini,
  extractImageReferences,
  generateImageDescription,
  enrichContentWithImageDescriptions,
  generateAccessibleHTML,
  preprocessDocument
};

