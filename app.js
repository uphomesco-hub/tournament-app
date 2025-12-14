// State Management
const state = {
    setup: {
        name: '',
        teams: [],
        gamesTo: 11,
        cycles: 1,
        winByTwo: true,
        allowTies: false,
        shufflePairs: true,
        winnerMode: 'pd_wins', // pd_wins, wins_pd, pd_only
        createFinal: false
    },
    matches: [], // { id, cycle, teamA, teamB, scoreA, scoreB, completed }
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
    standingsTable: document.getElementById('standings-table').querySelector('tbody'),
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
    progressText: document.getElementById('progress-text')
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
        'tournament-name', 'games-to', 'cycles',
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

                const val = el.type === 'checkbox' ? el.checked : el.value;
                state.setup[key] = val;
                saveState();
            });
        }
    });
}

// --- Logic ---

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
            cyclePairs = shuffleArray(cyclePairs); // Deterministic shuffle could be added if needed
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

function startTournament() {
    // Update setup state from DOM
    state.setup.name = document.getElementById('tournament-name').value;
    state.setup.gamesTo = parseInt(document.getElementById('games-to').value);
    state.setup.cycles = parseInt(document.getElementById('cycles').value);
    state.setup.winByTwo = document.getElementById('win-by-two').checked;
    state.setup.allowTies = document.getElementById('allow-ties').checked;
    state.setup.shufflePairs = document.getElementById('shuffle-pairs').checked;
    state.setup.winnerMode = document.getElementById('winner-mode').value;
    state.setup.createFinal = document.getElementById('create-final').checked;

    if (state.setup.teams.length < 2) {
        alert('Please add at least 2 teams.');
        return;
    }

    // Only regenerate if matches are empty or user confirms (implicit in UI flow usually, but good to be safe)
    if (state.matches.length === 0 || confirm('Regenerate schedule? This will clear existing scores.')) {
        generateSchedule();
    }

    state.status = 'active';
    saveState();
    render();
}

function updateMatch(matchId, scoreA, scoreB) {
    const match = state.matches.find(m => m.id === matchId) || (state.finalMatch && state.finalMatch.id === matchId ? state.finalMatch : null);
    if (!match) return;

    match.scoreA = scoreA === '' ? '' : parseInt(scoreA);
    match.scoreB = scoreB === '' ? '' : parseInt(scoreB);

    // Determine completion
    if (match.scoreA !== '' && match.scoreB !== '') {
        // Validation logic could go here (e.g. win by 2 check)
        match.completed = true;
    } else {
        match.completed = false;
    }

    saveState();
    renderSchedule(); // Re-render to show winner highlight
    renderStandings();
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
        els.setupView.classList.add('active');
        els.tournamentView.classList.remove('active');
        renderSetup();
    } else {
        els.setupView.classList.remove('active');
        els.tournamentView.classList.add('active');
        els.displayTournamentName.textContent = state.setup.name || 'Tournament';
        renderSchedule();
        renderStandings();
    }
}

function renderSetup() {
    // Fill inputs
    document.getElementById('tournament-name').value = state.setup.name;
    document.getElementById('games-to').value = state.setup.gamesTo;
    document.getElementById('cycles').value = state.setup.cycles;
    document.getElementById('win-by-two').checked = state.setup.winByTwo;
    document.getElementById('allow-ties').checked = state.setup.allowTies;
    document.getElementById('shuffle-pairs').checked = state.setup.shufflePairs;
    document.getElementById('winner-mode').value = state.setup.winnerMode;
    document.getElementById('create-final').checked = state.setup.createFinal;

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
    const teamA = state.setup.teams.find(t => t.id === match.teamA);
    const teamB = state.setup.teams.find(t => t.id === match.teamB);

    if (!teamA || !teamB) return document.createElement('div');

    const div = document.createElement('div');
    div.className = `match-card ${match.completed ? 'completed' : ''}`;

    const winnerA = match.completed && match.scoreA > match.scoreB;
    const winnerB = match.completed && match.scoreB > match.scoreA;

    div.innerHTML = `
        <div class="match-header">
            <span>Match #${match.id.split('_')[2] ? parseInt(match.id.split('_')[2]) + 1 : 'Final'}</span>
            <span>Cycle ${match.cycle}</span>
        </div>
        <div class="match-teams">
            <div class="team-row">
                <span class="team-name ${winnerA ? 'winner' : ''}">${teamA.name}</span>
                <input type="number" class="score-input" 
                    value="${match.scoreA}" 
                    onchange="updateMatch('${match.id}', this.value, this.nextElementSibling.nextElementSibling.querySelector('input').value)"
                    placeholder="-">
            </div>
            <div class="team-row">
                <span class="team-name ${winnerB ? 'winner' : ''}">${teamB.name}</span>
                <input type="number" class="score-input" 
                    value="${match.scoreB}" 
                    onchange="updateMatch('${match.id}', this.parentElement.previousElementSibling.querySelector('input').value, this.value)"
                    placeholder="-">
            </div>
        </div>
        ${match.completed ? `
            <div class="match-actions">
                <button class="clear-btn" onclick="updateMatch('${match.id}', '', '')">Clear Result</button>
            </div>
        ` : ''}
    `;
    return div;
}

function renderStandings() {
    const standings = calculateStandings();
    els.standingsTable.innerHTML = '';

    standings.forEach((s, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${s.name}</td>
            <td>${s.mp}</td>
            <td>${s.w}</td>
            <td>${s.l}</td>
            <td>${s.pf}</td>
            <td>${s.pa}</td>
            <td>${s.pd > 0 ? '+' + s.pd : s.pd}</td>
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
