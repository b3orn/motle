var motle = (function() {
    var motle = {};
    
    motle.init = function(word) {
        this.wordOfTheDay = word;
        this.word = word;
        this.ended = false;
        this.grid = document.getElementById("grid");
        this.row = 0;
        this.column = 0;
        this.letters = "abcdefghijklmnopqrstuvwxyz"
        this.guess = [];
        this.guessHistory = [];
        this.closenessHistory = [];
        this.keyboard = {}

        window.addEventListener("keyup", this.eventHandler.bind(this));
        document.getElementById("show-help").addEventListener("click", this.showHelp.bind(this));
        document.getElementById("hide-help").addEventListener("click", this.hideHelp.bind(this));
        document.getElementById("help").addEventListener("click", this.hideHelp.bind(this));
        document.getElementById("word-of-the-day").addEventListener("click", this.modeWordOfTheDay.bind(this));
        document.getElementById("random").addEventListener("click", this.modeRandom.bind(this));

        var elements = document.querySelectorAll("#keyboard .key");
        for (var i = 0; i < elements.length; ++i) {
            var el = elements[i];
            el.addEventListener("click", this.virtualKeyboardEventHandler.bind(this))

            if (el.dataset.key.length == 1) {
                this.keyboard[el.dataset.key] = el;
            }
        }
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

    motle.modeWordOfTheDay = function(event) {
        event.target.blur();
        this.reset();

        this.word = this.wordOfTheDay;
    };

    motle.modeRandom = function(event) {
        event.target.blur();
        this.fetchRandom().then(function(word) {
            this.word = word;

            this.reset();
        }.bind(this));
    };

    motle.reset = function() {
        this.ended = false;
        this.row = 0;
        this.column = 0;
        this.guess = [];
        this.guessHistory = [];
        this.closenessHistory = [];

        for (var i = 0; i < this.grid.children.length; ++i) {
            var el = this.grid.children[i]
            
            el.textContent = "";
            el.classList.remove("active", "correct", "close");
        }

        for (var k in this.keyboard) {
            this.keyboard[k].classList.remove("inactive", "correct", "close")
        }
    };

    motle.removeLetter = function() {
        if (this.ended) {
            return;
        }

        if (this.column > 0) {
            this.guess.pop();
            this.column--;
            this.grid.children[5 * this.row + this.column].textContent = "";
        }
    };

    motle.addLetter = function(letter) {
        if (this.ended) {
            return;
        }

        if (this.column < 5) {
            this.guess.push(letter);
            this.grid.children[5 * this.row + this.column].textContent = letter;
            this.column++;
        }
    };

    motle.submitGuess = function() {
        if (this.ended) {
            return;
        }

        if (this.row <= 5 && this.column == 5) {
            if (this.checkWord(this.guess.join(""))) {
                this.row++;
                this.column = 0;
                this.guess = [];
            }
        }
    };

    motle.checkWord = function(guess) {
        if (this.row > 5 || !this.isKnownWord(guess)) {
            return false;
        }

        var closeness = this.checkCloseness(guess);

        if (guess === this.word || this.row == 5) {
            this.ended = true;
        }

        this.guessHistory.push(guess);
        this.closenessHistory.push(closeness);

        for (var i = 0; i < 5; ++i) {
            this.grid.children[5 * this.row + i].classList.add("active");

            if (closeness[i] == i) {
                this.grid.children[5 * this.row + i].classList.add("correct");
            } else if (closeness[i] !== -1) {
                this.grid.children[5 * this.row + i].classList.add("close");
            }
        }

        return true;
    };

    motle.isKnownWord = function(guess) {
        return true;
        var knownWords = [];

        if (knownWords.indexOf(guess) !== -1) {
            return;
        }

        document.getElementById("unknown-word").classList.add("visible");

        for (var i = 0; i < 5; ++i) {
            this.grid.children[5 * this.row + i].classList.add("shake");
        }

        setTimeout(function() {
            for (var i = 0; i < 5; ++i) {
                this.grid.children[5 * this.row + i].classList.remove("shake");
            }
        }.bind(this), 1000);

        setTimeout(function() {
            document.getElementById("unknown-word").classList.remove("visible");
        }, 3000);
    };

    motle.checkCloseness = function(guess) {
        var res = [-1, -1, -1, -1, -1],
            word = this.word;

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

    motle.fetchHistory = function() {
        return fetch("/api/history").then(function(r) {
            return r.text();
        }).then(function(text) {
            return new Promise(function(resolve, reject) {
                resolve(text.split("\n"));
            });
        });
    };

    motle.fetchRandom = function() {
        return fetch("/api/random").then(function(r) {
            return r.text();
        });
    };

    return motle;
})();
