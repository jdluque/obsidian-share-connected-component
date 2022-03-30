import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
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
	settings: ShareConnectedComponentsSettings;
	notesMap: Map<string, TFile>;

	async populateNotesMap() : Promise<void> {
		console.log('in pNM');
		this.notesMap = new Map<string, TFile> ();
		let files = this.app.vault.getFiles();
		for (let file of files) {
			this.notesMap.set(file.basename, file);
		}
		// Test code below
		console.log("Show notesmap");
		console.log(this.notesMap);
		let links : string[] = await this.getLinks('internships');
		console.log(links);
		// let cncs = await this.getConnectedComponents(['internships', 'opportunities']);
		let cncs = await this.getConnectedComponents(['opportunities']);
		console.log('cncs\n'); 
		console.log(cncs);
		this.makeNewVault(cncs);
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
		this.app.vault.createFolder(newVaultDir)
			.finally( () => {
				for (let noteName of targetNotes) {
					let note = this.notesMap.get(noteName);
					let copyDest = path.join(newVaultDir, note.path);
					this.app.vault.copy(note, copyDest)
						.catch(e => { console.log(e) });
				}
			})
			.catch(e => { console.log(e) })
	}

	async onload() {
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
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
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
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