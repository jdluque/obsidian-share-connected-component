import sys
import re
import os
import shutil


VAULT_DIR = '../my_new_vault_dir'
notes_map = {}  # this dict maps note names to their respective path,


def populate_notes_map():
    for root, dirs, files in os.walk('.'):
        for name in files:
            notes_map[name] = os.path.join(root, name)


def get_connected_components(seeds):
    seen = set()
    stack = seeds
    while stack:
        fn = stack.pop()
        if fn in seen:
            continue
        outgoing_links = get_links(fn)
        seen.add(fn)
        seen.update(outgoing_links)
    return list(seen)


def get_links(filename: str):
    if not os.path.isfile(filename):
        return []
    with open(filename, 'r') as f:
        note = f.read()
    pattern = r'\[\[([^\[\|]+)\|?[^\[\|]*\]\]'
    matches = re.findall(pattern, note)
    matches = [notes_map[m.strip() + '.md'] for m in matches]
    return matches


def make_new_vault(target_notes):
    if not os.path.exists(VAULT_DIR):
        os.mkdir(VAULT_DIR)
    for note in target_notes:
        note_dir = os.path.dirname(note)
        note_dir_in_new_vault = os.path.join(VAULT_DIR, note_dir)
        if note_dir != '' and not os.path.exists(note_dir_in_new_vault):
            os.mkdir(note_dir_in_new_vault)
        shutil.copy2(note, os.path.join(VAULT_DIR, note))


# Press the green button in the gutter to run the script.
if __name__ == '__main__':
    populate_notes_map()
    target_notes = get_connected_components(sys.argv[1:])
    print(f'Copying new notes: {target_notes}')
    print(f'Making new vault at: {VAULT_DIR}/')
    make_new_vault(target_notes)
