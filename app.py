import csv
import random
import json
import os
from flask import Flask, render_template, jsonify, request, redirect, url_for
import logging
from convert_pinyin import convertPinyin


# Set up logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Ensure directories exist
def ensure_directories():
    directories = [
        os.path.dirname(config['session_file']),
        os.path.dirname(config['all_characters_file']),
        os.path.dirname(config['session_char_list']),
        os.path.dirname(config['unlocked_character_list'])
    ]
    for directory in directories:
        if directory and not os.path.exists(directory):
            os.makedirs(directory)
            logger.info(f"Created directory: {directory}")

# Refactored error handling
def safe_load_file(file_path, default_value=None, mode='r', encoding=None):
    try:
        with open(file_path, mode=mode, encoding=encoding) as file:
            return file.read()
    except Exception as e:
        logger.error(f"Error loading file {file_path}: {e}")
        return default_value
    

app = Flask(__name__)

hsk_levels = ['1','2','3','4','5','6','79']


def xp_for_next_level(current_level):
    if current_level == 0:
        return 0
    return round(50 * (1.006 ** (current_level-1)))


def load_config():
    with open('config/config.json', mode='r') as file:
        return json.load(file)


def load_account_data():
    with open(config['account_data'], mode='r') as file:
        return json.load(file)


# merges all the character history from the last session with the mass character list
def do_merge():
    with open(config['session_char_list'], mode='r', encoding='utf-8') as file:
        reader = csv.reader(file)
        session_char_dict = {row[0] : row[1].rstrip() for row in reader}
        
    session_chars = set(session_char_dict.keys())
    
    if len(session_chars) != 0:
        with open(config['all_characters_file'], mode='r', encoding='utf-8') as file:
            reader = csv.reader(file)
            all_char_dict = {row[0] : row[1].rstrip() for row in reader}
        
        for char in session_chars:
            all_char_dict[char] = session_char_dict[char]
            
        with open(config['all_characters_file'], mode='w', encoding='utf-8') as outfile:
            for char in sorted(all_char_dict.keys(), key=lambda char: (len(all_char_dict[char]) + (sum([int(i) for i in list(all_char_dict[char])]) / (len(all_char_dict[char]) + 1))), reverse=True):
                outfile.write(f"{char},{all_char_dict[char]}\n")
                
        with open(config['session_char_list'], mode='w', encoding='utf-8') as outfile:
            outfile.write('')


def load_sessions():
    with open(config['session_file'], mode='r', encoding='utf-8') as file:
        reader = csv.reader(file)
        return [(row[0], row[1], row[2].rstrip()) for row in reader]


def get_unlocked_character_list():
    with open(config['unlocked_character_list'], mode='r', encoding='utf-8') as file:
        unlocked_character_list = set(file.read().rstrip())
    return unlocked_character_list


# Replace the existing load_characters function with this improved version
def load_characters():
    try:
        unlocked_character_text = safe_load_file(config['unlocked_character_list'], 
                                                default_value="", 
                                                encoding='utf-8')
        original_character_list = set(unlocked_character_text.rstrip())
        
        all_char_dict = {}
        char_data = safe_load_file(config['all_characters_file'], default_value="", encoding='utf-8')
        
        for line in char_data.split('\n'):
            if line.strip():
                parts = line.split(',', 1)
                if len(parts) == 2:
                    all_char_dict[parts[0]] = parts[1].rstrip()
        
        character_list = original_character_list.intersection(set(all_char_dict.keys()))
        
        original_length = len(original_character_list)
        new_length = len(character_list)
        
        if original_length > new_length:
            unrecognized = sorted(original_character_list.difference(character_list))
            logger.warning(f'{original_length - new_length} characters not recognised: {unrecognized}')
        
        with open(config['session_char_list'], mode='w', encoding='utf-8') as outfile:
            for char in character_list:
                outfile.write(f"{char},{all_char_dict[char]}\n")
            
        return {char: all_char_dict[char] for char in character_list}
    
    except Exception as e:
        logger.error(f"Error in load_characters: {e}")
        return {}


def load_words():
    # loads all words that only have characters that are in the character list
    with open(config['word_files_path'] + selected_word_list + '.csv', mode='r', encoding='utf-8') as file:
        reader = csv.reader(file, delimiter=';')
        return {row[0] : row[1].rstrip().split('|') for row in reader if all(char in allowed_chars_set for char in row[0])}
    
    
def calculate_words_per_char():
    words_per_char = {}
    for char in allowed_chars_set:
        words_per_char[char] = len([word for word in words if char in word])
    return words_per_char


def calculate_weights():
    # gives each character a weight exponentially proportional to the net number of incorrect answers
    # if a character has not been marked correctly much, we also further increase its weight
    # also balances character weight by frequency in word list to increase frequency of underrepresented characters
    char_weights = {}
    for char in allowed_chars_set:
        correct_num = character_dict[char].count('1')
        incorrect_num = character_dict[char].count('0')
        new_char_modifier = max(4 - correct_num, 1)
        word_freq_weighting = mean_words_per_represented_char / max(1, words_per_char_dict[char])
        char_weights[char] = 1.4 ** (incorrect_num - correct_num) * new_char_modifier * word_freq_weighting
    
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
    
    global character_dict
    global allowed_chars_set
    global word_dict
    global words
    
    global words_per_char_dict
    global unrepresented_chars_set
    global mean_words_per_represented_char
    
    global history
    global correct_num
    global total_num
    
    do_merge()
    
    sessions = load_sessions()
    sessions.append((str(len(sessions)), '0', '0'))

    character_dict = load_characters()
    allowed_chars_set = set(character_dict.keys())
    print(f'Loaded {len(allowed_chars_set)} characters.')

    word_dict = load_words()
    words = list(word_dict.keys())
    print(f'Loaded {len(words)} words.')
    
    if len(words) == 0:
        print('No words available, aborting.')
        return render_template('home.html')
    
    words_per_char_dict = calculate_words_per_char()
    unrepresented_chars_set = {char for char, count in words_per_char_dict.items() if count == 0}
    mean_words_per_represented_char = sum(words_per_char_dict.values())/(len(words_per_char_dict.keys()) - len(unrepresented_chars_set))

    history = []
    correct_num = 0
    total_num = 0
    
    return None
    

def representation_analysis():
    print(f'Total unrepresented: {len(unrepresented_chars_set)}')
    if len(unrepresented_chars_set) != 0:
        print(f'Unrepresented hanzi: {unrepresented_chars_set}')
    print(f'Mean words per represented character: {mean_words_per_represented_char}')


def novelty_analysis():
    correct_counts = {}
    incorrect_counts = {}
    sum_counts = {}
    
    for char in allowed_chars_set:
        char_correct_num = character_dict[char].count('1')
        char_incorrect_num = character_dict[char].count('0')
        char_sum_num = char_correct_num + char_incorrect_num
        
        if char_correct_num not in correct_counts:
            correct_counts[char_correct_num] = 0
        correct_counts[char_correct_num] += 1
        
        if char_incorrect_num not in incorrect_counts:
            incorrect_counts[char_incorrect_num] = 0
        incorrect_counts[char_incorrect_num] += 1
        
        if char_sum_num not in sum_counts:
            sum_counts[char_sum_num] = 0
        sum_counts[char_sum_num] += 1
    
    mean_correct = sum([key * amount for key, amount in correct_counts.items()])/sum([amount for amount in correct_counts.values()])
    print(f'Total correct answer counts: (mean = {mean_correct:0.4f})')
    for index in sorted(correct_counts.keys()):
        print(f'- {index}: {correct_counts[index]}')
        
    mean_incorrect = sum([key * amount for key, amount in incorrect_counts.items()])/sum([amount for amount in incorrect_counts.values()])
    print(f'Total incorrect answer counts: (mean = {mean_incorrect:0.4f})')
    for index in sorted(incorrect_counts.keys()):
        print(f'- {index}: {incorrect_counts[index]}')
        
    mean_total = sum([key * amount for key, amount in sum_counts.items()])/sum([amount for amount in sum_counts.values()])
    print(f'Total answer counts: (mean = {mean_total:0.4f})')
    for index in sorted(sum_counts.keys()):
        print(f'- {index}: {sum_counts[index]}')


def weights_analysis():
    weights = calculate_weights()
    print(f'Min weight ({words[weights.index(min(weights))]}): {min(weights)}')
    print(f'Max weight ({words[weights.index(max(weights))]}): {max(weights)}')
    print(f'Standard deviation: {(sum([weight**2 for weight in weights])/len(weights) - (sum(weights)/len(weights))**2)**0.5 if len(weights) != 0 else "N/A"}')
    return weights
    

@app.route('/')
def home():
    global account_data
    global sessions
    
    global unlocked_character_list
        
    do_merge()
    
    account_data = load_account_data()
    sessions = load_sessions()
    
    update_account_data_with_session_data()
    
    unlocked_character_list = get_unlocked_character_list()
    
    return render_template('home.html')


@app.route('/reviews')
def reviews():
    result = start_session()
    
    if result != None:
        return result
    
    return render_template('review.html', return_url='/')


@app.route('/get_word', methods=['GET'])
def get_word():
    weights = calculate_weights()
    word = random.choices(words, weights=weights, k=1)[0]
    return jsonify(word = word)


@app.route('/get_character_list', methods=['GET'])
def get_character_list():
    return jsonify(character_list=sorted(unlocked_character_list))


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
    
    # Replaces er with r in inputs
    parts = user_input.split(' ')
    for i, part in enumerate(parts):
        if part in {'er', 'er5'}:
            parts[i] = 'r'
    user_input = ' '.join(parts)
    
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


@app.route('/select_word_list', methods=['POST'])
def select_word_list():
    global selected_word_list
    
    selected_word_list = request.json['word_list']
    
    return 'Selected list.'


@app.route('/get_new_characters', methods=['GET'])
def get_new_characters():
    global unlocked_character_list
    
    new_chars = []
    
    for level in hsk_levels:
        with open(config['hanzi_files_path'] + f"hsk{level}.txt", 'r', encoding='utf-8') as file:
            possible_char_list = list(set(file.read().rstrip()).difference(unlocked_character_list))
        if len(possible_char_list) >= (10 - len(new_chars)):
            new_chars = random.sample(possible_char_list, k=(10 - len(new_chars)))
            break
        else:
            new_chars.append(possible_char_list)
            if len(new_chars) == 10:
                break
            
    print(new_chars)
    
    unlocked_character_list = unlocked_character_list.union(set(new_chars))
    update_unlocked_character_list()
    
    return jsonify(new_chars=new_chars)


@app.route('/attempt_level_up', methods=['GET'])
def attempt_level_up():
    current_level = account_data['level']
    current_xp = account_data['xp']
    required_xp = xp_for_next_level(current_level)
    
    level_ups = 0
    
    while current_xp >= required_xp:
        current_level += 1
        current_xp -= required_xp
        
        required_xp = xp_for_next_level(current_level)
        
        account_data['level'] = current_level
        account_data['xp'] = current_xp
        
        level_ups += 1
        
    if level_ups > 0:
        update_account_data_file()
      
    return jsonify(level_ups=level_ups)


@app.route('/get_xp_data', methods=['GET'])
def get_xp_data():
    current_level = account_data['level']
    current_xp = account_data['xp']
    required_xp = xp_for_next_level(current_level)
      
    return jsonify(current_level=current_level, current_xp=current_xp, required_xp=required_xp)


@app.route('/get_character_details', methods=['GET'])
def get_character_details():
    char = request.args.get('char', '')
    if not char:
        return jsonify(error="No character provided"), 400
    
    # Get character history
    char_history = ""
    try:
        with open(config['all_characters_file'], mode='r', encoding='utf-8') as file:
            reader = csv.reader(file)
            for row in reader:
                if row[0] == char:
                    char_history = row[1].rstrip()
                    break
    except Exception as e:
        print(f"Error reading character history: {e}")
    
    # Calculate stats
    correct_count = char_history.count('1')
    incorrect_count = char_history.count('0')
    total_reviews = correct_count + incorrect_count
    progress_percent = round((correct_count / max(1, total_reviews)) * 100)
    
    return jsonify({
        "char": char,
        "progress": progress_percent,
        "correct_count": correct_count,
        "incorrect_count": incorrect_count,
        "total_reviews": total_reviews,
    })


@app.route('/get_character_words', methods=['GET'])
def get_character_words():
    char = request.args.get('char', '')
    if not char:
        return jsonify(error="No character provided"), 400
    
    # Get the current set of unlocked characters
    unlocked_characters = get_unlocked_character_list()
    
    # Find words containing this character (only using unlocked characters)
    words_with_char = []
    try:
        word_file = f"all_words_with_hsk_hanzi"
        with open(config['word_files_path'] + word_file + '.csv', mode='r', encoding='utf-8') as file:
            reader = csv.reader(file, delimiter=';')
            for row in reader:
                word = row[0]
                # Only include words where ALL characters are unlocked
                if char in word and all(c in unlocked_characters for c in word) and len(words_with_char) < 15:
                    words_with_char.append({
                        "word": word,
                        "pinyin": convertPinyin(row[1].rstrip().split('|')[0])
                    })
    except Exception as e:
        print(f"Error finding words with character: {e}")
        
    return jsonify({
        "words": words_with_char
    })
    


def update_account_data_with_session_data():
    xp = 0
    last_session = account_data['last_session']
    
    for i, _, total in sessions:
        if int(i) > last_session:
            xp += int(total)
    
    account_data['xp'] += xp
    account_data['last_session'] = len(sessions) - 1
    
    update_account_data_file()

    
def update_csv():
    with open(config['session_char_list'], mode='w', encoding='utf-8') as outfile:
        input_text = '\n'.join([f'{char},{character_dict[char]}' for char in allowed_chars_set])
        outfile.write(input_text)
    
    sessions[-1] = (str(len(sessions)-1), str(correct_num), str(total_num))
    with open(config['session_file'], mode='w', encoding='utf-8') as outfile:
        for session_id, correct, total in sessions:
            outfile.write(f"{session_id},{correct},{total}\n")
            

def update_unlocked_character_list():
    global unlocked_character_list
    
    with open(config['unlocked_character_list'], mode='w', encoding='utf-8') as outfile:
        outfile.write(''.join(sorted(unlocked_character_list)))


def update_account_data_file():
    print(account_data)
    with open(config['account_data'], mode='w', encoding='utf-8') as outfile:
        json.dump(account_data, outfile)


if __name__ == '__main__':
    try:
        config = load_config()
        ensure_directories()
        selected_word_list = 'hsk_words'
        app.run(debug=True)
    except Exception as e:
        logger.critical(f"Failed to start application: {e}")