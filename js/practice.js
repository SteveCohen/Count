'use strict';

const DEAL_DELAYS = {
  slow:      900,
  normal:    450,
  fast:      160,
  challenge:  60
};

class PracticeSession {
  constructor(config) {
    this.config            = { ...config };
    this.shoe              = null;
    this.runningCount      = 0;
    this.roundCards        = [];
    this.holeCard          = null;
    this.currentCard       = null;
    this.tcScenario        = null;
    this.timerStart        = null;
    this.waitingForAnswer  = false;
    this.dealing           = false;
    this.paused            = false;
    this.dealId            = 0;
    this.currentSubMode    = null;
    this.sessionStartTime  = Date.now();
    this.roundsThisSession = 0;
    this.correctCount      = 0;
    this.totalCount        = 0;
    this._lastMilestoneCount = 0;
  }

  get effectiveMode() {
    return this.currentSubMode || this.config.mode;
  }

  updateConfig(key, value) {
    this.config[key] = value;
    saveSessionConfig(this.config);
  }

  // ── Shoe management ───────────────────────────────────────
  newShoe() {
    this.dealId++;
    this.dealing          = false;
    this.shoe             = new Shoe(this.config.numDecks, this.config.penetration);
    this.runningCount     = 0;
    this.roundCards       = [];
    this.holeCard         = null;
    this.currentCard      = null;
    this.tcScenario       = null;
    this.waitingForAnswer = false;
    this.currentSubMode   = null;

    hideShufflePrompt();
    clearFeedback('feedback-panel');
    updateShoeIndicator(this.shoe);
    this.startCurrentMode();
  }

  resetRound() {
    this.dealId++;
    this.dealing          = false;
    this.waitingForAnswer = false;

    for (const card of this.roundCards) {
      this.shoe.discard(card);
    }
    this.roundCards   = [];
    this.holeCard     = null;
    this.currentCard  = null;

    clearFeedback('feedback-panel');
    initCardStage(this.effectiveMode, this.config.playerSpots);
    updateShoeIndicator(this.shoe);

    const currentDealId = this.dealId;
    setTimeout(() => {
      if (this.dealId === currentDealId && !this.paused) {
        this.startCurrentMode();
      }
    }, 300);
  }

  // ── Mode dispatch ─────────────────────────────────────────
  startCurrentMode() {
    const mode = this.config.mode;
    if (mode === 'card-drill')    return this._startCardDrill();
    if (mode === 'running-count') return this._startRunningCountDrill();
    if (mode === 'table-flow')    return this._startTableFlowDrill();
    if (mode === 'true-count')    return this._startTrueCountDrill();
    if (mode === 'mixed')         return this._startMixedChallenge();
  }

  // ── Card Drill ────────────────────────────────────────────
  async _startCardDrill() {
    this.currentSubMode = 'card-drill';
    const dealId = this.dealId;
    this.roundCards = [];
    this.holeCard   = null;

    initCardStage('card-drill', this.config.playerSpots);
    clearFeedback('feedback-panel');
    resetAnswerInput('card-drill');

    if (!this._hasCards()) { showShufflePrompt(); return; }

    await this._sleep(Math.round(DEAL_DELAYS[this.config.dealSpeed] * 0.5), dealId);
    if (!this._isActiveDeal(dealId)) return;

    const card = this.shoe.deal('card-drill', true);
    if (!card) { showShufflePrompt(); return; }

    this.currentCard = card;
    this.roundCards  = [card];
    addCardToStage(card, 'card-drill', this.config);
    announceCard(card);
    playSound('deal', this.config);
    updateShoeIndicator(this.shoe);

    this.timerStart       = Date.now();
    this.waitingForAnswer = true;
  }

  // ── Running Count Drill ───────────────────────────────────
  async _startRunningCountDrill() {
    this.currentSubMode = 'running-count';
    const dealId   = this.dealId;
    const numCards = Math.floor(Math.random() * 4) + 5; // 5–8 cards per sequence

    this.roundCards = [];
    this.holeCard   = null;

    initCardStage('running-count', this.config.playerSpots);
    clearFeedback('feedback-panel');
    resetAnswerInput('running-count');

    const delay = DEAL_DELAYS[this.config.dealSpeed];

    for (let i = 0; i < numCards; i++) {
      if (!this._isActiveDeal(dealId)) return;
      if (!this._hasCards()) break;

      await this._sleep(delay, dealId);
      if (!this._isActiveDeal(dealId)) return;

      const card = this.shoe.deal('sequence', true);
      if (!card) break;

      this.roundCards.push(card);
      this.runningCount += card.hiLoTag;
      addCardToStage(card, 'sequence', this.config);
      announceCard(card);
      playSound('deal', this.config);
    }

    if (!this._isActiveDeal(dealId)) return;
    updateShoeIndicator(this.shoe);
    if (this.shoe.penetrationReached) showShufflePrompt();

    this.timerStart       = Date.now();
    this.waitingForAnswer = true;
  }

  // ── Table Flow Drill ──────────────────────────────────────
  async _startTableFlowDrill() {
    this.currentSubMode = 'table-flow';
    const dealId = this.dealId;
    const { playerSpots, dealerHoleCard } = this.config;
    const delay = DEAL_DELAYS[this.config.dealSpeed];

    this.roundCards = [];
    this.holeCard   = null;

    initCardStage('table-flow', playerSpots);
    clearFeedback('feedback-panel');
    resetAnswerInput('table-flow');

    const dealCard = async (location, visible) => {
      if (!this._isActiveDeal(dealId)) return false;
      if (!this._hasCards()) return false;

      await this._sleep(delay, dealId);
      if (!this._isActiveDeal(dealId)) return false;

      const card = this.shoe.deal(location, visible);
      if (!card) return false;

      if (!visible) {
        this.holeCard = card;
        // Hidden cards don't update running count until revealed
      } else {
        this.runningCount += card.hiLoTag;
      }
      this.roundCards.push(card);
      addCardToStage(card, location, this.config);
      announceCard(card);
      playSound('deal', this.config);
      return true;
    };

    // Standard deal order
    for (let p = 1; p <= playerSpots; p++) {
      if (!(await dealCard(`player-${p}`, true))) return;
    }
    if (!(await dealCard('dealer', true))) return;
    for (let p = 1; p <= playerSpots; p++) {
      if (!(await dealCard(`player-${p}`, true))) return;
    }
    if (dealerHoleCard) {
      await dealCard('dealer', false);
    }

    if (!this._isActiveDeal(dealId)) return;
    updateShoeIndicator(this.shoe);
    if (this.shoe.penetrationReached) showShufflePrompt();

    this.timerStart       = Date.now();
    this.waitingForAnswer = true;
  }

  // ── True Count Drill ──────────────────────────────────────
  _startTrueCountDrill() {
    this.currentSubMode = 'true-count';
    this.roundCards = [];
    this.holeCard   = null;

    initCardStage('true-count', this.config.playerSpots);
    clearFeedback('feedback-panel');
    resetAnswerInput('true-count');

    this.tcScenario = this._generateTCScenario();
    renderTrueCountScenario(this.tcScenario);
    updateShoeIndicator(this.shoe);

    this.timerStart       = Date.now();
    this.waitingForAnswer = true;
  }

  _generateTCScenario() {
    const maxDecks = this.config.numDecks;
    const pool = [0.5, 1, 1.5, 2, 3, 4].filter(d => d <= maxDecks);
    const decksRemaining = pool[Math.floor(Math.random() * pool.length)];
    const maxRC = Math.round(maxDecks * 1.8);
    const rc    = Math.round((Math.random() * 2 - 1) * maxRC);
    return {
      runningCount:   rc,
      decksRemaining,
      correctTC:      calculateTrueCount(rc, decksRemaining)
    };
  }

  // ── Mixed Challenge ───────────────────────────────────────
  _startMixedChallenge() {
    const progress  = loadProgress();
    const subMode   = this._pickMixedSubMode(progress);
    const savedMode = this.config.mode;
    this.config.mode = subMode;
    this.startCurrentMode();
    this.config.mode = savedMode; // Restore
  }

  _pickMixedSubMode(progressData) {
    const modes = ['card-drill', 'running-count', 'table-flow', 'true-count'];
    const weights = modes.map(m => {
      const r = progressData.accuracyByMode[m];
      const acc = (r && r.total >= 3) ? r.correct / r.total : 0.5;
      return Math.max(0.1, 1.1 - acc); // Lower accuracy = higher weight
    });
    const total = weights.reduce((s, w) => s + w, 0);
    let rand = Math.random() * total;
    for (let i = 0; i < modes.length; i++) {
      rand -= weights[i];
      if (rand <= 0) return modes[i];
    }
    return modes[0];
  }

  // ── Answer checking ───────────────────────────────────────
  checkAnswer(userInput) {
    if (!this.waitingForAnswer) return null;

    const mode          = this.currentSubMode || this.config.mode;
    const responseTimeMs = this.timerStart ? Date.now() - this.timerStart : 0;
    this.timerStart       = null;
    this.waitingForAnswer = false;

    let correct, correctAnswer, breakdown;

    if (mode === 'card-drill') {
      correctAnswer = this.currentCard ? this.currentCard.hiLoTag : 0;
      correct       = parseInt(userInput) === correctAnswer;
      breakdown     = this.currentCard ? [{ ...this.currentCard }] : [];

    } else if (mode === 'true-count') {
      correctAnswer = this.tcScenario ? this.tcScenario.correctTC : 0;
      correct       = Math.abs(parseFloat(userInput) - correctAnswer) <= 0.5;
      breakdown     = [];

    } else {
      correctAnswer = this.runningCount;
      correct       = parseInt(userInput) === correctAnswer;
      breakdown     = this.roundCards.map(c => ({ ...c }));
    }

    const holeCardNote = (this.holeCard && !this.holeCard.isVisible)
      ? 'The dealer hole card is face-down. It is not included in the running count until revealed.'
      : null;

    return {
      correct,
      userAnswer:    mode === 'true-count' ? parseFloat(userInput) : parseInt(userInput),
      correctAnswer,
      breakdown,
      holeCardNote,
      responseTimeMs,
      mode
    };
  }

  handleAnswer(userInput) {
    const result = this.checkAnswer(userInput);
    if (!result) return null;

    const updatedProgress = recordAnswer(result, this.config);

    renderFeedback(result, 'feedback-panel');
    playSound(result.correct ? 'correct' : 'incorrect', this.config);

    // Detect newly achieved milestones
    const newCount = (updatedProgress.milestonesAchieved || []).length;
    if (newCount > this._lastMilestoneCount) {
      this._lastMilestoneCount = newCount;
      setTimeout(() => playSound('milestone', this.config), 450);
    }

    this.roundsThisSession++;
    this.totalCount++;
    if (result.correct) this.correctCount++;

    recordRoundComplete();
    updateShoeIndicator(this.shoe);

    return result;
  }

  // ── Reveal hole card ──────────────────────────────────────
  revealHoleCard() {
    if (!this.holeCard || this.holeCard.isVisible) return;
    this.holeCard.isVisible = true;
    this.runningCount += this.holeCard.hiLoTag;
    flipCard(this.holeCard.id, this.holeCard, this.config.trainingWheels);
    announceCard(this.holeCard);
    const display = RANK_DISPLAY[this.holeCard.rank] || this.holeCard.rank;
    const suit    = SUIT_NAMES[this.holeCard.suit]   || this.holeCard.suit;
    announce(`Hole card revealed: ${display} of ${suit}. Running count is now ${this.runningCount >= 0 ? '+' : ''}${this.runningCount}.`);
  }

  // ── Advance to next drill ─────────────────────────────────
  advanceDrill() {
    clearFeedback('feedback-panel');
    const advId = this.dealId;

    if (!this._hasCards(8) || this.shoe.penetrationReached) {
      showShufflePrompt();
      return;
    }

    setTimeout(() => {
      if (this.dealId !== advId || this.paused) return;
      const mode = this.config.mode;
      if (mode === 'card-drill')    this._startCardDrill();
      else if (mode === 'running-count') this._startRunningCountDrill();
      else if (mode === 'table-flow')    this._startTableFlowDrill();
      else if (mode === 'true-count')    this._startTrueCountDrill();
      else if (mode === 'mixed')         this._startMixedChallenge();
    }, 500);
  }

  // ── Session summary ───────────────────────────────────────
  getSessionSummary() {
    return {
      mode:            this.config.mode,
      config:          { ...this.config },
      roundsCompleted: this.roundsThisSession,
      accuracy:        this.totalCount > 0 ? this.correctCount / this.totalCount : null,
      avgResponseMs:   null
    };
  }

  // ── Internal helpers ──────────────────────────────────────
  _sleep(ms, dealId) {
    return new Promise(resolve => {
      const wait = () => {
        if (this.dealId !== dealId) { resolve(); return; }
        if (this.paused) { setTimeout(wait, 80); return; }
        resolve();
      };
      setTimeout(wait, ms);
    });
  }

  _isActiveDeal(dealId) {
    return this.dealId === dealId;
  }

  _hasCards(min = 1) {
    return this.shoe && this.shoe.remainingCards >= min;
  }
}
