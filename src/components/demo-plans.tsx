"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { PageHeading } from "./states";

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

  return <>
    <PageHeading eyebrow="A pricing experiment" title="Learn freely. Preview the idea.">
      All current MVP features are free. The proposed $19/month subscription below is a price hypothesis for future testing.
    </PageHeading>
    <div className="ls-grid ls-plans-grid">
      <section className="ls-panel"><p className="ls-eyebrow">Available today</p><h2>Free MVP</h2>
        <p className="ls-price">$0</p><p className="ls-muted">Start without email, a password, or payment details.</p>
        <ul className="ls-plan-features"><li>All three beginner modules: Python, How to use AI, and Spanish</li><li>Knowledge checks, Python practice, and saved progress</li><li>Course groups, private chat, and Spanish partner invitations</li></ul>
        <Link className="ls-button" href="/dashboard">Continue free →</Link>
      </section>
      <section className="ls-panel ls-plan-proposal"><p className="ls-eyebrow">Proposed subscription · demo only</p><h2>A plan to test</h2>
        <p className="ls-price">$19<span>/month</span></p>
        <p className="ls-muted">Our hypothesis: learners may pay for a continuing learning and practice experience. This price is not a live offer or evidence of willingness to pay.</p>
        <p className="ls-small">Preview the confirmation flow. No payment is collected, no subscription starts, and your access stays the same.</p>
        <button className="ls-button ls-button-secondary" onClick={openPreview}>Preview upgrade</button>
      </section>
    </div>
    <div className="ls-plan-status" role="status" aria-live="polite">
      {selected && <div className="ls-success"><strong>Demo plan selected</strong><p style={{margin:"8px 0 0"}}>This selection exists only on this page and resets when you reload. You have not paid or subscribed. All MVP features remain free.</p><button className="ls-button ls-button-secondary ls-button-small" style={{marginTop:16}} onClick={()=>setSelected(false)}>Clear demo selection</button></div>}
    </div>
    <p className="ls-small ls-muted">The demo does not collect payment details, record a purchase, or unlock additional features.</p>
    <dialog className="ls-plan-dialog" ref={dialog} aria-labelledby="plan-confirm-title" aria-describedby="plan-confirm-description">
      <p className="ls-eyebrow">Demo confirmation</p><h2 id="plan-confirm-title">Preview a $19/month plan?</h2>
      <p id="plan-confirm-description">This is a pricing hypothesis, not a checkout. Confirming selects a demo plan on this page only. There is no charge, recurring subscription, or change to your free access.</p>
      <div className="ls-actions"><button ref={cancelButton} className="ls-button ls-button-secondary" onClick={()=>dialog.current?.close()}>Cancel</button><button className="ls-button" onClick={selectDemo}>Select demo plan</button></div>
    </dialog>
  </>;
}
