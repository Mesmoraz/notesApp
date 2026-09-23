const { test } = require('node:test');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { inferTags, scoreNote, searchNotes } = require('../notes-core.js');

function makeNotes(count) {
  const topics = [
    ['Garden reminder', 'Plant basil beside the tomatoes this spring.', ['garden', 'ideas']],
    ['Gift thought', 'Sam might like a small camera for their birthday.', ['people · Sam', 'gift idea']],
    ['Lunch spot', 'Try the cafe on 4th for a quiet lunch.', ['places', 'food']],
    ['Reading list', 'A book about creativity and collecting inspiration.', ['books', 'creativity']],
    ['Meeting note', 'Follow up on the project timeline next week.', ['work']]
  ];
  const base = Date.UTC(2025, 0, 1);
  return Array.from({ length: count }, (_, i) => {
    const [title, text, tags] = topics[i % topics.length];
    return { id: `note-${i}`, text: `${title} ${i}: ${text}`, created: new Date(base + i * 1000).toISOString(), tags };
  });
}

test('finds relevant ideas using phrases and synonym matches', () => {
  const notes = [
    { id: 'gift', text: 'Sam might like a small instant camera.', created: '2025-01-02', tags: ['gift idea'] },
    { id: 'garden', text: 'Plant nasturtiums by the tomatoes.', created: '2025-01-03', tags: ['garden'] },
    { id: 'work', text: 'Project deadline next Tuesday.', created: '2025-01-04', tags: ['work'] }
  ];

  assert.equal(searchNotes(notes, 'gift for Sam').results[0].note.id, 'gift');
  assert.equal(searchNotes(notes, 'flowers in the yard').results[0].note.id, 'garden');
  assert.equal(scoreNote(notes[2], 'gift camera'), 0);
  assert.equal(searchNotes([{ id: 'book', text: 'Creativity is about inspiration.', created: '2025-01-01', tags: [] }], 'quiet lunch cafe').total, 0);
});

test('returns recent notes first and supports paging on an empty query', () => {
  const notes = makeNotes(250);
  const first = searchNotes(notes, '', { limit: 50 });
  const second = searchNotes(notes, '', { limit: 50, offset: 50 });

  assert.equal(first.total, 250);
  assert.equal(first.results.length, 50);
  assert.equal(first.results[0].note.id, 'note-249');
  assert.equal(second.results.length, 50);
  assert.equal(second.results[0].note.id, 'note-199');
});

test('returns no matches for unrelated search terms', () => {
  const result = searchNotes(makeNotes(100), 'underwater volcano');
  assert.equal(result.total, 0);
  assert.deepEqual(result.results, []);
});

test('infers a small set of useful tags without duplicates', () => {
  assert.deepEqual(inferTags('Gift idea for Sam: a book about gardening.'), ['people · Sam', 'garden', 'books']);
});

test('stresses search, ordering, and result limiting with 50,000 notes', () => {
  const notes = makeNotes(50_000);
  const started = performance.now();
  const result = searchNotes(notes, 'quiet lunch cafe', { limit: 100 });
  const elapsedMs = performance.now() - started;

  assert.equal(result.total, 10_000);
  assert.equal(result.results.length, 100);
  assert.ok(result.results.every(({ note }) => note.text.includes('Lunch spot')));
  assert.ok(elapsedMs < 10_000, `50,000-note search took ${Math.round(elapsedMs)}ms`);
});

test('handles a large note body during matching', () => {
  const note = {
    id: 'long-note',
    text: `${'A long memory about ordinary days. '.repeat(20_000)}The garden needs more water.`,
    created: '2025-01-01',
    tags: []
  };
  assert.equal(searchNotes([note], 'garden water').results[0].note.id, 'long-note');
});

