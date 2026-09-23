const fs = require('node:fs');
const path = require('node:path');

const people = ['Sam', 'Maya', 'Alex', 'Jordan', 'Riley', 'Casey', 'Taylor', 'Jamie'];
const places = ['Juniper Cafe', 'Maple Market', 'North Pier', 'Willow Books', 'Cedar Garden'];
const ideas = [
  { tags: ['people · Sam', 'gift idea'], text: i => `Gift idea for ${people[i % people.length]}: the small instant camera from ${places[i % places.length]}. Add a pack of color film.` },
  { tags: ['places', 'food'], text: i => `Try ${places[i % places.length]} for lunch. ${people[(i + 2) % people.length]} said the roasted tomato sandwich is good and it is quiet enough to talk.` },
  { tags: ['garden', 'ideas'], text: i => `Garden thought: plant nasturtiums beside the tomatoes in bed ${1 + (i % 4)}. They attract pollinators and the flowers are edible.` },
  { tags: ['books', 'creativity'], text: i => `Book recommendation from ${people[(i + 3) % people.length]}: Steal Like an Artist. A short read about creativity and collecting inspiration.` },
  { tags: ['work', 'follow-up'], text: i => `Follow up with ${people[(i + 1) % people.length]} about the project sketch after the Thursday check-in. Ask whether the blue version is easier to read.` },
  { tags: ['recipes', 'food'], text: i => `Recipe note: roast chickpeas with smoked paprika, lemon, and olive oil. Serve with greens when the week gets busy.` },
  { tags: ['travel', 'places'], text: i => `Weekend idea: take the early train to ${places[i % places.length]}, walk by the water, then find a bakery before heading home.` },
  { tags: ['learning', 'ideas'], text: i => `Idea to remember: explain the new concept with a simple example first. ${people[(i + 5) % people.length]} said that made the last talk easier to follow.` },
  { tags: ['home', 'reminder'], text: i => `Home reminder: measure the shelf beside the desk before looking for storage boxes. The opening is probably narrower than it looks.` },
  { tags: ['music', 'ideas'], text: i => `Playlist thought: add the mellow guitar track ${1 + (i % 12)} from the cafe set. Good background music for a slow Sunday morning.` }
];

const count = Math.max(1, Number.parseInt(process.argv[2] || '600', 10));
const now = Date.UTC(2026, 8, 23, 12, 0, 0);
const notes = Array.from({ length: count }, (_, index) => {
  const entry = ideas[index % ideas.length];
  const created = new Date(now - ((index * 19) % 180) * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: `demo-${String(index + 1).padStart(4, '0')}`,
    text: entry.text(index),
    created,
    tags: entry.tags
  };
});

const output = path.join(__dirname, '..', 'demo-notes.json');
fs.writeFileSync(output, `${JSON.stringify(notes, null, 2)}\n`, 'utf8');
process.stdout.write(`Wrote ${notes.length} fictional notes to ${output}\n`);

