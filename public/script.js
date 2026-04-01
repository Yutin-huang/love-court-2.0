const complaintInput = document.getElementById("complaint");
const accusedInput = document.getElementById("accused");
const submitBtn = document.getElementById("submit-btn");
const verdictScreen = document.getElementById("verdict-screen");
const verdictText = document.getElementById("verdict-text");
const retryBtn = document.getElementById("retry-btn");
const contentArea = document.querySelector(".content");
const soundEffect = document.getElementById("sound-effect");
const loadingAnimation = document.getElementById("loading-animation");

const psychEl = document.querySelector(".verdict-psych");
const crimeEl = document.querySelector(".verdict-crime");
const suggestionEl = document.querySelector(".verdict-suggestion");
const judgementEl = document.querySelector(".verdict-judgement");

const recommendedMusicEl = document.getElementById("recommended-music");
const recommendedCoverEl = document.getElementById("recommended-music-cover");
const recommendedTitleEl = document.getElementById("recommended-music-title");
const recommendedMusicLinkEl = document.getElementById("recommended-music-link");
const recommendedAudioEl = document.getElementById(
  "recommended-music-audio"
);

const mediationApplyBtn = document.getElementById("mediation-apply-btn");
const mediationLinkContainer = document.getElementById(
  "mediation-link-container"
);

const mediationScreen = document.getElementById("mediation-screen");
const mediationLoadingEl = document.getElementById("mediation-loading");
const mediationContentEl = document.getElementById("mediation-content");
const mediationStatusEl = document.getElementById("mediation-status");
const mediationSoftenedStoryEl = document.getElementById(
  "mediation-softened-story"
);
const mediationAccusationTitleEl = document.getElementById(
  "mediation-accusation-title"
);
const mediationResponseInput = document.getElementById("mediation-response");
const mediationRespondBtn = document.getElementById(
  "mediation-respond-btn"
);
const mediationSettlementEl = document.getElementById("mediation-settlement-text");
const mediationCaseSummaryWrapEl = document.getElementById(
  "mediation-case-summary-wrap"
);
const mediationCaseSummaryEl = document.getElementById("mediation-case-summary");
const mediationSectionCreatedEl = document.getElementById(
  "mediation-section-created"
);
const mediationSectionRespondedEl = document.getElementById(
  "mediation-section-responded"
);
const mediationBackBtn = document.getElementById("mediation-back-btn");
const mediationRecommendedMusicEl = document.getElementById(
  "mediation-recommended-music"
);
const mediationRecommendedCoverEl = document.getElementById(
  "mediation-recommended-music-cover"
);
const mediationRecommendedTitleEl = document.getElementById(
  "mediation-recommended-music-title"
);
const mediationRecommendedMusicLinkEl = document.getElementById(
  "mediation-recommended-music-link"
);
const mediationRecommendedAudioEl = document.getElementById(
  "mediation-recommended-music-audio"
);
const verdictExportBtn = document.getElementById("verdict-export-btn");
const verdictShareBtn = document.getElementById("verdict-share-btn");
const verdictShareModal = document.getElementById("verdict-share-modal");

let currentVerdictId = null;
let currentMediationToken = null;
let currentRecommendedMusic = null;
/** 調停 GET 回傳的推薦曲；僅在完成和解書後才顯示，輸入答辯頁不播放 */
let mediationCachedRecommendedMusic = null;
let isAudioPrimed = false;
let homeBgAudio = null;

function show(el) {
  if (!el) return;
  el.classList.remove("hidden");
}

function hide(el) {
  if (!el) return;
  el.classList.add("hidden");
}

function initHomeBackgroundMusic() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("mediationToken")) return;

  const candidates = ["/dream%201.wav", "/sin%201.wav"];
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const audio = new Audio(pick);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = 0.35;
  audio.playsInline = true;
  homeBgAudio = audio;

  const tryPlay = () => {
    audio.play().catch(() => {});
  };

  // Try immediately first; fallback to first user gesture for mobile policies.
  tryPlay();
  document.addEventListener("pointerdown", tryPlay, { once: true });
}

function firstLineIncluding(verdict, keywords) {
  const lines = verdict.trim().split("\n");
  return lines.find((line) => keywords.some((k) => line.includes(k))) || "";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 依段落數對應判決書層級：標題 → 心理／裁定／建議／判決內文。
 */
function settlementParagraphTierClass(index, total) {
  if (total === 1) return "settlement-p--lead";
  if (total === 2) {
    return index === 0 ? "settlement-p--lead" : "settlement-p--judgement";
  }
  if (total === 3) {
    return ["settlement-p--lead", "settlement-p--psych", "settlement-p--judgement"][
      index
    ];
  }
  if (total === 4) {
    return [
      "settlement-p--lead",
      "settlement-p--psych",
      "settlement-p--crime",
      "settlement-p--judgement",
    ][index];
  }
  if (total === 5) {
    return [
      "settlement-p--lead",
      "settlement-p--psych",
      "settlement-p--crime",
      "settlement-p--suggestion",
      "settlement-p--judgement",
    ][index];
  }
  if (index === 0) return "settlement-p--lead";
  if (index === 1) return "settlement-p--psych";
  if (index === 2) return "settlement-p--crime";
  if (index === 3) return "settlement-p--suggestion";
  return "settlement-p--judgement";
}

/**
 * 從和解書全文拆出「【案件摘要】」區塊與其餘內容（供並排顯示）。
 */
function extractCaseSummaryAndRest(text) {
  const t = (text || "").trim();
  if (!t) return { summaryBody: "", rest: "" };
  const blockRe = /【案件摘要】[\s\S]*?(?=\n【[^】]+】|$)/;
  const m = t.match(blockRe);
  if (!m) return { summaryBody: "", rest: t };
  const fullBlock = m[0];
  const summaryBody = fullBlock.replace(/^【案件摘要】\s*/, "").trim();
  const rest = (t.slice(0, m.index) + t.slice(m.index + fullBlock.length)).trim();
  return { summaryBody, rest };
}

function splitSettlementParagraphs(text) {
  const t = (text || "").trim();
  if (!t) return [];
  let parts = t.split(/\n\s*\n/).filter((p) => p.length > 0);
  if (parts.length === 1 && /【/.test(parts[0])) {
    const byHeader = parts[0].split(/\n(?=【[^】]+】)/);
    if (byHeader.length > 1) {
      parts = byHeader.map((s) => s.trim()).filter(Boolean);
    }
  }
  return parts;
}

function formatSettlementHtml(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return "";
  const paras = splitSettlementParagraphs(trimmed);
  const total = paras.length;
  return paras
    .map((raw, i) => {
      const tier = settlementParagraphTierClass(i, total);
      const inner = escapeHtml(raw).replace(/\n/g, "<br>");
      return `<p class="settlement-p ${tier}">${inner}</p>`;
    })
    .join("");
}

function setMediationSettlementContent(text) {
  const { summaryBody, rest } = extractCaseSummaryAndRest(text || "");
  const hasSummary = Boolean(summaryBody);

  if (mediationCaseSummaryEl && mediationCaseSummaryWrapEl) {
    if (hasSummary) {
      mediationCaseSummaryEl.innerHTML = escapeHtml(summaryBody).replace(/\n/g, "<br>");
      mediationCaseSummaryWrapEl.classList.remove("hidden");
    } else {
      mediationCaseSummaryEl.innerHTML = "";
      mediationCaseSummaryWrapEl.classList.add("hidden");
    }
  }

  if (mediationSettlementEl) {
    mediationSettlementEl.innerHTML = formatSettlementHtml(rest);
  }
}

/**
 * Mobile autoplay policy workaround:
 * prime recommended audio in user gesture (submit click).
 */
async function primeRecommendedAudioForMobile() {
  if (isAudioPrimed) return;
  try {
    const unlockSrc =
      soundEffect?.currentSrc ||
      soundEffect?.querySelector("source")?.src ||
      "/gavel-sound.wav";

    // 1) 先解鎖推薦歌曲實際播放用的 audio element（成功率較高）
    if (recommendedAudioEl) {
      recommendedAudioEl.src = unlockSrc;
      recommendedAudioEl.muted = true;
      recommendedAudioEl.playsInline = true;
      await recommendedAudioEl.play();
      recommendedAudioEl.pause();
      recommendedAudioEl.currentTime = 0;
      recommendedAudioEl.removeAttribute("src");
      recommendedAudioEl.load();
    }

    // 2) 也解鎖審判音效元素
    if (soundEffect) {
      soundEffect.muted = true;
      await soundEffect.play();
      soundEffect.pause();
      soundEffect.currentTime = 0;
      soundEffect.muted = false;
    }

    isAudioPrimed = true;
  } catch (err) {
    // Ignore prime failure; manual tap fallback is handled later.
    console.log("⚠️ 音訊預解鎖失敗", err);
  }
}

function enableManualMusicPlayFallback(audioUrl) {
  if (!recommendedMusicEl || !recommendedAudioEl || !audioUrl) return;
  recommendedMusicEl.addEventListener(
    "click",
    () => {
      recommendedAudioEl.src = audioUrl;
      recommendedAudioEl.muted = false;
      recommendedAudioEl.volume = 0.8;
      recommendedAudioEl.loop = true;
      recommendedAudioEl.play().catch(() => {});
    },
    { once: true }
  );
}

function enableManualMediationMusicPlayFallback(audioUrl) {
  if (!mediationRecommendedMusicEl || !mediationRecommendedAudioEl || !audioUrl) {
    return;
  }
  mediationRecommendedMusicEl.addEventListener(
    "click",
    () => {
      mediationRecommendedAudioEl.src = audioUrl;
      mediationRecommendedAudioEl.muted = false;
      mediationRecommendedAudioEl.volume = 0.8;
      mediationRecommendedAudioEl.loop = true;
      mediationRecommendedAudioEl.play().catch(() => {});
    },
    { once: true }
  );
}

/** 自動播放被阻擋時，使用者第一次在調停畫面任一處觸控即嘗試背景播放 */
function attachMediationAudioResumeOnFirstPointer(audioUrl) {
  if (!mediationScreen || !mediationRecommendedAudioEl || !audioUrl) return;
  mediationScreen.addEventListener(
    "pointerdown",
    () => {
      const el = mediationRecommendedAudioEl;
      if (!el.src) el.src = audioUrl;
      el.muted = false;
      el.volume = 0.8;
      el.loop = true;
      el.playsInline = true;
      el.play().catch(() => {});
    },
    { once: true }
  );
}

/**
 * 設定 src 後等媒體可播再 play（避免 load() + 立即 play 早於緩衝而失敗）
 */
function startMediationBackgroundAudio(audioUrl) {
  const el = mediationRecommendedAudioEl;
  if (!el || !audioUrl) return;

  const onFail = () => {
    enableManualMediationMusicPlayFallback(audioUrl);
    attachMediationAudioResumeOnFirstPointer(audioUrl);
  };

  el.pause();
  el.removeAttribute("src");
  el.muted = false;
  el.volume = 0.8;
  el.loop = true;
  el.playsInline = true;
  el.setAttribute("playsinline", "");
  el.setAttribute("webkit-playsinline", "");

  const tryPlay = () => {
    el.play().catch((err) => {
      console.log("⚠️ 調停頁推播歌曲播放失敗", err);
      onFail();
    });
  };

  const onReady = () => {
    tryPlay();
  };

  el.addEventListener("canplay", onReady, { once: true });
  el.addEventListener(
    "error",
    () => {
      el.removeEventListener("canplay", onReady);
      onFail();
    },
    { once: true }
  );

  el.src = audioUrl;
  el.load();
}

function applyMediationRecommendedMusic(music) {
  if (!mediationRecommendedMusicEl) return;
  if (mediationRecommendedAudioEl) {
    mediationRecommendedAudioEl.pause();
    mediationRecommendedAudioEl.removeAttribute("src");
    mediationRecommendedAudioEl.currentTime = 0;
  }
  if (!music || typeof music !== "object") {
    mediationRecommendedMusicEl.classList.add("hidden");
    return;
  }
  const { coverUrl, songTitle, audioUrl, listenUrl, spotifyUrl } = music;
  currentRecommendedMusic = music;
  if (mediationRecommendedCoverEl && coverUrl) {
    mediationRecommendedCoverEl.src = coverUrl;
  }
  if (mediationRecommendedTitleEl) {
    mediationRecommendedTitleEl.textContent = songTitle || "";
  }
  if (mediationRecommendedMusicLinkEl) {
    mediationRecommendedMusicLinkEl.href =
      spotifyUrl || listenUrl || "https://linktr.ee/Yutin_Huang";
  }
  mediationRecommendedMusicEl.classList.remove("hidden");
  try {
    if (mediationRecommendedAudioEl && audioUrl) {
      startMediationBackgroundAudio(audioUrl);
    }
  } catch (err) {
    console.log("⚠️ 調停頁推播歌曲錯誤", err);
    enableManualMediationMusicPlayFallback(audioUrl);
  }
}

function formatMediationAccusationTitle(crimeRaw) {
  const charge = (crimeRaw || "")
    .replace(/^裁定[：:]\s*/, "")
    .trim();
  const part = charge || "……";
  return `您已被指控為「${part}」罪，以下為原告控訴內容`;
}

function scrollMediationLinkIntoView() {
  if (!mediationLinkContainer) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      mediationLinkContainer.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  });
}

/** Instagram 限時動態建議 1080×1920（9:16） */
const IG_STORY_W = 1080;
const IG_STORY_H = 1920;

/**
 * 輸出 9:16：等比例縮放（文字不變形），以「置中裁切」填滿畫面（類似 object-fit: cover）。
 */
/** 9:16 畫布：漸層底 + 判決截圖等比例置中（不變形），四周留白 */
function composeVerdictForInstagramStory(verdictCanvas) {
  const out = document.createElement("canvas");
  out.width = IG_STORY_W;
  out.height = IG_STORY_H;
  const ctx = out.getContext("2d");
  if (!ctx) return verdictCanvas;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const g = ctx.createLinearGradient(0, 0, 0, IG_STORY_H);
  g.addColorStop(0, "#ffe8f4");
  g.addColorStop(0.45, "#fff8fc");
  g.addColorStop(1, "#e6ecff");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, IG_STORY_W, IG_STORY_H);

  const maxW = IG_STORY_W * 0.9;
  const maxH = IG_STORY_H * 0.76;
  const w = verdictCanvas.width;
  const h = verdictCanvas.height;
  const scale = Math.min(maxW / w, maxH / h);
  const dw = w * scale;
  const dh = h * scale;
  const x = (IG_STORY_W - dw) / 2;
  const y = (IG_STORY_H - dh) / 2;

  ctx.save();
  ctx.shadowColor = "rgba(50, 65, 120, 0.22)";
  ctx.shadowBlur = 28;
  ctx.shadowOffsetY = 10;
  ctx.drawImage(verdictCanvas, x, y, dw, dh);
  ctx.restore();

  return out;
}

async function captureVerdictPngBlob() {
  const captureTarget = document.getElementById("verdict-text");
  if (!captureTarget || captureTarget.classList.contains("hidden")) return null;
  if (typeof window.html2canvas !== "function") {
    console.error("html2canvas 尚未載入");
    return null;
  }

  const filename = `戀愛判決書-${new Date().toISOString().slice(0, 10)}-限時9x16.png`;
  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
    const rawCanvas = await window.html2canvas(captureTarget, {
      scale: Math.max(2, window.devicePixelRatio || 1),
      backgroundColor: null,
      useCORS: true,
      onclone(clonedDoc) {
        const root = clonedDoc.getElementById("verdict-text");
        const btnRow = root?.querySelector(".verdict-buttons");
        if (btnRow) btnRow.style.display = "none";
      },
    });
    const storyCanvas = composeVerdictForInstagramStory(rawCanvas);
    const blob = await new Promise((resolve) =>
      storyCanvas.toBlob(resolve, "image/png", 1)
    );
    if (!blob) return null;
    return { blob, filename };
  } catch (err) {
    console.error("判決書截圖失敗", err);
    return null;
  }
}

async function exportVerdictDownload() {
  const result = await captureVerdictPngBlob();
  if (!result) return;
  const { blob, filename } = result;
  const ua = navigator.userAgent || "";
  const isMobile = /iPhone|iPad|iPod|Android/i.test(ua);

  // Mobile browsers (especially iOS Safari) often ignore blob downloads.
  // Prefer native share sheet so users can directly save image.
  if (isMobile && navigator.share) {
    try {
      const file = new File([blob], filename, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "戀愛判決書",
          text: "LoveCourt 戀愛判決書",
        });
        return;
      }
    } catch (e) {
      if (e?.name === "AbortError") return;
      console.log("⚠️ 手機分享儲存失敗，改用圖片預覽", e);
    }
  }

  const url = URL.createObjectURL(blob);

  // Mobile fallback: open image in new tab for long-press save.
  if (isMobile) {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      window.location.href = url;
    }
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);
    window.alert("已開啟圖片預覽頁，請長按圖片即可儲存到相簿。");
    return;
  }

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 200);
}

function getSharePageUrl() {
  return window.location.href.split("#")[0];
}

function openFacebookFeedShare() {
  const u = encodeURIComponent(getSharePageUrl());
  window.open(
    `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    "_blank",
    "noopener,noreferrer"
  );
}

async function shareToInstagramStory() {
  const result = await captureVerdictPngBlob();
  if (!result) return;
  const { blob, filename } = result;
  const file = new File([blob], filename, { type: "image/png" });
  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: "戀愛判決書",
        text: "LoveCourt 戀愛判決書",
      });
      return;
    }
  } catch (e) {
    if (e.name === "AbortError") return;
  }
  window.alert(
    "此裝置無法直接帶圖到限時。請先用「下載」儲存圖片，再開啟 Instagram 發限時動態。"
  );
}

function openFacebookMessengerShare() {
  const link = encodeURIComponent(getSharePageUrl());
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod|Android/i.test(ua)) {
    window.location.href = `fb-messenger://share?link=${link}`;
  } else {
    window.open("https://www.messenger.com/", "_blank", "noopener,noreferrer");
  }
}

function openInstagramDirectInbox() {
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) {
    window.location.href = "instagram://direct-inbox";
  } else if (/Android/i.test(ua)) {
    window.location.href =
      "intent://instagram.com/direct/inbox/#Intent;scheme=https;package=com.instagram.android;end";
  } else {
    window.open(
      "https://www.instagram.com/direct/inbox/",
      "_blank",
      "noopener,noreferrer"
    );
  }
}

function verdictShareModalOpen() {
  if (!verdictShareModal) return;
  verdictShareModal.classList.remove("hidden");
  verdictShareModal.setAttribute("aria-hidden", "false");
}

function verdictShareModalClose() {
  if (!verdictShareModal) return;
  verdictShareModal.classList.add("hidden");
  verdictShareModal.setAttribute("aria-hidden", "true");
}

function getSmartPlatformCandidates(queryText) {
  const encoded = encodeURIComponent(queryText || "黃于庭 LoveCourt");
  const ua = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  if (isIOS) {
    return [
      {
        appUrl: `music://music.apple.com/search?term=${encoded}`,
        webUrl: `https://music.apple.com/tw/search?term=${encoded}`,
      },
      {
        appUrl: `spotify://search/${encoded}`,
        webUrl: `https://open.spotify.com/search/${encoded}`,
      },
      {
        appUrl: `youtubemusic://search?q=${encoded}`,
        webUrl: `https://music.youtube.com/search?q=${encoded}`,
      },
    ];
  }

  if (isAndroid) {
    return [
      {
        appUrl: `spotify://search/${encoded}`,
        webUrl: `https://open.spotify.com/search/${encoded}`,
      },
      {
        appUrl: `youtubemusic://search?q=${encoded}`,
        webUrl: `https://music.youtube.com/search?q=${encoded}`,
      },
      {
        appUrl: `kkbox://search?word=${encoded}`,
        webUrl: `https://www.kkbox.com/tw/tc/search.php?word=${encoded}`,
      },
    ];
  }

  return [
    {
      appUrl: "",
      webUrl: `https://open.spotify.com/search/${encoded}`,
    },
    {
      appUrl: "",
      webUrl: `https://music.youtube.com/search?q=${encoded}`,
    },
  ];
}

function smartOpenStreaming(queryText, fallbackUrl) {
  const candidates = getSmartPlatformCandidates(queryText);
  const first = candidates[0];
  if (!first) {
    window.location.href = fallbackUrl;
    return;
  }

  let pageHidden = false;
  let pageBlurred = false;
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") pageHidden = true;
  };
  const onBlur = () => {
    pageBlurred = true;
  };
  document.addEventListener("visibilitychange", onVisibilityChange, {
    once: true,
  });
  window.addEventListener("blur", onBlur, { once: true });

  if (first.appUrl) {
    // User-gesture navigation has higher chance to open native app.
    window.location.href = first.appUrl;
  }

  setTimeout(() => {
    if (!pageHidden && !pageBlurred) {
      window.location.href = first.webUrl || fallbackUrl;
    }
  }, 1800);

  // Final fallback if web/search still unavailable
  setTimeout(() => {
    if (!pageHidden && !pageBlurred && fallbackUrl) {
      window.location.href = fallbackUrl;
    }
  }, 4000);
}

/** 指定 Spotify 單曲連結：先嘗試 App deep link，再開網頁版 */
function openSpotifyTrackPage(webUrl, fallbackUrl) {
  const m = webUrl.match(/\/track\/([a-zA-Z0-9]+)/);
  const id = m?.[1];
  let hidden = false;
  const onVis = () => {
    if (document.visibilityState === "hidden") hidden = true;
  };
  document.addEventListener("visibilitychange", onVis, { once: true });

  if (id) {
    window.location.href = `spotify:track:${id}`;
  }
  setTimeout(() => {
    if (!hidden) window.location.href = webUrl;
  }, 1200);
  setTimeout(() => {
    if (!hidden && fallbackUrl) window.location.href = fallbackUrl;
  }, 4500);
}

async function createMediation() {
  if (!currentVerdictId) return;

  try {
    hide(mediationLinkContainer);
    if (mediationLinkContainer) mediationLinkContainer.textContent = "";

    if (mediationApplyBtn) mediationApplyBtn.disabled = true;
    const prevText = mediationApplyBtn ? mediationApplyBtn.textContent : "";
    if (mediationApplyBtn) mediationApplyBtn.textContent = "產生中...";

    const response = await fetch("/api/mediation/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ verdictId: currentVerdictId }),
    });
    const data = await response.json();

    if (!response.ok) {
      if (mediationLinkContainer) {
        mediationLinkContainer.textContent = data.error || "建立調停失敗";
        show(mediationLinkContainer);
        scrollMediationLinkIntoView();
      }
      return;
    }

    const linkText = data.link || "";
    if (mediationLinkContainer) {
      mediationLinkContainer.innerHTML = `
        <div>把調解連結傳給你的對方吧！</div>
        <a href="${linkText}" target="_blank" rel="noopener noreferrer">${linkText}</a>
      `;
      show(mediationLinkContainer);
      scrollMediationLinkIntoView();
    }
  } catch (err) {
    console.error("Mediation create error:", err);
    if (mediationLinkContainer) {
      mediationLinkContainer.textContent = "建立調停失敗（系統錯誤）";
      show(mediationLinkContainer);
      scrollMediationLinkIntoView();
    }
  } finally {
    if (mediationApplyBtn) {
      mediationApplyBtn.disabled = false;
      mediationApplyBtn.textContent = prevText || "申請調停";
    }
  }
}

async function loadMediation(token) {
  currentMediationToken = token;

  hide(mediationContentEl);
  show(mediationLoadingEl);

  try {
    const response = await fetch(`/api/mediation/${token}`);
    const data = await response.json();

    hide(mediationLoadingEl);
    show(mediationContentEl);

    if (!response.ok) {
      if (mediationStatusEl) mediationStatusEl.textContent = data.error || "讀取調停失敗";
      hide(mediationSectionCreatedEl);
      hide(mediationSectionRespondedEl);
      mediationCachedRecommendedMusic = null;
      applyMediationRecommendedMusic(null);
      return;
    }

    if (mediationStatusEl) {
      mediationStatusEl.textContent =
        data.status === "responded" ? "狀態：已完成回覆" : "狀態：調解中";
    }

    mediationCachedRecommendedMusic =
      data.recommendedMusic && typeof data.recommendedMusic === "object"
        ? data.recommendedMusic
        : null;

    if (mediationAccusationTitleEl) {
      mediationAccusationTitleEl.textContent = formatMediationAccusationTitle(
        data.crime
      );
    }

    if (mediationSoftenedStoryEl) {
      mediationSoftenedStoryEl.textContent = data.softenedStory || "";
    }

    if (data.status === "responded") {
      setMediationSettlementContent(data.settlementText || "");
      hide(mediationSectionCreatedEl);
      show(mediationSectionRespondedEl);
      applyMediationRecommendedMusic(mediationCachedRecommendedMusic);
    } else {
      hide(mediationSectionRespondedEl);
      show(mediationSectionCreatedEl);
      applyMediationRecommendedMusic(null);
    }
  } catch (err) {
    console.error("Mediation load error:", err);
    hide(mediationLoadingEl);
    show(mediationContentEl);
    if (mediationStatusEl) mediationStatusEl.textContent = "讀取調停失敗";
    mediationCachedRecommendedMusic = null;
    applyMediationRecommendedMusic(null);
  }
}

async function respondMediation() {
  if (!currentMediationToken) return;

  const responseText = (mediationResponseInput?.value || "").trim();
  if (!responseText) return;

  try {
    if (mediationRespondBtn) mediationRespondBtn.disabled = true;
    show(mediationLoadingEl);
    hide(mediationContentEl);

    const response = await fetch(
      `/api/mediation/${currentMediationToken}/respond`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: responseText }),
      }
    );

    const data = await response.json();

    hide(mediationLoadingEl);
    show(mediationContentEl);

    if (!response.ok) {
      if (mediationStatusEl) mediationStatusEl.textContent = data.error || "回覆失敗";
      return;
    }

    setMediationSettlementContent(data.settlementText || "");
    if (mediationStatusEl) mediationStatusEl.textContent = "狀態：已完成回覆";

    hide(mediationSectionCreatedEl);
    show(mediationSectionRespondedEl);
    applyMediationRecommendedMusic(mediationCachedRecommendedMusic);
  } catch (err) {
    console.error("Mediation respond error:", err);
    hide(mediationLoadingEl);
    show(mediationContentEl);
    if (mediationStatusEl) mediationStatusEl.textContent = "生成和解書失敗";
  } finally {
    if (mediationRespondBtn) mediationRespondBtn.disabled = false;
  }
}

// ✅ 再上訴（重置畫面與音訊）
retryBtn.addEventListener("click", () => {
  complaintInput.value = "";
  if (accusedInput) accusedInput.value = "";
  verdictScreen.classList.add("hidden");
  contentArea.classList.remove("hidden");
  retryBtn.classList.add("hidden");
  verdictText.classList.add("hidden");

  if (recommendedMusicEl) recommendedMusicEl.classList.add("hidden");
  if (recommendedAudioEl) {
    recommendedAudioEl.pause();
    recommendedAudioEl.currentTime = 0;
  }

  currentVerdictId = null;
  if (mediationApplyBtn) mediationApplyBtn.classList.add("hidden");
  if (verdictExportBtn) verdictExportBtn.classList.add("hidden");
  if (verdictShareBtn) verdictShareBtn.classList.add("hidden");
  verdictShareModalClose();
  if (mediationLinkContainer) {
    mediationLinkContainer.classList.add("hidden");
    mediationLinkContainer.textContent = "";
  }

  soundEffect.pause();
  soundEffect.currentTime = 0;
});

if (mediationApplyBtn) {
  mediationApplyBtn.addEventListener("click", () => createMediation());
}

if (mediationRespondBtn) {
  mediationRespondBtn.addEventListener("click", () => respondMediation());
}

if (mediationBackBtn) {
  mediationBackBtn.addEventListener("click", () => {
    window.location.href = "/";
  });
}

if (verdictExportBtn) {
  verdictExportBtn.addEventListener("click", () => {
    exportVerdictDownload();
  });
}

if (verdictShareBtn) {
  verdictShareBtn.addEventListener("click", () => {
    verdictShareModalOpen();
  });
}

if (verdictShareModal) {
  const shareBackdrop = verdictShareModal.querySelector(".verdict-share-backdrop");
  const shareCancel = verdictShareModal.querySelector(".verdict-share-cancel");
  shareBackdrop?.addEventListener("click", () => verdictShareModalClose());
  shareCancel?.addEventListener("click", () => verdictShareModalClose());
  verdictShareModal.querySelectorAll(".verdict-share-option").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const target = btn.dataset.shareTarget;
      verdictShareModalClose();
      switch (target) {
        case "fb-feed":
          openFacebookFeedShare();
          break;
        case "ig-story":
          await shareToInstagramStory();
          break;
        case "fb-messenger":
          openFacebookMessengerShare();
          break;
        case "ig-dm":
          openInstagramDirectInbox();
          break;
        default:
          break;
      }
    });
  });
}

function handleRecommendedMusicLinkClick(event) {
  event.preventDefault();
  const fallbackUrl =
    currentRecommendedMusic?.listenUrl || "https://linktr.ee/Yutin_Huang";
  const spotifyUrl = currentRecommendedMusic?.spotifyUrl;
  if (spotifyUrl && typeof spotifyUrl === "string") {
    openSpotifyTrackPage(spotifyUrl, fallbackUrl);
    return;
  }
  const queryText =
    currentRecommendedMusic?.streamQuery ||
    `${currentRecommendedMusic?.songTitle || ""} 黃于庭`;
  smartOpenStreaming(queryText, fallbackUrl);
}

if (recommendedMusicLinkEl) {
  recommendedMusicLinkEl.addEventListener("click", handleRecommendedMusicLinkClick);
}

if (mediationRecommendedMusicLinkEl) {
  mediationRecommendedMusicLinkEl.addEventListener(
    "click",
    handleRecommendedMusicLinkClick
  );
}

// ✅ 審判按下後流程
submitBtn.addEventListener("click", async () => {
  const story = complaintInput.value.trim();
  if (!story) return;
  const accused = accusedInput ? accusedInput.value.trim() : "";
  await primeRecommendedAudioForMobile();

  if (homeBgAudio) {
    homeBgAudio.pause();
    homeBgAudio.currentTime = 0;
  }

  currentVerdictId = null;
  if (mediationApplyBtn) hide(mediationApplyBtn);
  if (verdictExportBtn) hide(verdictExportBtn);
  if (verdictShareBtn) hide(verdictShareBtn);
  verdictShareModalClose();
  if (mediationLinkContainer) {
    hide(mediationLinkContainer);
    mediationLinkContainer.textContent = "";
  }

  if (recommendedMusicEl) recommendedMusicEl.classList.add("hidden");
  if (recommendedAudioEl) {
    recommendedAudioEl.pause();
    recommendedAudioEl.currentTime = 0;
  }
  currentRecommendedMusic = null;

  // ✅ 顯示「判決中」畫面
  verdictScreen.classList.remove("hidden");
  contentArea.classList.add("hidden");
  verdictText.classList.add("hidden");
  retryBtn.classList.add("hidden");
  loadingAnimation.classList.remove("hidden");

  // ✅ 播放審判音效
  soundEffect.currentTime = 0;
  soundEffect.play();
  setTimeout(() => {
    soundEffect.pause();
    soundEffect.currentTime = 0;
  }, 4000);

  // ✅ 顯示判決內容（呼叫 GPT，不延遲；推播曲與判決同步出現）
  (async () => {
    try {
      const response = await fetch("/api/verdict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story, accused }),
      });

      const data = await response.json();
      console.log("✅ GPT 回傳資料：", data);

      loadingAnimation.classList.add("hidden");
      verdictText.classList.remove("hidden");

      if (!response.ok) {
        if (psychEl) psychEl.textContent = "";
        crimeEl.textContent = data.error || "請求失敗";
        suggestionEl.textContent = "";
        judgementEl.textContent = "";
        retryBtn.classList.remove("hidden");
        if (recommendedMusicEl) recommendedMusicEl.classList.add("hidden");
        if (verdictExportBtn) hide(verdictExportBtn);
        if (verdictShareBtn) hide(verdictShareBtn);
        return;
      }

      if (data.verdict && typeof data.verdict === "string") {
        if (data.psychTest) {
          psychEl.textContent = "心理測驗：" + data.psychTest;
        } else {
          const lines = data.verdict.trim().split("\n");
          const psychLine = lines.find((line) => line.includes("心理測驗"));
          psychEl.textContent = psychLine || "";
        }
        crimeEl.textContent = data.crime
          ? "裁定：" + data.crime
          : firstLineIncluding(data.verdict, ["裁定：", "被告被起訴為"]) ||
            "（未提供裁定）";
        suggestionEl.textContent = data.suggestion
          ? "建議：" + data.suggestion
          : firstLineIncluding(data.verdict, ["建議："]);
        judgementEl.textContent = data.judgement
          ? "判決：" + data.judgement
          : firstLineIncluding(data.verdict, ["判決：", "本庭裁定"]);
      } else {
        psychEl.textContent = "";
        crimeEl.textContent = "法官今天沒精神...請稍後再試。";
        suggestionEl.textContent = "";
        judgementEl.textContent = "";
      }

      currentVerdictId = data.verdictId || null;

      // ✅ 推播歌曲（依案件類型，並隨機挑選同資料夾歌曲）
      if (recommendedMusicEl) recommendedMusicEl.classList.add("hidden");
      if (recommendedAudioEl) {
        recommendedAudioEl.pause();
        recommendedAudioEl.currentTime = 0;
      }
      currentRecommendedMusic = null;
      if (data.recommendedMusic && typeof data.recommendedMusic === "object") {
        const { coverUrl, songTitle, audioUrl, listenUrl, spotifyUrl } =
          data.recommendedMusic;
        currentRecommendedMusic = data.recommendedMusic;
        if (recommendedCoverEl && coverUrl) recommendedCoverEl.src = coverUrl;
        if (recommendedTitleEl) recommendedTitleEl.textContent = songTitle || "";
        if (recommendedMusicLinkEl) {
          recommendedMusicLinkEl.href =
            spotifyUrl || listenUrl || "https://linktr.ee/Yutin_Huang";
        }
        if (recommendedMusicEl) recommendedMusicEl.classList.remove("hidden");

        try {
          if (recommendedAudioEl && audioUrl) {
            recommendedAudioEl.src = audioUrl;
            recommendedAudioEl.volume = 0.8;
            recommendedAudioEl.loop = true;
            recommendedAudioEl.playsInline = true;
            recommendedAudioEl.play().catch((err) => {
              console.log("⚠️ 推播歌曲播放失敗", err);
              enableManualMusicPlayFallback(audioUrl);
            });
          }
        } catch (err) {
          console.log("⚠️ 推播歌曲播放錯誤", err);
          enableManualMusicPlayFallback(audioUrl);
        }
      }

      if (mediationApplyBtn && currentVerdictId) {
        show(mediationApplyBtn);
      } else if (mediationApplyBtn) {
        hide(mediationApplyBtn);
      }

      retryBtn.classList.remove("hidden");
      if (verdictExportBtn) show(verdictExportBtn);
      if (verdictShareBtn) show(verdictShareBtn);
    } catch (err) {
      console.error("❌ 發送錯誤：", err);
      loadingAnimation.classList.add("hidden");
      verdictText.classList.remove("hidden");
      if (psychEl) psychEl.textContent = "";
      crimeEl.textContent = "系統錯誤：" + err.message;
      suggestionEl.textContent = "";
      judgementEl.textContent = "";
      if (recommendedMusicEl) recommendedMusicEl.classList.add("hidden");
      retryBtn.classList.remove("hidden");
      if (verdictExportBtn) hide(verdictExportBtn);
      if (verdictShareBtn) hide(verdictShareBtn);
    }
  })();
});


// ✅ token 進入調停流程
(() => {
  initHomeBackgroundMusic();

  const params = new URLSearchParams(window.location.search);
  const token = params.get("mediationToken");
  if (!token) return;

  // 隱藏判決頁、改顯示調停頁
  if (verdictScreen) verdictScreen.classList.add("hidden");
  if (contentArea) contentArea.classList.add("hidden");
  if (mediationScreen) show(mediationScreen);

  if (recommendedAudioEl) {
    recommendedAudioEl.pause();
    recommendedAudioEl.currentTime = 0;
  }
  if (homeBgAudio) {
    homeBgAudio.pause();
    homeBgAudio.currentTime = 0;
  }

  if (mediationBackBtn) mediationBackBtn.focus?.();
  loadMediation(token);
})();

