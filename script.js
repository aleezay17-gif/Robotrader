/* ============================================================
   ROBOTRADER — a tiny trading sim where robots do the trading
   ------------------------------------------------------------
   This file is written to be readable if you're new to JS.
   It's organized in 5 parts:
     1. GAME STATE   - all the data that describes "right now"
     2. STOCKS       - the fake market and how prices move
     3. BOTS         - the automated traders you can deploy
     4. GAME LOOP    - runs once per "day" (tick)
     5. RENDERING    - draws the state onto the page
   ============================================================ */

/* ---------- 1. GAME STATE ---------- */

const WIN_NET_WORTH = 5000;
const TICK_MS = 2000;          // how often a "day" passes
const EVENT_CHANCE = 0.12;     // chance of a market event each tick

let state = {
  cash: 1000,
  holdings: {},     // { NXR: 3, QTF: 0, ... } shares owned
  tick: 0,
  bots: [],         // deployed bot instances
  won: false,
};

const stocks = [
  { symbol: 'NXR', name: 'Nexus Robotics',  price: 42,  history: [], volatility: 0.035 },
  { symbol: 'QTF', name: 'QuantForge',      price: 18,  history: [], volatility: 0.05  },
  { symbol: 'FRC', name: 'FerroCorp Steel', price: 65,  history: [], volatility: 0.02  },
  { symbol: 'SYN', name: 'Synapse AI',      price: 27,  history: [], volatility: 0.06  },
];
stocks.forEach(s => { state.holdings[s.symbol] = 0; s.history = [s.price]; });

const BOT_TYPES = {
  dipBuyer: {
    label: 'Dip Buyer',
    cost: 150,
    desc: 'Buys 1 share whenever a stock drops 4%+ in a day. Patient, opportunistic.',
    act(bot, stock, prevPrice) {
      const change = (stock.price - prevPrice) / prevPrice;
      if (change <= -0.04 && state.cash >= stock.price) {
        buyShares(stock.symbol, 1, true);
        return `${bot.name} bought the dip on ${stock.symbol}`;
      }
      return null;
    }
  },
  momentum: {
    label: 'Momentum Rider',
    cost: 200,
    desc: 'Buys into stocks that are already rising, sells if they reverse.',
    act(bot, stock, prevPrice) {
      const change = (stock.price - prevPrice) / prevPrice;
      if (change >= 0.03 && state.cash >= stock.price) {
        buyShares(stock.symbol, 1, true);
        return `${bot.name} rode momentum on ${stock.symbol}`;
      }
      if (change <= -0.015 && state.holdings[stock.symbol] > 0) {
        sellShares(stock.symbol, 1, true);
        return `${bot.name} bailed out of ${stock.symbol}`;
      }
      return null;
    }
  },
  scalper: {
    label: 'Scalper',
    cost: 300,
    desc: 'Trades small, frequent moves for quick, modest profit on any stock.',
    act(bot, stock, prevPrice) {
      const change = (stock.price - prevPrice) / prevPrice;
      if (Math.random() < 0.35) {
        if (change < 0 && state.cash >= stock.price) {
          buyShares(stock.symbol, 1, true);
          return `${bot.name} nibbled ${stock.symbol} on the way down`;
        }
        if (change > 0 && state.holdings[stock.symbol] > 0) {
          sellShares(stock.symbol, 1, true);
          return `${bot.name} flipped ${stock.symbol} for a quick profit`;
        }
      }
      return null;
    }
  }
};

/* ---------- 2. STOCKS ---------- */

function updatePrices() {
  stocks.forEach(stock => {
    const drift = (Math.random() - 0.5) * 2 * stock.volatility;
    const newPrice = Math.max(1, stock.price * (1 + drift));
    stock.prevPrice = stock.price;
    stock.price = Math.round(newPrice * 100) / 100;
    stock.history.push(stock.price);
    if (stock.history.length > 20) stock.history.shift();
  });
}

function triggerRandomEvent() {
  if (Math.random() > EVENT_CHANCE) return null;
  const stock = stocks[Math.floor(Math.random() * stocks.length)];
  const isCrash = Math.random() < 0.5;
  const magnitude = isCrash ? 0.8 : 1.25;
  stock.prevPrice = stock.price;
  stock.price = Math.round(stock.price * magnitude * 100) / 100;
  stock.history.push(stock.price);
  const label = isCrash ? 'crashed on supply-chain news' : 'surged on an earnings beat';
  return `⚠ ${stock.symbol} ${label}`;
}

/* ---------- Trading actions (used by both player and bots) ---------- */

function buyShares(symbol, qty, isBot = false) {
  const stock = stocks.find(s => s.symbol === symbol);
  const cost = stock.price * qty;
  if (state.cash < cost) return false;
  state.cash -= cost;
  state.holdings[symbol] += qty;
  if (!isBot) addLog(`You bought ${qty} share(s) of ${symbol} at $${stock.price}`);
  return true;
}

function sellShares(symbol, qty, isBot = false) {
  if (state.holdings[symbol] < qty) return false;
  const stock = stocks.find(s => s.symbol === symbol);
  state.holdings[symbol] -= qty;
  state.cash += stock.price * qty;
  if (!isBot) addLog(`You sold ${qty} share(s) of ${symbol} at $${stock.price}`);
  return true;
}

/* ---------- 3. BOTS ---------- */

function deployBot(typeKey) {
  const type = BOT_TYPES[typeKey];
  if (state.cash < type.cost) return;
  state.cash -= type.cost;
  const bot = {
    id: Date.now() + Math.random(),
    type: typeKey,
    name: `${type.label} #${state.bots.filter(b => b.type === typeKey).length + 1}`,
  };
  state.bots.push(bot);
  addLog(`Deployed ${bot.name} to the floor`, 'event');
  render();
}

function runBots() {
  state.bots.forEach(bot => {
    const type = BOT_TYPES[bot.type];
    stocks.forEach(stock => {
      if (stock.prevPrice === undefined) return;
      const msg = type.act(bot, stock, stock.prevPrice);
      if (msg) addLog(msg);
    });
  });
}

/* ---------- 4. GAME LOOP ---------- */

function getHoldingsValue() {
  return stocks.reduce((sum, s) => sum + s.price * state.holdings[s.symbol], 0);
}

function tickGame() {
  state.tick += 1;
  updatePrices();
  runBots();
  const eventMsg = triggerRandomEvent();
  if (eventMsg) addLog(eventMsg, 'event');

  const netWorth = state.cash + getHoldingsValue();
  if (!state.won && netWorth >= WIN_NET_WORTH) {
    state.won = true;
    showWin(netWorth);
  }
  render();
}

/* ---------- 5. RENDERING ---------- */

const logFeedEl = document.getElementById('logFeed');
const MAX_LOG = 60;

function addLog(message, kind = '') {
  const el = document.createElement('div');
  el.className = `log-entry${kind ? ' log-' + kind : ''}`;
  el.innerHTML = `<span class="log-tick">Day ${state.tick}</span>${message}`;
  logFeedEl.prepend(el);
  while (logFeedEl.children.length > MAX_LOG) {
    logFeedEl.removeChild(logFeedEl.lastChild);
  }
}

function renderStats() {
  const holdingsValue = getHoldingsValue();
  document.getElementById('statCash').textContent = `$${state.cash.toFixed(2)}`;
  document.getElementById('statHoldings').textContent = `$${holdingsValue.toFixed(2)}`;
  document.getElementById('statNetWorth').textContent = `$${(state.cash + holdingsValue).toFixed(2)}`;
  document.getElementById('statTick').textContent = state.tick;
}

function renderStocks() {
  const container = document.getElementById('stockList');
  container.innerHTML = '';
  stocks.forEach(stock => {
    const prev = stock.prevPrice ?? stock.price;
    const change = prev ? ((stock.price - prev) / prev) * 100 : 0;
    const isUp = change >= 0;

    const row = document.createElement('div');
    row.className = 'stock-row';

    const maxH = Math.max(...stock.history, 1);
    const spark = stock.history.slice(-14).map(p =>
      `<div class="spark-bar" style="height:${Math.max(2, (p / maxH) * 24)}px; background:${p >= prev ? 'var(--teal-dim)' : 'var(--copper-dim)'}"></div>`
    ).join('');

    row.innerHTML = `
      <div class="stock-symbol">${stock.symbol}</div>
      <div class="stock-info">
        <span class="stock-name">${stock.name}</span>
        <div class="stock-price-row">
          <span class="stock-price">$${stock.price.toFixed(2)}</span>
          <span class="stock-delta ${isUp ? 'delta-up' : 'delta-down'}">${isUp ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}%</span>
        </div>
      </div>
      <div class="spark">${spark}</div>
      <div class="stock-actions">
        <button class="btn btn-buy" data-action="buy" data-symbol="${stock.symbol}">Buy</button>
        <button class="btn btn-sell" data-action="sell" data-symbol="${stock.symbol}" ${state.holdings[stock.symbol] === 0 ? 'disabled' : ''}>Sell</button>
      </div>
    `;
    container.appendChild(row);
  });

  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const { action, symbol } = btn.dataset;
      if (action === 'buy') buyShares(symbol, 1);
      if (action === 'sell') sellShares(symbol, 1);
      render();
    });
  });
}

function renderBotShop() {
  const container = document.getElementById('botShop');
  container.innerHTML = '';
  Object.entries(BOT_TYPES).forEach(([key, type]) => {
    const card = document.createElement('div');
    card.className = 'bot-card';
    card.innerHTML = `
      <div class="bot-card-info">
        <span class="bot-card-name">${type.label}</span>
        <span class="bot-card-desc">${type.desc}</span>
      </div>
      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:0.35rem;">
        <span class="bot-card-cost">$${type.cost}</span>
        <button class="btn btn-primary" data-type="${key}" ${state.cash < type.cost ? 'disabled' : ''}>Deploy</button>
      </div>
    `;
    container.appendChild(card);
  });
  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => deployBot(btn.dataset.type));
  });
}

function renderBotFleet() {
  const container = document.getElementById('botFleet');
  if (state.bots.length === 0) {
    container.innerHTML = '<p class="panel-sub">No bots deployed yet — your floor is empty.</p>';
    return;
  }
  container.innerHTML = '<div class="bot-fleet-title">Active Fleet</div>';
  state.bots.forEach(bot => {
    const el = document.createElement('div');
    el.className = 'bot-unit';
    el.innerHTML = `<span class="dot"></span> ${bot.name} — ${BOT_TYPES[bot.type].label} strategy`;
    container.appendChild(el);
  });
}

function renderTicker() {
  const track = stocks.map(s => {
    const prev = s.prevPrice ?? s.price;
    const up = s.price >= prev;
    return `<span class="${up ? 'tick-up' : 'tick-down'}">${s.symbol} $${s.price.toFixed(2)} ${up ? '▲' : '▼'}</span>`;
  }).join('<span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>');
  document.getElementById('tickerStrip').innerHTML = `<div class="ticker-track">${track}</div>`;
}

function showWin(netWorth) {
  document.getElementById('winText').textContent =
    `Your fleet grew $1,000 into $${netWorth.toFixed(2)}. Keep going to see how high it can climb.`;
  document.getElementById('winOverlay').classList.add('show');
  addLog(`🏆 Net worth hit $${netWorth.toFixed(2)} — objective complete!`, 'win');
}

function render() {
  renderStats();
  renderStocks();
  renderBotShop();
  renderBotFleet();
  renderTicker();
}

/* ---------- Wiring it all together ---------- */

document.getElementById('winContinueBtn').addEventListener('click', () => {
  document.getElementById('winOverlay').classList.remove('show');
});

document.getElementById('resetBtn').addEventListener('click', () => {
  if (!confirm('Reset the simulation? This clears your progress.')) return;
  state = { cash: 1000, holdings: {}, tick: 0, bots: [], won: false };
  stocks.forEach((s, i) => {
    s.price = [42, 18, 65, 27][i];
    s.history = [s.price];
    s.prevPrice = undefined;
    state.holdings[s.symbol] = 0;
  });
  logFeedEl.innerHTML = '';
  addLog('Simulation reset. Fresh $1,000 on the books.', 'event');
  render();
});

addLog('Welcome to the floor. Deploy your first bot when you\'re ready.', 'event');
render();
setInterval(tickGame, TICK_MS);
