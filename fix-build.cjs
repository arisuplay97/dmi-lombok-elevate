const fs = require('fs');
const path = require('path');

// Paths
const clientDir = path.join(process.cwd(), 'dist', 'client');
const assetsDir = path.join(clientDir, 'assets');

if (!fs.existsSync(assetsDir)) {
    console.error('ERROR: assets dir not found:', assetsDir);
    process.exit(1);
}

const files = fs.readdirSync(assetsDir);
const allJsFiles = files.filter(f => f.startsWith('index-') && f.endsWith('.js'));
const cssFiles = files.filter(f => f.endsWith('.css'));

if (allJsFiles.length === 0) {
    console.error('ERROR: No JS bundles found in', assetsDir);
    process.exit(1);
}

console.log('JS bundles found:', allJsFiles);
console.log('CSS files found:', cssFiles);

const cssTags = cssFiles.map(f => `<link rel="stylesheet" crossorigin href="/assets/${f}">`).join('\n    ');
const jsTags = allJsFiles.map(f => `<script type="module" crossorigin src="/assets/${f}"></script>`).join('\n    ');

const html = `<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dewan Masjid Indonesia — Kabupaten Lombok Tengah</title>
    <meta name="description" content="Situs resmi Dewan Masjid Indonesia (DMI) Kabupaten Lombok Tengah. Memakmurkan masjid, menguatkan umat, membangun peradaban." />
    ${cssTags}
    ${jsTags}
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`;

fs.writeFileSync(path.join(clientDir, 'index.html'), html);
console.log('SUCCESS: Generated dist/client/index.html');
console.log(html);
