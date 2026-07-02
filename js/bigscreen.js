(function () {
  const pad = (n) => String(n).padStart(2, "0");

  function tickClock() {
    const el = document.getElementById("bsClock");
    if (!el) return;
    const d = new Date();
    el.textContent = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
      d.getMinutes()
    )}:${pad(d.getSeconds())}`;
  }

  /** 大字滚动：路演观感 */
  function runMegaCounter() {
    const el = document.getElementById("bsMegaCount");
    if (!el) return;
    const target = Number(el.dataset.target) || 137474;
    const duration = 1800;
    const t0 = performance.now();

    function frame(now) {
      const t = Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      const val = Math.round(target * eased);
      el.textContent = val.toLocaleString("zh-CN");
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = target.toLocaleString("zh-CN");
    }
    requestAnimationFrame(frame);
  }

  function initMixedBars() {
    const wrap = document.getElementById("bsMixedBars");
    if (!wrap) return;
    const heights = ["42%", "55%", "48%", "68%", "72%", "76%", "64%", "58%"];
    wrap.innerHTML = heights
      .map(
        (h) =>
          `<div class="bs-mbar" style="height:${h}" aria-hidden="true"></div>`
      )
      .join("");
  }

  function initSideNav() {
    const items = document.querySelectorAll(".bs-side-item");
    const cap = document.getElementById("bsTabCaption");
    const captions = {
      all: "当前：全景视图 · 下列指标与主看板同源。",
      talent: "主播成长：六阶雷达与培训台账口径一致，预警与种子讲师数同源。",
      flow: "流量分析：周播峰值、单条爆款与主站新媒体模块一致。",
      sale: "电商对账：可查分成样例与底部培训/订单图为推演占位。",
      trip: "农文旅：核销接入前为演示口径，可与研学接待面板对齐。",
    };

    items.forEach((btn) => {
      btn.addEventListener("click", () => {
        items.forEach((b) => b.classList.toggle("active", b === btn));
        const id = btn.dataset.tab || "all";
        if (cap) cap.textContent = captions[id] || captions.all;
      });
    });
  }

  function initFilterTabs() {
    const a = document.getElementById("bsFtabA");
    const b = document.getElementById("bsFtabB");
    if (!a || !b) return;
    a.addEventListener("click", () => {
      a.classList.add("active");
      b.classList.remove("active");
    });
    b.addEventListener("click", () => {
      b.classList.add("active");
      a.classList.remove("active");
    });
  }

  tickClock();
  setInterval(tickClock, 1000);
  runMegaCounter();
  initMixedBars();
  initSideNav();
  initFilterTabs();
})();
