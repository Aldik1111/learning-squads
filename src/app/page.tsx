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
      <ol><li><span>01</span><h3>Find a starting point</h3><p>Pick a short module and learn something you can use.</p></li><li><span>02</span><h3>Give it a try</h3><p>Check your understanding and learn from each explanation.</p></li><li><span>03</span><h3>Practise together</h3><p>Join a course group that fits your schedule, or practise Spanish one to one.</p></li></ol>
    </section>
    <section className="ls-panel ls-judge-guide" aria-labelledby="judge-guide-title">
      <p className="ls-eyebrow">For judges and first-time testers</p><h2 id="judge-guide-title">Try the whole experience.</h2>
      <p className="ls-muted">Study independently, join a Python or AI group, or try a Spanish conversation. No registration or payment is needed.</p>
      <ol className="ls-guide-list">
        <li><strong>Start with a lesson.</strong> Open <Link className="ls-text-link" href="/dashboard">Learn</Link>, read a module, and submit its knowledge check. In Python, write a function and run the checks. Reload to see saved progress.</li>
        <li><strong>Use two independent browser profiles.</strong> Two different browsers also work. Two tabs or normal windows in the same browser profile share one guest account; they will not act as two people.</li>
        <li><strong>Try an automatic course group.</strong> In each browser, save matching weekly windows and a time zone in <Link className="ls-text-link" href="/schedule">Weekly availability</Link>. Return to Learn and join the same Python or AI course. Groups have up to four people and need at least 15 minutes shared by every member. If no group fits, a new numbered group waits for teammates while lessons remain available.</li>
        <li><strong>Open your private group.</strong> Visit <Link className="ls-text-link" href="/teams">My groups</Link> to chat and see current teammates’ progress. The <Link className="ls-text-link" href="/calendar">calendar</Link> shows automatically prepared meetings. Matching uses current group capacity and availability, so a public test may place you with other compatible learners.</li>
        <li><strong>Try Spanish separately.</strong> In the first browser’s <Link className="ls-text-link" href="/profile">profile</Link>, set primary language to <code>es</code>, enable conversation invitations, and save. In the second browser, open <Link className="ls-text-link" href="/practice">Spanish practice</Link> and find a partner. The invited person accepts in <Link className="ls-text-link" href="/notifications">Invitations</Link> within ten minutes. Matching is random among active, available Spanish-speaking profiles.</li>
        <li><strong>Open a prepared meeting.</strong> When Google Meet is ready, open its link from your group calendar or Spanish conversation. There is no manual link entry. Spanish practice starts its timer from your link click; Finish this practice records that interval, not verified attendance.</li>
      </ol>
      <p className="ls-small ls-muted">A schedule change may automatically move you to a compatible group: progress stays, but previous group chats become inaccessible. Spanish partner availability expires after two minutes without activity. Google Meet may have its own access requirements; an unavailable link is shown honestly while lessons and chat remain usable.</p>
      <div className="ls-actions"><Link className="ls-button" href="/dashboard">Start learning →</Link><Link className="ls-text-link" href="/plans">Preview the $19/month pricing hypothesis</Link></div>
      <p className="ls-small ls-muted" style={{margin:"16px 0 0"}}>All MVP features are free. The pricing preview takes no payment and starts no subscription.</p>
    </section>
  </>;
}
