"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import styles from "./knowledge-check.module.css";

// View models only. The API adapter and persisted attempt DTO belong to T02/T07.
export type QuizView = {
  moduleId: string;
  contentVersion: number;
  title: string;
  questions: readonly {
    id: string;
    prompt: string;
    options: readonly { id: string; text: string }[];
  }[];
};

export type QuizAnswers = Readonly<Record<string, string>>;
export type QuizFeedback = {
  moduleId: string;
  contentVersion: number;
  items: readonly {
    questionId: string;
    correctOptionId: string;
    correct: boolean;
    explanation: string;
  }[];
};

export type KnowledgeCheckProps = {
  quiz: QuizView;
  onSubmit: (answers: QuizAnswers) => Promise<QuizFeedback>;
  initialAttempt?: { id: string; answers: Record<string, string>; feedback: QuizFeedback };
};

function matchesAttempt(result: QuizFeedback, quiz: QuizView, answers: QuizAnswers) {
  return result.moduleId === quiz.moduleId && result.contentVersion === quiz.contentVersion
    && Array.isArray(result.items) && result.items.length === quiz.questions.length
    && new Set(result.items.map((item) => item.questionId)).size === quiz.questions.length
    && quiz.questions.every((question) => {
      const item = result.items.find((entry) => entry.questionId === question.id);
      return item && typeof item.explanation === "string" && item.explanation.trim().length > 0
        && question.options.some((option) => option.id === item.correctOptionId)
        && item.correct === (answers[question.id] === item.correctOptionId);
    });
}

export function KnowledgeCheck(props: KnowledgeCheckProps) {
  // A different module/version must never inherit answers or an in-flight result.
  return <QuizAttempt key={JSON.stringify([props.quiz.moduleId, props.quiz.contentVersion, props.initialAttempt?.id])} {...props} />;
}

function QuizAttempt({ quiz, onSubmit, initialAttempt }: KnowledgeCheckProps) {
  const id = useId();
  const restored = initialAttempt && matchesAttempt(initialAttempt.feedback, quiz, initialAttempt.answers);
  const [answers, setAnswers] = useState<Record<string, string>>(restored ? initialAttempt.answers : {});
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<QuizFeedback | null>(restored ? initialAttempt.feedback : null);
  const [error, setError] = useState(false);
  const submitting = useRef(false);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const firstOption = useRef<HTMLInputElement>(null);
  const answered = quiz.questions.filter((question) => answers[question.id] !== undefined).length;
  const complete = quiz.questions.length > 0 && answered === quiz.questions.length;

  useEffect(() => {
    if (feedback && feedback !== initialAttempt?.feedback) resultHeading.current?.focus();
    if (error) errorMessage.current?.focus();
  }, [feedback, error, initialAttempt?.feedback]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !complete || feedback) return;
    submitting.current = true;
    setPending(true);
    setError(false);
    try {
      const result = await onSubmit({ ...answers });
      if (!matchesAttempt(result, quiz, answers)) throw new Error("Unexpected quiz feedback");
      setFeedback(result);
    } catch {
      // Keep selections so a network failure does not force the learner to start over.
      setError(true);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  if (quiz.questions.length === 0) {
    return <section className={styles.panel}><h2>Knowledge check</h2><p>No questions are available for this module yet. You can still read the lesson.</p></section>;
  }

  return (
    <section className={styles.panel} aria-labelledby={`${id}-title`}>
      <header className={styles.header}>
        <div>
        <p className={styles.eyebrow}>Put it into practice</p>
        <h2 id={`${id}-title`}>{quiz.title}</h2>
        <p>Choose one answer for each question. Review the explanations after you submit.</p>
        </div>
        <span className={styles.questionCount}>{feedback ? `${feedback.items.filter(item=>item.correct).length}/${quiz.questions.length} correct` : `${quiz.questions.length} questions`}</span>
      </header>
      {!feedback && <progress className={styles.answerProgress} value={answered} max={quiz.questions.length} aria-label="Questions answered"/>}
      <form onSubmit={submit} aria-busy={pending}>
        <div className={styles.questions}>
          {quiz.questions.map((question, questionIndex) => {
            const item = feedback?.items.find((entry) => entry.questionId === question.id);
            return (
              <fieldset key={question.id} disabled={pending || Boolean(feedback)} className={styles.question} data-feedback={item ? item.correct ? "correct" : "review" : undefined}>
                <legend><span className={styles.number}>{questionIndex + 1}</span> {question.prompt}</legend>
                <div className={styles.options}>
                  {question.options.map((option, optionIndex) => (
                    <label key={option.id} className={styles.option} data-correct={item?.correctOptionId === option.id || undefined} data-review={item && answers[question.id] === option.id && !item.correct || undefined}>
                      <input
                        ref={questionIndex === 0 && optionIndex === 0 ? firstOption : undefined}
                        type="radio"
                        name={`${id}-${question.id}`}
                        value={option.id}
                        checked={answers[question.id] === option.id}
                        onChange={() => {
                          setAnswers((current) => ({ ...current, [question.id]: option.id }));
                          setError(false);
                        }}
                        required
                      />
                      <span>{option.text}</span>
                      {item?.correctOptionId === option.id && <span className={styles.optionMark} aria-label="Correct answer">✓</span>}
                    </label>
                  ))}
                </div>
                {item && (
                  <div className={styles.feedback}>
                    <strong>{item.correct ? "Correct" : "Review this answer"}</strong>
                    {!item.correct && <p>Correct answer: {question.options.find((option) => option.id === item.correctOptionId)?.text}</p>}
                    <p>{item.explanation}</p>
                  </div>
                )}
              </fieldset>
            );
          })}
        </div>
        <div className={styles.footer}>
          {!feedback && <p id={`${id}-progress`} role="status">{pending ? "Checking your answers…" : `${answered} of ${quiz.questions.length} answered`}</p>}
          {error && <p ref={errorMessage} tabIndex={-1} role="alert" className={styles.error}>We could not confirm your result. Your answers are still here. Try submitting again.</p>}
          {feedback ? (
            <div className={styles.result}>
              <h3 ref={resultHeading} tabIndex={-1}>{feedback.items.filter((item) => item.correct).length} of {quiz.questions.length} correct</h3>
              <p>Review the explanations above, then practise anything you want to revisit.</p>
              <button type="button" onClick={() => {
                setFeedback(null);
                setAnswers({});
                setError(false);
                // Restore focus after the disabled fieldsets are rendered as editable.
                requestAnimationFrame(() => firstOption.current?.focus());
              }}>Try again</button>
            </div>
          ) : (
            <button type="submit" disabled={!complete || pending} aria-describedby={`${id}-progress`}>
              {pending ? "Checking…" : error ? "Submit again" : "Check my answers"}
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
