        // --- Shared Logic ---
        function switchGame(mode) {
            document.querySelectorAll('.game-section').forEach(s => s.classList.remove('active'));
            document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
            
            if(mode === 'number') {
                document.getElementById('numberSection').classList.add('active');
                document.querySelectorAll('.toggle-btn')[0].classList.add('active');
                document.getElementById('gameTitle').textContent = "Guess the Number";
                document.getElementById('gameSub').textContent = "Pick a number between 1 and 100";
                resetNumberGame();
            } else {
                document.getElementById('wordSection').classList.add('active');
                document.querySelectorAll('.toggle-btn')[1].classList.add('active');
                document.getElementById('gameTitle').textContent = "Guess the Word";
                document.getElementById('gameSub').textContent = "Type letters to reveal the hidden word";
                if(!word) randomWord();
            }
        }

        function showStatus(elementId, message, type) {
            const el = document.getElementById(elementId);
            el.textContent = message;
            el.style.color = type === 'success' ? 'var(--success)' : (type === 'error' ? 'var(--error)' : 'var(--text-main)');
        }

        // --- Number Game Logic ---
        const numInput = document.getElementById("numInput");
        const numBtn = document.getElementById("numBtn");
        const numChancesText = document.getElementById("numChances");
        let randomNum, numChances;

        function resetNumberGame() {
            randomNum = Math.floor(Math.random() * 100) + 1;
            numChances = 10;
            numInput.disabled = false;
            numChancesText.textContent = numChances;
            showStatus('numFeedback', '', 'info');
            numInput.value = "";
            numBtn.textContent = "Check Guess";
            numInput.focus();
        }

        numBtn.addEventListener("click", () => {
            if (numInput.disabled) return resetNumberGame();
            const val = parseInt(numInput.value);
            if (isNaN(val) || val < 1 || val > 100) {
                showStatus('numFeedback', 'Enter a number between 1-100', 'error');
                return;
            }
            numChances--;
            numChancesText.textContent = numChances;
            if (val === randomNum) {
                showStatus('numFeedback', 'Victory! You found the number!', 'success');
                numInput.disabled = true;
                numBtn.textContent = "Play Again";
            } else if (numChances === 0) {
                showStatus('numFeedback', `Game Over! The number was ${randomNum}`, 'error');
                numInput.disabled = true;
                numBtn.textContent = "Try Again";
            } else {
                showStatus('numFeedback', val > randomNum ? "Too high! Try lower." : "Too low! Try higher.", 'info');
            }
            numInput.value = "";
            numInput.focus();
        });

        // --- Word Game Logic (Infinite API Method) ---
        let currentDifficulty = 'easy';
        const wordInputs = document.querySelector(".inputs"),
              hintTag = document.querySelector(".hint"),
              guessLeft = document.getElementById("wordChances"),
              wrongLetter = document.querySelector(".wrong-letter"),
              wordResetBtn = document.getElementById("wordResetBtn"),
              typingInput = document.querySelector(".typing-input");

        let word = "", maxGuesses, incorrectLetters = [], correctLetters = [], isFetching = false;

        function setDifficulty(diff) {
            if (isFetching) return;
            currentDifficulty = diff;
            document.querySelectorAll('.diff-btn').forEach(btn => {
                btn.classList.toggle('active', btn.textContent.toLowerCase() === diff);
            });
            randomWord();
        }

        async function randomWord() {
            if (isFetching) return;
            isFetching = true;
            wordResetBtn.disabled = true;
            wordResetBtn.innerHTML = '<div class="loader"></div> Loading...';
            hintTag.innerText = "Consulting the dictionary...";
            showStatus('wordFeedback', 'Generating infinite word...', 'info');

            try {
                /** * HYBRID DIFFICULTY CLASSIFICATION
                 * Easy: 4-6 letters AND very common words (high Datamuse score)
                 * Hard: 7+ letters OR rare words (lower Datamuse score)
                 */
                const lengthPattern = currentDifficulty === 'easy' ? '????' : '???????';
                // Fetch 100 potential words from Datamuse
                const res = await fetch(`https://api.datamuse.com/words?sp=${lengthPattern}*&max=100&md=f`);
                const words = await res.json();
                
                // Filter words for clean gameplay (no symbols)
                const filtered = words.filter(w => !w.word.includes(" ") && !w.word.includes("-"));
                
                // Sort by Datamuse score (frequency)
                // If Easy, we pick from the top 20 most frequent words.
                // If Hard, we pick from the bottom 50 least frequent words in our result set.
                let pool = [];
                if(currentDifficulty === 'easy') {
                    pool = filtered.sort((a, b) => b.score - a.score).slice(0, 20);
                } else {
                    pool = filtered.sort((a, b) => a.score - b.score).slice(0, 50);
                }

                const wordObj = pool[Math.floor(Math.random() * pool.length)];
                const tempWord = wordObj.word.toLowerCase();

                // Step 2: Fetch actual definition for the hint from Dictionary API
                const defRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${tempWord}`);
                const defData = await defRes.json();

                let hint = "";
                if (Array.isArray(defData) && defData[0].meanings) {
                    hint = defData[0].meanings[0].definitions[0].definition;
                } else {
                    hint = `A word with ${tempWord.length} letters starting with "${tempWord[0].toUpperCase()}".`;
                }

                // Final Game Setup
                word = tempWord;
                maxGuesses = currentDifficulty === 'easy' ? 8 : 5;
                correctLetters = [];
                incorrectLetters = [];

                hintTag.innerText = hint;
                guessLeft.innerText = maxGuesses;
                wrongLetter.innerText = "";
                showStatus('wordFeedback', '', 'info');

                let html = "";
                for (let i = 0; i < word.length; i++) {
                    html += `<input type="text" disabled>`;
                }
                wordInputs.innerHTML = html;
                typingInput.focus();

            } catch (err) {
                console.error("API Error:", err);
                showStatus('wordFeedback', "Connection failed. Please try again.", 'error');
                hintTag.innerText = "Error loading word.";
            } finally {
                isFetching = false;
                wordResetBtn.disabled = false;
                wordResetBtn.innerText = "New Word";
            }
        }

        function initWordGame(e) {
            if (isFetching || maxGuesses < 1) {
                typingInput.value = "";
                return;
            }

            let key = e.target.value.toLowerCase();
            if(key.match(/^[A-Za-z]+$/) && !incorrectLetters.includes(` ${key}`) && !correctLetters.includes(key)) {
                if(word.includes(key)) {
                    for (let i = 0; i < word.length; i++) {
                        if(word[i] == key) {
                            correctLetters.push(key);
                            wordInputs.querySelectorAll("input")[i].value = key;
                        }
                    }
                } else {
                    maxGuesses--;
                    incorrectLetters.push(` ${key}`);
                }
                guessLeft.innerText = maxGuesses;
                wrongLetter.innerText = incorrectLetters;
            }
            typingInput.value = "";

            setTimeout(() => {
                const inputs = wordInputs.querySelectorAll("input");
                const isWon = [...inputs].every(input => input.value !== "");
                
                if(isWon && word.length > 0) {
                    showStatus('wordFeedback', `Correct! The word was ${word.toUpperCase()}`, 'success');
                    setTimeout(randomWord, 3000);
                } else if(maxGuesses < 1) {
                    showStatus('wordFeedback', `Game Over! The word was ${word.toUpperCase()}`, 'error');
                    for(let i = 0; i < word.length; i++) {
                        inputs[i].value = word[i];
                    }
                }
            }, 100);
        }

        wordResetBtn.addEventListener("click", randomWord);
        typingInput.addEventListener("input", initWordGame);
        wordInputs.addEventListener("click", () => typingInput.focus());
        document.addEventListener("keydown", () => {
            if(document.getElementById('wordSection').classList.contains('active')) typingInput.focus();
        });

        // Initialize
        resetNumberGame();
