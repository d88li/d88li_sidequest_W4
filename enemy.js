/*
Enemy.js

Simple chasing enemy that:
*/

// ai modified (See <attachments> above for file contents. You may not need to search or read the file again.)
class Enemy {
  constructor(tileSize) {
    this.ts = tileSize;
    this.x = undefined;
    this.y = undefined;
    this.speed = 100; // pixels per second (constant)
    this.active = false;
    this.spawnAt = 0;
    this.startDelay = 1000; // ms (ai modified - increased to 1s)

    // Tile-based movement state
    this.r = 0;
    this.c = 0;
    this.moving = false;
    this.tr = null;
    this.tc = null;
    this.targetX = null;
    this.targetY = null;
    // Pathfinding state
    this.path = null;
    this.pathIndex = 0;
    this.pathGoalR = null;
    this.pathGoalC = null;
  }

  // Place enemy at a specific grid cell (row/col)
  setCell(r, c) {
    this.r = r;
    this.c = c;
    this.x = c * this.ts + this.ts / 2;
    this.y = r * this.ts + this.ts / 2;
    this.spawnAt = millis();
    this.active = false;
    this.moving = false;
    this.tr = null;
    this.tc = null;
  }

  resetStartTime() {
    this.spawnAt = millis();
    this.active = false;
  }

  // Update enemy position; simple steering toward player's pixel center.
  //ai modified (See <attachments> above for file contents. You may not need to search or read the file again.)
  update(level, player) {
    if (this.x === undefined) return;

    // Activate after delay
    if (!this.active) {
      if (millis() - this.spawnAt >= this.startDelay) this.active = true;
      else return;
    }

    // If currently moving toward a target tile, interpolate pixels.
    if (this.moving && this.tr !== null && this.tc !== null) {
      const dt = deltaTime / 1000.0;
      const dx = this.targetX - this.x;
      const dy = this.targetY - this.y;
      const distToTarget = Math.sqrt(dx * dx + dy * dy);
      if (distToTarget < 0.5) {
        // Snap to target tile
        this.x = this.targetX;
        this.y = this.targetY;
        this.r = this.tr;
        this.c = this.tc;
        this.moving = false;
        this.tr = null;
        this.tc = null;
        this.targetX = null;
        this.targetY = null;
        // Advance along any existing path so the enemy keeps moving
        // even if the player stops moving.
        if (this.path && this.path.length) {
          // Remove the tile we just left (path[0])
          this.path.shift();
          // If there's another step, immediately begin moving to it
          if (this.path.length > 1) {
            const next = this.path[1];
            this.tr = next.r;
            this.tc = next.c;
            this.targetX = this.tc * this.ts + this.ts / 2;
            this.targetY = this.tr * this.ts + this.ts / 2;
            this.moving = true;
          }
        }
      } else {
        const move = this.speed * dt;
        const step = Math.min(move, distToTarget);
        this.x += (dx / distToTarget) * step;
        this.y += (dy / distToTarget) * step;
        return;
      }
    }

    //ai modified (See <attachments> above for file contents. You may not need to search or read the file again.)
    // Decide next tile using A* pathfinding (respect walls)
    if (this.r === player.r && this.c === player.c) return;

    // Recompute path if we don't have one or player moved
    if (
      !this.path ||
      this.pathGoalR !== player.r ||
      this.pathGoalC !== player.c
    ) {
      this.path = this.findPath(
        level,
        { r: this.r, c: this.c },
        { r: player.r, c: player.c },
      );
      this.pathIndex = 0;
      this.pathGoalR = player.r;
      this.pathGoalC = player.c;
    }

    // If a valid path exists and has a next step, start moving to it.
    if (this.path && this.path.length > 1) {
      // path[0] is current tile, path[1] is next tile
      const next = this.path[1];
      // Validate next step: must be adjacent and not a wall.
      if (
        !level.inBounds(next.r, next.c) ||
        level.isWall(next.r, next.c) ||
        Math.abs(next.r - this.r) + Math.abs(next.c - this.c) !== 1
      ) {
        // invalid next step — try recomputing the path once
        this.path = this.findPath(
          level,
          { r: this.r, c: this.c },
          { r: player.r, c: player.c },
        );
        if (!this.path || this.path.length <= 1) return; // give up this frame
      }
      this.pathIndex = 1;
      const validatedNext = this.path[1];
      this.tr = validatedNext.r;
      this.tc = validatedNext.c;
      this.targetX = this.tc * this.ts + this.ts / 2;
      this.targetY = this.tr * this.ts + this.ts / 2;
      this.moving = true;
    } else {
      // No path (shouldn't happen often) — do nothing this frame.
    }
  }

  // A* pathfinder returning an array of {r,c} from start to goal inclusive
  findPath(level, start, goal) {
    // Quick checks
    if (start.r === goal.r && start.c === goal.c)
      return [{ r: start.r, c: start.c }];
    const key = (p) => `${p.r},${p.c}`;

    const openSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const startKey = key(start);
    openSet.add(startKey);
    gScore.set(startKey, 0);
    fScore.set(
      startKey,
      Math.abs(goal.r - start.r) + Math.abs(goal.c - start.c),
    );

    const neighborsOf = (p) => {
      return [
        { r: p.r - 1, c: p.c },
        { r: p.r + 1, c: p.c },
        { r: p.r, c: p.c - 1 },
        { r: p.r, c: p.c + 1 },
      ].filter((n) => level.inBounds(n.r, n.c) && !level.isWall(n.r, n.c));
    };

    // helper to get lowest fScore in openSet
    const lowestF = () => {
      let best = null;
      for (const k of openSet) {
        const v = fScore.get(k) ?? Infinity;
        if (best === null || v < best.score) best = { key: k, score: v };
      }
      return best ? best.key : null;
    };

    while (openSet.size > 0) {
      const currentKey = lowestF();
      if (!currentKey) break;
      const [cr, cc] = currentKey.split(",").map((s) => parseInt(s, 10));
      if (cr === goal.r && cc === goal.c) {
        // reconstruct path
        const path = [];
        let k = currentKey;
        while (k) {
          const [rr, rc] = k.split(",").map((s) => parseInt(s, 10));
          path.unshift({ r: rr, c: rc });
          k = cameFrom.get(k);
        }
        return path;
      }

      openSet.delete(currentKey);

      const current = { r: cr, c: cc };
      for (const n of neighborsOf(current)) {
        const nk = key(n);
        const tentativeG = (gScore.get(currentKey) ?? Infinity) + 1;
        if (tentativeG < (gScore.get(nk) ?? Infinity)) {
          cameFrom.set(nk, currentKey);
          gScore.set(nk, tentativeG);
          fScore.set(
            nk,
            tentativeG + Math.abs(goal.r - n.r) + Math.abs(goal.c - n.c),
          );
          if (!openSet.has(nk)) openSet.add(nk);
        }
      }
    }

    // No path found
    return null;
  }

  draw() {
    if (this.x === undefined) return;
    fill(200, 30, 30);
    circle(this.x, this.y, this.ts * 0.6);
  }

  //ai modified (See <attachments> above for file contents. You may not need to search or read the file again.)
  collidesWithPlayer(player) {
    if (this.x === undefined) return false;
    // Only count collision after the enemy has activated (after startDelay)
    if (!this.active) return false;
    // If player is immune, enemy can't capture them.
    if (player.immune) return false;
    const d = dist(this.x, this.y, player.pixelX(), player.pixelY());
    return d < this.ts * 0.5;
  }
}
