/* MMM-WeekBlocks
 * Week-at-a-glance block calendar for MagicMirror².
 * Reads events broadcast by the default calendar module (CALENDAR_EVENTS)
 * and shows them as colored blocks in day columns.
 * MIT Licensed.
 */
Module.register("MMM-WeekBlocks", {
  defaults: {
    days: 7,                 // number of day columns
    startToday: true,        // true = start at today, false = start at beginning of week
    maxPerDay: 6,            // max events shown per day before "+N more"
    allDayColor: null,       // e.g. "#ffffff" to show all-day events in one color; null = calendar color
    rotateBackground: false, // swap the page background on a timer
    backgroundUrl: "https://picsum.photos/1920/1080",
    backgroundInterval: 60 * 60 * 1000 // 1 hour
  },

  start() {
    this.events = [];
    // Redraw periodically so "today" rolls over at midnight
    setInterval(() => this.updateDom(), 10 * 60 * 1000);
    if (this.config.rotateBackground) {
      setInterval(() => this.rotateBg(), this.config.backgroundInterval);
    }
  },

  getStyles() {
    return ["MMM-WeekBlocks.css"];
  },

  notificationReceived(notification, payload) {
    if (notification === "CALENDAR_EVENTS") {
      this.events = payload || [];
      this.updateDom(500);
    }
  },

  async rotateBg() {
    try {
      const sep = this.config.backgroundUrl.includes("?") ? "&" : "?";
      // Resolve redirects (e.g. picsum) so the preloaded image is the one displayed
      const r = await fetch(`${this.config.backgroundUrl}${sep}random=${Date.now()}`);
      const url = r.url;
      await new Promise((ok, fail) => {
        const img = new Image();
        img.onload = ok;
        img.onerror = fail;
        img.src = url;
      });
      const root = document.documentElement;
      root.style.setProperty("--wb-bg-image", `url("${url}")`);
      root.classList.add("wb-bg-rotating");
    } catch (e) {
      Log.warn("[MMM-WeekBlocks] background rotate failed", e);
    }
  },

  getDom() {
    const grid = document.createElement("div");
    grid.className = "wb-grid";
    grid.style.gridTemplateColumns = `repeat(${this.config.days}, minmax(0, 1fr))`;

    const start = moment().startOf(this.config.startToday ? "day" : "week");

    for (let i = 0; i < this.config.days; i++) {
      const d0 = start.clone().add(i, "days");
      const d1 = d0.clone().add(1, "day");

      const col = document.createElement("div");
      col.className = "wb-day" + (d0.isSame(moment(), "day") ? " today" : "");

      const head = document.createElement("div");
      head.className = "wb-head";
      head.innerHTML = `<span class="dow">${d0.format("ddd")}</span><span class="num">${d0.format("D")}</span>`;
      col.appendChild(head);

      const evs = this.events
        .filter((e) => {
          const s = Number(e.startDate);
          const en = Math.max(Number(e.endDate), s + 1);
          return s < d1.valueOf() && en > d0.valueOf();
        })
        .sort((a, b) => (b.fullDayEvent - a.fullDayEvent) || (a.startDate - b.startDate));

      evs.slice(0, this.config.maxPerDay).forEach((e) => {
        const block = document.createElement("div");
        block.className = "wb-event" + (e.fullDayEvent ? " allday" : "");

        const color = e.fullDayEvent && this.config.allDayColor ? this.config.allDayColor : e.color;
        if (color) block.style.setProperty("--c", color);

        if (!e.fullDayEvent) {
          const t = document.createElement("span");
          t.className = "t";
          t.textContent = moment(Number(e.startDate)).format("h:mma").replace(":00", "");
          block.appendChild(t);
        }

        const title = document.createElement("span");
        title.className = "title";
        title.textContent = e.title;
        block.appendChild(title);

        col.appendChild(block);
      });

      if (evs.length > this.config.maxPerDay) {
        const more = document.createElement("div");
        more.className = "wb-more";
        more.textContent = `+${evs.length - this.config.maxPerDay} more`;
        col.appendChild(more);
      }

      grid.appendChild(col);
    }
    return grid;
  }
});
