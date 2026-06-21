'use strict';

/* ── App State ──────────────────────────────────────────── */
const AppState = {
  activeTab:           'start',
  practiceSession:     null,
  practiceInitialized: false,
  prefs:               {}
};

/* ── Init ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  AppState.prefs = loadPrefs();
  _applyReducedMotion(AppState.prefs);

  initNavigation();
  initStartHere();
  initReference();
  initProgress();
  initCasinoAwareness();

  // Activate saved tab or default
  const savedTab = AppState.prefs.lastTab || 'start';
  activateTab(savedTab, false);

  _registerServiceWorker();
});

/* ── Navigation ─────────────────────────────────────────── */
function initNavigation() {
  const buttons = document.querySelectorAll('.tab-btn[data-tab]');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab, true));
    // Support keyboard left/right arrow between tabs
    btn.addEventListener('keydown', e => {
      const allBtns = [...buttons];
      const idx = allBtns.indexOf(btn);
      if (e.key === 'ArrowRight') {
        allBtns[(idx + 1) % allBtns.length].focus();
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        allBtns[(idx - 1 + allBtns.length) % allBtns.length].focus();
        e.preventDefault();
      }
    });
  });
}

function activateTab(tabId, saveToPrefs = true) {
  const buttons = document.querySelectorAll('.tab-btn[data-tab]');
  const panels  = document.querySelectorAll('[role="tabpanel"]');

  // Update buttons
  buttons.forEach(btn => {
    const active = btn.dataset.tab === tabId;
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
    btn.tabIndex = active ? 0 : -1;
  });

  // Update panels
  panels.forEach(panel => {
    const active = panel.id === `panel-${tabId}`;
    if (active) {
      panel.hidden = false;
      panel.removeAttribute('tabindex');
    } else {
      panel.hidden = true;
    }
  });

  AppState.activeTab = tabId;

  // Lazy-init practice
  if (tabId === 'practice' && !AppState.practiceInitialized) {
    AppState.practiceInitialized = true;
    initPracticeTab();
  }

  // Refresh progress on each visit
  if (tabId === 'progress') {
    refreshProgressDashboard();
  }

  if (saveToPrefs) {
    AppState.prefs.lastTab = tabId;
    savePrefs(AppState.prefs);
  }
}

/* ── Start Here tab ─────────────────────────────────────── */
function initStartHere() {
  _renderHiLoTagTable();
  _renderCountExplainer();
  _renderStartShoeStrip();
  _renderWhyValues();
  _renderStartGlossary();
}

function _renderHiLoTagTable() {
  const container = document.getElementById('hilo-tag-table');
  if (!container) return;

  const rows = [
    {
      ranks: ['2','3','4','5','6'],
      tag: '+1',
      cls: 'plus',
      meaning: 'A low card has been seen. Low cards tend to leave a shoe relatively richer in high cards as they are removed.'
    },
    {
      ranks: ['7','8','9'],
      tag: '0',
      cls: 'zero',
      meaning: 'Neutral for this simplified system. These cards have a small and ambiguous effect on shoe composition.'
    },
    {
      ranks: ['T','J','Q','K','A'],
      tag: '−1',
      cls: 'minus',
      meaning: 'A high card has been seen. High cards tend to leave a shoe relatively poorer in them as they are removed.'
    }
  ];

  container.innerHTML = `
    <table class="hilo-tag-table" aria-label="Hi-Lo tag values by card rank">
      <thead>
        <tr>
          <th scope="col">Card ranks</th>
          <th scope="col">Hi-Lo tag</th>
          <th scope="col">Plain-English meaning</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r => `
          <tr>
            <td>
              <div class="hilo-rank-chips">
                ${r.ranks.map(rank => `<span class="rank-chip rank-chip--${r.cls === 'plus' ? 'low' : r.cls === 'minus' ? 'high' : 'zero'}"
                  aria-label="${RANK_DISPLAY[rank] || rank}">${RANK_DISPLAY[rank] || rank}</span>`).join('')}
              </div>
            </td>
            <td><span class="tag-badge tag-badge--${r.cls}" aria-label="Tag: ${r.tag}">${r.tag}</span></td>
            <td>${r.meaning}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function _renderCountExplainer() {
  const container = document.getElementById('count-explainer');
  if (!container) return;

  container.innerHTML = `
    <div class="explainer-grid">
      <div class="explainer-card">
        <div class="explainer-card__title">Running Count (RC)</div>
        <div class="explainer-card__body">${HILO_EXPLAINER.runningCountDef}</div>
      </div>
      <div class="explainer-card">
        <div class="explainer-card__title">True Count (TC)</div>
        <div class="explainer-card__body">${HILO_EXPLAINER.trueCountDef}</div>
      </div>
      <div class="explainer-card">
        <div class="explainer-card__title">Balanced Count</div>
        <div class="explainer-card__body">${HILO_EXPLAINER.balancedDef}</div>
      </div>
      <div class="explainer-card">
        <div class="explainer-card__title">Deck Penetration</div>
        <div class="explainer-card__body">${HILO_EXPLAINER.penetrationDef}</div>
      </div>
    </div>
    <blockquote>
      A positive Hi-Lo count suggests that relatively more ten-valued cards and aces may remain in the shoe. What that means in practice depends on the rules, the depth of the shoe, and the decisions made.
    </blockquote>
  `;
}

function _renderStartShoeStrip() {
  const container = document.getElementById('shoe-composition');
  if (!container) return;

  // Fresh 6-deck shoe proportions: Low 38.5% · Neutral 23.1% · High 38.5%
  container.innerHTML = `
    <h2>Shoe Composition</h2>
    <p>The strip below represents the initial composition of a 6-deck shoe. As cards are dealt and seen during practice, this visual updates to reflect what remains.</p>
    <div class="shoe-strip" role="img" aria-label="Initial 6-deck shoe composition: 38.5% low cards, 23.1% neutral, 38.5% high cards">
      <div class="shoe-strip__segment shoe-strip__segment--low"     style="width:38.5%"></div>
      <div class="shoe-strip__segment shoe-strip__segment--neutral" style="width:23.1%"></div>
      <div class="shoe-strip__segment shoe-strip__segment--high"    style="width:38.5%"></div>
    </div>
    <div class="shoe-strip-legend" style="margin-top:var(--space-2)">
      <span class="shoe-strip-legend__item">
        <span class="shoe-strip-legend__dot" style="background:var(--color-success)"></span>
        Low cards (2–6) · +1 · 38.5%
      </span>
      <span class="shoe-strip-legend__item">
        <span class="shoe-strip-legend__dot" style="background:var(--color-warning)"></span>
        Neutral (7–9) · 0 · 23.1%
      </span>
      <span class="shoe-strip-legend__item">
        <span class="shoe-strip-legend__dot" style="background:var(--color-error)"></span>
        High cards (10–A) · −1 · 38.5%
      </span>
    </div>
    <p style="margin-top:var(--space-4)">In a fresh shoe, low and high cards are present in equal proportions. As play proceeds and cards are exposed, this balance shifts — and the running count reflects the direction of that shift.</p>
  `;
}

function _renderWhyValues() {
  const container = document.getElementById('why-values-body');
  if (!container) return;
  container.innerHTML = `
    <div class="details-body">
      ${HILO_EXPLAINER.whyValues.map(p => `<p>${p}</p>`).join('')}
    </div>
  `;
}

function _renderStartGlossary() {
  const container = document.getElementById('glossary-start');
  if (!container) return;

  const keyTerms = ['Shoe', 'Discard tray', 'Cut card', 'Upcard', 'Hole card', 'Deck penetration', 'Exposed card'];
  const terms = GLOSSARY_TERMS.filter(t => keyTerms.some(k => t.term.toLowerCase() === k.toLowerCase()));

  container.innerHTML = `
    <h2>Key Terms</h2>
    <dl id="glossary-start-list">
      ${terms.map(t => `
        <dt>${t.term}</dt>
        <dd>${t.definition}</dd>
      `).join('')}
    </dl>
  `;
}

/* ── Practice Tab ───────────────────────────────────────── */
function initPracticeTab() {
  const config = loadSessionConfig();
  AppState.practiceSession = new PracticeSession(config);

  renderModeSelector(config.mode, onModeChange);
  renderConfigPanel(config, onConfigChange);
  renderAnswerInput(config.mode, onAnswerSubmit);
  wireControlButtons();

  AppState.practiceSession.newShoe();
}

function onModeChange(newMode) {
  AppState.practiceSession.updateConfig('mode', newMode);
  renderAnswerInput(newMode, onAnswerSubmit);
  AppState.practiceSession.newShoe();
}

function onConfigChange(key, value) {
  AppState.practiceSession.updateConfig(key, value);

  // Reduced-motion pref applies to body class
  if (key === 'reducedMotion') {
    _applyReducedMotion({ reducedMotion: value });
    AppState.prefs.reducedMotion = value;
    savePrefs(AppState.prefs);
  }

  // Sound pref synced to prefs too
  if (key === 'soundEffects') {
    AppState.prefs.soundEffects = value;
    savePrefs(AppState.prefs);
  }

  // Some config changes require a new shoe
  const shoeKeys = ['numDecks', 'penetration'];
  if (shoeKeys.includes(key)) {
    AppState.practiceSession.newShoe();
  }
}

function onAnswerSubmit(userInput) {
  const session = AppState.practiceSession;
  if (!session || !session.waitingForAnswer) return;
  session.handleAnswer(userInput);
}

function wireControlButtons() {
  _wireBtn('btn-new-shoe', () => {
    if (AppState.practiceSession) {
      endSession(AppState.practiceSession.getSessionSummary());
      AppState.practiceSession.newShoe();
    }
  });

  _wireBtn('btn-reset-round', () => {
    if (AppState.practiceSession) AppState.practiceSession.resetRound();
  });

  _wireBtn('btn-reveal-hole', () => {
    if (AppState.practiceSession) AppState.practiceSession.revealHoleCard();
  });

  _wireBtn('btn-show-answer', () => {
    const session = AppState.practiceSession;
    if (!session) return;
    if (session.waitingForAnswer) {
      // Mark as answered with wrong response to show the correct answer
      const mode = session.currentSubMode || session.config.mode;
      let dummyAnswer;
      if (mode === 'true-count') dummyAnswer = session.tcScenario ? session.tcScenario.correctTC + 5 : 99;
      else if (mode === 'card-drill') dummyAnswer = (session.currentCard ? session.currentCard.hiLoTag : 0) + 5;
      else dummyAnswer = session.runningCount + 5;

      const result = session.checkAnswer(dummyAnswer);
      if (result) {
        renderFeedback({
          ...result,
          mode,
          userAnswer: null,
          correct: false,
          showOnly: true
        }, 'feedback-panel');
        recordAnswer({ ...result, correct: false }, session.config);
        updateShoeIndicator(session.shoe);
      }
    }
  });

  _wireBtn('btn-advance', () => {
    if (AppState.practiceSession) AppState.practiceSession.advanceDrill();
  });

  const pauseBtn = document.getElementById('btn-pause');
  const overlay  = document.getElementById('pause-overlay');
  const resumeBtn = document.getElementById('btn-resume');

  if (pauseBtn && overlay) {
    pauseBtn.addEventListener('click', () => {
      const session = AppState.practiceSession;
      if (!session) return;
      session.paused = true;
      overlay.hidden = false;
      pauseBtn.setAttribute('aria-pressed', 'true');
      overlay.querySelector('#btn-resume')?.focus();
    });
  }

  if (resumeBtn && overlay) {
    resumeBtn.addEventListener('click', () => {
      const session = AppState.practiceSession;
      if (session) session.paused = false;
      overlay.hidden = true;
      const pauseBtn = document.getElementById('btn-pause');
      if (pauseBtn) {
        pauseBtn.setAttribute('aria-pressed', 'false');
        pauseBtn.focus();
      }
    });
  }
}

function _wireBtn(id, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', fn);
}

/* ── Progress Tab ───────────────────────────────────────── */
function initProgress() {
  const container = document.querySelector('#panel-progress .progress-layout');
  if (container) container.innerHTML = '<p style="color:var(--color-ivory-muted);padding:var(--space-4)">Visit this tab to see your progress.</p>';

  const resetBtn = document.getElementById('btn-reset-progress');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset all progress? This cannot be undone.')) {
        resetProgress();
        refreshProgressDashboard();
        if (AppState.practiceSession) {
          AppState.practiceSession.roundsThisSession = 0;
          AppState.practiceSession.correctCount      = 0;
          AppState.practiceSession.totalCount        = 0;
        }
      }
    });
  }

  const exportBtn = document.getElementById('btn-export-progress');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const json = exportProgressJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `count-lab-progress-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }
}

function refreshProgressDashboard() {
  const progressData = loadProgress();
  const history      = loadSessionHistory();
  const milestones   = getMilestoneStatus(progressData);
  const suggestions  = getAdaptiveSuggestions(progressData);

  renderStatGrid(progressData);
  renderSkillMap(milestones);
  renderAdaptiveSuggestions(suggestions);
  renderAccuracyByRank(progressData);
  renderMistakeBreakdown(progressData);
  renderSessionHistory(history);
}

/* ── Helpers ────────────────────────────────────────────── */
function _applyReducedMotion(prefs) {
  const isReduced = prefs.reducedMotion
    || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  document.body.classList.toggle('reduced-motion', !!isReduced);
}

function _registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('Service worker registration failed:', err);
    });
  }
}
