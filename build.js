import fs from 'fs';
import path from 'path';
// --- CONFIGURATION ---
const SHEET_ID = '1ZHWN37AiS31AmREDukFhikvWBNdG1pEXl6v4KGXeTvc';
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;
const DIST_DIR = './dist';
const SITE_URL = 'https://sheet-8jh.pages.dev'; // Το URL του site σου για τα shortlinks
// Utility: Η δική σου συνάρτηση slugify
const slugify = text => {
  if (!text) return 'untitled';
  return text.toString().toLowerCase().trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0370-\u03ff-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};
async function build() {
  try {
    console.log('🚀 Starting a fresh build (Full CSS & Features)...');
    // 1. Καθαρισμός και προετοιμασία φακέλων (Root, Posts, API)
    if (fs.existsSync(DIST_DIR)) {
      fs.rmSync(DIST_DIR, {
        recursive: true,
        force: true
      });
    }
    fs.mkdirSync(DIST_DIR);
    fs.mkdirSync(path.join(DIST_DIR, 'posts')); // Φάκελος για τα HTML
    fs.mkdirSync(path.join(DIST_DIR, 'api')); // Φάκελος για τα JSON
    // 2. Λήψη Δεδομένων
    const response = await fetch(GVIZ_URL);
    const rawText = await response.text();
    const jsonString = rawText.substring(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1);
    const data = JSON.parse(jsonString);
    // Mapping Headers & Rows (Ο κώδικάς σου)
    const cols = data.table.cols.map(col => col.label).filter(l => l !== '');
    const rows = data.table.rows.map(row => {
      let obj = {};
      row.c.forEach((cell, i) => {
        if (cols[i]) obj[cols[i]] = cell ? (cell.f || cell.v || '') : '';
      });
      return obj;
    });
    console.log(`📦 Processed ${rows.length} posts from Sheets.`);
    // 3. Generation Loop
    let indexCards = '';
    let redirectLines = []; // Λίστα για το _redirects file
    rows.forEach(post => {
      const slug = slugify(post.Title);
      const postID = post.id ? post.id.toString().trim() : 'no-id'; // Παίρνουμε το ID
      // Ορισμός Paths
      const postFileName = `${slug}.html`; // Όνομα αρχείου HTML
      const postJsonName = `${postID}.json`; // Όνομα αρχείου JSON (με βάση το ID)
      const fullShortUrl = `${SITE_URL}/short/${postID}`; // Το link που θα φαίνεται στο input
      // --- A. ΔΗΜΙΟΥΡΓΙΑ JSON (STATIC API) ---
      // Αποθηκεύουμε όλο το post object στο /api/[id].json
      fs.writeFileSync(path.join(DIST_DIR, 'api', postJsonName), JSON.stringify(post, null, 2));
      // --- B. ΕΓΓΡΑΦΗ REDIRECT ---
      // Ορίζουμε ότι το /short/[id] πάει στο /posts/[slug].html
      redirectLines.push(`/short/${postID}  /posts/${postFileName}  301`);
      // --- C. ΔΗΜΙΟΥΡΓΙΑ ARTICLE ---
          ///////////////////////////////////////////////////////////////////////////////////////////========================
      const postHtml = `
<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${post.Title} | Spreadsheet Test</title>
    <link href='${post.Title}' rel='canonical'/>
    <link rel="shortlink" href="${fullShortUrl}">
    <style>
        body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; }
        img { max-width: 100%; border-radius: 12px; height: auto; }
        .meta { color: #888; font-size: 0.9rem; margin-bottom: 20px; }
        .content { font-size: 1.1rem; margin-bottom: 40px; }
        a.back { color: #007bff; text-decoration: none; font-weight: bold; }
        /* Styling για το κουτί του Short URL */
        .short-url-box {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            padding: 20px;
            border-radius: 8px;
            margin-top: 40px;
        }
        .short-url-box label { font-weight: bold; display: block; margin-bottom: 8px; }
        .short-url-box input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            font-family: monospace;
            background: #fff;
        }
    </style>
</head>
<body>
    <nav><a href="/" class="back">← Επιστροφή</a></nav>
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
      // Αποθήκευση HTML στον φάκελο /posts/
      fs.writeFileSync(path.join(DIST_DIR, 'posts', postFileName), postHtml);
      // --- D. INDEX CARD GENERATION ---
      // Προσοχή: Το link πλέον δείχνει στο /posts/...
      indexCards += `
            <div class="card">
                <div class="card-body">
                    <h2>${post.Title}</h2>
                    <p>${post.Content ? post.Content.replace(/<[^>]*>/g, '').substring(0, 120) : ''}...</p>
                    <a href="posts/${postFileName}">Διαβάστε περισσότερα</a>
                </div>
            </div>`;
    });
    // 4. Δημιουργία Index.html (Διατήρηση του αρχικού σου CSS/Grid)
    ///////////////////////////////////////////////////////////////////////////////////////////========================
    const indexHtml = `
<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Spreadsheet Test</title>
    <meta name='description' content='just test google spreadsheet ' />
    <style>
        body { font-family: sans-serif; background: #f9f9f9; margin: 0; padding: 20px; }
        .container { max-width: 1100px; margin: auto; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 25px; }
        .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .card img { width: 100%; height: 200px; object-fit: cover; }
        .card-body { padding: 20px; }
        .card-body h2 { margin-top: 0; font-size: 1.25rem; }
        .card-body a { color: #007bff; text-decoration: none; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <header style="text-align:center; padding: 40px 0;">
            <h1>Spreadsheet Test</h1>
            <p>Static Site Generated from Google Sheets</p>
        </header>
        <main class="grid">${indexCards}</main>
    </div>
</body>
</html>`;
    fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHtml);
    // 5. Robots.txt & Redirects
    // Δημιουργία του robots.txt
    const robotsContent = `User-agent: *\nAllow: /`;
    fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsContent);
    // Δημιουργία του _redirects για το Cloudflare
    fs.writeFileSync(path.join(DIST_DIR, '_redirects'), redirectLines.join('\n'));
    console.log('✨ Build complete! Your site is ready in /dist');
  } catch (err) {
    console.error('💥 Build failed:', err);
  }
}
build();
