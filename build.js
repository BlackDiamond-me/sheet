import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const SHEET_ID = '1ZHWN37AiS31AmREDukFhikvWBNdG1pEXl6v4KGXeTvc'; 
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;
const DIST_DIR = './dist';
const SITE_URL = 'https://sheet-8jh.pages.dev'; // Το URL σου

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
        console.log('🚀 Starting a fresh build...');
        
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

        console.log(`📦 Processed ${rows.length} posts.`);

        // 3. Generation Loop
        let indexCards = '';
        let redirectLines = [];

        rows.forEach(post => {
            const slug = slugify(post.Title);
            const shortUrl = `${SITE_URL}/short/${post.id}`;
            const postPath = `posts/${slug}.html`;
            const apiPath = `api/${slug}.json`;

            // Δημιουργία JSON αρχείου (Static API)
            fs.writeFileSync(path.join(DIST_DIR, apiPath), JSON.stringify(post, null, 2));

            // Γραμμή για το _redirects
            redirectLines.push(`/short/${post.id}  /${postPath}  301`);

            // HTML για την εσωτερική σελίδα
            const postHtml = `
<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${post.Title} | The Vanilla Journal</title>
    <link rel="shortlink" href="${shortUrl}">
    <style>
        body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; }
        img { max-width: 100%; border-radius: 12px; height: auto; }
        .meta { color: #888; font-size: 0.9rem; margin-bottom: 20px; }
        .content { font-size: 1.1rem; border-bottom: 1px solid #eee; padding-bottom: 20px; }
        .shortlink-container { background: #f4f4f4; padding: 15px; margin-top: 20px; border-radius: 8px; }
        .shortlink-container input { width: 100%; border: 1px solid #ccc; padding: 5px; margin-top: 5px; }
        a.back { color: #007bff; text-decoration: none; font-weight: bold; }
    </style>
</head>
<body>
    <nav><a href="/" class="back">← Επιστροφή στην Αρχική</a></nav>
    <header>
        <h1>${post.Title}</h1>
        <div class="meta">ID: ${post.id} | Δημοσιεύτηκε: ${post.Puplished}</div>
    </header>
    <main>
        <div class="content">${post.Content}</div>
        <div class="shortlink-container">
            <strong>Short URL για κοινοποίηση:</strong><br>
            <input type="text" value="${shortUrl}" readonly onclick="this.select()">
        </div>
    </main>
</body>
</html>`;

            fs.writeFileSync(path.join(DIST_DIR, postPath), postHtml);

            // Snippet για την αρχική
            indexCards += `
            <div class="card">
                <div class="card-body">
                    <h2>${post.Title}</h2>
                    <p>${post.Content ? post.Content.replace(/<[^>]*>/g, '').substring(0, 120) : ''}...</p>
                    <a href="${postPath}">Διαβάστε περισσότερα</a>
                </div>
            </div>`;
        });

        // 4. Index.html
        const indexHtml = `
<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Vanilla Journal</title>
    <meta name='description' content='Static blog generated from Google Sheets' />
    <style>
        body { font-family: sans-serif; background: #f9f9f9; margin: 0; padding: 20px; }
        .container { max-width: 1100px; margin: auto; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 25px; }
        .card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
        .card-body { padding: 20px; }
        .card-body h2 { margin-top: 0; font-size: 1.25rem; }
        .card-body a { color: #007bff; text-decoration: none; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <header style="text-align:center; padding: 40px 0;">
            <h1>The Vanilla Journal</h1>
            <p>Static Site (HTML + JSON + Shortlinks)</p>
        </header>
        <main class="grid">${indexCards}</main>
    </div>
</body>
</html>`;

        fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHtml);

        // 5. SEO & Redirects
        fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), "User-agent: *\nAllow: /");
        fs.writeFileSync(path.join(DIST_DIR, '_redirects'), redirectLines.join('\n'));

        console.log('✨ Build complete! 🚀');

    } catch (err) {
        console.error('💥 Build failed:', err);
    }
}

build();
