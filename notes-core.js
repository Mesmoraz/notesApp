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

  function scoreNote(note, query) {
    const words = tokens(query);
    if (!words.length) return 1;
    const haystack = new Set(tokens(note.text + ' ' + (note.tags || []).join(' ')));
    let points = 0;
    for (const word of words) {
      if (haystack.has(word)) points += 3;
      else if ([...relatedTerms(word)].some(term => haystack.has(term))) points += 1.4;
    }
    return points / words.length;
  }

  function searchNotes(notes, query, options = {}) {
    const limit = Number.isFinite(options.limit) ? Math.max(0, options.limit) : Infinity;
    const offset = Number.isFinite(options.offset) ? Math.max(0, options.offset) : 0;
    const ranked = notes
      .map(note => ({ note, score: scoreNote(note, query) }))
      .filter(result => !query.trim() || result.score > 0)
      .sort((a, b) => b.score - a.score || new Date(b.note.created) - new Date(a.note.created));
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

  return { inferTags, scoreNote, searchNotes, tokens };
});

