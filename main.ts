import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, SettingTab, TFile } from 'obsidian';
import fs from 'fs';
import path from 'path';

// Remember to rename these classes and interfaces!

interface ShareConnectedComponentsSettings {
    /**
     * Relevant settings include:
     * - include attachments
     * - new vault path
	 * - Default for clobbering files
	 * - Path to keep backup vault in case something goes wrong
     */
	mySetting: string;
    includeAttachments: boolean;
	newVaultDir: string;
}

const DEFAULT_SETTINGS: ShareConnectedComponentsSettings = {
	mySetting: 'default',
    includeAttachments: false,
	newVaultDir: '../new-vault/'
}

export default class ShareConnectedComponent extends Plugin {
	public settings: ShareConnectedComponentsSettings;
	public notesMap: Map<string, TFile>;


	async copyConnComps(seeds: string[]) {
		this.populateNotesMap();
		let targetNotes: string[] = await this.getConnectedComponents(seeds);
		this.makeNewVault(targetNotes);
	}

	async populateNotesMap() : Promise<void> {
		console.log('in pNM');
		this.notesMap = new Map<string, TFile> ();
		let files = this.app.vault.getFiles();
		for (let file of files) {
			this.notesMap.set(file.basename, file);
		}

		// Test code below
		// console.log("Show notesmap");
		// console.log(this.notesMap);
		// let links : string[] = await this.getLinks('internships');
		// console.log(links);
		// // let cncs = await this.getConnectedComponents(['internships', 'opportunities']);
		// let cncs = await this.getConnectedComponents(['opportunities']);
		// console.log('cncs\n'); 
		// console.log(cncs);
		// this.makeNewVault(cncs);
	}

	/**
	 * @param seeds seed note names
	 * @returns note names for all the reachable notes
	 */
	async getConnectedComponents(seeds: string[]) : Promise<string[]> {
		let seen = new Set<string> ();
		console.log(seeds);
		// seeds = ["internships"]
		let stack: string[] = seeds;
		// console.log(stack);
		while (stack.length) {
			let currNote = stack.pop();
			console.log(currNote);
			if (seen.has(currNote)) {
				console.log('already seen');
				continue;
			}
			let outgoingLinks = await this.getLinks(currNote);
			// TODO: Bug here because dangling note can be added to seen. This is still handled as an exception below but we could prune everything here
			seen.add(currNote);
			outgoingLinks.forEach((origLink) => { stack.push(origLink) });
		}
		return Array.from(seen.values());
	}

	/**
	 * Get the outgoing links of a note
	 * @param noteName Name of note, without extension or base path.
	 * @returns note names of the outgoing links. 
	 */
	async getLinks(noteName: string) : Promise<string[]> {
		// Check for dangling links
		if (!this.notesMap.has(noteName)) {
			return [];
		}
		const regex = /\[\[([^\[\|\#]+)\|?\#?[^\[\|]*\]\]/g;
		console.log(noteName);
		const readPromise = this.app.vault.read(this.notesMap.get(noteName));
		let fileContent: string = await readPromise;
		let links: string[] = [];
		for (let match of fileContent.matchAll(regex)) {
			links.push(match[1]);
		}
		return links;
	}

	/**
	 * Create the new vault with copied notes.
	 * @param targetNotes note names of notes to copy
	 */
	makeNewVault(targetNotes: string[]) : void {
		// TODO: Use this.app.vault.adapter or just this.app.vault.copy/move/createFolder
		let newVaultDir = this.settings.newVaultDir;
		// TODO: Need to recursively create directories
		this.app.vault.createFolder(newVaultDir)
		.finally( () => {
			for (let noteName of targetNotes) {
				let note = this.notesMap.get(noteName);
				let copyDest = path.join(newVaultDir, note.path);
				this.app.vault.createFolder(path.join(newVaultDir, note.parent.path))
				.finally(() => { 
					this.app.vault.copy(note, copyDest).catch(e => { console.log(e) });
				})
				.catch( e => { console.log(e)} );
			}
		})
		.catch(e => { console.log(e) })
	}

	async onload() {
		await this.loadSettings();

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app, this).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				// editor.replaceSelection('Sample Editor Command');
				console.log('Hello plugin world!');
				this.populateNotesMap();
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	onunload() {
		this.notesMap.clear();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	public plugin: ShareConnectedComponent;

	constructor(app: App, plugin: ShareConnectedComponent) {
		super(app);
		this.plugin = plugin;
	}

	onOpen() {
		const {titleEl} = this;
		titleEl.setText('Export notes');

		const {contentEl} = this;
		contentEl.setText('Woah!');
		

		new Setting(contentEl)
			.setName('Modal test')
			.addToggle(toggle => toggle
				.setValue(false)
		);

		let seeds: string[];
		new Setting(contentEl)
			.setName('Add notes paths separated by pipes (\'|\'')
			.setDesc('E.g., chores.md|my dreams.md|all the small things.md')
			.addText( text => { 
				text.onChange( value => seeds = value.split('|'));
				console.log(seeds);
			})
			.addButton(button => {
				button.setButtonText('Copy notes');
				button.onClick( async mouse => this.plugin.copyConnComps(seeds));
			});
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: ShareConnectedComponent;

	constructor(app: App, plugin: ShareConnectedComponent) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'Settings for my awesome plugin.'});

		new Setting(containerEl)
			.setName('New vault directory')
			.setDesc('Path for vault with copied notes')
			.addText(text => text
				.setPlaceholder('../new_vault/')
				.setValue(this.plugin.settings.newVaultDir)
				.onChange(async (value) => {
					this.plugin.settings.newVaultDir = value;
					console.log('New vault dir: ' + value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Include attachments')
			.addToggle( toggle => toggle
				.setValue(this.plugin.settings.includeAttachments)
				.onChange(async (value) => {
					this.plugin.settings.includeAttachments = value;
					console.log('toggled setting, now' + this.plugin.settings.includeAttachments.toString());
					await this.plugin.saveSettings();
				}));
	}
}