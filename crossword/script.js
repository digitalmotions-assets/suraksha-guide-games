/**
 * Suraksha Guide - Security Training Crossword Game Engine
 * 
 * Features:
 * - Dynamic Crossword Generator with Intersection Calculation
 * - Responsive Keyboard & Mobile Touch Navigation
 * - Sound FX (Web Audio API Synthesizer) & Canvas Confetti
 * - LocalStorage State, Leaderboard & Achievements System
 * - Full Dark/Light Theme Switching
 */

/* ==========================================================================
   1. Sound FX Engine (Web Audio API - No External Files Required)
   ========================================================================== */
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type, duration, gainVal = 0.1) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;

        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.warn("Audio playback error:", e);
        }
    }

    playClick() { this.playTone(600, 'sine', 0.05, 0.05); }
    playSuccess() { 
        this.playTone(523.25, 'triangle', 0.1, 0.1); // C5
        setTimeout(() => this.playTone(659.25, 'triangle', 0.15, 0.1), 100); // E5
    }
    playWrong() { 
        this.playTone(220, 'sawtooth', 0.15, 0.08); // A3
        setTimeout(() => this.playTone(180, 'sawtooth', 0.2, 0.08), 120);
    }
    playWin() {
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((freq, idx) => {
            setTimeout(() => this.playTone(freq, 'sine', 0.25, 0.12), idx * 120);
        });
    }
}

/* ==========================================================================
   2. Canvas Confetti System
   ========================================================================== */
class ConfettiEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.particles = [];
        this.animating = false;
        
        if (this.canvas) {
            this.resize();
            window.addEventListener('resize', () => this.resize());
        }
    }

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    trigger(durationMs = 3000) {
        if (!this.canvas || !this.ctx) return;
        this.particles = [];
        const colors = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

        for (let i = 0; i < 120; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height - this.canvas.height,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                vx: (Math.random() - 0.5) * 4,
                vy: Math.random() * 4 + 2,
                rotation: Math.random() * 360,
                vRot: (Math.random() - 0.5) * 10
            });
        }

        this.animating = true;
        const startTime = Date.now();

        const render = () => {
            if (!this.animating) return;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

            this.particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.vRot;

                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                this.ctx.rotate((p.rotation * Math.PI) / 180);
                this.ctx.fillStyle = p.color;
                this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                this.ctx.restore();
            });

            if (Date.now() - startTime < durationMs) {
                requestAnimationFrame(render);
            } else {
                this.animating = false;
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
        };

        render();
    }
}

/* ==========================================================================
   3. LocalStorage Manager
   ========================================================================== */
class StorageManager {
    static KEYS = {
        XP: 'suraksha_xp',
        COINS: 'suraksha_coins',
        THEME: 'suraksha_theme',
        LEADERBOARD: 'suraksha_leaderboard',
        ACHIEVEMENTS: 'suraksha_achievements'
    };

    static getXP() { return parseInt(localStorage.getItem(this.KEYS.XP) || '0', 10); }
    static addXP(amount) {
        const newXP = this.getXP() + amount;
        localStorage.setItem(this.KEYS.XP, newXP.toString());
        return newXP;
    }

    static getCoins() { return parseInt(localStorage.getItem(this.KEYS.COINS) || '100', 10); }
    static addCoins(amount) {
        const newCoins = Math.max(0, this.getCoins() + amount);
        localStorage.setItem(this.KEYS.COINS, newCoins.toString());
        return newCoins;
    }

    static getTheme() { return localStorage.getItem(this.KEYS.THEME) || 'light'; }
    static setTheme(theme) { localStorage.setItem(this.KEYS.THEME, theme); }

    static getLeaderboard() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.LEADERBOARD) || '[]');
        } catch {
            return [];
        }
    }

    static saveScore(entry) {
        const board = this.getLeaderboard();
        board.push(entry);
        board.sort((a, b) => b.score - a.score || a.time - b.time);
        const trimmed = board.slice(0, 20); // Keep top 20
        localStorage.setItem(this.KEYS.LEADERBOARD, JSON.stringify(trimmed));
    }

    static getAchievements() {
        try {
            return JSON.parse(localStorage.getItem(this.KEYS.ACHIEVEMENTS) || '{}');
        } catch {
            return {};
        }
    }

    static unlockAchievement(id) {
        const ach = this.getAchievements();
        if (!ach[id]) {
            ach[id] = new Date().toISOString();
            localStorage.setItem(this.KEYS.ACHIEVEMENTS, JSON.stringify(ach));
            return true;
        }
        return false;
    }
}

/* ==========================================================================
   4. Automatic Crossword Layout Generator Algorithm
   ========================================================================== */
class CrosswordGenerator {
    constructor(gridSize = 13) {
        this.size = gridSize;
    }

    generate(wordList, maxWords = 10) {
        // Clean & filter words
        const cleanedWords = wordList
            .map(w => ({
                ...w,
                word: w.word.toUpperCase().replace(/[^A-Z]/g, '')
            }))
            .filter(w => w.word.length >= 3 && w.word.length <= this.size);

        // Sort by length descending for better layout placement
        cleanedWords.sort((a, b) => b.word.length - a.word.length);

        let bestGrid = null;
        let maxPlaced = -1;
        let placedWordDetails = [];

        // Try multiple layout attempts with shuffled starting seeds
        for (let attempt = 0; attempt < 5; attempt++) {
            const grid = Array(this.size).fill(null).map(() => Array(this.size).fill(null));
            const placed = [];
            
            // Randomize starting order slightly per attempt
            const candidateList = [...cleanedWords];
            if (attempt > 0) candidateList.sort(() => Math.random() - 0.5);

            for (const item of candidateList) {
                if (placed.length >= maxWords) break;

                if (placed.length === 0) {
                    // Place first word horizontally in middle
                    const row = Math.floor(this.size / 2);
                    const col = Math.floor((this.size - item.word.length) / 2);
                    if (this.canPlaceWord(grid, item.word, row, col, 'across')) {
                        this.placeWord(grid, item.word, row, col, 'across');
                        placed.push({ ...item, row, col, direction: 'across' });
                    }
                } else {
                    // Find best intersection placement
                    let bestFit = null;
                    let maxIntersections = -1;

                    for (let r = 0; r < this.size; r++) {
                        for (let c = 0; c < this.size; c++) {
                            for (const dir of ['across', 'down']) {
                                if (this.canPlaceWord(grid, item.word, r, c, dir)) {
                                    const intersections = this.countIntersections(grid, item.word, r, c, dir);
                                    if (intersections > maxIntersections) {
                                        maxIntersections = intersections;
                                        bestFit = { row: r, col: c, direction: dir };
                                    }
                                }
                            }
                        }
                    }

                    if (bestFit && maxIntersections > 0) {
                        this.placeWord(grid, item.word, bestFit.row, bestFit.col, bestFit.direction);
                        placed.push({ ...item, row: bestFit.row, col: bestFit.col, direction: bestFit.direction });
                    }
                }
            }

            if (placed.length > maxPlaced) {
                maxPlaced = placed.length;
                bestGrid = grid;
                placedWordDetails = placed;
            }
        }

        // Assign numbers to word starting positions
        placedWordDetails.sort((a, b) => a.row - b.row || a.col - b.col);
        
        let numberCounter = 1;
        const numberMap = {};

        placedWordDetails.forEach(w => {
            const key = `${w.row},${w.col}`;
            if (!numberMap[key]) {
                numberMap[key] = numberCounter++;
            }
            w.number = numberMap[key];
        });

        return {
            size: this.size,
            grid: bestGrid,
            words: placedWordDetails,
            numberMap
        };
    }

    canPlaceWord(grid, word, row, col, dir) {
        const len = word.length;
        if (dir === 'across') {
            if (col + len > this.size) return false;
            if (col > 0 && grid[row][col - 1] !== null) return false; // Before start
            if (col + len < this.size && grid[row][col + len] !== null) return false; // After end

            for (let i = 0; i < len; i++) {
                const curCol = col + i;
                const cell = grid[row][curCol];

                if (cell !== null && cell !== word[i]) return false; // Letter conflict

                // Check parallel adjacent cells if building new intersection
                if (cell === null) {
                    if (row > 0 && grid[row - 1][curCol] !== null) return false;
                    if (row < this.size - 1 && grid[row + 1][curCol] !== null) return false;
                }
            }
        } else {
            if (row + len > this.size) return false;
            if (row > 0 && grid[row - 1][col] !== null) return false; // Before start
            if (row + len < this.size && grid[row + len][col] !== null) return false; // After end

            for (let i = 0; i < len; i++) {
                const curRow = row + i;
                const cell = grid[curRow][col];

                if (cell !== null && cell !== word[i]) return false; // Letter conflict

                // Check parallel adjacent cells if building new intersection
                if (cell === null) {
                    if (col > 0 && grid[curRow][col - 1] !== null) return false;
                    if (col < this.size - 1 && grid[curRow][col + 1] !== null) return false;
                }
            }
        }
        return true;
    }

    placeWord(grid, word, row, col, dir) {
        for (let i = 0; i < word.length; i++) {
            if (dir === 'across') {
                grid[row][col + i] = word[i];
            } else {
                grid[row + i][col] = word[i];
            }
        }
    }

    countIntersections(grid, word, row, col, dir) {
        let count = 0;
        for (let i = 0; i < word.length; i++) {
            const r = dir === 'across' ? row : row + i;
            const c = dir === 'across' ? col + i : col;
            if (grid[r][c] === word[i]) count++;
        }
        return count;
    }
}

/* ==========================================================================
   5. Main Game Controller Engine
   ========================================================================== */
class SurakshaCrosswordGame {
    constructor() {
        this.sound = new SoundEngine();
        this.confetti = new ConfettiEngine('confetti-canvas');
        this.generator = new CrosswordGenerator(13);

        this.wordDatabase = [];
        this.currentPuzzle = null;
        this.selectedCell = { row: null, col: null };
        this.currentDirection = 'across'; // 'across' | 'down'

        // Gameplay Metrics
        this.timer = 0;
        this.timerInterval = null;
        this.moves = 0;
        this.incorrectAttempts = 0;
        this.isGameActive = false;

        this.initDOM();
        this.initEventListeners();
        this.applyTheme(StorageManager.getTheme());
        this.updateUserStatsUI();
        this.loadWordDatabase();
    }

    /* DOM Elements Reference Initialization */
    initDOM() {
        this.dom = {
            grid: document.getElementById('crossword-grid'),
            loading: document.getElementById('loading-spinner'),
            hintsAcross: document.getElementById('hints-across'),
            hintsDown: document.getElementById('hints-down'),
            timer: document.getElementById('timer-display'),
            moves: document.getElementById('move-counter'),
            accuracy: document.getElementById('accuracy-display'),
            progressBar: document.getElementById('puzzle-progress-bar'),
            xp: document.getElementById('xp-display'),
            coins: document.getElementById('coin-display'),
            difficulty: document.getElementById('difficulty-selector'),
            category: document.getElementById('category-selector'),
            themeBtn: document.getElementById('theme-toggle'),
            
            // Buttons
            btnCheck: document.getElementById('btn-check'),
            btnRevealLetter: document.getElementById('btn-reveal-letter'),
            btnRevealWord: document.getElementById('btn-reveal-word'),
            btnRevealPuzzle: document.getElementById('btn-reveal-puzzle'),
            btnReset: document.getElementById('btn-reset'),
            btnNew: document.getElementById('btn-new'),
            
            // Modals
            winModal: document.getElementById('win-modal'),
            leaderboardModal: document.getElementById('leaderboard-modal'),
            achievementsModal: document.getElementById('achievements-modal'),
            btnLeaderboard: document.getElementById('btn-leaderboard'),
            btnAchievements: document.getElementById('btn-achievements'),
            btnNextPuzzle: document.getElementById('btn-next-puzzle'),
            btnCloseWin: document.getElementById('btn-close-win'),
            
            toastContainer: document.getElementById('toast-container')
        };
    }

    /* Event Listeners setup */
    initEventListeners() {
        // Theme Toggle
        this.dom.themeBtn.addEventListener('click', () => {
            const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            this.applyTheme(newTheme);
            this.sound.playClick();
        });

        // Selectors
        this.dom.difficulty.addEventListener('change', () => this.generateNewPuzzle());
        this.dom.category.addEventListener('change', () => this.generateNewPuzzle());

        // Action Controls
        this.dom.btnCheck.addEventListener('click', () => this.checkAnswers());
        this.dom.btnRevealLetter.addEventListener('click', () => this.revealOneLetter());
        this.dom.btnRevealWord.addEventListener('click', () => this.revealOneWord());
        this.dom.btnRevealPuzzle.addEventListener('click', () => this.revealPuzzle());
        this.dom.btnReset.addEventListener('click', () => this.resetPuzzle());
        this.dom.btnNew.addEventListener('click', () => this.generateNewPuzzle());

        // Modal triggers & handlers
        this.dom.btnLeaderboard.addEventListener('click', () => this.showLeaderboard());
        this.dom.btnAchievements.addEventListener('click', () => this.showAchievements());
        this.dom.btnNextPuzzle.addEventListener('click', () => {
            this.hideModals();
            this.generateNewPuzzle();
        });
        this.dom.btnCloseWin.addEventListener('click', () => this.hideModals());

        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.hideModals());
        });

        // Global Keyboard Event Navigation
        document.addEventListener('keydown', (e) => this.handleGlobalKeyDown(e));
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.dom.themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
        StorageManager.setTheme(theme);
    }

    updateUserStatsUI() {
        this.dom.xp.textContent = StorageManager.getXP();
        this.dom.coins.textContent = StorageManager.getCoins();
    }

    /* Load Words Database */
    async loadWordDatabase() {
        this.showLoading(true);
        try {
            const response = await fetch('words.json');
            if (!response.ok) throw new Error("Failed to fetch words.json");
            this.wordDatabase = await response.json();
        } catch (err) {
            console.warn("Using embedded fallback security words due to fetch restriction:", err);
            this.wordDatabase = [
                { word: "GUARD", hint: "Security professional on patrol duty", category: "guard", difficulty: "easy" },
                { word: "ACCESS", hint: "Entry authorization control system", category: "access", difficulty: "easy" },
                { word: "SAFETY", hint: "Protection from danger or risk", category: "emergency", difficulty: "easy" },
                { word: "ALARM", hint: "Emergency notification signal device", category: "fire", difficulty: "easy" },
                { word: "PATROL", hint: "Regular physical inspection round", category: "guard", difficulty: "medium" },
                { word: "CAMERA", hint: "CCTV surveillance monitoring unit", category: "access", difficulty: "easy" },
                { word: "FIRE", hint: "Hazard requiring extinguisher response", category: "fire", difficulty: "easy" },
                { word: "GATE", hint: "Physical barrier entry point", category: "access", difficulty: "easy" },
                { word: "BADGE", hint: "Identification tag for site personnel", category: "guard", difficulty: "easy" },
                { word: "RISK", hint: "Assessment of potential vulnerability", category: "emergency", difficulty: "medium" }
            ];
        } finally {
            this.showLoading(false);
            this.generateNewPuzzle();
        }
    }

    showLoading(state) {
        if (state) {
            this.dom.loading.classList.add('visible');
        } else {
            this.dom.loading.classList.remove('visible');
        }
    }

    /* Generate and render a new dynamic puzzle */
    generateNewPuzzle() {
        this.stopTimer();
        this.moves = 0;
        this.incorrectAttempts = 0;
        this.updateMetricsUI();

        const diff = this.dom.difficulty.value;
        const cat = this.dom.category.value;

        // Filter database
        let filtered = this.wordDatabase.filter(w => {
            const matchDiff = diff === 'all' || w.difficulty === diff;
            const matchCat = cat === 'all' || w.category === cat;
            return matchDiff && matchCat;
        });

        if (filtered.length < 5) {
            filtered = this.wordDatabase; // Fallback to all words if filter too strict
        }

        // Generate puzzle object
        this.currentPuzzle = this.generator.generate(filtered, 10);
        
        if (!this.currentPuzzle || this.currentPuzzle.words.length === 0) {
            this.showToast("Failed to generate puzzle layout. Try different settings.", "error");
            return;
        }

        this.renderGrid();
        this.renderHints();
        this.startTimer();
        this.isGameActive = true;
        this.updateProgress();
        this.showToast("New Security Crossword Loaded!", "info");
    }

    /* Render Crossword Grid */
    renderGrid() {
        const { size, grid, numberMap } = this.currentPuzzle;
        this.dom.grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        this.dom.grid.innerHTML = '';

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const cellVal = grid[r][c];
                const cellDiv = document.createElement('div');
                cellDiv.className = 'crossword-cell';
                cellDiv.dataset.row = r;
                cellDiv.dataset.col = c;

                if (cellVal === null) {
                    cellDiv.classList.add('cell-empty');
                } else {
                    const key = `${r},${c}`;
                    if (numberMap[key]) {
                        const numSpan = document.createElement('span');
                        numSpan.className = 'cell-number';
                        numSpan.textContent = numberMap[key];
                        cellDiv.appendChild(numSpan);
                    }

                    const input = document.createElement('input');
                    input.type = 'text';
                    input.maxLength = 1;
                    input.className = 'cell-input';
                    input.setAttribute('aria-label', `Cell ${r + 1}, ${c + 1}`);
                    
                    // Input events
                    input.addEventListener('focus', () => this.selectCell(r, c));
                    input.addEventListener('input', (e) => this.handleInput(e, r, c));
                    input.addEventListener('click', () => {
                        if (this.selectedCell.row === r && this.selectedCell.col === c) {
                            // Toggle direction on second tap
                            this.currentDirection = this.currentDirection === 'across' ? 'down' : 'across';
                            this.highlightCurrentWord();
                        }
                    });

                    cellDiv.appendChild(input);
                }

                this.dom.grid.appendChild(cellDiv);
            }
        }
    }

    /* Render Clue Lists */
    renderHints() {
        this.dom.hintsAcross.innerHTML = '';
        this.dom.hintsDown.innerHTML = '';

        const acrossWords = this.currentPuzzle.words.filter(w => w.direction === 'across');
        const downWords = this.currentPuzzle.words.filter(w => w.direction === 'down');

        const createHintItem = (w) => {
            const li = document.createElement('li');
            li.className = 'hint-item';
            li.dataset.word = w.word;
            li.dataset.number = w.number;
            li.dataset.direction = w.direction;

            li.innerHTML = `
                <span class="hint-number">${w.number}.</span>
                <span class="hint-text">${w.hint} (${w.word.length})</span>
            `;

            li.addEventListener('click', () => {
                this.currentDirection = w.direction;
                this.selectCell(w.row, w.col);
                this.focusCellInput(w.row, w.col);
            });

            return li;
        };

        acrossWords.forEach(w => this.dom.hintsAcross.appendChild(createHintItem(w)));
        downWords.forEach(w => this.dom.hintsDown.appendChild(createHintItem(w)));
    }

    /* Cell Selection and Highlighting */
    selectCell(row, col) {
        this.selectedCell = { row, col };
        this.sound.playClick();

        // Clear existing highlights
        document.querySelectorAll('.crossword-cell').forEach(el => {
            el.classList.remove('cell-active', 'cell-highlighted');
        });

        this.highlightCurrentWord();
    }

    highlightCurrentWord() {
        const { row, col } = this.selectedCell;
        if (row === null || col === null) return;

        // Active Cell
        const activeCellDiv = this.getCellElement(row, col);
        if (activeCellDiv) activeCellDiv.classList.add('cell-active');

        // Find associated active word
        const activeWord = this.currentPuzzle.words.find(w => {
            if (w.direction !== this.currentDirection) return false;
            if (w.direction === 'across') {
                return row === w.row && col >= w.col && col < w.col + w.word.length;
            } else {
                return col === w.col && row >= w.row && row < w.row + w.word.length;
            }
        });

        // Highlight word sequence in grid and active clue in sidebar
        document.querySelectorAll('.hint-item').forEach(el => el.classList.remove('active'));

        if (activeWord) {
            // Highlight clue in sidebar
            const hintLi = document.querySelector(`.hint-item[data-number="${activeWord.number}"][data-direction="${activeWord.direction}"]`);
            if (hintLi) {
                hintLi.classList.add('active');
                hintLi.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }

            // Highlight cells
            for (let i = 0; i < activeWord.word.length; i++) {
                const r = activeWord.direction === 'across' ? activeWord.row : activeWord.row + i;
                const c = activeWord.direction === 'across' ? activeWord.col + i : activeWord.col;
                const cellEl = this.getCellElement(r, c);
                if (cellEl && !(r === row && c === col)) {
                    cellEl.classList.add('cell-highlighted');
                }
            }
        }
    }

    /* Handle Character Input */
    handleInput(e, row, col) {
        const val = e.target.value.toUpperCase();
        e.target.value = val;

        // Clear wrong indicator on edit
        const cellEl = this.getCellElement(row, col);
        if (cellEl) cellEl.classList.remove('cell-wrong');

        this.moves++;
        this.updateMetricsUI();
        this.updateProgress();

        if (val.length > 0) {
            this.moveCursor(1);
        }

        this.checkAutoCompletion();
    }

    /* Move Cursor in current word direction */
    moveCursor(step = 1) {
        const { row, col } = this.selectedCell;
        if (row === null || col === null) return;

        let nextR = row;
        let nextC = col;

        if (this.currentDirection === 'across') {
            nextC += step;
        } else {
            nextR += step;
        }

        const nextCell = this.getCellElement(nextR, nextC);
        if (nextCell && !nextCell.classList.contains('cell-empty')) {
            this.selectCell(nextR, nextC);
            this.focusCellInput(nextR, nextC);
        }
    }

    /* Keyboard Navigation */
    handleGlobalKeyDown(e) {
        if (!this.isGameActive || this.selectedCell.row === null) return;

        const { row, col } = this.selectedCell;

        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.navigateGrid(row, col - 1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.navigateGrid(row, col + 1);
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.navigateGrid(row - 1, col);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.navigateGrid(row + 1, col);
                break;
            case 'Backspace':
                const input = this.getCellInput(row, col);
                if (input && input.value === '') {
                    this.moveCursor(-1);
                }
                break;
            case 'Tab':
                e.preventDefault();
                this.currentDirection = this.currentDirection === 'across' ? 'down' : 'across';
                this.highlightCurrentWord();
                break;
        }
    }

    navigateGrid(r, c) {
        const target = this.getCellElement(r, c);
        if (target && !target.classList.contains('cell-empty')) {
            this.selectCell(r, c);
            this.focusCellInput(r, c);
        }
    }

    /* Check Answers Action */
    checkAnswers() {
        if (!this.isGameActive) return;

        let totalCorrect = 0;
        let totalCells = 0;
        let errorsFound = false;

        this.currentPuzzle.words.forEach(w => {
            for (let i = 0; i < w.word.length; i++) {
                const r = w.direction === 'across' ? w.row : w.row + i;
                const c = w.direction === 'across' ? w.col + i : w.col;
                const expected = w.word[i];
                const inputEl = this.getCellInput(r, c);
                const cellEl = this.getCellElement(r, c);

                if (inputEl && cellEl) {
                    totalCells++;
                    const userVal = inputEl.value.toUpperCase();
                    if (userVal === expected) {
                        cellEl.classList.add('cell-correct');
                        cellEl.classList.remove('cell-wrong');
                        totalCorrect++;
                    } else if (userVal !== '') {
                        cellEl.classList.add('cell-wrong');
                        cellEl.classList.remove('cell-correct');
                        errorsFound = true;
                    }
                }
            }
        });

        if (errorsFound) {
            this.incorrectAttempts++;
            this.sound.playWrong();
            this.showToast("Some answers are incorrect. Keep trying!", "error");
        } else if (totalCorrect === totalCells) {
            this.onWin();
        } else {
            this.sound.playSuccess();
            this.showToast("All entered letters are correct so far!", "success");
        }

        this.updateMetricsUI();
    }

    /* Reveal Mechanics */
    revealOneLetter() {
        if (StorageManager.getCoins() < 10) {
            this.showToast("Not enough coins! (Requires 10 Coins)", "error");
            return;
        }

        const { row, col } = this.selectedCell;
        if (row === null || col === null) {
            this.showToast("Select a cell first to reveal its letter.", "info");
            return;
        }

        const expected = this.currentPuzzle.grid[row][col];
        if (!expected) return;

        const input = this.getCellInput(row, col);
        if (input && input.value !== expected) {
            input.value = expected;
            StorageManager.addCoins(-10);
            this.updateUserStatsUI();
            this.sound.playSuccess();
            this.checkAutoCompletion();
            this.showToast("Letter revealed! (-10 Coins)", "info");
        }
    }

    revealOneWord() {
        if (StorageManager.getCoins() < 25) {
            this.showToast("Not enough coins! (Requires 25 Coins)", "error");
            return;
        }

        const { row, col } = this.selectedCell;
        if (row === null || col === null) return;

        const activeWord = this.currentPuzzle.words.find(w => {
            if (w.direction !== this.currentDirection) return false;
            if (w.direction === 'across') return row === w.row && col >= w.col && col < w.col + w.word.length;
            return col === w.col && row >= w.row && row < w.row + w.word.length;
        });

        if (!activeWord) return;

        for (let i = 0; i < activeWord.word.length; i++) {
            const r = activeWord.direction === 'across' ? activeWord.row : activeWord.row + i;
            const c = activeWord.direction === 'across' ? activeWord.col + i : activeWord.col;
            const input = this.getCellInput(r, c);
            if (input) input.value = activeWord.word[i];
        }

        StorageManager.addCoins(-25);
        this.updateUserStatsUI();
        this.sound.playSuccess();
        this.checkAutoCompletion();
        this.showToast(`Word "${activeWord.word}" revealed! (-25 Coins)`, "info");
    }

    revealPuzzle() {
        if (!confirm("Are you sure you want to reveal the entire puzzle? You won't earn XP or Coins.")) return;

        this.currentPuzzle.words.forEach(w => {
            for (let i = 0; i < w.word.length; i++) {
                const r = w.direction === 'across' ? w.row : w.row + i;
                const c = w.direction === 'across' ? w.col + i : w.col;
                const input = this.getCellInput(r, c);
                if (input) input.value = w.word[i];
            }
        });

        this.stopTimer();
        this.isGameActive = false;
        this.sound.playClick();
        this.showToast("Puzzle revealed.", "info");
    }

    resetPuzzle() {
        document.querySelectorAll('.cell-input').forEach(input => input.value = '');
        document.querySelectorAll('.crossword-cell').forEach(cell => cell.classList.remove('cell-correct', 'cell-wrong'));
        this.moves = 0;
        this.incorrectAttempts = 0;
        this.updateMetricsUI();
        this.updateProgress();
        this.showToast("Puzzle reset.", "info");
    }

    /* Auto-Check Completion */
    checkAutoCompletion() {
        let isComplete = true;

        this.currentPuzzle.words.forEach(w => {
            for (let i = 0; i < w.word.length; i++) {
                const r = w.direction === 'across' ? w.row : w.row + i;
                const c = w.direction === 'across' ? w.col + i : w.col;
                const input = this.getCellInput(r, c);
                if (!input || input.value.toUpperCase() !== w.word[i]) {
                    isComplete = false;
                }
            }
        });

        if (isComplete) this.onWin();
    }

    /* Win Trigger */
    onWin() {
        if (!this.isGameActive) return;
        this.isGameActive = false;
        this.stopTimer();

        this.sound.playWin();
        this.confetti.trigger(4000);

        // Calculate Rewards
        const timeSpent = this.timer;
        const accuracy = Math.max(0, Math.round(100 - (this.incorrectAttempts * 10)));
        const score = Math.max(100, (1000 - timeSpent * 2) + accuracy * 5);
        const xpEarned = Math.round(score / 10);
        const coinsEarned = 20;

        // Persist Stats
        StorageManager.addXP(xpEarned);
        StorageManager.addCoins(coinsEarned);
        StorageManager.saveScore({
            date: new Date().toLocaleDateString(),
            score,
            time: timeSpent,
            difficulty: this.dom.difficulty.value
        });

        this.checkAchievements(accuracy, timeSpent);
        this.updateUserStatsUI();

        // Populate Win Modal UI
        document.getElementById('win-time').textContent = this.formatTime(timeSpent);
        document.getElementById('win-accuracy').textContent = `${accuracy}%`;
        document.getElementById('win-score').textContent = score;
        document.getElementById('win-xp').textContent = `+${xpEarned} XP (+${coinsEarned} 🪙)`;

        // Stars calculation
        const starsContainer = document.getElementById('win-stars');
        const starsCount = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : 1;
        starsContainer.textContent = '⭐'.repeat(starsCount);

        this.dom.winModal.classList.remove('hidden');
    }

    checkAchievements(accuracy, timeSpent) {
        if (accuracy === 100) {
            if (StorageManager.unlockAchievement('sharpshooter')) {
                this.showToast("🏆 Unlocked: Sharpshooter (100% Accuracy)", "success");
            }
        }
        if (timeSpent < 120) {
            if (StorageManager.unlockAchievement('speed_demon')) {
                this.showToast("🏆 Unlocked: Speed Demon (Under 2 Mins)", "success");
            }
        }
        if (StorageManager.unlockAchievement('first_win')) {
            this.showToast("🏆 Unlocked: First Responder (First Puzzle Win)", "success");
        }
    }

    /* UI Progress & Metrics Helpers */
    updateMetricsUI() {
        this.dom.moves.textContent = this.moves;
        const totalAttempts = this.moves + this.incorrectAttempts;
        const acc = totalAttempts > 0 ? Math.max(0, Math.round(100 - (this.incorrectAttempts * 10))) : 100;
        this.dom.accuracy.textContent = `${acc}%`;
    }

    updateProgress() {
        let filled = 0;
        let total = 0;

        this.currentPuzzle.words.forEach(w => {
            for (let i = 0; i < w.word.length; i++) {
                const r = w.direction === 'across' ? w.row : w.row + i;
                const c = w.direction === 'across' ? w.col + i : w.col;
                const input = this.getCellInput(r, c);
                total++;
                if (input && input.value.trim() !== '') filled++;
            }
        });

        const pct = total > 0 ? Math.min(100, Math.round((filled / total) * 100)) : 0;
        this.dom.progressBar.style.width = `${pct}%`;
    }

    /* Timer Methods */
    startTimer() {
        this.stopTimer();
        this.timer = 0;
        this.dom.timer.textContent = "00:00";
        this.timerInterval = setInterval(() => {
            this.timer++;
            this.dom.timer.textContent = this.formatTime(this.timer);
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
    }

    formatTime(sec) {
        const m = Math.floor(sec / 60).toString().padStart(2, '0');
        const s = (sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    /* Helpers */
    getCellElement(r, c) {
        return this.dom.grid.querySelector(`.crossword-cell[data-row="${r}"][data-col="${c}"]`);
    }

    getCellInput(r, c) {
        const cell = this.getCellElement(r, c);
        return cell ? cell.querySelector('.cell-input') : null;
    }

    focusCellInput(r, c) {
        const input = this.getCellInput(r, c);
        if (input) input.focus();
    }

    /* Modal Navigation */
    showLeaderboard() {
        const board = StorageManager.getLeaderboard();
        const content = document.getElementById('leaderboard-content');
        
        if (board.length === 0) {
            content.innerHTML = `<p class="text-muted" style="text-align:center; padding:20px;">No high scores recorded yet!</p>`;
        } else {
            let html = `
                <table class="leaderboard-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Date</th>
                            <th>Diff</th>
                            <th>Time</th>
                            <th>Score</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            board.forEach((entry, i) => {
                html += `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${entry.date}</td>
                        <td>${entry.difficulty}</td>
                        <td>${this.formatTime(entry.time)}</td>
                        <td><strong>${entry.score}</strong></td>
                    </tr>
                `;
            });
            html += `</tbody></table>`;
            content.innerHTML = html;
        }

        this.dom.leaderboardModal.classList.remove('hidden');
    }

    showAchievements() {
        const unlocked = StorageManager.getAchievements();
        const content = document.getElementById('achievements-content');

        const achievementsList = [
            { id: 'first_win', title: 'First Responder', desc: 'Complete your first security puzzle', icon: '🛡️' },
            { id: 'sharpshooter', title: 'Sharpshooter', desc: 'Complete a puzzle with 100% accuracy', icon: '🎯' },
            { id: 'speed_demon', title: 'Speed Demon', desc: 'Complete a puzzle in under 2 minutes', icon: '⚡' }
        ];

        let html = '';
        achievementsList.forEach(ach => {
            const isUnlocked = !!unlocked[ach.id];
            html += `
                <div class="achievement-card ${isUnlocked ? 'unlocked' : ''}">
                    <div class="icon">${ach.icon}</div>
                    <div class="info">
                        <h4>${ach.title} ${isUnlocked ? '✅' : '🔒'}</h4>
                        <p>${ach.desc}</p>
                    </div>
                </div>
            `;
        });

        content.innerHTML = html;
        this.dom.achievementsModal.classList.remove('hidden');
    }

    hideModals() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        this.dom.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

/* ==========================================================================
   6. App Initialization Trigger
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    window.surakshaGame = new SurakshaCrosswordGame();
});
