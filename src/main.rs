use clap::Parser;
use regex::Regex;
use std::collections::HashSet;
use std::fs::{self, File};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;

#[derive(Parser, Debug)]
struct Args {
    #[arg(short, long)]
    vault_dir: String,

    // TODO: Fix defualt value
    #[arg(short, long, default_value = "exported_vault")]
    new_vault_dir: String,

    #[arg(short, long,  num_args=1..)]
    seeds: Vec<String>,
}

// TODO: Handle attachments
// TODO: Preserve directory structure
// TODO: Add methods to get full_paths in old and new vaults
struct Note {
    name: String,
    og_path: Option<String>,
}

/// Explore notes starting at note_name and populate reachable notes into dst
fn explore(
    note_name: &str,
    re: &Regex,
    dst: &mut Vec<String>,
) -> std::result::Result<(), std::io::Error> {
    let f = File::open(note_name)?;
    let reader = BufReader::new(f);
    for line in reader.lines().map_while(Result::ok) {
        println!("{}", line);
        re.captures_iter(&line).for_each(|caps| {
            if let Some(group) = caps.name("note_name") {
                let note_name = group.as_str().to_string();
                // TODO: Make the extension adding logic more robust
                dst.push(note_name + ".md");
            }
        });
    }
    Ok(())
}

/// Visit files in the vault to resolve files to copy
fn visit(
    path: &PathBuf,
    targets: &HashSet<String>,
    write_paths: &mut Vec<String>,
) -> std::io::Result<()> {
    for e in fs::read_dir(path)? {
        let e = e?;
        let cur_path = e.path();
        if cur_path.is_file() {
            for target in targets.iter() {
                println!(
                    "In visit, comparing {} with {}",
                    std::path::absolute(&cur_path).unwrap().to_str().unwrap(),
                    target
                );
                if let Ok(abs_path) = std::path::absolute(&cur_path) {
                    // TODO: write_names has file names but not their names. Disambiguate these by walking the tree
                    // and checking if a visited file's path "ends" in one of the write_names
                    // TODO: It's possible target might need a leading "./" trimmed
                    if abs_path.ends_with(target) {
                        write_paths.push(abs_path.to_str().unwrap().to_string());
                    }
                }
            }
        } else if cur_path.is_dir() {
            visit(&cur_path, targets, write_paths)?;
        }
    }
    Ok(())
}

fn main() -> std::io::Result<()> {
    let args = Args::parse();
    println!("{:?}", args);

    let re = Regex::new(r"\[\[(?<note_name>[^\[\|]+)\|?[^\[\|]*\]\]").unwrap();

    // Explore the notes in DFS order
    let mut stack = args.seeds;
    let mut visited = HashSet::<String>::new();
    while let Some(visiting) = stack.pop() {
        // !stack.is_empty() {
        if visited.contains(&visiting) {
            continue;
        }
        println!("Reading {}", visiting);
        match explore(&visiting, &re, &mut stack) {
            Ok(()) => (),
            _ => println!("Failed to read {}. It's a deadlink perhaps?", visiting),
        }
        visited.insert(visiting);
    }

    // TODO: copy the notes to the new vault

    let mut write_paths: Vec<String> = Vec::new();
    visit(&PathBuf::from("."), &visited, &mut write_paths)?;

    println!("All notes reached: {:?}", visited);
    println!("Copying the notes:\n{:?}", write_paths);

    Ok(())
}
