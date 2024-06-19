document.addEventListener("DOMContentLoaded", function () {
    let currentIndex = 0;
    let characters = [];
    const characterElement = document.getElementById("character");
    const answerInput = document.getElementById("answer-input");
    const correctAnswerElement = document.getElementById("correct-answer");

    let previousIndex = -1;

    function loadCharacters() {
        fetch('/get_character')
            .then(response => response.json())
            .then(data => {
                characters = data;
                showCharacter();
            });
    }

    function showCharacter() {
        if (currentIndex < characters.length) {
            characterElement.textContent = characters[currentIndex].character;
            correctAnswerElement.classList.add('hidden');
            correctAnswerElement.textContent = '';
            answerInput.value = '';
            answerInput.focus();
            answerInput.style.backgroundColor = "";  // Reset background color
            answerInput.style.display = "block";
        } else {
            // All characters reviewed
            characterElement.textContent = 'Review Complete!';
            correctAnswerElement.textContent = '';
            answerInput.style.display = "none";

            const homeButton = document.createElement("a");
            homeButton.href = "/";
            homeButton.className = "button";
            homeButton.textContent = "Go to Homepage";
            document.querySelector(".review-container").appendChild(homeButton);
        }
    }

    answerInput.addEventListener('keypress', function (event) {
        if (event.key === 'Enter') {
            if (answerInput.style.backgroundColor === 'mediumseagreen' || answerInput.style.backgroundColor === 'tomato') {
                previousIndex = currentIndex;
                currentIndex++;
                showCharacter();
            } else {
                const answer = answerInput.value;
                fetch('/check_answer', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ answer: answer, current_index: currentIndex })
                })
                    .then(response => response.json())
                    .then(data => {
                        correctAnswerElement.classList.remove('hidden');
                        correctAnswerElement.textContent = `Correct answer: ${data.correct_answer}`;
                        if (data.is_correct) {
                            answerInput.style.backgroundColor = 'mediumseagreen';
                        } else {
                            answerInput.style.backgroundColor = 'tomato';
                        }
                    });
            }
        } else if (event.key === '\\') {
            undoLastAction();
        }
    });

    function undoLastAction() {
        if (previousIndex >= 0) {
            currentIndex = previousIndex;
            previousIndex = -1;
            showCharacter();
        }
    }

    loadCharacters();
});