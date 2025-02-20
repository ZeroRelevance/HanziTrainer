words_definitive = dict()

with open(r'C:\Users\tomas\Desktop\Code\Hanzi Trainer\data_files\word_files\every_word.csv', 'r', encoding='utf-8') as f:
    for line in f:
        if ';' in line:
            hanzi, pinyin = line.split(';')
            words_definitive[hanzi] = pinyin

file_name = r'C:\Users\tomas\Desktop\Code\Hanzi Trainer\data_files\word_files\hsk79_words.csv'
word_list = []

with open(file_name, 'r', encoding='utf-8') as f:
    for line in f:
        hanzi = line.split(',')[0]
        word_list.append(hanzi)

fixed_list = [w + ';' + words_definitive[w] for w in word_list]

with open(file_name, 'w', encoding='utf-8') as f:
    f.write(''.join(fixed_list))