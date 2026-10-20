/* AI+X 行业案例网 · 静态前端（仅本地依赖：assets/vendor/echarts，Apache-2.0） */
(function () {
  'use strict';
  var DATA = {};
  var FILES = ['meta', 'news', 'cases', 'topics', 'institutions', 'regions'];
  var app = document.getElementById('app');
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

  /* ---------- design tokens & charts v3 (Apache ECharts, bundled locally) ---------- */
  var CAT_COLOR = { '模型发布': '#3b82f6', '产品更新': '#22d3ee', '融资并购': '#ffb547', '政策法规': '#a78bfa', '科研突破': '#34d399' };
  var CAT_CLS = { '模型发布': 'c-model', '产品更新': 'c-product', '融资并购': 'c-fund', '政策法规': 'c-policy', '科研突破': 'c-research' };
  var MAT_CLS = { '研究验证': 'm-research', '试点': 'm-pilot', '规模化': 'm-scale', '商业化': 'm-commercial' };
  function hashIdx(s, n) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h % n; }
  function catCls(c) { return CAT_CLS[c] || 'c-other'; }
  function indCls(i) { return 'ind-' + hashIdx(i, 8); }
  function matCls(m) { return MAT_CLS[m] || ''; }
  function pct(a, b) { return b ? Math.round(a * 1000 / b) / 10 : 0; }
  function topN(rows, n) {
    if (rows.length <= n) return rows;
    var head = rows.slice(0, n - 1), rest = rows.slice(n - 1).reduce(function (s, r) { return s + r[1]; }, 0);
    return head.concat([['其他', rest, true]]);
  }
  function tipAttr(text) { return ' data-tip="' + esc(text) + '"'; }

  var CHARTS = [];
  var echartsPromise = null;
  function loadECharts() {
    if (window.echarts) return Promise.resolve(window.echarts);
    if (echartsPromise) return echartsPromise;
    echartsPromise = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = 'assets/vendor/echarts/echarts.min.js';
      s.onload = function () { resolve(window.echarts); };
      s.onerror = function () { echartsPromise = null; reject(new Error('ECharts 加载失败')); };
      document.head.appendChild(s);
    });
    return echartsPromise;
  }
  function disposeCharts() { CHARTS.forEach(function (c) { try { c.dispose(); } catch (e) {} }); CHARTS = []; }
  window.addEventListener('resize', function () { CHARTS.forEach(function (c) { c.resize(); }); });

  var TXT = '#9fb0d0', TXT_HI = '#e6edff', GRID = 'rgba(148,170,220,.12)';
  function lg(echarts, a, b, horizontal) { return new echarts.graphic.LinearGradient(0, horizontal ? 0 : 1, horizontal ? 1 : 0, 0, [{ offset: 0, color: a }, { offset: 1, color: b }]); }
  var TOOLTIP = {
    backgroundColor: 'rgba(8,17,40,.92)', borderColor: 'rgba(96,165,250,.45)', borderWidth: 1, padding: [10, 12],
    textStyle: { color: '#e6edff', fontSize: 12.5 }, extraCssText: 'border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.45);backdrop-filter:blur(6px);'
  };
  function tipRow(color, name, val, extra) {
    return '<div style="display:flex;align-items:center;gap:8px;min-width:150px"><span style="width:9px;height:9px;border-radius:3px;background:' + color + '"></span><span style="flex:1">' + esc(name) + '</span><b style="font-size:14px">' + val + '</b>' + (extra ? '<span style="color:#9fb0d0;margin-left:6px">' + extra + '</span>' : '') + '</div>';
  }

  function chartIndustry(echarts, el, cases) {
    var rows = topN(countBy(cases, function (c) { return c.industry; }), 10).reverse();
    var total = cases.length, ch = echarts.init(el, null, { renderer: 'canvas' });
    ch.setOption({
      animationDuration: 1100, animationEasing: 'cubicOut',
      grid: { left: 8, right: 46, top: 6, bottom: 6, containLabel: true },
      tooltip: Object.assign({}, TOOLTIP, { trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(96,165,250,.08)' } },
        formatter: function (p) { var d = p[0]; return '<div style="color:#9fb0d0;margin-bottom:4px">案例行业分布</div>' + tipRow('#22d3ee', d.name, d.value + ' 个', pct(d.value, total) + '%') + (d.name === '其他' ? '<div style="color:#9fb0d0;margin-top:4px;font-size:11.5px">合并长尾行业</div>' : ''); } }),
      xAxis: { type: 'value', splitLine: { lineStyle: { color: GRID, type: 'dashed' } }, axisLabel: { color: TXT, fontSize: 11 }, minInterval: 1 },
      yAxis: { type: 'category', data: rows.map(function (r) { return r[0]; }), axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: TXT_HI, fontSize: 12.5 } },
      series: [{
        type: 'bar', barWidth: 13, showBackground: true, backgroundStyle: { color: 'rgba(148,170,220,.07)', borderRadius: 7 },
        data: rows.map(function (r) {
          return { value: r[1], itemStyle: r[2] ? { color: 'rgba(159,176,208,.45)', borderRadius: 7 } : { color: lg(echarts, '#2563eb', '#22d3ee', true), borderRadius: 7, shadowBlur: 12, shadowColor: 'rgba(34,211,238,.45)' } };
        }),
        label: { show: true, position: 'right', color: TXT_HI, fontWeight: 700, fontSize: 12, formatter: function (p) { return p.value + '  ' + pct(p.value, total) + '%'; } },
        emphasis: { itemStyle: { shadowBlur: 22, shadowColor: 'rgba(34,211,238,.8)' } }
      }]
    });
    return ch;
  }

  function chartRegion(echarts, el, cases) {
    var rows = countBy(cases, function (c) { return c.region; }), total = cases.length;
    var cols = [['#2563eb', '#60a5fa'], ['#0891b2', '#22d3ee'], ['#7c3aed', '#a78bfa'], ['#059669', '#34d399'], ['#d97706', '#ffb547'], ['#db2777', '#f472b6'], ['#475569', '#94a3b8'], ['#0e7490', '#67e8f9']];
    var ch = echarts.init(el);
    ch.setOption({
      animationDuration: 1300, animationEasing: 'cubicOut',
      tooltip: Object.assign({}, TOOLTIP, { trigger: 'item', formatter: function (p) { return '<div style="color:#9fb0d0;margin-bottom:4px">案例地区分布</div>' + tipRow(p.color.colorStops ? p.color.colorStops[1].color : p.color, p.name, p.value + ' 个', p.percent + '%'); } }),
      legend: { orient: 'vertical', right: 4, top: 'middle', icon: 'roundRect', itemWidth: 10, itemHeight: 10, itemGap: 11, textStyle: { color: TXT_HI, fontSize: 12 },
        formatter: function (n) { var r = rows.filter(function (x) { return x[0] === n; })[0]; return n + '  ' + (r ? r[1] : '') + '  ' + (r ? pct(r[1], total) + '%' : ''); } },
      graphic: [{ type: 'text', left: '30%', top: '44%', style: { text: String(total), fill: '#fff', fontSize: 30, fontWeight: 800, textAlign: 'center' } },
                { type: 'text', left: '30%', top: '58%', style: { text: '个案例', fill: TXT, fontSize: 12, textAlign: 'center' } }],
      series: [
        { type: 'pie', radius: ['30%', '33%'], center: ['33%', '52%'], silent: true, label: { show: false }, data: [{ value: 1, itemStyle: { color: 'rgba(96,165,250,.25)' } }] },
        { type: 'pie', roseType: 'radius', radius: ['38%', '80%'], center: ['33%', '52%'], padAngle: 2,
          itemStyle: { borderRadius: 6, borderColor: '#0b1838', borderWidth: 2, shadowBlur: 16, shadowColor: 'rgba(37,99,235,.35)' },
          label: { show: false }, labelLine: { show: false },
          emphasis: { scale: true, scaleSize: 8, itemStyle: { shadowBlur: 28, shadowColor: 'rgba(34,211,238,.7)' } },
          data: rows.map(function (r, i) { var c = cols[i % cols.length]; return { name: r[0], value: r[1], itemStyle: { color: lg(echarts, c[0], c[1]) } }; }) }
      ]
    });
    return ch;
  }

  function chartTrend(echarts, el, news) {
    var cats = Object.keys(CAT_COLOR).filter(function (c) { return news.some(function (n) { return n.category === c; }); });
    var m = {}; news.forEach(function (n) { var k = n.date.slice(0, 7); m[k] = m[k] || {}; m[k][n.category] = (m[k][n.category] || 0) + 1; });
    var keys = Object.keys(m).sort(), months = [], y = +keys[0].slice(0, 4), mo = +keys[0].slice(5, 7), last = keys[keys.length - 1];
    while (true) { var k = y + '-' + (mo < 10 ? '0' : '') + mo; months.push(k); if (k >= last || months.length > 60) break; mo++; if (mo > 12) { mo = 1; y++; } }
    var totals = months.map(function (k) { var t = 0; for (var c in (m[k] || {})) t += m[k][c]; return t; });
    var ch = echarts.init(el);
    var series = cats.map(function (c, i) {
      return { name: c, type: 'bar', stack: 'n', barWidth: '46%', emphasis: { focus: 'series' },
        itemStyle: { color: lg(echarts, echarts.color.modifyAlpha(CAT_COLOR[c], .55), CAT_COLOR[c]), borderRadius: i === cats.length - 1 ? [5, 5, 0, 0] : 0, shadowBlur: 8, shadowColor: echarts.color.modifyAlpha(CAT_COLOR[c], .35) },
        data: months.map(function (k) { return (m[k] && m[k][c]) || 0; }) };
    });
    series.push({ name: '月度合计', type: 'line', smooth: .35, symbol: 'circle', symbolSize: 7, z: 10, data: totals,
      lineStyle: { width: 2.5, color: '#ffb547', shadowBlur: 12, shadowColor: 'rgba(255,181,71,.7)' }, itemStyle: { color: '#ffb547', borderColor: '#0b1838', borderWidth: 2 },
      areaStyle: { color: lg(echarts, 'rgba(255,181,71,0)', 'rgba(255,181,71,.22)') },
      label: { show: true, position: 'top', color: '#ffd59a', fontSize: 11, fontWeight: 700, formatter: function (p) { return p.value || ''; } } });
    ch.setOption({
      animationDuration: 1200, animationEasing: 'cubicOut',
      color: cats.map(function (c) { return CAT_COLOR[c]; }).concat(['#ffb547']),
      grid: { left: 8, right: 14, top: el.clientWidth < 520 ? 76 : 50, bottom: 8, containLabel: true },
      legend: { top: 0, left: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, itemGap: el.clientWidth < 520 ? 10 : 14, textStyle: { color: TXT_HI, fontSize: 12 } },
      tooltip: Object.assign({}, TOOLTIP, { trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(96,165,250,.08)' } },
        formatter: function (ps) {
          var head = '<div style="color:#9fb0d0;margin-bottom:6px">' + ps[0].axisValue + ' · 快讯</div>';
          return head + ps.filter(function (p) { return p.seriesName !== '月度合计' && p.value; }).map(function (p) { return tipRow(CAT_COLOR[p.seriesName], p.seriesName, p.value + ' 条'); }).join('') +
            '<div style="border-top:1px solid rgba(148,170,220,.2);margin-top:6px;padding-top:6px">' + tipRow('#ffb547', '月度合计', totals[ps[0].dataIndex] + ' 条') + '</div>';
        } }),
      xAxis: { type: 'category', data: months.map(function (k) { return k.slice(2).replace('-', '.'); }), axisTick: { show: false }, axisLine: { lineStyle: { color: 'rgba(148,170,220,.25)' } }, axisLabel: { color: TXT, fontSize: 11 } },
      yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: GRID, type: 'dashed' } }, axisLabel: { color: TXT, fontSize: 11 } },
      series: series
    });
    return ch;
  }

  function chartRadar(echarts, el, topics) {
    var ch = echarts.init(el);
    ch.setOption({
      animationDuration: 1400, animationEasing: 'elasticOut',
      tooltip: Object.assign({}, TOOLTIP, { trigger: 'item', formatter: function () {
        return '<div style="color:#9fb0d0;margin-bottom:6px">技术成熟度（编辑评估 1–5）</div>' + topics.map(function (t) { return tipRow('#22d3ee', t.name, t.maturity_score, t.maturity); }).join(''); } }),
      radar: {
        center: ['50%', '54%'], radius: el.clientWidth < 520 ? '52%' : '66%', splitNumber: 5, shape: 'polygon',
        indicator: topics.map(function (t) { return { name: t.name.replace(/（.*?）/, ''), max: 5 }; }),
        axisName: { color: TXT_HI, fontSize: 12, padding: [2, 4], formatter: function (n) { if (el.clientWidth >= 520) return n; return n.replace(' for ', '\nfor ').split(' / ').map(function (p) { return /^[\u4e00-\u9fa5]{6,}$/.test(p) ? p.slice(0, 4) + '\n' + p.slice(4) : p; }).join('/\n'); } },
        splitArea: { areaStyle: { color: ['rgba(37,99,235,.02)', 'rgba(37,99,235,.06)', 'rgba(37,99,235,.10)', 'rgba(37,99,235,.14)', 'rgba(37,99,235,.18)'] } },
        splitLine: { lineStyle: { color: 'rgba(96,165,250,.22)' } }, axisLine: { lineStyle: { color: 'rgba(96,165,250,.22)' } }
      },
      series: [{ type: 'radar', symbol: 'circle', symbolSize: 8,
        data: [{ value: topics.map(function (t) { return t.maturity_score || 0; }), name: '成熟度',
          lineStyle: { width: 2.5, color: '#22d3ee', shadowBlur: 18, shadowColor: 'rgba(34,211,238,.9)' },
          itemStyle: { color: '#0b1838', borderColor: '#22d3ee', borderWidth: 2.5, shadowBlur: 10, shadowColor: 'rgba(34,211,238,.9)' },
          areaStyle: { color: new echarts.graphic.RadialGradient(.5, .5, .7, [{ offset: 0, color: 'rgba(34,211,238,.10)' }, { offset: 1, color: 'rgba(59,130,246,.55)' }]) },
          label: { show: true, color: '#e6edff', fontSize: 11, fontWeight: 700, distance: 6 } }] }]
    });
    return ch;
  }

  function initTooltip() {
    var tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip);
    function show(el, x, y) { tip.textContent = el.getAttribute('data-tip'); tip.style.opacity = 1; var w = tip.offsetWidth, vw = document.documentElement.clientWidth; tip.style.left = Math.min(Math.max(8, x - w / 2), vw - w - 8) + 'px'; tip.style.top = (y - tip.offsetHeight - 12) + 'px'; }
    function h(e) { var el = e.target.closest && e.target.closest('[data-tip]'); if (el) show(el, e.clientX, e.clientY); else tip.style.opacity = 0; }
    document.addEventListener('mousemove', h); document.addEventListener('click', h);
    window.addEventListener('scroll', function () { tip.style.opacity = 0; }, { passive: true });
  }
  /* ---------- components ---------- */
  function newsItem(n) {
    return '<div class="news-item"><div class="date">' + esc(n.date) + '</div><div>' +
      '<h3>' + esc(n.title) + '</h3><p>' + esc(n.summary) + '</p>' +
      '<div class="news-meta"><span class="tag ' + catCls(n.category) + '">' + esc(n.category) + '</span><span class="tag region">' + esc(n.region) + '</span>' + cred(n.credibility) + ext(n.source_url, '来源：' + n.source_name) + '</div></div></div>';
  }
  function caseCard(c) {
    return '<article class="card hover case-card">' +
      '<div class="tags"><span class="tag ' + indCls(c.industry) + '">' + esc(c.industry) + '</span><span class="tag region">' + esc(c.region) + ' · ' + esc(c.country) + '</span><span class="tag mat ' + matCls(c.maturity) + '">' + esc(c.maturity) + '</span></div>' +
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
    var countries = uniq(cases.map(function (c) { return c.country; })).length;
    var regions = uniq(cases.map(function (c) { return c.region; })).length;
    var official = cases.filter(function (c) { return c.credibility === '官方发布'; }).length;
    var disclosed = cases.filter(function (c) { return c.effect && c.effect !== '未公开'; }).length;
    var scaled = cases.filter(function (c) { return c.maturity === '规模化' || c.maturity === '商业化'; }).length;
    function kpi(v, unit, label, sub, ratio) {
      return '<div class="kpi"><div class="kpi-label">' + esc(label) + '</div><div class="kpi-value">' + v + '<small>' + esc(unit) + '</small></div>' +
        (ratio != null ? '<div class="kpi-bar"><i style="width:' + ratio + '%"></i></div>' : '') + '<div class="kpi-sub">' + esc(sub) + '</div></div>';
    }
    function chartCard(id, title, sub, note) {
      return '<figure class="chart-card"><figcaption class="cc-head"><div><h3>' + esc(title) + '</h3><p>' + esc(sub) + '</p></div></figcaption>' +
        '<div class="echart" id="' + id + '" role="img" aria-label="' + esc(title) + '"></div><div class="cc-note">数据来源：' + esc(note) + '</div></figure>';
    }

    var html = '<section class="band band-dark hero-v3"><div class="hero-grid"><div class="hero-main">' +
      '<div class="eyebrow"><span class="live"></span>全球 AI 情报 · 数据更新于 ' + esc(updated) + '</div>' +
      '<h1>全球 AI 进展 <span class="grad">×</span> 行业落地案例情报站</h1>' +
      '<p class="lead">回答“哪项 AI 技术、在哪个地区、哪个行业、被谁、怎么用、效果如何”。每条内容均附原始来源，区分官方发布与媒体报道。</p>' +
      '<form class="hero-search" id="heroSearch" role="search"><input id="heroQ" placeholder="搜索案例：金融 客服、自动驾驶、DeepSeek、病理…" aria-label="搜索案例"><button class="btn btn-accent" type="submit">搜索案例</button></form>' +
      '<div class="hero-links"><a href="#/news">最新快讯</a><a href="#/tech">技术前沿</a><a href="#/regions">地区观察</a></div></div>' +
      '<div class="hero-stats">' +
      '<a class="stat" href="#/cases"><b>' + cases.length + '</b><span>行业案例</span></a>' +
      '<a class="stat" href="#/news"><b>' + news.length + '</b><span>动态快讯</span></a>' +
      '<a class="stat" href="#/institutions"><b>' + DATA.institutions.length + '</b><span>机构与高校</span></a>' +
      '<a class="stat" href="#/cases"><b>' + industries + '</b><span>覆盖行业</span></a></div></div></section>';

    html += '<div class="home-row section"><section class="card pad-sm"><div class="section-head"><h2>今日要闻</h2><a href="#/news">全部快讯 →</a></div><ul class="news-compact">' +
      news.slice(0, 7).map(function (n) {
        return '<li><span class="nc-date">' + esc(n.date.slice(5).replace('-', '.')) + '</span><div class="nc-body"><a class="nc-title" href="' + safeUrl(n.source_url) + '" target="_blank" rel="noopener noreferrer" title="' + esc(n.summary) + '">' + esc(n.title) + '</a>' +
          '<div class="nc-meta"><span class="tag xs ' + catCls(n.category) + '">' + esc(n.category) + '</span>' + esc(n.region) + ' · ' + esc(n.source_name) + ' ' + cred(n.credibility) + '</div></div></li>';
      }).join('') + '</ul></section>' +
      '<section class="card pad-sm"><div class="section-head"><h2>热点技术</h2><a href="#/tech">技术前沿 →</a></div><ul class="topic-compact">' +
      topics.map(function (t) {
        var m = ''; for (var i = 1; i <= 5; i++) m += '<i class="' + (i <= t.maturity_score ? 'on' : '') + '"></i>';
        return '<li><a href="#/tech?t=' + esc(t.id) + '"><span class="tc-name">' + esc(t.name) + '</span><span class="tc-what">' + esc(t.what) + '</span></a><span class="tc-mat"' + tipAttr('成熟度（编辑评估）：' + t.maturity + ' ' + t.maturity_score + '/5') + '><span class="meter">' + m + '</span><em>' + esc(t.maturity) + '</em></span></li>';
      }).join('') + '</ul></section></div>';

    html += '<section class="section"><div class="section-head"><h2>最新案例</h2><a href="#/cases">进入案例库（' + cases.length + '）→</a></div><div class="grid g4 case-compact">' +
      latestCases.map(function (c) {
        return '<a class="card hover cc" href="#/case/' + esc(c.id) + '"><div class="tags"><span class="tag ' + indCls(c.industry) + '">' + esc(c.industry) + '</span><span class="tag region">' + esc(c.region) + '</span></div>' +
          '<h3>' + esc(c.title) + '</h3><div class="cc-org">' + esc(c.org) + ' · ' + esc(c.date) + '</div>' +
          '<p class="cc-effect">' + esc(c.effect) + '</p><div class="cc-foot">' + cred(c.credibility) + '<span class="tag mat ' + matCls(c.maturity) + '">' + esc(c.maturity) + '</span></div></a>';
      }).join('') + '</div></section>';

    html += '<section class="band band-dark dash" aria-labelledby="dashTitle"><div class="dash-head"><div><div class="eyebrow">DATA DASHBOARD</div><h2 id="dashTitle">数据看板</h2>' +
      '<p>全部指标与图表由站内数据文件（data/*.json）实时计算，悬停查看明细。</p></div></div>' +
      '<div class="kpis">' +
      kpi(regions + '<span class="slash">/</span>' + countries, '', '覆盖地区 / 国家', '案例库覆盖范围', null) +
      kpi(pct(scaled, cases.length), '%', '规模化及商业化', scaled + ' / ' + cases.length + ' 个案例', pct(scaled, cases.length)) +
      kpi(pct(disclosed, cases.length), '%', '量化效果披露率', '其余标注“未公开”', pct(disclosed, cases.length)) +
      kpi(pct(official, cases.length), '%', '官方发布来源', official + ' 个案例来自官方渠道', pct(official, cases.length)) + '</div>' +
      '<div class="dash-grid">' +
      chartCard('chIndustry', '案例行业分布', 'Top 9 行业 + 其他 · 数值 / 占比', 'data/cases.json（industry）') +
      chartCard('chRegion', '案例地区分布', '南丁格尔玫瑰图 · 半径表示案例数', 'data/cases.json（region）') +
      chartCard('chTrend', '快讯月度趋势', '按类别堆叠 · 折线为月度合计', 'data/news.json（date、category）') +
      chartCard('chRadar', '技术成熟度雷达', '编辑评估 1–5 分，仅供参考', 'data/topics.json（maturity_score）') +
      '</div></section>';

    app.innerHTML = html;
    document.getElementById('heroSearch').addEventListener('submit', function (e) {
      e.preventDefault(); location.hash = '#/cases' + buildQuery({ q: document.getElementById('heroQ').value.trim() });
    });
    loadECharts().then(function (echarts) {
      if (!document.getElementById('chIndustry')) return;
      disposeCharts();
      CHARTS.push(chartIndustry(echarts, document.getElementById('chIndustry'), cases));
      CHARTS.push(chartRegion(echarts, document.getElementById('chRegion'), cases));
      CHARTS.push(chartTrend(echarts, document.getElementById('chTrend'), news));
      CHARTS.push(chartRadar(echarts, document.getElementById('chRadar'), topics));
    }).catch(function (err) {
      [].forEach.call(document.querySelectorAll('.echart'), function (el) { el.innerHTML = '<div class="empty">' + esc(err.message) + '</div>'; });
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
      ['成熟度', '<span class="tag mat ' + matCls(c.maturity) + '">' + esc(c.maturity) + '</span>'], ['可信等级', cred(c.credibility)], ['来源链接', ext(c.source_url, c.source_name) + ((c.extra_sources || []).length ? '<div style="margin-top:4px">补充来源：' + c.extra_sources.map(function (x) { return ext(x.url, x.name); }).join('　') + '</div>' : '')]];
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
    disposeCharts();
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
