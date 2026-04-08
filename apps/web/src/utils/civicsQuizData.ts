// ── US Civics Quiz Data ──────────────────────────────────────────────────────
// Based on the official USCIS 100 Civics Questions for the Naturalization Test
// Source: https://www.uscis.gov (rev. 01/19)

export interface CivicsQuestion {
  id: number
  question: string
  correctAnswers: string[] // multiple accepted answers
  distractors: string[] // plausible wrong answers (same type as correct)
  category: 'government' | 'history' | 'civics'
  subcategory: string
  emoji: string
  funFact?: string
}

export const CIVICS_QUESTIONS: CivicsQuestion[] = [
  // ── A: Principles of American Democracy (1-12) ────────────────────────────
  { id: 1, question: 'What is the supreme law of the land?', correctAnswers: ['the Constitution'], distractors: ["the Declaration of Independence","the Bill of Rights","the Articles of Confederation"], category: 'government', subcategory: 'Principles', emoji: '📜', funFact: 'The Constitution was signed on September 17, 1787' },
  { id: 2, question: 'What does the Constitution do?', correctAnswers: ['sets up the government', 'defines the government', 'protects basic rights of Americans'], distractors: ["declares war on other countries","elects the President","collects taxes from citizens"], category: 'government', subcategory: 'Principles', emoji: '📜', funFact: 'The Constitution is the oldest written national constitution still in use' },
  { id: 3, question: 'The idea of self-government is in the first three words of the Constitution. What are these words?', correctAnswers: ['We the People'], distractors: ["In God We Trust","E Pluribus Unum","Life, Liberty, Happiness"], category: 'government', subcategory: 'Principles', emoji: '✍️', funFact: 'Gouverneur Morris is credited with writing the Preamble' },
  { id: 4, question: 'What is an amendment?', correctAnswers: ['a change to the Constitution', 'an addition to the Constitution'], distractors: ["a type of law","a presidential order","a Supreme Court ruling"], category: 'government', subcategory: 'Principles', emoji: '📝', funFact: 'Over 11,000 amendments have been proposed but only 27 ratified' },
  { id: 5, question: 'What do we call the first ten amendments to the Constitution?', correctAnswers: ['the Bill of Rights'], distractors: ["the Preamble","the Articles of Confederation","the Declaration of Independence"], category: 'government', subcategory: 'Principles', emoji: '⚖️', funFact: 'The Bill of Rights was ratified on December 15, 1791' },
  { id: 6, question: 'What is one right or freedom from the First Amendment?', correctAnswers: ['speech', 'religion', 'assembly', 'press', 'petition the government'], distractors: ["right to drive","right to free education","right to a job"], category: 'government', subcategory: 'Principles', emoji: '🗣️', funFact: 'The First Amendment protects five fundamental freedoms' },
  { id: 7, question: 'How many amendments does the Constitution have?', correctAnswers: ['twenty-seven (27)'], distractors: ["ten (10)","fifty (50)","thirteen (13)"], category: 'government', subcategory: 'Principles', emoji: '🔢', funFact: 'The 27th Amendment took 202 years to ratify' },
  { id: 8, question: 'What did the Declaration of Independence do?', correctAnswers: ['announced our independence from Great Britain', 'declared our independence from Great Britain', 'said that the United States is free from Great Britain'], distractors: ["established the Constitution","ended the Civil War","created the Bill of Rights"], category: 'government', subcategory: 'Principles', emoji: '🇺🇸', funFact: 'Most delegates signed it on August 2, 1776, not July 4' },
  { id: 9, question: 'What are two rights in the Declaration of Independence?', correctAnswers: ['life', 'liberty', 'pursuit of happiness'], distractors: ["freedom of speech","right to vote","right to bear arms"], category: 'government', subcategory: 'Principles', emoji: '🗽', funFact: 'Jefferson was inspired by John Locke\'s philosophy' },
  { id: 10, question: 'What is freedom of religion?', correctAnswers: ['You can practice any religion, or not practice a religion'], distractors: ["You must attend church weekly","The government picks your religion","Only Christianity is allowed"], category: 'government', subcategory: 'Principles', emoji: '🕊️', funFact: 'The Establishment Clause prevents a national religion' },
  { id: 11, question: 'What is the economic system in the United States?', correctAnswers: ['capitalist economy', 'market economy'], distractors: ["communist economy","socialist economy","command economy"], category: 'government', subcategory: 'Principles', emoji: '💰', funFact: 'The US has the largest economy in the world by GDP' },
  { id: 12, question: 'What is the "rule of law"?', correctAnswers: ['Everyone must follow the law', 'Leaders must obey the law', 'Government must obey the law', 'No one is above the law'], distractors: ["The President makes all decisions","Only citizens must follow the law","The military enforces all laws"], category: 'government', subcategory: 'Principles', emoji: '⚖️', funFact: 'The concept dates back to ancient Greece' },
  // ── B: System of Government (13-47) ─────────────────────────────────────────
  { id: 13, question: 'Name one branch or part of the government.', correctAnswers: ['Congress', 'legislative', 'President', 'executive', 'the courts', 'judicial'], distractors: ["the military","the police","the Federal Reserve"], category: 'government', subcategory: 'System', emoji: '🏛️', funFact: 'The three branches were designed to balance power' },
  { id: 14, question: 'What stops one branch of government from becoming too powerful?', correctAnswers: ['checks and balances', 'separation of powers'], distractors: ["the Bill of Rights","the electoral college","term limits only"], category: 'government', subcategory: 'System', emoji: '⚖️', funFact: 'Montesquieu\'s ideas influenced this system' },
  { id: 15, question: 'Who is in charge of the executive branch?', correctAnswers: ['the President'], distractors: ["the Vice President","the Speaker of the House","the Chief Justice"], category: 'government', subcategory: 'System', emoji: '🏛️' },
  { id: 16, question: 'Who makes federal laws?', correctAnswers: ['Congress', 'Senate and House of Representatives', 'U.S. legislature'], distractors: ["the President","the Supreme Court","the military"], category: 'government', subcategory: 'System', emoji: '📋' },
  { id: 17, question: 'What are the two parts of the U.S. Congress?', correctAnswers: ['the Senate and House of Representatives'], distractors: ["the Senate and Supreme Court","the House and the Cabinet","the President and Congress"], category: 'government', subcategory: 'System', emoji: '🏛️', funFact: 'This bicameral system was part of the Great Compromise of 1787' },
  { id: 18, question: 'How many U.S. Senators are there?', correctAnswers: ['one hundred (100)'], distractors: ["fifty (50)","four hundred thirty-five (435)","two hundred (200)"], category: 'government', subcategory: 'System', emoji: '🔢', funFact: 'Each state has exactly 2 senators regardless of population' },
  { id: 19, question: 'We elect a U.S. Senator for how many years?', correctAnswers: ['six (6)'], distractors: ["four (4)","two (2)","eight (8)"], category: 'government', subcategory: 'System', emoji: '📅' },
  { id: 21, question: 'The House of Representatives has how many voting members?', correctAnswers: ['four hundred thirty-five (435)'], distractors: ["one hundred (100)","five hundred (500)","two hundred (200)"], category: 'government', subcategory: 'System', emoji: '🔢', funFact: 'This number has been fixed since 1911' },
  { id: 22, question: 'We elect a U.S. Representative for how many years?', correctAnswers: ['two (2)'], distractors: ["four (4)","six (6)","eight (8)"], category: 'government', subcategory: 'System', emoji: '📅' },
  { id: 24, question: 'Who does a U.S. Senator represent?', correctAnswers: ['all people of the state'], distractors: ["only people who voted for them","only people in their district","only people of their party"], category: 'government', subcategory: 'System', emoji: '👥' },
  { id: 25, question: 'Why do some states have more Representatives than other states?', correctAnswers: ['because of the state\'s population', 'because they have more people'], distractors: ["because of the state's size","because of the state's age","because of the state's wealth"], category: 'government', subcategory: 'System', emoji: '📊', funFact: 'California has the most with 52 representatives' },
  { id: 26, question: 'We elect a President for how many years?', correctAnswers: ['four (4)'], distractors: ["two (2)","six (6)","eight (8)"], category: 'government', subcategory: 'System', emoji: '📅' },
  { id: 27, question: 'In what month do we vote for President?', correctAnswers: ['November'], distractors: ["January","July","March"], category: 'government', subcategory: 'System', emoji: '🗳️', funFact: 'Election Day is always the first Tuesday after the first Monday in November' },
  { id: 30, question: 'If the President can no longer serve, who becomes President?', correctAnswers: ['the Vice President'], distractors: ["the Speaker of the House","the Secretary of State","the Chief Justice"], category: 'government', subcategory: 'System', emoji: '🏛️' },
  { id: 31, question: 'If both the President and the Vice President can no longer serve, who becomes President?', correctAnswers: ['the Speaker of the House'], distractors: ["the Secretary of State","the President pro tempore","the Attorney General"], category: 'government', subcategory: 'System', emoji: '🏛️' },
  { id: 32, question: 'Who is the Commander in Chief of the military?', correctAnswers: ['the President'], distractors: ["the Secretary of Defense","the Chairman of the Joint Chiefs","the Vice President"], category: 'government', subcategory: 'System', emoji: '🎖️' },
  { id: 33, question: 'Who signs bills to become laws?', correctAnswers: ['the President'], distractors: ["Congress","the Supreme Court","the Vice President"], category: 'government', subcategory: 'System', emoji: '✍️' },
  { id: 34, question: 'Who vetoes bills?', correctAnswers: ['the President'], distractors: ["Congress","the Supreme Court","the Speaker of the House"], category: 'government', subcategory: 'System', emoji: '🚫' },
  { id: 35, question: 'What does the President\'s Cabinet do?', correctAnswers: ['advises the President'], distractors: ["makes laws","commands the military","interprets the Constitution"], category: 'government', subcategory: 'System', emoji: '🤝' },
  { id: 36, question: 'What are two Cabinet-level positions?', correctAnswers: ['Secretary of State', 'Secretary of Defense', 'Secretary of Education', 'Secretary of Energy', 'Secretary of the Treasury', 'Attorney General', 'Vice President', 'Secretary of Homeland Security'], distractors: ["Secretary of Sports","Secretary of Technology","Secretary of Weather"], category: 'government', subcategory: 'System', emoji: '💼', funFact: 'There are currently 15 executive departments' },
  { id: 37, question: 'What does the judicial branch do?', correctAnswers: ['reviews laws', 'explains laws', 'resolves disputes', 'decides if a law goes against the Constitution'], distractors: ["makes laws","enforces laws","vetoes bills"], category: 'government', subcategory: 'System', emoji: '⚖️' },
  { id: 38, question: 'What is the highest court in the United States?', correctAnswers: ['the Supreme Court'], distractors: ["the Court of Appeals","the Federal District Court","the Constitutional Court"], category: 'government', subcategory: 'System', emoji: '🏛️', funFact: 'The Supreme Court was established in 1789' },
  { id: 41, question: 'Under our Constitution, some powers belong to the federal government. What is one power of the federal government?', correctAnswers: ['to print money', 'to declare war', 'to create an army', 'to make treaties'], distractors: ["provide schooling","give driver's licenses","provide police protection"], category: 'government', subcategory: 'System', emoji: '🏛️' },
  { id: 42, question: 'Under our Constitution, some powers belong to the states. What is one power of the states?', correctAnswers: ['provide schooling and education', 'provide protection (police)', 'provide safety (fire departments)', 'give a driver\'s license', 'approve zoning and land use'], distractors: ["print money","declare war","make treaties"], category: 'government', subcategory: 'System', emoji: '🏫' },
  { id: 45, question: 'What are the two major political parties in the United States?', correctAnswers: ['Democratic and Republican'], distractors: ["Democratic and Libertarian","Republican and Green","Federalist and Whig"], category: 'government', subcategory: 'System', emoji: '🗳️', funFact: 'The Democratic Party was founded in 1828, the Republican in 1854' },
  // ── C: Rights and Responsibilities (48-57) ──────────────────────────────────
  { id: 48, question: 'There are four amendments to the Constitution about who can vote. Describe one of them.', correctAnswers: ['Citizens eighteen (18) and older can vote', 'You don\'t have to pay a poll tax to vote', 'Any citizen can vote (Women and men can vote)', 'A male citizen of any race can vote'], distractors: ["Only men can vote","Only property owners can vote","Only people over 21 can vote"], category: 'government', subcategory: 'Rights', emoji: '🗳️' },
  { id: 49, question: 'What is one responsibility that is only for United States citizens?', correctAnswers: ['serve on a jury', 'vote in a federal election'], distractors: ["pay taxes","obey the law","carry a passport"], category: 'government', subcategory: 'Rights', emoji: '⚖️' },
  { id: 50, question: 'Name one right only for United States citizens.', correctAnswers: ['vote in a federal election', 'run for federal office'], distractors: ["freedom of speech","freedom of religion","right to education"], category: 'government', subcategory: 'Rights', emoji: '🇺🇸' },
  { id: 51, question: 'What are two rights of everyone living in the United States?', correctAnswers: ['freedom of expression', 'freedom of speech', 'freedom of assembly', 'freedom to petition the government', 'freedom of religion', 'the right to bear arms'], distractors: ["right to free healthcare","right to free housing","right to a government job"], category: 'government', subcategory: 'Rights', emoji: '🗽' },
  { id: 52, question: 'What do we show loyalty to when we say the Pledge of Allegiance?', correctAnswers: ['the United States', 'the flag'], distractors: ["the President","the Constitution","the military"], category: 'government', subcategory: 'Rights', emoji: '🇺🇸' },
  { id: 53, question: 'What is one promise you make when you become a United States citizen?', correctAnswers: ['give up loyalty to other countries', 'defend the Constitution and laws of the United States', 'obey the laws of the United States', 'serve in the U.S. military if needed', 'be loyal to the United States'], distractors: ["keep your other citizenships","never pay taxes","avoid jury duty"], category: 'government', subcategory: 'Rights', emoji: '🤚' },
  { id: 54, question: 'How old do citizens have to be to vote for President?', correctAnswers: ['eighteen (18) and older'], distractors: ["twenty-one (21) and older","sixteen (16) and older","twenty-five (25) and older"], category: 'government', subcategory: 'Rights', emoji: '🗳️' },
  { id: 55, question: 'What are two ways that Americans can participate in their democracy?', correctAnswers: ['vote', 'join a political party', 'help with a campaign', 'join a civic group', 'run for office', 'write to a newspaper', 'call Senators and Representatives'], distractors: ["pay extra taxes","serve in the military","move to Washington D.C."], category: 'government', subcategory: 'Rights', emoji: '🏛️' },
  { id: 56, question: 'When is the last day you can send in federal income tax forms?', correctAnswers: ['April 15'], distractors: ["July 4","January 1","December 31"], category: 'government', subcategory: 'Rights', emoji: '📅', funFact: 'Tax Day has been April 15 since 1955' },
  { id: 57, question: 'When must all men register for the Selective Service?', correctAnswers: ['at age eighteen (18)', 'between eighteen (18) and twenty-six (26)'], distractors: ["at age twenty-one (21)","at age sixteen (16)","at age thirty (30)"], category: 'government', subcategory: 'Rights', emoji: '🎖️' },
  // ── A: Colonial Period and Independence (58-70) ───────────────────────────
  { id: 58, question: 'What is one reason colonists came to America?', correctAnswers: ['freedom', 'political liberty', 'religious freedom', 'economic opportunity', 'escape persecution'], distractors: ["to find gold","to build railroads","to trade with China"], category: 'history', subcategory: 'Colonial', emoji: '⛵', funFact: 'The Pilgrims arrived on the Mayflower in 1620' },
  { id: 59, question: 'Who lived in America before the Europeans arrived?', correctAnswers: ['American Indians', 'Native Americans'], distractors: ["Europeans","Africans","Australians"], category: 'history', subcategory: 'Colonial', emoji: '🏕️' },
  { id: 60, question: 'What group of people was taken to America and sold as slaves?', correctAnswers: ['Africans', 'people from Africa'], distractors: ["Europeans","Asians","South Americans"], category: 'history', subcategory: 'Colonial', emoji: '⛓️', funFact: 'The transatlantic slave trade lasted from the 16th to 19th century' },
  { id: 61, question: 'Why did the colonists fight the British?', correctAnswers: ['because of high taxes (taxation without representation)', 'because the British army stayed in their houses', 'because they didn\'t have self-government'], distractors: ["because of religious differences with France","because of land disputes with Spain","because of trade wars with the Dutch"], category: 'history', subcategory: 'Colonial', emoji: '⚔️' },
  { id: 62, question: 'Who wrote the Declaration of Independence?', correctAnswers: ['Thomas Jefferson'], distractors: ["Benjamin Franklin","George Washington","John Adams"], category: 'history', subcategory: 'Colonial', emoji: '✍️', funFact: 'Jefferson wrote it in about 17 days' },
  { id: 63, question: 'When was the Declaration of Independence adopted?', correctAnswers: ['July 4, 1776'], distractors: ["July 4, 1789","July 4, 1812","July 4, 1800"], category: 'history', subcategory: 'Colonial', emoji: '🎆', funFact: 'Both John Adams and Thomas Jefferson died on July 4, 1826' },
  { id: 64, question: 'There were 13 original states. Name three.', correctAnswers: ['New Hampshire', 'Massachusetts', 'Rhode Island', 'Connecticut', 'New York', 'New Jersey', 'Pennsylvania', 'Delaware', 'Maryland', 'Virginia', 'North Carolina', 'South Carolina', 'Georgia'], distractors: ["California","Texas","Florida"], category: 'history', subcategory: 'Colonial', emoji: '🗺️' },
  { id: 65, question: 'What happened at the Constitutional Convention?', correctAnswers: ['The Constitution was written', 'The Founding Fathers wrote the Constitution'], distractors: ["The Declaration of Independence was signed","The Bill of Rights was written","The President was elected"], category: 'history', subcategory: 'Colonial', emoji: '📜' },
  { id: 66, question: 'When was the Constitution written?', correctAnswers: ['1787'], distractors: ["1776","1791","1800"], category: 'history', subcategory: 'Colonial', emoji: '📅' },
  { id: 67, question: 'The Federalist Papers supported the passage of the U.S. Constitution. Name one of the writers.', correctAnswers: ['James Madison', 'Alexander Hamilton', 'John Jay', 'Publius'], distractors: ["George Washington","Thomas Jefferson","Benjamin Franklin"], category: 'history', subcategory: 'Colonial', emoji: '📚', funFact: 'Hamilton wrote 51 of the 85 Federalist Papers' },
  { id: 68, question: 'What is one thing Benjamin Franklin is famous for?', correctAnswers: ['U.S. diplomat', 'oldest member of the Constitutional Convention', 'first Postmaster General', 'writer of Poor Richard\'s Almanac', 'started the first free libraries'], distractors: ["second President of the United States","inventor of the telephone","author of the Constitution"], category: 'history', subcategory: 'Colonial', emoji: '⚡', funFact: 'Franklin\'s famous kite experiment was in 1752' },
  { id: 69, question: 'Who is the "Father of Our Country"?', correctAnswers: ['George Washington'], distractors: ["Abraham Lincoln","Thomas Jefferson","Benjamin Franklin"], category: 'history', subcategory: 'Colonial', emoji: '🇺🇸' },
  { id: 70, question: 'Who was the first President?', correctAnswers: ['George Washington'], distractors: ["John Adams","Thomas Jefferson","Abraham Lincoln"], category: 'history', subcategory: 'Colonial', emoji: '🏛️', funFact: 'Washington was unanimously elected — twice' },
  // ── B: 1800s (71-77) ────────────────────────────────────────────────────────
  { id: 71, question: 'What territory did the United States buy from France in 1803?', correctAnswers: ['the Louisiana Territory', 'Louisiana'], distractors: ["the Alaska Territory","the Oregon Territory","the Florida Territory"], category: 'history', subcategory: '1800s', emoji: '🗺️', funFact: 'The purchase doubled the size of the United States' },
  { id: 72, question: 'Name one war fought by the United States in the 1800s.', correctAnswers: ['War of 1812', 'Mexican-American War', 'Civil War', 'Spanish-American War'], distractors: ["French and Indian War","World War I","Korean War"], category: 'history', subcategory: '1800s', emoji: '⚔️' },
  { id: 73, question: 'Name the U.S. war between the North and the South.', correctAnswers: ['the Civil War', 'the War between the States'], distractors: ["the Revolutionary War","the War of 1812","the Mexican-American War"], category: 'history', subcategory: '1800s', emoji: '⚔️', funFact: 'The Civil War lasted from 1861 to 1865' },
  { id: 74, question: 'Name one problem that led to the Civil War.', correctAnswers: ['slavery', 'economic reasons', 'states\' rights'], distractors: ["religion","foreign trade","immigration"], category: 'history', subcategory: '1800s', emoji: '📜' },
  { id: 75, question: 'What was one important thing that Abraham Lincoln did?', correctAnswers: ['freed the slaves (Emancipation Proclamation)', 'saved (or preserved) the Union', 'led the United States during the Civil War'], distractors: ["wrote the Constitution","discovered America","invented the telegraph"], category: 'history', subcategory: '1800s', emoji: '🎩', funFact: 'Lincoln was the tallest president at 6\'4"' },
  { id: 76, question: 'What did the Emancipation Proclamation do?', correctAnswers: ['freed the slaves', 'freed slaves in the Confederacy', 'freed slaves in the Confederate states'], distractors: ["ended the Revolutionary War","created the Bill of Rights","established the Supreme Court"], category: 'history', subcategory: '1800s', emoji: '⛓️' },
  { id: 77, question: 'What did Susan B. Anthony do?', correctAnswers: ['fought for women\'s rights', 'fought for civil rights'], distractors: ["wrote the Constitution","was the first female governor","founded the Red Cross"], category: 'history', subcategory: '1800s', emoji: '👩', funFact: 'She was arrested for voting in 1872' },
  // ── C: Recent American History (78-87) ────────────────────────────────────
  { id: 78, question: 'Name one war fought by the United States in the 1900s.', correctAnswers: ['World War I', 'World War II', 'Korean War', 'Vietnam War', 'Persian Gulf War'], distractors: ["French and Indian War","Civil War","War of 1812"], category: 'history', subcategory: 'Recent', emoji: '⚔️' },
  { id: 79, question: 'Who was President during World War I?', correctAnswers: ['Woodrow Wilson'], distractors: ["Abraham Lincoln","Theodore Roosevelt","Franklin Roosevelt"], category: 'history', subcategory: 'Recent', emoji: '🏛️' },
  { id: 80, question: 'Who was President during the Great Depression and World War II?', correctAnswers: ['Franklin Roosevelt'], distractors: ["Harry Truman","Dwight Eisenhower","Herbert Hoover"], category: 'history', subcategory: 'Recent', emoji: '🏛️' },
  { id: 81, question: 'Who did the United States fight in World War II?', correctAnswers: ['Japan, Germany, and Italy'], distractors: ["France, Spain, and Portugal","Russia, China, and Korea","Britain, Canada, and Mexico"], category: 'history', subcategory: 'Recent', emoji: '🌍' },
  { id: 82, question: 'Before he was President, Eisenhower was a general. What war was he in?', correctAnswers: ['World War II'], distractors: ["World War I","Korean War","Vietnam War"], category: 'history', subcategory: 'Recent', emoji: '🎖️' },
  { id: 83, question: 'During the Cold War, what was the main concern of the United States?', correctAnswers: ['Communism'], distractors: ["Fascism","Terrorism","Imperialism"], category: 'history', subcategory: 'Recent', emoji: '❄️' },
  { id: 84, question: 'What movement tried to end racial discrimination?', correctAnswers: ['civil rights movement'], distractors: ["women's suffrage movement","labor movement","temperance movement"], category: 'history', subcategory: 'Recent', emoji: '✊' },
  { id: 85, question: 'What did Martin Luther King, Jr. do?', correctAnswers: ['fought for civil rights', 'worked for equality for all Americans'], distractors: ["wrote the Declaration of Independence","was President during WWII","invented the light bulb"], category: 'history', subcategory: 'Recent', emoji: '✊', funFact: 'He received the Nobel Peace Prize in 1964' },
  { id: 86, question: 'What major event happened on September 11, 2001, in the United States?', correctAnswers: ['Terrorists attacked the United States'], distractors: ["A hurricane hit New Orleans","The stock market crashed","An earthquake hit California"], category: 'history', subcategory: 'Recent', emoji: '🏙️' },
  { id: 87, question: 'Name one American Indian tribe in the United States.', correctAnswers: ['Cherokee', 'Navajo', 'Sioux', 'Chippewa', 'Choctaw', 'Pueblo', 'Apache', 'Iroquois', 'Creek', 'Blackfeet', 'Seminole', 'Cheyenne', 'Hopi', 'Inuit'], distractors: ["Aztec","Maya","Viking"], category: 'history', subcategory: 'Recent', emoji: '🏕️' },
  // ── Integrated Civics: Geography (88-95) ──────────────────────────────────
  { id: 88, question: 'Name one of the two longest rivers in the United States.', correctAnswers: ['Missouri River', 'Mississippi River'], distractors: ["Colorado River","Ohio River","Rio Grande"], category: 'civics', subcategory: 'Geography', emoji: '🌊' },
  { id: 89, question: 'What ocean is on the West Coast of the United States?', correctAnswers: ['Pacific Ocean'], distractors: ["Atlantic Ocean","Indian Ocean","Arctic Ocean"], category: 'civics', subcategory: 'Geography', emoji: '🌊' },
  { id: 90, question: 'What ocean is on the East Coast of the United States?', correctAnswers: ['Atlantic Ocean'], distractors: ["Pacific Ocean","Indian Ocean","Arctic Ocean"], category: 'civics', subcategory: 'Geography', emoji: '🌊' },
  { id: 91, question: 'Name one U.S. territory.', correctAnswers: ['Puerto Rico', 'U.S. Virgin Islands', 'American Samoa', 'Northern Mariana Islands', 'Guam'], distractors: ["Hawaii","Washington D.C.","Cuba"], category: 'civics', subcategory: 'Geography', emoji: '🏝️' },
  { id: 92, question: 'Name one state that borders Canada.', correctAnswers: ['Maine', 'New Hampshire', 'Vermont', 'New York', 'Pennsylvania', 'Ohio', 'Michigan', 'Minnesota', 'North Dakota', 'Montana', 'Idaho', 'Washington', 'Alaska'], distractors: ["Florida","Texas","California"], category: 'civics', subcategory: 'Geography', emoji: '🇨🇦' },
  { id: 93, question: 'Name one state that borders Mexico.', correctAnswers: ['California', 'Arizona', 'New Mexico', 'Texas'], distractors: ["Florida","Louisiana","Colorado"], category: 'civics', subcategory: 'Geography', emoji: '🇲🇽' },
  { id: 94, question: 'What is the capital of the United States?', correctAnswers: ['Washington, D.C.'], distractors: ["New York City","Philadelphia","Los Angeles"], category: 'civics', subcategory: 'Geography', emoji: '🏛️' },
  { id: 95, question: 'Where is the Statue of Liberty?', correctAnswers: ['New York Harbor', 'Liberty Island', 'New Jersey', 'near New York City'], distractors: ["Washington, D.C.","Boston Harbor","Philadelphia"], category: 'civics', subcategory: 'Geography', emoji: '🗽', funFact: 'It was a gift from France in 1886' },
  // ── Integrated Civics: Symbols (96-98) ────────────────────────────────────
  { id: 96, question: 'Why does the flag have 13 stripes?', correctAnswers: ['because there were 13 original colonies', 'because the stripes represent the original colonies'], distractors: ["because there are 13 Presidents","because there are 13 amendments","because there are 13 holidays"], category: 'civics', subcategory: 'Symbols', emoji: '🇺🇸' },
  { id: 97, question: 'Why does the flag have 50 stars?', correctAnswers: ['because there is one star for each state', 'because each star represents a state', 'because there are 50 states'], distractors: ["because there are 50 colonies","because there are 50 amendments","because there are 50 counties"], category: 'civics', subcategory: 'Symbols', emoji: '⭐' },
  { id: 98, question: 'What is the name of the national anthem?', correctAnswers: ['The Star-Spangled Banner'], distractors: ["America the Beautiful","God Bless America","My Country 'Tis of Thee"], category: 'civics', subcategory: 'Symbols', emoji: '🎵', funFact: 'Francis Scott Key wrote it in 1814 during the Battle of Baltimore' },
  // ── Integrated Civics: Holidays (99-100) ──────────────────────────────────
  { id: 99, question: 'When do we celebrate Independence Day?', correctAnswers: ['July 4'], distractors: ["July 14","June 4","August 4"], category: 'civics', subcategory: 'Holidays', emoji: '🎆' },
  { id: 100, question: 'Name two national U.S. holidays.', correctAnswers: ['New Year\'s Day', 'Martin Luther King Jr. Day', 'Presidents\' Day', 'Memorial Day', 'Independence Day', 'Labor Day', 'Columbus Day', 'Veterans Day', 'Thanksgiving', 'Christmas'], distractors: ["Election Day","Tax Day","Flag Day"], category: 'civics', subcategory: 'Holidays', emoji: '🎉' },
]

// ── GAME MODES ────────────────────────────────────────────────────────────────

export type CivicsCategory = 'all' | 'government' | 'history' | 'civics'

export const CIVICS_CATEGORIES: Record<CivicsCategory, { label: string; icon: string; description: string }> = {
  all: { label: 'All Topics', icon: '📋', description: 'All 100 questions mixed together' },
  government: { label: 'American Government', icon: '🏛️', description: 'Principles, system, rights & responsibilities' },
  history: { label: 'American History', icon: '📜', description: 'Colonial period, 1800s, and recent history' },
  civics: { label: 'Integrated Civics', icon: '🗺️', description: 'Geography, symbols, and holidays' },
}

// ── QUESTION GENERATOR ────────────────────────────────────────────────────────

export interface CivicsGameQuestion {
  question: string
  correctAnswer: string
  options: string[]
  funFact?: string
  emoji: string
  subcategory: string
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export function generateCivicsQuestions(category: CivicsCategory, count: number): CivicsGameQuestion[] {
  let pool = CIVICS_QUESTIONS
  if (category !== 'all') {
    pool = CIVICS_QUESTIONS.filter(q => q.category === category)
  }

  const selected = shuffle(pool).slice(0, count)
  return selected.map(q => {
    const correct = q.correctAnswers[Math.floor(Math.random() * q.correctAnswers.length)]

    // Use per-question distractors (plausible wrong answers of the same type)
    const wrongs = q.distractors
      ? shuffle(q.distractors.filter(w => !q.correctAnswers.includes(w))).slice(0, 3)
      : []

    return {
      question: q.question,
      correctAnswer: correct,
      options: shuffle([correct, ...wrongs.slice(0, 3)]),
      funFact: q.funFact,
      emoji: q.emoji,
      subcategory: q.subcategory,
    }
  })
}
