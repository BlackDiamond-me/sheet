import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const SHEET_ID = '1ZHWN37AiS31AmREDukFhikvWBNdG1pEXl6v4KGXeTvc';
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;
const DIST_DIR = './dist';
const SITE_URL = 'https://sheet-8jh.pages.dev';

// ==========================================================================================================
// Greek to Latin transliteration για URLs
const greekToLatinMap = {
  'α':'a','β':'v','γ':'g','δ':'d','ε':'e','ζ':'z','η':'i','θ':'th',
  'ι':'i','κ':'k','λ':'l','μ':'m','ν':'n','ξ':'x','ο':'o','π':'p',
  'ρ':'r','σ':'s','ς':'s','τ':'t','υ':'y','φ':'f','χ':'ch','ψ':'ps','ω':'o',
  'ά':'a','έ':'e','ή':'i','ί':'i','ό':'o','ύ':'y','ώ':'o','ϊ':'i','ΐ':'i',
  'ϋ':'y','ΰ':'y'
};

const transliterateGreek = text => {
  return text.toLowerCase().split('').map(function(ch){
    return greekToLatinMap[ch] || ch;
  }).join('');
};

const slugify = text => {
  if (!text) return 'untitled';
  var latin = transliterateGreek(text.toString());
  return latin.trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

async function build() {
  try {
    console.log('🚀 Starting a fresh build...');
    if (fs.existsSync(DIST_DIR)) {
      fs.rmSync(DIST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(DIST_DIR);
    fs.mkdirSync(path.join(DIST_DIR, 'post')); 
    fs.mkdirSync(path.join(DIST_DIR, 'api'));  

    const response = await fetch(GVIZ_URL);
    const rawText = await response.text();
    const jsonString = rawText.substring(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1);
    const data = JSON.parse(jsonString);

    const cols = data.table.cols.map(col => col.label).filter(l => l !== '');
    const rows = data.table.rows.map(row => {
      let obj = {};
      row.c.forEach((cell, i) => {
        if (cols[i]) obj[cols[i]] = cell ? (cell.f || cell.v || '') : '';
      });
      return obj;
    });
    console.log(`📦 Processed ${rows.length} posts from Sheets.`);

    let indexCards = '';
    let redirectLines = [];

    rows.forEach(post => {
      const slug = slugify(post.Title);
      const postID = post.id ? post.id.toString().trim() : 'no-id';
      const postFileName = slug; 
      const postJsonName = `${postID}.json`;
      const fullShortUrl = `${SITE_URL}/short/${postID}`;
      
      // Το Canonical URL χωρίς .html στο τέλος
      const canonicalUrl = `${SITE_URL}/post/${postFileName}`;

      fs.writeFileSync(path.join(DIST_DIR, 'api', postJsonName), JSON.stringify(post, null, 2));

      redirectLines.push(`/short/${postID}  /post/${postFileName}  301`);

      const postHtml = `
<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${post.Title} | Spreadsheeting Test</title>
    <meta name='description' content="${post.Title}" />
    <link rel="canonical" href="${canonicalUrl}" />
    <link rel="shortlink" href="${fullShortUrl}">
    <style>
        body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; }
        img { max-width: 100%; border-radius: 12px; height: auto; }
        .meta { color: #888; font-size: 0.9rem; margin-bottom: 20px; }
        .content { font-size: 1.1rem; margin-bottom: 40px; }
        a.back { color: #007bff; text-decoration: none; font-weight: bold; }
        .short-url-box { background: #f8f9fa; border: 1px solid #e9ecef; padding: 20px; border-radius: 8px; margin-top: 40px; }
        .short-url-box label { font-weight: bold; display: block; margin-bottom: 8px; }
        .short-url-box input { width: 100%; padding: 10px; border: 1px solid #ced4da; border-radius: 4px; font-family: monospace; background: #fff; }
    </style>
</head>
<body>
    <nav><a href="/" class="back">← Αρχική</a></nav>
    <header>
        <h1>${post.Title}</h1>
        <div class="meta">Δημοσιεύτηκε: ${post.Puplished} | Tags: ${post.Tags}</div>
    </header>
    <main>
        <div class="content">${post.Content}</div>
        <div class="short-url-box">
            <label>Σύνδεσμος κοινοποίησης (Short URL):</label>
            <input type="text" value="${fullShortUrl}" readonly onclick="this.select()">
        </div>
    </main>
</body>
</html>`;
      
      // Αποθήκευση ως αρχείο χωρίς επέκταση για Clean URLs
      fs.writeFileSync(path.join(DIST_DIR, 'post', postFileName), postHtml);

      indexCards += `
            <div class="card">
                <div class="card-body">
                    <h2>${post.Title}</h2>
                    <p>${post.Content ? post.Content.replace(/<[^>]*>/g, '').substring(0, 120) : ''}...</p>
                    <a href="/post/${postFileName}">Διαβάστε περισσότερα</a>
                </div>
            </div>`;
    });

    const indexHtml = `
<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spreadsheeting Test</title>
    <link rel="canonical" href="${SITE_URL}" />
    <style>
        body { font-family: sans-serif; background: #ddd; margin: 0; padding: 20px; }
        .container { max-width: 1100px; margin: auto; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 25px; }
        .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .card-body { padding: 20px; }
        .card-body h2 { margin-top: 0; font-size: 1.25rem; }
        .card-body a { color: #053ad7; text-decoration: none; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <header style="text-align:center; padding: 40px 0;">
            <h1>Spreadsheeting Test</h1>
            <p>Static Site Generated from Google Sheets</p>
        </header>
        <main class="grid">${indexCards}</main>
    </div>
</body>
</html>`;

    fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHtml);
    fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), `User-agent: *\nAllow: /`);
    fs.writeFileSync(path.join(DIST_DIR, '_redirects'), redirectLines.join('\n'));

    console.log('✨ Build complete! Clean URLs and Canonical tags are set.');
  } catch (err) {
    console.error('💥 Build failed:', err);
  }
}

build();
