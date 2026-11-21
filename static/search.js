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
    if (!hits.length) {
      // 앞자리가 가장 길게 겹치는 등록 모델을 보여준다. 호환을 뜻하지 않으므로 오타 확인용으로만 안내한다.
      let near = [];
      for (let n = v.length - 1; n >= 4 && !near.length; n--) near = keys.filter((k) => k.startsWith(v.slice(0, n)));
      const tip = near.length
        ? `<p class="miss">앞자리가 비슷한 등록 모델이에요. 모델명이 <strong>글자 하나까지 똑같을 때만</strong> 같은 필터를 쓴다고 볼 수 있으니, 본체 라벨과 대조해 보세요.</p>` +
          `<ul class="near">${near.slice(0, 6).map((k) => `<li><button type="button" data-m="${k}">${k}</button></li>`).join("")}</ul>`
        : "";
      res.innerHTML = '<p class="miss">아직 등록되지 않은 모델이에요. 모델명을 다시 확인하거나, 제조사 공식몰 소모품 페이지에서 확인해 주세요.</p>' + tip;
      return;
    }
    res.innerHTML = hits.map((k) => {
      const fs = data.index[k].map((s) => { const m = data.meta[s]; return `<li><a href="${B}/filter/${s}/">${m.n}${m.p ? " (" + m.p + ")" : ""}</a></li>`; }).join("");
      return `<div class="hit"><strong>${k}</strong><ul>${fs}</ul></div>`;
    }).join("");
  };
  q.addEventListener("input", show);
  res.addEventListener("click", (e) => { const m = e.target.closest("button[data-m]"); if (m) { q.value = m.dataset.m; show(); q.focus(); } });
})();
