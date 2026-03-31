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
const mediationResponseInput = document.getElementById("mediation-response");
const mediationRespondBtn = document.getElementById(
  "mediation-respond-btn"
);
const mediationSettlementEl = document.getElementById("mediation-settlement-text");
const mediationSectionCreatedEl = document.getElementById(
  "mediation-section-created"
);
const mediationSectionRespondedEl = document.getElementById(
  "mediation-section-responded"
);
const mediationBackBtn = document.getElementById("mediation-back-btn");

let currentVerdictId = null;
let currentMediationToken = null;
let currentRecommendedMusic = null;
let isAudioPrimed = false;

function show(el) {
  if (!el) return;
  el.classList.remove("hidden");
}

function hide(el) {
  if (!el) return;
  el.classList.add("hidden");
}

function firstLineIncluding(verdict, keywords) {
  const lines = verdict.trim().split("\n");
  return lines.find((line) => keywords.some((k) => line.includes(k))) || "";
}

/**
 * Mobile autoplay policy workaround:
 * prime recommended audio in user gesture (submit click).
 */
async function primeRecommendedAudioForMobile() {
  if (isAudioPrimed) return;
  try {
    const unlockSrc = soundEffect?.currentSrc || "/gavel-sound.wav";
    // Use a temporary audio object to avoid racing/overwriting the real
    // recommended music element.
    const primer = new Audio(unlockSrc);
    primer.muted = true;
    primer.playsInline = true;
    await primer.play();
    primer.pause();
    primer.currentTime = 0;
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
      }
      return;
    }

    const linkText = data.link || "";
    if (mediationLinkContainer) {
      mediationLinkContainer.innerHTML = `
        <div>已生成你的調停連結</div>
        <a href="${linkText}" target="_blank" rel="noopener noreferrer">${linkText}</a>
      `;
      show(mediationLinkContainer);
    }
  } catch (err) {
    console.error("Mediation create error:", err);
    if (mediationLinkContainer) {
      mediationLinkContainer.textContent = "建立調停失敗（系統錯誤）";
      show(mediationLinkContainer);
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
      return;
    }

    if (mediationStatusEl) {
      mediationStatusEl.textContent =
        data.status === "responded" ? "狀態：已完成回覆" : "狀態：等待對方回覆";
    }

    if (mediationSoftenedStoryEl) {
      mediationSoftenedStoryEl.textContent = data.softenedStory || "";
    }

    if (data.status === "responded") {
      if (mediationSettlementEl) mediationSettlementEl.textContent = data.settlementText || "";
      hide(mediationSectionCreatedEl);
      show(mediationSectionRespondedEl);
    } else {
      hide(mediationSectionRespondedEl);
      show(mediationSectionCreatedEl);
    }
  } catch (err) {
    console.error("Mediation load error:", err);
    hide(mediationLoadingEl);
    show(mediationContentEl);
    if (mediationStatusEl) mediationStatusEl.textContent = "讀取調停失敗";
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

    if (mediationSettlementEl) mediationSettlementEl.textContent = data.settlementText || "";
    if (mediationStatusEl) mediationStatusEl.textContent = "狀態：已完成回覆";

    hide(mediationSectionCreatedEl);
    show(mediationSectionRespondedEl);
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

if (recommendedMusicLinkEl) {
  recommendedMusicLinkEl.addEventListener("click", (event) => {
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
  });
}

// ✅ 審判按下後流程
submitBtn.addEventListener("click", async () => {
  const story = complaintInput.value.trim();
  if (!story) return;
  const accused = accusedInput ? accusedInput.value.trim() : "";
  await primeRecommendedAudioForMobile();

  currentVerdictId = null;
  if (mediationApplyBtn) hide(mediationApplyBtn);
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

  // ✅ 顯示判決內容（呼叫 GPT）
  setTimeout(async () => {
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
    }
  }, 2000); // 控制顯示時間
});


// ✅ token 進入調停流程
(() => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("mediationToken");
  if (!token) return;

  // 隱藏判決頁、改顯示調停頁
  if (verdictScreen) verdictScreen.classList.add("hidden");
  if (contentArea) contentArea.classList.add("hidden");
  if (mediationScreen) show(mediationScreen);

  if (mediationBackBtn) mediationBackBtn.focus?.();
  loadMediation(token);
})();

