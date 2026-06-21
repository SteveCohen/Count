'use strict';

const GLOSSARY_TERMS = [
  {
    term: 'Shoe',
    definition: 'A dealing device, usually made of plastic, that holds multiple decks of cards and allows the dealer to dispense one card at a time. Shoes are used in multi-deck games.'
  },
  {
    term: 'Deck',
    definition: 'A standard set of 52 playing cards comprising four suits (spades, clubs, hearts, diamonds), each with thirteen ranks (2 through Ace). A blackjack shoe typically contains 2, 6, or 8 decks.'
  },
  {
    term: 'Burn card',
    definition: 'One or more cards removed from the top of a shuffled shoe before play begins and placed in the discard tray face-down. Burn cards are not counted in the player\'s running count because they are not visible.'
  },
  {
    term: 'Cut card',
    definition: 'A solid-colour plastic card inserted into the shoe by a player before play begins. When the cut card appears during dealing, the current round is completed and then the shoe is reshuffled. Its position determines penetration.'
  },
  {
    term: 'Deck penetration',
    definition: 'The proportion of cards dealt from the shoe before reshuffling. A 75% penetration means roughly three-quarters of the cards are dealt before a new shoe begins. Higher penetration allows more time for the count to diverge meaningfully from zero.'
  },
  {
    term: 'Running count',
    definition: 'The cumulative sum of Hi-Lo tags for every card seen so far in the current shoe. The running count starts at zero for a new shoe and fluctuates as cards are exposed.'
  },
  {
    term: 'True count',
    definition: 'The running count divided by the estimated number of decks remaining in the shoe. The true count normalises the running count so that the same value means the same shoe composition regardless of the shoe size or how deep into the shoe you are.'
  },
  {
    term: 'Balanced count',
    definition: 'A counting system in which the tags for a complete single deck sum to exactly zero. Hi-Lo is balanced: twenty cards tagged +1, twelve tagged 0, and twenty tagged −1. A balanced count will return to zero after all cards in the shoe have been seen.'
  },
  {
    term: 'Unbalanced count',
    definition: 'A counting system in which the tags for a complete deck do not sum to zero. The KO (Knock-Out) system is unbalanced, which means it does not require a separate true-count conversion step — but the count does not return to zero at shoe end.'
  },
  {
    term: 'Discard tray',
    definition: 'A plastic tray placed beside the dealer where used cards are placed face-down after each round. The number of cards in the discard tray can be used to estimate how many decks remain in the shoe.'
  },
  {
    term: 'Upcard',
    definition: 'The dealer\'s face-up card, visible to all players at the table. The upcard is included in the running count because it is exposed.'
  },
  {
    term: 'Hole card',
    definition: 'The dealer\'s face-down card, placed under the upcard and not revealed until it is the dealer\'s turn to play. In Hi-Lo counting, the hole card cannot be added to the running count until it is revealed.'
  },
  {
    term: 'Round',
    definition: 'One complete dealing sequence in which each player receives cards and the dealer plays their hand. A shoe typically contains many rounds before the cut card is reached.'
  },
  {
    term: 'Shuffle',
    definition: 'The act of randomising the cards in the shoe. After a shuffle, the running count resets to zero because the previous count information no longer applies to the new order of cards.'
  },
  {
    term: 'Ten-valued card',
    definition: 'Any card worth ten points in blackjack: the 10, Jack, Queen, or King. There are sixteen ten-valued cards per deck. In Hi-Lo, all ten-valued cards are tagged −1.'
  },
  {
    term: 'Basic strategy',
    definition: 'The mathematically derived table of optimal decisions (hit, stand, double, split) for every possible player hand against every possible dealer upcard, given a specific set of blackjack rules. Basic strategy is calculated without reference to the count.'
  },
  {
    term: 'Effect of removal',
    definition: 'The change in the player\'s theoretical edge that results from removing one specific card from the shoe. Hi-Lo approximates the effect of removal by assigning simplified +1/0/−1 tags rather than precise fractional values.'
  },
  {
    term: 'Side count',
    definition: 'A secondary count maintained alongside the main count to track a specific rank — most commonly aces — that the main system does not weight precisely. Side counts increase mental effort significantly.'
  },
  {
    term: 'Playing efficiency',
    definition: 'A measure of how accurately a counting system indicates when to deviate from basic strategy. Hi-Lo has moderate playing efficiency; higher-level systems like Omega II have greater playing efficiency at the cost of complexity.'
  },
  {
    term: 'Betting correlation',
    definition: 'A measure of how closely a counting system\'s values correlate with the actual change in player edge per card removed. Hi-Lo has a betting correlation of approximately 0.97, which is high for a level-1 system.'
  },
  {
    term: 'Insurance correlation',
    definition: 'A measure of how accurately a counting system predicts when the dealer\'s hole card is a ten-valued card — the basis of the insurance side bet. Hi-Lo has relatively low insurance correlation because it groups aces with ten-valued cards.'
  }
];

const COUNTING_METHODS = [
  {
    name: 'Hi-Lo',
    level: 'Level 1',
    balanced: 'Yes',
    tags: '2–6 = +1 · 7–9 = 0 · 10–A = −1',
    notes: 'Widely taught. Simple, versatile, and a strong starting point for learning count mechanics.',
    highlight: true
  },
  {
    name: 'KO (Knock-Out)',
    level: 'Level 1',
    balanced: 'No',
    tags: '2–7 = +1 · 8–9 = 0 · 10–A = −1',
    notes: 'Unbalanced; eliminates the need for a true-count conversion step. Traded for less precise adjustments.',
    highlight: false
  },
  {
    name: 'Hi-Opt I',
    level: 'Level 1',
    balanced: 'Yes',
    tags: '3–6 = +1 · 2, 7–9 = 0 · 10 = −1 · A = 0',
    notes: 'Aces are counted as neutral; a side count of aces is usually maintained separately.',
    highlight: false
  },
  {
    name: 'Omega II',
    level: 'Level 2',
    balanced: 'Yes',
    tags: '2,3,7 = +1 · 4,5,6 = +2 · 8,9 = 0 · 10 = −2 · A = 0',
    notes: 'Multi-level tags increase accuracy. Requires an ace side count. Substantially more demanding.',
    highlight: false
  },
  {
    name: 'Zen Count',
    level: 'Level 2',
    balanced: 'Yes',
    tags: '2,3 = +1 · 4,5,6 = +2 · 7 = +1 · 8,9 = 0 · 10 = −2 · A = −1',
    notes: 'A balanced multi-level system that attempts to combine reasonable simplicity with greater accuracy.',
    highlight: false
  },
  {
    name: 'Wong Halves',
    level: 'Level 3',
    balanced: 'Yes',
    tags: '2,7 = +0.5 · 3,4,6 = +1 · 5 = +1.5 · 8 = 0 · 9 = −0.5 · 10,A = −1',
    notes: 'Fractional tag values make this the most accurate common system and also the most mentally demanding.',
    highlight: false
  }
];

function initReference() {
  _renderGlossary();
  _renderMethodsTable();
  _initGlossarySearch();
}

function _renderGlossary() {
  const container = document.getElementById('glossary-list');
  if (!container) return;

  container.innerHTML = '';
  for (const item of GLOSSARY_TERMS) {
    const dt = document.createElement('dt');
    dt.id = `gloss-${_slugify(item.term)}`;
    dt.textContent = item.term;

    const dd = document.createElement('dd');
    dd.textContent = item.definition;

    container.appendChild(dt);
    container.appendChild(dd);
  }
}

function _renderMethodsTable() {
  const table = document.getElementById('methods-table');
  if (!table) return;

  table.innerHTML = `
    <caption>Comparison of card counting systems. This app teaches Hi-Lo only; other systems are shown for context.</caption>
    <thead>
      <tr>
        <th scope="col">System</th>
        <th scope="col">Level</th>
        <th scope="col">Balanced?</th>
        <th scope="col">Tag values</th>
        <th scope="col">Notes</th>
      </tr>
    </thead>
    <tbody>
      ${COUNTING_METHODS.map(m => `
        <tr class="${m.highlight ? 'methods-table__row--highlight' : ''}">
          <td><strong>${m.name}</strong>${m.highlight ? ' <span class="badge-primary">Taught here</span>' : ''}</td>
          <td>${m.level}</td>
          <td>${m.balanced}</td>
          <td class="methods-table__tags">${m.tags}</td>
          <td>${m.notes}</td>
        </tr>
      `).join('')}
    </tbody>
  `;
}

function _initGlossarySearch() {
  const input = document.getElementById('glossary-search');
  const list  = document.getElementById('glossary-list');
  if (!input || !list) return;

  input.addEventListener('input', () => {
    const query = input.value.toLowerCase().trim();
    const pairs = list.querySelectorAll('dt');
    let visible = 0;

    pairs.forEach(dt => {
      const dd = dt.nextElementSibling;
      const match = !query
        || dt.textContent.toLowerCase().includes(query)
        || (dd && dd.textContent.toLowerCase().includes(query));

      dt.hidden = !match;
      if (dd) dd.hidden = !match;
      if (match) visible++;
    });

    list.setAttribute('aria-label', query
      ? `Glossary: ${visible} result${visible !== 1 ? 's' : ''} for "${input.value}"`
      : 'Glossary');
  });
}

function _slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
