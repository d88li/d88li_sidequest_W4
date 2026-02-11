/*
Week 4 — Example 4: Playable Maze (JSON + Level class + Player class)
Course: GBDA302
Instructors: Dr. Karen Cochrane and David Han
Date: Feb. 5, 2026

This is the "orchestrator" file:
- Loads JSON levels (preload)
- Builds Level objects
- Creates/positions the Player
- Handles input + level switching

It is intentionally light on "details" because those are moved into:
- Level.js (grid + drawing + tile meaning)
- Player.js (position + movement rules)

Based on the playable maze structure from Example 3
*/

const TS = 32;

// Raw JSON data (from levels.json).
let levelsData;

// Array of Level instances.
let levels = [];

// Current level index.
let li = 0;

// Player instance (tile-based).
let player;
// ai modified (See <attachments> above for file contents. You may not need to search or read the file again.)
let enemy;
// Star power-up state
let star = null;

// UI / flow state
let showInstructions = true; // if true, show the instructions screen before level 1
let paused = false; // toggled with space during gameplay

function preload() {
  // Ensure level data is ready before setup runs.
  levelsData = loadJSON("levels.json");
}

function setup() {
  /*
  Convert raw JSON grids into Level objects.
  levelsData.levels is an array of 2D arrays. 
  */
  levels = levelsData.levels.map((grid) => new Level(copyGrid(grid), TS));

  // Create a player.
  player = new Player(TS);

  // Create the enemy (will be positioned when a level loads).
  enemy = new Enemy(TS);

  // Set canvas to match first level but show instructions before starting.
  // ai modified: show instructions before loading level 0.
  resizeCanvas(levels[0].pixelWidth(), levels[0].pixelHeight());

  noStroke();
  textFont("sans-serif");
  textSize(14);
}

function draw() {
  background(240);

  // If we're showing the instructions screen, draw it and skip the level draw.
  if (showInstructions) {
    // ai modified (See <attachments> above for file contents. You may not need to search or read the file again.)
    push();
    fill(20);
    textFont("Inter");
    textWrap(WORD);
    // Compute a text box with margins so content fits the canvas
    const margin = width * 0.08;
    const boxW = width - margin * 2;
    const boxH = height * 0.6;
    // build instruction lines explicitly to avoid accidental indentation/whitespace
    const instrLines = [
      "Use WASD arrows to move",
      "Use the space bar to pause and start game",
      "Collect the star to gain temporary immunity!",
      "Goal: get to the end of the level without being captured by the enemy!",
      "Press space to start",
    ];
    // Adaptive text size for small/large canvases
    const baseSize = Math.min(22, Math.max(12, Math.floor(width / 28)));

    // Render main instructions in a boxed area
    const mainLines = instrLines.slice(0, instrLines.length - 1);
    const mainText = mainLines.join("\n\n");
    textSize(baseSize);
    textAlign(LEFT, TOP);
    // draw each main line explicitly so none get clipped or hidden
    const lines = mainLines;
    const lineHeight = baseSize * 1.4;
    let y = height * 0.16;
    fill(20);
    for (const line of lines) {
      text(line, margin, y, boxW);
      y += lineHeight;
    }

    // Render final prompt larger and centered for visibility
    const finalLine = instrLines[instrLines.length - 1];
    textSize(baseSize + 6);
    textAlign(CENTER, BOTTOM);
    fill(20);
    text(finalLine, width / 2, height * 0.92);
    pop();
    return;
  }

  // Draw current level then player on top.
  levels[li].draw();
  // Star behavior: reposition every 0.5s and draw with a pulse.
  if (star && !star.collected) {
    // ai modified: reposition star every 500 ms to a reachable tile (if possible)
    const now = millis();
    if (!star.movedAt) star.movedAt = now;
    // ai modified: reposition every 3000 ms (3 seconds)
    if (now - star.movedAt >= 3000) {
      // recompute reachable candidates and pick a different one at random
      const level = levels[li];
      const candidates = [];
      for (let r = 0; r < level.rows(); r++) {
        for (let c = 0; c < level.cols(); c++) {
          if (level.isWall(r, c)) continue;
          if (level.isGoal(r, c)) continue;
          if (r === player.r && c === player.c) continue;
          if (enemy && r === enemy.r && c === enemy.c) continue;
          candidates.push({ r, c });
        }
      }

      // BFS reachability
      function reachable(targetR, targetC) {
        const start = { r: player.r, c: player.c };
        const key = (p) => `${p.r},${p.c}`;
        const q = [start];
        const seen = new Set([key(start)]);
        while (q.length) {
          const p = q.shift();
          if (p.r === targetR && p.c === targetC) return true;
          const nbrs = [
            { r: p.r - 1, c: p.c },
            { r: p.r + 1, c: p.c },
            { r: p.r, c: p.c - 1 },
            { r: p.r, c: p.c + 1 },
          ];
          for (const n of nbrs) {
            const k = key(n);
            if (seen.has(k)) continue;
            if (!level.inBounds(n.r, n.c)) continue;
            if (level.isWall(n.r, n.c)) continue;
            seen.add(k);
            q.push(n);
          }
        }
        return false;
      }

      const reachableCandidates = candidates.filter((c) => reachable(c.r, c.c));
      if (reachableCandidates.length > 0) {
        // prefer a different tile than current if possible
        const others = reachableCandidates.filter(
          (c) => !(c.r === star.r && c.c === star.c),
        );
        const pickPool = others.length ? others : reachableCandidates;
        const pick = random(pickPool);
        star.r = pick.r;
        star.c = pick.c;
      }

      star.movedAt = now;
    }

    // Draw pulsing star: pulse scale between 0.85 and 1.15 using sine
    const sx = star.c * TS + TS / 2;
    const sy = star.r * TS + TS / 2;
    const pulse = 0.15 * Math.sin((millis() / 300) * TWO_PI); // 300ms period
    const outerScale = 1 + pulse;
    push();
    noStroke();
    // glow layers scaled by outerScale
    for (let i = 4; i >= 1; i--) {
      const gR = TS * (0.24 + i * 0.08) * outerScale;
      const alpha = map(i, 4, 1, 30, 120);
      fill(255, 215, 0, alpha);
      circle(sx, sy, gR * 2);
    }
    // solid star core
    fill(255, 215, 0);
    stroke(255, 200, 0);
    strokeWeight(1);
    drawStar(sx, sy, TS * 0.24 * (1 + pulse), TS * 0.1 * (1 + pulse), 5);
    pop();
  }

  // Update and draw enemy (chases the player). If it reaches the player,
  // restart the current level. Do not update while paused.
  if (enemy) {
    if (!paused) enemy.update(levels[li], player);
    enemy.draw();
    if (!paused && enemy.collidesWithPlayer(player)) {
      loadLevel(li);
      return;
    }
  }

  // Draw the player on top of tiles/enemy.
  player.draw();

  if (paused) {
    fill(0, 150);
    rect(0, 0, width, height);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(24);
    text("PAUSED", width / 2, height / 2);
    textAlign(LEFT, BASELINE);
    textSize(14);
  }

  drawHUD();
}

function drawHUD() {
  // HUD matches your original idea: show level count and controls.
  fill(0);
  text(`Level ${li + 1}/${levels.length} — WASD/Arrows to move`, 10, 16);
}

function keyPressed() {
  // Space: start (from instructions) or toggle pause during gameplay.
  if (key === " " || keyCode === 32) {
    // ai modified: space starts the game from instructions or toggles pause
    if (showInstructions) {
      startGame();
      return;
    }

    paused = !paused;
    return;
  }

  // Block movement while showing instructions or paused.
  if (showInstructions || paused) return;

  /*
  Convert key presses into a movement direction. (WASD + arrows)
  */
  let dr = 0;
  let dc = 0;

  if (keyCode === LEFT_ARROW || key === "a" || key === "A") dc = -1;
  else if (keyCode === RIGHT_ARROW || key === "d" || key === "D") dc = 1;
  else if (keyCode === UP_ARROW || key === "w" || key === "W") dr = -1;
  else if (keyCode === DOWN_ARROW || key === "s" || key === "S") dr = 1;
  else return; // not a movement key

  // Try to move. If blocked, nothing happens.
  const moved = player.tryMove(levels[li], dr, dc);

  // If the player moved onto a goal tile, advance levels.
  if (moved && levels[li].isGoal(player.r, player.c)) {
    nextLevel();
  }
  // If player moved onto a star tile, consume it and grant immunity.
  if (
    moved &&
    star &&
    !star.collected &&
    player.r === star.r &&
    player.c === star.c
  ) {
    star.collected = true;
    player.immune = true;
    player.immuneStart = millis();
    player.immuneDuration = 3000; // 3 seconds
  }
}

// Start the game from the instructions screen.
// ai modified (See <attachments> above for file contents. You may not need to search or read the file again.)
function startGame() {
  showInstructions = false;
  paused = false;
  loadLevel(0);
}

// ----- Level switching -----

function loadLevel(idx) {
  li = idx;

  const level = levels[li];

  // Place player at the level's start tile (2), if present.
  if (level.start) {
    player.setCell(level.start.r, level.start.c);
  } else {
    // Fallback spawn: top-left-ish (but inside bounds).
    player.setCell(1, 1);
  }

  // Position the enemy at the player's start position and reset its delay.
  // ai modified (See <attachments> above for file contents. You may not need to search or read the file again.)
  if (enemy) {
    //ai modified (See <attachments> above for file contents. You may not need to search or read the file again.)
    // Place enemy at a level-specific start by scanning the grid with loops.
    // We avoid walls, goals, and the player's spawn so the enemy starts elsewhere.
    let placed = false;
    const rows = level.rows();
    const cols = level.cols();
    // scan from bottom-right to top-left to pick a distant tile
    for (let r = rows - 1; r >= 0 && !placed; r--) {
      for (let c = cols - 1; c >= 0 && !placed; c--) {
        // skip walls and goals
        if (level.isWall(r, c)) continue;
        if (level.isGoal(r, c)) continue;
        // skip player's spawn cell
        if (r === player.r && c === player.c) continue;

        // found a valid tile — place the enemy here
        enemy.setCell(r, c);
        enemy.resetStartTime();
        enemy.startDelay = 1000; // 1s
        // ensure internal grid coords match
        enemy.r = r;
        enemy.c = c;
        enemy.x = enemy.c * enemy.ts + enemy.ts / 2;
        enemy.y = enemy.r * enemy.ts + enemy.ts / 2;
        placed = true;
      }
    }
    // fallback: if no tile found above, place at player start
    if (!placed) {
      enemy.setCell(player.r, player.c);
      enemy.resetStartTime();
      enemy.startDelay = 1000;
    }
  }

  // Clear any level-carried immunity so power-ups don't persist across levels
  // ai modified (See <attachments> above for file contents. You may not need to search or read the file again.)
  if (player) {
    player.immune = false;
    player.immuneStart = 0;
    // keep default duration unchanged
  }

  // Place a reachable star on this level using loops + BFS reachability.
  // ai modified (See <attachments> above for file contents. You may not need to search or read the file again.)
  star = null;
  const candidates = [];
  for (let r = 0; r < level.rows(); r++) {
    for (let c = 0; c < level.cols(); c++) {
      if (level.isWall(r, c)) continue;
      if (level.isGoal(r, c)) continue;
      if (r === player.r && c === player.c) continue;
      // also avoid enemy spawn
      if (enemy && r === enemy.r && c === enemy.c) continue;
      candidates.push({ r, c });
    }
  }

  // BFS helper to check reachability from player to target
  function reachable(targetR, targetC) {
    const start = { r: player.r, c: player.c };
    const key = (p) => `${p.r},${p.c}`;
    const q = [start];
    const seen = new Set([key(start)]);
    while (q.length) {
      const p = q.shift();
      if (p.r === targetR && p.c === targetC) return true;
      const nbrs = [
        { r: p.r - 1, c: p.c },
        { r: p.r + 1, c: p.c },
        { r: p.r, c: p.c - 1 },
        { r: p.r, c: p.c + 1 },
      ];
      for (const n of nbrs) {
        const k = key(n);
        if (seen.has(k)) continue;
        if (!level.inBounds(n.r, n.c)) continue;
        if (level.isWall(n.r, n.c)) continue;
        seen.add(k);
        q.push(n);
      }
    }
    return false;
  }

  // Find reachable candidates and pick the farthest (Manhattan) from player
  let best = null;
  let bestDist = -1;
  for (const c of candidates) {
    if (!reachable(c.r, c.c)) continue;
    const d = Math.abs(c.r - player.r) + Math.abs(c.c - player.c);
    if (d > bestDist) {
      bestDist = d;
      best = c;
    }
  }
  if (best) {
    star = { r: best.r, c: best.c, collected: false, movedAt: millis() };
  }

  // Ensure the canvas matches this level’s dimensions.
  resizeCanvas(level.pixelWidth(), level.pixelHeight());
}

function nextLevel() {
  // Wrap around when we reach the last level.
  const next = (li + 1) % levels.length;
  loadLevel(next);
}

// Draw a star shape centered at (x,y).
// ai modified (See <attachments> above for file contents. You may not need to search or read the file again.)
function drawStar(x, y, outerRadius, innerRadius, points) {
  push();
  translate(x, y);
  beginShape();
  for (let i = 0; i < points * 2; i++) {
    const angle = (PI * i) / points;
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const sx = cos(angle - HALF_PI) * r;
    const sy = sin(angle - HALF_PI) * r;
    vertex(sx, sy);
  }
  endShape(CLOSE);
  pop();
}

// ----- Utility -----

function copyGrid(grid) {
  /*
  Make a deep-ish copy of a 2D array:
  - new outer array
  - each row becomes a new array

  Why copy?
  - Because Level constructor may normalize tiles (e.g., replace 2 with 0)
  - And we don’t want to accidentally mutate the raw JSON data object. 
  */
  return grid.map((row) => row.slice());
}
