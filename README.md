# RoboTrader

A tiny browser game where you deploy automated trading bots onto a fake stock
market and watch them (try to) grow your money. Built with plain HTML, CSS,
and JavaScript — no build tools, no frameworks, nothing to install.

## Run it locally
Just open `index.html` in any browser. That's it.

## How to play
- You start with $1,000 cash.
- Four fake stocks move every "day" (every 2 seconds).
- Buy and sell manually, or deploy a **bot** that trades automatically using
  its own strategy (Dip Buyer, Momentum Rider, Scalper).
- Random market events (crashes/surges) shake things up.
- Reach $5,000 net worth to hit the objective — then keep playing for a high score.

## Project structure
```
robotrader-game/
├── index.html   # page structure
├── style.css    # the "trading floor" visual theme
└── script.js    # all game logic, commented section by section
```

## Ideas for your next milestones
1. **Add more bot strategies** — e.g. a bot that only trades one stock, or one
   that changes behavior based on how many days have passed.
2. **Add a chart** — replace the little spark bars with a real line chart
   (a simple `<canvas>` drawing, or a library like Chart.js).
3. **Add bot upgrades** — spend profit to make a bot faster/smarter (e.g. it
   can react to a smaller price dip).
4. **Save progress** — once this is live on your own site, `localStorage` is a
   simple way to remember a player's progress between visits.
5. **Difficulty options** — starting cash, market volatility, or a time limit.

Small, working milestones like these are much easier to finish than trying to
build "the perfect game" in one go — ship something playable first, then layer
features on top.
