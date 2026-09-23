# Gather — notes, found again

A small, responsive notes app prototype designed to make quick capture and later retrieval feel effortless.

## Try the prototype

Open the [live demo](https://mesmoraz.github.io/notesApp/) on a phone or desktop browser. It starts with a few sample notes. Type in the capture box to add your own, then search by phrase or try one of the suggested searches.

## Prototype limits

- Notes are stored in the current browser using `localStorage`; this demo does not sync between devices.
- Search uses lightweight local keyword and synonym matching, not an AI model or semantic search service.
- The sample notes and names are fictional.

This prototype has no account system or server-side storage. Avoid entering anything sensitive.

## Fictional demo notebook

The public repo includes `demo-notes.json`, a generated set of 600 fictional notes. Fresh browsers load the demo notebook automatically; browsers that already have local notes can add it with **Add fictional demo notes**. Regenerate it with `node scripts/generate-demo-notes.cjs 600`.

## Import proof of concept

Choose **Import notes** to select multiple Markdown (`.md` or `.markdown`), text (`.txt`), or JSON files. Importing happens in the browser, and imported notes are saved to that browser only. JSON accepts an array of notes, a `{ "notes": [...] }` object, or a single note with `text`, `body`, or `content` fields.

Apple's [iPhone Notes export instructions](https://support.apple.com/en-ie/guide/iphone/iphdf551cfa2/ios) describe exporting a note as Markdown from that note's Share menu. For this proof of concept, export the notes as Markdown files, then select the files together in the importer. This is a file import demo, not direct access to the Notes library; images and attachments aren't imported, and Markdown exports are dated when imported.

## Run the tests

With Node.js installed, run `node --test tests/notes-core.test.cjs`. The suite includes a 50,000-note in-memory search stress case and large note-body coverage. In the app, lists render 100 notes at a time; use **Show more notes** to continue through larger result sets.

