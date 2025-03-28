import os

current_dir = os.path.dirname(os.path.abspath(__file__))

with open(f'{current_dir}\\account_data.json', 'w', encoding='utf-8') as file:
    file.write('{"level": 0, "xp": 0, "last_session": -1}')

with open(f'{current_dir}\\unlocked_character_list.txt', 'w', encoding='utf-8') as file:
    file.write('')

with open(f'{current_dir}\\sessions.csv', 'w', encoding='utf-8') as file:
    file.write('')

chars = set()

with open(f'{current_dir}\\character_data.csv', 'r', encoding='utf-8') as file:
    for line in file:
        chars.add(line.split(',')[0])

with open(f'{current_dir}\\character_data.csv', 'w', encoding='utf-8') as file:
    file.write(',\n'.join(sorted(chars)) + ',')

with open(f'{current_dir}\\temp\\session_char_list.csv', 'w', encoding='utf-8') as file:
    file.write('')