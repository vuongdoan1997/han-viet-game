// script.js

// ── State ─────────────────────────────────────────
let gameData = { phrases: [], noGuessLetters: [], clans: [] };
let currentClanIndex = 0, currentPhraseIndex = 0, currentRound = 1;
let baseChars = [], displayChars = [], revealState = [];
let glowActive = false, revealClanIndex = null, currentPerkDisabled = false;
let consoleIdx = null;

// Thêm mảng tên Clan
const clanNames = [
    "🐦 Chim Phượng",
    "💀 Mộc Tinh",
    "🐸 Cóc Tía",
    "🐢 Rùa Vàng",
    "🌊 Thuỷ Tinh",
    "🧙 Thầy Tế"
];

// Thêm mảng tên Perk
const clanPerks = [
    "Ngọn Lửa Tái Sinh",
    "Gọng Kìm Tử Thần",
    "Hô Mưa Gọi Gió",
    "Thiên Cơ Truyền Khẩu",
    "Cuồng Thuỷ Nộ Đào",
    "Linh Cơ Giải Mộng"
];

// Biến trạng thái cho Perk Ngọn Lửa Tái Sinh (Chim Phượng)
let chimPhuongPerkActive = false;
let chimPhuongBetLetter = null;

// Biến trạng thái cho Perk Hô Mưa Gọi Gió (Cóc Tía)
let cocTiaPerkActive = false;

// Biến trạng thái cho Perk Cuồng Thuỷ Nộ Đào (Thuỷ Tinh)
let thuyTinhPerkActive = false;
let thuyTinhBetAmount = 0;

// Biến trạng thái cho Perk Gọng Kìm Tử Thần (Mộc Tinh)
let mocTinhPerkActive = false;
let mocTinhActivatedTurnIndex = -1;
let mocTinhTrapLetter = null;
let lastGuessedLetter = null;

// Hệ thống Undo
const MAX_HISTORY_STATES = 5;
let history = [];

// Timer
let timeRemaining = 20, paused = true, timerInterval;
let timerElement;

// ── Helpers ────────────────────────────────────────
function randomClanIndex() {
    return Math.floor(Math.random() * gameData.clans.length);
}

// Hàm để lưu trạng thái hiện tại vào lịch sử
function saveState() {
    const currentState = {
        gameData: JSON.parse(JSON.stringify(gameData)),
        currentClanIndex,
        currentPhraseIndex,
        currentRound,
        baseChars: [...baseChars],
        displayChars: [...displayChars],
        revealState: [...revealState],
        glowActive,
        revealClanIndex,
        currentPerkDisabled,
        chimPhuongPerkActive,
        chimPhuongBetLetter,
        cocTiaPerkActive,
        thuyTinhPerkActive,
        thuyTinhBetAmount,
        mocTinhPerkActive,
        mocTinhActivatedTurnIndex,
        mocTinhTrapLetter,
        lastGuessedLetter,
        timeRemaining,
        paused,
    };
    history.push(currentState);
    if (history.length > MAX_HISTORY_STATES) {
        history.shift();
    }
    updateBackButtonState();
}

// Hàm để khôi phục trạng thái từ lịch sử
function restoreState() {
    if (history.length > 1) {
        const prevState = history.pop();
        gameData = JSON.parse(JSON.stringify(prevState.gameData));
        currentClanIndex = prevState.currentClanIndex;
        currentPhraseIndex = prevState.currentPhraseIndex;
        currentRound = prevState.currentRound;
        baseChars = [...prevState.baseChars];
        displayChars = [...prevState.displayChars];
        revealState = [...prevState.revealState];
        glowActive = prevState.glowActive;
        revealClanIndex = prevState.revealClanIndex;
        currentPerkDisabled = prevState.currentPerkDisabled;
        chimPhuongPerkActive = prevState.chimPhuongPerkActive;
        chimPhuongBetLetter = prevState.chimPhuongBetLetter;
        cocTiaPerkActive = prevState.cocTiaPerkActive;
        thuyTinhPerkActive = prevState.thuyTinhPerkActive;
        thuyTinhBetAmount = prevState.thuyTinhBetAmount;
        mocTinhPerkActive = prevState.mocTinhPerkActive;
        mocTinhActivatedTurnIndex = prevState.mocTinhActivatedTurnIndex;
        mocTinhTrapLetter = prevState.mocTinhTrapLetter;
        lastGuessedLetter = prevState.lastGuessedLetter;
        timeRemaining = prevState.timeRemaining;
        paused = prevState.paused;

        clearInterval(timerInterval);
        if (!paused) {
            startTimer();
        }
        timerElement.textContent = timeRemaining;
        timerElement.style.opacity = paused ? 0.5 : 1;

        renderTopBar();
        renderPhrase();
        renderAlphabetBar();
        updateRoundBar();
        updateBackButtonState();
        closeConsole();
    } else {
        alert("Không thể hoàn tác thêm.");
    }
}

// Cập nhật trạng thái nút Back (disabled/enabled)
function updateBackButtonState() {
    const backBtn = document.getElementById("backBtn");
    if (backBtn) {
        backBtn.disabled = history.length <= 1;
        backBtn.style.opacity = backBtn.disabled ? 0.5 : 1;
    }
}

// ── Phase 2: Setup ─────────────────────────────────
document.getElementById("continueBtn").addEventListener("click", () => {
    gameData.phrases = []; gameData.noGuessLetters = [];
    for (let i = 1; i <= 3; i++) {
        const raw = document.getElementById(`phrase${i}`).value.trim();
        const nog = document.getElementById(`noguess${i}`).value.trim().toUpperCase();
        if (raw) {
            gameData.phrases.push(raw);
            gameData.noGuessLetters.push(nog);
        }
    }
    document.getElementById("setup").style.display = "none";
    document.getElementById("clan-selection").style.display = "block";
});

// ── Phase 3: Clan Selection ─────────────────────────
document.getElementById("startGameBtn").addEventListener("click", () => {
    gameData.clans = [];
    for (let i = 1; i <= 6; i++) {
        const grp = +document.getElementById(`clan${i}-group`).value;
        const pts = +document.getElementById(`clan${i}-points`).value;
        if (grp !== 0) {
            gameData.clans.push({
                clanId: i,
                clanName: clanNames[i - 1],
                clanPerk: clanPerks[i - 1],
                groupNumber: grp,
                totalScore: pts,
                bountyPointsThisTurn: 0,
                penaltyPointsThisTurn: 0,
                hasUsedPerkThisRound: false
            });
        }
    }
    gameData.clans.sort(() => Math.random() - 0.5);
    document.getElementById("clan-selection").style.display = "none";
    startMainGame();
});

// ── Main Game & Progressive Reveal ─────────────────
function startMainGame() {
    document.getElementById("main-game").style.display = "block";

    document.getElementById("startTimerBtn").addEventListener("click", () => {
        paused = false;
        timerElement.style.opacity = 1;
    });
    document.getElementById("stopTimerBtn").addEventListener("click", () => {
        paused = true;
        timerElement.style.opacity = 0.5;
    });
    document.getElementById("resetTimerBtn").addEventListener("click", resetTimer);

    timerElement = document.getElementById("timer");

    currentClanIndex = 0;
    currentRound = 1;
    glowActive = false;
    revealClanIndex = null;
    currentPerkDisabled = false;
    chimPhuongPerkActive = false;
    chimPhuongBetLetter = null;
    cocTiaPerkActive = false;
    thuyTinhPerkActive = false;
    thuyTinhBetAmount = 0;
    mocTinhPerkActive = false;
    mocTinhActivatedTurnIndex = -1;
    mocTinhTrapLetter = null;
    lastGuessedLetter = null;

    history = [];
    saveState();

    updateRoundBar();
    renderTopBar();
    loadPhrase();
    renderAlphabetBar();
    beginTurn();
    startTimer();
}

function updateRoundBar(nextMode = false) {
    const bar = document.getElementById("round-bar");
    if (nextMode) {
        bar.textContent = "Next Round";
        bar.classList.add("next-round");
        bar.onclick = startNextRound;
    } else {
        bar.textContent = `Round ${currentRound}`;
        bar.classList.remove("next-round");
        bar.onclick = null;
    }
}

function startNextRound() {
    clearInterval(timerInterval);
    document.getElementById("clan-console-overlay").style.display = "none";
    currentPhraseIndex++;
    currentRound++;
    if (currentPhraseIndex >= gameData.phrases.length) {
        alert("All rounds complete!");
        return;
    }
    gameData.clans.sort(() => Math.random() - 0.5);
    currentClanIndex = 0; glowActive = false; revealClanIndex = null; currentPerkDisabled = false;
    chimPhuongPerkActive = false;
    chimPhuongBetLetter = null;
    cocTiaPerkActive = false;
    thuyTinhPerkActive = false;
    thuyTinhBetAmount = 0;
    mocTinhPerkActive = false;
    mocTinhActivatedTurnIndex = -1;
    mocTinhTrapLetter = null;
    lastGuessedLetter = null;

    gameData.clans.forEach(c => {
        c.bountyPointsThisTurn = 0;
        c.penaltyPointsThisTurn = 0;
    });

    saveState();

    updateRoundBar();
    renderTopBar(); loadPhrase(); renderAlphabetBar();
    document.getElementById("nextClanBtn").disabled = false;
    beginTurn();
}

function renderTopBar() {
    const bar = document.getElementById("top-bar");
    bar.innerHTML = "";
    gameData.clans.forEach((c, i) => {
        const d = document.createElement("div");
        d.className = "clan-box";
        d.dataset.clanId = c.clanId;

        if (i === currentClanIndex) {
            d.classList.add("active");
        }
        if (glowActive && i === revealClanIndex) {
            d.classList.add("reveal-next");
        }

        if (c.clanName === "🐦 Chim Phượng" && chimPhuongPerkActive) {
            d.classList.add("chim-phuong-perk-active");
        } else if (c.clanName === "💀 Mộc Tinh" && mocTinhPerkActive) {
            d.classList.add("moc-tinh-perk-active");
        } else if (c.clanName === "🐸 Cóc Tía" && cocTiaPerkActive) {
            d.classList.add("coc-tia-perk-active");
        } else if (c.clanName === "🌊 Thuỷ Tinh" && thuyTinhPerkActive) {
            d.classList.add("thuy-tinh-perk-active");
        }

        d.innerHTML = `<h4>${c.clanName}</h4>
                       <p>Group ${c.groupNumber}</p>
                       <p><b>${c.totalScore}</b> pts</p>`;
        d.onclick = () => openConsole(i);
        bar.appendChild(d);
    });
}

function loadPhrase() {
    const raw = gameData.phrases[currentPhraseIndex];
    const nospace = raw.replace(/\s+/g, "");
    displayChars = nospace.toUpperCase().split("");
    baseChars = nospace.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase().split("");
    revealState = baseChars.map(() => 0);
    renderPhrase();
}

function renderPhrase() {
    const pd = document.getElementById("phrase-display");
    pd.innerHTML = "";
    pd.classList.toggle("glow", glowActive);
    revealState.forEach((st, i) => {
        const t = document.createElement("div");
        t.className = "letter-tile " +
            (st === 0 ? "unrevealed" :
                st === 1 ? "revealed-partial" :
                    "revealed-full");
        t.textContent = st === 0 ? i + 1 :
            st === 1 ? baseChars[i] :
                displayChars[i];

        if (cocTiaPerkActive && st === 0) {
            t.classList.add("coc-tia-target");
            t.onclick = () => revealCocTiaSquare(i);
        } else {
            t.onclick = null;
        }

        pd.appendChild(t);
    });
}

function revealCocTiaSquare(index) {
    if (cocTiaPerkActive) {
        if (revealState[index] === 0) {
            saveState();
            revealState[index] = 2;
            renderPhrase();
            alert(`Cóc Tía đã sử dụng Hô Mưa Gọi Gió để tiết lộ ô số ${index + 1}: ${displayChars[index]}!`);

            cocTiaPerkActive = false;
            renderTopBar();
            updateAlphabetBarInteractions(true);
        } else {
            alert("Ô này đã được tiết lộ rồi. Vui lòng chọn ô khác.");
        }
    }
}

function renderAlphabetBar() {
    const bar = document.getElementById("alphabet-bar"); bar.innerHTML = "";
    const letters = "ABCDĐEFGHIKLMNOPQRSTUVXY";
    const nog = gameData.noGuessLetters[currentPhraseIndex] || "";
    letters.split("").forEach(l => {
        const btn = document.createElement("button");
        btn.className = "alphabet-btn"; btn.textContent = l;
        if (nog.includes(l)) {
            btn.classList.add("no-guess"); btn.disabled = true;
        } else {
            btn.onclick = () => guessLetter(l, btn);
        }
        bar.appendChild(btn);
    });
    updateAlphabetBarInteractions();
}

function updateAlphabetBarInteractions(enable = false) {
    const buttons = document.querySelectorAll("#alphabet-bar .alphabet-btn");
    buttons.forEach(btn => {
        if (cocTiaPerkActive && !btn.classList.contains("no-guess")) {
            btn.disabled = true;
            btn.style.opacity = 0.5;
        } else if (!btn.classList.contains("no-guess")) {
            btn.disabled = false;
            btn.style.opacity = 1;
        }
        if (btn.classList.contains("guessed")) {
            btn.disabled = true;
        }
    });
}

function guessLetter(letter, btn) {
    if (cocTiaPerkActive) {
        alert("Cóc Tía đang kích hoạt Hô Mưa Gọi Gió. Vui lòng chạm vào một ô chữ để tiết lộ.");
        return;
    }

    saveState();

    btn.classList.add("guessed"); btn.disabled = true;
    let hits = 0;
    let pointsForGuess = 0;

    baseChars.forEach((b, i) => {
        if (b === letter && revealState[i] === 0) {
            revealState[i] = 1; hits++;
        }
    });

    lastGuessedLetter = letter;

    let trapSprung = false;

    const mocTinhClan = gameData.clans.find(c => c.clanName === "💀 Mộc Tinh");
    if (mocTinhPerkActive && mocTinhTrapLetter && letter === mocTinhTrapLetter && mocTinhClan && currentClanIndex !== gameData.clans.indexOf(mocTinhClan)) {
        trapSprung = true;
        const guessingClan = gameData.clans[currentClanIndex];

        const penaltyAmount = Math.floor(guessingClan.totalScore / 2);
        const mocTinhBountyAmount = penaltyAmount + hits;

        guessingClan.totalScore = Math.max(0, guessingClan.totalScore - penaltyAmount);
        mocTinhClan.totalScore += mocTinhBountyAmount;

        alert(`💀 Bẫy Gọng Kìm Tử Thần đã kích hoạt!\n` +
            `${guessingClan.clanName} đoán trúng chữ bẫy "${letter}" và bị mất ${penaltyAmount} điểm (một nửa số điểm hiện có).\n` +
            `Mộc Tinh nhận được ${penaltyAmount} (từ nạn nhân) + ${hits} (bounty) = ${mocTinhBountyAmount} điểm!`);

        mocTinhPerkActive = false;
        mocTinhActivatedTurnIndex = -1;
        mocTinhTrapLetter = null;
    }

    if (chimPhuongPerkActive) {
        if (letter === chimPhuongBetLetter) {
            pointsForGuess = hits * 2;
            alert(`🎉 Chim Phượng đã đoán đúng chữ "${letter}" và kích hoạt Ngọn Lửa Tái Sinh! Nhận ${pointsForGuess} điểm.`);
        } else {
            pointsForGuess = 0;
            alert(`😞 Chim Phượng đã đoán chữ "${letter}" nhưng không khớp chữ cái cược. Không nhận điểm.`);
        }
        chimPhuongPerkActive = false;
    } else {
        pointsForGuess = trapSprung ? 0 : hits;
    }

    if (pointsForGuess > 0) {
        gameData.clans[currentClanIndex].totalScore += pointsForGuess;
    }

    renderTopBar();
    renderPhrase();
    checkGlow();
}

function checkGlow() {
    const nog = gameData.noGuessLetters[currentPhraseIndex] || "";
    const done = revealState.every((st, i) =>
        st > 0 || nog.includes(baseChars[i])
    );
    if (done && !glowActive) {
        glowActive = true;
        revealClanIndex = randomClanIndex();
        renderPhrase(); renderTopBar();
    }
}

function revealNextFull() {
    for (let i = 0; i < revealState.length; i++) {
        const ch = baseChars[i];
        if ((revealState[i] === 0 || (revealState[i] === 1 && "AEIOUY".includes(ch)))
            && revealState[i] < 2) {
            revealState[i] = 2;
            break;
        }
    }
    renderPhrase();
}

function beginTurn() {
    if (gameData.clans.length > 0) {
        const prevClanIndex = (currentClanIndex === 0) ? gameData.clans.length - 1 : currentClanIndex - 1;
        const prevClan = gameData.clans[prevClanIndex];
        if (prevClan) {
            prevClan.totalScore = Math.max(0, prevClan.totalScore + prevClan.bountyPointsThisTurn - prevClan.penaltyPointsThisTurn);
            prevClan.bountyPointsThisTurn = 0;
            prevClan.penaltyPointsThisTurn = 0;
        }
    }

    if (glowActive && currentClanIndex === revealClanIndex) {
        revealNextFull();
        currentPerkDisabled = true;
        let idx;
        do { idx = randomClanIndex(); }
        while (idx === currentClanIndex && gameData.clans.length > 1);
        revealClanIndex = idx;
    } else {
        currentPerkDisabled = false;
    }

    if (mocTinhPerkActive) {
        const mocTinhClan = gameData.clans.find(c => c.clanName === "💀 Mộc Tinh");
        if (mocTinhClan && currentClanIndex === gameData.clans.indexOf(mocTinhClan) && mocTinhActivatedTurnIndex !== -1) {
            if (mocTinhActivatedTurnIndex === currentClanIndex) {
                mocTinhPerkActive = false;
                mocTinhActivatedTurnIndex = -1;
                mocTinhTrapLetter = null;
                alert("Perk Gọng Kìm Tử Thần của Mộc Tinh đã tự động hết hiệu lực (hết vòng).");
            }
        }
    }
    renderTopBar(); updateConsolePerkButtonState(); resetTimer();
}

function nextClan() {
    const currentActiveClan = gameData.clans[currentClanIndex];

    if (currentActiveClan && currentActiveClan.clanName === "🌊 Thuỷ Tinh" && thuyTinhPerkActive) {
        alert(`🌊 Thuỷ Tinh đã không thể giải đố trong lượt của mình. Toàn bộ ${thuyTinhBetAmount} điểm cược đã mất!`);

        thuyTinhPerkActive = false;
        thuyTinhBetAmount = 0;
    }

    if (gameData.clans.length > 0) {
        if (currentActiveClan) {
            currentActiveClan.totalScore = Math.max(0, currentActiveClan.totalScore + currentActiveClan.bountyPointsThisTurn - currentActiveClan.penaltyPointsThisTurn);
            currentActiveClan.bountyPointsThisTurn = 0;
            currentActiveClan.penaltyPointsThisTurn = 0;
            currentActiveClan.hasUsedPerkThisRound = false; // Reset cờ perk
        }
    }

    currentClanIndex = (currentClanIndex + 1) % gameData.clans.length;
    saveState();
    beginTurn();
}
document.getElementById("nextClanBtn").onclick = nextClan;

// ── Timer ──────────────────────────────────────────
function startTimer() {
    clearInterval(timerInterval);
    paused = true;
    timerElement.textContent = timeRemaining;
    timerElement.style.opacity = 0.5;
    timerInterval = setInterval(() => {
        if (!paused) {
            timeRemaining--;
            timerElement.textContent = timeRemaining;
            if (timeRemaining <= 0) {
                paused = true;
                timerElement.style.opacity = 0.5;
                alert("Hết giờ! Vui lòng chuyển lượt thủ công.");
            }
        }
    }, 1000);
}

function resetTimer() {
    clearInterval(timerInterval);
    timeRemaining = 20;
    paused = true;
    if (timerElement) {
        timerElement.textContent = timeRemaining;
        timerElement.style.opacity = 0.5;
    }
    startTimer();
}

// ── Clan Console ───────────────────────────────────
function openConsole(i) {
    consoleIdx = i;
    document.getElementById("clan-console-overlay").style.display = "flex";
    document.getElementById("clan-console-left").textContent =
        `${gameData.clans[i].clanName}`;
    document.getElementById("perkBtn").textContent = gameData.clans[i].clanPerk;
    updateConsolePerkButtonState();
}
function closeConsole() {
    document.getElementById("clan-console-overlay").style.display = "none";
    document.getElementById("pointsAdjustBox").style.display = "none";
    document.getElementById("ranking-table").style.display = "none";
}
function updateConsolePerkButtonState() {
    const btn = document.getElementById("perkBtn");
    const currentClan = gameData.clans[consoleIdx];

    // Chỉ cần kiểm tra 3 điều kiện: game đang trong giai đoạn glow, không phải lượt của clan, hoặc clan đã dùng perk trong lượt này.
    let disablePerkButton = currentPerkDisabled ||
        (consoleIdx !== currentClanIndex) ||
        (currentClan && currentClan.hasUsedPerkThisRound);

    btn.disabled = disablePerkButton;
    btn.style.opacity = btn.disabled ? 0.5 : 1;
}
document.getElementById("closeConsoleBtn").onclick = closeConsole;

const customPrompt = document.getElementById("custom-prompt-overlay");
const trapLetterInput = document.getElementById("trapLetterInput");

document.getElementById("promptConfirmBtn").onclick = () => {
    const currentClan = gameData.clans[consoleIdx];
    const trapLetter = trapLetterInput.value.toUpperCase();

    if (trapLetter && trapLetter.length === 1 && "ABCDĐEFGHIKLMNOPQRSTUVXY".includes(trapLetter)) {
        mocTinhTrapLetter = trapLetter;
        mocTinhPerkActive = true;
        mocTinhActivatedTurnIndex = currentClanIndex;

        alert(`Perk Gọng Kìm Tử Thần đã kích hoạt. Mộc Tinh đã bí mật đặt bẫy một chữ cái.`);

        customPrompt.style.display = "none";
        trapLetterInput.value = "";
        closeConsole();
        renderTopBar();
    } else {
        alert("Chữ cái bẫy không hợp lệ. Vui lòng nhập một chữ cái duy nhất.");
        trapLetterInput.value = "";
    }
};

document.getElementById("promptCancelBtn").onclick = () => {
    const currentClan = gameData.clans[consoleIdx];
    alert("Hủy bỏ đặt bẫy.");
    customPrompt.style.display = "none";
    trapLetterInput.value = "";

    currentClan.totalScore += 2;
    currentClan.hasUsedPerkThisRound = false;
    renderTopBar();
    history.pop();
};

document.getElementById("perkBtn").onclick = () => {
    const currentClan = gameData.clans[consoleIdx];

    if (!currentClan) return;

    if (currentClan.hasUsedPerkThisRound) {
        alert("Mỗi clan chỉ được sử dụng perk một lần trong mỗi lượt."); // Sửa lại câu thông báo
        return;
    }

    saveState();

    if (currentClan.clanName === "🐦 Chim Phượng") {
        if (currentClan.totalScore < 1) {
            alert("Chim Phượng không đủ điểm (cần 1 điểm) để kích hoạt Ngọn Lửa Tái Sinh.");
            history.pop();
            return;
        }
        const confirmPerk = confirm(`Kích hoạt Ngọn Lửa Tái Sinh cho 1 điểm?`);
        if (confirmPerk) {
            currentClan.totalScore -= 1;
            currentClan.hasUsedPerkThisRound = true;
            renderTopBar();
            const betLetterPrompt = prompt("Nhập chữ cái bạn muốn cược (A-Z, Đ, X, Y):").toUpperCase();
            if (betLetterPrompt && betLetterPrompt.length === 1 && "ABCDĐEFGHIKLMNOPQRSTUVXY".includes(betLetterPrompt)) {
                chimPhuongBetLetter = betLetterPrompt;
                chimPhuongPerkActive = true;
                alert(`Perk Ngọn Lửa Tái Sinh đã kích hoạt. Chim Phượng cược chữ: ${chimPhuongBetLetter}.`);
                closeConsole();
                renderTopBar();
            } else {
                alert("Chữ cái cược không hợp lệ. Perk không được kích hoạt.");
                currentClan.totalScore += 1;
                currentClan.hasUsedPerkThisRound = false;
                renderTopBar();
                history.pop();
            }
        } else {
            history.pop();
        }
    }
    else if (currentClan.clanName === "🐸 Cóc Tía") {
        if (currentClan.totalScore < 1) {
            alert("Cóc Tía không đủ điểm (cần 1 điểm) để kích hoạt Hô Mưa Gọi Gió.");
            history.pop();
            return;
        }
        const confirmPerk = confirm(`Kích hoạt Hô Mưa Gọi Gió cho 1 điểm?`);
        if (confirmPerk) {
            currentClan.totalScore -= 1;
            currentClan.hasUsedPerkThisRound = true;
            renderTopBar();
            cocTiaPerkActive = true;
            alert("Perk Hô Mưa Gọi Gió đã kích hoạt. Vui lòng chạm vào một ô chữ chưa tiết lộ để hiển thị.");
            closeConsole();
            renderTopBar();
            renderPhrase();
            updateAlphabetBarInteractions();
        } else {
            history.pop();
        }
    }
    else if (currentClan.clanName === "🐢 Rùa Vàng") {
        if (currentClan.totalScore < 1) {
            alert("Rùa Vàng không đủ điểm (cần 1 điểm) để kích hoạt Thiên Cơ Truyền Khẩu.");
            history.pop();
            return;
        }
        const confirmPerk = confirm(`Kích hoạt Thiên Cơ Truyền Khẩu cho 1 điểm?`);
        if (confirmPerk) {
            currentClan.totalScore -= 1;
            currentClan.hasUsedPerkThisRound = true;
            renderTopBar();
            alert("Perk Thiên Cơ Truyền Khẩu đã kích hoạt. Người quản trò hãy thì thầm vị trí khoảng trống với đội.");
            closeConsole();
        } else {
            history.pop();
        }
    }
    else if (currentClan.clanName === "🌊 Thuỷ Tinh") {
        if (currentClan.totalScore <= 0) {
            alert("Thuỷ Tinh không có điểm để thực hiện All-in!");
            history.pop();
            return;
        }
        const confirmPerk = confirm(`Kích hoạt Cuồng Thuỷ Nộ Đào? Bạn sẽ ALL-IN toàn bộ ${currentClan.totalScore} điểm. ` +
            `Nếu giải được ô chữ trong lượt này, điểm sẽ nhân đôi và cộng thưởng. Nếu không, bạn mất hết!`);
        if (confirmPerk) {
            thuyTinhPerkActive = true;
            thuyTinhBetAmount = currentClan.totalScore;
            currentClan.totalScore = 0;
            currentClan.hasUsedPerkThisRound = true;
            alert("Perk Cuồng Thuỷ Nộ Đào đã kích hoạt! Thuỷ Tinh đã cược tất cả. Hãy giải ô chữ trong lượt này để nhận phần thưởng cuối cùng!");
            closeConsole();
            renderTopBar();
        } else {
            history.pop();
        }
    }
    else if (currentClan.clanName === "💀 Mộc Tinh") {
        if (currentClan.totalScore < 2) {
            alert("Mộc Tinh không đủ điểm (cần 2 điểm) để kích hoạt Gọng Kìm Tử Thần.");
            history.pop();
            return;
        }
        const confirmPerk = confirm(`Kích hoạt Gọng Kìm Tử Thần cho 2 điểm?`);
        if (confirmPerk) {
            currentClan.totalScore -= 2;
            currentClan.hasUsedPerkThisRound = true;
            renderTopBar();

            customPrompt.style.display = "flex";
            trapLetterInput.focus();

        } else {
            history.pop();
        }
    }
    else if (currentClan.clanName === "🧙 Thầy Tế") {
        if (currentClan.totalScore < 1) {
            alert("Thầy Tế không đủ điểm (cần 1 điểm) để kích hoạt Linh Cơ Giải Mộng.");
            history.pop();
            return;
        }
        const confirmPerk = confirm(`Kích hoạt Linh Cơ Giải Mộng cho 1 điểm?`);
        if (confirmPerk) {
            currentClan.totalScore -= 1;
            currentClan.hasUsedPerkThisRound = true;
            renderTopBar();
            alert("Perk Linh Cơ Giải Mộng đã kích hoạt. Người quản trò hãy cung cấp một gợi ý ngữ nghĩa cho đội.");
            closeConsole();
        } else {
            history.pop();
        }
    }
    updateConsolePerkButtonState();
};

document.getElementById("pointsBtn").onclick = () => {
    const c = gameData.clans[consoleIdx];
    const box = document.getElementById("pointsAdjustBox");
    box.style.display = "flex";
    document.getElementById("pointsInput").value = c.totalScore;
    document.getElementById("pointsSaveBtn").onclick = () => {
        saveState();
        c.totalScore = +document.getElementById("pointsInput").value;
        renderTopBar(); box.style.display = "none";
    };
};

document.getElementById("winBtn").onclick = () => {
    const c = gameData.clans[consoleIdx];
    saveState();

    if (thuyTinhPerkActive && c.clanName === "🌊 Thuỷ Tinh") {
        const winBonus = displayChars.length;
        const finalScore = (thuyTinhBetAmount * 2) + winBonus;
        alert(`🎉 Thuỷ Tinh đã giải mã thành công ô chữ!\n` +
            `Điểm cược nhân đôi: ${thuyTinhBetAmount} x 2 = ${thuyTinhBetAmount * 2}\n` +
            `Điểm thưởng vòng: ${winBonus}\n` +
            `Tổng điểm: ${finalScore}`);
        c.totalScore = finalScore;
        thuyTinhPerkActive = false;
        thuyTinhBetAmount = 0;
    } else {
        c.totalScore += displayChars.length;
    }

    renderTopBar();

    revealState = revealState.map(() => 2);
    renderPhrase();

    clearInterval(timerInterval);
    document.querySelectorAll(".alphabet-btn").forEach(b => b.disabled = true);
    document.getElementById("nextClanBtn").disabled = true;

    updateRoundBar(true);
};

document.getElementById("clan-console-overlay")
    .addEventListener("click", e => { if (e.target === e.currentTarget) closeConsole(); });

document.getElementById("backBtn").addEventListener("click", restoreState);

// Polyfill
if (!String.prototype.includes) {
    String.prototype.includes = function (search, start) {
        'use strict';
        if (typeof start !== 'number') {
            start = 0;
        }
        if (start + search.length > this.length) {
            return false;
        } else {
            return this.indexOf(search, start) !== -1;
        }
    };
}
if (!Element.prototype.matches) {
    Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}
if (!Element.prototype.closest) {
    Element.prototype.closest = function (s) {
        var el = this;
        do {
            if (el.matches(s)) return el;
            el = el.parentElement || el.parentNode;
        } while (el !== null && el.nodeType === 1);
        return null;
    };
}