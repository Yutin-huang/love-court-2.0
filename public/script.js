const complaintInput = document.getElementById("complaint");
const submitBtn = document.getElementById("submit-btn");
const verdictScreen = document.getElementById("verdict-screen");
const verdictText = document.getElementById("verdict-text");
const retryBtn = document.getElementById("retry-btn");
const contentArea = document.querySelector(".content");
const soundEffect = document.getElementById("sound-effect");
const loadingAnimation = document.getElementById("loading-animation");
const music = document.getElementById("verdict-music");

const crimeEl = document.querySelector(".verdict-crime");
const suggestionEl = document.querySelector(".verdict-suggestion");
const judgementEl = document.querySelector(".verdict-judgement");



// ✅ 再上訴（重置畫面與音訊）
retryBtn.addEventListener("click", () => {
  complaintInput.value = "";
  verdictScreen.classList.add("hidden");
  contentArea.classList.remove("hidden");
  retryBtn.classList.add("hidden");
  verdictText.classList.add("hidden");

  soundEffect.pause();
  soundEffect.currentTime = 0;
  music.pause();
  music.currentTime = 0;
});

// ✅ 審判按下後流程
submitBtn.addEventListener("click", async () => {
  const complaint = complaintInput.value.trim();
  if (!complaint) return;

  // ✅ 手機預授權音樂播放（靜音播放再暫停）
  music.volume = 0;
  music.currentTime = 0;
  try {
    await music.play();
    music.pause();
    music.currentTime = 0;
  } catch (err) {
    console.log("⚠️ 預授權失敗", err);
  }

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

  // ✅ 播主題曲
  setTimeout(() => {
    music.volume = 0.5;
    music.currentTime = 0;
    music.play().catch((err) => {
      console.log("⚠️ 播放主題曲失敗", err);
    });
  }, 4500);

  // ✅ 顯示判決內容（呼叫 GPT）
  setTimeout(async () => {
    try {
      const response = await fetch("/api/verdict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ complaint }),
      });

      const data = await response.json();
      console.log("✅ GPT 回傳資料：", data);

      loadingAnimation.classList.add("hidden");
      verdictText.classList.remove("hidden");

   if (data.verdict && typeof data.verdict === "string") {
    const lines = data.verdict.trim().split("\n");
    const crimeLine = lines.find((line) =>line.includes("被告被起訴為") || line.includes("罪名"));
    const suggestionLine = lines.find((line) =>line.includes("建議") || line.includes("懲罰建議"));
    const judgementLine = lines.find((line) =>line.includes("判決") || line.includes("處罰"));
    
    crimeEl.textContent = crimeLine || "（未提供罪名）";
    suggestionEl.textContent = suggestionLine || "";
    judgementEl.textContent = judgementLine || "";
  } else {crimeEl.textContent = "⚠️ 法官今天沒精神...請稍後再試。";
    suggestionEl.textContent = "";
    judgementEl.textContent = "";
  }


      retryBtn.classList.remove("hidden");
    } catch (err) {
      console.error("❌ 發送錯誤：", err);
      loadingAnimation.classList.add("hidden");
      verdictText.classList.remove("hidden");
      crimeEl.textContent = "❌ 系統錯誤：" + err.message;
      suggestionEl.textContent = "";
      judgementEl.textContent = "";
      retryBtn.classList.remove("hidden");
    }
  }, 2000); // 控制顯示時間
});


