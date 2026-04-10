import { Logger } from "../utils.js";

/**
 * Mixin that adds drag-and-drop journal import support to a form class.
 * @param {typeof ApplicationV2} Base Base class to extend
 * @returns {typeof ApplicationV2} Subclass with journal drop support
 */
export function JournalDropMixin(Base) {
  return class extends Base {
    /** @override */
    _onRender(context, options) {
      super._onRender(context, options);
      if ( this._journalDropListenersAttached ) return;
      this._journalDropListenersAttached = true;
      this._boundJournalDragOver = this._onJournalDragOver.bind(this);
      this._boundJournalDrop = this._onDrop.bind(this);
      this.element.addEventListener("dragenter", this._boundJournalDragOver);
      this.element.addEventListener("dragover", this._boundJournalDragOver);
      this.element.addEventListener("drop", this._boundJournalDrop);
    }

    /* -------------------------------------------- */

    /**
     * Handle dragover events.
     * @param {DragEvent} event Drag event
     */
    _onJournalDragOver(event) {
      event.preventDefault();
      if ( event.dataTransfer ) event.dataTransfer.dropEffect = "copy";
    }

    /* -------------------------------------------- */

    /** @override */
    async _onDrop(event) {
      const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
      if ( data?.type === "JournalEntry" || data?.type === "JournalEntryPage" ) {
        event.preventDefault();
        event.stopPropagation();
        return this._importFromJournal(data);
      }
      return super._onDrop?.(event);
    }

    /* -------------------------------------------- */

    /**
     * Import entries from a dragged JournalEntry or JournalEntryPage.
     * Looks for JSON entry definitions in code blocks within the page content.
     * @param {object} data Drop event data
     */
    async _importFromJournal(data) {
      const document = await fromUuid(data.uuid);
      if ( !document ) return;

      const pages = (data.type === "JournalEntryPage") ? [document] : Array.from(document.pages ?? []);
      if ( !pages.length ) {
        Logger.error(game.i18n.localize("CUSTOM_DND5E.journalImport.error.noCodeBlock"), true);
        return;
      }

      // Collect all valid entries from all pages
      const entries = [];
      let lastError = null;
      for ( const page of pages ) {
        const content = page.text?.content;
        if ( !content ) continue;

        const codeBlocks = this._extractCodeBlocks(content);
        if ( !codeBlocks.length ) continue;

        for ( const block of codeBlocks ) {
          let parsed;
          try {
            parsed = JSON.parse(block);
          } catch (err) {
            lastError = game.i18n.format("CUSTOM_DND5E.journalImport.error.parseFailed", { error: err.message });
            continue;
          }

          const validation = this._validateImportSchema(parsed);
          if ( !validation.valid ) {
            lastError = validation.error;
            continue;
          }

          entries.push(parsed);
        }
      }

      if ( !entries.length ) {
        Logger.error(lastError ?? game.i18n.localize("CUSTOM_DND5E.journalImport.error.noCodeBlock"), true);
        return;
      }

      await this._createFromImport(entries);
    }

    /* -------------------------------------------- */

    /**
     * Extract the text content of all <code> blocks within a string of HTML.
     * @param {string} html HTML content
     * @returns {string[]} Array of code block text contents
     */
    _extractCodeBlocks(html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const codeElements = doc.querySelectorAll("pre code, code");
      return Array.from(codeElements).map(el => el.textContent.trim()).filter(Boolean);
    }

    /* -------------------------------------------- */

    /**
     * Validate a parsed entry object against the import schema.
     * @param {*} data Parsed object
     * @returns {{valid: boolean, error: string|null}} Validation result
     */
    _validateImportSchema(data) {
      return { valid: true, error: null };
    }

    /* -------------------------------------------- */

    /**
     * Create entries from imported data and refresh the UI.
     * @param {object[]} entries Array of validated entry data
     * @abstract
     */
    async _createFromImport(entries) {
      throw new Error("_createFromImport must be implemented by the subclass");
    }
  };
}
