/* RateCalc – Freelance Hourly Rate Calculator (vanilla JS, ES2020) */
(function () {
  'use strict';

  const C = window.APP_CONFIG || {};
  const STORAGE_KEY = 'ratecalc_inputs';
  const PROFILES_KEY = 'ratecalc_profiles';
  const FREE_PROFILE_LIMIT = 1;
  const STANDARD_DAY = 8; // hours in a "full" working day, used for non-billable share + real hourly

  const DEFAULTS = {
    income: 60000,
    currency: 'USD',
    expenses: 6000,
    taxRate: 25,
    margin: 10,
    hoursPerDay: 5,
    daysPerWeek: 5,
    weeksOff: 6,
    quoteHours: 40,
    rush: 1
  };

  // URL param short keys <-> input keys
  const URL_KEYS = {
    inc: 'income', cur: 'currency', exp: 'expenses', tax: 'taxRate', mar: 'margin',
    hpd: 'hoursPerDay', dpw: 'daysPerWeek', wo: 'weeksOff', qh: 'quoteHours', rush: 'rush'
  };

  const CURRENCY_SYMBOL = { USD: '$', EUR: '€', GBP: '£', CAD: 'CA$', AUD: 'A$', INR: '₹' };
  const CURRENCY_LOCALE = { USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', CAD: 'en-CA', AUD: 'en-AU', INR: 'en-IN' };

  const $ = (id) => document.getElementById(id);

  // ---------- Elements ----------
  const el = {
    income: $('income'), currency: $('currency'), expenses: $('expenses'), taxRate: $('taxRate'),
    margin: $('margin'), hoursPerDay: $('hoursPerDay'), hoursPerDayNum: $('hoursPerDayNum'),
    daysPerWeek: $('daysPerWeek'), weeksOff: $('weeksOff'), quoteHours: $('quoteHours'), rush: $('rush'),
    incomeAffix: $('incomeAffix'), expensesAffix: $('expensesAffix'), nonBillable: $('nonBillable'),
    hourlyRate: $('hourlyRate'), rateSub: $('rateSub'), dailyRate: $('dailyRate'), weeklyRate: $('weeklyRate'),
    monthlyRevenue: $('monthlyRevenue'), annualGross: $('annualGross'), billableHours: $('billableHours'),
    realHourly: $('realHourly'), breakdownSvg: $('breakdownSvg'), breakdownLegend: $('breakdownLegend'),
    quoteFixed: $('quoteFixed'), quoteRange: $('quoteRange'),
    copyBtn: $('copyBtn'), shareBtn: $('shareBtn'), resetBtn: $('resetBtn'),
    profileName: $('profileName'), saveProfileBtn: $('saveProfileBtn'), reportBtn: $('reportBtn'),
    profileList: $('profileList'), profilesBadge: $('profilesBadge'), compareToggle: $('compareToggle'),
    comparePanel: $('comparePanel'), compareA: $('compareA'), compareB: $('compareB'),
    compareHeadA: $('compareHeadA'), compareHeadB: $('compareHeadB'), compareBody: $('compareBody'),
    partnersSection: $('partnersSection'), partnerGrid: $('partnerGrid'),
    reportMeta: $('reportMeta'), reportInputs: $('reportInputs'), reportResults: $('reportResults'),
    reportBreakdown: $('reportBreakdown'), reportQuote: $('reportQuote'),
    proPrice: $('proPrice'), navProBtn: $('navProBtn')
  };

  // ---------- Helpers ----------
  const num = (v, fallback) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : fallback;
  };
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  function fmtMoney(v, cur, decimals) {
    cur = cur || state.currency;
    if (!Number.isFinite(v)) return '–';
    const d = decimals == null ? (Math.abs(v) < 1000 ? 2 : 0) : decimals;
    try {
      return new Intl.NumberFormat(CURRENCY_LOCALE[cur] || 'en-US', {
        style: 'currency', currency: cur, minimumFractionDigits: d, maximumFractionDigits: d
      }).format(v);
    } catch (e) {
      return (CURRENCY_SYMBOL[cur] || '') + v.toFixed(d);
    }
  }
  const fmtNum = (v, d) => Number.isFinite(v) ? v.toLocaleString('en-US', { maximumFractionDigits: d == null ? 0 : d }) : '–';
  const fmtPct = (v) => Number.isFinite(v) ? (Math.round(v * 10) / 10) + '%' : '–';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---------- State ----------
  let state = Object.assign({}, DEFAULTS);

  function sanitize(s) {
    const o = {};
    o.income = Math.max(0, num(s.income, DEFAULTS.income));
    o.currency = CURRENCY_SYMBOL[s.currency] ? s.currency : DEFAULTS.currency;
    o.expenses = Math.max(0, num(s.expenses, DEFAULTS.expenses));
    o.taxRate = clamp(num(s.taxRate, DEFAULTS.taxRate), 0, 99);
    o.margin = clamp(num(s.margin, DEFAULTS.margin), 0, 500);
    o.hoursPerDay = clamp(num(s.hoursPerDay, DEFAULTS.hoursPerDay), 1, 12);
    o.daysPerWeek = clamp(Math.round(num(s.daysPerWeek, DEFAULTS.daysPerWeek)), 1, 7);
    o.weeksOff = clamp(num(s.weeksOff, DEFAULTS.weeksOff), 0, 51);
    o.quoteHours = Math.max(0, num(s.quoteHours, DEFAULTS.quoteHours));
    o.rush = clamp(num(s.rush, DEFAULTS.rush), 1, 10);
    return o;
  }

  function readInputs() {
    state = sanitize({
      income: el.income.value, currency: el.currency.value, expenses: el.expenses.value,
      taxRate: el.taxRate.value, margin: el.margin.value, hoursPerDay: el.hoursPerDay.value,
      daysPerWeek: el.daysPerWeek.value, weeksOff: el.weeksOff.value,
      quoteHours: el.quoteHours.value, rush: el.rush.value
    });
  }

  function writeInputs(s) {
    el.income.value = s.income;
    el.currency.value = s.currency;
    el.expenses.value = s.expenses;
    el.taxRate.value = s.taxRate;
    el.margin.value = s.margin;
    el.hoursPerDay.value = s.hoursPerDay;
    el.hoursPerDayNum.value = s.hoursPerDay;
    el.daysPerWeek.value = s.daysPerWeek;
    el.weeksOff.value = s.weeksOff;
    el.quoteHours.value = s.quoteHours;
    el.rush.value = String(s.rush);
    if (el.rush.value !== String(s.rush)) el.rush.value = '1';
  }

  // ---------- Core calculation ----------
  function calculate(s) {
    const workingWeeks = Math.max(0, 52 - s.weeksOff);
    const billableHours = s.hoursPerDay * s.daysPerWeek * workingWeeks;
    const totalHours = STANDARD_DAY * s.daysPerWeek * workingWeeks;
    const preTax = s.income / (1 - s.taxRate / 100);
    const taxes = preTax - s.income;
    const base = preTax + s.expenses;
    const buffer = base * (s.margin / 100);
    const gross = base + buffer;
    const hourly = billableHours > 0 ? gross / billableHours : NaN;
    const nonBillablePct = Math.max(0, (STANDARD_DAY - s.hoursPerDay) / STANDARD_DAY * 100);
    const quoteBase = Number.isFinite(hourly) ? hourly * s.quoteHours * s.rush : NaN;

    return {
      workingWeeks, billableHours, totalHours, preTax, taxes, base, buffer, gross, hourly, nonBillablePct,
      daily: hourly * s.hoursPerDay,
      weekly: hourly * s.hoursPerDay * s.daysPerWeek,
      monthly: gross / 12,
      realHourly: totalHours > 0 ? s.income / totalHours : NaN,
      quoteFixed: quoteBase,
      quoteLow: quoteBase * 1.2,
      quoteHigh: quoteBase * 1.5,
      shares: gross > 0 ? [
        { key: 'take', label: 'Take-home', value: s.income, pct: s.income / gross * 100 },
        { key: 'tax', label: 'Taxes', value: taxes, pct: taxes / gross * 100 },
        { key: 'exp', label: 'Expenses', value: s.expenses, pct: s.expenses / gross * 100 },
        { key: 'buf', label: 'Buffer', value: buffer, pct: buffer / gross * 100 }
      ] : []
    };
  }

  let result = null;

  // ---------- Render ----------
  function render() {
    result = calculate(state);
    const r = result;
    const sym = CURRENCY_SYMBOL[state.currency] || '';
    el.incomeAffix.textContent = sym;
    el.expensesAffix.textContent = sym;
    el.nonBillable.textContent = fmtPct(r.nonBillablePct);

    el.hourlyRate.textContent = Number.isFinite(r.hourly) ? fmtMoney(r.hourly, state.currency, r.hourly < 100 ? 2 : 0) : '–';
    el.rateSub.textContent = 'per billable hour, to take home ' + fmtMoney(state.income, state.currency, 0) + ' a year';
    el.dailyRate.textContent = fmtMoney(r.daily, state.currency, 0);
    el.weeklyRate.textContent = fmtMoney(r.weekly, state.currency, 0);
    el.monthlyRevenue.textContent = fmtMoney(r.monthly, state.currency, 0);
    el.annualGross.textContent = fmtMoney(r.gross, state.currency, 0);
    el.billableHours.textContent = fmtNum(r.billableHours) + ' h';
    el.realHourly.textContent = fmtMoney(r.realHourly, state.currency, 2);

    el.quoteFixed.textContent = fmtMoney(r.quoteFixed, state.currency, 0);
    el.quoteRange.textContent = Number.isFinite(r.quoteLow)
      ? fmtMoney(r.quoteLow, state.currency, 0) + ' – ' + fmtMoney(r.quoteHigh, state.currency, 0)
      : '–';

    renderBreakdown(r.shares);
  }

  function renderBreakdown(shares) {
    const svg = el.breakdownSvg;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    let x = 0;
    const ns = 'http://www.w3.org/2000/svg';
    shares.forEach((s) => {
      if (s.pct <= 0) return;
      const rect = document.createElementNS(ns, 'rect');
      rect.setAttribute('x', x.toFixed(3));
      rect.setAttribute('y', '0');
      rect.setAttribute('width', Math.max(0, s.pct).toFixed(3));
      rect.setAttribute('height', '10');
      rect.setAttribute('class', 'seg seg-' + s.key);
      const title = document.createElementNS(ns, 'title');
      title.textContent = s.label + ': ' + fmtPct(s.pct) + ' (' + fmtMoney(s.value, state.currency, 0) + ')';
      rect.appendChild(title);
      svg.appendChild(rect);
      x += s.pct;
    });
    el.breakdownLegend.innerHTML = shares.map((s) =>
      '<li><span class="dot seg-' + s.key + '"></span><span class="lbl">' + s.label + '</span>' +
      '<span class="val">' + fmtMoney(s.value, state.currency, 0) + ' <small>(' + fmtPct(s.pct) + ')</small></span></li>'
    ).join('');
  }

  // ---------- Persistence ----------
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }
  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    return null;
  }
  function readUrlParams() {
    const p = new URLSearchParams(location.search);
    let any = false;
    const out = {};
    Object.keys(URL_KEYS).forEach((k) => {
      if (p.has(k)) { out[URL_KEYS[k]] = p.get(k); any = true; }
    });
    return any ? out : null;
  }
  function buildShareUrl() {
    const p = new URLSearchParams();
    Object.keys(URL_KEYS).forEach((k) => p.set(k, String(state[URL_KEYS[k]])));
    return location.origin + location.pathname + '?' + p.toString();
  }

  // ---------- Summary / actions ----------
  function summaryText() {
    const r = result;
    const cur = state.currency;
    return [
      'Freelance rate summary (' + C.APP_NAME + ')',
      '',
      'Target take-home: ' + fmtMoney(state.income, cur, 0) + '/year',
      'Business expenses: ' + fmtMoney(state.expenses, cur, 0) + '/year',
      'Tax rate: ' + fmtPct(state.taxRate) + ' | Buffer: ' + fmtPct(state.margin),
      'Billable: ' + state.hoursPerDay + ' h/day x ' + state.daysPerWeek + ' days/week, ' + state.weeksOff + ' weeks off (' + fmtNum(r.billableHours) + ' h/year)',
      '',
      'Minimum hourly rate: ' + fmtMoney(r.hourly, cur, 2),
      'Daily rate: ' + fmtMoney(r.daily, cur, 0) + ' | Weekly: ' + fmtMoney(r.weekly, cur, 0),
      'Monthly revenue target: ' + fmtMoney(r.monthly, cur, 0),
      'Annual gross revenue needed: ' + fmtMoney(r.gross, cur, 0),
      'Real hourly (take-home / all hours): ' + fmtMoney(r.realHourly, cur, 2),
      '',
      'Breakdown: ' + r.shares.map((s) => s.label + ' ' + fmtPct(s.pct)).join(', '),
      '',
      'Project quote (' + state.quoteHours + ' h, rush x' + state.rush + '): ' + fmtMoney(r.quoteFixed, cur, 0) +
        ' | Value range: ' + fmtMoney(r.quoteLow, cur, 0) + ' - ' + fmtMoney(r.quoteHigh, cur, 0),
      '',
      buildShareUrl()
    ].join('\n');
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* fall through */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (e) { return false; }
  }

  // ---------- Profiles ----------
  function getProfiles() {
    try {
      const raw = localStorage.getItem(PROFILES_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function setProfiles(arr) {
    try { localStorage.setItem(PROFILES_KEY, JSON.stringify(arr)); } catch (e) { toast('Could not save (storage full?)'); }
  }

  function saveProfile() {
    const name = (el.profileName.value || '').trim();
    if (!name) { toast('Give the profile a name first'); el.profileName.focus(); return; }
    const profiles = getProfiles();
    const existingIdx = profiles.findIndex((p) => p.name.toLowerCase() === name.toLowerCase());
    if (existingIdx === -1 && profiles.length >= FREE_PROFILE_LIMIT && !isPro()) {
      openPro('profiles');
      return;
    }
    const entry = { id: existingIdx >= 0 ? profiles[existingIdx].id : Date.now().toString(36), name, inputs: Object.assign({}, state), savedAt: Date.now() };
    if (existingIdx >= 0) profiles[existingIdx] = entry; else profiles.push(entry);
    setProfiles(profiles);
    el.profileName.value = '';
    renderProfiles();
    track('save_profile', { count: profiles.length });
    toast(existingIdx >= 0 ? 'Profile updated' : 'Profile saved');
  }

  function loadProfile(id) {
    const p = getProfiles().find((x) => x.id === id);
    if (!p) return;
    state = sanitize(p.inputs);
    writeInputs(state);
    render(); save();
    track('load_profile', {});
    toast('Loaded "' + p.name + '"');
    document.querySelector('.result-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function deleteProfile(id) {
    const profiles = getProfiles();
    const p = profiles.find((x) => x.id === id);
    if (!p) return;
    if (!confirm('Delete profile "' + p.name + '"?')) return;
    setProfiles(profiles.filter((x) => x.id !== id));
    renderProfiles();
    toast('Profile deleted');
  }

  function renderProfiles() {
    const profiles = getProfiles();
    const pro = isPro();
    el.profilesBadge.textContent = pro ? 'UNLIMITED' : (profiles.length + '/' + FREE_PROFILE_LIMIT + ' FREE');
    if (!profiles.length) {
      el.profileList.innerHTML = '<li class="empty">No saved profiles yet.</li>';
    } else {
      el.profileList.innerHTML = profiles.map((p) => {
        const r = calculate(sanitize(p.inputs));
        return '<li data-id="' + p.id + '">' +
          '<div class="p-main"><strong>' + escapeHtml(p.name) + '</strong>' +
          '<span class="p-rate">' + fmtMoney(r.hourly, p.inputs.currency, 0) + '/h · ' + fmtNum(r.billableHours) + ' h/yr</span></div>' +
          '<div class="p-actions">' +
          '<button class="btn btn-sm" data-action="load" type="button">Load</button>' +
          '<button class="btn btn-sm btn-danger" data-action="delete" type="button" aria-label="Delete ' + escapeHtml(p.name) + '">Delete</button>' +
          '</div></li>';
      }).join('');
    }
    renderCompareOptions(profiles);
    if (!pro && profiles.length >= FREE_PROFILE_LIMIT) {
      el.saveProfileBtn.textContent = 'Save profile (Pro)';
    } else {
      el.saveProfileBtn.textContent = 'Save profile';
    }
  }

  // ---------- Compare (Pro) ----------
  function renderCompareOptions(profiles) {
    const opts = profiles.map((p) => '<option value="' + p.id + '">' + escapeHtml(p.name) + '</option>').join('');
    const a = el.compareA.value, b = el.compareB.value;
    el.compareA.innerHTML = opts; el.compareB.innerHTML = opts;
    if (profiles.length) {
      el.compareA.value = profiles.some((p) => p.id === a) ? a : profiles[0].id;
      el.compareB.value = profiles.some((p) => p.id === b) ? b : (profiles[1] || profiles[0]).id;
      if (el.compareA.value === el.compareB.value && profiles.length > 1) {
        const other = profiles.find((p) => p.id !== el.compareA.value);
        el.compareB.value = other.id;
      }
    }
    if (!el.comparePanel.classList.contains('hidden')) renderCompare();
  }

  function toggleCompare() {
    if (!isPro()) { openPro('compare'); return; }
    const profiles = getProfiles();
    if (profiles.length < 2) { toast('Save at least two profiles to compare'); return; }
    el.comparePanel.classList.toggle('hidden');
    el.compareToggle.textContent = el.comparePanel.classList.contains('hidden') ? 'Compare profiles' : 'Hide comparison';
    if (!el.comparePanel.classList.contains('hidden')) { renderCompare(); track('compare', {}); }
  }

  function renderCompare() {
    const profiles = getProfiles();
    const pa = profiles.find((p) => p.id === el.compareA.value);
    const pb = profiles.find((p) => p.id === el.compareB.value);
    if (!pa || !pb) { el.compareBody.innerHTML = ''; return; }
    const sa = sanitize(pa.inputs), sb = sanitize(pb.inputs);
    const ra = calculate(sa), rb = calculate(sb);
    el.compareHeadA.textContent = pa.name; el.compareHeadB.textContent = pb.name;
    const sameCur = sa.currency === sb.currency;
    const rows = [
      ['Hourly rate', ra.hourly, rb.hourly, 'money', 2],
      ['Daily rate', ra.daily, rb.daily, 'money', 0],
      ['Weekly rate', ra.weekly, rb.weekly, 'money', 0],
      ['Monthly revenue target', ra.monthly, rb.monthly, 'money', 0],
      ['Annual gross revenue', ra.gross, rb.gross, 'money', 0],
      ['Take-home income', sa.income, sb.income, 'money', 0],
      ['Expenses', sa.expenses, sb.expenses, 'money', 0],
      ['Tax rate', sa.taxRate, sb.taxRate, 'pct'],
      ['Buffer margin', sa.margin, sb.margin, 'pct'],
      ['Billable hours / year', ra.billableHours, rb.billableHours, 'num'],
      ['Billable hours / day', sa.hoursPerDay, sb.hoursPerDay, 'num', 1],
      ['Weeks off', sa.weeksOff, sb.weeksOff, 'num'],
      ['Real hourly (take-home)', ra.realHourly, rb.realHourly, 'money', 2]
    ];
    el.compareBody.innerHTML = rows.map(([label, a, b, type, d]) => {
      const f = (v, cur) => type === 'money' ? fmtMoney(v, cur, d) : type === 'pct' ? fmtPct(v) : fmtNum(v, d);
      let diff = '–';
      if (Number.isFinite(a) && Number.isFinite(b) && (type !== 'money' || sameCur)) {
        const dv = b - a;
        const sign = dv > 0 ? '+' : '';
        diff = sign + (type === 'money' ? fmtMoney(dv, sb.currency, d) : type === 'pct' ? fmtPct(dv) : fmtNum(dv, d));
      }
      const cls = Number.isFinite(b - a) && b - a !== 0 ? (b - a > 0 ? ' up' : ' down') : '';
      return '<tr><td>' + label + '</td><td class="num">' + f(a, sa.currency) + '</td><td class="num">' + f(b, sb.currency) + '</td><td class="num diff' + cls + '">' + diff + '</td></tr>';
    }).join('');
  }

  // ---------- Report (Pro) ----------
  function openReport() {
    if (!isPro()) { openPro('report'); return; }
    fillReport();
    track('report', {});
    window.print();
  }

  function fillReport() {
    const r = result, s = state, cur = s.currency;
    const row = (k, v) => '<tr><th scope="row">' + k + '</th><td class="num">' + v + '</td></tr>';
    el.reportMeta.textContent = 'Generated ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) + ' · Currency: ' + cur;
    el.reportInputs.querySelector('tbody').innerHTML = [
      row('Desired annual take-home income', fmtMoney(s.income, cur, 0)),
      row('Annual business expenses', fmtMoney(s.expenses, cur, 0)),
      row('Tax rate', fmtPct(s.taxRate)),
      row('Profit / buffer margin', fmtPct(s.margin)),
      row('Billable hours per day', fmtNum(s.hoursPerDay, 1)),
      row('Working days per week', fmtNum(s.daysPerWeek)),
      row('Weeks off per year', fmtNum(s.weeksOff)),
      row('Non-billable share of an 8-hour day', fmtPct(r.nonBillablePct))
    ].join('');
    el.reportResults.querySelector('tbody').innerHTML = [
      row('<strong>Minimum hourly rate</strong>', '<strong>' + fmtMoney(r.hourly, cur, 2) + '</strong>'),
      row('Daily rate', fmtMoney(r.daily, cur, 0)),
      row('Weekly rate', fmtMoney(r.weekly, cur, 0)),
      row('Monthly revenue target', fmtMoney(r.monthly, cur, 0)),
      row('Annual gross revenue needed', fmtMoney(r.gross, cur, 0)),
      row('Working weeks per year', fmtNum(r.workingWeeks)),
      row('Billable hours per year', fmtNum(r.billableHours) + ' h'),
      row('Real hourly (take-home ÷ all hours worked)', fmtMoney(r.realHourly, cur, 2))
    ].join('');
    el.reportBreakdown.querySelector('tbody').innerHTML = r.shares.map((sh) =>
      row(sh.label, fmtMoney(sh.value, cur, 0) + ' (' + fmtPct(sh.pct) + ')')
    ).join('') + row('<strong>Total gross revenue</strong>', '<strong>' + fmtMoney(r.gross, cur, 0) + '</strong>');
    el.reportQuote.querySelector('tbody').innerHTML = [
      row('Estimated hours', fmtNum(s.quoteHours)),
      row('Rush multiplier', '×' + s.rush),
      row('Suggested fixed price', fmtMoney(r.quoteFixed, cur, 0)),
      row('Value-based range (×1.2–1.5)', fmtMoney(r.quoteLow, cur, 0) + ' – ' + fmtMoney(r.quoteHigh, cur, 0))
    ].join('');
  }

  // ---------- Partners (affiliate) ----------
  const PARTNERS = [
    { key: 'wise', name: 'Wise', blurb: 'Multi-currency business account with local bank details in USD, EUR, GBP and more. Low, transparent conversion fees — handy when clients pay in a currency you don\'t use.', cta: 'Open a Wise account' },
    { key: 'payoneer', name: 'Payoneer', blurb: 'Receive payments from marketplaces and international clients, with receiving accounts in several currencies. Widely accepted by platforms like Upwork and Fiverr.', cta: 'Try Payoneer' },
    { key: 'deel', name: 'Deel', blurb: 'Contracts, compliance and invoicing for contractors working with companies abroad. Useful when a client wants to pay you through a proper contractor agreement.', cta: 'Explore Deel' }
  ];
  function renderPartners() {
    const links = C.AFFILIATE_LINKS || {};
    const active = PARTNERS.filter((p) => typeof links[p.key] === 'string' && links[p.key].trim() !== '');
    if (!active.length) { el.partnersSection.classList.add('hidden'); return; }
    el.partnerGrid.innerHTML = active.map((p) =>
      '<div class="partner"><h3>' + p.name + '</h3><p>' + p.blurb + '</p>' +
      '<a class="btn btn-primary btn-sm" href="' + escapeHtml(links[p.key]) + '" target="_blank" rel="sponsored noopener" data-partner="' + p.key + '">' + p.cta + ' →</a></div>'
    ).join('');
    el.partnerGrid.querySelectorAll('a[data-partner]').forEach((a) =>
      a.addEventListener('click', () => track('affiliate_click', { partner: a.dataset.partner }))
    );
    el.partnersSection.classList.remove('hidden');
  }

  // ---------- Pro UI ----------
  function refreshUI() {
    const pro = isPro();
    if (el.proPrice) el.proPrice.textContent = C.PRO_PRICE || '$9';
    document.querySelectorAll('[data-pro-price]').forEach((n) => { n.textContent = C.PRO_PRICE || '$9'; });
    if (el.navProBtn) el.navProBtn.textContent = pro ? 'Pro ✓' : 'Pro';
    el.reportBtn.textContent = pro ? 'Rate report (PDF)' : 'Rate report (PDF) · Pro';
    el.compareToggle.textContent = pro
      ? (el.comparePanel.classList.contains('hidden') ? 'Compare profiles' : 'Hide comparison')
      : 'Compare profiles · Pro';
    if (!pro) el.comparePanel.classList.add('hidden');
    renderProfiles();
  }

  // ---------- Events ----------
  let saveTimer = null;
  function onInput(e) {
    if (e && e.target === el.hoursPerDay) el.hoursPerDayNum.value = el.hoursPerDay.value;
    if (e && e.target === el.hoursPerDayNum) {
      const v = clamp(num(el.hoursPerDayNum.value, 5), 1, 12);
      el.hoursPerDay.value = v;
    }
    readInputs();
    render();
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, 150);
  }

  function bind() {
    ['income', 'currency', 'expenses', 'taxRate', 'margin', 'hoursPerDay', 'hoursPerDayNum', 'daysPerWeek', 'weeksOff', 'quoteHours', 'rush']
      .forEach((k) => {
        el[k].addEventListener('input', onInput);
        el[k].addEventListener('change', (e) => {
          // normalise out-of-range values on blur/change
          onInput(e);
          writeInputs(state);
        });
      });

    el.copyBtn.addEventListener('click', async () => {
      const ok = await copyText(summaryText());
      track('copy', {});
      toast(ok ? 'Summary copied to clipboard' : 'Copy failed – select and copy manually');
    });

    el.shareBtn.addEventListener('click', async () => {
      const url = buildShareUrl();
      history.replaceState(null, '', url);
      track('share', {});
      if (navigator.share) {
        try { await navigator.share({ title: 'My freelance rate', text: 'Check my freelance hourly rate calculation', url }); return; } catch (e) { /* user cancelled or unsupported, fall back */ }
      }
      const ok = await copyText(url);
      toast(ok ? 'Share link copied' : 'Link is in the address bar');
    });

    el.resetBtn.addEventListener('click', () => {
      state = Object.assign({}, DEFAULTS);
      writeInputs(state);
      render(); save();
      history.replaceState(null, '', location.pathname);
      track('reset', {});
      toast('Reset to defaults');
    });

    el.saveProfileBtn.addEventListener('click', saveProfile);
    el.profileName.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); saveProfile(); } });
    el.profileList.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.closest('li').dataset.id;
      if (btn.dataset.action === 'load') loadProfile(id);
      else if (btn.dataset.action === 'delete') deleteProfile(id);
    });
    el.reportBtn.addEventListener('click', openReport);
    el.compareToggle.addEventListener('click', toggleCompare);
    el.compareA.addEventListener('change', renderCompare);
    el.compareB.addEventListener('change', renderCompare);

    // Keep the printable report in sync if the user prints via Ctrl/Cmd+P while Pro
    window.addEventListener('beforeprint', () => { if (isPro() && result) fillReport(); });

    document.addEventListener('pro:changed', refreshUI);
  }

  // ---------- Init ----------
  function init() {
    const fromUrl = readUrlParams();
    const saved = loadSaved();
    state = sanitize(Object.assign({}, DEFAULTS, saved || {}, fromUrl || {}));
    writeInputs(state);
    render();
    save();
    bind();
    renderPartners();
    refreshUI();
    if (fromUrl) toast('Loaded numbers from shared link');
    track('tool_view', {});
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
