'use strict';

const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
const SUITS = ['♠','♣','♥','♦']; // ♠ ♣ ♥ ♦
const RED_SUITS = new Set(['♥','♦']);        // ♥ ♦

const RANK_VALUES = {
  '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,
  'T':10,'J':10,'Q':10,'K':10,'A':11
};

const RANK_DISPLAY = {
  '2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9',
  'T':'10','J':'J','Q':'Q','K':'K','A':'A'
};

const SUIT_NAMES = {
  '♠':'spades', '♣':'clubs', '♥':'hearts', '♦':'diamonds'
};

function generateCardId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function createCard(rank, suit) {
  return {
    rank,
    suit,
    value:    RANK_VALUES[rank],
    hiLoTag:  getHiLoTag(rank),
    isVisible: true,
    location:  'shoe',
    id:        generateCardId()
  };
}

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(rank, suit));
    }
  }
  return deck;
}

function createShoe(numDecks) {
  const cards = [];
  for (let i = 0; i < numDecks; i++) {
    cards.push(...createDeck());
  }
  return cards;
}

function fisherYatesShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

class Shoe {
  constructor(numDecks, penetrationPct) {
    this.numDecks       = numDecks;
    this.penetrationPct = penetrationPct;
    this.cards          = [];
    this.discardTray    = [];
    this.cutCardHit     = false;
    this.totalCardCount = numDecks * 52;
    this.build();
  }

  build() {
    this.cards       = fisherYatesShuffle(createShoe(this.numDecks));
    this.discardTray = [];
    this.cutCardHit  = false;
    // Insert cut-card sentinel at the penetration point from the end
    const cutPos = Math.max(1, Math.floor(this.cards.length * (1 - this.penetrationPct)));
    this.cards.splice(cutPos, 0, { isCutCard: true });
  }

  deal(location = 'unknown', visible = true) {
    if (this.cards.length === 0) return null;

    const item = this.cards.shift();

    if (item.isCutCard) {
      this.cutCardHit = true;
      if (this.cards.length === 0) return null;
      const next = this.cards.shift();
      if (next.isCutCard) return null;
      next.isVisible = visible;
      next.location  = location;
      return next;
    }

    item.isVisible = visible;
    item.location  = location;
    return item;
  }

  discard(card) {
    if (card && !card.isCutCard) {
      card.location = 'discard';
      this.discardTray.push(card);
    }
  }

  get remainingCards() {
    return this.cards.filter(c => !c.isCutCard).length;
  }

  get decksRemaining() {
    const raw = this.remainingCards / 52;
    return Math.max(0.5, Math.round(raw * 2) / 2);
  }

  get cardsDealt() {
    return this.discardTray.length;
  }

  get penetrationReached() {
    return this.cutCardHit;
  }

  get penetrationPct() {
    return this._penetrationPct;
  }

  set penetrationPct(val) {
    this._penetrationPct = val;
  }
}
