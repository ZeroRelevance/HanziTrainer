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


    function normalizePinyin(pinyin) {
        // Replace all tone marks with their base letter
        return pinyin
            .toLowerCase()
            .replace(/ā|á|ǎ|à/g, 'a')
            .replace(/ē|é|ě|è/g, 'e')
            .replace(/ī|í|ǐ|ì/g, 'i')
            .replace(/ō|ó|ǒ|ò/g, 'o')
            .replace(/ū|ú|ǔ|ù/g, 'u')
            .replace(/ǖ|ǘ|ǚ|ǜ/g, 'v');
    }



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
    
    function showLevelUpPopup(newCharacters, levelUps) {
        const popup = document.createElement('div');

        const newLevel = parseInt(document.getElementById('current-level').textContent) + levelUps;

        console.log('Level:', newLevel, 'New Chars:', newCharacters);

        popup.className = 'level-up-popup';
        popup.innerHTML = `
            <h2>Level Up!</h2>
            <p>Congratulations! You've reached level ${newLevel}.</p>
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

        const totalLevelUps = levelUps;
        
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
            showLevelUpPopup(newCharacters, totalLevelUps);
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


    function showCharDetails(char) {
        const charDetailsContent = document.getElementById('char-details-content');
        charDetailsContent.innerHTML = '<div class="loading-spinner">Loading...</div>';
        charDetailsModal.style.display = 'block';
        
        // First, fetch the character details
        fetch(`/get_character_details?char=${char}`)
            .then(response => response.json())
            .then(data => {
                const progressBarWidth = data.progress;
                
                // Render the character details without the words list
                charDetailsContent.innerHTML = `
                    <div class="char-header">
                        <div class="char-big">${char}</div>
                        <div class="char-stats">
                            <div class="progress-container">
                                <div class="progress-label">Accuracy: ${data.progress}%</div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${progressBarWidth}%"></div>
                                </div>
                            </div>
                            <div class="review-history">
                                <div class="review-stat correct">
                                    <span class="stat-count">${data.correct_count}</span>
                                    <span class="stat-label">✓ Correct</span>
                                </div>
                                <div class="review-stat incorrect">
                                    <span class="stat-count">${data.incorrect_count}</span>
                                    <span class="stat-label">✗ Incorrect</span>
                                </div>
                                <div class="review-stat total">
                                    <span class="stat-count">${data.total_reviews}</span>
                                    <span class="stat-label">Total Reviews</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="words-section">
                        <h4>Unlocked words containing this character:</h4>
                        <div id="words-list-container">
                            <div class="loading-spinner">Loading words...</div>
                        </div>
                    </div>
                    <button id="speak-char" class="speak-button">🔊 Hear Pronunciation</button>
                `;
                
                document.getElementById('speak-char').addEventListener('click', () => {
                    const msg = new SpeechSynthesisUtterance(char);
                    msg.lang = 'zh-CN';
                    window.speechSynthesis.speak(msg);
                });
                
                // Now fetch the words list separately
                return fetch(`/get_character_words?char=${char}`);
            })
            .then(response => response.json())
            .then(data => {
                const wordsListContainer = document.getElementById('words-list-container');
                
                if (data.words && data.words.length > 0) {
                    const wordsList = '<ul class="char-words-list">' + 
                        data.words.map(wordInfo => 
                            `<li><span class="word-chinese">${wordInfo.word}</span> <span class="word-pinyin">${wordInfo.pinyin}</span></li>`
                        ).join('') + 
                        '</ul>';
                    wordsListContainer.innerHTML = wordsList;
                } else {
                    wordsListContainer.innerHTML = '<p class="no-words">No words found containing this character.</p>';
                }
            })
            .catch(error => {
                console.error('Error fetching character details:', error);
                charDetailsContent.innerHTML = '<p class="error-message">Error loading character details.</p>';
            });
    }


    let charData = [];
    let filteredChars = [];
    let currentPage = 1;
    const charsPerPage = 60;
    let hskLevelMap = {};

    // Fetch HSK level data for all characters
    function fetchHSKLevels() {
        // Build the HSK level mapping
        hskLevelMap = {};
        
        function processHSKFile(level) {
            fetch(`/static/hsk${level}.txt`)
                .then(response => response.text())
                .then(data => {
                    for (let char of data) {
                        hskLevelMap[char] = level;
                    }
                    updateCharLevels();
                })
                .catch(err => console.error(`Error loading HSK${level} data:`, err));
        }
        
        // Load all HSK levels
        for (let level of ['1', '2', '3', '4', '5', '6', '79']) {
            processHSKFile(level);
        }
    }

    function updateCharLevels() {
        charData.forEach(char => {
            char.hskLevel = hskLevelMap[char.character] || 'Unknown';
        });
        updateCharacterBrowser();
    }

    // Load character data with details
    function loadCharacterData() {
        fetch('/get_character_list')
            .then(response => response.json())
            .then(data => {
                unlockedChars = data.character_list;
                
                // Create promises for each character to fetch its details
                const promises = unlockedChars.map(char => {
                    return fetch(`/get_character_details?char=${char}`)
                        .then(response => response.json())
                        .catch(error => {
                            console.error(`Error fetching details for ${char}:`, error);
                            return {
                                char: char,
                                progress: 0,
                                correct_count: 0,
                                incorrect_count: 0,
                                total_reviews: 0
                            };
                        });
                });
                
                // Wait for all character details to load
                Promise.all(promises)
                    .then(characters => {
                        charData = characters.map(data => ({
                            character: data.char,
                            progress: data.progress || 0,
                            correctCount: data.correct_count || 0,
                            incorrectCount: data.incorrect_count || 0,
                            totalReviews: data.total_reviews || 0,
                            hskLevel: hskLevelMap[data.char] || 'Unknown'
                        }));
                        
                        initializeCharacterBrowser();
                    });
            })
            .catch(error => console.error('Error fetching character list:', error));
    }

    // Initialize character browser components
    function initializeCharacterBrowser() {
        setupEventListeners();
        updateCharacterBrowser();
        updateCharacterStats();
    }

    // Set up UI event listeners
    function setupEventListeners() {
        // Search functionality
        document.getElementById('char-search').addEventListener('input', function() {
            currentPage = 1;
            updateCharacterBrowser();
        });
        
        // Filter and sorting
        document.getElementById('filter-by').addEventListener('change', function() {
            currentPage = 1;
            updateCharacterBrowser();
        });
        
        document.getElementById('sort-by').addEventListener('change', function() {
            updateCharacterBrowser();
        });
        
        // Tab switching
        document.querySelectorAll('#char-browser-tabs .tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('#char-browser-tabs .tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                document.querySelectorAll('.browser-view').forEach(view => view.classList.remove('active'));
                document.getElementById(`${this.dataset.tab}-view`).classList.add('active');
            });
        });
        
        // Pagination
        document.getElementById('prev-page').addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                updateCharacterBrowser();
            }
        });
        
        document.getElementById('next-page').addEventListener('click', function() {
            const totalPages = Math.ceil(filteredChars.length / charsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                updateCharacterBrowser();
            }
        });
    }

    // Update character statistics
    function updateCharacterStats() {
        const totalChars = charData.length;
        const masteredChars = charData.filter(char => char.progress >= 90).length;
        const learningChars = charData.filter(char => char.progress >= 50 && char.progress < 90).length;
        const strugglingChars = charData.filter(char => char.progress < 50).length;
        
        document.getElementById('total-chars-count').textContent = totalChars;
        document.getElementById('mastered-chars-count').textContent = masteredChars;
        document.getElementById('learning-chars-count').textContent = learningChars;
        document.getElementById('struggling-chars-count').textContent = strugglingChars;
    }

    // Filter and sort characters based on current selections
    function getFilteredAndSortedChars() {
        const searchTerm = document.getElementById('char-search').value.trim().toLowerCase();
        const filterValue = document.getElementById('filter-by').value;
        const sortValue = document.getElementById('sort-by').value;
        
        // Filter characters
        let filtered = charData;
        
        if (searchTerm) {
            filtered = filtered.filter(char => {
                // Search by character
                if (char.character.toLowerCase().includes(searchTerm)) {
                    return true;
                }
                
                // Search by word or pinyin
                if (char.words) {
                    return char.words.some(word => {
                        const normalizedSearchTerm = normalizePinyin(searchTerm);
                        const normalizedPinyin = normalizePinyin(word.pinyin);
                        
                        return word.word.toLowerCase().includes(searchTerm) || 
                               normalizedPinyin.includes(normalizedSearchTerm);
                    });
                }
                
                return false;
            });
        }
        
        if (filterValue !== 'all') {
            if (filterValue === 'recent') {
                // Assuming the last 20 characters are recent
                filtered = [...charData].slice(-20);
            } else if (filterValue.startsWith('hsk')) {
                const hskLevel = filterValue.substring(3);
                filtered = filtered.filter(char => 
                    char.hskLevel === hskLevel || 
                    (hskLevel === '79' && char.hskLevel === '79')
                );
            }
        }
        
        // Sort characters
        switch (sortValue) {
            case 'accuracy-high':
                filtered.sort((a, b) => b.progress - a.progress);
                break;
            case 'accuracy-low':
                filtered.sort((a, b) => a.progress - b.progress);
                break;
            case 'reviews':
                filtered.sort((a, b) => b.totalReviews - a.totalReviews);
                break;
            case 'least-reviews':
                filtered.sort((a, b) => a.totalReviews - b.totalReviews);
                break;
            default:
                // Keep default order
                break;
        }
        
        return filtered;
    }

    // Update character browser UI with current data
    function updateCharacterBrowser() {
        filteredChars = getFilteredAndSortedChars();
        
        // Update pagination
        const totalPages = Math.ceil(filteredChars.length / charsPerPage);
        document.getElementById('page-indicator').textContent = `Page ${currentPage} of ${totalPages || 1}`;
        document.getElementById('prev-page').disabled = currentPage <= 1;
        document.getElementById('next-page').disabled = currentPage >= totalPages;
        
        // Get current page of characters
        const startIndex = (currentPage - 1) * charsPerPage;
        const endIndex = startIndex + charsPerPage;
        const currentPageChars = filteredChars.slice(startIndex, endIndex);
        
        // Update grid view
        const charsList = document.getElementById('unlocked-chars-list');
        charsList.innerHTML = '';
        
        currentPageChars.forEach(char => {
            const charElement = document.createElement('div');
            charElement.className = 'unlocked-char';
            
            // Add HSK level badge
            if (char.hskLevel && char.hskLevel !== 'Unknown') {
                const levelBadge = document.createElement('span');
                levelBadge.className = 'char-level-badge';
                levelBadge.textContent = char.hskLevel === '79' ? '7+' : char.hskLevel;
                charElement.appendChild(levelBadge);
            }
            
            // Add character
            const charText = document.createElement('span');
            charText.textContent = char.character;
            charElement.appendChild(charText);
            
            // Add progress bar
            const progressIndicator = document.createElement('div');
            progressIndicator.className = 'char-progress-indicator';
            
            const progressFill = document.createElement('div');
            progressFill.className = 'progress-fill';
            if (char.progress >= 90) {
                progressFill.classList.add('mastered');
            } else if (char.progress >= 50) {
                progressFill.classList.add('learning');
            } else {
                progressFill.classList.add('struggling');
            }
            progressFill.style.width = `${char.progress}%`;
            
            progressIndicator.appendChild(progressFill);
            charElement.appendChild(progressIndicator);
            
            charElement.addEventListener('click', () => showCharDetails(char.character));
            charsList.appendChild(charElement);
        });
        
        // Update list view
        const tableBody = document.getElementById('chars-table-body');
        tableBody.innerHTML = '';
        
        currentPageChars.forEach(char => {
            const row = document.createElement('tr');
            
            // Character cell
            const charCell = document.createElement('td');
            charCell.className = 'char-cell';
            
            const charSpan = document.createElement('span');
            charSpan.textContent = char.character;
            charCell.appendChild(charSpan);
            
            const levelIndicator = document.createElement('span');
            levelIndicator.className = 'char-level-indicator';
            levelIndicator.textContent = char.hskLevel === 'Unknown' ? 'N/A' : 
                                        (char.hskLevel === '79' ? 'HSK 7-9' : `HSK ${char.hskLevel}`);
            charCell.appendChild(levelIndicator);
            
            // Progress cell
            const progressCell = document.createElement('td');
            
            const progressValue = document.createElement('div');
            progressValue.textContent = `${char.progress}%`;
            progressCell.appendChild(progressValue);
            
            const progressBar = document.createElement('div');
            progressBar.className = 'list-progress';
            
            const progressFill = document.createElement('div');
            progressFill.className = 'progress-fill';
            if (char.progress >= 90) {
                progressFill.classList.add('mastered');
            } else if (char.progress >= 50) {
                progressFill.classList.add('learning');
            } else {
                progressFill.classList.add('struggling');
            }
            progressFill.style.width = `${char.progress}%`;
            
            progressBar.appendChild(progressFill);
            progressCell.appendChild(progressBar);
            
            // Review count cell
            const reviewsCell = document.createElement('td');
            reviewsCell.textContent = char.totalReviews;
            
            // Tags cell
            const tagsCell = document.createElement('td');
            
            let tag;
            if (char.progress >= 90) {
                tag = document.createElement('span');
                tag.className = 'char-tag tag-mastered';
                tag.textContent = 'Mastered';
                tagsCell.appendChild(tag);
            } else if (char.progress >= 50) {
                tag = document.createElement('span');
                tag.className = 'char-tag tag-learning';
                tag.textContent = 'Learning';
                tagsCell.appendChild(tag);
            } else if (char.totalReviews > 0) {
                tag = document.createElement('span');
                tag.className = 'char-tag tag-struggling';
                tag.textContent = 'Struggling';
                tagsCell.appendChild(tag);
            } else {
                tag = document.createElement('span');
                tag.className = 'char-tag tag-new';
                tag.textContent = 'New';
                tagsCell.appendChild(tag);
            }
            
            row.appendChild(charCell);
            row.appendChild(progressCell);
            row.appendChild(reviewsCell);
            row.appendChild(tagsCell);
            
            row.addEventListener('click', () => showCharDetails(char.character));
            tableBody.appendChild(row);
        });
    }

    // Update the view unlocked chars button functionality
    document.getElementById('view-unlocked-chars').addEventListener('click', function() {
        if (charData.length === 0) {
            loadCharacterData();
            fetchHSKLevels();
        } else {
            updateCharacterBrowser();
            updateCharacterStats();
        }
        
        unlockedCharsModal.style.display = 'block';
    });


    updateCharList();
    updateLevelIndicator();

    // Checks for updates every ten seconds in case of error
    setInterval(() => {
        updateCharList();
        updateLevelIndicator();
    }, 10000);
});