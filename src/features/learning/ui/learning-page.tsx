"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { LearningModule, Progress, PythonRunResult, QuizAttempt } from "@/contracts";
import { getModule, getProgress, submitPythonResult, submitQuiz } from "@/lib/api-client";
import { KnowledgeCheck, type QuizAnswers } from "@/features/quizzes/ui/knowledge-check";
import { PythonExercise } from "@/features/python-runner/python-exercise";
import styles from "./learning-page.module.css";

export function LearningPage({ moduleId }: { moduleId: string }) {
  const [module, setModule] = useState<LearningModule | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [progressError, setProgressError] = useState(false);
  const [initialAttempt, setInitialAttempt] = useState<QuizAttempt | undefined>();
  const quizRequest = useRef<{ fingerprint: string; id: string } | null>(null);
  const pythonRequest = useRef<{ result: PythonRunResult; id: string } | null>(null);

  useEffect(() => {
    let active = true;
    void getModule(moduleId).then(value => { if (active) setModule(value); }).catch(() => { if (active) setLoadError(true); });
    void getProgress().then(value => {
      if (!active) return;
      setProgress(current => current ? {
        ...value,
        quizAttempts: [...new Map([...value.quizAttempts, ...current.quizAttempts].map(item=>[item.id,item])).values()].sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt)),
        pythonAttempts: [...new Map([...value.pythonAttempts, ...current.pythonAttempts].map(item=>[item.id,item])).values()].sort((a,b)=>b.submittedAt.localeCompare(a.submittedAt)),
      } : value);
      setInitialAttempt(value.quizAttempts.find(attempt => attempt.moduleId === moduleId));
      setProgressError(false);
    }).catch(() => { if (active) setProgressError(true); }).finally(() => { if (active) setProgressLoaded(true); });
    return () => { active = false; };
  }, [moduleId, revision]);

  async function checkAnswers(answers: QuizAnswers) {
    if (!module) throw new Error("Module is not loaded");
    const fingerprint = JSON.stringify([module.id, module.contentVersion, Object.entries(answers).sort()]);
    if (quizRequest.current?.fingerprint !== fingerprint) quizRequest.current = { fingerprint, id: crypto.randomUUID() };
    const result = await submitQuiz(module.id, module.contentVersion, { ...answers }, quizRequest.current.id);
    quizRequest.current = null;
    setProgress(current => current ? { ...current, quizAttempts: [result, ...current.quizAttempts.filter(item=>item.id!==result.id)] } : {quizAttempts:[result],pythonAttempts:[],practice:[]});
    return result;
  }

  async function savePython(result: PythonRunResult) {
    if (pythonRequest.current?.result !== result) pythonRequest.current = { result, id: crypto.randomUUID() };
    const saved = await submitPythonResult(result, pythonRequest.current.id);
    pythonRequest.current = null;
    setProgress(current => current ? { ...current, pythonAttempts: [saved, ...current.pythonAttempts.filter(item=>item.id!==saved.id)] } : {quizAttempts:[],pythonAttempts:[saved],practice:[]});
  }

  if (loadError) return <section className="ls-state ls-error" role="alert"><h1>We could not open this lesson</h1><p>Check the link or try again. Your saved attempts are not changed.</p><div className="ls-actions"><button className="ls-button" onClick={()=>{setLoadError(false);setRevision(value=>value+1);}}>Try again</button><Link href="/dashboard">Back to courses</Link></div></section>;
  if (!module) return <p role="status">Loading your lesson…</p>;
  const restored = initialAttempt?.contentVersion === module.contentVersion ? initialAttempt : undefined;
  const latest = progress?.quizAttempts.find(attempt=>attempt.moduleId===module.id && attempt.contentVersion===module.contentVersion);
  const pythonSaved = progress?.pythonAttempts.find(attempt=>attempt.exerciseId===module.exercise?.id && attempt.exerciseVersion===module.exercise?.exerciseVersion);
  const practice = progress?.practice?.find(item=>item.moduleId===module.id);

  return <div className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Lesson navigation"><Link href="/dashboard">← All learning paths</Link><span className={styles.level}>{module.level}</span></nav>
    <header className={styles.hero}><p className={styles.eyebrow}>{module.exercise ? "Programming" : module.conversation ? "Languages" : "AI"} · Lesson and practice</p><h1>{module.title}</h1>
      <div className={styles.objectives}><h2>What you will practise</h2><ul>{module.objectives.map(item=><li key={item}><span aria-hidden="true">◇</span>{item}</li>)}</ul></div>
    </header>
    <div className={styles.layout}>
    <aside className={styles.sidebar} aria-label="Lesson sections and saved progress">
      <nav className={styles.sectionNav} aria-label="In this lesson"><h2>In this lesson</h2>
        <a href="#lesson-content"><span aria-hidden="true">01</span> Read the lesson</a>
        {module.exercise && <a href="#python-practice"><span aria-hidden="true">02</span> Python sandbox</a>}
        {module.conversation && <a href="#conversation-practice"><span aria-hidden="true">02</span> Speaking practice</a>}
        <a href="#knowledge-check"><span aria-hidden="true">{module.exercise || module.conversation ? "03" : "02"}</span> Knowledge check <small>{module.quiz.length} questions</small></a>
      </nav>
      <section className={styles.progressCard} aria-labelledby="saved-lesson-progress"><h2 id="saved-lesson-progress">Your practice record</h2>
        {!progressLoaded ? <p>Loading saved results…</p> : progressError ? <p>Saved results are temporarily unavailable.</p> : <>
          <p>{latest ? <><strong>{latest.items.filter(item=>item.correct).length}/{latest.items.length}</strong> on your latest knowledge check</> : "No saved knowledge check yet. Take your time with the lesson."}</p>
          {pythonSaved && <p><strong>{pythonSaved.passed}/{pythonSaved.total}</strong> Python examples passed</p>}
          {module.conversation && <p><strong>{Math.floor((practice?.seconds ?? 0)/60)} min</strong> recorded conversation practice</p>}
        </>}
        <p className={styles.recordNote}>Practice records help you pick up where you left off. They are not a course certificate.</p>
      </section>
      <Link className={styles.backLink} href="/dashboard">Explore another course →</Link>
    </aside>
    <div className={styles.content}>
    <article id="lesson-content" className={`${styles.material} ${styles.panel}`} aria-label="Learning material"><Markdown remarkPlugins={[remarkGfm]} components={{h1:props=><h2>{props.children}</h2>}} skipHtml>{module.lessonMarkdown}</Markdown></article>
    <div className={styles.nextStep}><div><strong>Ready to try it?</strong><p>{module.exercise ? "Put the lesson to work in the Python sandbox." : module.conversation ? "Use the conversation guide, then find a practice partner." : "Check your understanding and review every explanation."}</p></div><a href={module.exercise ? "#python-practice" : module.conversation ? "#conversation-practice" : "#knowledge-check"}>Continue to practice <span aria-hidden="true">→</span></a></div>
    {progressError && <p className="ls-state" role="status">Saved progress is temporarily unavailable. You can still study and run Python. Submitting a check will retry the connection.</p>}
    {module.exercise && <section id="python-practice" className={styles.section}>
      <PythonExercise exercise={module.exercise} onResult={savePython} />
      {pythonSaved && <p className="ls-success">Saved Python self-check: {pythonSaved.passed}/{pythonSaved.total} examples passed on {new Date(pythonSaved.submittedAt).toLocaleString()}. This is a practice record.</p>}
    </section>}
    {module.conversation && <section id="conversation-practice" className={`${styles.material} ${styles.panel} ${styles.section}`} aria-label="Conversation practice">
      <Markdown remarkPlugins={[remarkGfm]} components={{h1:props=><h2>{props.children}</h2>}} skipHtml>{module.conversation.guideMarkdown}</Markdown>
      <p><strong>Recorded practice: {Math.floor((practice?.seconds ?? 0) / 60)} / {module.conversation.minimumPracticeMinutes} minutes.</strong></p>
      <p>Time is added after you choose “Finish this practice” in a module-linked call. Overlapping intervals count once. This is not verified attendance.</p>
      <Link className="ls-button" href={`/practice?module=${encodeURIComponent(module.id)}`}>Find a Spanish-speaking partner</Link>
    </section>}
    <section id="knowledge-check" className={styles.section} aria-label="Knowledge check and saved result">
      {latest && <p className="ls-success">Saved result: {latest.items.filter(item=>item.correct).length}/{latest.items.length} correct · {new Date(latest.submittedAt).toLocaleString()}.</p>}
      {progressLoaded ? <KnowledgeCheck quiz={{moduleId:module.id,contentVersion:module.contentVersion,title:"Check what you learned",questions:module.quiz}} initialAttempt={restored ? {id:restored.id,answers:restored.answers,feedback:restored} : undefined} onSubmit={checkAnswers} /> : <p role="status">Restoring your saved answers…</p>}
    </section>
    </div>
    </div>
  </div>;
}
