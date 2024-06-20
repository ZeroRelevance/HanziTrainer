import csv
import random
import json
from flask import Flask, render_template, jsonify, request
from convert_pinyin import convertPinyin

app = Flask(__name__)

def load_sessions():
    with open('data_files/sessions.csv', mode='r', encoding='utf-8') as file:
        reader = csv.reader(file)
        return [(row[0], row[1], row[2].rstrip()) for row in reader]
    
def load_config():
    with open('config/config.json', mode='r') as file:
        return json.load(file)

def load_characters(filename):
    with open(f'data_files/{filename}', mode='r', encoding='utf-8') as file:
        reader = csv.reader(file)
        return {row[0] : row[1].rstrip() for row in reader}

def load_words(filename):
    # loads all words that only have characters that are in the character list
    with open(f'data_files/{filename}', mode='r', encoding='utf-8') as file:
        reader = csv.reader(file)
        return {row[0] : row[1].rstrip().split('|') for row in reader if all(char in allowed_chars_set for char in row[0])}

def calculate_weights():
    # gives each character a weight exponentially proportional to the net number of incorrect answers
    char_weights = {}
    for char in allowed_chars_set:
        correct_num = character_dict[char].count('1')
        incorrect_num = character_dict[char].count('0')
        char_weights[char] = 1.3 ** (incorrect_num - correct_num)
    
    # takes geometric mean of each character's weight in each word
    weights = []
    for word in words:
        net = 1
        for char in word:
            net *= char_weights[char]
        net = net ** (1/len(word))
        weights.append(net)
        
    # normalises weights
    mean = sum(weights)/len(weights) if len(weights) != 0 else 1.0
    weights = [weight / mean for weight in weights]
    
    return weights

def start_session():
    global sessions
    global config
    
    global character_dict
    global allowed_chars_set
    global word_dict
    global words
    
    global history
    global correct_num
    global total_num
    
    sessions = load_sessions()
    sessions.append((str(len(sessions)), '0', '0'))
    
    config = load_config()

    character_dict = load_characters(config['character_file'])
    allowed_chars_set = set(character_dict.keys())
    print(f'Loaded {len(allowed_chars_set)} characters.')

    word_dict = load_words(config['word_file'])
    words = list(word_dict.keys())
    print(f'Loaded {len(words)} words.')

    history = []
    correct_num = 0
    total_num = 0
    

def weights_analysis():
    weights = calculate_weights()
    print(f'Min weight ({words[weights.index(min(weights))]}): {min(weights)}')
    print(f'Max weight ({words[weights.index(max(weights))]}): {max(weights)}')
    print(f'Standard deviation: {(sum([weight**2 for weight in weights])/len(weights) - (sum(weights)/len(weights))**2)**0.5 if len(weights) != 0 else 1.0}')
    

@app.route('/')
def home():
    return render_template('home.html')

@app.route('/reviews')
def reviews():
    start_session()
    weights_analysis()
    return render_template('review.html', return_url='/')

@app.route('/get_word', methods=['GET'])
def get_word():
    weights = calculate_weights()
    word = random.choices(words, weights=weights, k=1)[0]
    return jsonify(word = word)

@app.route('/check_answer', methods=['POST'])
def check_answer():
    global correct_num
    global total_num
    data = request.json
    user_input = data['answer'].strip()
    current_word = data['current_word']
    
    correct_answers = word_dict[current_word]
    all_correct = True
    all_wrong = True
    
    print(user_input, current_word, correct_answers)
    
    # instant fail if wrong number of characters
    if len(user_input.split(' ')) == len(current_word):
        # checks each character of input for compatibility with answers
        for char in set(current_word):
            total_num += 1
            compatible = True
            # checks each instance of character for compatibility in position
            for index in [i for i in range(len(current_word)) if current_word[i] == char]:
                i_compatible = False
                
                # if there's an answer where the reading was valid, compatible for given index
                for answer in correct_answers:
                    if answer.split(' ')[index] in (user_input.split(' ')[index], user_input.split(' ')[index] + '5'):
                        i_compatible = True
                        break
                    
                if not i_compatible:
                    compatible = False
                    break                    
            
            # only correct if every instance of character is compatible
            if compatible:
                correct_num += 1
                all_wrong = False
            else:
                all_correct = False
            
            # updates to character history
            character_dict[char] += '1' if compatible else '0'
            
    else:
        all_correct = False
        for char in set(current_word):
            total_num += 1
            character_dict[char] += '0'
        
    update_csv()
    
    history.append( current_word )

    return jsonify(is_correct=all_correct, all_wrong=all_wrong, correct_answer=convertPinyin(', '.join(correct_answers)))

@app.route('/undo', methods=['GET'])
def undo():
    global correct_num
    global total_num
    
    if len(history) != 0:
        prev_word = history.pop()
        
        for char in set(prev_word):
            total_num -= 1
            correct_num -= int(character_dict[char][-1])
            character_dict[char] = character_dict[char][:-1]
                
        update_csv()
        return jsonify(word=prev_word)
    else:
        return jsonify(word=None)

@app.route('/get_accuracy', methods=['GET'])
def get_accuracy():
    global correct_num
    global total_num
    
    if total_num != 0:
        return jsonify(accuracy=round(100 * correct_num/total_num), correct=correct_num, incorrect=total_num-correct_num)
    else:
        return jsonify(accuracy='0', correct=0, incorrect=0)

def update_csv():
    with open('data_files/characters.csv', mode='w', encoding='utf-8') as outfile:
        for char in allowed_chars_set:
            outfile.write(f"{char},{character_dict[char]}\n")
    
    sessions[-1] = (str(len(sessions)-1), str(correct_num), str(total_num))
    with open('data_files/sessions.csv', mode='w', encoding='utf-8') as outfile:
        for session_id, correct, total in sessions:
            outfile.write(f"{session_id},{correct},{total}\n")

if __name__ == '__main__':
    app.run(debug=True)