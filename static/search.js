(async () => {
  const B = window.BASE || "", q = document.getElementById("q"), res = document.getElementById("res");
  let data;
  try { data = await (await fetch(B + "/search-index.json")).json(); } catch { return; }
  const keys = Object.keys(data.index);
  const norm = (s) => s.toUpperCase().replace(/\s+/g, "").split(".")[0];
  const show = () => {
    const v = norm(q.value);
    if (v.length < 4) { res.innerHTML = ""; return; }
    const exact = data.index[v];
    const hits = exact ? [v] : keys.filter((k) => k.startsWith(v)).slice(0, 8);
    if (!hits.length) { res.innerHTML = '<p class="miss">아직 등록되지 않은 모델이에요. 모델명을 다시 확인하거나, 제조사 공식몰 소모품 페이지에서 확인해 주세요.</p>'; return; }
    res.innerHTML = hits.map((k) => {
      const fs = data.index[k].map((s) => { const m = data.meta[s]; return `<li><a href="${B}/filter/${s}/">${m.n}${m.p ? " (" + m.p + ")" : ""}</a></li>`; }).join("");
      return `<div class="hit"><strong>${k}</strong><ul>${fs}</ul></div>`;
    }).join("");
  };
  q.addEventListener("input", show);
})();
