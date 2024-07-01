document.addEventListener("DOMContentLoaded", function () {
    const wordDropdownElement = document.getElementById("word-dropdown");
    const startButtonElement = document.getElementById("start-button");
    const viewUnlockedCharsButton = document.getElementById("view-unlocked-chars");
    const unlockedCharsModal = document.getElementById("unlocked-chars-modal");
    const charDetailsModal = document.getElementById("char-details-modal");
    const unlockedCharsList = document.getElementById('unlocked-chars-list');
    const closeButtons = document.getElementsByClassName("close");

    startButtonElement.addEventListener('click', function() {
        fetch('/select_word_list', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({word_list: wordDropdownElement.value})
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
    let unlockedChars = [];

    function updateLevelIndicator() {
        fetch('/get_xp_data')
            .then(response => response.json())
            .then(data => {
                document.getElementById('current-level').textContent = data.current_level;;
                document.getElementById('current-xp').textContent = data.current_xp;
                document.getElementById('xp-to-next-level').textContent = data.required_xp;
                if (data.current_xp >= data.required_xp) {
                    checkLevelUp();
                }
            })
            .catch(error => console.error('Error attempting to fetch level and xp data:', error));
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

        console.log('Level:', document.getElementById('current-level').textContent, 'New Chars:', newCharacters);

        popup.className = 'level-up-popup';
        popup.innerHTML = `
            <h2>Level Up!</h2>
            <p>Congratulations! You've reached level ${document.getElementById('current-level').textContent}.</p>
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
        let levelUps = 0;

        fetchPromises.push(
            fetch('/attempt_level_up')
                .then(response => response.json())
                .then(data => {
                    levelUps = data.level_ups;
                })
                .catch(error => console.error('Error attempting level up:', error))
        );
        
        // Wait for all fetch operations to complete
        await Promise.all(fetchPromises);
        
        while (levelUps > 0) {
            console.log('Attempted level up');
            // Store the fetch promise
            fetchPromises.push(
                fetch('/get_new_characters')
                    .then(response => response.json())
                    .then(data => {
                        data.new_chars.forEach(char => {
                            newCharacters.push(char);
                        });
                    })
                    .catch(error => console.error('Error fetching new characters:', error))
            );

            levelUps -= 1;
        }
        
        // Wait for all fetch operations to complete
        await Promise.all(fetchPromises);
    
        if (newCharacters.length > 0) {
            showLevelUpPopup(newCharacters);
            updateCharList();
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

    
    function updateCharList() {
        fetch('/get_character_list')
            .then(response => response.json())
            .then(data => {
                unlockedChars = data.character_list;
            })
            .catch(error => console.error('Error fetching character list:', error));
    }


    updateCharList();
    updateLevelIndicator();

    // Checks for updates every ten seconds in case of error
    setInterval(() => {
        updateCharList();
        updateLevelIndicator();
    }, 10000);
});