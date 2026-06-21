'use strict';

const HILO_TAGS = {
  '2': +1, '3': +1, '4': +1, '5': +1, '6': +1,
  '7':  0, '8':  0, '9':  0,
  'T': -1, 'J': -1, 'Q': -1, 'K': -1, 'A': -1
};

function getHiLoTag(rank) {
  return HILO_TAGS[rank] !== undefined ? HILO_TAGS[rank] : 0;
}

function updateRunningCount(currentRC, card) {
  if (!card || !card.isVisible) return currentRC;
  return currentRC + card.hiLoTag;
}

function calculateTrueCount(runningCount, decksRemaining) {
  if (decksRemaining < 0.5) return runningCount;
  const raw = runningCount / decksRemaining;
  return Math.round(raw * 2) / 2;
}

function describeDeck(shoe) {
  const remaining = shoe.cards.filter(c => !c.isCutCard);
  const total = remaining.length;
  if (total === 0) return { lowPct: 38.5, neutralPct: 23.1, highPct: 38.5 };
  let low = 0, neutral = 0, high = 0;
  for (const card of remaining) {
    if (card.hiLoTag === +1) low++;
    else if (card.hiLoTag === -1) high++;
    else neutral++;
  }
  return {
    lowPct:     (low     / total) * 100,
    neutralPct: (neutral / total) * 100,
    highPct:    (high    / total) * 100
  };
}

function tagLabel(tag) {
  if (tag > 0) return '+1';
  if (tag < 0) return '−1';
  return '0';
}

function tagLabelSimple(tag) {
  if (tag > 0) return '+1';
  if (tag < 0) return '-1';
  return '0';
}

function formatTrueCount(tc) {
  const sign = tc > 0 ? '+' : '';
  return `TC ${sign}${tc}`;
}

function getCountLabel(rc) {
  if (rc > 0) return 'positive';
  if (rc < 0) return 'negative';
  return 'neutral';
}

function tagClass(tag) {
  if (tag > 0) return 'plus';
  if (tag < 0) return 'minus';
  return 'zero';
}

const HILO_EXPLAINER = {
  system: 'Hi-Lo',
  balanced: true,
  level: 1,
  runningCountDef: 'The cumulative sum of Hi-Lo tags for every card you have seen exposed from the current shoe.',
  trueCountDef: 'The running count divided by the estimated number of decks remaining. This normalises the count across different shoe sizes.',
  balancedDef: 'A balanced counting system returns to zero when every card in a complete shoe has been seen. Hi-Lo is balanced: twenty +1 cards, twelve 0 cards, and twenty −1 cards sum to exactly zero per deck.',
  penetrationDef: 'The proportion of cards dealt before reshuffling. 75% penetration means roughly three-quarters of the shoe is dealt before a new shoe begins.',
  whyValues: [
    'Hi-Lo compresses a complex statistical model — called the <em>effect of removal</em> — into three simple values: +1, 0, and −1.',
    'Removing low cards (2–6) tends to leave the remaining shoe relatively richer in high cards. Each low card seen is tagged +1 to reflect this shift.',
    'Removing high cards (tens and aces) tends to leave the shoe relatively poorer in them. Each high card seen is tagged −1.',
    'Cards 7–9 have a smaller and more ambiguous effect on shoe composition, so Hi-Lo assigns them 0 and ignores them for counting purposes.',
    'The exact effect on play depends on the specific blackjack rules in use. Hi-Lo is a practical mental shorthand, not a complete model of every card remaining.',
    'The system is deliberately simplified so that counting can be performed mentally during real play at realistic speeds.'
  ]
};
