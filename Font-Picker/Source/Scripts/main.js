/* =================================================================
   BLACKBOX FONT PICKER — main.js
   ================================================================= */

'use strict';

// -----------------------------------------------------------------
// FONT DATA (loaded from fonts.json)
// -----------------------------------------------------------------
let FONTS = { body: [], display: [] };

// -----------------------------------------------------------------
// DEFAULTS
// -----------------------------------------------------------------
const DEFAULTS = {
  heading:       'IBM Plex Sans',
  body:          'Inter',
  weightHeading: 600,
  weightBody:    400
};

// -----------------------------------------------------------------
// STATE
// -----------------------------------------------------------------
const state = {
  headingFont:   DEFAULTS.heading,
  bodyFont:      DEFAULTS.body,
  weightHeading: DEFAULTS.weightHeading,
  weightBody:    DEFAULTS.weightBody,
  sameAsHeading: false
};

// Tracks which font <link> tags we've already injected
const loadedFonts = new Set();

// -----------------------------------------------------------------
// GOOGLE FONTS LOADER
// Weight range we always request for every font
// -----------------------------------------------------------------
const WEIGHT_RANGE = '100;200;300;400;500;600;700;800;900';

function buildGoogleFontsUrl(fontName) {
  const encoded = fontName.replace(/ /g, '+');
  return `https://fonts.googleapis.com/css2?family=${encoded}:wght@${WEIGHT_RANGE}&display=swap`;
}

function injectFont(fontName) {
  if (loadedFonts.has(fontName)) return;
  loadedFonts.add(fontName);

  const link = document.createElement('link');
  link.rel  = 'stylesheet';
  link.href = buildGoogleFontsUrl(fontName);
  document.head.appendChild(link);
}

// -----------------------------------------------------------------
// CYRILLIC SUPPORT HELPERS
// -----------------------------------------------------------------
function hasCyrillic(fontName) {
  const font = [...FONTS.body, ...FONTS.display].find(f => f.name === fontName);
  return font ? font.cyrillic : false;
}

function getCyrNoticeText() {
  if (document.documentElement.lang === 'mk') {
    return {
      title: 'Нема кирилична поддршка!',
      sub:   'Прикажаниот текст ќе го користи системскиот фонт.'
    };
  }
  return {
    title: 'No Cyrillic support!',
    sub:   'Displayed font will use system default.'
  };
}

// Logo mark paths (injected into all svg[data-logo-mark] elements)
const LOGO_MARK = '<polyline points="200 140.13956 200 200 0 200 0 0 166.96228 0 166.96228 66.62062 110.06889 123.51401 76.48599 123.51401 76.48599 89.93111 118.92299 47.49411 47.49411 47.49411 47.49411 152.50589 152.50589 152.50589 152.50589 140.13956" fill="currentColor"/><polyline points="152.50589 143.69539 152.50589 66.98408 200 66.98408 200 143.69539" fill="currentColor"/>';

function initLogoMarks() {
  document.querySelectorAll('svg[data-logo-mark]').forEach(svg => {
    svg.innerHTML = LOGO_MARK;
  });
}

const CYR_ICON = `<svg class="cyr-notice__icon" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 1.5L12.8 12H1.2L7 1.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><line x1="7" y1="5.5" x2="7" y2="8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="7" cy="10.5" r="0.7" fill="currentColor"/></svg>`;

/** Insert warning notices below each font select (once, idempotent) */
function initCyrillicNotices() {
  const { title, sub } = getCyrNoticeText();
  [['headingFont', 'headingCyrNotice'], ['bodyFont', 'bodyCyrNotice']].forEach(([selectId, noticeId]) => {
    if (document.getElementById(noticeId)) return;
    const selectEl = document.getElementById(selectId);
    if (!selectEl) return;
    const group = selectEl.closest('.control-group');
    if (!group) return;
    const notice = document.createElement('div');
    notice.id        = noticeId;
    notice.className = 'cyr-notice';
    notice.hidden    = true;
    notice.innerHTML = `${CYR_ICON}<div class="cyr-notice__text"><strong class="cyr-notice__title">${title}</strong><span class="cyr-notice__sub">${sub}</span></div>`;
    group.insertAdjacentElement('afterend', notice);
  });
}

function updateCyrillicWarnings() {
  // Alphabet column
  const cyrCol = document.querySelector('.alphabet-col--cyrillic');
  if (cyrCol) {
    const headingBlock = cyrCol.querySelector('.alphabet-font-block--heading');
    const bodyBlock    = cyrCol.querySelector('.alphabet-font-block--body');
    if (headingBlock) headingBlock.classList.toggle('no-cyr', !hasCyrillic(state.headingFont));
    if (bodyBlock)    bodyBlock.classList.toggle('no-cyr', !hasCyrillic(state.bodyFont));
  }
  // Picker panel notices
  const headingNotice = document.getElementById('headingCyrNotice');
  const bodyNotice    = document.getElementById('bodyCyrNotice');
  if (headingNotice) headingNotice.hidden = hasCyrillic(state.headingFont);
  if (bodyNotice)    bodyNotice.hidden    = hasCyrillic(state.bodyFont);
}

// -----------------------------------------------------------------
// CSS VARIABLE UPDATER
// -----------------------------------------------------------------
function applyFontVars() {
  const root = document.documentElement;
  root.style.setProperty('--font-heading', `'${state.headingFont}', sans-serif`);
  root.style.setProperty('--font-body',    `'${state.bodyFont}', sans-serif`);
  root.style.setProperty('--weight-heading', state.weightHeading);
  root.style.setProperty('--weight-body',    state.weightBody);
}

function updateMeta() {
  document.getElementById('metaHeadingName').textContent   = state.headingFont;
  document.getElementById('metaHeadingWeight').textContent = state.weightHeading;
  document.getElementById('metaBodyName').textContent      = state.bodyFont;
  document.getElementById('metaBodyWeight').textContent    = state.weightBody;
}

// Opacity flash on font swap so the change is clearly visible
function flashPreview() {
  const area = document.getElementById('previewArea');
  if (!area) return;
  area.classList.add('font-swapping');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => area.classList.remove('font-swapping'));
  });
}

// -----------------------------------------------------------------
// SELECT POPULATION
// -----------------------------------------------------------------

/** Build a sorted font list: CYR first, then alphabetical within each group */
function sortFonts(fonts) {
  const cyr    = fonts.filter(f => f.cyrillic).sort((a, b) => a.name.localeCompare(b.name));
  const nonCyr = fonts.filter(f => !f.cyrillic).sort((a, b) => a.name.localeCompare(b.name));
  return [...cyr, ...nonCyr];
}

function optionLabel(font) {
  return font.cyrillic ? `${font.name} (CYR)` : font.name;
}

function populateHeadingSelect() {
  const sel = document.getElementById('headingFont');
  if (!sel) return;
  sel.innerHTML = '';

  // All body-group fonts first (CYR top), then all display-group fonts (CYR top)
  const bodySorted    = sortFonts(FONTS.body);
  const displaySorted = sortFonts(FONTS.display);

  const bodyGroup = document.createElement('optgroup');
  bodyGroup.label = 'Body fonts';
  bodySorted.forEach(f => {
    const opt = document.createElement('option');
    opt.value       = f.name;
    opt.textContent = optionLabel(f);
    if (f.name === state.headingFont) opt.selected = true;
    bodyGroup.appendChild(opt);
  });

  const displayGroup = document.createElement('optgroup');
  displayGroup.label = 'Display fonts';
  displaySorted.forEach(f => {
    const opt = document.createElement('option');
    opt.value       = f.name;
    opt.textContent = optionLabel(f);
    if (f.name === state.headingFont) opt.selected = true;
    displayGroup.appendChild(opt);
  });

  sel.appendChild(bodyGroup);
  sel.appendChild(displayGroup);
}

function populateBodySelect() {
  const sel = document.getElementById('bodyFont');
  if (!sel) return;
  sel.innerHTML = '';

  const sorted = sortFonts(FONTS.body);
  sorted.forEach(f => {
    const opt = document.createElement('option');
    opt.value       = f.name;
    opt.textContent = optionLabel(f);
    if (f.name === state.bodyFont) opt.selected = true;
    sel.appendChild(opt);
  });
}

// -----------------------------------------------------------------
// CONTROL SYNC
// -----------------------------------------------------------------
function syncWeightDisplay() {
  const hwVal = document.getElementById('headingWeightVal');
  const bwVal = document.getElementById('bodyWeightVal');
  if (hwVal) hwVal.textContent = state.weightHeading;
  if (bwVal) bwVal.textContent = state.weightBody;
}

function syncSameAsHeading() {
  const bodySelect = document.getElementById('bodyFont');
  const bodySlider = document.getElementById('bodyWeight');
  const disabled   = state.sameAsHeading;

  if (bodySelect) bodySelect.disabled = disabled;
  if (bodySlider) bodySlider.disabled = disabled;
}

// -----------------------------------------------------------------
// FONT CHANGE HANDLERS
// -----------------------------------------------------------------
function onHeadingFontChange(fontName) {
  state.headingFont = fontName;
  injectFont(fontName);

  if (state.sameAsHeading) {
    state.bodyFont = fontName;
    // Keep body select in sync visually even though it's disabled
    const bodySelect = document.getElementById('bodyFont');
    if (bodySelect) bodySelect.value = fontName;
  }

  flashPreview();
  applyFontVars();
  updateMeta();
  updateCyrillicWarnings();
}

function onBodyFontChange(fontName) {
  state.bodyFont = fontName;
  injectFont(fontName);
  flashPreview();
  applyFontVars();
  updateMeta();
  updateCyrillicWarnings();
}

function onHeadingWeightChange(weight) {
  state.weightHeading = Number(weight);
  syncWeightDisplay();
  applyFontVars();
  updateMeta();
}

function onBodyWeightChange(weight) {
  state.weightBody = Number(weight);
  syncWeightDisplay();
  applyFontVars();
  updateMeta();
}

function onSameAsHeadingChange(checked) {
  state.sameAsHeading = checked;
  if (checked) {
    state.bodyFont = state.headingFont;
    injectFont(state.headingFont);
    flashPreview();
    applyFontVars();
    updateMeta();
  }
  syncSameAsHeading();
  updateCyrillicWarnings();
}

function resetFonts() {
  state.headingFont   = DEFAULTS.heading;
  state.bodyFont      = DEFAULTS.body;
  state.weightHeading = DEFAULTS.weightHeading;
  state.weightBody    = DEFAULTS.weightBody;
  state.sameAsHeading = false;

  // Reset UI controls
  const hSelect  = document.getElementById('headingFont');
  const bSelect  = document.getElementById('bodyFont');
  const hSlider  = document.getElementById('headingWeight');
  const bSlider  = document.getElementById('bodyWeight');
  const checkbox = document.getElementById('sameAsHeading');

  if (hSelect)  hSelect.value   = DEFAULTS.heading;
  if (bSelect)  bSelect.value   = DEFAULTS.body;
  if (hSlider)  hSlider.value   = DEFAULTS.weightHeading;
  if (bSlider)  bSlider.value   = DEFAULTS.weightBody;
  if (checkbox) checkbox.checked = false;

  syncSameAsHeading();
  syncWeightDisplay();
  flashPreview();
  applyFontVars();
  updateMeta();
  updateCyrillicWarnings();
}

// -----------------------------------------------------------------
// PREVIEW SIZE BUTTONS
// -----------------------------------------------------------------
function initPreviewSizeButtons() {
  const area    = document.getElementById('previewArea');
  const buttons = document.querySelectorAll('.preview-size-btn');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (area) area.dataset.size = btn.dataset.size;
    });
  });
}

// -----------------------------------------------------------------
// ALPHABET TABS
// -----------------------------------------------------------------
function initAlphabetTabs() {
  const tabs = document.querySelectorAll('.alphabet-tab');
  const grid = document.getElementById('alphabetGrid');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (grid) grid.dataset.view = tab.dataset.view;
    });
  });
}

// -----------------------------------------------------------------
// THEME TOGGLE
// -----------------------------------------------------------------
function initThemeToggle() {
  const btn   = document.getElementById('themeToggle');
  const saved = localStorage.getItem('bb-theme');
  if (saved) document.documentElement.dataset.theme = saved;

  if (btn) {
    btn.addEventListener('click', () => {
      const isDark = document.documentElement.dataset.theme === 'dark';
      const next   = isDark ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      localStorage.setItem('bb-theme', next);
    });
  }
}

// -----------------------------------------------------------------
// EVENT BINDINGS
// -----------------------------------------------------------------
function bindControls() {
  const hSelect  = document.getElementById('headingFont');
  const bSelect  = document.getElementById('bodyFont');
  const hSlider  = document.getElementById('headingWeight');
  const bSlider  = document.getElementById('bodyWeight');
  const checkbox = document.getElementById('sameAsHeading');
  const resetBtn = document.getElementById('resetFonts');

  if (hSelect)  hSelect.addEventListener('change', e => onHeadingFontChange(e.target.value));
  if (bSelect)  bSelect.addEventListener('change', e => onBodyFontChange(e.target.value));
  if (hSlider)  hSlider.addEventListener('input',  e => onHeadingWeightChange(e.target.value));
  if (bSlider)  bSlider.addEventListener('input',  e => onBodyWeightChange(e.target.value));
  if (checkbox) checkbox.addEventListener('change', e => onSameAsHeadingChange(e.target.checked));
  if (resetBtn) resetBtn.addEventListener('click',  resetFonts);
}

// -----------------------------------------------------------------
// INIT
// -----------------------------------------------------------------
async function init() {
  // Load fonts.json
  try {
    const res  = await fetch('fonts.json');
    const data = await res.json();
    FONTS = data;
    if (data.defaults) {
      DEFAULTS.heading       = data.defaults.heading       || DEFAULTS.heading;
      DEFAULTS.body          = data.defaults.body          || DEFAULTS.body;
      DEFAULTS.weightHeading = data.defaults.weightHeading || DEFAULTS.weightHeading;
      DEFAULTS.weightBody    = data.defaults.weightBody    || DEFAULTS.weightBody;
    }
  } catch (err) {
    console.warn('Could not load fonts.json, using built-in defaults.', err);
  }

  // Reset state to (potentially updated) defaults
  state.headingFont   = DEFAULTS.heading;
  state.bodyFont      = DEFAULTS.body;
  state.weightHeading = DEFAULTS.weightHeading;
  state.weightBody    = DEFAULTS.weightBody;

  // Pre-load default fonts
  injectFont(DEFAULTS.heading);
  if (DEFAULTS.body !== DEFAULTS.heading) injectFont(DEFAULTS.body);

  // Build selects
  populateHeadingSelect();
  populateBodySelect();

  // Sync slider display values to defaults
  const hSlider = document.getElementById('headingWeight');
  const bSlider = document.getElementById('bodyWeight');
  if (hSlider) hSlider.value = state.weightHeading;
  if (bSlider) bSlider.value = state.weightBody;
  syncWeightDisplay();

  // Apply vars
  applyFontVars();
  updateMeta();

  // Wire up all controls
  bindControls();
  initPreviewSizeButtons();
  initAlphabetTabs();
  initThemeToggle();
  initLogoMarks();
  initCyrillicNotices();
  updateCyrillicWarnings();
}

document.addEventListener('DOMContentLoaded', init);
