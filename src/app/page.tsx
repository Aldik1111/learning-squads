import Link from "next/link";

export default function HomePage() {
  return <>
    <section className="ls-hero">
      <div className="ls-hero-copy">
        <p className="ls-eyebrow">For your next small breakthrough</p>
        <h1>Make room <br />for <em>something new.</em></h1>
        <p className="ls-lead">Learn a little Python. Get more confident with AI. Start a conversation in Spanish. A short lesson is a good place to begin.</p>
        <div className="ls-actions"><Link className="ls-button" href="/dashboard">Explore the lessons <span aria-hidden="true">↗</span></Link><Link className="ls-text-link" href="/start">Make it yours</Link></div>
        <p className="ls-small ls-muted">No email, password, or signup form. Just start learning.</p>
      </div>
      <div className="ls-hero-art" role="img" aria-label="Three ways to learn: Python, AI, and Spanish">
        <div className="ls-orbit ls-orbit-one" /><div className="ls-orbit ls-orbit-two" />
        <div className="ls-note-card ls-note-python"><span className="ls-note-kicker">Build something</span><strong>Python</strong><code>def next_step():<br />&nbsp;&nbsp;return &quot;try it&quot;</code></div>
        <div className="ls-note-card ls-note-spanish"><span className="ls-note-kicker">Speak Spanish</span><strong>¡Hola!</strong></div>
        <div className="ls-note-card ls-note-ai"><span className="ls-note-kicker">Ask something</span><strong>How to use AI</strong><span>Clear requests.<br />Thoughtful checks.</span></div>
      </div>
    </section>
    <section className="ls-steps" aria-labelledby="how-it-works">
      <div><p className="ls-eyebrow">A rhythm you can return to</p><h2 id="how-it-works">Read. Try. Talk it through.</h2></div>
      <ol><li><span>01</span><h3>Find a starting point</h3><p>Pick a short module and learn something you can use.</p></li><li><span>02</span><h3>Give it a try</h3><p>Check your understanding and learn from each explanation.</p></li><li><span>03</span><h3>Practise together</h3><p>Find a squad or a conversation partner when you want company.</p></li></ol>
    </section>
  </>;
}
