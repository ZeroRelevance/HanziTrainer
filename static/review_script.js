document.addEventListener("DOMContentLoaded", function () {
    let currentWord = '';

    const characterElement = document.getElementById("character");
    const answerInput = document.getElementById("answer-input");
    const correctAnswerElement = document.getElementById("correct-answer");
    const accuracyElement = document.getElementById("accuracy-display");

    
    function loadWord() {
        fetch('/get_word')
            .then(response => response.json())
            .then(data => {
                currentWord = data.word;
                showWord();
            })
            .catch(error => console.error('Error fetching new word:', error));
    }


    function showWord() {
        characterElement.textContent = currentWord;
        correctAnswerElement.classList.add('hidden');
        correctAnswerElement.textContent = '';
        answerInput.value = '';
        answerInput.focus();
        answerInput.className = "";  // Reset background color class
        answerInput.style.display = "block";
    }


    answerInput.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            if (answerInput.classList.contains('correct')
                || answerInput.classList.contains('incorrect')
                || answerInput.classList.contains('halfway')) {
                loadWord();
                showWord();
            } else {
                const answer = answerInput.value;
                fetch('/check_answer', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ answer: answer, current_word: currentWord })
                })
                    .then(response => response.json())
                    .then(data => {
                        correctAnswerElement.classList.remove('hidden');
                        correctAnswerElement.textContent = `Correct answer(s): ${data.correct_answer}`;
                        if (data.is_correct) {
                            answerInput.classList.add('correct');
                        } else {
                            if (data.all_wrong) {
                                answerInput.classList.add('incorrect');
                            } else {
                                answerInput.classList.add('halfway');
                            }
                        }
                    });
                updateAccuracy()
                const msg = new SpeechSynthesisUtterance(currentWord);
                msg.lang = 'zh-CN'; // Chinese Language Code
            
                window.speechSynthesis.speak(msg);
            }
        }
    });


    answerInput.addEventListener('keyup', function(event) {
        if (event.key === '\\') {
            // Prevent adding the backslash to the input
            event.preventDefault();

            fetch('/undo')
                .then(response => response.json())
                .then(data => {
                    if (data.word != null) {
                        currentWord = data.word;
                        showWord();
                    }
                });
            
            updateAccuracy()
        }
    });


    function updateAccuracy() {
        fetch('/get_accuracy')
            .then(response => response.json())
            .then(data => {
                accuracyElement.textContent = `${data.accuracy}% | ${data.correct} ✔ ${data.incorrect} ✘`;
            });
    }


    loadWord();
    updateAccuracy();

});