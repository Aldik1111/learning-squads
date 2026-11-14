import Link from "next/link";
import { courses } from "@/features/learning/server/content";
import styles from "./home.module.css";

export default async function HomePage() {
  const catalog = await courses();
  return <div className={styles.home}>
    <section className={styles.hero} aria-labelledby="home-title">
      <div className={styles.heroCopy}>
        <p className={styles.badge}><span aria-hidden="true" />For your next small breakthrough</p>
        <h1 id="home-title">Make room<br />for <em>something new.</em></h1>
        <p className={styles.lead}>Learn a little Python. Get more confident with AI. Start a conversation in Spanish. A short lesson is a good place to begin.</p>
        <div className={styles.actions}><Link className={styles.primaryButton} href="/dashboard">Explore the lessons <span aria-hidden="true">→</span></Link><Link className={styles.secondaryButton} href="/start">Make it yours</Link></div>
        <p className={styles.noSignup}><span aria-hidden="true">✓</span> No email, password, or signup form. Just start learning.</p>
      </div>
      <div className={styles.art} role="img" aria-label="Python, AI and Spanish practice connected around Learning Squads">
        <div className={styles.orbit} /><div className={styles.innerOrbit} />
        <div className={styles.core}><span aria-hidden="true">✦</span><strong>Squads</strong></div>
        <div className={`${styles.note} ${styles.pythonNote}`}><span className={styles.kicker}>Build something</span><strong><span aria-hidden="true">⌘</span> Python</strong><pre><code>{'def next_step():\n  return "try it"'}</code></pre></div>
        <div className={`${styles.note} ${styles.spanishNote}`}><span className={styles.kicker}>Speak Spanish</span><strong>¡Hola!</strong><small>Me llamo Sam.</small></div>
        <div className={`${styles.note} ${styles.aiNote}`}><span className={styles.kicker}>Ask something</span><strong><span aria-hidden="true">✦</span> How to use AI</strong><p>Clear requests.<br />Thoughtful checks.</p></div>
      </div>
    </section>

    <section aria-labelledby="how-it-works">
      <div className={styles.sectionHeading}><p className={styles.eyebrow}>A rhythm you can return to</p><h2 id="how-it-works">Read. Try. Talk it through.</h2></div>
      <ol className={styles.steps}>
        <li><span className={styles.stepGhost} aria-hidden="true">01</span><span className={styles.stepNumber} aria-hidden="true">1</span><h3>Find a starting point</h3><p>Pick a short module and learn something you can use in Python, AI, or Spanish.</p></li>
        <li><span className={styles.stepGhost} aria-hidden="true">02</span><span className={styles.stepNumber} aria-hidden="true">2</span><h3>Give it a try</h3><p>Check your understanding with a quiz. In Python, run real code against automated checks.</p></li>
        <li><span className={styles.stepGhost} aria-hidden="true">03</span><span className={styles.stepNumber} aria-hidden="true">3</span><h3>Practise together</h3><p>Join an assigned Python or AI group that fits your schedule, or practise Spanish one to one.</p></li>
      </ol>
    </section>

    <section aria-labelledby="featured-title">
      <div className={styles.featuredHeading}><div><p className={styles.eyebrow}>Ready right now</p><h2 id="featured-title">A small start. A useful skill.</h2></div><Link className={styles.textLink} href="/dashboard">View all learning paths <span aria-hidden="true">→</span></Link></div>
      <div className={styles.courseGrid}>{catalog.map(course => {
        const firstModule = course.modules[0];
        if (!firstModule) return null;
        return <article className={styles.courseCard} key={course.id}>
          <span className={styles.category}>{course.category === "ai" ? "AI" : course.category}</span>
          <h3>{course.title}</h3>
          <p>{course.id === "python" ? "Write your first useful function and put it to the test." : course.id === "how-to-use-ai" ? "Make clear requests and learn to check the answers." : "Learn to introduce yourself and start a conversation."}</p>
          <p className={styles.nextModule}><span>First module</span><strong>{firstModule.title}</strong></p>
          <div className={styles.courseFooter}><span>{course.collaborationMode === "group" ? "Groups of up to 4" : "One-to-one practice"}</span><Link className={styles.moduleButton} href={`/learn/${firstModule.id}`} aria-label={`Start ${firstModule.title}`}>Start module <span aria-hidden="true">→</span></Link></div>
        </article>;
      })}</div>
    </section>
    <section id="tester-guide" className={styles.judge} aria-labelledby="judge-guide-title">
      <p className={styles.badge}>For judges and first-time testers</p><h2 id="judge-guide-title">Try the whole experience.</h2>
      <p className={styles.judgeLead}>Study independently, join a Python or AI group, or try a Spanish conversation. No registration or payment is needed.</p>
      <ol className={styles.guideList}>
        <li><strong>Start with a lesson.</strong> Open <Link className={styles.judgeLink} href="/dashboard">Learn</Link>, read a module, and submit its knowledge check. In Python, write a function and run the checks. Reload to see saved progress.</li>
        <li><strong>Use two independent browser profiles.</strong> Two different browsers also work. Two tabs or normal windows in the same browser profile share one guest account; they will not act as two people.</li>
        <li><strong>Try an automatic course group.</strong> In each browser, save matching weekly windows and a time zone in <Link className={styles.judgeLink} href="/schedule">Weekly availability</Link>. Return to Learn and join the same Python or AI course. Groups have up to four people and need at least 15 minutes shared by every member. If no group fits, a new numbered group waits for teammates while lessons remain available.</li>
        <li><strong>Open your private group.</strong> Visit <Link className={styles.judgeLink} href="/teams">My groups</Link> to chat and see current teammates’ progress. The <Link className={styles.judgeLink} href="/calendar">calendar</Link> shows automatically prepared meetings. Matching uses current group capacity and availability, so a public test may place you with other compatible learners.</li>
        <li><strong>Try Spanish separately.</strong> In the first browser’s <Link className={styles.judgeLink} href="/profile">profile</Link>, set primary language to <code>es</code>, enable conversation invitations, and save. In the second browser, open <Link className={styles.judgeLink} href="/practice">Spanish practice</Link> and find a partner. The invited person accepts in <Link className={styles.judgeLink} href="/notifications">Invitations</Link> within ten minutes. Matching is random among active, available Spanish-speaking profiles.</li>
        <li><strong>Open a prepared meeting.</strong> When Google Meet is ready, open its link from your group calendar or Spanish conversation. There is no manual link entry. Spanish practice starts its timer from your link click; Finish this practice records that interval, not verified attendance.</li>
      </ol>
      <p className={styles.finePrint}>A schedule change may automatically move you to a compatible group: progress stays, but previous group chats become inaccessible. Spanish partner availability expires after two minutes without activity. Sign in to Google before opening Meet; anonymous entry was denied in our checks. An unavailable link is shown honestly while lessons and chat remain usable.</p>
      <div className={styles.actions}><Link className={styles.judgeButton} href="/dashboard">Start learning →</Link><Link className={styles.judgeLink} href="/plans">Preview the $19/month pricing hypothesis</Link></div>
      <p className={styles.finePrint} style={{margin:"16px 0 0"}}>All MVP features are free. The pricing preview takes no payment and starts no subscription.</p>
    </section>
  </div>;
}
