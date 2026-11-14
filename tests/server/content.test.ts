import test from "node:test";
import assert from "node:assert/strict";
import {courses,learningModule} from "../../src/features/learning/server/content";
import {HttpError,uuid} from "../../src/lib/api-server";
test("public lesson serialization excludes keys and reference implementation",async()=>{
  const catalog=await courses();assert.equal(catalog.length,6);
  assert.ok(catalog.every(course=>course.modules.length===3));
  for(const course of catalog) for(const entry of course.modules){
    const lesson=await learningModule(entry.id);assert.ok(lesson);
    assert.equal(lesson.courseId,course.id);assert.equal(lesson.task?.moduleId,entry.id);
    assert.equal(lesson.task?.contentVersion,entry.contentVersion);
    assert.equal(lesson.task?.courseId,course.id);assert.equal(lesson.task?.version,1);
    assert.ok(lesson.task?.acceptanceCriteria.length);
    const serialized=JSON.stringify(lesson);
    for(const secret of ['correctOptionId','answerKey','referenceFile','reference.py'])assert.ok(!serialized.includes(secret),`${entry.id} exposed ${secret}`);
    assert.equal(lesson.quiz.length,4);assert.ok(lesson.lessonMarkdown.length>100);
  }
  assert.equal(await learningModule("../../.env.local"),null);
});
test("Python learner payload contains public cases and unfinished starter",async()=>{
  const lesson=await learningModule("python-first-function");assert.ok(lesson?.exercise);
  assert.equal(lesson.exercise.cases.length,6);assert.match(lesson.exercise.starterCode,/pass/);
  assert.equal(lesson.exercise.exerciseVersion,1);
});
test("API rejects malformed UUID identities before RPC",()=>{
  assert.throws(()=>uuid("other-user"),HttpError);
  assert.equal(uuid("10000000-0000-4000-8000-000000000001"),"10000000-0000-4000-8000-000000000001");
});
