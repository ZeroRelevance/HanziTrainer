document.addEventListener("DOMContentLoaded", function () {
    const hanziDropdownElement = document.getElementById("hanzi-dropdown");
    const wordDropdownElement = document.getElementById("word-dropdown");
    const startButtonElement = document.getElementById("start-button");
    const viewUnlockedCharsButton = document.getElementById("view-unlocked-chars");
    const unlockedCharsModal = document.getElementById("unlocked-chars-modal");
    const charDetailsModal = document.getElementById("char-details-modal");
    const unlockedCharsList = document.getElementById('unlocked-chars-list');
    const closeButtons = document.getElementsByClassName("close");

    startButtonElement.addEventListener('click', function() {
        fetch('/select_lists', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({hanzi_list: hanziDropdownElement.value, word_list: wordDropdownElement.value})
        })
        .then(response => {
            if (response.ok) {
                window.location.href = '/reviews';
            } else {
                console.error('Error:', response.statusText);
            }
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    });

    // Level system functionality
    let currentLevel = 1;
    let currentXP = 0;
    let xpToNextLevel = 100;
    let unlockedChars = ['你', '好', '世', '界']; // Example unlocked characters

    function updateLevelIndicator() {
        document.getElementById('current-level').textContent = currentLevel;
        document.getElementById('current-xp').textContent = currentXP;
        document.getElementById('xp-to-next-level').textContent = xpToNextLevel;
    }

    function displayUnlockedChars() {
        unlockedCharsList.innerHTML = '';

        unlockedChars.forEach(char => {
            const charElement = document.createElement('div');
            charElement.className = 'unlocked-char';
            charElement.textContent = char;
            charElement.addEventListener('click', () => showCharDetails(char));
            unlockedCharsList.appendChild(charElement);
        });

    }

        function showCharDetails(char) {
            const charDetailsContent = document.getElementById('char-details-content');
            charDetailsContent.innerHTML = `
                <h3>${char}</h3>
                <p>Progress: 50%</p>
                <p>Review History: 10 correct, 5 incorrect</p>
                <h4>Words containing this character:</h4>
                <ul>
                    <li>你好 (nǐ hǎo) - Hello</li>
                    <li>你们 (nǐ men) - You (plural)</li>
                </ul>
            `;
            charDetailsModal.style.display = 'block';
        }
    
        function showLevelUpPopup(newCharacters) {
            const popup = document.createElement('div');

            console.log('Level:', currentLevel, 'New Chars:', newCharacters);

            popup.className = 'level-up-popup';
            popup.innerHTML = `
                <h2>Level Up!</h2>
                <p>Congratulations! You've reached level ${currentLevel}.</p>
                <h3>New Characters Unlocked:</h3>
                <div class="new-chars-grid">
                    ${newCharacters.map(char => `<div class="new-char">${char}</div>`).join('')}
                </div>
                <button class="close-popup">Close</button>
            `;
            document.body.appendChild(popup);

            popup.querySelector('.close-popup').addEventListener('click', () => {
                document.body.removeChild(popup);
            });
        }
    
        async function checkLevelUp() {
            let newCharacters = [];
            let fetchPromises = [];
        
            while (currentXP >= xpToNextLevel) {
                currentLevel++;
                currentXP -= xpToNextLevel;
                xpToNextLevel = Math.floor(xpToNextLevel * 1.2);
        
                // Store the fetch promise
                fetchPromises.push(
                    fetch('/get_new_characters')
                        .then(response => response.json())
                        .then(data => {
                            data.new_chars.forEach(char => {
                                newCharacters.push(char);
                                unlockedChars.push(char);
                            });
                        })
                        .catch(error => console.error('Error fetching new characters:', error))
                );
            }
        
            // Wait for all fetch operations to complete
            await Promise.all(fetchPromises);
        
            if (newCharacters.length > 0) {
                showLevelUpPopup(newCharacters);
            }
        
            updateLevelIndicator();
        }
    
        viewUnlockedCharsButton.addEventListener('click', function() {
            displayUnlockedChars();
            unlockedCharsModal.style.display = 'block';
        });
    
        // Close modal functionality
        Array.from(closeButtons).forEach(button => {
            button.onclick = function() {
                this.closest('.modal').style.display = 'none';
            }
        });
    
        window.onclick = function(event) {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        };
    
        // Initialize level indicator
        updateLevelIndicator();
    
        // Simulating XP gain (remove this in production)
        setInterval(() => {
            currentXP += 300;
            updateLevelIndicator();
            checkLevelUp();
        }, 10000);
    });