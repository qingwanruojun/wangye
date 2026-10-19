/**
 * AI公益数据中控 — 侧边导航 / 演示对账明细 / 状态时间
 */

const SECTION_META = {
  talent: {
    title: "银发人才成长管理中心",
    desc:
      "青韵馨香实践团 · 延庆大庄科乡及周边 · 一人一档 · 微信视频号台账与六阶成长视图",
  },
  media: {
    title: "新媒体流量分析（视频号）",
    desc: "视频号周数据 · 爆款题材 · 同类作者对标 · 培训动作与短板对齐台账总结",
  },
  commerce: {
    title: "电商与创作分成对账",
    desc: "微信视频号创作分成计划 · 直播收入样例 · 农产品出镜主线（核桃/栗子/香椿/鸡蛋）",
  },
  tourism: {
    title: "农文旅运营（二期字段）",
    desc:
      "本节含演示用预约/接待/热力/活动虚构数据 · 燕羽山/沙门村等地理锚点与台账一致 · 真正经营数据待核销与问卷接入",
  },
  replicate: {
    title: "乡村助农模式 · 村庄适配度评估（AHP）",
    desc:
      "耦合矩阵（A/F/RVCPM）+ 分村 C1–C12 与帮扶清单；单村滑杆仍可推演，报表口径来自《智赋银龄》",
  },
  assistant: {
    title: "AI 问答助手（RAG · LoRA）",
    desc: "检索本地台账知识库回答运营问题 · 回答附来源 · 可选 LoRA 微调与远程大模型",
  },
  screen: {
    title: "数据可视化总控大屏",
    desc: "一屏总览 · Excel 台账摘录（16 账号 · 226 原创合计 · 单条峰值 62637 · 培训签到 29 人次）",
  },
  security: {
    title: "系统管理与数据安全中心",
    desc: "多级权限 · 脱敏合规 · 备份灾备 · 日志审计",
  },
};

function pad(n) {
  return String(n).padStart(2, "0");
}

function updateSyncTime() {
  const el = document.getElementById("syncTime");
  if (!el) return;
  const now = new Date();
  el.textContent = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
    now.getHours()
  )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function activateSection(id) {
  const meta = SECTION_META[id];
  if (!meta) return;

  document.getElementById("pageTitle").textContent = meta.title;
  document.getElementById("pageDesc").textContent = meta.desc;

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.section === id);
  });

  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === id);
  });
}

function initNav() {
  const nav = document.getElementById("mainNav");
  if (!nav) return;

  nav.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav-item");
    if (!btn) return;
    activateSection(btn.dataset.section);
    updateSyncTime();
  });
}

const SKILL_KEYS = [
  { key: "live", label: "直播" },
  { key: "explain", label: "讲解" },
  { key: "film", label: "拍摄" },
  { key: "craft", label: "手工" },
];

/** 《延庆银发群体账号情况》建档摘录（视频号昵称 + 内部编号）—— 基于《村民账号信息》前 10 账号 */
const TALENT_PROFILES = [
  {
    nickname: "延龙寻路",
    code: "YQ-XHY-01",
    age: 42,
    digitalScore: 54,
    prefs: ["驻村记录", "政策宣传"],
    skills: { live: false, explain: true, film: true, craft: false },
    stageHint: "六阶 · ②—③ 需结构优化",
    trace:
      "12 条原创 · 关注 317 · 赞 1934 / 收藏 1241 · 台账样本播放 140 / 883 · 第一书记驻村记录 · 宜做强开篇钩子陪练",
  },
  {
    nickname: "沙门村的胖嫂子",
    code: "YQ-SM-01",
    age: 55,
    digitalScore: 82,
    prefs: ["农事节点选题", "大山鲜货"],
    skills: { live: true, explain: true, film: true, craft: false },
    stageHint: "六阶 · ③ 直播基础（场观待提升）",
    trace:
      "11 条原创 · 关注 386 · 赞 4173 / 收藏 3147 · 台账近期样本播放 8803 / 7549 · 完播率 38%/16% · 六阶节奏与直播场观仍待拉升",
  },
  {
    nickname: "沙门村的祁嫂子",
    code: "YQ-SM-03",
    age: 63,
    digitalScore: 76,
    prefs: ["山村生活记录", "优质原创"],
    skills: { live: false, explain: true, film: true, craft: false },
    stageHint: "六阶 · ③ 变现已起步",
    trace:
      "43 条原创 · 关注 813 · 赞 9160 / 收藏 6555 · 台账样本播放 4105 / 1605 · 完播率 19%/10% · 历史摘录中含香椿带货优质激励条目",
  },
  {
    nickname: "沙门郭大嫂",
    code: "YQ-SM-02",
    age: 58,
    digitalScore: 80,
    prefs: ["第一人称口播", "家人们"],
    skills: { live: true, explain: true, film: true, craft: false },
    stageHint: "六阶 · ③—④ 高活跃更新",
    trace:
      "74 条原创 · 关注 1268 · 赞 9624 / 收藏 8115 · 台账样本播放 10998 / 8828 · 完播率 35%/40% · 场次直播曾获赞 1000+（历史摘录）",
  },
  {
    nickname: "大山里的春娥姐",
    code: "YQ-SM-04",
    age: 56,
    digitalScore: 90,
    prefs: ["话题标签运营", "乡村自豪叙事"],
    skills: { live: false, explain: true, film: true, craft: false },
    stageHint: "六阶 · ⑤ IP 话题矩阵",
    trace:
      "30 条原创 · 关注 658 · 赞 6351 / 收藏 5799 · 台账样本峰值播放 62637（样本 56110）· 完播率 38%/38% · 话题/IP 向选题见长",
  },
  {
    nickname: "Villily",
    code: "YQ-QT-01",
    age: 48,
    digitalScore: 36,
    prefs: ["新手入门", "短视频尝试"],
    skills: { live: false, explain: false, film: true, craft: false },
    stageHint: "六阶 · ①—② 启蒙阶段",
    trace:
      "2 条原创 · 关注 12 · 赞 35 / 收藏 14 · 台账样本播放 64 / 178 · 完播率 55%/1% · 刚起步，需持续陪跑激励",
  },
  {
    nickname: "下花园村小馆",
    code: "YQ-XHY-02",
    age: 52,
    digitalScore: 68,
    prefs: ["乡村美食", "本地生活"],
    skills: { live: false, explain: true, film: true, craft: true },
    stageHint: "六阶 · ③ 内容稳定产出",
    trace:
      "46 条原创 · 赞 3134 / 收藏 2087 · 账号以乡村美食探店为主线，内容更新频率稳定",
  },
  {
    nickname: "上风上水上郝庄7724",
    code: "YQ-QT-02",
    age: 60,
    digitalScore: 40,
    prefs: ["乡村风景", "日常记录"],
    skills: { live: false, explain: false, film: true, craft: false },
    stageHint: "六阶 · ② 拍摄入门",
    trace:
      "原创数未填报 · 赞 268 / 收藏 204 · 内容偏乡村风景日常记录，建议系统培训拍摄剪辑",
  },
  {
    nickname: "井家螺娘钩织手作",
    code: "YQ-QT-03",
    age: 54,
    digitalScore: 62,
    prefs: ["手工钩织", "非遗传承"],
    skills: { live: false, explain: true, film: true, craft: true },
    stageHint: "六阶 · ③ 特色内容定位",
    trace:
      "原创数未填报 · 赞 1063 / 收藏 790 · 钩织手作内容差异化明显，可往直播带货方向培养",
  },
  {
    nickname: "隐世一小童",
    code: "YQ-QT-04",
    age: 50,
    digitalScore: 32,
    prefs: ["生活随拍", "个人记录"],
    skills: { live: false, explain: false, film: true, craft: false },
    stageHint: "六阶 · ①—② 基础薄弱",
    trace:
      "原创数未填报 · 赞 103 / 收藏 6 · 互动量偏低，建议从基础培训与选题规划开始帮扶",
  },
];

function initials(name) {
  return name.trim().slice(0, 1);
}

function renderTalentProfiles(filterText) {
  const wrap = document.getElementById("talentProfiles");
  if (!wrap) return;

  const q = (filterText || "").trim().toLowerCase();

  wrap.innerHTML = TALENT_PROFILES.map((p) => {
    const hay = `${p.nickname} ${p.code}`.toLowerCase();
    const match = !q || hay.includes(q);
    const hiddenClass = match ? "" : " hidden";

    const prefs = p.prefs.map((t) => `<span>${escapeHtml(t)}</span>`).join("");

    const skills = SKILL_KEYS.map(({ key, label }) => {
      const on = p.skills[key] ? " skill-cell on" : " skill-cell";
      return `<div class="${on.trim()}">${escapeHtml(label)}</div>`;
    }).join("");

    const barW = `${Math.min(100, Math.max(0, p.digitalScore))}%`;

    return `
      <article class="profile-card${hiddenClass}" data-filter-key="${escapeAttr(hay)}">
        <div class="profile-top">
          <div class="avatar" aria-hidden="true">${escapeHtml(initials(p.nickname))}</div>
          <div class="profile-ids">
            <h3>${escapeHtml(p.nickname)}</h3>
            <p class="id-line">建档编号 · ${escapeHtml(p.code)}</p>
          </div>
        </div>
        <div class="meta-row">
          <span><strong>${p.age}</strong> 岁</span>
          <span>${escapeHtml(p.stageHint)}</span>
        </div>
        <div class="score-block">
          <label>数字基础评分 <span class="score-num">${p.digitalScore} / 100</span></label>
          <div class="score-meter" role="presentation"><span style="width:${barW}"></span></div>
        </div>
        <div>
          <div class="skill-row-label">学习偏好标签</div>
          <div class="pref-tags">${prefs}</div>
        </div>
        <div>
          <div class="skill-row-label">擅长方向</div>
          <div class="skill-strip">${skills}</div>
        </div>
        <footer class="profile-foot">
          行为概要：<em>${escapeHtml(p.trace)}</em> · 可与后续学时、带货、结对记录自动对齐。
        </footer>
      </article>
    `;
  }).join("");
}

function escapeHtml(text) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
  return String(text).replace(/[&<>"]/g, (ch) => map[ch] || ch);
}

function escapeAttr(text) {
  return String(text).replace(/"/g, "&quot;");
}

function bindTalentProfileSearch() {
  const input = document.getElementById("talentProfileSearch");
  if (!input) return;

  const apply = () => renderTalentProfiles(input.value);

  input.addEventListener("input", apply);
  input.addEventListener("search", apply);
}

/** ─── 板块五 · 乡村适配度（AHP） ─── */

const RADAR_CX = 138;
const RADAR_CY = 126;
const RADAR_R = 92;

const REPL_AXIS_META = [
  { short: "银发·人口腹地", formula: "(老龄化折算 + ①) / 2" },
  { short: "红色·非遗禀赋", formula: "(② + ③) / 2" },
  { short: "产品·景观协同", formula: "(④ + ⑤) / 2" },
  { short: "两委治理", formula: "⑥" },
  { short: "网络·冷链底座", formula: "(⑦ + ⑧) / 2" },
  { short: "组织·志愿协同", formula: "(⑨ + ⑩) / 2" },
];

function normAgingToTen(pct) {
  const p = Number(pct);
  return Math.min(10, Math.max(0, ((p - 15) / 27) * 10));
}

function hexPointsFromDims(dims) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const ratio = Math.min(1, Math.max(0.08, dims[i] / 10));
    const a = (-Math.PI / 2) + (i * Math.PI) / 3;
    pts.push(`${RADAR_CX + RADAR_R * ratio * Math.cos(a)},${RADAR_CY + RADAR_R * ratio * Math.sin(a)}`);
  }
  return pts.join(" ");
}

function hexGridRing(fr) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (-Math.PI / 2) + (i * Math.PI) / 3;
    pts.push(`${RADAR_CX + RADAR_R * fr * Math.cos(a)},${RADAR_CY + RADAR_R * fr * Math.sin(a)}`);
  }
  return pts.join(" ");
}

function computeReplDimsFromSliders(sl) {
  const aTen = normAgingToTen(sl.agingPct);
  return [
    (aTen + sl.pop) / 2,
    (sl.red + sl.heritage) / 2,
    (sl.agri + sl.nature) / 2,
    sl.committee,
    (sl.network + sl.logistics) / 2,
    (sl.org + sl.volunteer) / 2,
  ].map((x) => Math.min(10, Math.max(0, x)));
}

function overallReplScore(sl) {
  const aTen = normAgingToTen(sl.agingPct);
  const parts = [
    aTen,
    sl.pop,
    sl.red,
    sl.heritage,
    sl.agri,
    sl.nature,
    sl.committee,
    sl.network,
    sl.logistics,
    sl.org,
    sl.volunteer,
  ];
  const avg = parts.reduce((s, x) => s + x, 0) / parts.length;
  return Math.round(Math.min(100, Math.max(0, avg * 10)));
}

function replScoreLabel(score) {
  if (score >= 80) return "Ⅰ类 · 优先支持（推广序列）";
  if (score >= 60) return "Ⅱ类 · 审慎优化（补齐短板再扩面）";
  return "Ⅲ类 · 建议实地勘察（暂缓规模化）";
}

function replCycleBands(sl, score) {
  const infraGap = ((10 - sl.network + 10 - sl.logistics) / 2) * 0.12;
  const govGap = ((10 - sl.committee + 10 - sl.org) / 2) * 0.1;
  const mid = 3.5 + ((100 - score) / 100) * 2.8 + infraGap + govGap;
  const span = 0.95 + Math.min(1.35, infraGap + govGap);
  const low = Math.max(2.9, +(mid - span * 0.55).toFixed(1));
  const hi = +(mid + span * 0.58).toFixed(1);
  return {
    display: `约 ${mid.toFixed(1)} 个月`,
    band: `最短 ${low} 个月 · 较慢 ${hi} 个月`,
  };
}

function readReplSlidersFromDom() {
  const gv = (id) => Number(document.getElementById(id).value);
  return {
    agingPct: gv("mAging"),
    pop: gv("mPop"),
    red: gv("mRed"),
    heritage: gv("mHer"),
    agri: gv("mAg"),
    nature: gv("mNat"),
    committee: gv("mCom"),
    network: gv("mNet"),
    logistics: gv("mLog"),
    org: gv("mOrg"),
    volunteer: gv("mVol"),
  };
}

function syncReplOutputs() {
  document.getElementById("mAgeOut").textContent = document.getElementById("mAging").value;
  ["Pop", "Red", "Her", "Ag", "Nat", "Com", "Net", "Log", "Org", "Vol"].forEach((k) => {
    const inp = document.getElementById(`m${k}`);
    const out = document.getElementById(`m${k}Out`);
    if (inp && out) out.textContent = inp.value;
  });
}

function drawRadarGridsStatic() {
  const frs = [
    ["radarGrid20", 0.2],
    ["radarGrid40", 0.4],
    ["radarGrid60", 0.6],
    ["radarGrid80", 0.8],
  ];
  frs.forEach(([id, fr]) => {
    const el = document.getElementById(id);
    if (el) el.setAttribute("points", hexGridRing(fr));
  });

  const g = document.getElementById("radarLabels");
  if (!g || g.dataset.done) return;
  g.dataset.done = "1";
  for (let i = 0; i < 6; i++) {
    const a = (-Math.PI / 2) + (i * Math.PI) / 3;
    const lx = RADAR_CX + (RADAR_R + 38) * Math.cos(a);
    const ly = RADAR_CY + (RADAR_R + 38) * Math.sin(a);
    const meta = REPL_AXIS_META[i];
    const lines = meta.short.includes("·") ? meta.short.split("·") : [meta.short];
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", String(lx));
    t.setAttribute("y", String(ly));
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("dominant-baseline", "middle");
    t.setAttribute("font-size", "11");
    t.setAttribute("fill", "#4a6275");
    lines.forEach((line, idx) => {
      const tsp = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
      tsp.setAttribute("x", String(lx));
      tsp.setAttribute("dy", idx === 0 ? "0" : "1.1em");
      tsp.textContent = line.trim();
      t.appendChild(tsp);
    });
    g.appendChild(t);
  }
}

function updateReplVisualization() {
  const sl = readReplSlidersFromDom();
  syncReplOutputs();

  const dims = computeReplDimsFromSliders(sl);
  const score = overallReplScore(sl);
  const pts = hexPointsFromDims(dims);

  document.getElementById("radarArea")?.setAttribute("points", pts);
  document.getElementById("radarStrokeAssist")?.setAttribute("points", pts);

  document.getElementById("replScoreNum").textContent = String(score);
  document.getElementById("replScoreHue").textContent = replScoreLabel(score);

  const ringFg = document.getElementById("replRingFg");
  if (ringFg) {
    const C = 326.726;
    ringFg.style.strokeDashoffset = String(C * (1 - score / 100));
  }

  const leg = document.getElementById("radarLegend");
  if (leg) {
    leg.innerHTML = dims
      .map(
        (v, i) =>
          `<li><strong>${escapeHtml(REPL_AXIS_META[i].short)}</strong>：<span>${v.toFixed(
            1
          )}</span>/10 （${escapeHtml(REPL_AXIS_META[i].formula)}）</li>`
      )
      .join("");
  }

  const cyc = replCycleBands(sl, score);
  const elMid = document.getElementById("replCycleMonths");
  const elBand = document.getElementById("replCycleBand");
  if (elMid) elMid.textContent = cyc.display;
  if (elBand) elBand.textContent = cyc.band;
}

const REPL_RESET = {
  mAging: 26,
  mPop: 6,
  mRed: 7,
  mHer: 6,
  mAg: 7,
  mNat: 5,
  mCom: 8,
  mNet: 6,
  mLog: 5,
  mOrg: 6,
  mVol: 7,
};

function resetReplDemo() {
  Object.entries(REPL_RESET).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.value = String(val);
  });
  updateReplVisualization();
}

function seedVillageBenchmark() {
  const tbody = document.querySelector("#villageBenchTable tbody");
  if (!tbody) return;

  const rows = [
    {
      name: "延庆区香营乡八道河村",
      hosts: 1,
      revenue: "分成+直播 ¥352.63",
      rate: "高（131 条）",
      composite: 88.0,
    },
    {
      name: "延庆区大庄科乡沙门村",
      hosts: 4,
      revenue: "可查激励 ¥30.91+",
      rate: "高（沙门矩阵台账合计 160 条原创）",
      composite: 84.0,
    },
    {
      name: "延庆区大庄科乡下花园村",
      hosts: 1,
      revenue: "—",
      rate: "观察延龙寻路",
      composite: 56.0,
    },
  ]
    .sort((a, b) => b.composite - a.composite)
    .map(
      (r, i) =>
        `<tr><td>${i + 1}</td><td><strong>${escapeHtml(r.name)}</strong></td><td>${r.hosts}</td><td>${escapeHtml(r.revenue)}</td><td>${escapeHtml(r.rate)}</td><td>${r.composite.toFixed(1)}</td></tr>`
    );

  tbody.innerHTML = rows.join("");
}

/** ─── 乡村适配度 · 片区地图（报告 C1–C12） ─── */

const CRITERIA_LABELS = {
  pop: "人口适配度",
  resource: "资源适配度",
  infra: "基础条件适配度",
  org: "组织与外部支持",
};

const SECONDARY_META = [
  { key: "C1", label: "老龄化率" },
  { key: "C2", label: "老年人口基数" },
  { key: "C3", label: "留守老人占比" },
  { key: "C4", label: "特色农产品数量" },
  { key: "C5", label: "农产品商品化率" },
  { key: "C6", label: "文旅资源可开发度" },
  { key: "C7", label: "宽带/5G 覆盖率" },
  { key: "C8", label: "物流通达率" },
  { key: "C9", label: "交通便利度" },
  { key: "C10", label: "村集体组织能力" },
  { key: "C11", label: "政策支持度" },
  { key: "C12", label: "培训接受度" },
];

/** 演示用村庄点位与二级指标分（0–100），可与后台 AHP 回写替换 */
const VILLAGE_AHP_DEMO = [
  {
    id: "bdh",
    name: "延庆区香营乡 · 八道河村",
    short: "八道河村",
    x: 71,
    y: 36,
    total: 86,
    criteria: { pop: 88, resource: 85, infra: 80, org: 91 },
    secondary: {
      C1: 86,
      C2: 84,
      C3: 78,
      C4: 88,
      C5: 82,
      C6: 74,
      C7: 92,
      C8: 87,
      C9: 80,
      C10: 90,
      C11: 76,
      C12: 85,
    },
    note: "台账：村书记号周播与创作分成样本领先，可作片区标杆对照。",
  },
  {
    id: "sm",
    name: "延庆区大庄科乡 · 沙门村（矩阵）",
    short: "沙门村",
    x: 44,
    y: 44,
    total: 82,
    criteria: { pop: 84, resource: 86, infra: 76, org: 82 },
    secondary: {
      C1: 80,
      C2: 82,
      C3: 75,
      C4: 90,
      C5: 78,
      C6: 80,
      C7: 85,
      C8: 82,
      C9: 72,
      C10: 84,
      C11: 74,
      C12: 88,
    },
    note: "四账号矩阵 · 原创条数与农特题材丰富，适合横比培训成效。",
  },
  {
    id: "zsyz",
    name: "延庆区张山营镇 · 样品村（演示）",
    short: "张山营样品村",
    x: 28,
    y: 52,
    total: 71,
    criteria: { pop: 72, resource: 74, infra: 68, org: 70 },
    secondary: {
      C1: 74,
      C2: 70,
      C3: 72,
      C4: 76,
      C5: 70,
      C6: 82,
      C7: 68,
      C8: 65,
      C9: 70,
      C10: 72,
      C11: 68,
      C12: 74,
    },
    note: "演示数据：冰雪旅游带潜力高，物流与数字基建略弱，可专项补短。",
  },
  {
    id: "jx",
    name: "延庆区旧县镇 · 样品村（演示）",
    short: "旧县镇样品村",
    x: 58,
    y: 58,
    total: 63,
    criteria: { pop: 66, resource: 62, infra: 60, org: 65 },
    secondary: {
      C1: 70,
      C2: 62,
      C3: 68,
      C4: 58,
      C5: 62,
      C6: 60,
      C7: 65,
      C8: 58,
      C9: 64,
      C10: 66,
      C11: 62,
      C12: 60,
    },
    note: "演示数据：综合处于Ⅱ类下游，宜先做一期摸底勘察再投入重培训。",
  },
  {
    id: "xhy",
    name: "延庆区大庄科乡 · 下花园村",
    short: "下花园村",
    x: 38,
    y: 62,
    total: 54,
    criteria: { pop: 58, resource: 52, infra: 48, org: 60 },
    secondary: {
      C1: 52,
      C2: 48,
      C3: 55,
      C4: 50,
      C5: 46,
      C6: 58,
      C7: 62,
      C8: 50,
      C9: 58,
      C10: 55,
      C11: 62,
      C12: 52,
    },
    note: "第一书记政策向账号互动偏低；建议实地走访两委与村民小组座谈复核。",
  },
];

function villageTier(total) {
  if (total >= 80) return { cls: "tier-i", roman: "Ⅰ", label: "优先支持" };
  if (total >= 60) return { cls: "tier-ii", roman: "Ⅱ", label: "审慎优化" };
  return { cls: "tier-iii", roman: "Ⅲ", label: "建议实地勘察" };
}

const COUPLING_THRESH = 0.5;
/** 二级指标演示合格线（对齐报告「良好」区间下沿） */
const INDICATOR_PASS = 60;

const HELP_FOR_INDICATOR = {
  C1: "联合乡镇卫生院、民政口复核老龄结构，滚动安排小班课与接送互助。",
  C2: "核对户籍与常住台账，评估可持续参训人口规模，必要时跨村合班。",
  C3: "针对留守比例设计「错农时」培训与子女连线课堂。",
  C4: "农业办备案+出镜产品清单，补齐「可讲、可拍、可寄」三类证明。",
  C5: "推动分拣分级与简易包装规范，对接市集 / 小店准入。",
  C6: "轻量研学脚本踩点，串联四季题材与账号话题标签。",
  C7: "协调运营商补盲区热点，常备 5G/宽带测速台账。",
  C8: "共配中心与冷链阈值表进村，修订发货 SLA。",
  C9: "梳理进出村干道与停车点，研学大巴接驳预案。",
  C10: "两委工单化：固定场地、例会节奏与志愿者驻点排班。",
  C11: "梳理区镇惠农与培训补贴，专班代办材料。",
  C12: "问卷摸底参训意愿，激励与积分挂钩二次到课。",
};

function computeCouplingIndices(v) {
  const s = v.secondary;
  const A = (0.35 * s.C4 + 0.35 * s.C5 + 0.3 * s.C6) / 100;
  const F = (0.25 * s.C7 + 0.25 * s.C8 + 0.15 * s.C9 + 0.2 * s.C10 + 0.15 * s.C11) / 100;
  const RVCPM = Math.sqrt(A * A + F * F);
  return { A, F, RVCPM };
}

function classifyQuadrant(A, F) {
  const t = COUPLING_THRESH;
  if (A >= t && F >= t) return { key: "star", label: "明星区", cls: "quad-star" };
  if (A >= t && F < t) return { key: "potential", label: "潜力区", cls: "quad-potential" };
  if (A < t && F >= t) return { key: "opportunity", label: "机会区", cls: "quad-opportunity" };
  return { key: "marginal", label: "边缘区", cls: "quad-marginal" };
}

function quadrantHelpHint(q) {
  if (q.key === "star") return "保持专班轻量陪跑，总结素材库与话术模板向全村域共享。";
  if (q.key === "potential")
    return "重点帮扶：先把 F 做上去（网络、物流、两委执行、政策兑现），再扩培训面与账号矩阵。";
  if (q.key === "opportunity")
    return "可承接「配套直播点」「仓储中转」角色，同时策划 1–2 个高辨识度的资源题材打深打透。";
  return "纳入重点帮扶清单：建议实地勘察 + 两委座谈 + 按指标逐项整改，暂缓大规模投入。";
}

/** 《智赋银龄》四类准则 · C1–C12 配色（柱形图分组） */
const C12_BAR_COLOR = {
  C1: "#0ea5e9",
  C2: "#0ea5e9",
  C3: "#0ea5e9",
  C4: "#0d9488",
  C5: "#0d9488",
  C6: "#0d9488",
  C7: "#7c3aed",
  C8: "#7c3aed",
  C9: "#7c3aed",
  C10: "#ea580c",
  C11: "#ea580c",
  C12: "#ea580c",
};

/**
 * 每村二级指标柱状图（0–100），红色虚线为演示合格线 60；颜色按报告四类准则分组。
 */
function buildC12BarSvg(v) {
  const W = 640;
  const H = 248;
  const padL = 40;
  const padR = 14;
  const padB = 40;
  const padT = 32;
  const plotH = H - padT - padB;
  const plotW = W - padL - padR;
  const n = 12;
  const gap = 5;
  const barW = (plotW - gap * (n - 1)) / n;
  const maxBarH = plotH - 4;
  const baseline = padT + plotH;
  const line60Y = baseline - (INDICATOR_PASS / 100) * maxBarH;

  const bars = SECONDARY_META.map((meta, i) => {
    const val = v.secondary[meta.key];
    const h = Math.max(1, (val / 100) * maxBarH);
    const x = padL + i * (barW + gap);
    const y = baseline - h;
    const fill = C12_BAR_COLOR[meta.key];
    const warn = val < INDICATOR_PASS;
    const stroke = warn ? "#b91c1c" : "rgba(15,41,66,0.12)";
    const sw = warn ? 1.4 : 0.35;
    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="3" fill="${fill}" opacity="${warn ? 0.55 : 0.92}" stroke="${stroke}" stroke-width="${sw}"/>
      <text x="${x + barW / 2}" y="${baseline + 17}" text-anchor="middle" font-size="10" fill="#475569" font-weight="600">${meta.key}</text>
      <text x="${x + barW / 2}" y="${y - 5}" text-anchor="middle" font-size="10" font-weight="700" fill="#0f2942">${val}</text>`;
  }).join("");

  const svg = `<svg viewBox="0 0 ${W} ${H}" class="c12-bar-svg" role="img" aria-label="${escapeHtml(v.short)}·C1至C12得分柱形图">
    <text x="${padL}" y="18" font-size="11" fill="#475569" font-weight="600">准则配色：人口(蓝)·资源(青)·基建(紫)·组织(橙)</text>
    <line x1="${padL}" y1="${line60Y}" x2="${W - padR}" y2="${line60Y}" stroke="#dc2626" stroke-dasharray="5 4" stroke-width="1.3"/>
    <text x="${W - padR - 4}" y="${line60Y - 6}" text-anchor="end" font-size="9" fill="#b91c1c" font-weight="600">合格线 ${INDICATOR_PASS}</text>
    ${bars}
    <text x="12" y="${baseline - maxBarH / 2}" transform="rotate(-90 12 ${baseline - maxBarH / 2})" text-anchor="middle" font-size="10" fill="#64748b">得分</text>
  </svg>`;

  const legend = `<div class="c12-legend-row muted tiny">
    <span><i style="background:#0ea5e9" aria-hidden="true"></i>人口适配 C1–C3</span>
    <span><i style="background:#0d9488" aria-hidden="true"></i>资源适配 C4–C6</span>
    <span><i style="background:#7c3aed" aria-hidden="true"></i>基础条件 C7–C9</span>
    <span><i style="background:#ea580c" aria-hidden="true"></i>组织与支持 C10–C12</span>
  </div>`;

  return `<div class="village-c12-viz-inner">${svg}${legend}</div>`;
}

function renderRVCPMMatrix() {
  const host = document.getElementById("rvcpmMatrixHost");
  if (!host) return;

  const W = 440;
  const H = 400;
  const padL = 52;
  const padR = 24;
  const padT = 28;
  const padB = 44;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const mx = padL + plotW * COUPLING_THRESH;
  const my = padT + plotH * (1 - COUPLING_THRESH);

  const computed = VILLAGE_AHP_DEMO.map((v) => ({ v, ...computeCouplingIndices(v) }));
  const maxRv = Math.max(...computed.map((x) => x.RVCPM), 0.01);

  const circles = computed
    .map(({ v, A, F, RVCPM }) => {
      const cx = padL + F * plotW;
      const cy = padT + (1 - A) * plotH;
      const r = 11 + (RVCPM / maxRv) * 26;
      const q = classifyQuadrant(A, F);
      const fill =
        q.key === "star"
          ? "rgba(13,148,136,0.85)"
          : q.key === "potential"
            ? "rgba(14,165,233,0.78)"
            : q.key === "opportunity"
              ? "rgba(245,158,11,0.85)"
              : "rgba(248,113,113,0.78)";
      return `
        <g class="rvcpm-bubble-group" data-goto="v-${escapeAttr(v.id)}">
          <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="0.45" class="rvcpm-bubble-glow" />
          <circle cx="${cx}" cy="${cy}" r="${Math.max(8, r - 5)}" fill="${fill}" stroke="#fff" stroke-width="1.2" class="rvcpm-bubble" style="cursor:pointer" data-vid="${escapeAttr(v.id)}" />
          <text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#0f2942" font-size="11" font-weight="700" pointer-events="none">${escapeHtml(v.short.slice(0, 3))}</text>
        </g>`;
    })
    .join("");

  host.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="rvcpm-svg" role="img" aria-label="四象限气泡图">
      <rect x="${padL}" y="${padT}" width="${plotW}" height="${plotH}" fill="rgba(240,253,250,0.5)" />
      <rect x="${mx}" y="${padT}" width="${padL + plotW - mx}" height="${my - padT}" fill="rgba(14,165,233,0.06)" />
      <rect x="${padL}" y="${padT}" width="${mx - padL}" height="${my - padT}" fill="rgba(14,165,233,0.04)" />
      <rect x="${padL}" y="${my}" width="${mx - padL}" height="${padT + plotH - my}" fill="rgba(245,158,11,0.06)" />
      <rect x="${mx}" y="${my}" width="${padL + plotW - mx}" height="${padT + plotH - my}" fill="rgba(13,148,136,0.07)" />
      <text x="${mx + 6}" y="${padT + 14}" font-size="9" fill="#0d9488" opacity="0.85">明星区</text>
      <text x="${padL + 6}" y="${padT + 14}" font-size="9" fill="#0369a1" opacity="0.85">潜力区</text>
      <text x="${padL + 6}" y="${my + 18}" font-size="9" fill="#b45309" opacity="0.9">边缘区</text>
      <text x="${mx + 6}" y="${my + 18}" font-size="9" fill="#b45309" opacity="0.85">机会区</text>
      <line x1="${padL}" y1="${my}" x2="${padL + plotW}" y2="${my}" stroke="#f87171" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.85"/>
      <line x1="${mx}" y1="${padT}" x2="${mx}" y2="${padT + plotH}" stroke="#f87171" stroke-width="1.2" stroke-dasharray="4 3" opacity="0.85"/>
      <line x1="${padL}" y1="${padT + plotH}" x2="${padL + plotW}" y2="${padT + plotH}" stroke="#94a3b8" stroke-width="1"/>
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${padT + plotH}" stroke="#94a3b8" stroke-width="1"/>
      ${circles}
      <text x="${W / 2}" y="${H - 8}" text-anchor="middle" font-size="11" fill="#475569" font-weight="600">落地可行性 F（0→1）</text>
      <text transform="translate(14 ${padT + plotH / 2}) rotate(-90)" text-anchor="middle" font-size="11" fill="#475569" font-weight="600">资源吸引力 A（0→1）</text>
      <text x="${padL - 8}" y="${padT + plotH + 4}" font-size="9" fill="#64748b">0</text>
      <text x="${padL + plotW - 6}" y="${padT + plotH + 4}" font-size="9" fill="#64748b" text-anchor="end">1</text>
    </svg>
  `;

  host.querySelectorAll(".rvcpm-bubble").forEach((el) => {
    el.addEventListener("click", () => {
      const id = el.getAttribute("data-vid");
      document.getElementById(`v-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function renderVillageCardsStack() {
  const host = document.getElementById("villageCardsHost");
  if (!host) return;

  host.innerHTML = VILLAGE_AHP_DEMO.map((v) => {
    const tier = villageTier(v.total);
    const { A, F, RVCPM } = computeCouplingIndices(v);
    const q = classifyQuadrant(A, F);

    const critRows = ["pop", "resource", "infra", "org"]
      .map((k) => {
        const val = v.criteria[k];
        return `<div class="village-crit-row">
          <span>${escapeHtml(CRITERIA_LABELS[k])}</span>
          <div class="village-bar"><i style="width:${val}%"></i></div>
          <strong>${val}</strong>
        </div>`;
      })
      .join("");

    const rows = SECONDARY_META.map(({ key, label }) => {
      const val = v.secondary[key];
      const ok = val >= INDICATOR_PASS;
      return `<tr class="${ok ? "row-ok" : "row-warn"}">
        <td><strong>${key}</strong></td>
        <td>${escapeHtml(label)}</td>
        <td>${val}</td>
        <td><span class="pill-ind ${ok ? "pill-ok" : "pill-warn"}">${ok ? (["C1","C2","C3"].includes(key) ? "高度适配" : "达标") : (["C1","C2","C3"].includes(key) ? "基本适配" : "待补强")}</span></td>
      </tr>`;
    }).join("");

    const failed = SECONDARY_META.filter(({ key }) => v.secondary[key] < INDICATOR_PASS);
    const helpList =
      failed.length === 0
        ? `<p class="muted small help-empty">全村二级指标均达演示合格线，可保持常态化监测与季度复盘。</p>`
        : `<ul class="help-ul">
            ${failed
              .map(
                ({ key, label }) =>
                  `<li><strong>${key} ${escapeHtml(label)}</strong>（${v.secondary[key]}）：${escapeHtml(
                    HELP_FOR_INDICATOR[key] || "请对照报告表 7 复核采样与问卷口径。"
                  )}</li>`
              )
              .join("")}
          </ul>`;

    const quadHelp = `<p class="quad-help muted small"><strong>象限策略：</strong>${escapeHtml(quadrantHelpHint(q))}</p>`;

    return `
      <article class="village-eval-card" id="v-${escapeAttr(v.id)}">
        <header class="village-eval-head">
          <div>
            <h3 class="village-eval-title">${escapeHtml(v.name)}</h3>
            <p class="muted tiny no-mt">${escapeHtml(v.note)}</p>
          </div>
          <div class="village-eval-badges">
            <span class="vmap-tier ${tier.cls}">${tier.roman}类 · ${tier.label}</span>
            <span class="village-total"><strong>${v.total}</strong><small>综合适配分</small></span>
          </div>
        </header>
        <div class="village-af-box ${q.cls}">
          <div class="af-item"><span>A（资源）</span><strong>${A.toFixed(3)}</strong></div>
          <div class="af-item"><span>F（可行性）</span><strong>${F.toFixed(3)}</strong></div>
          <div class="af-item"><span>RVCPM</span><strong>${RVCPM.toFixed(3)}</strong></div>
          <div class="af-item af-quad"><span>象限</span><strong>${escapeHtml(q.label)}</strong></div>
        </div>
        ${quadHelp}
        <h4 class="village-sub">准则层四维（报告一级指标）</h4>
        <div class="village-crit-grid">${critRows}</div>
        <h4 class="village-sub">二级指标可视化 · C1–C12</h4>
        <div class="village-c12-viz">${buildC12BarSvg(v)}</div>
        <h4 class="village-sub">二级指标明细表</h4>
        <div class="table-scroll">
          <table class="table tourism-table compact village-c12-table">
            <thead><tr><th>代码</th><th>指标</th><th>得分</th><th>判定</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <div class="help-box">
          <h5 class="help-title">帮扶与改进（未达标项）</h5>
          ${helpList}
        </div>
      </article>
    `;
  }).join("");
}

function initRVCPMViz() {
  renderRVCPMMatrix();
  renderVillageCardsStack();
}

const REPL_KNOWLEDGE = [
  {
    tags: ["完播率", "直播", "延庆台账"],
    title: "短视频完播偏低、直播场观与留人不足",
    problem:
      "延庆试点台账小结：开头吸引力与节奏把控不足，直播预热与互动弱，短视频与直播流量联动不够；个案中场观仅约十几人、完播率偏低与点踩多于点赞需警惕。",
    solution:
      "强化前 3 秒脚本模板与「香椿季」等农事节点的钩子训练；直播设置预约、福袋话术与连麦节奏；政策类内容拆条 + 志愿者陪练复盘。对齐青韵馨香实践团后续小班课表。",
  },
  {
    tags: ["村民积极性", "培训", "激励"],
    title: "村民报名积极但线下出勤忽高忽低",
    problem:
      "农忙与照护孙辈时段冲突明显，第一周到课率高，第三轮开始下滑约 38%。运营侧误以为「不配合」。",
    solution:
      "错峰排周二/周四晨间短课（≤90min）+ 「补课券」回看；村集体广播站每日一条「同学成果」，并试行互助积分挂钩团购折扣。已由竹园村验证出勤回升。",
  },
  {
    tags: ["物流", "冷链", "回款"],
    title: "高价值鲜果发货损耗与回款纠纷",
    problem:
      "首月挂车售出后差评集中在「到站软烂」，农户自行打包标准不一；代发结款周期长，挫伤二次开播意愿。",
    solution:
      "统一分拣 SOP + 冰袋阈值表；与镇上共配中心签「村集体对公」两日结；话术模板明示「签收 2 小时内拍照理赔」。沙门村实施后退款率下降至 4.8%。",
  },
  {
    tags: ["脚本", "话术", "违禁词"],
    title: "口播违禁词误判与反复下架",
    problem:
      "多次使用「史上最」「奇效」等平台敏感词触发审核；银发讲师记忆负担大。",
    solution:
      "上线本地「脚本沙箱」+ 词条云每日更新村版白名单替代词库；试讲阶段志愿者「一拍即合规」陪练。整改模板可向其他试点村平移。",
  },
  {
    tags: ["两委", "动员", "项目制"],
    title: "两委支持口头积极但资源配置不足",
    problem:
      "缺少固定活动场地开放时间，文明实践站与村委会议室档期冲突导致设备闲置。",
    solution:
      "签订《数字兴村项目工单》：明确每周三场固定场地 + 一条志愿者驻点排班；镇政府文化站兜底周末半日借用。已在柳溪村写入村规民约附录。",
  },
  {
    tags: ["跨村", "引流", "分成"],
    title: "跨村联营分成争议",
    problem:
      "游客从沙门导流至民宿带，核销口径不清，联营池结算延迟引发投诉。",
    solution:
      "统一「一单多场景」核销码 + T+7 联营池明细公示；联营协议模板附「导流系数」计算器。可参考现有片区抱团案例自动对账报表。",
  },
];

function renderReplKb(filter) {
  const list = document.getElementById("replKbList");
  if (!list) return;

  const q = (filter || "").trim().toLowerCase();

  list.innerHTML = REPL_KNOWLEDGE.filter((item) => {
    if (!q) return true;
    const blob = `${item.title} ${item.problem} ${item.solution} ${item.tags.join(" ")}`.toLowerCase();
    return blob.includes(q);
  })
    .map(
      (item) => `
      <article class="kb-item" role="listitem">
        <div class="kb-tags">${item.tags.map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</div>
        <h4>${escapeHtml(item.title)}</h4>
        <p class="kb-q"><strong>问题：</strong>${escapeHtml(item.problem)}</p>
        <p class="kb-a"><strong>已验证做法：</strong>${escapeHtml(item.solution)}</p>
      </article>`
    )
    .join("") || `<p class="muted small kb-empty">无匹配条目，可换一个关键词。</p>`;
}

function initReplicateCenter() {
  const form = document.getElementById("replEvalForm");
  if (form) {
    drawRadarGridsStatic();

    form.querySelectorAll("input[type=range]").forEach((inp) => {
      inp.addEventListener("input", updateReplVisualization);
    });

    document.getElementById("replResetDemo")?.addEventListener("click", resetReplDemo);

    updateReplVisualization();
  }

  seedVillageBenchmark();
  initRVCPMViz();
  renderReplKb("");
  document.getElementById("replKbSearch")?.addEventListener("input", (e) => {
    renderReplKb(e.target.value);
  });
}

initNav();
renderTalentProfiles("");
bindTalentProfileSearch();
initReplicateCenter();
updateSyncTime();
setInterval(updateSyncTime, 1000);
