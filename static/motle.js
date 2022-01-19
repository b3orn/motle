var motle = (function() {
    var motle = {};
    
    motle.init = function(word) {
        this.grid = document.getElementById("grid");
        this.letters = "abcdefghijklmnopqrstuvwxyz"
        this.keyboard = {};
        this.knownWords = [];
        this.state = this.newState(word);

        this.initKnownWords();
        this.initKeyboard();
        this.initEventHandlers();
        this.initState(word);
    };

    motle.initState = function(word) {
        var state = window.localStorage.getItem("state");

        if (!state) {
            this.showHelp();
        } else {
            this.state = JSON.parse(state);

            if (this.state.daily.word !== word) {
                state.daily = {
                    word: word,
                    ended: false,
                    guess: [],
                    guessHistory: [],
                    closenessHistory: [],
                    row: 0,
                    column: 0
                };
            }

            if (this.state.mode === "random" && this.state.random.ended) {
                this.modeRandom();
            }

            this.restoreState();
        }

        this.saveState();
    };

    motle.newState = function(word) {
        return {
            mode: "daily",
            daily: {
                word: word,
                ended: false,
                row: 0,
                column: 0,
                guess: [],
                guessHistory: [],
                closenessHistory: [],
                won: 0,
                lost: 0
            },
            random: {
                word: undefined,
                ended: false,
                row: 0,
                column: 0,
                guess: [],
                guessHistory: [],
                closenessHistory: [],
                won: 0,
                lost: 0
            }
        };
    };

    motle.initKeyboard = function() {
        var elements = document.querySelectorAll("#keyboard .key");
        for (var i = 0; i < elements.length; ++i) {
            var el = elements[i];
            el.addEventListener("click", this.virtualKeyboardEventHandler.bind(this))

            if (el.dataset.key.length == 1) {
                this.keyboard[el.dataset.key] = el;
            }
        }
    };

    motle.initEventHandlers = function() {
        window.addEventListener("keyup", this.eventHandler.bind(this));

        var buttons = {
            "show-help": this.showHelp,
            "hide-help": this.hideHelp,
            "help": this.hideHelp,
            "show-stats": this.showStats,
            "hide-stats": this.hideStats,
            "stats": this.hideStats,
            "reset": this.resetState,
            "random": this.modeRandom,
            "word-of-the-day": this.modeDaily
        };

        for (var key in buttons) {
            document.getElementById(key).addEventListener("click", buttons[key].bind(this));
        }
    };

    motle.initKnownWords = function() {
        var stored = window.localStorage.getItem("words");

        if (stored) {
            var parsed = JSON.parse(stored);

            this.knownWords = parsed.words;

            if (Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
                return;
            }
        }

        this.fetchKnownWords().then(function(words) {
            this.knownWords = words;

            window.localStorage.setItem("words", JSON.stringify({
                words: words,
                timestamp: Date.now()
            }));
        }.bind(this));
    };

    motle.eventHandler = function(e) {
        if (this.ended) {
            return;
        }

        var key = e.key.toLowerCase();

        if (key === "backspace") {
            this.removeLetter();
        } else if (key === "enter") {
            this.submitGuess();
        } else if (this.letters.indexOf(key) != -1) {
            this.addLetter(key);
        }
    };

    motle.virtualKeyboardEventHandler = function(event) {
        event.target.blur();
        this.eventHandler({key: event.target.dataset.key});
    };

    motle.showHelp = function(event) {
        if (event) {
            event.target.blur();
        }

        document.querySelector("#help").classList.add("visible");
        document.querySelector("nav").classList.add("blurred");
        document.querySelector("main").classList.add("blurred");
        document.querySelector("footer").classList.add("blurred");
    };

    motle.hideHelp = function(event) {
        if (event) {
            event.target.blur();

            if (event.target.id !== "help" && event.target.id !== "hide-help") {
                return;
            }
        }

        document.querySelector("#help").classList.remove("visible");
        document.querySelector("nav").classList.remove("blurred");
        document.querySelector("main").classList.remove("blurred");
        document.querySelector("footer").classList.remove("blurred");
    };

    motle.showStats = function(event) {
        var stats = this.state[this.state.mode];

        if (event) {
            event.target.blur();
        }

        this.hideHelp();

        document.querySelector("#stats span").textContent = "" + stats.won + "/" + (stats.won + stats.lost);

        document.querySelector("#stats").classList.add("visible");
        document.querySelector("nav").classList.add("blurred");
        document.querySelector("main").classList.add("blurred");
        document.querySelector("footer").classList.add("blurred");
    };

    motle.hideStats = function(event) {
        event.target.blur();

        if (event.target.id !== "stats" && event.target.id !== "hide-stats") {
            return;
        }

        document.querySelector("#stats").classList.remove("visible");
        document.querySelector("nav").classList.remove("blurred");
        document.querySelector("main").classList.remove("blurred");
        document.querySelector("footer").classList.remove("blurred");
    };

    motle.resetState = function(event) {
        event.target.blur();
        
        this.state = this.newState(this.state.daily.word);

        this.saveState();
        this.restoreState();
    };

    motle.modeDaily = function(event) {
        event.target.blur();

        this.state.mode = "daily";

        this.saveState();
        this.restoreState();
    };

    motle.modeRandom = function(event) {
        if (event) {
            event.target.blur();
        }

        if (this.state.mode === "random" || this.state.random.ended || !this.state.random.word) {
            if (!this.state.random.ended && this.state.random.word) {
                this.state.random.lost++;
            }

            this.state.random = Object.assign(this.state.random, {
                word: this.knownWords[Math.floor(Math.random() * this.knownWords.length)],
                ended: false,
                row: 0,
                column: 0,
                guess: [],
                guessHistory: [],
                closenessHistory: []
            });
        }

        this.state.mode = "random";

        this.saveState();
        this.restoreState();
    };

    motle.removeLetter = function() {
        var state = this.state[this.state.mode];

        if (state.ended) {
            return;
        }

        if (state.column > 0) {
            state.guess.pop();
            state.column--;
            this.grid.children[5 * state.row + state.column].textContent = "";
        }

        this.saveState();
    };

    motle.addLetter = function(letter) {
        var state = this.state[this.state.mode];

        if (state.ended) {
            return;
        }

        if (state.column < 5) {
            state.guess.push(letter);
            this.grid.children[5 * state.row + state.column].textContent = letter;
            state.column++;
        }

        this.saveState();
    };

    motle.submitGuess = function() {
        var state = this.state[this.state.mode];

        if (state.ended) {
            return;
        }

        if (state.row <= 5 && state.column == 5) {
            if (this.checkWord(state.guess.join(""))) {
                state.row++;
                state.column = 0;
                state.guess = [];
            }
        }

        this.saveState();
    };

    motle.checkWord = function(guess) {
        var state = this.state[this.state.mode];

        if (state.row > 5 || !this.isKnownWord(guess)) {
            return false;
        }

        var closeness = this.checkCloseness(guess);

        if (guess === state.word || state.row === 5) {
            state.ended = true;

            if (guess === state.word) {
                state.won++;
            } else {
                state.lost++;
            }

            this.showStats();
        }

        state.guessHistory.push(guess);
        state.closenessHistory.push(closeness);

        for (var i = 0; i < 5; ++i) {
            this.grid.children[5 * state.row + i].classList.add("active");

            if (closeness[i] == i) {
                this.grid.children[5 * state.row + i].classList.add("correct");
            } else if (closeness[i] !== -1) {
                this.grid.children[5 * state.row + i].classList.add("close");
            }
        }

        return true;
    };

    motle.isKnownWord = function(guess) {
        var state = this.state[this.state.mode];

        if (this.knownWords.indexOf(guess) !== -1) {
            return true;
        }

        document.getElementById("unknown-word").classList.add("visible");

        for (var i = 0; i < 5; ++i) {
            this.grid.children[5 * state.row + i].classList.add("shake");
        }

        setTimeout(function() {
            for (var i = 0; i < 5; ++i) {
                this.grid.children[5 * state.row + i].classList.remove("shake");
            }
        }.bind(this), 1000);

        setTimeout(function() {
            document.getElementById("unknown-word").classList.remove("visible");
        }, 3000);

        return false;
    };

    motle.checkCloseness = function(guess) {
        var res = [-1, -1, -1, -1, -1],
            word = this.state[this.state.mode].word;

        for (var i = 0; i < 5; ++i) {
            if (word[i] === guess[i]) {
                res[i] = i;
                this.keyboard[guess[i]].classList.add("correct");
                word = word.replace(guess[i], " ");
            }
        }

        for (var i = 0; i < 5; ++i) {
            if (res[i] == i) {
                continue;
            }

            var index = word.indexOf(guess[i]);

            if (index === -1) {
                res[i] = -1
                this.keyboard[guess[i]].classList.add("inactive");
            } else {
                res[i] = index;
                this.keyboard[guess[i]].classList.add("close");
                word = word.replace(guess[i], " ");
            }
        }

        return res;
    };

    motle.resetGrid = function() {
        for (var i = 0; i < this.grid.children.length; ++i) {
            var el = this.grid.children[i];
            
            el.textContent = "";
            el.classList.remove("active", "correct", "close");
        }

        for (var k in this.keyboard) {
            this.keyboard[k].classList.remove("inactive", "correct", "close")
        }
    };

    motle.saveState = function() {
        window.localStorage.setItem("state", JSON.stringify(this.state));
    };

    motle.restoreState = function() {
        var state = this.state[this.state.mode];

        this.resetGrid();

        for (var j = 0; j < state.row; ++j) {
            for (var i = 0; i < 5; ++i) {
                this.grid.children[5 * j + i].textContent = state.guessHistory[j][i];

                this.grid.children[5 * j + i].classList.add("active");

                if (state.closenessHistory[j][i] === i) {
                    this.grid.children[5 * j + i].classList.add("correct");
                    this.keyboard[state.guessHistory[j][i]].classList.add("correct");
                } else if (state.closenessHistory[j][i] !== -1) {
                    this.grid.children[5 * j + i].classList.add("close");
                    this.keyboard[state.guessHistory[j][i]].classList.add("close");
                } else {
                    this.keyboard[state.guessHistory[j][i]].classList.add("inactive");
                }
            }
        }

        for (var i = 0; i < state.column; ++i) {
            this.grid.children[5 * state.row + i].textContent = state.guess[i];
        }
    };

    motle.fetchHistory = function() {
        return fetch("/api/history").then(function(r) {
            return r.text();
        }).then(function(text) {
            return new Promise(function(resolve, reject) {
                resolve(text.split("\n"));
            });
        });
    };

    motle.fetchKnownWords = function() {
        return fetch("/api/words").then(function(r) {
            return r.text();
        }).then(function(text) {
            return new Promise(function(resolve, reject) {
                resolve(text.split("\n"));
            });
        });
    };

    return motle;
})();
