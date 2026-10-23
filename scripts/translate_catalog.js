const fs = require('fs');
const http = require('http');

function translateBatch(texts) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      q: texts,
      source: 'en',
      target: 'de',
      format: 'text',
    });

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path: '/translate',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.translatedText) {
              resolve(parsed.translatedText);
            } else {
              console.error('Error response from LibreTranslate:', data);
              resolve(texts);
            }
          } catch (e) {
            console.error('JSON parse error from LibreTranslate:', e.message);
            resolve(texts);
          }
        });
      }
    );

    req.on('error', (err) => {
      console.error('HTTP error connecting to LibreTranslate:', err.message);
      resolve(texts);
    });

    req.write(postData);
    req.end();
  });
}

// Category translation dictionary
const CATEGORY_NAMES_DE = {
  "All": "Alle",
  "Data Formats": "Datenformate",
  "Design": "Design & Medien",
  "Productivity": "Produktivität",
  "Text Processing": "Textverarbeitung",
  "Calculators": "Rechner & Finanzen",
  "Coding": "Entwicklung & Code",
  "PDF": "PDF & Dokumente",
  "Encoding": "Kodierung & Konvertierung",
  "Lifestyle": "Lifestyle & Gesundheit",
  "Video & Audio": "Audio & Video",
  "Video &amp; Audio": "Audio & Video",
  "Device Tests": "Gerätetests",
  "Database": "Datenbank & SQL",
  "Security": "Sicherheit & Datenschutz",
  "Student": "Bildung & Studium",
  "DIY": "Bau & Heimwerken",
  "Holiday": "Feiertage & Events",
  "AI": "KI & Tokenizer",
};

async function run() {
  console.log('Loading TOOLS_CATALOG...');
  // We can require from built .next or extract with regex / import
  const toolsFile = fs.readFileSync('src/data/tools.ts', 'utf8');

  // Extract tools using JSON parse from tools array
  const catalogMatch = toolsFile.match(/export const TOOLS_CATALOG: ToolItem\[\] = (\[[\s\S]*?\]);\s*export const CATEGORIES_LIST/);
  if (!catalogMatch) {
    console.error('Could not find TOOLS_CATALOG in src/data/tools.ts');
    process.exit(1);
  }

  const catalog = JSON.parse(catalogMatch[1]);
  console.log(`Found ${catalog.length} tools to translate.`);

  // Load existing translations if available to avoid re-translating
  let existingDe = {};
  try {
    existingDe = JSON.parse(fs.readFileSync('src/data/tools_de.json', 'utf8'));
  } catch (e) {}

  const deCatalog = { ...existingDe };
  const toTranslate = [];

  for (const tool of catalog) {
    if (!deCatalog[tool.slug] || !deCatalog[tool.slug].description) {
      toTranslate.push({
        slug: tool.slug,
        name: tool.name,
        description: tool.description,
        category: CATEGORY_NAMES_DE[tool.category] || tool.category,
      });
    }
  }

  console.log(`Tools needing description translation: ${toTranslate.length}`);

  const BATCH_SIZE = 30;
  for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
    const batch = toTranslate.slice(i, i + BATCH_SIZE);
    console.log(`Translating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(toTranslate.length / BATCH_SIZE)} (tools ${i + 1} - ${Math.min(i + BATCH_SIZE, toTranslate.length)})...`);

    const descriptions = batch.map((item) => item.description);
    const translatedDescs = await translateBatch(descriptions);

    for (let j = 0; j < batch.length; j++) {
      const item = batch[j];
      const transDesc = translatedDescs[j] || item.description;

      deCatalog[item.slug] = {
        name: item.name, // Keep technical names clean or enhance
        description: transDesc,
        category: item.category,
      };
    }
  }

  // Ensure all tools have category translated
  for (const tool of catalog) {
    if (!deCatalog[tool.slug]) {
      deCatalog[tool.slug] = {};
    }
    deCatalog[tool.slug].category = CATEGORY_NAMES_DE[tool.category] || tool.category;
    if (!deCatalog[tool.slug].name) deCatalog[tool.slug].name = tool.name;
    if (!deCatalog[tool.slug].description) deCatalog[tool.slug].description = tool.description;
  }

  fs.writeFileSync('src/data/tools_de.json', JSON.stringify(deCatalog, null, 2), 'utf8');
  console.log(`\nSuccessfully saved ${Object.keys(deCatalog).length} German tool translations to src/data/tools_de.json!`);
}

run().catch(console.error);
