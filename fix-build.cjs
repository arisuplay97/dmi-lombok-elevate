const fs = require('fs');
const path = require('path');

const clientDir = path.join(process.cwd(), 'dist', 'client');
const assetsDir = path.join(clientDir, 'assets');

if (!fs.existsSync(assetsDir)) {
    console.error('Assets directory not found:', assetsDir);
    process.exit(1);
}

const files = fs.readdirSync(assetsDir);

// Get all JS and CSS files
const jsFiles = files.filter(f => f.startsWith('index-') && f.endsWith('.js'));
const cssFiles = files.filter(f => f.startsWith('styles-') && f.endsWith('.css'));

if (jsFiles.length === 0) {
    console.error('Main JS bundle not found in', assetsDir);
    process.exit(1);
}

console.log('Found JS files:', jsFiles);
console.log('Found CSS files:', cssFiles);

let html = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');

// Remove the dev script
html = html.replace(/<script type="module" src="\/src\/main\.tsx"><\/script>/, '');

// Create asset tags for ALL index JS and style CSS files
const jsTags = jsFiles.map(f => `<script type="module" src="/assets/${f}"></script>`).join('\n    ');
const cssTags = cssFiles.map(f => `<link rel="stylesheet" href="/assets/${f}">`).join('\n    ');

const assetsHtml = `
    ${cssTags}
    ${jsTags}
`;

if (html.includes('</head>')) {
    html = html.replace('</head>', `${assetsHtml}</head>`);
} else {
    html = html.replace('</body>', `${assetsHtml}</body>`);
}

fs.writeFileSync(path.join(clientDir, 'index.html'), html);
console.log('Generated production index.html with all bundles in dist/client/index.html');
