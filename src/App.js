import React, { Component } from 'react';
import Teoria from 'teoria';
import Vex from 'vexflow';
import './App.css';

const triadQualities = {
  M: 'major',
  m: 'minor',
  aug: 'augmented',
  dim: 'diminished',
  sus2: 'sus2',
  sus4: 'sus4',
};
const legalClefs = ['treble', 'bass', 'alto', 'tenor'];
const legalTriads = ['M', 'm', 'aug', 'dim', 'sus2', 'sus4'];

const legalRanges = {
  treble: {
    0: ['D4', 'G5'], // 62-79
    1: ['B3', 'B5'], // 59-83
    2: ['G3', 'D6'], // 55-86
  },
  bass: {
    0: ['F2', 'B3'], // 41-59
    1: ['D2', 'D4'], // 38-62
    2: ['B1', 'F4'], // 35-65
  },
  alto: {
    0: ['E3', 'A4'], // 52-69
    1: ['C3', 'C5'], // 48-72
    2: ['A2', 'E5'], // 45-76
  },
  tenor: {
    0: ['C3', 'F4'], // 48-65
    1: ['A2', 'A4'], // 45-69
    2: ['F2', 'C5'], // 41-72
  },
};

const util = {
  isiOS: (() => {
    return !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);
  })(),
  
  allNotes: (() => {
    const names = 'C,C#/Db,D,D#/Eb,E,F,F#/Gb,G,G#/Ab,A,A#/Bb,B'.split(',');
    let octave = 0;
    let idx = 0;
    const notes = [];
    for (let midi = 24; midi <= 108; midi++) {
      if (idx === 12) {
        idx = 0;
        octave++;
      }
      notes[midi] = (names[idx++] + octave).replace('/', '' + octave + '/');
    }
    return notes;
  })(),
  
  getRange(start, end, noAccidentals) {
    const notesLookup = util.allNotes;
    const res = notesLookup.slice(notesLookup.indexOf(start), notesLookup.indexOf(end) + 1);
    if (!noAccidentals) {
      return res;
    }
    return res.filter(v => !v.includes('/'));
  },
  
  getRand(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  
  getRandomElement(arr) {
    return arr[util.getRand(0, arr.length - 1)];
  },
  
  randomSortCallback() {
    return 0.5 - Math.random();
  },
  
  prettyChord(triad) {
    return triad.toString().replace('M', '').replace('#', '♯').replace(/b/g, '♭');
  },
  
  prettyNote(note) {
    return note.name().toUpperCase() + 
      note.accidental()
        .replace('#', '♯')
        .replace(/b/g, '♭')
        .replace('x', '𝄪');
  },
};

const settings = {
  treble: true,
  bass: true,
  tenor: false,
  alto: false,
  M: true,
  m: true,
  aug: true,
  dim: true,
  sus2: false,
  sus4: false,
  ledger: 'ledger2',
  mode: 'id',
};

if (window.location.hash.substring(1)) {
  const hash = window.location.hash.substring(1).split(',').map(decodeURIComponent);
  Object.keys(settings).forEach(s => {
    settings[s] = hash.includes(s);
  });
  settings.ledger = hash.includes('ledger2') ? 'ledger2' : hash.includes('ledger1') ? 'ledger1' : 'ledger0';
  settings.mode = hash.includes('ear') ? 'ear' : hash.includes('spell') ? 'spell' : 'id';
  
  if (!legalClefs.some(clef => !!settings[clef])) {
    settings.treble = true;
  }
  if (!legalTriads.some(t => !!settings[t])) {
    settings.M = true;
  }
}

function updateSettings(e) {
  if (e.target.nodeName === 'SELECT') {
    settings[e.target.getAttribute('id')] = e.target.value;  
  } else {
    settings[e.target.getAttribute('id')] = e.target.checked;  
  }
  
  if (!legalClefs.some(clef => !!settings[clef])) {
    e.target.checked = true;
    settings[e.target.getAttribute('id')] = true;
    alert('Pick at least one clef');
    
  }
  if (!legalTriads.some(t => !!settings[t])) {
    e.target.checked = true;
    settings[e.target.getAttribute('id')] = true;
    alert('Pick at least one type of triad');
  }

  window.location.hash = Object.keys(settings)
    .filter(s => settings[s] === true || s === 'ledger' || s === 'mode')
    .join(',')
    .replace('ledger', settings['ledger'])
    .replace('mode', settings['mode']);
  
  if (window.location.hash.substring(1).split(',').length === Object.keys(settings).length) {
    // all the options = default
    window.location.hash = '';
  }
}

let chord, notes;
let svg;
let triadType;

function getCount() {
  return null;
}
function getQuestion(i) {
  const clefOptions = [];
  legalClefs.forEach(c => {
    if (settings[c]) {
      clefOptions.push(c);
    }
  });
  const triadOptions = [];
  legalTriads.forEach(c => {
    if (settings[c]) {
      triadOptions.push(c);
    }
  });
  let ledgerOption = parseInt(settings.ledger.replace('ledger', ''))  
  const vf = new Vex.Flow.Factory({
    renderer: {elementId: '_vex', width: 150, height: 150}
  });
  const score = vf.EasyScore();
  const system = vf.System();
  let clef;
  
  try {
    clef = util.getRandomElement(clefOptions);
    const tri = util.getRandomElement(triadOptions);
    triadType = triadQualities[tri];
    const ra = legalRanges[clef][ledgerOption];
    const range = util.getRange(ra[0], ra[1]).slice(0, -7);
    let rando = util.getRandomElement(range).split('/').sort(util.randomSortCallback)[0];
    const bottomNote = Teoria.note(rando);  
    chord = bottomNote.chord(tri);
    notes = chord.notes();

    const voices = notes.slice().map(note => note.toString().replace('x', '##')).join(' ');
    system.addStave({voices: [score.voice(score.notes('('+ voices +')/w', {clef}))]}).addClef(clef);

    vf.draw();      
  } catch(_){
    return getQuestion();
  }

  svg = null;
  if (settings.mode === 'id') {
    return vf.context.svg;  
  } else {
    svg = vf.context.svg;
  }
  
  if (settings.mode === 'ear') {
    return <div>Press one of the play buttons to hear the chord. Try to figure out its quality. <p>When done, click here to reveal the answer.</p></div>;
  }

  if (settings.mode === 'spell') {
    return (
      <div>
        On your own paper please spell out <strong>
        {chord.toString().replace('M', '').replace('#', '♯').replace(/b/g, '♭')}</strong> in <strong>{clef}</strong> clef. 
        <p>When done, click to reveal the answer.</p>
      </div>
    );
  }
}

function getAnswer(i) {
  const stave = svg !== null ? <div dangerouslySetInnerHTML={{__html: svg.outerHTML}} /> : null;
  const prettyChord = util.prettyChord(chord);
  if (settings.mode === 'spell') {
    return <div>{prettyChord}<br/>{stave}</div>;
  }
  if (settings.mode === 'ear') {
    return (
      <div>
        <strong>{triadType}</strong> ({prettyChord})<br/>
        {stave}
      </div>
    );
  }
  
  return (
    <div>
      <p><strong>{triadType}</strong></p>
      <p>{prettyChord}</p>
      <p>{notes.map(util.prettyNote).join(', ')}</p>
    </div>
  );  
}

function getAudio() {
  const samples = 'https://www.onlinemusictools.com/_samples/';
  return notes.map(note => 
    new Audio(samples + note.midi() + '.mp3')
  );
}

// the actual quiz is done, boring stuff follows...

class App extends Component {
  constructor() {
    super();
    this.state = {
      question: getQuestion(1),
      answer: getAnswer(1),
      total: getCount(),
      i: 1,
      audio: getAudio(1),
      pause: false,
      settings: false,
      playingNote: -1,
    };
    window.addEventListener('keydown', (e) => {
      // space bar
      if (e.keyCode === 32 || e.charCode === 32) {
        e.preventDefault();
        this.playChord();
      }
      // p and P
      if (e.keyCode === 112 || e.charCode === 112 || e.keyCode === 80 || e.charCode === 80) {
        e.preventDefault();
        this.playChord();
      }
      // right arrow
      if (e.keyCode === 39 || e.charCode === 39) {
        e.preventDefault();
        this.nextQuestion();
      }
      // n and N
      if (e.keyCode === 110 || e.charCode === 110 || e.keyCode === 78 || e.charCode === 78) {
        e.preventDefault();
        this.nextQuestion();
      }
    });
  }
  
  nextQuestion() {
    this.pause();
    this.setState({
      question: getQuestion(this.state.i + 1),
      answer: getAnswer(this.state.i + 1),
      i: this.state.i + 1,
      audio: getAudio(this.state.i + 1),
      playingNote: -1,
    });
  }
  
  pause() {    
    for (const note of this.state.audio) {
      note.pause();
      note.currentTime = 0;
    }
    this.setState({pause: true});
  }

  playChord() {
    this.pause();
    this.setState({pause: false, playingNote: -1});
    for (const note of this.state.audio) {
      note.play();
    }
  }
  
  playNextNote() {
    let playingNote = this.state.playingNote;
    playingNote++;
    if (playingNote === this.state.audio.length) {
      playingNote = 0;
    }
    const note = this.state.audio[playingNote];
    note.currentTime = 0;
    note.play();
    this.setState({playingNote});
  }
  
  toggleSettings() {
    if (this.state.settings) {
      this.nextQuestion();
    }
    this.setState({settings: !this.state.settings});
  }
  
  render() {
    return (
      <div>
        <div className="settings">
          <div className="settingsLink" onClick={this.toggleSettings.bind(this)}>⚙ Customize</div>
          {this.state.settings 
          ? <div>
              <Settings /> 
              <button className="settingsButton" onClick={e => {
                this.toggleSettings();
                this.nextQuestion();
              }}>done</button>
            </div>
          : null
          }
        </div>
        {
          this.state.total 
            ? <Count i={this.state.i} total={this.state.total} />
            : null
        }
        <Flashcard
          id={this.state.i}
          question={this.state.question}
          answer={this.state.answer}
        />
        <button 
          className="playButton" 
          onMouseDown={this.playChord.bind(this)}>
          {util.isiOS ? 'play chord' : '▶ chord'}
        </button>
        {' '}
        <button 
          className="playButton" 
          onMouseDown={this.playNextNote.bind(this)}>
          {util.isiOS ? 'play' : '▶'}
          {' note ' +
            (this.state.playingNote === -1 || this.state.playingNote === this.state.audio.length
              ? 1 
              : (this.state.playingNote + 1)
            ) +
            '/' + 
            (this.state.audio.length)
          }
        </button>
        {' '}
        {
          (this.state.total && this.state.i >= this.state.total)
            ? null
            : <button 
                className="nextButton" 
                onClick={this.nextQuestion.bind(this)}>
                next...
              </button>
        }
      </div>
    );
  }
}

class Flashcard extends Component {

  constructor(props) {
    super();
    this.state = {
      reveal: false,
      id: props.id,
    };
    window.addEventListener('keydown', (e) => {
      // arrows
      if (e.keyCode === 38 || e.charCode === 38 || e.keyCode === 40 || e.charCode === 40) {
        this.flip();
      }
      // f and F
      if (e.keyCode === 102 || e.charCode === 102 || e.keyCode === 70 || e.charCode === 70) {
        this.flip();
      }
    });
  }

  static getDerivedStateFromProps(props, state) {
    if (props.id !== state.id) {
      return {
        reveal: false,
        id: props.id,
      };
    }
    return null;
  }

  flip() {
    this.setState({
      reveal: !this.state.reveal,
    });
  }

  render() {
    const className = "card flip-container" + (this.state.reveal ? ' flip' : '');
    return (
      <div><center>
        <div className={className} onClick={this.flip.bind(this)}>
          <div className="flipper">
            <div className="front" style={{display: this.state.reveal ? 'none' : ''}}>
              {settings.mode === 'id' 
                ? <div dangerouslySetInnerHTML={{__html: this.props.question.outerHTML}} />
                : <div>{this.props.question}</div>
              }
            </div>
            <div className="back" style={{display: this.state.reveal ? '' : 'none'}}>
              {this.props.answer}
            </div>
          </div>
        </div>
        <button className="answerButton" onClick={this.flip.bind(this)}>flip</button>
      </center></div>
    );
  }
}

const Count = ({i, total}) =>
  <div>
    Question {i} / {total}
  </div>;

const Settings = () =>
  <table><tbody>
    <tr><th>Clefs</th><th>Triads</th><th>Max ledger lines</th></tr>
    <tr><td>
    {
      legalClefs.map(c => 
        <div key={c}>
          <input type="checkbox" id={c} defaultChecked={settings[c]} onChange={updateSettings}/>
          <label htmlFor={c}>{c}</label>
        </div>
      )
    }
    </td><td>
    {
      legalTriads.map(s => 
        <div key={s}>
          <input type="checkbox" id={s} defaultChecked={settings[s]} onChange={updateSettings}/>
          <label htmlFor={s}>{s}</label>
        </div>
      )
    }
    </td><td>
    {
      <div>
        <select id="ledger" onChange={updateSettings} defaultValue={settings.ledger}>
          <option value="ledger0">No ledger lines</option>
          <option value="ledger1">Up to 1 line</option>
          <option value="ledger2">Up to 2 lines</option>
        </select>
      </div>
    }
    <p>
      <strong>Exercise mode</strong>
      <br/>
      <select id="mode" onChange={updateSettings} defaultValue={settings.mode}>
        <option value="id">Identify triads</option>
        <option value="spell">Spell triads</option>
        <option value="ear">Ear training</option>
      </select>
    </p>
    </td></tr>
  </tbody></table>;
  
export default App;
