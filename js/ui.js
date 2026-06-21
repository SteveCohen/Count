'use strict';

/* ── Audio ────────────────────────────────────────────── */
let _audioCtx = null;

function _getAudioCtx() {
  if (!_audioCtx) {
    try {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return null; }
  }
  if (_audioCtx.state === 'suspended') {
    _audioCtx.resume().catch(() => {});
  }
  return _audioCtx;
}

function playSound(type, prefs) {
  if (!prefs || !prefs.soundEffects) return;
  const ctx = _getAudioCtx();
  if (!ctx) return;

  const sounds = {
    deal:      { freq: 420, dur: 0.05, wave: 'triangle', gain: 0.08 },
    correct:   { freq: 523, dur: 0.18, wave: 'sine',     gain: 0.12 },
    incorrect: { freq: 210, dur: 0.22, wave: 'sawtooth', gain: 0.08 },
    milestone: { freq: 659, dur: 0.35, wave: 'sine',     gain: 0.14 }
  };

  const s = sounds[type];
  if (!s) return;

  try {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = s.wave;
    osc.frequency.setValueAtTime(s.freq, ctx.currentTime);
    gain.gain.setValueAtTime(s.gain, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s.dur);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + s.dur + 0.01);

    if (type === 'milestone') {
      // Short rising arpeggio
      [659, 784, 988].forEach((f, i) => {
        setTimeout(() => {
          try {
            const o2 = ctx.createOscillator();
            const g2 = ctx.createGain();
            o2.connect(g2); g2.connect(ctx.destination);
            o2.frequency.value = f;
            o2.type = 'sine';
            g2.gain.setValueAtTime(0.10, ctx.currentTime);
            g2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
            o2.start(); o2.stop(ctx.currentTime + 0.20);
          } catch {}
        }, 150 + i * 130);
      });
    }
  } catch (e) {}
}

/* ── Screen-reader announcer ─────────────────────────── */
function announceCard(card) {
  const el = document.getElementById('sr-announcer');
  if (!el) return;
  if (card.isVisible) {
    const suitName = SUIT_NAMES[card.suit] || card.suit;
    const display  = RANK_DISPLAY[card.rank] || card.rank;
    el.textContent = `Dealt: ${display} of ${suitName}`;
  } else {
    el.textContent = 'Dealt: face-down card';
  }
}

function announce(msg) {
  const el = document.getElementById('sr-announcer');
  if (el) el.textContent = msg;
}

/* ── Card rendering ──────────────────────────────────── */
function renderCard(card, options = {}) {
  const { size = 'normal', showTag = false, animate = false } = options;
  const el = document.createElement('div');

  if (!card.isVisible) {
    el.className = 'card card--hidden' + (size === 'sm' ? ' card--sm' : '');
    el.setAttribute('aria-label', 'Face-down card');
    el.dataset.cardId = card.id;
    if (animate) el.classList.add('card--dealing');
    // Visible placeholder content for screen reader
    const hidden = document.createElement('span');
    hidden.className = 'sr-only';
    hidden.textContent = 'Face-down card (hidden from count)';
    el.appendChild(hidden);
    return el;
  }

  const isRed   = RED_SUITS.has(card.suit);
  const display = RANK_DISPLAY[card.rank] || card.rank;
  const suitName = SUIT_NAMES[card.suit] || card.suit;

  el.className = [
    'card',
    isRed ? 'card--red' : 'card--black',
    size === 'sm' ? 'card--sm' : '',
    animate ? 'card--dealing' : ''
  ].filter(Boolean).join(' ');

  el.dataset.cardId = card.id;
  el.setAttribute('aria-label',
    `${display} of ${suitName}, Hi-Lo tag ${tagLabel(card.hiLoTag)}`);

  el.innerHTML = `
    <div class="card__top">
      <span class="card__rank-top">${display}</span>
      <span class="card__suit-top" aria-hidden="true">${card.suit}</span>
    </div>
    <div class="card__center" aria-hidden="true">${card.suit}</div>
    <div class="card__bottom">
      <span class="card__rank-bottom" aria-hidden="true">${display}</span>
    </div>
  `;

  if (showTag) {
    const badge = document.createElement('span');
    badge.className = `card__hilo-tag card__hilo-tag--${tagClass(card.hiLoTag)}`;
    badge.textContent = tagLabel(card.hiLoTag);
    badge.setAttribute('aria-hidden', 'true');
    el.appendChild(badge);
  }

  return el;
}

function flipCard(cardId, newCard, showTag) {
  const el = document.querySelector(`.card[data-card-id="${cardId}"]`);
  if (!el) return;

  el.classList.add('card--flipping-out');

  setTimeout(() => {
    el.classList.remove('card--hidden', 'card--flipping-out');
    const isRed = RED_SUITS.has(newCard.suit);
    el.classList.add(isRed ? 'card--red' : 'card--black', 'card--flipping-in');
    const display  = RANK_DISPLAY[newCard.rank] || newCard.rank;
    const suitName = SUIT_NAMES[newCard.suit]   || newCard.suit;

    el.innerHTML = `
      <div class="card__top">
        <span class="card__rank-top">${display}</span>
        <span class="card__suit-top" aria-hidden="true">${newCard.suit}</span>
      </div>
      <div class="card__center" aria-hidden="true">${newCard.suit}</div>
      <div class="card__bottom">
        <span class="card__rank-bottom" aria-hidden="true">${display}</span>
      </div>
    `;

    if (showTag) {
      const badge = document.createElement('span');
      badge.className = `card__hilo-tag card__hilo-tag--${tagClass(newCard.hiLoTag)}`;
      badge.textContent = tagLabel(newCard.hiLoTag);
      badge.setAttribute('aria-hidden', 'true');
      el.appendChild(badge);
    }

    el.setAttribute('aria-label', `${display} of ${suitName}, Hi-Lo tag ${tagLabel(newCard.hiLoTag)}`);
    setTimeout(() => el.classList.remove('card--flipping-in'), 160);
  }, 150);
}

/* ── Card Stage ──────────────────────────────────────── */
function initCardStage(mode, numPlayers) {
  const stage = document.getElementById('card-stage');
  if (!stage) return;
  stage.innerHTML = '';
  stage.className = '';

  if (mode === 'card-drill') {
    stage.innerHTML = `<div class="stage-card-drill" id="drill-card-area"></div>`;

  } else if (mode === 'running-count') {
    stage.innerHTML = `
      <div class="stage-sequence">
        <div class="card-sequence" id="sequence-cards" aria-label="Dealt cards"></div>
      </div>`;

  } else if (mode === 'table-flow') {
    let playerSeats = '';
    for (let i = 1; i <= (numPlayers || 2); i++) {
      playerSeats += `
        <div class="seat" id="seat-player-${i}" aria-label="Player ${i}">
          <div class="stage-label" aria-hidden="true">Player ${i}</div>
          <div class="seat-cards" id="cards-player-${i}"></div>
        </div>`;
    }
    stage.innerHTML = `
      <div class="table-dealer-row">
        <div class="seat" id="seat-dealer" aria-label="Dealer">
          <div class="stage-label" aria-hidden="true">Dealer</div>
          <div class="seat-cards" id="cards-dealer"></div>
        </div>
      </div>
      <div class="table-players-row">${playerSeats}</div>`;

  } else if (mode === 'true-count') {
    stage.innerHTML = `
      <div class="stage-true-count" id="tc-scenario-area">
        <div class="tc-running-count-display">
          <span class="tc-rc-label">Running Count</span>
          <span class="tc-rc-value" id="tc-rc-value">0</span>
        </div>
        <div class="tc-deck-visual" id="tc-deck-visual" aria-label="Remaining decks"></div>
        <div class="tc-decks-label" id="tc-decks-label"></div>
      </div>`;

  } else {
    // mixed: start as card drill; will be re-initted per sub-round
    stage.innerHTML = `<div class="stage-card-drill" id="drill-card-area"></div>`;
  }
}

function addCardToStage(card, location, config) {
  const showTag = config && config.trainingWheels;
  const animate = config && !config.reducedMotion;
  const cardEl  = renderCard(card, { showTag, animate });

  if (location === 'card-drill') {
    const area = document.getElementById('drill-card-area');
    if (area) { area.innerHTML = ''; area.appendChild(cardEl); }

  } else if (location === 'sequence') {
    const seq = document.getElementById('sequence-cards');
    if (seq) seq.appendChild(cardEl);

  } else if (location === 'dealer') {
    const area = document.getElementById('cards-dealer');
    if (area) area.appendChild(cardEl);

  } else if (location && location.startsWith('player-')) {
    const slot = location.replace('player-', '');
    const area = document.getElementById(`cards-player-${slot}`);
    if (area) area.appendChild(cardEl);
  }
}

function clearCardStage() {
  const stage = document.getElementById('card-stage');
  if (stage) stage.innerHTML = '';
}

/* ── Shoe composition strip ──────────────────────────── */
function renderShoeStrip(shoe, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const { lowPct, neutralPct, highPct } = describeDeck(shoe);
  container.innerHTML = `
    <div class="shoe-strip" role="img" aria-label="Remaining shoe composition: ${Math.round(lowPct)}% low, ${Math.round(neutralPct)}% neutral, ${Math.round(highPct)}% high cards">
      <div class="shoe-strip__segment shoe-strip__segment--low"     style="width:${lowPct}%"></div>
      <div class="shoe-strip__segment shoe-strip__segment--neutral" style="width:${neutralPct}%"></div>
      <div class="shoe-strip__segment shoe-strip__segment--high"    style="width:${highPct}%"></div>
    </div>
    <div class="shoe-strip-legend" aria-hidden="true">
      <span class="shoe-strip-legend__item"><span class="shoe-strip-legend__dot" style="background:var(--color-success)"></span>Low ${Math.round(lowPct)}%</span>
      <span class="shoe-strip-legend__item"><span class="shoe-strip-legend__dot" style="background:var(--color-warning)"></span>Neutral ${Math.round(neutralPct)}%</span>
      <span class="shoe-strip-legend__item"><span class="shoe-strip-legend__dot" style="background:var(--color-error)"></span>High ${Math.round(highPct)}%</span>
    </div>
  `;
}

/* ── Shoe indicator (right panel) ────────────────────── */
function updateShoeIndicator(shoe) {
  const el = document.getElementById('shoe-indicator');
  if (!el) return;
  el.innerHTML = `
    <div class="shoe-indicator">
      <div class="shoe-indicator__stats">
        <span class="shoe-indicator__stat">
          <span class="shoe-indicator__value">${shoe.decksRemaining}</span>
          <span>decks remaining</span>
        </span>
        <span class="shoe-indicator__stat">
          <span class="shoe-indicator__value">${shoe.cardsDealt}</span>
          <span>dealt</span>
        </span>
        <span class="shoe-indicator__stat">
          <span class="shoe-indicator__value">${shoe.remainingCards}</span>
          <span>remaining</span>
        </span>
      </div>
      <div id="shoe-strip-practice"></div>
    </div>
  `;
  renderShoeStrip(shoe, 'shoe-strip-practice');
}

/* ── True Count scenario visual ──────────────────────── */
function renderTrueCountScenario(scenario) {
  const rcEl    = document.getElementById('tc-rc-value');
  const deckEl  = document.getElementById('tc-deck-visual');
  const labelEl = document.getElementById('tc-decks-label');
  if (!rcEl || !deckEl || !labelEl) return;

  const rc = scenario.runningCount;
  const label = rc >= 0 ? `+${rc}` : `${rc}`;
  rcEl.textContent = label;
  rcEl.className = 'tc-rc-value ' + (rc > 0 ? 'rc-positive' : rc < 0 ? 'rc-negative' : 'rc-neutral');

  const full = Math.floor(scenario.decksRemaining);
  const half = (scenario.decksRemaining % 1) >= 0.5;
  let deckHtml = '';
  for (let i = 0; i < full; i++) {
    deckHtml += `<div class="deck-icon" aria-hidden="true" title="1 deck">♠</div>`;
  }
  if (half) {
    deckHtml += `<div class="deck-icon deck-icon--partial" aria-hidden="true" title="0.5 deck">♠</div>`;
  }
  deckEl.innerHTML = deckHtml;
  deckEl.setAttribute('aria-label', `${scenario.decksRemaining} decks remaining`);
  labelEl.textContent = `≈ ${scenario.decksRemaining} deck${scenario.decksRemaining !== 1 ? 's' : ''} remaining`;
}

/* ── Feedback ────────────────────────────────────────── */
function renderFeedback(feedbackResult, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const { correct, userAnswer, correctAnswer, breakdown, holeCardNote, mode } = feedbackResult;
  const cls = correct ? 'feedback--correct' : 'feedback--incorrect';
  const icon = correct ? '✓' : '✗';
  const iconAria = correct ? 'Correct' : 'Incorrect';

  let answerText = '';
  if (mode === 'card-drill') {
    answerText = correct
      ? `The Hi-Lo tag for this card is <strong>${tagLabel(correctAnswer)}</strong>.`
      : `You entered <strong>${tagLabelSimple(userAnswer)}</strong>. The correct tag is <strong>${tagLabel(correctAnswer)}</strong>.`;
  } else if (mode === 'true-count') {
    answerText = correct
      ? `Your true count estimate of <strong>${userAnswer}</strong> is within range. Correct answer: <strong>${correctAnswer}</strong>.`
      : `You entered <strong>${userAnswer}</strong>. The correct true count is <strong>${correctAnswer}</strong>.`;
  } else {
    answerText = correct
      ? `The running count is <strong>${correctAnswer >= 0 ? '+' : ''}${correctAnswer}</strong>.`
      : `You entered <strong>${userAnswer >= 0 ? '+' : ''}${userAnswer}</strong>. The correct running count is <strong>${correctAnswer >= 0 ? '+' : ''}${correctAnswer}</strong>.`;
  }

  let breakdownHtml = '';
  if (breakdown && breakdown.length > 0 && mode !== 'true-count') {
    const rows = breakdown.map(b => {
      const display   = RANK_DISPLAY[b.rank] || b.rank;
      const hidden    = !b.isVisible;
      const tagCls    = tagClass(b.hiLoTag);
      const counted   = hidden ? 'No — hidden' : 'Yes';
      return `<tr class="${hidden ? 'breakdown-hidden' : ''}">
        <td>${display}${b.suit || ''}</td>
        <td class="breakdown-tag--${tagCls}">${tagLabel(b.hiLoTag)}</td>
        <td>${counted}</td>
      </tr>`;
    }).join('');

    breakdownHtml = `
      <table class="breakdown-table" aria-label="Card-by-card breakdown">
        <thead><tr><th>Card</th><th>Tag</th><th>Counted?</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  let noteHtml = holeCardNote
    ? `<p class="feedback__note">${holeCardNote}</p>`
    : '';

  container.innerHTML = `
    <div class="feedback ${cls}" role="status" aria-live="polite">
      <div class="feedback__header">
        <span class="feedback__icon" aria-label="${iconAria}">${icon}</span>
        <span>${iconAria}.</span>
      </div>
      <div class="feedback__answer">${answerText}</div>
      ${breakdownHtml}
      ${noteHtml}
    </div>
  `;
}

function clearFeedback(containerId) {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = '';
}

/* ── Mode selector ───────────────────────────────────── */
function renderModeSelector(currentMode, onSelect) {
  const container = document.getElementById('mode-selector');
  if (!container) return;

  const modes = [
    { id: 'card-drill',    label: 'Card Drill'    },
    { id: 'running-count', label: 'Running Count' },
    { id: 'table-flow',    label: 'Table Flow'    },
    { id: 'true-count',    label: 'True Count'    },
    { id: 'mixed',         label: 'Mixed'         }
  ];

  container.innerHTML = `
    <div class="mode-selector">
      <div class="mode-selector__label">Practice mode</div>
      <div class="mode-pills" role="radiogroup" aria-label="Practice mode">
        ${modes.map(m => `
          <input type="radio" class="mode-pill sr-only" name="practice-mode"
                 id="mode-${m.id}" value="${m.id}"
                 ${m.id === currentMode ? 'checked' : ''}>
          <label for="mode-${m.id}">${m.label}</label>
        `).join('')}
      </div>
    </div>
  `;

  container.querySelectorAll('.mode-pill').forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) onSelect(radio.value);
    });
  });
}

/* ── Config panel ────────────────────────────────────── */
function renderConfigPanel(config, onChange) {
  const container = document.getElementById('config-panel');
  if (!container) return;

  container.innerHTML = `
    <div class="config-panel">
      <div class="config-section-label">Session settings</div>

      <div class="config-row">
        <label class="config-label" for="cfg-decks">Decks</label>
        <select class="config-select" id="cfg-decks">
          ${[1,2,6,8].map(n => `<option value="${n}" ${config.numDecks===n?'selected':''}>${n}</option>`).join('')}
        </select>
      </div>

      <div class="config-row">
        <label class="config-label" for="cfg-spots">Player spots</label>
        <select class="config-select" id="cfg-spots">
          ${[1,2,3,4,5].map(n => `<option value="${n}" ${config.playerSpots===n?'selected':''}>${n}</option>`).join('')}
        </select>
      </div>

      <div class="config-row">
        <label class="config-label" for="cfg-pen">Penetration</label>
        <select class="config-select" id="cfg-pen">
          ${[0.50,0.65,0.75,0.85].map(p => `<option value="${p}" ${config.penetration===p?'selected':''}>${Math.round(p*100)}%</option>`).join('')}
        </select>
      </div>

      <div class="config-row">
        <label class="config-label" for="cfg-speed">Deal speed</label>
        <select class="config-select" id="cfg-speed">
          ${['slow','normal','fast','challenge'].map(s => `<option value="${s}" ${config.dealSpeed===s?'selected':''}>${_cap(s)}</option>`).join('')}
        </select>
      </div>

      <div class="divider"></div>
      <div class="config-section-label">Options</div>

      <label class="toggle-label">
        <input type="checkbox" id="cfg-hole" role="switch" ${config.dealerHoleCard ? 'checked' : ''}>
        Dealer hole card
      </label>

      <label class="toggle-label">
        <input type="checkbox" id="cfg-wheels" role="switch" ${config.trainingWheels ? 'checked' : ''}>
        Training wheels (show tags)
      </label>

      <label class="toggle-label">
        <input type="checkbox" id="cfg-sound" role="switch" ${config.soundEffects ? 'checked' : ''}>
        Sound effects
      </label>

      <label class="toggle-label">
        <input type="checkbox" id="cfg-motion" role="switch" ${config.reducedMotion ? 'checked' : ''}>
        Reduced motion
      </label>
    </div>
  `;

  // Wire change listeners
  const bind = (id, key, parse) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      const val = parse ? parse(el.value) : el.type === 'checkbox' ? el.checked : el.value;
      onChange(key, val);
    });
  };

  bind('cfg-decks',  'numDecks',       v => parseInt(v));
  bind('cfg-spots',  'playerSpots',    v => parseInt(v));
  bind('cfg-pen',    'penetration',    v => parseFloat(v));
  bind('cfg-speed',  'dealSpeed',      null);
  bind('cfg-hole',   'dealerHoleCard', null);
  bind('cfg-wheels', 'trainingWheels', null);
  bind('cfg-sound',  'soundEffects',   null);
  bind('cfg-motion', 'reducedMotion',  null);
}

/* ── Answer input ────────────────────────────────────── */
function renderAnswerInput(mode, onSubmit) {
  const container = document.getElementById('input-panel');
  if (!container) return;

  if (mode === 'card-drill') {
    container.innerHTML = `
      <div class="answer-input-area">
        <p class="answer-prompt">What is the Hi-Lo tag for this card?</p>
        <div class="tag-choices" role="group" aria-label="Choose Hi-Lo tag">
          <button class="tag-choice-btn" data-tag="-1" aria-label="Minus one">−1</button>
          <button class="tag-choice-btn" data-tag="0"  aria-label="Zero">0</button>
          <button class="tag-choice-btn" data-tag="+1" aria-label="Plus one">+1</button>
        </div>
      </div>
    `;

    container.querySelectorAll('.tag-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.tag-choice-btn').forEach(b => b.classList.remove('tag-choice-btn--selected'));
        btn.classList.add('tag-choice-btn--selected');
        onSubmit(parseInt(btn.dataset.tag));
      });
    });

  } else if (mode === 'true-count') {
    container.innerHTML = `
      <div class="answer-input-area">
        <p class="answer-prompt">What is the true count? (Running count ÷ decks remaining, rounded to nearest 0.5)</p>
        <div class="answer-input-group">
          <div class="answer-stepper">
            <button class="btn-stepper" id="tc-dec" aria-label="Decrease">−</button>
            <input type="number" class="answer-number" id="tc-input"
                   value="0" min="-20" max="20" step="0.5" inputmode="decimal" aria-label="True count estimate">
            <button class="btn-stepper" id="tc-inc" aria-label="Increase">+</button>
          </div>
          <button class="btn btn--primary" id="btn-submit-answer">Check</button>
        </div>
      </div>
    `;

    const input = document.getElementById('tc-input');
    document.getElementById('tc-dec').addEventListener('click', () => {
      input.value = (parseFloat(input.value) - 0.5).toString();
    });
    document.getElementById('tc-inc').addEventListener('click', () => {
      input.value = (parseFloat(input.value) + 0.5).toString();
    });
    document.getElementById('btn-submit-answer').addEventListener('click', () => {
      onSubmit(parseFloat(input.value));
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') onSubmit(parseFloat(input.value));
    });

  } else {
    // running-count, table-flow, mixed
    const prompt = mode === 'running-count'
      ? 'What is the running count after all dealt cards?'
      : 'What is the running count for all visible cards?';

    container.innerHTML = `
      <div class="answer-input-area">
        <p class="answer-prompt">${prompt}</p>
        <div class="answer-input-group">
          <div class="answer-stepper">
            <button class="btn-stepper" id="rc-dec" aria-label="Decrease">−</button>
            <input type="number" class="answer-number" id="rc-input"
                   value="0" min="-30" max="30" step="1" inputmode="numeric" aria-label="Running count">
            <button class="btn-stepper" id="rc-inc" aria-label="Increase">+</button>
          </div>
          <button class="btn btn--primary" id="btn-submit-answer">Check</button>
        </div>
      </div>
    `;

    const input = document.getElementById('rc-input');
    document.getElementById('rc-dec').addEventListener('click', () => {
      input.value = (parseInt(input.value) - 1).toString();
    });
    document.getElementById('rc-inc').addEventListener('click', () => {
      input.value = (parseInt(input.value) + 1).toString();
    });
    document.getElementById('btn-submit-answer').addEventListener('click', () => {
      onSubmit(parseInt(input.value));
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') onSubmit(parseInt(input.value));
    });
  }
}

function resetAnswerInput(mode) {
  if (mode === 'card-drill') {
    document.querySelectorAll('.tag-choice-btn').forEach(b => b.classList.remove('tag-choice-btn--selected'));
  } else if (mode === 'true-count') {
    const el = document.getElementById('tc-input');
    if (el) el.value = '0';
  } else {
    const el = document.getElementById('rc-input');
    if (el) el.value = '0';
  }
}

/* ── Progress Dashboard ──────────────────────────────── */
function renderStatGrid(progressData) {
  const container = document.getElementById('stat-grid');
  if (!container) return;

  const avgMs = progressData.totalResponseAttempts > 0
    ? Math.round(progressData.totalResponseTimeMs / progressData.totalResponseAttempts)
    : 0;

  const rcAcc = progressData.runningCountTotal > 0
    ? Math.round((progressData.runningCountCorrect / progressData.runningCountTotal) * 100)
    : 0;

  const tcAcc = progressData.trueCountTotal > 0
    ? Math.round((progressData.trueCountCorrect / progressData.trueCountTotal) * 100)
    : 0;

  const stats = [
    { value: progressData.totalCardsSeen,  label: 'Cards Seen'       },
    { value: progressData.roundsCompleted, label: 'Rounds Done'      },
    { value: `${rcAcc}%`,                  label: 'Count Accuracy'   },
    { value: `${tcAcc}%`,                  label: 'True Count Acc.'  },
    { value: progressData.longestStreak,   label: 'Best Streak'      },
    { value: avgMs > 0 ? `${(avgMs/1000).toFixed(1)}s` : '—', label: 'Avg Response' }
  ];

  container.innerHTML = stats.map(s => `
    <div class="stat-card">
      <span class="stat-card__value">${s.value}</span>
      <span class="stat-card__label">${s.label}</span>
    </div>
  `).join('');
}

function renderSkillMap(milestones) {
  const container = document.getElementById('skill-map');
  if (!container) return;

  container.innerHTML = `
    <div class="skill-map" role="list" aria-label="Skill milestones">
      ${milestones.map(m => `
        <div class="milestone ${m.achieved ? 'milestone--achieved' : ''}" role="listitem" title="${m.description}">
          <div class="milestone__dot" aria-hidden="true">${m.achieved ? '✓' : ''}</div>
          <div class="milestone__label">${m.label}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderAdaptiveSuggestions(suggestions) {
  const container = document.getElementById('adaptive-suggestions');
  if (!container) return;

  if (!suggestions || suggestions.length === 0) {
    container.innerHTML = `<p class="no-suggestions">Complete a few practice rounds to see personalised suggestions here.</p>`;
    return;
  }

  const icons = { rank: '🃏', mode: '🎯', speed: '⚡', encouragement: '✓' };

  container.innerHTML = `
    <div class="suggestions-list" aria-label="Practice suggestions">
      ${suggestions.map(s => `
        <div class="suggestion-item" role="article">
          <span class="suggestion-icon" aria-hidden="true">${icons[s.type] || '→'}</span>
          <span>${s.message}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderMistakeBreakdown(progressData) {
  const container = document.getElementById('mistake-breakdown');
  if (!container) return;

  const mistakes = progressData.commonMistakes || [];
  if (mistakes.length === 0) {
    container.innerHTML = `<p class="no-suggestions">No common mistakes tracked yet. Play a few rounds of Card Drill to populate this.</p>`;
    return;
  }

  container.innerHTML = `
    <table class="accuracy-table" aria-label="Most common mistakes">
      <thead>
        <tr>
          <th>Card rank</th>
          <th>Correct tag</th>
          <th>You entered</th>
          <th>Times</th>
        </tr>
      </thead>
      <tbody>
        ${mistakes.map(m => `
          <tr>
            <td>${RANK_DISPLAY[m.rank] || m.rank}</td>
            <td class="breakdown-tag--${tagClass(m.expectedTag)}">${tagLabel(m.expectedTag)}</td>
            <td>${tagLabel(m.userGuessed)}</td>
            <td>${m.count}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderAccuracyByRank(progressData) {
  const container = document.getElementById('accuracy-by-rank');
  if (!container) return;

  const entries = Object.entries(progressData.accuracyByRank)
    .map(([rank, r]) => ({
      rank,
      display:  RANK_DISPLAY[rank] || rank,
      tag:      HILO_TAGS[rank],
      pct:      r.total > 0 ? Math.round((r.correct / r.total) * 100) : null,
      total:    r.total
    }));

  container.innerHTML = `
    <table class="accuracy-table" aria-label="Accuracy by card rank">
      <thead>
        <tr><th>Rank</th><th>Tag</th><th>Accuracy</th><th>Attempts</th></tr>
      </thead>
      <tbody>
        ${entries.map(e => {
          const level = e.pct === null ? 'medium'
            : e.pct >= 85 ? 'good' : e.pct >= 65 ? 'medium' : 'poor';
          return `
            <tr>
              <td><strong>${e.display}</strong></td>
              <td class="breakdown-tag--${tagClass(e.tag)}">${tagLabel(e.tag)}</td>
              <td>
                <div class="accuracy-bar-wrap">
                  <div class="accuracy-bar">
                    <div class="accuracy-bar__fill accuracy-bar__fill--${level}" style="width:${e.pct ?? 50}%"></div>
                  </div>
                  <span class="accuracy-pct">${e.pct !== null ? `${e.pct}%` : '—'}</span>
                </div>
              </td>
              <td>${e.total}</td>
            </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;
}

function renderSessionHistory(sessions) {
  const container = document.getElementById('session-history');
  if (!container) return;

  const recent = [...sessions].reverse().slice(0, 20);

  if (recent.length === 0) {
    container.innerHTML = `<p class="no-suggestions">No sessions recorded yet.</p>`;
    return;
  }

  const modeNames = {
    'card-drill': 'Card Drill', 'running-count': 'Running Count',
    'table-flow': 'Table Flow', 'true-count': 'True Count', 'mixed': 'Mixed'
  };

  container.innerHTML = `
    <div class="table-scroll-wrap">
      <table class="session-history-table" aria-label="Session history">
        <thead>
          <tr>
            <th>Date</th>
            <th>Mode</th>
            <th>Rounds</th>
            <th>Accuracy</th>
            <th>Avg time</th>
          </tr>
        </thead>
        <tbody>
          ${recent.map(s => `
            <tr>
              <td>${_formatDate(s.date)}</td>
              <td>${modeNames[s.mode] || s.mode || '—'}</td>
              <td>${s.roundsCompleted || 0}</td>
              <td>${s.accuracy != null ? Math.round(s.accuracy * 100) + '%' : '—'}</td>
              <td>${s.avgResponseMs ? (s.avgResponseMs/1000).toFixed(1) + 's' : '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* ── Shuffle prompt ──────────────────────────────────── */
function showShufflePrompt() {
  const existing = document.getElementById('shuffle-prompt');
  if (existing) return;

  const stage = document.getElementById('card-stage');
  if (!stage) return;

  const prompt = document.createElement('div');
  prompt.id = 'shuffle-prompt';
  prompt.className = 'shuffle-prompt';
  prompt.setAttribute('role', 'alert');
  prompt.innerHTML = `
    <span>🂠</span>
    <span>Shuffle point reached. Complete this round, then start a new shoe.</span>
  `;
  stage.parentElement.insertBefore(prompt, stage);
}

function hideShufflePrompt() {
  const el = document.getElementById('shuffle-prompt');
  if (el) el.remove();
}

/* ── Helpers ─────────────────────────────────────────── */
function _cap(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function _formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}
