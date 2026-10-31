import { useLayoutEffect, useRef, useState } from 'react';
import './welcome.css';

// Original Figma artwork on a 407 by 882 artboard.
export default function WelcomeScreen({ onStart }) {
  const viewport = useRef(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const {width, height} = entry.contentRect;
      setScale(height >= width ? Math.max(width / 407, height / 882) : Math.min(width / 407, height / 882, 1));
    });
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);

  return <main className="welcome-backdrop">
    <section ref={viewport} className="welcome-viewport" aria-labelledby="welcome-title">
      <div className="welcome-scenery" aria-hidden="true">
        <img src="/assets/welcome/background.png" alt="" fetchPriority="high"/>
      </div>
      <div className="welcome-canvas" style={{ transform: `translate(-50%, -50%) scale(${scale})` }}>
        <div className="welcome-art" aria-hidden="true">
          <img className="welcome-edge" src="/assets/welcome/edge.svg" alt=""/>
          <img className="welcome-brand-glow" src="/assets/welcome/brand-glow.svg" alt=""/>
          <img className="welcome-divider" src="/assets/welcome/divider.svg" alt=""/>
          <img className="welcome-spark" src="/assets/welcome/spark.svg" alt=""/>
          <img className="welcome-dot" src="/assets/welcome/dot.svg" alt=""/>
        </div>
        <div className="welcome-branding">
          <h1 id="welcome-title" className="welcome-heading"><img src="/assets/welcome/heading.svg" alt="Welcome to"/></h1>
          <p className="welcome-wordmark"><img src="/assets/welcome/wordmark.svg" alt="Mancord"/></p>
          <p className="welcome-tagline"><img src="/assets/welcome/tagline.svg" alt="Your spaces, your people."/></p>
        </div>
        <button className="welcome-begin" aria-label="Start Your New Begining!" onClick={onStart}><img className="welcome-button-art" src="/assets/welcome/button.svg" alt="" aria-hidden="true"/><img className="welcome-button-label" src="/assets/welcome/button-label.png" alt="" aria-hidden="true"/></button>
      </div>
    </section>
  </main>;
}
