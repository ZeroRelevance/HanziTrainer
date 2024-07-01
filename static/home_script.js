document.addEventListener("DOMContentLoaded", function () {
    const hanziDropdownElement = document.getElementById("hanzi-dropdown");
    const wordDropdownElement = document.getElementById("word-dropdown");
    const startButtonElement = document.getElementById("start-button");
    

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

});