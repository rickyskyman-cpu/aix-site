/* AI+X 行业案例网 · 静态前端（无依赖） */
(function () {
  'use strict';
  var DATA = {};
  var FILES = ['meta', 'news', 'cases', 'topics', 'institutions', 'regions'];
  var app = document.getElementById('app');
  var PALETTE = ['#1e5bd8', '#19b4e6', '#0b2a5b', '#7a4ad8', '#12936b', '#c97a10', '#e0457b', '#5b6782', '#2f7bff', '#0d8fae', '#9aa9c9', '#6bc2a1', '#f0a24b', '#8c6be8'];
  var MATURITY_ORDER = ['研究验证', '试点', '规模化', '商业化'];

  /* ---------- utils ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? esc(u) : '#'; }
  function ext(u, text) { return '<a class="src" href="' + safeUrl(u) + '" target="_blank" rel="noopener noreferrer">' + esc(text) + '</a>'; }
  function cred(c) { return '<span class="cred ' + (c === '官方发布' ? 'cred-official' : 'cred-media') + '">' + esc(c) + '</span>'; }
  function uniq(arr) { var s = {}; return arr.filter(function (x) { return s[x] ? false : (s[x] = true); }); }
  function countBy(arr, fn) {
    var m = {};
    arr.forEach(function (x) { [].concat(fn(x)).forEach(function (k) { m[k] = (m[k] || 0) + 1; }); });
    return Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  }
  function parseHash() {
    var h = location.hash.replace(/^#\/?/, '');
    var qi = h.indexOf('?');
    var path = qi >= 0 ? h.slice(0, qi) : h;
    var params = {};
    if (qi >= 0) h.slice(qi + 1).split('&').forEach(function (kv) {
      if (!kv) return; var p = kv.split('='); params[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' '));
    });
    return { parts: path.split('/').filter(Boolean), params: params };
  }
  function buildQuery(o) {
    var q = Object.keys(o).filter(function (k) { return o[k]; }).map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(o[k]); }).join('&');
    return q ? '?' + q : '';
  }

  /* ---------- charts v2 (hand-rolled SVG, no dependencies) ---------- */
  var CH = ['#1e5bd8', '#19b4e6', '#7a4ad8', '#12936b', '#f0a24b', '#e0457b', '#0d8fae', '#9aa9c9'];
  var CAT_COLOR = { '模型发布': '#1e5bd8', '产品更新': '#19b4e6', '融资并购': '#f0a24b', '政策法规': '#7a4ad8', '科研突破': '#12936b' };
  var MAT_COLOR = { '研究验证': '#9aa9c9', '试点': '#19b4e6', '规模化': '#1e5bd8', '商业化': '#0b2a5b' };
  var gid = 0;
  function pct(a, b) { return b ? Math.round(a * 1000 / b) / 10 : 0; }
  function topN(rows, n) {
    if (rows.length <= n) return rows;
    var head = rows.slice(0, n - 1), rest = rows.slice(n - 1).reduce(function (s, r) { return s + r[1]; }, 0);
    return head.concat([['其他', rest, true]]);
  }
  function niceTicks(max, count) {
    max = Math.max(max, 1);
    var raw = max / (count || 4), mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), n = raw / mag;
    var step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
    step = Math.max(1, Math.round(step));
    var top = Math.ceil(max / step) * step, t = [];
    for (var v = 0; v <= top; v += step) t.push(v);
    return t;
  }
  function tipAttr(text) { return ' data-tip="' + esc(text) + '"'; }

  // horizontal bars, sorted, top-N + 其他
  function hbar(rows, opt) {
    opt = opt || {};
    var total = opt.total || rows.reduce(function (s, r) { return s + r[1]; }, 0);
    rows = topN(rows, opt.top || 8);
    var id = 'hb' + (++gid), w = opt.w || 460, left = opt.left || 92, right = 34, rh = 26, top = 6, plotW = w - left - right;
    var h = top + rows.length * rh + 26;
    var ticks = niceTicks(Math.max.apply(null, rows.map(function (r) { return r[1]; })), 4), max = ticks[ticks.length - 1];
    var c1 = opt.c1 || '#1e5bd8', c2 = opt.c2 || '#19b4e6';
    var s = '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(opt.label || '') + '">' +
      '<defs><linearGradient id="' + id + '" x1="0" x2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs>';
    ticks.forEach(function (t) {
      var x = left + plotW * t / max;
      s += '<line x1="' + x + '" y1="' + top + '" x2="' + x + '" y2="' + (h - 22) + '" class="grid"/>' +
        '<text x="' + x + '" y="' + (h - 8) + '" text-anchor="middle" class="axis">' + t + '</text>';
    });
    rows.forEach(function (r, i) {
      var y = top + i * rh, bw = Math.max(plotW * r[1] / max, 3), share = pct(r[1], total);
      s += '<text x="' + (left - 8) + '" y="' + (y + 16) + '" text-anchor="end" class="lbl">' + esc(r[0]) + '</text>' +
        '<g' + tipAttr(r[0] + '：' + r[1] + ' ' + (opt.unit || '') + '（' + share + '%）' + (r[2] ? '，合并长尾' : '')) + '>' +
        '<rect x="' + left + '" y="' + (y + 4) + '" width="' + plotW + '" height="' + (rh - 9) + '" rx="5" class="track"/>' +
        '<rect class="bar-anim" style="animation-delay:' + (i * 40) + 'ms" x="' + left + '" y="' + (y + 4) + '" width="' + bw.toFixed(1) + '" height="' + (rh - 9) + '" rx="5" fill="' + (r[2] ? '#c3cde3' : 'url(#' + id + ')') + '"/></g>' +
        '<text x="' + (left + bw + 6).toFixed(1) + '" y="' + (y + 16) + '" class="val">' + r[1] + '</text>';
    });
    return s + '</svg>';
  }

  // donut with center total + legend (with %)
  function donutV2(rows, opt) {
    opt = opt || {};
    rows = topN(rows, opt.top || 7);
    var total = rows.reduce(function (s, r) { return s + r[1]; }, 0) || 1;
    var R = 62, C = 2 * Math.PI * R, off = 0;
    var s = '<svg viewBox="0 0 170 170" class="donut" role="img" aria-label="' + esc(opt.label || '') + '"><g transform="rotate(-90 85 85)">' +
      '<circle cx="85" cy="85" r="' + R + '" fill="none" stroke="#eef2fa" stroke-width="22"/>';
    rows.forEach(function (r, i) {
      var len = C * r[1] / total, col = r[2] ? '#c3cde3' : CH[i % CH.length];
      s += '<circle class="seg" style="animation-delay:' + (i * 60) + 'ms" cx="85" cy="85" r="' + R + '" fill="none" stroke="' + col + '" stroke-width="22" stroke-dasharray="' + Math.max(len - 1.5, 0.5).toFixed(2) + ' ' + C.toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '"' +
        tipAttr(r[0] + '：' + r[1] + ' ' + (opt.unit || '') + '（' + pct(r[1], total) + '%）') + '/>';
      off += len;
    });
    s += '</g><text x="85" y="84" text-anchor="middle" class="d-total">' + total + '</text><text x="85" y="103" text-anchor="middle" class="axis">' + esc(opt.center || '') + '</text></svg>';
    var lg = '<ul class="d-legend">' + rows.map(function (r, i) {
      return '<li' + tipAttr(r[0] + '：' + r[1] + '（' + pct(r[1], total) + '%）') + '><i style="background:' + (r[2] ? '#c3cde3' : CH[i % CH.length]) + '"></i><span>' + esc(r[0]) + '</span><b>' + r[1] + '</b><em>' + pct(r[1], total) + '%</em></li>';
    }).join('') + '</ul>';
    return '<div class="donut-wrap">' + s + lg + '</div>';
  }

  // stacked monthly columns by news category
  function stackedMonths(items, opt) {
    opt = opt || {};
    var m = {}, cats = Object.keys(CAT_COLOR);
    items.forEach(function (n) { var k = n.date.slice(0, 7); m[k] = m[k] || {}; m[k][n.category] = (m[k][n.category] || 0) + 1; if (cats.indexOf(n.category) < 0) cats.push(n.category); });
    var keys = Object.keys(m).sort(); if (!keys.length) return '';
    var all = [], y = +keys[0].slice(0, 4), mo = +keys[0].slice(5, 7), last = keys[keys.length - 1];
    while (true) { var k = y + '-' + (mo < 10 ? '0' : '') + mo; all.push(k); if (k >= last || all.length > 60) break; mo++; if (mo > 12) { mo = 1; y++; } }
    var totals = all.map(function (k) { var t = 0; for (var c in (m[k] || {})) t += m[k][c]; return t; });
    var ticks = niceTicks(Math.max.apply(null, totals), 4), max = ticks[ticks.length - 1];
    var w = 520, h = 200, left = 28, right = 8, top = 14, bottom = 26, plotH = h - top - bottom, plotW = w - left - right, bw = plotW / all.length;
    var s = '<svg viewBox="0 0 ' + w + ' ' + h + '" role="img" aria-label="' + esc(opt.label || '') + '">';
    ticks.forEach(function (t) {
      var yy = top + plotH - plotH * t / max;
      s += '<line x1="' + left + '" y1="' + yy + '" x2="' + (w - right) + '" y2="' + yy + '" class="grid"/><text x="' + (left - 6) + '" y="' + (yy + 3.5) + '" text-anchor="end" class="axis">' + t + '</text>';
    });
    all.forEach(function (k, i) {
      var x = left + i * bw + bw * 0.2, cw = bw * 0.6, acc = 0, d = m[k] || {};
      s += '<g class="col-anim" style="animation-delay:' + (i * 30) + 'ms">';
      cats.forEach(function (c) {
        if (!d[c]) return;
        var hh = plotH * d[c] / max, yy = top + plotH - plotH * (acc + d[c]) / max;
        s += '<rect x="' + x.toFixed(1) + '" y="' + yy.toFixed(1) + '" width="' + cw.toFixed(1) + '" height="' + Math.max(hh - 1, 1).toFixed(1) + '" rx="2.5" fill="' + (CAT_COLOR[c] || '#9aa9c9') + '"' + tipAttr(k + ' · ' + c + '：' + d[c] + ' 条（当月共 ' + totals[i] + ' 条）') + '/>';
        acc += d[c];
      });
      s += '</g>';
      if (totals[i]) s += '<text x="' + (x + cw / 2).toFixed(1) + '" y="' + (top + plotH - plotH * totals[i] / max - 4).toFixed(1) + '" text-anchor="middle" class="val sm">' + totals[i] + '</text>';
      var every = all.length > 12 ? 2 : 1;
      if (i % every === 0 || i === all.length - 1) s += '<text x="' + (x + cw / 2).toFixed(1) + '" y="' + (h - 9) + '" text-anchor="middle" class="axis">' + k.slice(2).replace('-', '.') + '</text>';
    });
    s += '<line x1="' + left + '" y1="' + (top + plotH) + '" x2="' + (w - right) + '" y2="' + (top + plotH) + '" class="axis-line"/></svg>';
    var lg = '<div class="legend">' + cats.filter(function (c) { return items.some(function (n) { return n.category === c; }); }).map(function (c) {
      return '<span><i style="background:' + (CAT_COLOR[c] || '#9aa9c9') + '"></i>' + esc(c) + ' ' + items.filter(function (n) { return n.category === c; }).length + '</span>';
    }).join('') + '</div>';
    return s + lg;
  }

  // 100% stacked proportion bars
  function propBars(groups) {
    return groups.map(function (g) {
      var total = g.rows.reduce(function (s, r) { return s + r[1]; }, 0) || 1;
      return '<div class="prop"><div class="prop-head"><span>' + esc(g.title) + '</span><span class="muted">' + total + ' ' + esc(g.unit || '') + '</span></div><div class="prop-bar">' +
        g.rows.filter(function (r) { return r[1]; }).map(function (r, i) {
          var p = pct(r[1], total);
          return '<span class="prop-seg" style="width:' + p + '%;background:' + (g.colors[r[0]] || CH[i % CH.length]) + ';animation-delay:' + (i * 80) + 'ms"' + tipAttr(g.title + ' · ' + r[0] + '：' + r[1] + '（' + p + '%）') + '>' + (p >= 12 ? p + '%' : '') + '</span>';
        }).join('') + '</div><div class="legend">' + g.rows.map(function (r, i) {
          return '<span><i style="background:' + (g.colors[r[0]] || CH[i % CH.length]) + '"></i>' + esc(r[0]) + ' ' + r[1] + '</span>';
        }).join('') + '</div></div>';
    }).join('');
  }

  function radarV2(topics) {
    var n = topics.length, cx = 210, cy = 142, R = 100, id = 'rd' + (++gid);
    var s = '<svg viewBox="0 0 420 290" role="img" aria-label="技术成熟度雷达图"><defs><radialGradient id="' + id + '"><stop offset="0" stop-color="#19b4e6" stop-opacity=".45"/><stop offset="1" stop-color="#1e5bd8" stop-opacity=".22"/></radialGradient></defs>';
    function pt(i, v) { var a = -Math.PI / 2 + 2 * Math.PI * i / n; return [cx + R * v * Math.cos(a), cy + R * v * Math.sin(a)]; }
    for (var lv = 1; lv <= 5; lv++) {
      var ring = []; for (var i = 0; i < n; i++) ring.push(pt(i, lv / 5).map(function (x) { return x.toFixed(1); }).join(','));
      s += '<polygon points="' + ring.join(' ') + '" fill="' + (lv % 2 ? '#f7f9fd' : '#fff') + '" stroke="#e1e7f3"/>';
    }
    for (var j = 0; j < n; j++) { var e = pt(j, 1); s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + e[0].toFixed(1) + '" y2="' + e[1].toFixed(1) + '" stroke="#e1e7f3"/>'; }
    for (var l = 1; l <= 5; l++) s += '<text x="' + (cx + 3) + '" y="' + (cy - R * l / 5 + 3) + '" class="axis sm">' + l + '</text>';
    var poly = topics.map(function (t, i) { return pt(i, (t.maturity_score || 0) / 5).map(function (x) { return x.toFixed(1); }).join(','); });
    s += '<polygon class="radar-anim" points="' + poly.join(' ') + '" fill="url(#' + id + ')" stroke="#1e5bd8" stroke-width="2" stroke-linejoin="round"/>';
    topics.forEach(function (t, i) {
      var p = pt(i, 1.17), anchor = Math.abs(p[0] - cx) < 12 ? 'middle' : (p[0] > cx ? 'start' : 'end');
      s += '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] + 4).toFixed(1) + '" text-anchor="' + anchor + '" class="lbl">' + esc(t.name.replace(/（.*?）/, '')) + '</text>';
      var d = pt(i, (t.maturity_score || 0) / 5);
      s += '<circle cx="' + d[0].toFixed(1) + '" cy="' + d[1].toFixed(1) + '" r="4.5" fill="#fff" stroke="#1e5bd8" stroke-width="2"' + tipAttr(t.name + '：' + t.maturity + '（' + t.maturity_score + '/5，编辑评估）') + '/>';
    });
    return s + '</svg>';
  }

  function initTooltip() {
    var tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip);
    function show(el, x, y) { tip.textContent = el.getAttribute('data-tip'); tip.style.opacity = 1; move(x, y); }
    function move(x, y) {
      var w = tip.offsetWidth, vw = document.documentElement.clientWidth;
      tip.style.left = Math.min(Math.max(8, x - w / 2), vw - w - 8) + 'px'; tip.style.top = (y - tip.offsetHeight - 12) + 'px';
    }
    document.addEventListener('mousemove', function (e) {
      var el = e.target.closest && e.target.closest('[data-tip]');
      if (el) show(el, e.clientX, e.clientY); else tip.style.opacity = 0;
    });
    document.addEventListener('click', function (e) {
      var el = e.target.closest && e.target.closest('[data-tip]');
      if (el) show(el, e.clientX, e.clientY); else tip.style.opacity = 0;
    });
    window.addEventListener('scroll', function () { tip.style.opacity = 0; }, { passive: true });
  }
  /* ---------- components ---------- */
  function newsItem(n) {
    return '<div class="news-item"><div class="date">' + esc(n.date) + '</div><div>' +
      '<h3>' + esc(n.title) + '</h3><p>' + esc(n.summary) + '</p>' +
      '<div class="news-meta"><span class="tag cat">' + esc(n.category) + '</span><span class="tag region">' + esc(n.region) + '</span>' + cred(n.credibility) + ext(n.source_url, '来源：' + n.source_name) + '</div></div></div>';
  }
  function caseCard(c) {
    return '<article class="card hover case-card">' +
      '<div class="tags"><span class="tag cat">' + esc(c.industry) + '</span><span class="tag region">' + esc(c.region) + ' · ' + esc(c.country) + '</span><span class="tag mat">' + esc(c.maturity) + '</span></div>' +
      '<h3><a href="#/case/' + esc(c.id) + '">' + esc(c.title) + '</a></h3>' +
      '<div class="org">' + esc(c.org) + ' · ' + esc(c.date) + '</div>' +
      '<div class="tags">' + c.tech.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join('') + '</div>' +
      '<div class="effect"><b>效果：</b>' + esc(c.effect) + '</div>' +
      '<div class="foot">' + cred(c.credibility) + '<a href="#/case/' + esc(c.id) + '">查看详情 →</a></div></article>';
  }
  function setActive(route) {
    [].forEach.call(document.querySelectorAll('.nav a'), function (a) { a.classList.toggle('active', a.getAttribute('data-route') === route); });
  }

  /* ---------- pages ---------- */
  function pageHome() {
    var cases = DATA.cases, news = DATA.news, topics = DATA.topics;
    var latestCases = cases.slice().sort(function (a, b) { return b.date.localeCompare(a.date); }).slice(0, 8);
    var industries = uniq(cases.map(function (c) { return c.industry; })).length;
    var updated = (DATA.meta && DATA.meta.updated) || news[0].date;

    // KPIs (all derived from data/*.json)
    var countries = uniq(cases.map(function (c) { return c.country; })).length;
    var regions = uniq(cases.map(function (c) { return c.region; })).length;
    var official = cases.filter(function (c) { return c.credibility === '官方发布'; }).length;
    var disclosed = cases.filter(function (c) { return c.effect && c.effect !== '未公开'; }).length;
    var scaled = cases.filter(function (c) { return c.maturity === '规模化' || c.maturity === '商业化'; }).length;
    var cn = cases.filter(function (c) { return c.region === '中国'; }).length;
    var d0 = new Date(updated + 'T00:00:00Z'), recent = news.filter(function (n) { return (d0 - new Date(n.date + 'T00:00:00Z')) / 864e5 <= 90; }).length;
    function kpi(v, label, sub) { return '<div class="kpi"><b>' + v + '</b><span>' + esc(label) + '</span>' + (sub ? '<em>' + esc(sub) + '</em>' : '') + '</div>'; }

    var html = '<section class="hero hero-v2"><div class="hero-main"><div class="eyebrow">全球 AI 情报 · 数据更新于 ' + esc(updated) + '</div>' +
      '<h1>全球 AI 进展 × 行业落地案例情报站</h1>' +
      '<p>回答“哪项 AI 技术、在哪个地区、哪个行业、被谁、怎么用、效果如何”。每条内容均附原始来源。</p>' +
      '<form class="hero-search" id="heroSearch"><input id="heroQ" placeholder="搜索案例：金融 客服、自动驾驶、DeepSeek、病理…" aria-label="搜索案例"><button class="btn" type="submit">搜索</button></form></div>' +
      '<div class="hero-stats">' +
      '<a class="stat" href="#/cases"><b>' + cases.length + '</b><span>行业案例</span></a>' +
      '<a class="stat" href="#/news"><b>' + news.length + '</b><span>动态快讯</span></a>' +
      '<a class="stat" href="#/institutions"><b>' + DATA.institutions.length + '</b><span>机构与高校</span></a>' +
      '<a class="stat" href="#/cases"><b>' + industries + '</b><span>覆盖行业</span></a></div></section>';

    // 今日要闻 + 热点技术
    html += '<div class="home-row section"><section class="card pad-sm"><div class="section-head"><h2>今日要闻</h2><a href="#/news">全部快讯 →</a></div><ul class="news-compact">' +
      news.slice(0, 7).map(function (n) {
        return '<li><span class="nc-date">' + esc(n.date.slice(5)) + '</span><div class="nc-body"><a class="nc-title" href="' + safeUrl(n.source_url) + '" target="_blank" rel="noopener noreferrer" title="' + esc(n.summary) + '">' + esc(n.title) + '</a>' +
          '<div class="nc-meta"><span class="dot" style="background:' + (CAT_COLOR[n.category] || '#9aa9c9') + '"></span>' + esc(n.category) + ' · ' + esc(n.region) + ' · ' + esc(n.source_name) + ' ' + cred(n.credibility) + '</div></div></li>';
      }).join('') + '</ul></section>' +
      '<section class="card pad-sm"><div class="section-head"><h2>热点技术</h2><a href="#/tech">技术前沿 →</a></div><ul class="topic-compact">' +
      topics.map(function (t) {
        var m = ''; for (var i = 1; i <= 5; i++) m += '<i class="' + (i <= t.maturity_score ? 'on' : '') + '"></i>';
        return '<li><a href="#/tech?t=' + esc(t.id) + '"><span class="tc-name">' + esc(t.name) + '</span><span class="tc-what">' + esc(t.what) + '</span></a><span class="tc-mat"' + tipAttr('成熟度（编辑评估）：' + t.maturity + ' ' + t.maturity_score + '/5') + '><span class="meter">' + m + '</span><em>' + esc(t.maturity) + '</em></span></li>';
      }).join('') + '</ul></section></div>';

    // 最新案例
    html += '<section class="section"><div class="section-head"><h2>最新案例</h2><a href="#/cases">进入案例库（' + cases.length + '）→</a></div><div class="grid g4 case-compact">' +
      latestCases.map(function (c) {
        return '<a class="card hover cc" href="#/case/' + esc(c.id) + '"><div class="tags"><span class="tag cat">' + esc(c.industry) + '</span><span class="tag region">' + esc(c.region) + '</span></div>' +
          '<h3>' + esc(c.title) + '</h3><div class="cc-org">' + esc(c.org) + ' · ' + esc(c.date) + '</div>' +
          '<p class="cc-effect">' + esc(c.effect) + '</p><div class="cc-foot">' + cred(c.credibility) + '<span class="tag mat">' + esc(c.maturity) + '</span></div></a>';
      }).join('') + '</div></section>';

    // 数据看板
    var byIndustry = countBy(cases, function (c) { return c.industry; });
    var byRegion = countBy(cases, function (c) { return c.region; });
    var byTech = countBy(cases, function (c) { return c.tech; });
    var byMat = MATURITY_ORDER.map(function (m) { return [m, cases.filter(function (c) { return c.maturity === m; }).length]; });
    var byCred = [['官方发布', official], ['媒体报道', cases.length - official]];
    html += '<section class="section dashboard"><div class="section-head"><h2>数据看板</h2><span class="muted small">全部图表由 data/*.json 实时计算 · 悬停查看明细</span></div>' +
      '<div class="kpis">' +
      kpi(regions + ' / ' + countries, '覆盖地区 / 国家', '案例库') +
      kpi(pct(cn, cases.length) + '%', '中国案例占比', cn + ' / ' + cases.length) +
      kpi(pct(scaled, cases.length) + '%', '规模化及商业化', scaled + ' 个案例') +
      kpi(pct(disclosed, cases.length) + '%', '量化效果披露率', '其余标注“未公开”') +
      kpi(pct(official, cases.length) + '%', '官方发布来源', official + ' 个案例') +
      kpi(recent, '近 90 天快讯', '截至 ' + updated) + '</div>' +
      '<div class="dash-grid">' +
      '<div class="card chart-card"><div class="cc-head"><h3>案例行业分布</h3><span class="muted small">Top 9 + 其他</span></div><div class="chart">' + hbar(byIndustry, { top: 10, w: 340, left: 78, unit: '个案例', label: '案例行业分布' }) + '</div></div>' +
      '<div class="card chart-card"><div class="cc-head"><h3>案例地区分布</h3><span class="muted small">按地区</span></div><div class="chart">' + donutV2(byRegion, { center: '个案例', unit: '个案例', label: '案例地区分布' }) + '</div></div>' +
      '<div class="card chart-card"><div class="cc-head"><h3>技术成熟度雷达</h3><span class="muted small">编辑评估 1–5</span></div><div class="chart">' + radarV2(topics) + '</div></div>' +
      '<div class="card chart-card span2"><div class="cc-head"><h3>快讯月度趋势</h3><span class="muted small">按类别堆叠 · 共 ' + news.length + ' 条</span></div><div class="chart">' + stackedMonths(news, { label: '快讯月度趋势' }) + '</div></div>' +
      '<div class="card chart-card"><div class="cc-head"><h3>案例成熟度与可信等级</h3></div><div class="chart">' +
      propBars([{ title: '成熟度', unit: '个案例', rows: byMat, colors: MAT_COLOR }, { title: '可信等级', unit: '个案例', rows: byCred, colors: { '官方发布': '#12936b', '媒体报道': '#f0a24b' } }]) + '</div></div>' +
      '<div class="card chart-card span2"><div class="cc-head"><h3>案例技术标签 Top 10</h3><span class="muted small">占案例比例 · 一个案例可含多个标签</span></div><div class="chart">' + hbar(byTech, { top: 10, w: 720, left: 104, unit: '个案例', total: cases.length, label: '技术标签', c1: '#7a4ad8', c2: '#1e5bd8' }) + '</div></div>' +
      '<div class="card chart-card"><div class="cc-head"><h3>快讯地区分布</h3><span class="muted small">共 ' + news.length + ' 条</span></div><div class="chart">' + hbar(countBy(news, function (n) { return n.region; }), { top: 8, w: 340, left: 54, unit: '条快讯', label: '快讯地区分布', c1: '#0d8fae', c2: '#19b4e6' }) + '</div></div>' +
      '</div></section>';

    app.innerHTML = html;
    document.getElementById('heroSearch').addEventListener('submit', function (e) {
      e.preventDefault(); location.hash = '#/cases' + buildQuery({ q: document.getElementById('heroQ').value.trim() });
    });
  }
  function pageNews(params) {
    var cats = ['全部'].concat(uniq(DATA.news.map(function (n) { return n.category; })));
    var regions = ['全部地区'].concat(uniq(DATA.news.map(function (n) { return n.region; })));
    var cat = params.cat || '全部', reg = params.region || '全部地区';
    var list = DATA.news.filter(function (n) { return (cat === '全部' || n.category === cat) && (reg === '全部地区' || n.region === reg); });
    app.innerHTML = '<div class="page-title"><h1>AI 动态快讯</h1><p>模型发布、产品更新、融资并购、政策法规、科研突破，每条附来源链接。</p></div>' +
      '<div class="chipbar">' + cats.map(function (c) { return '<button class="chip' + (c === cat ? ' on' : '') + '" data-cat="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>' +
      '<div class="chipbar">' + regions.map(function (r) { return '<button class="chip' + (r === reg ? ' on' : '') + '" data-region="' + esc(r) + '">' + esc(r) + '</button>'; }).join('') + '</div>' +
      '<div class="result-count">共 ' + list.length + ' 条</div>' +
      '<div class="card">' + (list.length ? list.map(newsItem).join('') : '<div class="empty">暂无符合条件的快讯</div>') + '</div>';
    [].forEach.call(app.querySelectorAll('[data-cat]'), function (b) { b.onclick = function () { location.hash = '#/news' + buildQuery({ cat: b.dataset.cat === '全部' ? '' : b.dataset.cat, region: reg === '全部地区' ? '' : reg }); }; });
    [].forEach.call(app.querySelectorAll('[data-region]'), function (b) { b.onclick = function () { location.hash = '#/news' + buildQuery({ cat: cat === '全部' ? '' : cat, region: b.dataset.region === '全部地区' ? '' : b.dataset.region }); }; });
  }

  function pageTech(params) {
    var newsById = {}; DATA.news.forEach(function (n) { newsById[n.id] = n; });
    app.innerHTML = '<div class="page-title"><h1>技术前沿</h1><p>按“是什么 / 为什么重要 / 谁在做 / 成熟度”解读热点技术方向。成熟度为编辑评估，仅供参考。</p></div>' +
      '<div class="grid g2">' + DATA.topics.map(function (t) {
        var meter = ''; for (var i = 1; i <= 5; i++) meter += '<i class="' + (i <= t.maturity_score ? 'on' : '') + '"></i>';
        var rel = (t.related_news || []).map(function (id) { return newsById[id]; }).filter(Boolean);
        return '<article class="card topic" id="topic-' + esc(t.id) + '"><h3>' + esc(t.name) + '<span class="tag mat">' + esc(t.maturity) + '</span></h3><dl>' +
          '<dt>是什么</dt><dd>' + esc(t.what) + '</dd><dt>为什么重要</dt><dd>' + esc(t.why) + '</dd>' +
          '<dt>谁在做</dt><dd><div class="tags">' + t.who.map(function (w) { return '<span class="tag">' + esc(w) + '</span>'; }).join('') + '</div></dd>' +
          '<dt>成熟度</dt><dd><div class="meter">' + meter + '</div></dd>' +
          (rel.length ? '<dt>相关动态</dt><dd>' + rel.map(function (n) { return '<div>· ' + ext(n.source_url, n.date + ' ' + n.title) + '</div>'; }).join('') + '</dd>' : '') +
          '</dl></article>';
      }).join('') + '</div>';
    if (params.t) { var el = document.getElementById('topic-' + params.t); if (el) { el.scrollIntoView({ block: 'start' }); el.style.outline = '2px solid #1e5bd8'; } }
  }

  function pageCases(params) {
    var C = DATA.cases;
    var opts = {
      industry: uniq(C.map(function (c) { return c.industry; })).sort(),
      region: uniq(C.map(function (c) { return c.region; })),
      tech: uniq([].concat.apply([], C.map(function (c) { return c.tech; }))).sort(),
      maturity: MATURITY_ORDER.filter(function (m) { return C.some(function (c) { return c.maturity === m; }); })
    };
    function sel(name, label) {
      return '<div><label for="f-' + name + '">' + label + '</label><select id="f-' + name + '"><option value="">全部</option>' +
        opts[name].map(function (o) { return '<option' + (params[name] === o ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select></div>';
    }
    app.innerHTML = '<div class="page-title"><h1>行业案例库</h1><p>按 行业 × 地区 × 技术 × 成熟度 多维筛选，支持关键词搜索。筛选结果的网址可直接复制分享。</p></div>' +
      '<div class="filters card"><div class="kw"><label for="f-q">关键词</label><input id="f-q" placeholder="标题、企业、场景、效果…" value="' + esc(params.q || '') + '"></div>' +
      sel('industry', '行业') + sel('region', '地区') + sel('tech', '技术') + sel('maturity', '成熟度') +
      '<div><button class="btn ghost" id="f-reset" type="button">重置</button></div></div>' +
      '<div class="result-count" id="count"></div><div class="grid g3" id="caseGrid"></div>';
    function apply(push) {
      var f = { q: document.getElementById('f-q').value.trim() };
      ['industry', 'region', 'tech', 'maturity'].forEach(function (k) { f[k] = document.getElementById('f-' + k).value; });
      var kw = f.q.toLowerCase().split(/\s+/).filter(Boolean);
      var list = C.filter(function (c) {
        if (f.industry && c.industry !== f.industry) return false;
        if (f.region && c.region !== f.region) return false;
        if (f.tech && c.tech.indexOf(f.tech) < 0) return false;
        if (f.maturity && c.maturity !== f.maturity) return false;
        var hay = [c.title, c.org, c.country, c.industry, c.region, c.tech.join(' '), c.scenario, c.problem, c.approach, c.effect].join(' ').toLowerCase();
        return kw.every(function (k) { return hay.indexOf(k) >= 0; });
      }).sort(function (a, b) { return b.date.localeCompare(a.date); });
      document.getElementById('count').textContent = '共找到 ' + list.length + ' 个案例';
      document.getElementById('caseGrid').innerHTML = list.length ? list.map(caseCard).join('') : '<div class="card empty" style="grid-column:1/-1">没有符合条件的案例，试试减少筛选条件。</div>';
      if (push) history.replaceState(null, '', '#/cases' + buildQuery(f));
    }
    ['industry', 'region', 'tech', 'maturity'].forEach(function (k) { document.getElementById('f-' + k).onchange = function () { apply(true); }; });
    var t; document.getElementById('f-q').oninput = function () { clearTimeout(t); t = setTimeout(function () { apply(true); }, 200); };
    document.getElementById('f-reset').onclick = function () { location.hash = '#/cases'; };
    apply(false);
  }

  function pageCase(id) {
    var c = DATA.cases.filter(function (x) { return x.id === id; })[0];
    if (!c) { app.innerHTML = '<div class="card empty">未找到该案例。<a href="#/cases">返回案例库</a></div>'; return; }
    var rows = [['企业 / 机构', esc(c.org)], ['地区', esc(c.region + ' · ' + c.country)], ['行业', esc(c.industry)], ['技术', c.tech.map(function (t) { return '<span class="tag">' + esc(t) + '</span>'; }).join(' ')],
      ['应用场景', esc(c.scenario)], ['解决的问题', esc(c.problem)], ['实施方式', esc(c.approach)], ['效果', '<b>' + esc(c.effect) + '</b>'], ['时间', esc(c.date)],
      ['成熟度', '<span class="tag mat">' + esc(c.maturity) + '</span>'], ['可信等级', cred(c.credibility)], ['来源链接', ext(c.source_url, c.source_name) + ((c.extra_sources || []).length ? '<div style="margin-top:4px">补充来源：' + c.extra_sources.map(function (x) { return ext(x.url, x.name); }).join('　') + '</div>' : '')]];
    var related = DATA.cases.filter(function (x) { return x.id !== c.id && (x.industry === c.industry || x.tech.some(function (t) { return c.tech.indexOf(t) >= 0; })); }).sort(function (a, b) { return (b.industry === c.industry) - (a.industry === c.industry); }).slice(0, 4);
    app.innerHTML = '<a class="backlink" href="#/cases">← 返回案例库</a>' +
      '<div class="detail-head"><div class="tags"><span class="tag">' + esc(c.industry) + '</span><span class="tag">' + esc(c.region) + '</span><span class="tag">' + esc(c.maturity) + '</span></div><h1>' + esc(c.title) + '</h1><div>' + esc(c.org) + ' · ' + esc(c.date) + '</div></div>' +
      '<div class="split"><div class="card"><div class="kv">' + rows.map(function (r) { return '<div class="k">' + r[0] + '</div><div>' + r[1] + '</div>'; }).join('') + '</div>' +
      '<p class="muted" style="font-size:13px;margin-top:12px">数据以来源原文为准；“未公开”表示来源未披露量化效果。</p>' +
      '<button class="btn sm ghost" id="copyLink" type="button">复制本案例链接</button></div>' +
      '<div><div class="card"><h3>相关案例</h3>' + (related.length ? related.map(function (r) { return '<div style="margin:8px 0"><a href="#/case/' + esc(r.id) + '">' + esc(r.title) + '</a><div class="muted" style="font-size:12.5px">' + esc(r.industry + ' · ' + r.region) + '</div></div>'; }).join('') : '<div class="muted">暂无</div>') + '</div></div></div>';
    document.getElementById('copyLink').onclick = function () {
      var u = location.href, b = this;
      (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { b.textContent = '已复制 ✓'; }, function () { window.prompt('复制以下链接：', u); });
    };
  }

  function pageInstitutions(params) {
    var types = ['全部', '企业', '高校', '科研机构'], type = params.type || '全部';
    var regs = ['全部地区'].concat(uniq(DATA.institutions.map(function (i) { return i.region; }))), reg = params.region || '全部地区';
    var list = DATA.institutions.filter(function (i) { return (type === '全部' || i.type === type) && (reg === '全部地区' || i.region === reg); });
    app.innerHTML = '<div class="page-title"><h1>机构与高校</h1><p>主要 AI 企业、实验室、高校与科研机构档案，含简介、研究方向与官网链接。</p></div>' +
      '<div class="chipbar">' + types.map(function (t) { return '<button class="chip' + (t === type ? ' on' : '') + '" data-type="' + esc(t) + '">' + esc(t) + '</button>'; }).join('') + '</div>' +
      '<div class="chipbar">' + regs.map(function (r) { return '<button class="chip' + (r === reg ? ' on' : '') + '" data-reg="' + esc(r) + '">' + esc(r) + '</button>'; }).join('') + '</div>' +
      '<div class="result-count">共 ' + list.length + ' 家</div><div class="grid g3">' + list.map(function (i) {
        return '<article class="card hover"><div style="display:flex;justify-content:space-between;align-items:center"><span class="inst-type t-' + esc(i.type) + '">' + esc(i.type) + '</span><span class="tag region">' + esc(i.region) + ' · ' + esc(i.country) + '</span></div>' +
          '<h3 style="margin-top:10px">' + esc(i.name) + '</h3><p style="margin:0 0 6px;color:#3b4763;font-size:14px">' + esc(i.intro) + '</p>' +
          '<div class="tags">' + i.focus.map(function (f) { return '<span class="tag">' + esc(f) + '</span>'; }).join('') + '</div>' +
          (i.products && i.products !== '—' ? '<div class="muted" style="font-size:13px">代表成果：' + esc(i.products) + '</div>' : '') +
          '<div style="margin-top:8px">' + ext(i.site, '官网') + '</div></article>';
      }).join('') + '</div>';
    [].forEach.call(app.querySelectorAll('[data-type]'), function (b) { b.onclick = function () { location.hash = '#/institutions' + buildQuery({ type: b.dataset.type === '全部' ? '' : b.dataset.type, region: reg === '全部地区' ? '' : reg }); }; });
    [].forEach.call(app.querySelectorAll('[data-reg]'), function (b) { b.onclick = function () { location.hash = '#/institutions' + buildQuery({ type: type === '全部' ? '' : type, region: b.dataset.reg === '全部地区' ? '' : b.dataset.reg }); }; });
  }

  function pageRegions() {
    var map = { '中国': '中国', '美国': '北美', '欧洲': '欧洲', '日韩': '日韩', '东南亚': '东南亚', '中东': '中东' };
    app.innerHTML = '<div class="page-title"><h1>地区观察</h1><p>主要地区的产业格局与政策要点，并链接到该地区的案例与快讯。</p></div><div class="grid g2">' +
      DATA.regions.map(function (r) {
        var key = map[r.name] || r.name;
        var nc = DATA.cases.filter(function (c) { return c.region === key; }).length;
        var nn = DATA.news.filter(function (n) { return n.region === key; }).length;
        return '<article class="card region"><h3>' + esc(r.name) + '<span class="flag">案例 ' + nc + ' · 快讯 ' + nn + '</span></h3><p style="margin:0;color:var(--navy);font-weight:600">' + esc(r.summary) + '</p>' +
          '<ul>' + r.points.map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('') + '</ul>' +
          '<div style="font-size:13px">参考来源：' + r.sources.map(function (s) { return ext(s.url, s.name); }).join('　') + '</div>' +
          '<div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap"><a class="btn sm ghost" href="#/cases' + buildQuery({ region: key }) + '">查看该地区案例</a><a class="btn sm ghost" href="#/news' + buildQuery({ region: key }) + '">查看该地区快讯</a></div></article>';
      }).join('') + '</div>';
  }

  function pageAbout() {
    var m = DATA.meta || {};
    app.innerHTML = '<div class="page-title"><h1>关于 / 订阅</h1><p>面向企业管理者、投资人、研究人员、政策制定者与媒体的全球 AI 情报站。</p></div>' +
      '<div class="grid g2"><section class="card"><h2>关于本站</h2>' +
      '<p>AI+X 行业案例网持续收集全球 AI 技术发展动态，关注高关注度的新技术与应用案例，案例覆盖国内外主流市场地区和行业，并跟踪主要 AI 企业、科研机构与高校。</p>' +
      '<h3>内容原则</h3><ul><li>每条内容均附原始来源链接；</li><li>区分“官方发布”与“媒体报道”两个可信等级；</li><li>不编造数据，来源未披露的效果标注“未公开”；</li><li>成熟度：研究验证 → 试点 → 规模化 → 商业化。</li></ul>' +
      '<h3>数据与更新</h3><p>本原型的数据存放在 <code>/data/*.json</code>，可由自动采集任务更新后直接重新部署。当前数据版本：' + esc(m.updated || '—') + '。</p></section>' +
      '<section class="card"><h2>订阅周报</h2><div class="notice">⚠️ 原型占位：此表单<b>不会提交或保存任何信息</b>，正式上线时需接入邮件服务（如自建 SMTP、SendCloud、Mailchimp 等）。</div>' +
      '<form id="subForm"><div class="form-row"><input type="email" placeholder="your@email.com" aria-label="邮箱" required><select aria-label="频率"><option>每周一封</option><option>每月一封</option></select></div>' +
      '<div class="checks">' + ['AI 动态快讯', '行业案例', '技术前沿', '政策法规', '融资并购'].map(function (x) { return '<label><input type="checkbox" checked> ' + x + '</label>'; }).join('') + '</div>' +
      '<button class="btn" type="submit">订阅（演示）</button> <span id="subMsg" class="muted"></span></form>' +
      '<h3 style="margin-top:20px">联系与投稿</h3><p class="muted">欢迎提交 AI 落地案例线索（需附公开来源）。正式版可在此放置联系邮箱或表单。</p></section></div>';
    document.getElementById('subForm').onsubmit = function (e) { e.preventDefault(); document.getElementById('subMsg').textContent = '演示模式：未发送任何数据。'; };
  }

  /* ---------- router ---------- */
  function route() {
    var h = parseHash(), p = h.parts, name = p[0] || 'home';
    var routes = { home: pageHome, news: pageNews, tech: pageTech, cases: pageCases, institutions: pageInstitutions, regions: pageRegions, about: pageAbout };
    document.getElementById('nav').classList.remove('open');
    if (name === 'case') { setActive('cases'); pageCase(p[1]); }
    else if (routes[name]) { setActive(name); routes[name](h.params); }
    else { setActive(''); app.innerHTML = '<div class="card empty">页面不存在。<a href="#/home">返回首页</a></div>'; }
    var titles = { home: '首页', news: 'AI 动态快讯', tech: '技术前沿', cases: '行业案例库', case: '案例详情', institutions: '机构与高校', regions: '地区观察', about: '关于 / 订阅' };
    document.title = (titles[name] ? titles[name] + ' · ' : '') + 'AI+X 行业案例网（原型）';
    if (!(name === 'tech' && h.params.t)) window.scrollTo(0, 0);
  }

  function boot() {
    document.getElementById('year').textContent = new Date().getFullYear();
    initTooltip();
    var tg = document.getElementById('navToggle');
    tg.onclick = function () { var n = document.getElementById('nav'); n.classList.toggle('open'); tg.setAttribute('aria-expanded', n.classList.contains('open')); };
    Promise.all(FILES.map(function (f) {
      return fetch('data/' + f + '.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(f + '.json HTTP ' + r.status); return r.json(); });
    })).then(function (res) {
      FILES.forEach(function (f, i) { DATA[f] = res[i]; });
      DATA.news.sort(function (a, b) { return b.date.localeCompare(a.date); });
      document.getElementById('dataStamp').textContent = '数据更新于 ' + (DATA.meta.updated || '—') + '，共 ' + DATA.cases.length + ' 个案例、' + DATA.news.length + ' 条快讯、' + DATA.institutions.length + ' 家机构';
      window.addEventListener('hashchange', route);
      route();
    }).catch(function (err) {
      var isFile = location.protocol === 'file:';
      app.innerHTML = '<div class="error-box"><h2>数据加载失败</h2><p>' + esc(err.message) + '</p>' +
        (isFile ? '<p>您正在通过 <code>file://</code> 直接打开页面，浏览器出于安全限制不允许读取本地 JSON。请在站点目录运行 <code>python3 -m http.server 8080</code> 后访问 <code>http://localhost:8080</code>，或部署到任意静态托管服务。</p>' : '<p>请确认 <code>data/</code> 目录已与 <code>index.html</code> 一起上传。</p>') + '</div>';
    });
  }
  boot();
})();
