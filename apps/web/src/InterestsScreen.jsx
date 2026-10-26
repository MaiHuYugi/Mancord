import { useState } from 'react';
import DesignIcon, { Glyph } from './DesignIcon.jsx';

const interests = [['🎮','Gaming'],['🎵','Music'],['💻','Tech'],['🤖','AI & Science'],['🎨','Art'],['📚','Study'],['🏆','Sports'],['🎬','Movies'],['🌍','Travel'],['🍕','Food']];
export function ProgressSteps({ final = false }) { return <div className="onboarding-progress" aria-label={final ? 'Final setup step' : 'Personalize your profile'}>{[0,1,2,3,4].map(step=><span className={step < 3 || final ? 'complete' : step === 3 ? 'current' : ''} key={step}/>)}</div>; }

export default function InterestsScreen({ userId, onDone, onBack }) {
  const [selected, setSelected] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`mancord:interests:${userId}`)) || ['Gaming','Music','Tech','AI & Science']; }
    catch { return ['Gaming','Music','Tech','AI & Science']; }
  });
  function toggle(name) { setSelected(current=>current.includes(name)?current.filter(item=>item!==name):[...current,name]); }
  function finish() { try { localStorage.setItem(`mancord:interests:${userId}`,JSON.stringify(selected)); } catch { /* Preferences still apply for this visit. */ } onDone(selected); }
  return <section className="interests-screen" aria-labelledby="interests-title"><ProgressSteps final/>
    <h1 id="interests-title">What are you into?</h1><p>Pick your interests to make your Mancord space yours.</p>
    <div className="interest-options">{interests.map(([icon,name])=><button type="button" key={name} aria-pressed={selected.includes(name)} onClick={()=>toggle(name)}><Glyph>{icon}</Glyph>{name}</button>)}</div>
    <div className="interests-finish"><button type="button" className="auth-submit" onClick={finish}>Enter Mancord</button><p>You can always change these later in Settings</p></div>
    {onBack && <button type="button" className="interests-back" onClick={onBack}><DesignIcon name="interestsBack"/>Back</button>}
  </section>;
}
