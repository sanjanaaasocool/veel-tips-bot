// Question bank for /trivia.
//
// Each entry is { text, options: [3 strings], answer: index of the correct one }.
// Option strings become Discord button labels, which cap at 80 characters, so
// keep them short.
const QUESTIONS = [
  {
    text: 'What does UGC actually stand for?',
    options: ['User Generated Content', 'Universal Gross Coverage', 'Unpaid Guest Collab'],
    answer: 0,
  },
  {
    text: 'What aspect ratio should you film in for TikTok, Reels, and Shorts?',
    options: ['16:9 landscape', '9:16 vertical', '1:1 square'],
    answer: 1,
  },
  {
    text: 'In short-form video, what is a "hook"?',
    options: ['The caption hashtag', 'The first few seconds that stop the scroll', 'The end-card CTA'],
    answer: 1,
  },
  {
    text: 'What are "usage rights" in a brand deal?',
    options: [
      'Where and how long the brand can use your content',
      'Your right to keep the free product',
      'Permission to tag the brand',
    ],
    answer: 0,
  },
  {
    text: 'What does "whitelisting" mean in creator partnerships?',
    options: [
      'Getting verified on the platform',
      'The brand runs paid ads from your handle',
      'Being added to a brand roster',
    ],
    answer: 1,
  },
  {
    text: 'What does a UGC creator typically deliver to a brand?',
    options: [
      'Raw content the brand posts itself',
      'A post on their own page only',
      'A written review',
    ],
    answer: 0,
  },
  {
    text: 'What is B-roll?',
    options: ['The blooper takes', 'Supplementary footage cut over the main shot', 'The second draft'],
    answer: 1,
  },
  {
    text: 'What does CTA stand for?',
    options: ['Call To Action', 'Content Type Analysis', 'Creator Talent Agency'],
    answer: 0,
  },
  {
    text: 'What is a brand "brief"?',
    options: [
      'The contract you sign',
      'The doc outlining deliverables and requirements',
      'Your pitch to the brand',
    ],
    answer: 1,
  },
  {
    text: 'Cheapest way to get flattering light for UGC?',
    options: ['Overhead ceiling light', 'Face a window in daylight', 'Phone flash'],
    answer: 1,
  },
  {
    text: 'What does "organic" content mean?',
    options: ['Content with no ad spend behind it', 'Content about sustainable brands', 'Unedited footage'],
    answer: 0,
  },
  {
    text: 'Roughly what do beginner UGC creators charge per video?',
    options: ['$5 to $20', '$75 to $150', '$800 to $1200'],
    answer: 1,
  },
  {
    text: 'Why do creators film in 4K even for a 1080p deliverable?',
    options: [
      'Room to crop and reframe without losing quality',
      'It uploads faster',
      'Platforms require it',
    ],
    answer: 0,
  },
  {
    text: 'What is an Instagram carousel?',
    options: ['A looping video', 'A multi-image swipeable post', 'A live collab'],
    answer: 1,
  },
  {
    text: 'What is the safest way to handle audio for talking-head UGC?',
    options: [
      'Rely on the phone mic across the room',
      'Record close to the phone or use a lav mic',
      'Add music over everything',
    ],
    answer: 1,
  },
];

const LETTERS = ['A', 'B', 'C'];

// Remembers the last question shown per channel so back-to-back rounds do not
// repeat. Lambda holds module state only for the life of a warm container, so
// this is best-effort rather than guaranteed.
const lastByChannel = new Map();

function getRandomQuestion(channelId) {
  const previous = lastByChannel.get(channelId);

  let index = Math.floor(Math.random() * QUESTIONS.length);
  while (QUESTIONS.length > 1 && index === previous) {
    index = Math.floor(Math.random() * QUESTIONS.length);
  }
  lastByChannel.set(channelId, index);

  const question = QUESTIONS[index];

  return {
    text: question.text,
    options: question.options,
    correctIndex: question.answer,
    correctLetter: LETTERS[question.answer],
  };
}

module.exports = { LETTERS, getRandomQuestion };
