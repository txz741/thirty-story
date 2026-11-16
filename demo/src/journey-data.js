import {CHAPTERS} from './chapter-config.js';
const panels=(id,captions)=>captions.map((entry,index)=>({image:`assets/stories/${id}/${String(index+1).padStart(2,'0')}.jpg`,...(typeof entry==='string'?{caption:entry}:entry)}));
export const events=[
  {id:'graduation',title:'夏天',badge:'graduation',panels:panels('graduation',['终于还是到这一天了啊','感觉像做梦一样','该出发了','再看一眼这里的夏天吧'])},
  {id:'bow',title:'蝴蝶',badge:'bow',panels:panels('bow',['来看看这家店','好可爱 (✧ω✧)','浅浅试一下','嘿嘿嘿'])},
  {id:'badminton',title:'LUCKY',badge:'badminton',panels:panels('badminton',['放马过来！','好险','能过去吗','LUCKY!'])},
  {id:'karaoke',title:'我来看我的演唱会',badge:'karaoke',panels:panels('karaoke',['还记得 你说家是唯一的城堡🎵','咦？','和我好像😳','童年的纸飞机🎵','(/ω＼)'])},
  {id:'market-goose',title:'不许动！',badge:'market-goose',panels:panels('market-goose',['今天集市有什么好玩的呢','我们来玩个游戏吧','一二三木头人','你输了，你被我收服了！'])},
  {id:'crabs',title:'螃蟹季',badge:'crabs',panels:panels('crabs',['看看今天的收获','好沉！','哇！今天也很LUCKY!','时间差不多了','😋'])},
  {id:'cooking',title:'金色小厨娘',badge:'cooking',panels:panels('cooking',['今天我掌勺','滋啦滋啦~','出锅！','金黄色！','无需低调'])},
  {id:'overtime',title:'今天有点忙',badge:'overtime',panels:panels('overtime',['SELECT * FROM users;','都这么晚了啊','','终于写完了','今晚月色真美']),
    branch:{afterPanel:1,resumePanel:3,title:'你有一条新邀请',hiddenBadge:'paper-plane',panels:panels('overtime-if',['你是？','现在终于飞回我手里🎵',''])}},
  {id:'dinner-with-mom',title:'漂亮饭',badge:'dinner-with-mom',panels:panels('dinner-with-mom',['就是这一家！','哇！','','让手机也尝尝'])},
  {id:'red-light-goose',title:'你也不许动！',badge:'wings',exit:'finale',panels:panels('red-light-goose',['要变灯了','快点快点',{caption:'慢！',speaker:'goose'},'差点又闯红灯了 (≧▽≦)'])},
];
// Keep unchanged pictures cached, and refresh only the replaced panels.
const imageRevisions={graduation:{1:47,3:47},'market-goose':{0:46,1:46,2:46,3:46},overtime:{3:46,4:45}};
for(const event of events)for(const [index,revision] of Object.entries(imageRevisions[event.id]||{}))event.panels[index].image+=`?v=${revision}`;
export const finale={title:'装满奇遇趣漫游',panels:panels('finale',['这是？','包包在发光','',{caption:'别等红灯了，本嘎送你一程',speaker:'goose'},''])};
export const badges=Object.fromEntries([...events.map(e=>[e.badge,{title:e.badge==='wings'?'乘风之翼':e.title,image:`assets/badges/${e.badge}.png`}]),['paper-plane',{title:'童年的纸飞机',image:'assets/badges/paper-plane.png'}]]);
export const character={idle:'assets/idle.png',stepLeft:'assets/step-left.png',stepRight:'assets/step-right.png',curious:'assets/curious.png',expect:'assets/expect.png',bagOpen:'assets/expect-bag-open.png',wink:'assets/wink.png',bagMouth:{x:.354,y:.46},openBagMouth:{x:.354,y:.474}};
export const eventFor=state=>events[state.eventIndex]||events[0];
export function panelsFor(state){
  if(state.phase==='finale'||state.phase==='finished')return finale.panels;
  const event=eventFor(state);
  if(event.branch&&state.branchChoice==='if')return [...event.panels.slice(0,event.branch.afterPanel+1),...event.branch.panels,...event.panels.slice(event.branch.resumePanel??event.branch.afterPanel+1)];
  return event.panels;
}
export function pendingBadges(state){const event=eventFor(state);return [event.badge,...(event.branch&&state.branchChoice==='if'?[event.branch.hiddenBadge]:[])].filter(id=>!state.badges.includes(id));}
export const allAssets=[...new Set(['assets/cover.jpg',...CHAPTERS.map(c=>c.background).filter(Boolean),...Object.values(character).filter(v=>typeof v==='string'),...events.flatMap(e=>[...e.panels,...(e.branch?.panels||[])]).map(p=>p.image),...finale.panels.map(p=>p.image),...Object.values(badges).map(b=>b.image)])];
