document.addEventListener("DOMContentLoaded", function () {
    const hanziDropdownElement = document.getElementById("hanzi-dropdown");
    const startButtonElement = document.getElementById("start-button");
    
    startButtonElement.addEventListener('click', function() {
        fetch('/select_hanzi_list', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({list_id: hanziDropdownElement.value})
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