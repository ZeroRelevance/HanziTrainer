import os

current_dir = os.path.dirname(os.path.abspath(__file__))

words_definitive = dict()

with open(rf'{current_dir}\every_word.csv', 'r', encoding='utf-8') as f:
    for line in f:
        if ';' in line:
            hanzi, pinyin = line.split(';')
            words_definitive[hanzi] = pinyin

file_name = rf'{current_dir}\hsk79_words.csv'
word_list = []

with open(file_name, 'r', encoding='utf-8') as f:
    for line in f:
        hanzi = line.split(',')[0]
        word_list.append(hanzi)

fixed_list = [w + ';' + words_definitive[w] for w in word_list]

with open(file_name, 'w', encoding='utf-8') as f:
    f.write(''.join(fixed_list))