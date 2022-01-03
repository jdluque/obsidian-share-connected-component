# Obsidian share connected component
This hacky code snippet will take obsidian notes and create a new vault containing said notes and any notes directly and indirectly linked to by them. In this manner we can share a note (or a few notes) with someone while also sharing any note that will be referenced by these notes.

### Instructions
1. Copy `main.py` to the root of your vault.
2. Open the vault in your terminal.
3. To share the two notes `my thoughts.md` and `recipes.md` run 
    ```
    python3 main.py "my thoughts.md" "recipes.md"
    ```
1. Done! There should be a new vault titled `my_new_vault_dir` in the same directory as the original vault.

### Future plans
Someday maybe this can become an integrated Obsidian plugin. If there is enough demand someday could come sooner.
