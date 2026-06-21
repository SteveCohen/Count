'use strict';

// Fictional pattern meter factors — static hardcoded values.
// These are NOT connected to real practice session data. They exist
// solely to illustrate the concept of pattern correlation in a
// teaching context. Values are deliberately arbitrary.
const FICTIONAL_METER_FACTORS = [
  {
    label: 'Bet variation alignment',
    value: 68,
    explanation: 'Simulated wager size increased during positive-count periods across multiple fictional shoes.'
  },
  {
    label: 'Entry and exit timing',
    value: 44,
    explanation: 'Simulated table joins occurred near the same shoe depth in several consecutive examples.'
  },
  {
    label: 'Decision pattern correlation',
    value: 55,
    explanation: 'Simulated play decisions shifted in ways that correlate with shoe composition changes.'
  },
  {
    label: 'Session frequency pattern',
    value: 32,
    explanation: 'This fictional player visited at intervals that correlate with shoe depth preferences.'
  },
  {
    label: 'Multi-shoe consistency',
    value: 60,
    explanation: 'The pattern persisted across multiple fictional shoes, which increases overall signal strength.'
  }
];

const CASINO_SECTIONS = [
  {
    heading: 'How casinos may analyse play patterns',
    body: `Casinos employ a range of methods to monitor play at their tables. These include physical observation by pit staff, player tracking through loyalty programmes, and review of surveillance footage. Modern casino operations may also use software tools to analyse patterns in session data.

Casinos do not need to know which counting system a person uses. They may instead assess whether decisions or wager patterns consistently correlate with the state of the shoe — for example, whether bet sizes reliably increase when the count is positive and decrease when it is negative.

This section explains the general categories of signals that casinos may observe. It is provided for educational context only.`
  },
  {
    heading: 'Common patterns that attract attention',
    items: [
      'Large or sudden wager changes that repeatedly coincide with favourable shoe conditions.',
      'Wager reductions that consistently coincide with unfavourable shoe conditions.',
      'Entering or leaving tables in a pattern linked to shoe depth or the position of the cut card.',
      'Play decisions that consistently shift in ways correlated with shoe composition.',
      'Unusual device use, note-taking, apparent communication with others, or coordinated play.',
      'Behaviour patterns that persist across multiple sessions or multiple visits.'
    ]
  },
  {
    heading: 'What casinos may do in response',
    body: `Casinos are private businesses and may take a range of responses to players they identify as counting cards. In most jurisdictions, card counting without a mechanical or electronic device is legal, but casinos generally retain the right to refuse service, limit wagers, or ask players to leave.

Common responses include requesting that a player flat-bet (wager a fixed amount), changing the shuffle point, shuffling more frequently, or restricting access to the table. In some cases, a player's image may be shared with other casino properties.

These responses vary significantly by jurisdiction, casino policy, and individual circumstance. Nothing in this section constitutes legal advice.`
  },
  {
    heading: 'Jurisdiction and legal status',
    body: `Card counting using only one\'s own mental faculties — without any device, software, or assistance from others — is legal in most jurisdictions. Casinos are not obligated to allow a player to continue playing, however.

Laws and casino regulations vary by country, state or province, and individual property. If you have questions about your rights in a specific location, consult a legal professional familiar with local gambling regulations.`
  }
];

function initCasinoAwareness() {
  _renderDisclaimer();
  _renderContent();
  _renderPatternMeterSection();
  _initPatternMeterToggle();
}

function _renderDisclaimer() {
  const banner = document.querySelector('#panel-casino .disclaimer-banner');
  if (!banner) return;
  banner.innerHTML = `
    <strong>Educational content only.</strong> This section provides factual information about casino operations and general industry practices. It does not advise on evading detection, concealing counting activity, bypassing casino rules, or using devices or coordination. Card counting with one's own memory is legal in most jurisdictions, but casinos may restrict or refuse service at their discretion.
  `;
}

function _renderContent() {
  const container = document.getElementById('casino-content');
  if (!container) return;

  const html = CASINO_SECTIONS.map(section => {
    let content = '';
    if (section.body) {
      content = section.body.split('\n\n').map(p => `<p>${p}</p>`).join('');
    }
    if (section.items) {
      content = `<ul class="casino-list">${section.items.map(item => `<li>${item}</li>`).join('')}</ul>`;
    }
    return `
      <section class="casino-section">
        <h3>${section.heading}</h3>
        ${content}
      </section>
    `;
  }).join('');

  container.innerHTML = html;
}

function _renderPatternMeterSection() {
  const section = document.getElementById('pattern-meter-section');
  if (!section) return;

  section.innerHTML = `
    <div class="config-group" style="margin-top: var(--space-8); padding-top: var(--space-6); border-top: 1px solid var(--color-surface-2);">
      <h3 style="margin-bottom: var(--space-4);">Fictional pattern-analysis illustration</h3>
      <label class="toggle-label" for="pattern-meter-toggle">
        <input type="checkbox" id="pattern-meter-toggle" role="switch" aria-describedby="meter-desc">
        Show illustrative pattern-analysis meter
      </label>
      <p id="meter-desc" class="config-note">Default: off. This is a fictional educational visualisation — not a model of real casino surveillance.</p>
    </div>
    <div id="pattern-meter" hidden aria-label="Fictional pattern analysis meter (educational only)">
      <div class="disclaimer-banner" style="margin-top: var(--space-4);">
        <strong>Fictional teaching visualisation.</strong> This meter is not connected to your practice data and does not model any real casino surveillance system. Values are static examples chosen for illustration purposes only. This does not show how to lower the meter.
      </div>
      <div class="meter-factors" role="list">
        ${FICTIONAL_METER_FACTORS.map(f => `
          <div class="meter-factor" role="listitem">
            <div class="meter-factor__header">
              <span class="meter-factor__label">${f.label}</span>
              <span class="meter-factor__value">${f.value}%</span>
            </div>
            <div class="meter-factor__bar" role="img" aria-label="${f.label}: ${f.value} out of 100">
              <div class="meter-factor__fill" style="width: ${f.value}%"
                   data-level="${f.value >= 66 ? 'high' : f.value >= 33 ? 'medium' : 'low'}">
              </div>
            </div>
            <p class="meter-factor__explanation">${f.explanation}</p>
          </div>
        `).join('')}
      </div>
      <p class="meter-legend">
        <span class="meter-legend__item meter-legend__item--low">Low correlation</span>
        <span class="meter-legend__item meter-legend__item--medium">Moderate</span>
        <span class="meter-legend__item meter-legend__item--high">High correlation</span>
      </p>
    </div>
  `;
}

function _initPatternMeterToggle() {
  const toggle = document.getElementById('pattern-meter-toggle');
  const meter  = document.getElementById('pattern-meter');
  if (!toggle || !meter) return;

  // Restore saved preference
  const prefs = loadPrefs();
  if (prefs.patternMeterEnabled) {
    toggle.checked = true;
    meter.hidden = false;
  }

  toggle.addEventListener('change', () => {
    meter.hidden = !toggle.checked;
    const prefs = loadPrefs();
    prefs.patternMeterEnabled = toggle.checked;
    savePrefs(prefs);
  });
}
