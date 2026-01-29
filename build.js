import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const SHEET_ID = '1ZHWN37AiS31AmREDukFhikvWBNdG1pEXl6v4KGXeTvc'; // Βάλε το δικό σου ID εδώ
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`;
const DIST_DIR = './dist';

// Utility: Μετατροπή τίτλου σε URL-friendly slug (Υποστηρίζει Ελληνικά)
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
        
        // Καθαρισμός και δημιουργία του dist από το μηδέν
        if (fs.existsSync(DIST_DIR)) {
            fs.rmSync(DIST_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(DIST_DIR);

        // 1. Λήψη Δεδομένων
        const response = await fetch(GVIZ_URL);
        const rawText = await response.text();
        const jsonString = rawText.substring(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1);
        const data = JSON.parse(jsonString);

        // 2. Mapping Headers & Rows
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

        rows.forEach(post => {
            const slug = slugify(post.Title);
            const postFileName = `${slug}.html`;

            // HTML για την κάθε εσωτερική σελίδα
            const postHtml = `
<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${post.Title} | My New Site</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; color: #333; }
        img { max-width: 100%; border-radius: 12px; height: auto; }
        .meta { color: #888; font-size: 0.9rem; margin-bottom: 20px; }
        .content { font-size: 1.1rem; }
        a.back { color: #007bff; text-decoration: none; font-weight: bold; }
    </style>
</head>
<body>
    <nav><a href="/" class="back">← Επιστροφή</a></nav>
    <header>
        <h1>${post.Title}</h1>
        <div class="meta">Δημοσιεύτηκε: ${post.Puplished} | Tags: ${post.Tags}</div>
    </header>
    <main>
        <img src="${post.Image}" alt="${post.Title}">
        <div class="content">${post.Content}</div>
    </main>
</body>
</html>`;

            fs.writeFileSync(path.join(DIST_DIR, postFileName), postHtml);

            // HTML snippet για την αρχική σελίδα
            indexCards += `
            <div class="card">
                <img src="${post.Image}" alt="${post.Title}" loading="lazy">
                <div class="card-body">
                    <h2>${post.Title}</h2>
                    <p>${post.Content ? post.Content.replace(/<[^>]*>/g, '').substring(0, 120) : ''}...</p>
                    <a href="${postFileName}">Διαβάστε περισσότερα</a>
                </div>
            </div>`;
        });

        // 4. Δημιουργία Index.html
        const indexHtml = `
<!DOCTYPE html>
<html lang="el">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Vanilla Journal</title>
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
            <h1>The Vanilla Journal</h1>
            <p>Static Site Generated from Google Sheets</p>
        </header>
        <main class="grid">${indexCards}</main>
    </div>
</body>
</html>`;

        fs.writeFileSync(path.join(DIST_DIR, 'index.html'), indexHtml);
        
        console.log('✨ Build complete! Your site is ready in /dist');

    } catch (err) {
        console.error('💥 Build failed:', err);
    }
}

build();
