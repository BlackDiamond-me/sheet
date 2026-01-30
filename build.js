import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const SHEET_ID = '1ZHWN37AiS31AmREDukFhikvWBNdG1pEXl6v4KGXeTvc'; 
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;
const DIST_DIR = './dist';
const SITE_URL = 'https://sheet-8jh.pages.dev';

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
        console.log('🚀 Starting build with ID-based JSON...');
        
        // 1. Προετοιμασία Φακέλων
        if (fs.existsSync(DIST_DIR)) fs.rmSync(DIST_DIR, { recursive: true, force: true });
        fs.mkdirSync(DIST_DIR);
        fs.mkdirSync(path.join(DIST_DIR, 'posts'));
        fs.mkdirSync(path.join(DIST_DIR, 'api'));

        // 2. Λήψη Δεδομένων
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

        // 3. Generation Loop
        let indexCards = '';
        let redirectLines = [];

        rows.forEach(post => {
            const slug = slugify(post.Title);
            const postID = post.id.toString().trim(); // Παίρνουμε το ID
            
            const shortUrl = `${SITE_URL}/short/${postID}`;
            const postPath = `posts/${slug}.html`;
            const apiPath = `api/${postID}.json`; // Εδώ η αλλαγή: Ονομασία με το ID

            // Αποθήκευση JSON με όνομα το ID
            fs.writeFileSync(path.join(DIST_DIR, apiPath), JSON.stringify(post, null, 2));

            // Redirect: Από το /short/ID στο /posts/slug.html
            redirectLines.push(`/short/${postID}  /${postPath}  301`);

            // HTML Template
            const postHtml = `
<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${post.Title}</title>
    <link rel="shortlink" href="${shortUrl}">
    <style>
        body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; }
        .meta { color: #888; margin-bottom: 20px; }
        .content { font-size: 1.1rem; border-bottom: 1px solid #eee; padding-bottom: 20px; }
        .shortlink-box { background: #f4f4f4; padding: 15px; margin-top: 20px; border-radius: 8px; font-size: 0.9rem; }
        input { width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <nav><a href="/">← Πίσω</a></nav>
    <h1>${post.Title}</h1>
    <div class="meta">Δημοσιεύτηκε: ${post.Puplished}</div>
    <div class="content">${post.Content}</div>
    <div class="shortlink-box">
        <strong>Σύνδεσμος κοινοποίησης (Short URL):</strong><br>
        <input type="text" value="${shortUrl}" readonly onclick="this.select()">
    </div>
</body>
</html>`;

            fs.writeFileSync(path.join(DIST_DIR, postPath), postHtml);

            indexCards += `
            <div style="border:1px solid #ddd; padding:20px; border-radius:8px;">
                <h2>${post.Title}</h2>
                <a href="${postPath}">Διαβάστε περισσότερα</a>
            </div>`;
        });

        // 4. Index.html & SEO
        fs.writeFileSync(path.join(DIST_DIR, 'index.html'), `
            <html><body><h1>The Vanilla Journal</h1><div style="display:grid; gap:20px;">${indexCards}</div></body></html>
        `);
        fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), "User-agent: *\nAllow: /");
        fs.writeFileSync(path.join(DIST_DIR, '_redirects'), redirectLines.join('\n'));

        console.log('✨ Build success! HTML in /posts and JSON in /api using IDs.');

    } catch (err) {
        console.error('💥 Build failed:', err);
    }
}

build();
