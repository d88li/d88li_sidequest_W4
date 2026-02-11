/*
Player.js

A Player stores the avatar position in grid coordinates (row/col)
and knows how to:
- draw itself
- attempt a move (tile-by-tile) with collision rules

The Player does NOT:
- load JSON
- switch levels
Those are "game orchestration" responsibilities that belong in sketch.js. 
*/

class Player {
  constructor(tileSize) {
    this.ts = tileSize;

    // Current grid position (row/col).
    this.r = 0;
    this.c = 0;

    // Movement throttle (so a key press doesn't move 60 tiles per second).
    this.movedAt = 0;
    this.moveDelay = 90; // ms
    // Immunity state (powered-up by collecting a star)
    this.immune = false;
    this.immuneStart = 0;
    this.immuneDuration = 3000; // ms
  }

  // Place the player at a specific grid location (e.g., the level's start).
  setCell(r, c) {
    this.r = r;
    this.c = c;
  }

  // Convert grid coords to pixel center (for drawing a circle).
  pixelX() {
    return this.c * this.ts + this.ts / 2;
  }

  pixelY() {
    return this.r * this.ts + this.ts / 2;
  }

  draw() {
    // ai modified (See <attachments> above for file contents. You may not need to search or read the file again.)
    // While immune, show a rainbow-shifting avatar that cycles every 0.1s.
    if (this.immune) {
      const elapsed = millis() - this.immuneStart;
      if (elapsed >= this.immuneDuration) {
        this.immune = false;
      } else {
        push();
        colorMode(HSB, 360, 100, 100);
        // ai modified: change colour every 0.005 seconds (5 ms)
        const hue = Math.floor((elapsed / 5) % 360);
        fill(hue, 100, 100);
        circle(this.pixelX(), this.pixelY(), this.ts * 0.6);
        pop();
        return;
      }
    }

    // Default avatar
    fill(20, 120, 255);
    circle(this.pixelX(), this.pixelY(), this.ts * 0.6);
  }

  /*
  Try to move by (dr, dc) tiles.

  Inputs:
  - level: a Level instance, used for bounds + wall collision + goal detection
  - dr/dc: desired movement step, typically -1,0,1

  Returns:
  - true if the move happened
  - false if blocked or throttled
  */
  tryMove(level, dr, dc) {
    // Throttle discrete movement using millis()
    const now = millis();
    if (now - this.movedAt < this.moveDelay) return false;

    const nr = this.r + dr;
    const nc = this.c + dc;

    // Prevent walking off the map.
    if (!level.inBounds(nr, nc)) return false;

    // Prevent walking into walls.
    if (level.isWall(nr, nc)) return false;

    // Movement is allowed, so commit.
    this.r = nr;
    this.c = nc;
    this.movedAt = now;

    return true;
  }
}
