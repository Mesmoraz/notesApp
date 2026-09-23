(function (root, factory) {
  const core = factory();
  if (typeof module === 'object' && module.exports) module.exports = core;
  else root.GatherCore = core;
})(globalThis, function () {
  const concepts = {
    gift: ['present', 'birthday', 'sam'],
    lunch: ['food', 'restaurant', 'cafe', 'eat', 'dinner', 'meal', 'places'],
    place: ['restaurant', 'cafe', 'location', 'somewhere'],
    creativity: ['creative', 'ideas', 'artist', 'inspiration', 'book'],
    garden: ['plant', 'flower', 'tomatoes', 'yard'],
    recommendation: ['recommended', 'said', 'suggested', 'book'],
    idea: ['thought', 'remember', 'note'],
    sam: ['gift', 'camera']
  };
  const stopWords = new Set(['a', 'about', 'and', 'by', 'for', 'from', 'in', 'is', 'it', 'me', 'my', 'near', 'of', 'on', 'that', 'the', 'this', 'to', 'with']);

  function normalize(word) {
    if (word.endsWith('ies') && word.length > 4) return word.slice(0, -3) + 'y';
    if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) return word.slice(0, -1);
    return word;
  }

  function tokens(query) {
    return (query.toLowerCase().match(/[a-z0-9]+/g) || [])
      .map(normalize)
      .filter(word => !stopWords.has(word));
  }

  function relatedTerms(word) {
    const related = new Set();
    for (const [concept, terms] of Object.entries(concepts)) {
      const normalizedTerms = terms.map(normalize);
      if (normalize(concept) === word || normalizedTerms.includes(word)) {
        related.add(normalize(concept));
        normalizedTerms.forEach(term => related.add(term));
      }
    }
    return related;
  }

  function isNearMatch(queryWord, noteWord) {
    if (queryWord.length >= 3 && noteWord.startsWith(queryWord)) return true;
    if (queryWord.length >= 4 && noteWord.length >= 4 && noteWord.includes(queryWord)) return true;
    if (Math.abs(queryWord.length - noteWord.length) > 1 || queryWord.length < 5) return false;

    let previous = Array.from({ length: noteWord.length + 1 }, (_, index) => index);
    for (let i = 1; i <= queryWord.length; i++) {
      const current = [i];
      let rowMinimum = i;
      for (let j = 1; j <= noteWord.length; j++) {
        const cost = queryWord[i - 1] === noteWord[j - 1] ? 0 : 1;
        current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
        rowMinimum = Math.min(rowMinimum, current[j]);
      }
      if (rowMinimum > 1) return false;
      previous = current;
    }
    return previous[noteWord.length] <= 1;
  }

  function evaluateNote(note, query) {
    const words = tokens(query);
    if (!words.length) return { score: 1, matchType: 'exact' };
    const noteWords = tokens(note.text + ' ' + (note.tags || []).join(' '));
    const haystack = new Set(noteWords);
    let points = 0;
    let exactCount = 0;
    let closeCount = 0;
    let relatedCount = 0;

    for (const word of words) {
      if (haystack.has(word)) {
        points += 3;
        exactCount += 1;
      } else if (noteWords.some(noteWord => isNearMatch(word, noteWord))) {
        points += 2;
        closeCount += 1;
      } else if ([...relatedTerms(word)].some(term => haystack.has(term))) {
        points += 1.4;
        relatedCount += 1;
      }
    }

    const matchedCount = exactCount + closeCount;
    const enoughCloseTerms = matchedCount > 0 && matchedCount >= Math.ceil(words.length / 2);
    const matchType = exactCount === words.length
      ? 'exact'
      : enoughCloseTerms
        ? 'close'
        : relatedCount > 0
          ? 'related'
          : null;

    return { score: points / words.length, matchType };
  }

  function scoreNote(note, query) {
    return evaluateNote(note, query).score;
  }

  function searchNotes(notes, query, options = {}) {
    const limit = Number.isFinite(options.limit) ? Math.max(0, options.limit) : Infinity;
    const offset = Number.isFinite(options.offset) ? Math.max(0, options.offset) : 0;
    const ranked = notes
      .map(note => ({ note, ...evaluateNote(note, query) }))
      .filter(result => !query.trim() || result.matchType !== null)
      .sort((a, b) => {
        const tier = { exact: 0, close: 1, related: 2 };
        return tier[a.matchType] - tier[b.matchType]
          || b.score - a.score
          || new Date(b.note.created) - new Date(a.note.created);
      });
    return { total: ranked.length, results: ranked.slice(offset, offset + limit) };
  }

  function inferTags(text) {
    const lower = text.toLowerCase();
    const tags = [];
    for (const [word, tag] of [
      ['garden', 'garden'], ['plant', 'garden'], ['book', 'books'], ['read', 'books'],
      ['gift', 'gift idea'], ['birthday', 'gift idea'], ['lunch', 'food'],
      ['cafe', 'places'], ['restaurant', 'places'], ['idea', 'ideas'], ['thought', 'ideas']
    ]) {
      if (lower.includes(word) && !tags.includes(tag)) tags.push(tag);
    }
    const name = text.match(/\b(?:for|from|with) ([A-Z][a-z]+)\b/);
    if (name) tags.unshift('people · ' + name[1]);
    return tags.slice(0, 3);
  }

  function newId() {
    return globalThis.crypto && globalThis.crypto.randomUUID
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function noteFromJson(item, now) {
    if (!item || typeof item !== 'object') return null;
    const body = item.text ?? item.body ?? item.content;
    if (typeof body !== 'string' || !body.trim()) return null;
    const text = typeof item.title === 'string' && item.title.trim()
      ? `${item.title.trim()}\n\n${body}`
      : body;
    const tags = Array.isArray(item.tags)
      ? item.tags.filter(tag => typeof tag === 'string')
      : inferTags(text);
    return {
      id: newId(),
      text,
      created: item.created && Number.isFinite(Date.parse(item.created))
        ? new Date(item.created).toISOString()
        : now,
      tags
    };
  }

  async function parseImportedFiles(files, now = new Date().toISOString()) {
    const notes = [];
    for (const file of files) {
      const content = await file.text();
      const extension = file.name.split('.').pop().toLowerCase();
      if (extension === 'json') {
        const data = JSON.parse(content);
        const items = Array.isArray(data) ? data : Array.isArray(data.notes) ? data.notes : [data];
        for (const item of items) {
          const note = noteFromJson(item, now);
          if (note) notes.push(note);
        }
      } else if (['md', 'markdown', 'txt'].includes(extension) && content.trim()) {
        notes.push({ id: newId(), text: content.trim(), created: now, tags: inferTags(content) });
      }
    }
    return notes;
  }

  return { inferTags, parseImportedFiles, scoreNote, searchNotes, tokens };
});

