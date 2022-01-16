var motle = (function() {
    var motle = {};
    
    motle.init = function(word) {
        this.grid = document.getElementById("grid");
        this.letters = "abcdefghijklmnopqrstuvwxyz"
        this.keyboard = {};
        this.knownWords = [];
        this.state = {
            wordOfTheDay: word,
            word: word,
            ended: false,
            won: 0,
            lost: 0,
            closenessHistory: [],
            guessHistory: [],
            row: 0,
            column: 0,
            guess: []
        };

        this.initKnownWords();
        this.initKeyboard();
        this.initEventHandlers();
        this.initState(word);
    };

    motle.initState = function(word) {
        var state = window.localStorage.getItem("state");

        if (!state) {
            this.showHelp({target: document.getElementById("show-help")});
        } else {
            this.state = JSON.parse(state);

            if (this.state.word === this.state.wordOfTheDay && this.state.wordOfTheDay !== word) {
                this.state.guess = [];
                this.state.guessHistory = [];
                this.state.closenessHistory = [];
                this.state.row = 0;
                this.state.column = 0;
                this.state.wordOfTheDay = word;
                this.state.word = word;
                this.state.ended = false;
            } else {
                this.state.wordOfTheDay = word;
                this.restoreState();
            }
        }

        this.saveState();
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
            "reset": this.resetState,
            "random": this.modeRandom,
            "word-of-the-day": this.modeWordOfTheDay
        };

        for (var key in buttons) {
            document.getElementById(key).addEventListener("click", buttons[key].bind(this));
        }
    };

    motle.initKnownWords = function() {
        this.fetchKnownWords().then(function(words) {
            this.knownWords = words;
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
        event.target.blur();
        document.querySelector("#help").classList.add("visible");
        document.querySelector("nav").classList.add("blurred");
        document.querySelector("main").classList.add("blurred");
        document.querySelector("footer").classList.add("blurred");
    };

    motle.hideHelp = function(event) {
        if (event.target.id !== "help" && event.target.id !== "hide-help") {
            return;
        }

        event.target.blur();
        document.querySelector("#help").classList.remove("visible");
        document.querySelector("nav").classList.remove("blurred");
        document.querySelector("main").classList.remove("blurred");
        document.querySelector("footer").classList.remove("blurred");
    };

    motle.resetState = function(event) {
        event.target.blur();
        this.state = {
            wordOfTheDay: this.state.wordOfTheDay,
            word: this.state.wordOfTheDay,
            ended: false,
            won: 0,
            lost: 0,
            closenessHistory: [],
            guessHistory: [],
            row: 0,
            column: 0,
            guess: []
        };
        this.saveState();
        this.restoreState();
    };

    motle.modeWordOfTheDay = function(event) {
        event.target.blur();

        if (this.state.word === this.state.wordOfTheDay) {
            return;
        }

        this.reset();

        this.state.word = this.state.wordOfTheDay;

        this.saveState();
    };

    motle.modeRandom = function(event) {
        event.target.blur();
        this.reset();

        this.state.word = this.knownWords[Math.floor(Math.random() * this.knownWords.length)];

        this.saveState();
    };

    motle.reset = function() {
        this.state.ended = false;
        this.state.row = 0;
        this.state.column = 0;
        this.state.guess = [];
        this.state.guessHistory = [];
        this.state.closenessHistory = [];

        for (var i = 0; i < this.grid.children.length; ++i) {
            var el = this.grid.children[i]
            
            el.textContent = "";
            el.classList.remove("active", "correct", "close");
        }

        for (var k in this.keyboard) {
            this.keyboard[k].classList.remove("inactive", "correct", "close")
        }

        this.saveState();
    };

    motle.removeLetter = function() {
        if (this.state.ended) {
            return;
        }

        if (this.state.column > 0) {
            this.state.guess.pop();
            this.state.column--;
            this.grid.children[5 * this.state.row + this.state.column].textContent = "";
        }

        this.saveState();
    };

    motle.addLetter = function(letter) {
        if (this.state.ended) {
            return;
        }

        if (this.state.column < 5) {
            this.state.guess.push(letter);
            this.grid.children[5 * this.state.row + this.state.column].textContent = letter;
            this.state.column++;
        }

        this.saveState();
    };

    motle.submitGuess = function() {
        if (this.state.ended) {
            return;
        }

        if (this.state.row <= 5 && this.state.column == 5) {
            if (this.checkWord(this.state.guess.join(""))) {
                this.state.row++;
                this.state.column = 0;
                this.state.guess = [];
            }
        }

        this.saveState();
    };

    motle.checkWord = function(guess) {
        if (this.state.row > 5 || !this.isKnownWord(guess)) {
            return false;
        }

        var closeness = this.checkCloseness(guess);

        if (guess === this.state.word) {
            this.state.ended = true;
            this.state.won++;
        } else if (this.state.row == 5) {
            this.state.ended = true;
            this.state.lost--;
        }

        this.state.guessHistory.push(guess);
        this.state.closenessHistory.push(closeness);

        for (var i = 0; i < 5; ++i) {
            this.grid.children[5 * this.state.row + i].classList.add("active");

            if (closeness[i] == i) {
                this.grid.children[5 * this.state.row + i].classList.add("correct");
            } else if (closeness[i] !== -1) {
                this.grid.children[5 * this.state.row + i].classList.add("close");
            }
        }

        return true;
    };

    motle.isKnownWord = function(guess) {
        if (this.knownWords.indexOf(guess) !== -1) {
            return true;
        }

        document.getElementById("unknown-word").classList.add("visible");

        for (var i = 0; i < 5; ++i) {
            this.grid.children[5 * this.state.row + i].classList.add("shake");
        }

        setTimeout(function() {
            for (var i = 0; i < 5; ++i) {
                this.grid.children[5 * this.state.row + i].classList.remove("shake");
            }
        }.bind(this), 1000);

        setTimeout(function() {
            document.getElementById("unknown-word").classList.remove("visible");
        }, 3000);

        return false;
    };

    motle.checkCloseness = function(guess) {
        var res = [-1, -1, -1, -1, -1],
            word = this.state.word;

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

    motle.saveState = function() {
        window.localStorage.setItem("state", JSON.stringify(this.state));
    };

    motle.restoreState = function() {
        for (var j = 0; j < 6; ++j) {
            for (var i = 0; i < 5; ++i) {
                this.grid.children[5 * j + i].textContent = ""
                this.grid.children[5 * j + i].classList.remove("active", "correct", "close");
            }
        }

        for (var k in this.keyboard) {
            this.keyboard[k].classList.remove("inactive", "correct", "close");
        }

        for (var j = 0; j < this.state.row; ++j) {
            for (var i = 0; i < 5; ++i) {
                this.grid.children[5 * j + i].textContent = this.state.guessHistory[j][i];

                this.grid.children[5 * j + i].classList.add("active");

                if (this.state.closenessHistory[j][i] === i) {
                    this.grid.children[5 * j + i].classList.add("correct");
                    this.keyboard[this.state.guessHistory[j][i]].classList.add("correct");
                } else if (this.state.closenessHistory[j][i] !== -1) {
                    this.grid.children[5 * j + i].classList.add("close");
                    this.keyboard[this.state.guessHistory[j][i]].classList.add("close");
                } else {
                    this.keyboard[this.state.guessHistory[j][i]].classList.add("inactive");
                }
            }
        }

        for (var i = 0; i < this.state.column; ++i) {
            this.grid.children[5 * this.state.row + i].textContent = this.state.guess[i];
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
