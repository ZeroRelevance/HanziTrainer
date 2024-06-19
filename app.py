from flask import Flask, render_template, request, jsonify
app = Flask(__name__)

# Predefined list of characters and their correct readings
characters = [
    {'character': '字', 'reading': 'ji'},
    {'character': '学', 'reading': 'gaku'},
    {'character': '円', 'reading': 'en'}
]

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/reviews')
def reviews():
    return render_template('review.html')

@app.route('/get_character', methods=['GET'])
def get_character():
    return jsonify(characters)

@app.route('/check_answer', methods=['POST'])
def check_answer():
    data = request.json
    current_index = data['current_index']
    user_input = data['answer']
    
    correct_answer = characters[current_index]['reading']
    is_correct = user_input.strip() == correct_answer
    
    return jsonify(is_correct=is_correct, correct_answer=correct_answer)

if __name__ == '__main__':
    app.run(debug=True)