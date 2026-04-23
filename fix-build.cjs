const fs = require('fs');
const path = require('path');

const clientDir = path.join(process.cwd(), 'dist', 'client');
const assetsDir = path.join(clientDir, 'assets');

if (!fs.existsSync(assetsDir)) {
    console.error('Assets directory not found:', assetsDir);
    process.exit(1);
}

const files = fs.readdirSync(assetsDir);
// Find the largest index-*.js file as it's likely the main bundle
const jsFiles = files.filter(f => f.startsWith('index-') && f.endsWith('.js'))
    .map(f => ({ name: f, size: fs.statSync(path.join(assetsDir, f)).size }))
    .sort((a, b) => b.size - a.size);

if (jsFiles.length === 0) {
    console.error('Main JS bundle not found in', assetsDir);
    process.exit(1);
}

const mainJs = jsFiles[0].name;
const mainCss = files.find(f => f.startsWith('styles-') && f.endsWith('.css'));

console.log('Found main JS:', mainJs);
if (mainCss) console.log('Found main CSS:', mainCss);

let html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');

// Remove the dev script
html = html.replace(/<script type="module" src="\/src\/main\.tsx"><\/script>/, '');

// Insert production assets before </head> or at the end of body
const assetsHtml = `
    ${mainCss ? `<link rel="stylesheet" href="/assets/${mainCss}">` : ''}
    <script type="module" src="/assets/${mainJs}"></script>
`;

if (html.includes('</head>')) {
    html = html.replace('</head>', `${assetsHtml}</head>`);
} else {
    html = html.replace('</body>', `${assetsHtml}</body>`);
}

fs.writeFileSync(path.join(clientDir, 'index.html'), html);
console.log('Generated production index.html in dist/client/index.html');
