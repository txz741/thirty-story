export const story = {
  id: 'badminton', title: '快乐比输赢重要', badge: 'badminton',
  panels: [
    { image:'assets/badminton-1.jpg', caption:'隔网准备' },
    { image:'assets/badminton-2.jpg', caption:'击球' },
    { image:'assets/badminton-3.jpg', caption:'网口特写' },
    { image:'assets/badminton-4.jpg', caption:'快乐，比输赢更重要。' },
  ],
};
export const character = {
  idle:'assets/idle.png', stepLeft:'assets/step-left.png', stepRight:'assets/step-right.png',
  curious:'assets/curious.png', expect:'assets/expect.png', wink:'assets/wink.png',
  // Relative to the standardized 640 × 960 canvas, not the screen.
  bagMouth:{x:.354,y:.46},
};
export const assets = [ 'assets/cover.jpg', ...Object.values(character).filter(v=>typeof v==='string'),
  ...story.panels.map(p=>p.image), 'assets/badminton-badge.png' ];

// M2 order is deliberately separate from the M1 playback sequence.
export const plannedEvents = [
  ['graduation','毕业','01'], ['bow','买蝴蝶结','02'], ['badminton','羽毛球','03'],
  ['karaoke','唱 K','04'], ['market-goose','集市遇大鹅','06'], ['crabs','又是一年螃蟹季','09'],
  ['cooking','下厨','07'], ['overtime','加班','05'], ['dinner-with-mom','与妈妈吃漂亮饭','08'],
  ['red-light-goose','红灯遇鹅','10'],
];
