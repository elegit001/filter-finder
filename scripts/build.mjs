// 필터맞춤 정적 사이트 생성기. 의존성 없음: `node scripts/build.mjs` → dist/
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const cfg = JSON.parse(fs.readFileSync(path.join(root, "site.config.json"), "utf8"));
const out = path.join(root, "dist");
const readDir = (d) =>
  fs.readdirSync(path.join(root, d)).filter((f) => f.endsWith(".json")).sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(root, d, f), "utf8")));

const filters = readDir("data/filters");
const guides = readDir("data/guides");
const bySlug = Object.fromEntries(filters.map((f) => [f.slug, f]));
const BRAND_SLUG = { LG: "lg", 삼성: "samsung", 샤오미: "xiaomi", 코웨이: "coway", 위닉스: "winix", 쿠쿠: "cuckoo", 필립스: "philips", 다이슨: "dyson" };
const brandSlug = (b) => BRAND_SLUG[b] || encodeURIComponent(b.toLowerCase());

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const won = (n) => n.toLocaleString("ko-KR") + "원";
const url = (p) => cfg.baseUrl.replace(/\/$/, "") + p;
const B = new URL(cfg.baseUrl).pathname.replace(/\/$/, "");
const fix = (html) => html.replace(/(href|src)="\/(?!\/)/g, `$1="${B}/`).replace("<head>", `<head><script>window.BASE=${JSON.stringify(B)}</script>`);

function buyLinks(f) {
  const q = f.partNumber || f.name;
  const links = (cfg.coupangPartnersEnabled && f.coupangLinks?.length)
    ? f.coupangLinks
    : [{ label: `쿠팡에서 '${q}' 검색`, url: cfg.coupangSearchBase + encodeURIComponent(q) }];
  return links.map((l) => `<a class="btn" rel="nofollow sponsored noopener" target="_blank" href="${esc(l.url)}">${esc(l.label)}</a>`).join("");
}

function layout({ title, desc, pathName, body, jsonld }) {
  const full = pathName === "/" ? `${cfg.siteName} · ${cfg.tagline}` : `${title} | ${cfg.siteName}`;
  const disclosure = cfg.coupangPartnersEnabled
    ? `<p class="disc">이 사이트는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.</p>` : "";
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(full)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(url(pathName))}">
<meta property="og:title" content="${esc(full)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:url" content="${esc(url(pathName))}">
<link rel="stylesheet" href="/style.css">
${cfg.googleVerification ? `<meta name="google-site-verification" content="${esc(cfg.googleVerification)}">` : ""}${cfg.naverVerification ? `<meta name="naver-site-verification" content="${esc(cfg.naverVerification)}">` : ""}
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}
</head><body>
<header><a class="logo" href="/">${esc(cfg.siteName)}</a><span class="tag">${esc(cfg.tagline)}</span></header>
<main>${body}</main>
<footer>${disclosure}<p>호환 정보는 제조사 공식 페이지를 옮긴 것이며, 페이지마다 출처와 확인일을 적었습니다. 제조사 사정으로 바뀔 수 있으니 구매 전 출처에서 한 번 더 확인하세요.</p>
<p><a href="/">처음으로</a> · <a href="/about/">이 사이트에 대해</a></p></footer>
</body></html>`;
}

const crumbs = (items) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: items.map(([name, p], i) => ({ "@type": "ListItem", position: i + 1, name, item: url(p) })),
});

function write(p, html) {
  const file = path.join(out, p, "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, fix(html));
}

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.cpSync(path.join(root, "static"), out, { recursive: true });

// 필터 페이지
for (const f of filters) {
  const p = `/filter/${f.slug}/`;
  const facts = [
    ["브랜드", f.brand], ["종류", f.category + " 필터"],
    f.partNumber && ["필터 모델명", f.partNumber],
    f.officialCode && f.officialCode !== f.partNumber && ["공식 부품 코드", f.officialCode],
    f.priceKRW && ["공식 가격", won(f.priceKRW)],
    f.interval && ["제조사 권장 교체 주기", f.interval],
    ["확인일", f.verified],
  ].filter(Boolean);
  const modelsHtml = f.models.length
    ? `<p>${f.officialCount ? `공식 페이지에는 색상·지역 표기를 포함해 ${f.officialCount}개 모델이 올라 있습니다. 아래는 점(.) 뒤 접미사를 뺀 ${f.models.length}개 모델명입니다.` : `공식 자료에 적힌 호환 모델 ${f.models.length}개입니다.`} <kbd>Ctrl+F</kbd>로 내 모델명을 찾아보세요.</p>
<ul class="models">${f.models.map((m) => `<li>${esc(m)}</li>`).join("")}</ul>`
    : `<p>공식 페이지에 ${f.officialCount ? f.officialCount + "개 " : ""}모델이 올라 있지만 아직 전체 목록을 옮기지 못했습니다. <a href="${esc(f.source.url)}" rel="noopener" target="_blank">공식 페이지</a>에서 내 모델명을 확인하세요.</p>`;
  const rel = (f.related || []).filter((s) => bySlug[s]).map((s) => `<li><a href="/filter/${s}/">${esc(bySlug[s].name)}</a></li>`).join("");
  const title = `${f.name}${f.partNumber ? ` (${f.partNumber})` : ""} 호환 모델·가격`;
  const desc = `${f.summary} 공식 자료로 확인한 호환 모델 목록${f.priceKRW ? "과 가격" : ""}을 정리했습니다.`;
  write(p, layout({
    title, desc, pathName: p, jsonld: crumbs([["홈", "/"], [f.brand, `/brand/${brandSlug(f.brand)}/`], [f.name, p]]),
    body: `<nav class="bc"><a href="/">홈</a> › <a href="/brand/${brandSlug(f.brand)}/">${esc(f.brand)}</a> › ${esc(f.category)}</nav>
<h1>${esc(title)}</h1><p class="lead">${esc(f.summary)}</p>
<dl class="facts">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>
${f.priceNote ? `<p class="note">${esc(f.priceNote)}</p>` : ""}
<div class="buy">${buyLinks(f)}</div>
<h2>알아두면 좋은 점</h2><ul>${f.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
<h2>호환 모델</h2>${modelsHtml}
<h2>출처</h2><p><a href="${esc(f.source.url)}" rel="noopener" target="_blank">${esc(f.source.name)}</a> (${esc(f.verified)} 확인)</p>
${rel ? `<h2>함께 보는 필터</h2><ul>${rel}</ul>` : ""}`,
  }));
}

// 가이드 페이지
for (const g of guides) {
  const p = `/guide/${g.slug}/`;
  write(p, layout({
    title: g.title, desc: g.summary, pathName: p, jsonld: crumbs([["홈", "/"], ["가이드", "/"], [g.title, p]]),
    body: `<nav class="bc"><a href="/">홈</a> › 가이드</nav><h1>${esc(g.title)}</h1><p class="lead">${esc(g.summary)}</p>
${g.sections.map((s) => `<h2>${esc(s.h)}</h2>${s.p.map((t) => `<p>${esc(t)}</p>`).join("")}`).join("")}
<p class="note">마지막 확인: ${esc(g.verified)}</p>`,
  }));
}

// 소개
write("/about/", layout({
  title: "이 사이트에 대해", desc: `${cfg.siteName}는 가전 모델명으로 맞는 필터와 소모품을 찾아주는 사이트입니다.`, pathName: "/about/",
  body: `<h1>이 사이트에 대해</h1>
<p>${esc(cfg.siteName)}는 "내 모델에 맞는 필터가 뭐지?"라는 질문에 바로 답하려고 만든 사이트입니다.</p>
<p>호환 정보는 제조사 공식몰과 서비스센터 부품몰에 적힌 내용만 옮기고, 페이지마다 출처 링크와 확인일을 남깁니다. 추측으로 호환 모델을 추가하지 않습니다.</p>
<p>상품 링크 일부는 제휴 링크일 수 있으며, 링크를 통해 구매하면 사이트 운영에 쓰이는 수수료를 받을 수 있습니다. 가격은 바뀌지 않습니다.</p>`,
}));

// 검색 색인: 모델명 → 필터
const index = {};
for (const f of filters) for (const m of f.models) (index[m.toUpperCase().replace(/\s+/g, "")] ||= []).push(f.slug);
const meta = Object.fromEntries(filters.map((f) => [f.slug, { n: f.name, p: f.partNumber, b: f.brand }]));
fs.writeFileSync(path.join(out, "search-index.json"), JSON.stringify({ index, meta }));

// 홈
const brands = [...new Set(filters.map((f) => f.brand))];
const card = (f) => `<li><a href="/filter/${f.slug}/"><strong>${esc(f.name)}</strong>${f.partNumber ? `<span>${esc(f.partNumber)}</span>` : ""}</a></li>`;
for (const b of brands) {
  const list = filters.filter((f) => f.brand === b);
  const p = `/brand/${brandSlug(b)}/`;
  const nModels = new Set(list.flatMap((f) => f.models)).size;
  write(p, layout({
    title: `${b} 필터·소모품 호환표`, desc: `${b} 가전에 맞는 필터 ${list.length}종과 호환 모델 ${nModels}개를 제조사 공식 자료 기준으로 정리했습니다.`, pathName: p,
    jsonld: crumbs([["홈", "/"], [b, p]]),
    body: `<nav class="bc"><a href="/">홈</a> › ${esc(b)}</nav><h1>${esc(b)} 필터·소모품 호환표</h1>
<p class="lead">${esc(b)} 필터 ${list.length}종, 호환 모델명 ${nModels}개를 공식 자료 기준으로 모았습니다. 모델명을 알면 <a href="/">첫 화면 검색</a>이 가장 빠릅니다.</p>
<ul class="cards">${list.map(card).join("")}</ul>`,
  }));
}
const recent = [...filters].sort((a, b) => (b.verified || "").localeCompare(a.verified || "")).slice(0, 5);
write("/", layout({
  title: cfg.siteName, desc: `${cfg.tagline}. 제조사 공식 자료로 확인한 호환 모델 목록과 가격을 정리합니다.`, pathName: "/",
  body: `<section class="hero"><h1>모델명만 넣으면, 맞는 필터를 알려드려요</h1>
<p>본체 라벨에 적힌 모델명(예: AS281DAW, AX40K3020GWD)을 입력하세요.</p>
<input id="q" type="search" placeholder="모델명 입력" autocomplete="off" aria-label="모델명 검색">
<div id="res" aria-live="polite"></div>
<p class="small">모델명을 모르겠다면 <a href="/guide/find-model-number/">모델명 찾는 법</a>을 보세요.</p></section>
<h2>최근 추가·확인한 필터</h2><ul class="cards">${recent.map(card).join("")}</ul>
${brands.map((b) => `<h2><a href="/brand/${brandSlug(b)}/">${esc(b)}</a></h2><ul class="cards">${filters.filter((f) => f.brand === b).map(card).join("")}</ul>`).join("")}
<h2>가이드</h2><ul class="cards">${guides.map((g) => `<li><a href="/guide/${g.slug}/"><strong>${esc(g.title)}</strong></a></li>`).join("")}</ul>
<script src="/search.js" defer></script>`,
}));

// 404, sitemap, robots
fs.writeFileSync(path.join(out, "404.html"), fix(layout({ title: "페이지를 찾을 수 없어요", desc: "", pathName: "/404.html", body: `<h1>페이지를 찾을 수 없어요</h1><p><a href="/">처음으로 돌아가서</a> 모델명으로 검색해 보세요.</p>` })));
const latest = recent[0]?.verified;
const pages = [["/", latest], ["/about/"], ...brands.map((b) => [`/brand/${brandSlug(b)}/`, latest]), ...filters.map((f) => [`/filter/${f.slug}/`, f.verified]), ...guides.map((g) => [`/guide/${g.slug}/`, g.verified])];
fs.writeFileSync(path.join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.map(([p, d]) => `<url><loc>${url(p)}</loc>${d ? `<lastmod>${d}</lastmod>` : ""}</url>`).join("")}</urlset>\n`);
fs.writeFileSync(path.join(out, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${url("/sitemap.xml")}\n`);
if (cfg.baseUrl && !cfg.baseUrl.includes("example.com")) {
  const host = new URL(cfg.baseUrl).host;
  if (!host.endsWith("github.io")) fs.writeFileSync(path.join(out, "CNAME"), host + "\n");
}

console.log(`built ${pages.length} pages, ${Object.keys(index).length} model codes indexed`);
