// ── History Quiz Data ────────────────────────────────────────────────────────
// 100 historical events with quotes, images, and fun facts

export interface HistoryEvent {
  id: number
  quote: string
  event: string
  year: number
  person?: string
  era: 'ancient' | 'medieval' | 'early-modern' | 'modern' | 'contemporary'
  category: 'war' | 'speech' | 'invention' | 'exploration' | 'politics' | 'science' | 'culture' | 'revolution'
  emoji: string
  funFact: string
  imageUrl?: string // Wikimedia Commons public domain
  difficulty: 'easy' | 'medium' | 'hard'
}

export const HISTORY_EVENTS: HistoryEvent[] = [
  // ── EASY (well-known events) ──────────────────────────────────────────────
  { id: 1, quote: '...government of the people, by the people, for the people, shall not perish from the earth.', event: 'Gettysburg Address', year: 1863, person: 'Abraham Lincoln', era: 'modern', category: 'speech', emoji: '🎤', funFact: 'The speech was only about 2 minutes long', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Abraham_Lincoln_head_on_shoulders_photo_portrait.jpg/440px-Abraham_Lincoln_head_on_shoulders_photo_portrait.jpg', difficulty: 'easy' },
  { id: 2, quote: 'I have a dream that my children will one day live in a nation where they will not be judged by the color of their skin.', event: 'I Have a Dream Speech', year: 1963, person: 'Martin Luther King Jr.', era: 'contemporary', category: 'speech', emoji: '✊', funFact: 'Over 250,000 people attended the March on Washington', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Martin_Luther_King%2C_Jr..jpg/440px-Martin_Luther_King%2C_Jr..jpg', difficulty: 'easy' },
  { id: 3, quote: 'That\'s one small step for man, one giant leap for mankind.', event: 'Moon Landing', year: 1969, person: 'Neil Armstrong', era: 'contemporary', category: 'exploration', emoji: '🌙', funFact: 'The Apollo 11 computer had less power than a modern calculator', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Aldrin_Apollo_11_original.jpg/440px-Aldrin_Apollo_11_original.jpg', difficulty: 'easy' },
  { id: 4, quote: 'Ask not what your country can do for you — ask what you can do for your country.', event: 'JFK Inaugural Address', year: 1961, person: 'John F. Kennedy', era: 'contemporary', category: 'speech', emoji: '🇺🇸', funFact: 'JFK was the youngest elected president at age 43', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/John_F._Kennedy%2C_White_House_color_photo_portrait.jpg/440px-John_F._Kennedy%2C_White_House_color_photo_portrait.jpg', difficulty: 'easy' },
  { id: 5, quote: 'We shall fight on the beaches, we shall fight on the landing grounds, we shall never surrender.', event: 'We Shall Fight on the Beaches Speech', year: 1940, person: 'Winston Churchill', era: 'contemporary', category: 'speech', emoji: '🇬🇧', funFact: 'Churchill gave this speech just after the Dunkirk evacuation', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bc/Sir_Winston_Churchill_-_19086236948.jpg/440px-Sir_Winston_Churchill_-_19086236948.jpg', difficulty: 'easy' },
  { id: 6, quote: 'Mr. Gorbachev, tear down this wall!', event: 'Berlin Wall Speech', year: 1987, person: 'Ronald Reagan', era: 'contemporary', category: 'speech', emoji: '🧱', funFact: 'The Berlin Wall fell two years later in 1989', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Official_Portrait_of_President_Reagan_1981.jpg/440px-Official_Portrait_of_President_Reagan_1981.jpg', difficulty: 'easy' },
  { id: 7, quote: 'I came, I saw, I conquered.', event: 'Julius Caesar\'s Conquest of Gaul', year: -47, person: 'Julius Caesar', era: 'ancient', category: 'war', emoji: '⚔️', funFact: 'Caesar wrote this in a letter to the Roman Senate', difficulty: 'easy' },
  { id: 8, quote: 'The only thing we have to fear is fear itself.', event: 'FDR First Inaugural Address', year: 1933, person: 'Franklin D. Roosevelt', era: 'contemporary', category: 'speech', emoji: '🏛️', funFact: 'FDR was inaugurated during the Great Depression', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/FDR_1944_Color_Portrait.jpg/440px-FDR_1944_Color_Portrait.jpg', difficulty: 'easy' },
  { id: 9, quote: 'A date which will live in infamy.', event: 'Attack on Pearl Harbor', year: 1941, person: 'Franklin D. Roosevelt', era: 'contemporary', category: 'war', emoji: '💥', funFact: 'The attack lasted only about 2 hours', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/The_USS_Arizona_%28BB-39%29_burning_after_the_Japanese_attack_on_Pearl_Harbor_-_NARA_195617_-_Edit.jpg/440px-The_USS_Arizona_%28BB-39%29_burning_after_the_Japanese_attack_on_Pearl_Harbor_-_NARA_195617_-_Edit.jpg', difficulty: 'easy' },
  { id: 10, quote: 'We hold these truths to be self-evident, that all men are created equal.', event: 'Declaration of Independence', year: 1776, person: 'Thomas Jefferson', era: 'early-modern', category: 'politics', emoji: '📜', funFact: 'It was signed by 56 delegates', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Declaration_of_Independence_%281819%29%2C_by_John_Trumbull.jpg/440px-Declaration_of_Independence_%281819%29%2C_by_John_Trumbull.jpg', difficulty: 'easy' },
  { id: 11, quote: 'Eureka! I have found it!', event: 'Archimedes\' Discovery of Buoyancy', year: -250, person: 'Archimedes', era: 'ancient', category: 'science', emoji: '🛁', funFact: 'He supposedly ran naked through the streets shouting this', difficulty: 'easy' },
  { id: 12, quote: 'Let them eat cake.', event: 'French Revolution', year: 1789, person: 'Marie Antoinette (attributed)', era: 'early-modern', category: 'revolution', emoji: '🎂', funFact: 'She probably never actually said this', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Prise_de_la_Bastille.jpg/440px-Prise_de_la_Bastille.jpg', difficulty: 'easy' },
  { id: 13, quote: 'I think, therefore I am.', event: 'Publication of Discourse on the Method', year: 1637, person: 'René Descartes', era: 'early-modern', category: 'science', emoji: '🧠', funFact: 'Originally written in French, not Latin', difficulty: 'easy' },
  { id: 14, quote: 'Houston, we\'ve had a problem.', event: 'Apollo 13 Crisis', year: 1970, person: 'Jack Swigert', era: 'contemporary', category: 'exploration', emoji: '🚀', funFact: 'All three astronauts returned safely to Earth', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Apollo_13_Damage.jpg/440px-Apollo_13_Damage.jpg', difficulty: 'easy' },
  { id: 15, quote: 'Give me liberty, or give me death!', event: 'Patrick Henry\'s Speech to the Virginia Convention', year: 1775, person: 'Patrick Henry', era: 'early-modern', category: 'speech', emoji: '🗽', funFact: 'This speech helped convince Virginia to join the Revolution', difficulty: 'easy' },
  { id: 16, quote: 'I have nothing to offer but blood, toil, tears and sweat.', event: 'Churchill\'s First Speech as Prime Minister', year: 1940, person: 'Winston Churchill', era: 'contemporary', category: 'speech', emoji: '🇬🇧', funFact: 'He became PM the same day Germany invaded France', difficulty: 'easy' },
  { id: 17, quote: 'That which does not kill us makes us stronger.', event: 'Publication of Twilight of the Idols', year: 1889, person: 'Friedrich Nietzsche', era: 'modern', category: 'culture', emoji: '📚', funFact: 'Nietzsche collapsed mentally the same year this was published', difficulty: 'easy' },
  { id: 18, quote: 'In the beginning God created the heavens and the earth.', event: 'Gutenberg Prints the Bible', year: 1455, person: 'Johannes Gutenberg', era: 'medieval', category: 'invention', emoji: '📖', funFact: 'Only about 49 Gutenberg Bibles survive today', difficulty: 'easy' },
  { id: 19, quote: 'E = mc²', event: 'Einstein\'s Theory of Special Relativity', year: 1905, person: 'Albert Einstein', era: 'modern', category: 'science', emoji: '⚛️', funFact: '1905 is called Einstein\'s "miracle year" — he published 4 groundbreaking papers', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Albert_Einstein_Head.jpg/440px-Albert_Einstein_Head.jpg', difficulty: 'easy' },
  { id: 20, quote: 'Liberté, égalité, fraternité.', event: 'French Revolution', year: 1789, era: 'early-modern', category: 'revolution', emoji: '🇫🇷', funFact: 'This motto became the national motto of France', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1f/Prise_de_la_Bastille.jpg/440px-Prise_de_la_Bastille.jpg', difficulty: 'easy' },
  // ── MEDIUM ──────────────────────────────────────────────────────────────────
  { id: 21, quote: 'I am become Death, the destroyer of worlds.', event: 'First Nuclear Test (Trinity)', year: 1945, person: 'J. Robert Oppenheimer', era: 'contemporary', category: 'science', emoji: '☢️', funFact: 'Oppenheimer quoted the Hindu scripture Bhagavad Gita', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Trinity_Test_Fireball_16ms.jpg/440px-Trinity_Test_Fireball_16ms.jpg', difficulty: 'medium' },
  { id: 22, quote: 'The die is cast.', event: 'Caesar Crosses the Rubicon', year: -49, person: 'Julius Caesar', era: 'ancient', category: 'war', emoji: '🎲', funFact: 'Crossing the Rubicon with his army started a civil war', difficulty: 'medium' },
  { id: 23, quote: 'Dr. Livingstone, I presume?', event: 'Stanley Finds Livingstone in Africa', year: 1871, person: 'Henry Morton Stanley', era: 'modern', category: 'exploration', emoji: '🌍', funFact: 'Livingstone had been missing for 6 years', difficulty: 'medium' },
  { id: 24, quote: 'Veni, vidi, vici.', event: 'Battle of Zela', year: -47, person: 'Julius Caesar', era: 'ancient', category: 'war', emoji: '🏛️', funFact: 'The battle lasted only 5 days', difficulty: 'medium' },
  { id: 25, quote: 'Workers of the world, unite! You have nothing to lose but your chains.', event: 'Publication of The Communist Manifesto', year: 1848, person: 'Karl Marx', era: 'modern', category: 'politics', emoji: '⚒️', funFact: 'Marx was only 29 when he wrote it', difficulty: 'medium' },
  { id: 26, quote: 'I know not with what weapons World War III will be fought, but World War IV will be fought with sticks and stones.', event: 'Einstein\'s Warning About Nuclear War', year: 1949, person: 'Albert Einstein', era: 'contemporary', category: 'politics', emoji: '☮️', funFact: 'Einstein regretted his letter urging FDR to develop the atomic bomb', difficulty: 'medium' },
  { id: 27, quote: 'The ballot is stronger than the bullet.', event: 'Lincoln\'s Speech on Democracy', year: 1856, person: 'Abraham Lincoln', era: 'modern', category: 'speech', emoji: '🗳️', funFact: 'Lincoln said this 4 years before becoming president', difficulty: 'medium' },
  { id: 28, quote: 'Ich bin ein Berliner.', event: 'JFK\'s Berlin Speech', year: 1963, person: 'John F. Kennedy', era: 'contemporary', category: 'speech', emoji: '🇩🇪', funFact: 'Kennedy practiced the German phrase for hours before the speech', difficulty: 'medium' },
  { id: 29, quote: 'Now I am become Death, the destroyer of worlds.', event: 'Hiroshima Atomic Bombing', year: 1945, era: 'contemporary', category: 'war', emoji: '💣', funFact: 'The bomb was called "Little Boy" and weighed about 4,400 kg', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Atomic_bombing_of_Japan.jpg/440px-Atomic_bombing_of_Japan.jpg', difficulty: 'medium' },
  { id: 30, quote: 'The Earth is the cradle of humanity, but mankind cannot stay in the cradle forever.', event: 'Tsiolkovsky\'s Rocket Theory', year: 1903, person: 'Konstantin Tsiolkovsky', era: 'modern', category: 'science', emoji: '🚀', funFact: 'He is considered the father of astronautics', difficulty: 'medium' },
  { id: 31, quote: 'An eye for an eye only ends up making the whole world blind.', event: 'Indian Independence Movement', year: 1947, person: 'Mahatma Gandhi', era: 'contemporary', category: 'politics', emoji: '🕊️', funFact: 'India gained independence through largely nonviolent resistance', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Mahatma-Gandhi%2C_studio%2C_1931.jpg/440px-Mahatma-Gandhi%2C_studio%2C_1931.jpg', difficulty: 'medium' },
  { id: 32, quote: 'The pen is mightier than the sword.', event: 'Publication of Richelieu', year: 1839, person: 'Edward Bulwer-Lytton', era: 'modern', category: 'culture', emoji: '✒️', funFact: 'This phrase comes from a play, not a political speech', difficulty: 'medium' },
  { id: 33, quote: 'In fourteen hundred ninety-two, Columbus sailed the ocean blue.', event: 'Columbus Reaches the Americas', year: 1492, person: 'Christopher Columbus', era: 'early-modern', category: 'exploration', emoji: '⛵', funFact: 'Columbus thought he had reached Asia', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Christopher_Columbus.PNG/440px-Christopher_Columbus.PNG', difficulty: 'medium' },
  { id: 34, quote: 'I have not yet begun to fight!', event: 'Battle of Flamborough Head', year: 1779, person: 'John Paul Jones', era: 'early-modern', category: 'war', emoji: '⚓', funFact: 'Jones is considered the father of the American Navy', difficulty: 'medium' },
  { id: 35, quote: 'The reports of my death are greatly exaggerated.', event: 'Mark Twain\'s Premature Obituary', year: 1897, person: 'Mark Twain', era: 'modern', category: 'culture', emoji: '📰', funFact: 'A newspaper had mistakenly published his obituary', difficulty: 'medium' },
  { id: 36, quote: 'Watson, come here. I want to see you.', event: 'First Telephone Call', year: 1876, person: 'Alexander Graham Bell', era: 'modern', category: 'invention', emoji: '📞', funFact: 'Bell\'s patent was filed just hours before a competitor\'s', difficulty: 'medium' },
  { id: 37, quote: 'That\'s one small step for man...', event: 'Apollo 11 Moon Landing', year: 1969, person: 'Neil Armstrong', era: 'contemporary', category: 'exploration', emoji: '👨‍🚀', funFact: 'Armstrong and Aldrin spent only 2.5 hours walking on the Moon', difficulty: 'medium' },
  { id: 38, quote: 'Float like a butterfly, sting like a bee.', event: 'Muhammad Ali vs. Sonny Liston', year: 1964, person: 'Muhammad Ali', era: 'contemporary', category: 'culture', emoji: '🥊', funFact: 'Ali was only 22 when he first became world champion', difficulty: 'medium' },
  { id: 39, quote: 'Never in the field of human conflict was so much owed by so many to so few.', event: 'Battle of Britain', year: 1940, person: 'Winston Churchill', era: 'contemporary', category: 'war', emoji: '✈️', funFact: 'The RAF was outnumbered 4 to 1 by the Luftwaffe', difficulty: 'medium' },
  { id: 40, quote: 'The only way to do great work is to love what you do.', event: 'Steve Jobs Stanford Commencement Speech', year: 2005, person: 'Steve Jobs', era: 'contemporary', category: 'speech', emoji: '🍎', funFact: 'Jobs never graduated from college', difficulty: 'medium' },
  { id: 41, quote: 'Here men from the planet Earth first set foot upon the Moon.', event: 'Apollo 11 Plaque Left on Moon', year: 1969, person: 'Richard Nixon', era: 'contemporary', category: 'exploration', emoji: '🌕', funFact: 'The plaque was signed by all three astronauts and President Nixon', difficulty: 'medium' },
  { id: 42, quote: 'Power tends to corrupt, and absolute power corrupts absolutely.', event: 'Lord Acton\'s Letter on Liberty', year: 1887, person: 'Lord Acton', era: 'modern', category: 'politics', emoji: '👑', funFact: 'Acton was writing about the Pope\'s infallibility', difficulty: 'medium' },
  { id: 43, quote: 'To be, or not to be, that is the question.', event: 'Shakespeare Writes Hamlet', year: 1601, person: 'William Shakespeare', era: 'early-modern', category: 'culture', emoji: '🎭', funFact: 'Hamlet is Shakespeare\'s longest play at 4,042 lines', difficulty: 'medium' },
  { id: 44, quote: 'The medium is the message.', event: 'Publication of Understanding Media', year: 1964, person: 'Marshall McLuhan', era: 'contemporary', category: 'culture', emoji: '📺', funFact: 'McLuhan predicted the World Wide Web 30 years before it existed', difficulty: 'medium' },
  { id: 45, quote: 'Injustice anywhere is a threat to justice everywhere.', event: 'Letter from Birmingham Jail', year: 1963, person: 'Martin Luther King Jr.', era: 'contemporary', category: 'politics', emoji: '⚖️', funFact: 'King wrote this letter on scraps of newspaper while in jail', difficulty: 'medium' },
  { id: 46, quote: 'The great question is not whether you have failed, but whether you are content with failure.', event: 'Chinese Cultural Revolution Begins', year: 1966, person: 'Mao Zedong (attributed)', era: 'contemporary', category: 'revolution', emoji: '🇨🇳', funFact: 'The Cultural Revolution lasted 10 years', difficulty: 'medium' },
  { id: 47, quote: 'One death is a tragedy; one million is a statistic.', event: 'Stalin\'s Great Purge', year: 1937, person: 'Joseph Stalin (attributed)', era: 'contemporary', category: 'politics', emoji: '☭', funFact: 'An estimated 750,000 people were executed during the purges', difficulty: 'medium' },
  { id: 48, quote: 'Not all those who wander are lost.', event: 'Publication of The Lord of the Rings', year: 1954, person: 'J.R.R. Tolkien', era: 'contemporary', category: 'culture', emoji: '💍', funFact: 'Tolkien took 12 years to write the trilogy', difficulty: 'medium' },
  { id: 49, quote: 'The journey of a thousand miles begins with a single step.', event: 'Lao Tzu Writes the Tao Te Ching', year: -500, person: 'Lao Tzu', era: 'ancient', category: 'culture', emoji: '☯️', funFact: 'The Tao Te Ching has only about 5,000 Chinese characters', difficulty: 'medium' },
  { id: 50, quote: 'If I have seen further, it is by standing on the shoulders of giants.', event: 'Newton\'s Letter to Robert Hooke', year: 1675, person: 'Isaac Newton', era: 'early-modern', category: 'science', emoji: '🍎', funFact: 'Newton and Hooke were actually bitter rivals', difficulty: 'medium' },
  { id: 51, quote: 'Sic semper tyrannis! (Thus always to tyrants!)', event: 'Assassination of Abraham Lincoln', year: 1865, person: 'John Wilkes Booth', era: 'modern', category: 'politics', emoji: '🎭', funFact: 'Lincoln was shot while watching a play at Ford\'s Theatre', difficulty: 'medium' },
  { id: 52, quote: 'The world must be made safe for democracy.', event: 'US Entry into World War I', year: 1917, person: 'Woodrow Wilson', era: 'modern', category: 'war', emoji: '🌐', funFact: 'Wilson had won re-election on the slogan "He kept us out of war"', difficulty: 'medium' },
  { id: 53, quote: 'Yesterday, December 7, 1941 — a date which will live in infamy.', event: 'US Entry into World War II', year: 1941, person: 'Franklin D. Roosevelt', era: 'contemporary', category: 'war', emoji: '⚔️', funFact: 'Congress declared war within an hour of this speech', difficulty: 'medium' },
  { id: 54, quote: 'I shall return.', event: 'MacArthur Leaves the Philippines', year: 1942, person: 'Douglas MacArthur', era: 'contemporary', category: 'war', emoji: '🎖️', funFact: 'MacArthur did return to the Philippines in 1944', difficulty: 'medium' },
  { id: 55, quote: 'Nuts!', event: 'Battle of the Bulge — Siege of Bastogne', year: 1944, person: 'General Anthony McAuliffe', era: 'contemporary', category: 'war', emoji: '🥜', funFact: 'This was his one-word reply to a German demand for surrender', difficulty: 'medium' },
  // ── HARD ───────────────────────────────────────────────────────────────────
  { id: 56, quote: 'After us, the deluge.', event: 'Reign of Louis XV of France', year: 1757, person: 'Madame de Pompadour', era: 'early-modern', category: 'politics', emoji: '🌊', funFact: 'This phrase predicted the French Revolution that came decades later', difficulty: 'hard' },
  { id: 57, quote: 'The state, it is I.', event: 'Absolutism of Louis XIV', year: 1655, person: 'Louis XIV (attributed)', era: 'early-modern', category: 'politics', emoji: '☀️', funFact: 'Louis XIV was known as the Sun King and reigned for 72 years', difficulty: 'hard' },
  { id: 58, quote: 'From the sublime to the ridiculous is but a step.', event: 'Napoleon\'s Retreat from Moscow', year: 1812, person: 'Napoleon Bonaparte', era: 'early-modern', category: 'war', emoji: '❄️', funFact: 'Napoleon lost over 400,000 soldiers during the Russian campaign', difficulty: 'hard' },
  { id: 59, quote: 'England expects that every man will do his duty.', event: 'Battle of Trafalgar', year: 1805, person: 'Admiral Horatio Nelson', era: 'early-modern', category: 'war', emoji: '⚓', funFact: 'Nelson was killed during the battle but Britain won decisively', difficulty: 'hard' },
  { id: 60, quote: 'Paris is well worth a mass.', event: 'Henry IV Converts to Catholicism', year: 1593, person: 'Henry IV of France', era: 'early-modern', category: 'politics', emoji: '⛪', funFact: 'He converted from Protestantism to end the Wars of Religion', difficulty: 'hard' },
  { id: 61, quote: 'Here I stand, I can do no other.', event: 'Martin Luther at the Diet of Worms', year: 1521, person: 'Martin Luther', era: 'early-modern', category: 'revolution', emoji: '⛪', funFact: 'Luther\'s defiance launched the Protestant Reformation', difficulty: 'hard' },
  { id: 62, quote: 'Knowledge is power.', event: 'Francis Bacon\'s Meditationes Sacrae', year: 1597, person: 'Francis Bacon', era: 'early-modern', category: 'science', emoji: '📚', funFact: 'Bacon is considered the father of the scientific method', difficulty: 'hard' },
  { id: 63, quote: 'The unexamined life is not worth living.', event: 'Trial of Socrates', year: -399, person: 'Socrates', era: 'ancient', category: 'culture', emoji: '🏛️', funFact: 'Socrates was sentenced to death by drinking hemlock', difficulty: 'hard' },
  { id: 64, quote: 'Give me a lever long enough and I shall move the world.', event: 'Archimedes\' Principle of the Lever', year: -260, person: 'Archimedes', era: 'ancient', category: 'science', emoji: '⚙️', funFact: 'Archimedes also designed war machines to defend Syracuse', difficulty: 'hard' },
  { id: 65, quote: 'Alea iacta est. (The die is cast.)', event: 'Caesar Crosses the Rubicon', year: -49, person: 'Julius Caesar', era: 'ancient', category: 'war', emoji: '🎲', funFact: 'This act of crossing the river started the Roman Civil War', difficulty: 'hard' },
  { id: 66, quote: 'Et tu, Brute?', event: 'Assassination of Julius Caesar', year: -44, person: 'Julius Caesar (Shakespeare)', era: 'ancient', category: 'politics', emoji: '🗡️', funFact: 'Caesar was stabbed 23 times by Roman senators', difficulty: 'hard' },
  { id: 67, quote: 'Cogito, ergo sum.', event: 'Descartes\' Meditations on First Philosophy', year: 1641, person: 'René Descartes', era: 'early-modern', category: 'science', emoji: '💭', funFact: 'Descartes wrote this while living in the Netherlands', difficulty: 'hard' },
  { id: 68, quote: 'If you want peace, prepare for war.', event: 'Roman Military Doctrine', year: 390, person: 'Vegetius', era: 'ancient', category: 'war', emoji: '🛡️', funFact: 'This principle influenced military strategy for centuries', difficulty: 'hard' },
  { id: 69, quote: 'The end justifies the means.', event: 'Machiavelli Writes The Prince', year: 1513, person: 'Niccolò Machiavelli', era: 'early-modern', category: 'politics', emoji: '🤴', funFact: 'The Prince was published 5 years after Machiavelli\'s death', difficulty: 'hard' },
  { id: 70, quote: 'Damn the torpedoes, full speed ahead!', event: 'Battle of Mobile Bay', year: 1864, person: 'Admiral David Farragut', era: 'modern', category: 'war', emoji: '🚢', funFact: 'Farragut was the first admiral in the US Navy', difficulty: 'hard' },
  { id: 71, quote: 'There is nothing permanent except change.', event: 'Heraclitus\' Philosophy', year: -500, person: 'Heraclitus', era: 'ancient', category: 'science', emoji: '🔄', funFact: 'Heraclitus was known as "The Weeping Philosopher"', difficulty: 'hard' },
  { id: 72, quote: 'History is written by the victors.', event: 'End of World War II', year: 1945, person: 'Winston Churchill (attributed)', era: 'contemporary', category: 'war', emoji: '✍️', funFact: 'Churchill won the Nobel Prize in Literature, not Peace', difficulty: 'hard' },
  { id: 73, quote: 'A revolution is not a dinner party.', event: 'Chinese Communist Revolution', year: 1949, person: 'Mao Zedong', era: 'contemporary', category: 'revolution', emoji: '🇨🇳', funFact: 'Mao\'s forces defeated the Nationalists after a 22-year civil war', difficulty: 'hard' },
  { id: 74, quote: 'The only good is knowledge and the only evil is ignorance.', event: 'Socratic Philosophy', year: -430, person: 'Socrates', era: 'ancient', category: 'culture', emoji: '🦉', funFact: 'Socrates never wrote anything down — Plato recorded his ideas', difficulty: 'hard' },
  { id: 75, quote: 'Religion is the opium of the people.', event: 'Marx\'s Critique of Hegel', year: 1843, person: 'Karl Marx', era: 'modern', category: 'politics', emoji: '📕', funFact: 'Marx wrote this while living in poverty in Paris', difficulty: 'hard' },
  { id: 76, quote: 'Speak softly and carry a big stick.', event: 'Roosevelt\'s Foreign Policy Doctrine', year: 1901, person: 'Theodore Roosevelt', era: 'modern', category: 'politics', emoji: '🪵', funFact: 'Roosevelt used this policy to build the Panama Canal', difficulty: 'medium' },
  { id: 77, quote: 'The buck stops here.', event: 'Truman\'s Presidency', year: 1945, person: 'Harry S. Truman', era: 'contemporary', category: 'politics', emoji: '🏛️', funFact: 'Truman kept this sign on his desk in the Oval Office', difficulty: 'medium' },
  { id: 78, quote: 'Blood, sweat, and tears.', event: 'Churchill Becomes Prime Minister', year: 1940, person: 'Winston Churchill', era: 'contemporary', category: 'speech', emoji: '💪', funFact: 'Churchill was 65 years old when he became PM', difficulty: 'medium' },
  { id: 79, quote: 'The Iron Curtain has descended across the continent.', event: 'Churchill\'s Iron Curtain Speech', year: 1946, person: 'Winston Churchill', era: 'contemporary', category: 'speech', emoji: '🪖', funFact: 'Churchill gave this speech in Fulton, Missouri, not in Europe', difficulty: 'medium' },
  { id: 80, quote: 'That\'s one small step for a man, one giant leap for mankind.', event: 'First Moon Walk', year: 1969, person: 'Neil Armstrong', era: 'contemporary', category: 'exploration', emoji: '🌙', funFact: 'Armstrong\'s bootprint is still on the Moon today', difficulty: 'easy' },
  { id: 81, quote: 'Tear down this wall!', event: 'Fall of the Berlin Wall', year: 1989, era: 'contemporary', category: 'revolution', emoji: '🧱', funFact: 'East Germans could freely cross the border starting November 9, 1989', difficulty: 'easy' },
  { id: 82, quote: 'The truth is rarely pure and never simple.', event: 'Oscar Wilde\'s The Importance of Being Earnest', year: 1895, person: 'Oscar Wilde', era: 'modern', category: 'culture', emoji: '🎭', funFact: 'Wilde was arrested the same year this play premiered', difficulty: 'hard' },
  { id: 83, quote: 'Imagination is more important than knowledge.', event: 'Einstein Interview with Saturday Evening Post', year: 1929, person: 'Albert Einstein', era: 'contemporary', category: 'science', emoji: '💡', funFact: 'Einstein was offered the presidency of Israel in 1952', difficulty: 'medium' },
  { id: 84, quote: 'The best time to plant a tree was 20 years ago. The second best time is now.', event: 'Chinese Proverb on Patience', year: -500, era: 'ancient', category: 'culture', emoji: '🌳', funFact: 'This proverb is often used in modern self-help contexts', difficulty: 'hard' },
  { id: 85, quote: 'No taxation without representation!', event: 'American Colonial Protests', year: 1765, era: 'early-modern', category: 'revolution', emoji: '🍵', funFact: 'This slogan led to the Boston Tea Party in 1773', difficulty: 'easy' },
  { id: 86, quote: 'We choose to go to the Moon in this decade.', event: 'JFK\'s Moon Speech at Rice University', year: 1962, person: 'John F. Kennedy', era: 'contemporary', category: 'speech', emoji: '🌙', funFact: 'The US achieved this goal with 5 months to spare', difficulty: 'medium' },
  { id: 87, quote: 'The only thing necessary for the triumph of evil is for good men to do nothing.', event: 'Burke\'s Philosophy on Liberty', year: 1770, person: 'Edmund Burke (attributed)', era: 'early-modern', category: 'politics', emoji: '⚖️', funFact: 'Burke is considered the father of modern conservatism', difficulty: 'hard' },
  { id: 88, quote: 'I disapprove of what you say, but I will defend to the death your right to say it.', event: 'Voltaire\'s Philosophy on Free Speech', year: 1770, person: 'Voltaire (attributed)', era: 'early-modern', category: 'politics', emoji: '🗣️', funFact: 'This quote was actually written by his biographer, not Voltaire himself', difficulty: 'hard' },
  { id: 89, quote: 'In the middle of difficulty lies opportunity.', event: 'Einstein\'s Letter During WWII', year: 1942, person: 'Albert Einstein', era: 'contemporary', category: 'science', emoji: '🔬', funFact: 'Einstein fled Nazi Germany in 1933 and never returned', difficulty: 'hard' },
  { id: 90, quote: 'The Great Wall is truly great. Only a great people could build such a great wall.', event: 'Construction of the Great Wall of China', year: -221, person: 'Richard Nixon (1972 visit)', era: 'ancient', category: 'culture', emoji: '🏯', funFact: 'The wall stretches over 13,000 miles', difficulty: 'medium' },
  { id: 91, quote: 'Necessity is the mother of invention.', event: 'Industrial Revolution', year: 1760, era: 'early-modern', category: 'invention', emoji: '🏭', funFact: 'The Industrial Revolution began in Britain with textile manufacturing', difficulty: 'medium' },
  { id: 92, quote: 'With great power comes great responsibility.', event: 'Voltaire\'s Influence on the Enlightenment', year: 1793, person: 'French National Convention', era: 'early-modern', category: 'politics', emoji: '🕯️', funFact: 'This concept predates Spider-Man by about 200 years', difficulty: 'hard' },
  { id: 93, quote: 'Those who cannot remember the past are condemned to repeat it.', event: 'Santayana\'s The Life of Reason', year: 1905, person: 'George Santayana', era: 'modern', category: 'culture', emoji: '📖', funFact: 'This is one of the most quoted lines in history education', difficulty: 'medium' },
  { id: 94, quote: 'The hand that rocks the cradle rules the world.', event: 'Women\'s Suffrage Movement', year: 1920, person: 'William Ross Wallace', era: 'modern', category: 'politics', emoji: '👩', funFact: 'The 19th Amendment gave American women the right to vote', difficulty: 'hard' },
  { id: 95, quote: 'Where they burn books, they will also ultimately burn people.', event: 'Nazi Book Burnings', year: 1933, person: 'Heinrich Heine (1820 prediction)', era: 'contemporary', category: 'politics', emoji: '🔥', funFact: 'Heine wrote this over 100 years before the Nazi regime', difficulty: 'hard' },
  { id: 96, quote: 'The arc of the moral universe is long, but it bends toward justice.', event: 'Civil Rights Movement', year: 1965, person: 'Martin Luther King Jr.', era: 'contemporary', category: 'politics', emoji: '🌈', funFact: 'King paraphrased this from abolitionist Theodore Parker', difficulty: 'medium' },
  { id: 97, quote: 'Genius is one percent inspiration and ninety-nine percent perspiration.', event: 'Edison Invents the Light Bulb', year: 1879, person: 'Thomas Edison', era: 'modern', category: 'invention', emoji: '💡', funFact: 'Edison tested over 3,000 designs before finding the right filament', difficulty: 'medium' },
  { id: 98, quote: 'The best argument against democracy is a five-minute conversation with the average voter.', event: 'Churchill on Democracy', year: 1947, person: 'Winston Churchill (attributed)', era: 'contemporary', category: 'politics', emoji: '🗳️', funFact: 'Churchill also said democracy is the worst form of government, except for all the others', difficulty: 'hard' },
  { id: 99, quote: 'Be the change that you wish to see in the world.', event: 'Gandhi\'s Philosophy of Nonviolence', year: 1913, person: 'Mahatma Gandhi (paraphrased)', era: 'modern', category: 'politics', emoji: '🕊️', funFact: 'Gandhi led the Salt March of 240 miles in 1930', difficulty: 'easy' },
  { id: 100, quote: 'Stay hungry, stay foolish.', event: 'Steve Jobs Stanford Commencement', year: 2005, person: 'Steve Jobs', era: 'contemporary', category: 'speech', emoji: '🍎', funFact: 'Jobs borrowed this phrase from the Whole Earth Catalog', difficulty: 'medium' },
]

// ── GAME MODES ────────────────────────────────────────────────────────────────

export type HistoryGameMode = 'name-event' | 'when-happened' | 'who-said'

export const HISTORY_GAME_MODES: Record<HistoryGameMode, { label: string; icon: string; description: string }> = {
  'name-event': { label: 'Name the Event', icon: '📜', description: 'Read a quote and identify the historical event' },
  'when-happened': { label: 'When Did It Happen?', icon: '📅', description: 'Guess the year or decade of the event' },
  'who-said': { label: 'Who Said It?', icon: '🗣️', description: 'Identify who made the famous quote' },
}

export const DIFFICULTY_MODES: Record<string, HistoryGameMode[]> = {
  easy: ['name-event'],
  medium: ['name-event', 'when-happened'],
  hard: ['name-event', 'when-happened', 'who-said'],
}

// ── QUESTION GENERATORS ───────────────────────────────────────────────────────

export interface HistoryQuestion {
  prompt: string
  promptEmoji?: string
  imageUrl?: string
  correctAnswer: string
  options: string[]
  funFact: string
  hint1?: string
  hint2?: string
  year: number
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function pickRandom<T>(arr: T[], count: number, exclude?: T[]): T[] {
  const filtered = exclude ? arr.filter(a => !exclude.includes(a)) : arr
  return shuffle(filtered).slice(0, count)
}

function getEventsByDifficulty(difficulty: string): HistoryEvent[] {
  if (difficulty === 'easy') return HISTORY_EVENTS.filter(e => e.difficulty === 'easy')
  if (difficulty === 'medium') return HISTORY_EVENTS.filter(e => e.difficulty !== 'hard')
  return HISTORY_EVENTS // hard = all events
}

export function generateNameEventQuestion(events: HistoryEvent[]): HistoryQuestion {
  const event = events[Math.floor(Math.random() * events.length)]
  const wrongEvents = pickRandom(
    events.map(e => e.event),
    3,
    [event.event]
  )
  return {
    prompt: `"${event.quote}"`,
    promptEmoji: event.emoji,
    imageUrl: event.imageUrl,
    correctAnswer: event.event,
    options: shuffle([event.event, ...wrongEvents]),
    funFact: event.funFact,
    hint1: event.person ? `Said by ${event.person}` : `From the ${event.era} era`,
    hint2: `Year: ${event.year < 0 ? `${Math.abs(event.year)} BC` : event.year}`,
    year: event.year,
  }
}

export function generateWhenHappenedQuestion(events: HistoryEvent[]): HistoryQuestion {
  const event = events[Math.floor(Math.random() * events.length)]
  const correctYear = event.year
  const correctDecade = correctYear < 0
    ? `${Math.abs(Math.floor(correctYear / 10) * 10)}s BC`
    : `${Math.floor(correctYear / 10) * 10}s`

  // Generate wrong decades from different eras
  const wrongDecades: string[] = []
  const offsets = [-300, -100, -50, 50, 100, 300]
  for (const offset of shuffle(offsets)) {
    const wrongYear = correctYear + offset
    const decade = wrongYear < 0
      ? `${Math.abs(Math.floor(wrongYear / 10) * 10)}s BC`
      : `${Math.floor(wrongYear / 10) * 10}s`
    if (decade !== correctDecade && !wrongDecades.includes(decade)) {
      wrongDecades.push(decade)
    }
    if (wrongDecades.length >= 3) break
  }

  return {
    prompt: `When did this happen?\n"${event.quote}"`,
    promptEmoji: event.emoji,
    imageUrl: event.imageUrl,
    correctAnswer: correctDecade,
    options: shuffle([correctDecade, ...wrongDecades.slice(0, 3)]),
    funFact: event.funFact,
    hint1: `Event: ${event.event}`,
    hint2: event.person ? `By ${event.person}` : undefined,
    year: event.year,
  }
}

export function generateWhoSaidQuestion(events: HistoryEvent[]): HistoryQuestion {
  const withPerson = events.filter(e => e.person)
  const event = withPerson[Math.floor(Math.random() * withPerson.length)]
  const wrongPeople = pickRandom(
    withPerson.map(e => e.person!),
    3,
    [event.person!]
  )
  return {
    prompt: `Who said this?\n"${event.quote}"`,
    promptEmoji: event.emoji,
    imageUrl: event.imageUrl,
    correctAnswer: event.person!,
    options: shuffle([event.person!, ...wrongPeople]),
    funFact: event.funFact,
    hint1: `Event: ${event.event}`,
    hint2: `Year: ${event.year < 0 ? `${Math.abs(event.year)} BC` : event.year}`,
    year: event.year,
  }
}

export function generateHistoryQuestions(mode: HistoryGameMode, difficulty: string, count: number): HistoryQuestion[] {
  const events = getEventsByDifficulty(difficulty)
  const questions: HistoryQuestion[] = []
  const used = new Set<string>()

  for (let i = 0; i < count; i++) {
    let q: HistoryQuestion
    let attempts = 0
    do {
      switch (mode) {
        case 'name-event': q = generateNameEventQuestion(events); break
        case 'when-happened': q = generateWhenHappenedQuestion(events); break
        case 'who-said': q = generateWhoSaidQuestion(events); break
      }
      attempts++
    } while (used.has(q.correctAnswer) && attempts < 30)
    used.add(q.correctAnswer)
    questions.push(q)
  }
  return questions
}
