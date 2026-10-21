// First-person edition: three complete, progressively harder stealth rooms.
// All coordinates are metres in Babylon's left-handed coordinate system.
export const LEVELS = [
  {
    id: 1, number: '01', name: 'THE BEDROOM', subtitle: 'A sleeping house. A ticking clock.',
    intro: 'Someone left the bedroom door unlocked. Silence the alarm, find the brass key, and open the drawer without waking him.',
    palette: { wall: '#71646c', wallAccent:'#ddd0be', floor:'#84614a', carpet:'#655c68', ceiling:'#ada398', wood:'#654431', fabric:'#66848a', light:'#ffcb90', sky:'#7186b0' },
    atmosphere: 'night', timer: 125, maxNoise: 98, wakeFactor: 1.0,
    start: [5.5, 5.3], bed: [-4.45,-2.9],
    objectives: [
      { id:'clock', name:'Silence the alarm clock', action:'Silence', position:[-2.7,-3.4], kind:'clock', noise:10, timer:true },
      { id:'key', name:'Pick up the brass key', action:'Take key', position:[4.1,0.5], kind:'key', noise:5 },
      { id:'drawer', name:'Unlock the bedside drawer', action:'Unlock drawer', position:[3.85,-4.75], kind:'drawer', requires:'key', noise:18 }
    ]
  },
  {
    id: 2, number: '02', name: 'THE HOTEL SUITE', subtitle: 'Luxury is never quiet.',
    intro: 'A guest has fallen asleep with the television on. Mute it, recover the access card, and open the briefcase before your time runs out.',
    palette: { wall:'#5e6666', wallAccent:'#c8b8a4', floor:'#555653', carpet:'#38646a', ceiling:'#9a9c90', wood:'#514533', fabric:'#647982', light:'#edb574', sky:'#5d819b' },
    atmosphere: 'city', timer: 108, maxNoise: 90, wakeFactor: 1.18,
    start: [5.7, 5.3], bed: [-4.45,-2.9],
    objectives: [
      { id:'television', name:'Switch off the television', action:'Turn off', position:[-2.7,-3.4], kind:'television', noise:9, timer:true },
      { id:'keycard', name:'Take the access card', action:'Pick up card', position:[4.1,0.5], kind:'keycard', noise:7 },
      { id:'case', name:'Open the locked briefcase', action:'Open case', position:[3.85,-4.75], kind:'case', requires:'keycard', noise:25 }
    ]
  },
  {
    id: 3, number: '03', name: 'THE STORM CABIN', subtitle: 'One mistake and the night is over.',
    intro: 'The storm covers your footsteps, but not your mistakes. Turn off the radio, find the old key and retrieve the sealed documents.',
    palette: { wall:'#554c44', wallAccent:'#b7a991', floor:'#624b3c', carpet:'#654a48', ceiling:'#776a5f', wood:'#49382e', fabric:'#70615a', light:'#d6ab78', sky:'#627a9a' },
    atmosphere:'storm', timer: 94, maxNoise: 85, wakeFactor:1.32,
    start:[5.5,5.3], bed:[-4.45,-2.9],
    objectives:[
      { id:'radio', name:'Turn off the crackling radio', action:'Turn off radio', position:[-2.7,-3.4], kind:'radio', noise:12, timer:true },
      { id:'oldkey', name:'Find the old iron key', action:'Take key', position:[4.1,0.5], kind:'oldkey', noise:8 },
      { id:'documents', name:'Open the lockbox', action:'Retrieve papers', position:[3.85,-4.75], kind:'documents', requires:'oldkey', noise:29 }
    ]
  }
];

export const ROOM = { halfX: 8, halfZ: 7, eye: 1.68, crouch: 1.23 };

export function isReady(objective, completed) {
  return !objective.requires || completed.has(objective.requires);
}

export function objectivesCompleted(level, completed) {
  return level.objectives.every((o)=>completed.has(o.id));
}

export function remainingObjectives(level, completed) {
  return level.objectives.filter((o)=>!completed.has(o.id));
}
