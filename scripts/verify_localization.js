const http = require('http');

function fetchUrl(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('DIGITALTOOLPAD FULL MULTILINGUAL LOCALIZATION AUDIT');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail}`);
      failed++;
    }
  }

  // Test 1: English domain request on port 3100
  try {
    const enRes = await fetchUrl({
      hostname: 'localhost',
      port: 3100,
      path: '/',
      method: 'GET',
      headers: { Host: 'en.localhost:3100' },
    });
    assert(enRes.status === 200, 'EN Homepage HTTP Status 200');
    assert(enRes.body.includes('<html lang="en"'), 'EN Homepage html lang="en"');
    assert(enRes.body.includes('Free Online Tools for'), 'EN Homepage contains English hero heading');
    assert(enRes.body.includes('All tools'), 'EN Homepage contains English nav');
    assert(/href[lL]ang="de-DE"/.test(enRes.body), 'EN Homepage contains reciprocal hreflang="de-DE"');
    assert(/href[lL]ang="en"/.test(enRes.body), 'EN Homepage contains reciprocal hreflang="en"');
  } catch (e) {
    assert(false, 'EN Homepage Request', e.message);
  }

  // Test 2: German domain request on port 3100
  try {
    const deRes = await fetchUrl({
      hostname: 'localhost',
      port: 3100,
      path: '/',
      method: 'GET',
      headers: { Host: 'de.localhost:3100' },
    });
    assert(deRes.status === 200, 'DE Homepage HTTP Status 200');
    assert(deRes.body.includes('<html lang="de-DE"'), 'DE Homepage html lang="de-DE"');
    assert(deRes.body.includes('Kostenlose Online-Tools f'), 'DE Homepage contains German hero heading');
    assert(deRes.body.includes('Alle Tools'), 'DE Homepage contains German nav');
    assert(deRes.body.includes('Datenschutzerkl'), 'DE Homepage contains German footer links');
    assert(deRes.body.includes('canonical" href="https://de.digitaltoolpad.com'), 'DE Homepage has self-referencing German canonical');
  } catch (e) {
    assert(false, 'DE Homepage Request', e.message);
  }

  // Test 3: Cookie / query switching fallback for localhost
  try {
    const cookieRes = await fetchUrl({
      hostname: 'localhost',
      port: 3100,
      path: '/?locale=de',
      method: 'GET',
      headers: { Host: 'localhost:3100' },
    });
    assert(cookieRes.status === 200, 'Localhost ?locale=de HTTP Status 200');
    const setCookie = cookieRes.headers['set-cookie'];
    assert(setCookie && setCookie.some((c) => c.includes('NEXT_LOCALE=de')), 'Middleware sets NEXT_LOCALE=de cookie');
    assert(cookieRes.body.includes('<html lang="de-DE"'), 'Localhost ?locale=de renders German html lang="de-DE"');
  } catch (e) {
    assert(false, 'Localhost ?locale=de Request', e.message);
  }

  // Test 4: Tools directory in German
  try {
    const toolsDe = await fetchUrl({
      hostname: 'localhost',
      port: 3100,
      path: '/tools',
      method: 'GET',
      headers: { Host: 'de.localhost:3100' },
    });
    assert(toolsDe.status === 200, 'DE /tools Directory HTTP Status 200');
    assert(toolsDe.body.includes('Alle Online-Tools (492)'), 'DE /tools contains "Alle Online-Tools (492)"');
    assert(toolsDe.body.includes('Entdecken Sie unser komplettes Verzeichnis'), 'DE /tools contains German subtitle');
    assert(toolsDe.body.includes('Filtern nach Werkzeugname'), 'DE /tools contains German placeholder');
  } catch (e) {
    assert(false, 'DE /tools Request', e.message);
  }

  // Test 5: 2026 Calendar tool in German
  try {
    const calDe = await fetchUrl({
      hostname: 'localhost',
      port: 3100,
      path: '/tools/2026-calendar',
      method: 'GET',
      headers: { Host: 'de.localhost:3100' },
    });
    assert(calDe.status === 200, 'DE /tools/2026-calendar HTTP Status 200');
    assert(calDe.body.includes('Kalender 2026'), 'DE Calendar contains "Kalender 2026"');
    assert(calDe.body.includes('Kalendereinstellungen'), 'DE Calendar contains "Kalendereinstellungen"');
    assert(calDe.body.includes('PDF herunterladen'), 'DE Calendar contains "PDF herunterladen"');
    assert(/href[lL]ang="de-DE"/.test(calDe.body), 'DE Calendar contains German reciprocal hreflang');
    assert(/href[lL]ang="en"/.test(calDe.body), 'DE Calendar contains English reciprocal hreflang');
  } catch (e) {
    assert(false, 'DE Calendar Request', e.message);
  }

  // Test 6: 2026 Calendar tool in English
  try {
    const calEn = await fetchUrl({
      hostname: 'localhost',
      port: 3100,
      path: '/tools/2026-calendar',
      method: 'GET',
      headers: { Host: 'en.localhost:3100' },
    });
    assert(calEn.status === 200, 'EN /tools/2026-calendar HTTP Status 200');
    assert(calEn.body.includes('2026 Calendar'), 'EN Calendar contains "2026 Calendar"');
    assert(calEn.body.includes('Calendar settings'), 'EN Calendar contains "Calendar settings"');
    assert(calEn.body.includes('Download PDF'), 'EN Calendar contains "Download PDF"');
  } catch (e) {
    assert(false, 'EN Calendar Request', e.message);
  }

  // Test 7: General tool shell in German with jurisdiction notice
  try {
    const calcDe = await fetchUrl({
      hostname: 'localhost',
      port: 3100,
      path: '/tools/salary-to-hourly-converter',
      method: 'GET',
      headers: { Host: 'de.localhost:3100' },
    });
    assert(calcDe.status === 200, 'DE /tools/salary-to-hourly-converter HTTP Status 200');
    assert(calcDe.body.includes('100% in Ihrem Browser'), 'DE ToolShell contains German "Läuft zu 100% in Ihrem Browser"');
    assert(calcDe.body.includes('Hinweis zur Gerichtsbarkeit'), 'DE ToolShell contains German jurisdiction notice');
    assert(calcDe.body.includes('Dezimalzahlen: Sowohl Komma (12,5) als auch Punkt (12.5)'), 'DE ToolShell contains decimal comma notice');
  } catch (e) {
    assert(false, 'DE Salary Converter Request', e.message);
  }

  // Test 8: Sitemap.xml
  try {
    const sitemapRes = await fetchUrl({
      hostname: 'localhost',
      port: 3100,
      path: '/sitemap.xml',
      method: 'GET',
      headers: { Host: 'localhost:3100' },
    });
    assert(sitemapRes.status === 200, 'Sitemap HTTP Status 200');
    assert(sitemapRes.body.includes('https://www.digitaltoolpad.com'), 'Sitemap contains English domain URLs');
    assert(sitemapRes.body.includes('https://de.digitaltoolpad.com'), 'Sitemap contains German domain URLs');
    assert(sitemapRes.body.includes('hreflang="de-DE"'), 'Sitemap contains reciprocal hreflang="de-DE"');
    assert(sitemapRes.body.includes('hreflang="en"'), 'Sitemap contains reciprocal hreflang="en"');
  } catch (e) {
    assert(false, 'Sitemap Request', e.message);
  }

  // Test 9: Robots.txt
  try {
    const robotsRes = await fetchUrl({
      hostname: 'localhost',
      port: 3100,
      path: '/robots.txt',
      method: 'GET',
      headers: { Host: 'localhost:3100' },
    });
    assert(robotsRes.status === 200, 'Robots.txt HTTP Status 200');
    assert(robotsRes.body.includes('https://www.digitaltoolpad.com/sitemap.xml'), 'Robots.txt references English sitemap');
    assert(robotsRes.body.includes('https://de.digitaltoolpad.com/sitemap.xml'), 'Robots.txt references German sitemap');
  } catch (e) {
    assert(false, 'Robots.txt Request', e.message);
  }

  // Test 10: Legal and About pages in German
  try {
    const aboutDe = await fetchUrl({
      hostname: 'localhost',
      port: 3100,
      path: '/about',
      method: 'GET',
      headers: { Host: 'de.localhost:3100' },
    });
    assert(aboutDe.status === 200, 'DE /about HTTP Status 200');
    assert(aboutDe.body.includes('Über Digital ToolPad'), 'DE /about contains German title');

    const privacyDe = await fetchUrl({
      hostname: 'localhost',
      port: 3100,
      path: '/privacy-policy',
      method: 'GET',
      headers: { Host: 'de.localhost:3100' },
    });
    assert(privacyDe.status === 200, 'DE /privacy-policy HTTP Status 200');
    assert(privacyDe.body.includes('Datenschutzpolitik'), 'DE /privacy-policy contains German title');
  } catch (e) {
    assert(false, 'DE Legal / About Request', e.message);
  }

  console.log('\n----------------------------------------------------');
  console.log(`AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('----------------------------------------------------');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
