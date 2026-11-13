const panels=(id,captions)=>captions.map((caption,index)=>({image:`assets/stories/${id}/${String(index+1).padStart(2,'0')}.jpg`,caption}));
export const events=[
  {id:'graduation',title:'毕业',badge:'graduation',panels:panels('graduation',['校园草坪','树荫下的时光','走向校门','从校园出发'])},
  {id:'bow',title:'买蝴蝶结',badge:'bow',panels:panels('bow',['橱窗里的蝴蝶结','选中你啦','镜前扎起马尾','今日份漂亮'])},
  {id:'badminton',title:'羽毛球',badge:'badminton',panels:panels('badminton',['隔网准备','击球','网口特写','快乐，比输赢更重要。'])},
  {id:'karaoke',title:'唱 K',badge:'karaoke',panels:panels('karaoke',['尽情唱歌','好像哪里不对','MV 里的另一个自己','幻想中的舞台','回到包间，笑起来'])},
  {id:'market-goose',title:'集市遇大鹅',badge:'market-goose',panels:panels('market-goose',['阳光下的集市','遇见一只大白鹅','和大鹅对视','集市里的小奇遇'])},
  {id:'crabs',title:'又是一年螃蟹季',badge:'crabs',panels:panels('crabs',['湖边准备下网','用力拉网','满载收获','揭锅，熟蟹变红','又是一年螃蟹季'])},
  {id:'cooking',title:'自己做饭',badge:'cooking',panels:panels('cooking',['下厨准备','锅里的好味道','糖醋排骨装盘','金色的厨房','尝一口自己的手艺'])},
  {id:'overtime',title:'加班',badge:'overtime',panels:panels('overtime',['落日后的办公室','夜深了','伏在桌上的片刻','伸一个懒腰','走进夜色']),
    branch:{afterPanel:1,resumePanel:3,title:'如果今天，可以早点下班呢？',hiddenBadge:'paper-plane',panels:panels('overtime-if',['童年向我伸出手','童年的纸飞机','我一直都在'])}},
  {id:'dinner-with-mom',title:'和妈妈吃漂亮饭',badge:'dinner-with-mom',panels:panels('dinner-with-mom',['母女相聚','漂亮饭上桌','边吃边聊','记录这一刻'])},
  {id:'red-light-goose',title:'红灯遇鹅',badge:'wings',exit:'finale',panels:panels('red-light-goose',['黄昏路口','差点闯红灯','大鹅拦住了她','大鹅与她，会心一笑'])},
];
export const finale={title:'乘风去往回忆里',panels:panels('finale',['最后一枚勋章','打开包，回忆飞来','一路收藏的星光','大鹅的邀请','带着回忆，继续向前。'])};
export const badges=Object.fromEntries([...events.map(e=>[e.badge,{title:e.title==='红灯遇鹅'?'乘风之翼':e.title,image:`assets/badges/${e.badge}.png`}]),['paper-plane',{title:'童年的纸飞机',image:'assets/badges/paper-plane.png'}]]);
export const character={idle:'assets/idle.png',stepLeft:'assets/step-left.png',stepRight:'assets/step-right.png',curious:'assets/curious.png',expect:'assets/expect.png',bagOpen:'assets/expect-bag-open.png',wink:'assets/wink.png',bagMouth:{x:.354,y:.46},openBagMouth:{x:.354,y:.474}};
export const eventFor=state=>events[state.eventIndex]||events[0];
export function panelsFor(state){
  if(state.phase==='finale'||state.phase==='finished')return finale.panels;
  const event=eventFor(state);
  if(event.branch&&state.branchChoice==='if')return [...event.panels.slice(0,event.branch.afterPanel+1),...event.branch.panels,...event.panels.slice(event.branch.resumePanel??event.branch.afterPanel+1)];
  return event.panels;
}
export function pendingBadges(state){const event=eventFor(state);return [event.badge,...(event.branch&&state.branchChoice==='if'?[event.branch.hiddenBadge]:[])].filter(id=>!state.badges.includes(id));}
export const allAssets=[...new Set(['assets/cover.jpg',...Object.values(character).filter(v=>typeof v==='string'),...events.flatMap(e=>[...e.panels,...(e.branch?.panels||[])]).map(p=>p.image),...finale.panels.map(p=>p.image),...Object.values(badges).map(b=>b.image)])];
