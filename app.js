(function () {
  "use strict";

  var state = { category: "전체", sort: "views", query: "" };
  var data = null;
  var grid = document.getElementById("grid");
  var empty = document.getElementById("empty");
  var resultLine = document.getElementById("result-line");
  var notice = document.getElementById("notice");
  var tpl = document.getElementById("card-template");

  var ICON_EYE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/></svg>';
  var ICON_HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.4-7-9.2A4 4 0 0 1 12 8a4 4 0 0 1 7 2.8C19 15.6 12 20 12 20z"/></svg>';
  var ICON_TALK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 15.2c0 .9-.8 1.6-1.7 1.6H8l-4 3V6.4C4 5.5 4.8 4.8 5.7 4.8h12.6c.9 0 1.7.7 1.7 1.6z"/></svg>';
  var ICON_CLOCK = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';

  function formatCount(n) {
    if (typeof n !== "number" || isNaN(n)) return "—";
    if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, "") + "억";
    if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, "") + "만";
    return n.toLocaleString("ko-KR");
  }

  function formatDuration(sec) {
    if (!sec && sec !== 0) return "";
    if (sec >= 60) {
      var m = Math.floor(sec / 60);
      var s = Math.round(sec % 60);
      return m + "분" + (s ? " " + s + "초" : "");
    }
    return sec + "초";
  }

  function relativeTime(iso) {
    var then = new Date(iso).getTime();
    var diffMin = Math.floor((Date.now() - then) / 60000);
    if (diffMin < 1) return "방금 전";
    if (diffMin < 60) return diffMin + "분 전";
    var h = Math.floor(diffMin / 60);
    if (h < 24) return h + "시간 전";
    var d = Math.floor(h / 24);
    if (d < 7) return d + "일 전";
    return Math.floor(d / 7) + "주 전";
  }

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function stamp(iso, withTime) {
    var d = new Date(iso);
    var s = d.getFullYear() + "." + pad(d.getMonth() + 1) + "." + pad(d.getDate());
    if (withTime) s += " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    return s;
  }

  function platformLabel(p) {
    if (p === "instagram") return "INSTAGRAM REELS";
    if (p === "youtube") return "YOUTUBE SHORTS";
    return String(p || "").toUpperCase();
  }

  function linkLabel(p) {
    return p === "instagram" ? "릴스 보러가기" : "쇼츠 보러가기";
  }

  function creatorLine(item) {
    if (item.platform === "instagram" && item.handle) {
      var s = "@" + item.handle;
      var name = item.creator && item.creator !== item.handle ? " · " + item.creator : "";
      var f = item.followers ? " · 팔로워 " + formatCount(item.followers) : "";
      return s + name + f;
    }
    return item.creator || "";
  }

  function matches(item) {
    if (state.category !== "전체" && item.category !== state.category) return false;
    if (!state.query) return true;
    var q = state.query.toLowerCase();
    var hay = [item.title, item.creator, item.handle, item.point, item.category].join(" ").toLowerCase();
    return hay.indexOf(q) !== -1;
  }

  function sorted(items) {
    var copy = items.slice();
    if (state.sort === "views") {
      copy.sort(function (a, b) { return (b.views || 0) - (a.views || 0); });
    } else {
      copy.sort(function (a, b) { return new Date(b.publishedAt) - new Date(a.publishedAt); });
    }
    return copy;
  }

  function render() {
    if (!data) return;
    var items = sorted(data.reels.filter(matches));
    grid.textContent = "";

    items.forEach(function (item) {
      var node = tpl.content.cloneNode(true);
      var badge = node.querySelector(".badge");
      badge.textContent = item.category;
      badge.setAttribute("data-cat", item.category);

      node.querySelector(".platform").textContent = platformLabel(item.platform);

      var ad = node.querySelector(".ad");
      if (item.ad) ad.hidden = false;

      node.querySelector(".time").textContent = relativeTime(item.publishedAt);
      node.querySelector(".time").title = stamp(item.publishedAt, true) + " 게시";

      node.querySelector(".title").textContent = item.title;
      node.querySelector(".creator").textContent = creatorLine(item);

      var parts = ["<span>" + ICON_EYE + "조회수 " + formatCount(item.views) + (item.platform === "instagram" ? "*" : "") + "</span>"];
      if (item.likesHidden) {
        parts.push("<span>" + ICON_HEART + "좋아요 비공개</span>");
      } else if (typeof item.likes === "number") {
        parts.push("<span>" + ICON_HEART + "좋아요 " + formatCount(item.likes) + "</span>");
      }
      if (typeof item.comments === "number") {
        parts.push("<span>" + ICON_TALK + "댓글 " + formatCount(item.comments) + "</span>");
      }
      if (item.durationSec) {
        parts.push("<span>" + ICON_CLOCK + formatDuration(item.durationSec) + "</span>");
      }
      node.querySelector(".metrics").innerHTML = parts.join("");

      node.querySelector(".point").textContent = item.point;

      var go = node.querySelector(".go");
      go.href = item.url;
      go.innerHTML = linkLabel(item.platform) + ' <span aria-hidden="true">↗</span>';

      var checked = "게시 " + stamp(item.publishedAt, true) + "\n지표 확인 " + stamp(data.verifiedAt, true);
      node.querySelector(".checked").textContent = checked;

      grid.appendChild(node);
    });

    empty.hidden = items.length !== 0;
    resultLine.textContent = state.query
      ? "'" + state.query + "' 검색 결과 " + items.length + "개"
      : (state.category === "전체" ? "전체 " : state.category + " ") + items.length + "개 · " +
        (state.sort === "views" ? "조회수 높은 순" : "최근 게시 순");
  }

  function setData(payload) {
    data = payload;
    document.getElementById("updated-at").textContent = stamp(payload.generatedAt, true) + " KST";
    document.getElementById("total-count").textContent = payload.reels.length + "개";

    var counts = { "전체": payload.reels.length, "여행": 0, "자취·살림": 0, "다이어트": 0 };
    payload.reels.forEach(function (r) { counts[r.category] = (counts[r.category] || 0) + 1; });
    [].forEach.call(document.querySelectorAll(".tab-count"), function (el) {
      el.textContent = counts[el.dataset.count] || 0;
    });

    if (notice) {
      var byCat = ["여행", "자취·살림", "다이어트"].map(function (c) { return c + " " + (counts[c] || 0) + "개"; }).join(" · ");
      var ws = new Date(payload.windowStart), we = new Date(payload.windowEnd);
      var span = (ws.getMonth() + 1) + "." + ws.getDate() + "~" + (we.getMonth() + 1) + "." + we.getDate();
      notice.textContent = "조회수 20만 이상만 담았습니다. 최근 14일(" + span + ") 확인된 항목은 " + byCat + "입니다.";
      notice.hidden = false;
    }

    var footnote = document.getElementById("footnote");
    if (footnote) {
      var hasIg = payload.reels.some(function (r) { return r.platform === "instagram"; });
      footnote.hidden = !hasIg;
    }

    render();
  }

  document.getElementById("tabs").addEventListener("click", function (e) {
    var btn = e.target.closest(".tab");
    if (!btn) return;
    state.category = btn.dataset.cat;
    [].forEach.call(this.querySelectorAll(".tab"), function (el) {
      var on = el === btn;
      el.classList.toggle("is-active", on);
      el.setAttribute("aria-selected", on ? "true" : "false");
    });
    render();
  });

  document.querySelector(".sort").addEventListener("click", function (e) {
    var btn = e.target.closest(".sort-btn");
    if (!btn) return;
    state.sort = btn.dataset.sort;
    [].forEach.call(this.querySelectorAll(".sort-btn"), function (el) {
      var on = el === btn;
      el.classList.toggle("is-active", on);
      el.setAttribute("aria-pressed", on ? "true" : "false");
    });
    render();
  });

  var searchTimer;
  document.getElementById("search").addEventListener("input", function (e) {
    var value = e.target.value.trim();
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () {
      state.query = value;
      render();
    }, 120);
  });

  fetch("data/reels.json", { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(setData)
    .catch(function (err) {
      resultLine.textContent = "데이터를 불러오지 못했어요 (" + err.message + "). 잠시 뒤 새로고침해 주세요.";
    });
})();
