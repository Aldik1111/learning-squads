"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AppIcon } from "./app-icon";
import styles from "./demo-plans.module.css";

export function DemoPlans() {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState(false);

  function openPreview() {
    dialog.current?.showModal();
    cancelButton.current?.focus();
  }

  function selectDemo() {
    setSelected(true);
    dialog.current?.close();
  }

  return <div className={styles.page}>
    <header className={styles.heading}>
      <span className={styles.badge}>Pricing hypothesis</span>
      <h1>Preview the $19/month model</h1>
      <p>All current MVP features are free. Explore a proposed subscription without payment details or a change to your access.</p>
    </header>
    <div className={styles.cards}>
      <section className={styles.card} aria-labelledby="free-plan-title">
        <p className={styles.eyebrow}>Current access</p><h2 id="free-plan-title">Free MVP</h2>
        <p className={styles.price}>$0 <span>/ today</span></p>
        <p className={styles.description}>Start learning with a browser guest profile. No email or password needed.</p>
        <ul className={styles.features}><li>Six courses with 18 modules</li><li>Knowledge checks with explanations</li><li>Private task results with optional group sharing</li><li>In-browser Python practice and saved progress</li><li>Automatic Python and AI course groups</li><li>Private group chat, progress, and calendar</li><li>Spanish and French partner invitations and practice calls</li></ul>
        <div className={styles.action}><Link className="ls-button ls-button-secondary" href="/dashboard">Continue free →</Link></div>
      </section>
      <section className={`${styles.card} ${styles.proposal}`} aria-labelledby="demo-plan-title">
        <span className={styles.demoBadge}>Demo only</span>
        <p className={styles.eyebrow}>A plan to test</p><h2 id="demo-plan-title">Learning together</h2>
        <p className={styles.price}>$19 <span>/ month</span></p>
        <p className={styles.description}>Could a continuing learning and practice experience be worth a monthly subscription?</p>
        <div className={styles.hypothesis}>
          <AppIcon name="sparkles"/>
          <h3>A price hypothesis, open for testing</h3>
          <p>The future offering has not been decided. This preview does not promise additional features, guaranteed partners, or certificates.</p>
          <p>No payment is collected, no subscription starts, and all MVP features remain free.</p>
        </div>
        <div className={styles.action}><button className={`ls-button ${styles.previewButton}`} onClick={openPreview}><AppIcon name="sparkles"/> Preview upgrade</button></div>
      </section>
    </div>
    <div role="status" aria-live="polite">
      {selected && <div className={`ls-success ${styles.selection}`}><strong>Demo plan selected</strong><p>This selection exists only on this page and resets when you reload. You have not paid or subscribed. All MVP features remain free.</p><button className="ls-button ls-button-secondary ls-button-small" onClick={()=>setSelected(false)}>Clear demo selection</button></div>}
    </div>
    <section className={styles.faq} aria-labelledby="plans-faq-title">
      <h2 id="plans-faq-title">Frequently asked questions</h2>
      <details open><summary>Is Learning Squads free right now?</summary><p>Yes. All current MVP lessons, knowledge checks, Python practice, course groups, task results, and language partner calls are available without payment.</p></details>
      <details><summary>What does the $19/month preview do?</summary><p>It opens a demo confirmation. Selecting the demo plan changes only this page until you reload. It does not record a purchase, start a subscription, or unlock additional features.</p></details>
      <details><summary>How do groups and practice calls work?</summary><p>Python and AI groups match up to four learners using their weekly availability. Spanish and French have separate partner invitations for people who list the matching primary language and are available now. A partner still needs to accept; availability is not guaranteed.</p></details>
      <details><summary>Will my progress survive closing this tab?</summary><p>Your progress is saved to your guest account. Return in the same browser profile to continue. Clearing browser data can remove access to that account; account recovery is not available yet.</p></details>
    </section>
    <dialog className={`ls-plan-dialog ${styles.dialog}`} ref={dialog} aria-labelledby="plan-confirm-title" aria-describedby="plan-confirm-description">
      <p className="ls-eyebrow">Demo confirmation</p><h2 id="plan-confirm-title">Preview a $19/month plan?</h2>
      <p id="plan-confirm-description">This is a pricing hypothesis, not a checkout. Confirming selects a demo plan on this page only. There is no charge, recurring subscription, or change to your free access.</p>
      <div className="ls-actions"><button ref={cancelButton} className="ls-button ls-button-secondary" onClick={()=>dialog.current?.close()}>Cancel</button><button className="ls-button" onClick={selectDemo}>Select demo plan</button></div>
    </dialog>
  </div>;
}
