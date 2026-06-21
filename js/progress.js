'use strict';

const LS_KEYS = {
  SESSION_CONFIG:  'cl_session_config',
  PROGRESS:        'cl_progress',
  SESSION_HISTORY: 'cl_session_history',
  PREFS:           'cl_prefs',
  ONBOARDED:       'cl_onboarded'
};

const DEFAULT_PROGRESS = {
  version: 1,
  totalCardsSeen: 0,
  roundsCompleted: 0,
  runningCountCorrect: 0,
  runningCountTotal: 0,
  trueCountCorrect: 0,
  trueCountTotal: 0,
  cardDrillCorrect: 0,
  cardDrillTotal: 0,
  totalResponseTimeMs: 0,
  totalResponseAttempts: 0,
  longestStreak: 0,
  currentStreak: 0,
  accuracyByRank: {
    '2':{correct:0,total:0},'3':{correct:0,total:0},'4':{correct:0,total:0},
    '5':{correct:0,total:0},'6':{correct:0,total:0},'7':{correct:0,total:0},
    '8':{correct:0,total:0},'9':{correct:0,total:0},'T':{correct:0,total:0},
    'J':{correct:0,total:0},'Q':{correct:0,total:0},'K':{correct:0,total:0},
    'A':{correct:0,total:0}
  },
  accuracyByMode: {
    'card-drill':    {correct:0,total:0},
    'running-count': {correct:0,total:0},
    'table-flow':    {correct:0,total:0},
    'true-count':    {correct:0,total:0},
    'mixed':         {correct:0,total:0}
  },
  accuracyBySpeed: {
    'slow':      {correct:0,total:0},
    'normal':    {correct:0,total:0},
    'fast':      {correct:0,total:0},
    'challenge': {correct:0,total:0}
  },
  commonMistakes: [],
  milestonesAchieved: [],
  lastSessionAt: null
};

function _deepDefaults() {
  return {
    ...DEFAULT_PROGRESS,
    accuracyByRank:  JSON.parse(JSON.stringify(DEFAULT_PROGRESS.accuracyByRank)),
    accuracyByMode:  JSON.parse(JSON.stringify(DEFAULT_PROGRESS.accuracyByMode)),
    accuracyBySpeed: JSON.parse(JSON.stringify(DEFAULT_PROGRESS.accuracyBySpeed)),
    commonMistakes: [],
    milestonesAchieved: []
  };
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(LS_KEYS.PROGRESS);
    if (!raw) return _deepDefaults();
    const data = JSON.parse(raw);
    const base = _deepDefaults();
    // Deep merge to handle new fields added in future versions
    return {
      ...base,
      ...data,
      accuracyByRank:  { ...base.accuracyByRank,  ...(data.accuracyByRank  || {}) },
      accuracyByMode:  { ...base.accuracyByMode,  ...(data.accuracyByMode  || {}) },
      accuracyBySpeed: { ...base.accuracyBySpeed, ...(data.accuracyBySpeed || {}) }
    };
  } catch (e) {
    console.warn('Progress data corrupted, resetting:', e);
    return _deepDefaults();
  }
}

function saveProgress(data) {
  try {
    localStorage.setItem(LS_KEYS.PROGRESS, JSON.stringify(data));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      const history = loadSessionHistory();
      if (history.length > 10) {
        saveSessionHistory(history.slice(-10));
        try {
          localStorage.setItem(LS_KEYS.PROGRESS, JSON.stringify(data));
        } catch (e2) {
          console.warn('Could not save progress — storage full:', e2);
        }
      }
    }
  }
}

function loadSessionHistory() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEYS.SESSION_HISTORY) || '[]');
  } catch { return []; }
}

function saveSessionHistory(history) {
  try {
    localStorage.setItem(LS_KEYS.SESSION_HISTORY, JSON.stringify(history));
  } catch {}
}

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEYS.PREFS) || '{}');
  } catch { return {}; }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(LS_KEYS.PREFS, JSON.stringify(prefs));
  } catch {}
}

function loadSessionConfig() {
  const defaults = {
    mode: 'card-drill',
    numDecks: 6,
    playerSpots: 2,
    dealerHoleCard: true,
    penetration: 0.75,
    dealSpeed: 'normal',
    trainingWheels: false,
    soundEffects: true,
    reducedMotion: false
  };
  try {
    const stored = JSON.parse(localStorage.getItem(LS_KEYS.SESSION_CONFIG) || '{}');
    return { ...defaults, ...stored };
  } catch { return defaults; }
}

function saveSessionConfig(config) {
  try {
    localStorage.setItem(LS_KEYS.SESSION_CONFIG, JSON.stringify(config));
  } catch {}
}

function recordAnswer(feedbackResult, config) {
  const data = loadProgress();
  const { correct, mode, responseTimeMs, breakdown } = feedbackResult;
  const speed = config ? config.dealSpeed : 'normal';

  if (responseTimeMs > 0) {
    data.totalResponseTimeMs += responseTimeMs;
    data.totalResponseAttempts++;
  }

  if (correct) {
    data.currentStreak++;
    if (data.currentStreak > data.longestStreak) {
      data.longestStreak = data.currentStreak;
    }
  } else {
    data.currentStreak = 0;
  }

  if (data.accuracyByMode[mode]) {
    data.accuracyByMode[mode].total++;
    if (correct) data.accuracyByMode[mode].correct++;
  }

  if (speed && data.accuracyBySpeed[speed]) {
    data.accuracyBySpeed[speed].total++;
    if (correct) data.accuracyBySpeed[speed].correct++;
  }

  if (mode === 'running-count' || mode === 'table-flow') {
    data.runningCountTotal++;
    if (correct) data.runningCountCorrect++;
  }
  if (mode === 'true-count') {
    data.trueCountTotal++;
    if (correct) data.trueCountCorrect++;
  }
  if (mode === 'card-drill') {
    data.cardDrillTotal++;
    if (correct) data.cardDrillCorrect++;
  }

  if (breakdown && Array.isArray(breakdown)) {
    for (const item of breakdown) {
      if (item.rank && item.isVisible !== false) {
        if (mode !== 'card-drill') data.totalCardsSeen++;
        if (mode === 'card-drill' && data.accuracyByRank[item.rank]) {
          data.accuracyByRank[item.rank].total++;
          if (correct) data.accuracyByRank[item.rank].correct++;
        }
      }
    }
    if (mode === 'card-drill' && breakdown.length > 0) {
      data.totalCardsSeen++;
    }
  }

  if (mode === 'card-drill' && !correct && breakdown && breakdown[0]) {
    _recordMistake(data, breakdown[0].rank, breakdown[0].hiLoTag, feedbackResult.userAnswer);
  }

  _checkMilestones(data);
  data.lastSessionAt = new Date().toISOString();
  saveProgress(data);
  return data;
}

function _recordMistake(data, rank, expectedTag, userGuessed) {
  const key = `${rank}:${userGuessed}`;
  const existing = data.commonMistakes.find(m => m.rank === rank && m.userGuessed === userGuessed);
  if (existing) {
    existing.count++;
  } else {
    data.commonMistakes.push({ rank, expectedTag, userGuessed, count: 1 });
  }
  data.commonMistakes.sort((a, b) => b.count - a.count);
  if (data.commonMistakes.length > 5) data.commonMistakes.length = 5;
}

function recordRoundComplete() {
  const data = loadProgress();
  data.roundsCompleted++;
  _checkMilestones(data);
  saveProgress(data);
}

function endSession(summary) {
  const history = loadSessionHistory();
  history.push({ date: new Date().toISOString(), ...summary });
  if (history.length > 50) history.splice(0, history.length - 50);
  saveSessionHistory(history);
}

const MILESTONES = [
  {
    id: 'first-round',
    label: 'First Round Complete',
    description: 'Complete your first practice round.',
    check: p => p.roundsCompleted >= 1
  },
  {
    id: '100-cards',
    label: '100 Cards Seen',
    description: 'Track the Hi-Lo tag for 100 cards.',
    check: p => p.totalCardsSeen >= 100
  },
  {
    id: 'streak-10',
    label: '10 Correct in a Row',
    description: 'Achieve a streak of 10 correct answers without a miss.',
    check: p => p.longestStreak >= 10
  },
  {
    id: 'rc-accuracy-80',
    label: 'Running Count 80%',
    description: 'Achieve 80% accuracy on running count drills (min 20 attempts).',
    check: p => p.runningCountTotal >= 20 && (p.runningCountCorrect / p.runningCountTotal) >= 0.80
  },
  {
    id: 'tc-accuracy-75',
    label: 'True Count Estimator',
    description: 'Achieve 75% accuracy on true count estimation (min 10 attempts).',
    check: p => p.trueCountTotal >= 10 && (p.trueCountCorrect / p.trueCountTotal) >= 0.75
  },
  {
    id: 'all-ranks',
    label: 'All Ranks Mastered',
    description: 'Achieve 90% accuracy on every rank (min 5 attempts per rank).',
    check: p => Object.values(p.accuracyByRank).every(r => r.total >= 5 && (r.correct / r.total) >= 0.90)
  }
];

function _checkMilestones(data) {
  for (const m of MILESTONES) {
    if (!data.milestonesAchieved.includes(m.id) && m.check(data)) {
      data.milestonesAchieved.push(m.id);
    }
  }
}

function getMilestoneStatus(progressData) {
  return MILESTONES.map(m => ({
    ...m,
    achieved: progressData.milestonesAchieved.includes(m.id)
  }));
}

function getAdaptiveSuggestions(progressData) {
  const suggestions = [];

  const rankEntries = Object.entries(progressData.accuracyByRank)
    .filter(([, r]) => r.total >= 5)
    .map(([rank, r]) => ({ rank, accuracy: r.correct / r.total }))
    .sort((a, b) => a.accuracy - b.accuracy);

  if (rankEntries.length > 0 && rankEntries[0].accuracy < 0.85) {
    const worst = rankEntries[0];
    const tag = HILO_TAGS[worst.rank];
    const tagStr = tag > 0 ? '+1 (low card)' : tag < 0 ? '−1 (high card)' : '0 (neutral)';
    suggestions.push({
      type: 'rank',
      rank: worst.rank,
      message: `${worst.rank} cards are your weakest rank at ${Math.round(worst.accuracy * 100)}% accuracy. Remember: ${worst.rank} = ${tagStr}. Try Card Drill to focus on individual card recognition.`
    });
  }

  const modeNames = {
    'card-drill':    'Card Drill',
    'running-count': 'Running Count Drill',
    'table-flow':    'Table Flow Drill',
    'true-count':    'True Count Estimation'
  };
  const modeEntries = Object.entries(progressData.accuracyByMode)
    .filter(([mode, r]) => r.total >= 5 && mode !== 'mixed')
    .map(([mode, r]) => ({ mode, accuracy: r.correct / r.total }))
    .sort((a, b) => a.accuracy - b.accuracy);

  if (modeEntries.length > 0 && modeEntries[0].accuracy < 0.75) {
    const worst = modeEntries[0];
    suggestions.push({
      type: 'mode',
      mode: worst.mode,
      message: `${modeNames[worst.mode] || worst.mode} accuracy is ${Math.round(worst.accuracy * 100)}%. Switch to that mode and try a slower deal speed to rebuild accuracy.`
    });
  }

  const normalAcc = progressData.accuracyBySpeed.normal;
  const fastAcc = progressData.accuracyBySpeed.fast;
  if (normalAcc.total >= 5 && fastAcc.total >= 5) {
    const normalPct = normalAcc.correct / normalAcc.total;
    const fastPct   = fastAcc.correct   / fastAcc.total;
    if (normalPct - fastPct > 0.20) {
      suggestions.push({
        type: 'speed',
        message: `Accuracy drops ${Math.round((normalPct - fastPct) * 100)} percentage points at fast speed vs normal. Consolidate at normal speed before pushing faster.`
      });
    }
  }

  if (suggestions.length === 0 && progressData.totalCardsSeen > 50) {
    suggestions.push({
      type: 'encouragement',
      message: 'Your accuracy across tracked areas looks solid. Try Mixed Challenge or increase deal speed to keep pushing your skills.'
    });
  }

  return suggestions;
}

function resetProgress() {
  Object.values(LS_KEYS).forEach(key => {
    try { localStorage.removeItem(key); } catch {}
  });
}

function exportProgressJSON() {
  return JSON.stringify({
    progress: loadProgress(),
    sessionHistory: loadSessionHistory(),
    exportedAt: new Date().toISOString()
  }, null, 2);
}
