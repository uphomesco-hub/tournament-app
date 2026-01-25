// State Management
const state = {
    setup: {
        name: '',
        type: 'round_robin', // round_robin, elimination
        teams: [],
        gamesTo: 11,
        cycles: 1,
        winByTwo: true,
        allowTies: false,
        shufflePairs: true,
        winnerMode: 'pd_wins', // pd_wins, wins_pd, pd_only
        createFinal: false
    },
    matches: [], // { id, cycle, teamA, teamB, scoreA, scoreB, completed, nextMatchId, nextMatchSlot }
    status: 'setup', // setup, active
    finalMatch: null // { id: 'final', teamA, teamB, scoreA, scoreB, completed }
};

// DOM Elements
const els = {
    app: document.getElementById('app'),
    setupView: document.getElementById('setup-view'),
    tournamentView: document.getElementById('tournament-view'),
    teamList: document.getElementById('team-list'),
    newTeamInput: document.getElementById('new-team-input'),
    addTeamBtn: document.getElementById('add-team-btn'),
    teamCount: document.getElementById('team-count'),
    startBtn: document.getElementById('start-tournament-btn'),
    scheduleList: document.getElementById('schedule-list'),
    schedulePanel: document.getElementById('schedule-panel'),
    standingsTable: document.getElementById('standings-table').querySelector('tbody'),
    standingsContainer: document.getElementById('standings-container'),
    standingsTitle: document.getElementById('standings-title'),
    bracketContainer: document.getElementById('bracket-container'),
    themeToggle: document.getElementById('theme-toggle'),
    exportBtn: document.getElementById('export-btn'),
    importBtn: document.getElementById('import-btn'),
    importFile: document.getElementById('import-file'),
    resetBtn: document.getElementById('reset-btn'),
    editSetupBtn: document.getElementById('edit-setup-btn'),
    championSection: document.getElementById('champion-section'),
    championName: document.getElementById('champion-name'),
    finalsSection: document.getElementById('finals-section'),
    finalMatchContainer: document.getElementById('final-match-container'),
    displayTournamentName: document.getElementById('display-tournament-name'),
    progressText: document.getElementById('progress-text'),
    // Setup
    tournamentType: document.getElementById('tournament-type'),
    rrOptions: document.getElementById('rr-options'),
    // Dropdown
    menuBtn: document.getElementById('menu-btn'),
    dropdownContent: document.querySelector('.dropdown-content'),
    // Share
    shareBtn: document.getElementById('share-results-btn')
};

// --- Initialization ---

function init() {
    loadState();
    setupEventListeners();
    render();
}

function setupEventListeners() {
    // Theme
    els.themeToggle.addEventListener('click', toggleTheme);

    // Tournament Type Toggle
    els.tournamentType.addEventListener('change', (e) => {
        state.setup.type = e.target.value;
        saveState();
        renderSetup();
    });

    // Teams
    els.addTeamBtn.addEventListener('click', addTeam);
    els.newTeamInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTeam();
    });

    // Navigation
    els.startBtn.addEventListener('click', startTournament);
    els.editSetupBtn.addEventListener('click', () => {
        if (confirm('Going back to setup will clear current results if you regenerate the schedule. Continue?')) {
            state.status = 'setup';
            saveState();
            render();
        }
    });

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

            e.target.classList.add('active');
            document.getElementById(`${e.target.dataset.tab}-panel`).classList.add('active');
        });
    });

    // Data
    els.resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset everything? This cannot be undone.')) {
            localStorage.removeItem('tournamentState');
            location.reload();
        }
    });
    els.exportBtn.addEventListener('click', exportData);
    els.importBtn.addEventListener('click', () => els.importFile.click());
    els.importFile.addEventListener('change', importData);

    // Setup Inputs - Real-time sync
    const setupInputs = [
        'tournament-name', 'tournament-type', 'games-to', 'cycles',
        'win-by-two', 'allow-ties', 'shuffle-pairs',
        'winner-mode', 'create-final'
    ];

    setupInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', (e) => {
                let key = id.replace(/-([a-z])/g, (g) => g[1].toUpperCase()); // kebab-to-camel

                // Manual mapping fix
                if (id === 'tournament-name') key = 'name';
                if (id === 'tournament-type') key = 'type';

                const val = el.type === 'checkbox' ? el.checked : el.value;
                state.setup[key] = val;

                if (id === 'tournament-type') {
                    renderSetup(); // Re-render to toggle RR options
                }
                saveState();
            });
        }
    });

    // Dropdown Toggle
    els.menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        els.dropdownContent.classList.toggle('show');
    });

    window.addEventListener('click', () => {
        if (els.dropdownContent.classList.contains('show')) {
            els.dropdownContent.classList.remove('show');
        }
    });

    // Share
    els.shareBtn.addEventListener('click', shareResults);
}

// --- Logic ---

function shareResults() {
    const winnerName = els.championName.textContent;
    const siteUrl = "https://uphomesco-hub.github.io/tournament-app/";

    let shareText = `🏆 Tournament Champion: ${winnerName}!\n\n`;

    if (state.setup.type !== 'elimination') {
        const standings = calculateStandings();
        shareText += "Final Standings:\n";
        standings.forEach((s, i) => {
            const vibeTiers = {
                untouchable: ["Untouchable 🌟", "God Mode ⚡", "Final Boss 👹", "Unstoppable 🚂", "Him 😤"],
                cooking: ["Cooking 🍳", "On Fire 🔥", "In the Zone 🎯", "Locked In 🔒", "Grooving 🎸"],
                mid: ["Mid 😐", "Balanced ⚖️", "Average Joe 🚶", "Coin Flip 🪙", "Room for Growth 🌱"],
                downbad: ["Down Bad 📉", "Struggling 🧗", "Rough Day 🌧️", "Hanging In 🩹", "Lagging Life 🐌"],
                cooked: ["Cooked 💀", "Zero Logic 🚫", "Pack it Up 📦", "Oof 📉", "Better luck in next life 👻"]
            };
            const winRate = s.mp > 0 ? s.w / s.mp : 0;
            let list = [];
            if (winRate === 1) list = vibeTiers.untouchable;
            else if (winRate > 0.5) list = vibeTiers.cooking;
            else if (winRate === 0.5) list = vibeTiers.mid;
            else if (winRate === 0) list = vibeTiers.cooked;
            else list = vibeTiers.downbad;
            const vibe = s.mp > 0 ? list[s.name.length % list.length] : 'N/A';

            shareText += `${i + 1}. ${s.name} (${vibe})\n`;
        });
    }

    shareText += `\nHost your own tournament use this: ${siteUrl}`;
    shareText += `\n\nGenerated by Tournament Manager by Yashovrat`;

    if (navigator.share) {
        navigator.share({
            title: state.setup.name || 'Tournament Results',
            text: shareText,
            url: siteUrl
        }).catch(err => {
            copyToClipboard(shareText);
        });
    } else {
        copyToClipboard(shareText);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = els.shareBtn.textContent;
        els.shareBtn.textContent = "Copied! ✅";
        setTimeout(() => {
            els.shareBtn.textContent = originalText;
        }, 2000);
    });
}

function addTeam() {
    const name = els.newTeamInput.value.trim();
    if (name) {
        state.setup.teams.push({ id: Date.now().toString(), name });
        els.newTeamInput.value = '';
        saveState();
        renderSetup();
    }
}

function removeTeam(id) {
    state.setup.teams = state.setup.teams.filter(t => t.id !== id);
    saveState();
    renderSetup();
}

function generateSchedule() {
    if (state.setup.type === 'elimination') {
        generateEliminationBracket();
    } else {
        generateRoundRobinSchedule();
    }
}

function generateRoundRobinSchedule() {
    const teams = state.setup.teams;
    if (teams.length < 2) return;

    let matches = [];
    const pairs = [];

    // Generate all unique pairs
    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            pairs.push([teams[i], teams[j]]);
        }
    }

    // Generate cycles
    for (let c = 1; c <= state.setup.cycles; c++) {
        let cyclePairs = [...pairs];
        if (state.setup.shufflePairs) {
            cyclePairs = shuffleArray(cyclePairs);
        }

        cyclePairs.forEach((pair, idx) => {
            matches.push({
                id: `m_${c}_${idx}`,
                cycle: c,
                teamA: pair[0].id,
                teamB: pair[1].id,
                scoreA: '',
                scoreB: '',
                completed: false
            });
        });
    }

    state.matches = matches;
    state.finalMatch = null;
}

function generateEliminationBracket() {
    let teams = shuffleArray([...state.setup.teams]);

    // Determine bracket size (next power of 2)
    let bracketSize = 1;
    while (bracketSize < teams.length) bracketSize *= 2;

    let levels = [];
    let currentSize = bracketSize;

    while (currentSize > 1) {
        let levelMatches = [];
        for (let i = 0; i < currentSize / 2; i++) {
            levelMatches.push({
                id: `lvl_${currentSize}_m_${i}`,
                roundName: getRoundName(currentSize),
                teamA: null,
                teamB: null,
                scoreA: '',
                scoreB: '',
                completed: false,
                nextMatchId: null,
                nextMatchSlot: null
            });
        }
        levels.push(levelMatches);
        currentSize /= 2;
    }

    // Link matches (winner advances)
    for (let i = 0; i < levels.length - 1; i++) {
        const currentLevel = levels[i];
        const nextLevel = levels[i + 1];

        currentLevel.forEach((match, idx) => {
            const nextMatchIdx = Math.floor(idx / 2);
            const slot = idx % 2 === 0 ? 'teamA' : 'teamB';
            match.nextMatchId = nextLevel[nextMatchIdx].id;
            match.nextMatchSlot = slot;
        });
    }

    // NEW: Flatten and assign to state.matches BEFORE filling slots
    state.matches = levels.flat();
    state.finalMatch = null;

    // Interleaved team distribution to avoid BYE vs BYE
    // Slots: 0, 2, 4, 6... then 1, 3, 5, 7...
    const firstRound = levels[0];
    const slotsMap = [];
    for (let i = 0; i < firstRound.length; i++) {
        slotsMap.push({ mIdx: i, slot: 'teamA' });
    }
    for (let i = 0; i < firstRound.length; i++) {
        slotsMap.push({ mIdx: i, slot: 'teamB' });
    }

    // Fill teams into slots
    teams.forEach((team, idx) => {
        const target = slotsMap[idx];
        firstRound[target.mIdx][target.slot] = team.id;
    });

    // Fill everything else with BYE
    for (let i = teams.length; i < slotsMap.length; i++) {
        const target = slotsMap[i];
        firstRound[target.mIdx][target.slot] = 'BYE';
    }

    // Trigger initial advancements
    firstRound.forEach(match => checkEliminationMatch(match));
}

function getRoundName(size) {
    if (size === 2) return 'Finals';
    if (size === 4) return 'Semi-Finals';
    if (size === 8) return 'Quarter-Finals';
    return `Round of ${size}`;
}

function checkEliminationMatch(match) {
    if (!match.teamA || !match.teamB) return; // Wait for both slots to be filled

    if (match.teamA === 'BYE' && match.teamB === 'BYE') {
        match.scoreA = 0;
        match.scoreB = 0;
        match.completed = true;
        advanceWinner(match, 'BYE');
        return;
    }
    if (match.teamB === 'BYE') {
        match.scoreA = 0;
        match.scoreB = 0;
        match.completed = true;
        advanceWinner(match, match.teamA);
        return;
    }
    if (match.teamA === 'BYE') {
        match.scoreA = 0;
        match.scoreB = 0;
        match.completed = true;
        advanceWinner(match, match.teamB);
        return;
    }
}

function advanceWinner(match, winnerId) {
    if (!match.nextMatchId || !winnerId) return; // Finals or invalid winner

    const nextMatch = state.matches.find(m => m.id === match.nextMatchId);
    if (nextMatch) {
        nextMatch[match.nextMatchSlot] = winnerId;
        checkEliminationMatch(nextMatch);
    }
}

function startTournament() {
    // Update setup state from DOM
    state.setup.name = document.getElementById('tournament-name').value;
    state.setup.type = document.getElementById('tournament-type').value;

    if (state.setup.type === 'round_robin') {
        state.setup.gamesTo = parseInt(document.getElementById('games-to').value);
        state.setup.cycles = parseInt(document.getElementById('cycles').value);
        state.setup.winByTwo = document.getElementById('win-by-two').checked;
        state.setup.allowTies = document.getElementById('allow-ties').checked;
        state.setup.shufflePairs = document.getElementById('shuffle-pairs').checked;
        state.setup.winnerMode = document.getElementById('winner-mode').value;
        state.setup.createFinal = document.getElementById('create-final').checked;
    }

    if (state.setup.teams.length < 2) {
        alert('Please add at least 2 teams.');
        return;
    }

    if (state.matches.length === 0 || confirm('Regenerate schedule? This will clear existing scores.')) {
        generateSchedule();
    }

    state.status = 'active';
    saveState();
    render();
}

// Funny Commentary Phrases
const winnerPhrases = [
    "Absolute Unit", "Too EZ", "Chef's Kiss", "Goated 🐐", "Unstoppable",
    "Built Different", "Clutch", "Main Character Energy", "Pure Filth",
    "Cold 🥶", "Light Work", "Sit Down", "Built for This", "No Diff",
    "Him. 😤", "W Code", "Total Carry"
];
const loserPhrases = [
    "Emotional Damage", "Skill Issue", "Maybe Next Time", "Hold This L",
    "Needs Practice", "Oof Size: Large", "Lag?", "Rent Free", "Down Bad",
    "Ratio", "Touch Grass", "Controller Disconnected", "Choked",
    "Tilted", "Main Character... in a horror movie", "Deserved"
];

function updateMatch(matchId, scoreA, scoreB) {
    const match = state.matches.find(m => m.id === matchId) || (state.finalMatch && state.finalMatch.id === matchId ? state.finalMatch : null);
    if (!match) return;

    match.scoreA = scoreA === '' ? '' : parseInt(scoreA);
    match.scoreB = scoreB === '' ? '' : parseInt(scoreB);

    // Determine completion
    if (match.scoreA !== '' && match.scoreB !== '') {
        match.completed = true;

        // Assign commentary if not present
        if (!match.commentaryA || !match.commentaryB) {
            const wPhrase = winnerPhrases[Math.floor(Math.random() * winnerPhrases.length)];
            const lPhrase = loserPhrases[Math.floor(Math.random() * loserPhrases.length)];

            if (match.scoreA > match.scoreB) {
                match.commentaryA = wPhrase;
                match.commentaryB = lPhrase;
            } else if (match.scoreB > match.scoreA) {
                match.commentaryA = lPhrase;
                match.commentaryB = wPhrase;
            } else {
                match.commentaryA = "Mid";
                match.commentaryB = "Mid";
            }
        }
        // Elimination: advance winner
        if (state.setup.type === 'elimination') {
            let winnerId = null;
            if (match.scoreA > match.scoreB) winnerId = match.teamA;
            else if (match.scoreB > match.scoreA) winnerId = match.teamB;

            if (winnerId) {
                advanceWinner(match, winnerId);
            }
        }
    } else {
        match.completed = false;
        match.commentaryA = null;
        match.commentaryB = null;
    }

    saveState();

    if (state.setup.type === 'elimination') {
        renderBracket();
    } else {
        renderSchedule();
        renderStandings();
    }
}

function calculateStandings() {
    const stats = {};
    state.setup.teams.forEach(t => {
        stats[t.id] = {
            id: t.id,
            name: t.name,
            mp: 0, w: 0, l: 0, t: 0,
            pf: 0, pa: 0, pd: 0
        };
    });

    state.matches.forEach(m => {
        if (m.completed) {
            const sA = m.scoreA;
            const sB = m.scoreB;

            stats[m.teamA].mp++;
            stats[m.teamB].mp++;
            stats[m.teamA].pf += sA;
            stats[m.teamB].pf += sB;
            stats[m.teamA].pa += sB;
            stats[m.teamB].pa += sA;

            if (sA > sB) {
                stats[m.teamA].w++;
                stats[m.teamB].l++;
            } else if (sB > sA) {
                stats[m.teamB].w++;
                stats[m.teamA].l++;
            } else {
                stats[m.teamA].t++;
                stats[m.teamB].t++;
            }
        }
    });

    Object.values(stats).forEach(s => s.pd = s.pf - s.pa);

    // Sorting
    return Object.values(stats).sort((a, b) => {
        // Primary Sort
        let diff = 0;
        if (state.setup.winnerMode === 'pd_wins' || state.setup.winnerMode === 'pd_only') {
            diff = b.pd - a.pd;
            if (diff === 0 && state.setup.winnerMode === 'pd_wins') diff = b.w - a.w;
        } else { // wins_pd
            diff = b.w - a.w;
            if (diff === 0) diff = b.pd - a.pd;
        }

        // Tiebreakers
        if (diff === 0) diff = b.pf - a.pf; // Points For
        // Head-to-head could be added here but is complex for N-way ties

        return diff;
    });
}

function checkFinals(standings) {
    const completedMatches = state.matches.filter(m => m.completed).length;
    const totalMatches = state.matches.length;
    const isTournamentDone = completedMatches === totalMatches;

    if (!isTournamentDone || !state.setup.createFinal || standings.length < 2) {
        els.finalsSection.classList.add('hidden');
        return;
    }

    // Check for tie in top 2
    const top1 = standings[0];
    const top2 = standings[1];

    // Simple tie check based on sort criteria
    let isTied = false;
    if (state.setup.winnerMode === 'pd_wins') {
        isTied = top1.pd === top2.pd && top1.w === top2.w;
    } else if (state.setup.winnerMode === 'wins_pd') {
        isTied = top1.w === top2.w && top1.pd === top2.pd;
    } else {
        isTied = top1.pd === top2.pd;
    }

    if (isTied) {
        els.finalsSection.classList.remove('hidden');
        if (!state.finalMatch) {
            state.finalMatch = {
                id: 'final_match',
                cycle: 'FINAL',
                teamA: top1.id,
                teamB: top2.id,
                scoreA: '',
                scoreB: '',
                completed: false
            };
            saveState();
        }
        renderFinalMatch();
    } else {
        els.finalsSection.classList.add('hidden');
        state.finalMatch = null;
        saveState();
    }
}

// --- Rendering ---

function render() {
    document.body.setAttribute('data-theme', localStorage.getItem('theme') || 'light');

    if (state.status === 'setup') {
        els.setupView.classList.remove('hidden');
        els.setupView.classList.add('active');
        els.tournamentView.classList.add('hidden');
        els.tournamentView.classList.remove('active');
        renderSetup();
    } else {
        els.setupView.classList.add('hidden');
        els.setupView.classList.remove('active');
        els.tournamentView.classList.remove('hidden');
        els.tournamentView.classList.add('active');
        els.displayTournamentName.textContent = state.setup.name || 'Tournament';

        if (state.setup.type === 'elimination') {
            // Hide RR panels, show bracket
            els.schedulePanel.classList.add('hidden');
            els.standingsContainer.classList.add('hidden');
            els.bracketContainer.classList.remove('hidden');
            els.standingsTitle.textContent = 'Bracket';

            // Mobile tabs
            document.querySelector('[data-tab="schedule"]').style.display = 'none';
            document.querySelector('[data-tab="standings"]').textContent = 'Bracket';
            document.querySelector('[data-tab="standings"]').click();

            renderBracket();
        } else {
            // Show RR panels
            els.schedulePanel.classList.remove('hidden');
            els.standingsContainer.classList.remove('hidden');
            els.bracketContainer.classList.add('hidden');
            els.standingsTitle.textContent = 'Standings';

            // Mobile tabs
            document.querySelector('[data-tab="schedule"]').style.display = 'block';
            document.querySelector('[data-tab="standings"]').textContent = 'Standings';

            renderSchedule();
            renderStandings();
        }
    }
}

function renderSetup() {
    // Fill inputs
    document.getElementById('tournament-name').value = state.setup.name;
    document.getElementById('tournament-type').value = state.setup.type || 'round_robin';
    document.getElementById('games-to').value = state.setup.gamesTo;
    document.getElementById('cycles').value = state.setup.cycles;
    document.getElementById('win-by-two').checked = state.setup.winByTwo;
    document.getElementById('allow-ties').checked = state.setup.allowTies;
    document.getElementById('shuffle-pairs').checked = state.setup.shufflePairs;
    document.getElementById('winner-mode').value = state.setup.winnerMode;
    document.getElementById('create-final').checked = state.setup.createFinal;

    // Show/hide RR options based on type
    els.rrOptions.style.display = state.setup.type === 'elimination' ? 'none' : 'block';

    // Render Teams
    els.teamList.innerHTML = '';
    state.setup.teams.forEach(team => {
        const div = document.createElement('div');
        div.className = 'team-item';
        div.innerHTML = `
            <span>${team.name}</span>
            <button class="delete-btn" onclick="removeTeam('${team.id}')">✕</button>
        `;
        els.teamList.appendChild(div);
    });
    els.teamCount.textContent = `(${state.setup.teams.length})`;
}

function renderSchedule() {
    els.scheduleList.innerHTML = '';

    const matchesToRender = [...state.matches];
    const completedCount = matchesToRender.filter(m => m.completed).length;
    const progress = Math.round((completedCount / matchesToRender.length) * 100) || 0;
    els.progressText.textContent = `${progress}% Complete`;

    matchesToRender.forEach(match => {
        els.scheduleList.appendChild(createMatchCard(match));
    });
}

function createMatchCard(match) {
    // For Elimination, teams might be null, 'BYE', or IDs
    const teamA = match.teamA === 'BYE' ? { name: 'BYE' } : state.setup.teams.find(t => t.id === match.teamA);
    const teamB = match.teamB === 'BYE' ? { name: 'BYE' } : state.setup.teams.find(t => t.id === match.teamB);

    const nameA = teamA ? teamA.name : 'TBD';
    const nameB = teamB ? teamB.name : 'TBD';

    const div = document.createElement('div');
    div.className = `match-card ${match.completed ? 'completed' : ''}`;

    const winnerA = match.completed && match.scoreA > match.scoreB;
    const winnerB = match.completed && match.scoreB > match.scoreA;

    // Disable inputs if TBD or BYE
    const disabled = (nameA === 'TBD' || nameB === 'TBD' || nameA === 'BYE' || nameB === 'BYE');

    div.innerHTML = `
        <div class="match-header">
            <span>${match.roundName || ('Match #' + (match.id.split('_')[2] ? parseInt(match.id.split('_')[2]) + 1 : 'Final'))}</span>
            <span>${match.cycle ? 'Cycle ' + match.cycle : ''}</span>
        </div>
        <div class="match-teams">
            <div class="team-row">
                <div class="team-info">
                    <span class="team-name ${winnerA ? 'winner' : ''}">${nameA}</span>
                    ${match.commentaryA ? `<span class="commentary ${winnerA ? 'win-comment' : 'lose-comment'}">${match.commentaryA}</span>` : ''}
                </div>
                <input type="number" class="score-input" 
                    value="${match.scoreA}" 
                    ${disabled ? 'disabled' : ''}
                    onchange="updateMatch('${match.id}', this.value, this.parentElement.nextElementSibling.querySelector('input').value)"
                    placeholder="-">
            </div>
            <div class="team-row">
                <div class="team-info">
                    <span class="team-name ${winnerB ? 'winner' : ''}">${nameB}</span>
                    ${match.commentaryB ? `<span class="commentary ${winnerB ? 'win-comment' : 'lose-comment'}">${match.commentaryB}</span>` : ''}
                </div>
                <input type="number" class="score-input" 
                    value="${match.scoreB}" 
                    ${disabled ? 'disabled' : ''}
                    onchange="updateMatch('${match.id}', this.parentElement.previousElementSibling.querySelector('input').value, this.value)"
                    placeholder="-">
            </div>
        </div>
        ${match.completed && !disabled ? `
            <div class="match-actions">
                <button class="clear-btn" onclick="updateMatch('${match.id}', '', '')">Clear Result</button>
            </div>
        ` : ''}
    `;
    return div;
}

function renderBracket() {
    els.bracketContainer.innerHTML = '';

    // Group by Round
    const rounds = {};
    state.matches.forEach(m => {
        if (!rounds[m.roundName]) rounds[m.roundName] = [];
        rounds[m.roundName].push(m);
    });

    const roundNames = [...new Set(state.matches.map(m => m.roundName))];

    roundNames.forEach(rName => {
        const roundDiv = document.createElement('div');
        roundDiv.className = 'bracket-round';

        const title = document.createElement('h4');
        title.textContent = rName;
        roundDiv.appendChild(title);

        rounds[rName].forEach(match => {
            if (match.teamA === 'BYE' && match.teamB === 'BYE') return; // Don't show double byes
            roundDiv.appendChild(createMatchCard(match));
        });

        els.bracketContainer.appendChild(roundDiv);
    });

    // Update progress
    const completedCount = state.matches.filter(m => m.completed).length;
    const progress = Math.round((completedCount / state.matches.length) * 100) || 0;
    els.progressText.textContent = `${progress}% Complete`;

    // Champion
    const finalMatch = state.matches[state.matches.length - 1];
    if (finalMatch && finalMatch.completed) {
        els.championSection.classList.remove('hidden');
        const winnerId = finalMatch.scoreA > finalMatch.scoreB ? finalMatch.teamA : finalMatch.teamB;
        const winner = state.setup.teams.find(t => t.id === winnerId);
        els.championName.textContent = winner ? winner.name : 'BYE';
    } else {
        els.championSection.classList.add('hidden');
    }
}

function renderStandings() {
    const standings = calculateStandings();
    els.standingsTable.innerHTML = '';

    standings.forEach((s, index) => {
        // Vibe Check Logic with Variety
        const vibeTiers = {
            untouchable: ["Untouchable 🌟", "God Mode ⚡", "Final Boss 👹", "Unstoppable 🚂", "Him 😤"],
            cooking: ["Cooking 🍳", "On Fire 🔥", "In the Zone 🎯", "Locked In 🔒", "Grooving 🎸"],
            mid: ["Mid 😐", "Balanced ⚖️", "Average Joe 🚶", "Coin Flip 🪙", "Room for Growth 🌱"],
            downbad: ["Down Bad 📉", "Struggling 🧗", "Rough Day 🌧️", "Hanging In 🩹", "Lagging Life 🐌"],
            cooked: ["Cooked 💀", "Zero Logic 🚫", "Pack it Up 📦", "Oof 📉", "Better luck in next life 👻"]
        };

        let vibe = 'N/A';
        if (s.mp > 0) {
            const winRate = s.w / s.mp;
            let list = [];
            if (winRate === 1) list = vibeTiers.untouchable;
            else if (winRate > 0.5) list = vibeTiers.cooking;
            else if (winRate === 0.5) list = vibeTiers.mid;
            else if (winRate === 0) list = vibeTiers.cooked;
            else list = vibeTiers.downbad;

            // Pick based on team name length or similar to stay consistent but random-ish
            vibe = list[s.name.length % list.length];
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <div class="team-standings-name">${s.name}</div>
                <div class="vibe-subtext">${vibe}</div>
            </td>
            <td>${s.mp}</td>
            <td>${s.w}</td>
            <td>${s.l}</td>
            <td>${s.pf}</td>
            <td>${s.pa}</td>
            <td>${s.pd > 0 ? '+' + s.pd : s.pd}</td>
            <td class="vibe-col" style="text-align: center; font-weight: 500;">${vibe}</td>
        `;
        els.standingsTable.appendChild(tr);
    });

    checkFinals(standings);
    updateChampion(standings);
}

function renderFinalMatch() {
    els.finalMatchContainer.innerHTML = '';
    if (state.finalMatch) {
        els.finalMatchContainer.appendChild(createMatchCard(state.finalMatch));
    }
}

function updateChampion(standings) {
    const allCompleted = state.matches.every(m => m.completed);
    const finalCompleted = state.finalMatch ? state.finalMatch.completed : true;

    if (allCompleted && finalCompleted) {
        els.championSection.classList.remove('hidden');
        let champion = standings[0];

        if (state.finalMatch && state.finalMatch.completed) {
            if (state.finalMatch.scoreA > state.finalMatch.scoreB) {
                champion = state.setup.teams.find(t => t.id === state.finalMatch.teamA);
            } else {
                champion = state.setup.teams.find(t => t.id === state.finalMatch.teamB);
            }
        }

        els.championName.textContent = champion.name;
    } else {
        els.championSection.classList.add('hidden');
    }
}

// --- Utilities ---

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function saveState() {
    localStorage.setItem('tournamentState', JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem('tournamentState');
    if (saved) {
        Object.assign(state, JSON.parse(saved));
    }
}

function toggleTheme() {
    const current = document.body.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
}

function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "tournament_data.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            Object.assign(state, data);
            saveState();
            render();
            alert('Tournament imported successfully!');
        } catch (err) {
            alert('Error importing file: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// Start
init();
