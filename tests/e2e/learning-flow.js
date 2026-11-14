// Playwright CLI run-code snippet; begin on the Python lesson with a fresh guest.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async (page) => {
  const assert = (condition,message)=>{if(!condition)throw new Error(message);};
  for (const name of ['Gives total back to the caller and ends this function call','2','0','Returning on the first iteration would skip the remaining items']) await page.getByRole('radio',{name,exact:true}).check();
  await page.getByRole('button',{name:'Check my answers',exact:true}).click();
  await page.getByRole('heading',{name:'4 of 4 correct',exact:true}).waitFor();
  await page.getByText(/^Saved result: 4\/4 correct/).waitFor();
  await page.reload();
  await page.getByRole('heading',{name:'4 of 4 correct',exact:true}).waitFor();
  assert(await page.getByRole('radio',{checked:true}).count()===4,'Restore answers after refresh');
  assert(!(await page.getByRole('heading',{name:'4 of 4 correct',exact:true}).evaluate(el=>el===document.activeElement)),'Restored result must not steal focus');
  await page.getByRole('textbox',{name:'Your Python code'}).fill('def count_completed(habits):\n    return sum(habits)');
  await page.getByRole('button',{name:'Run checks',exact:true}).click();
  await page.getByRole('heading',{name:'All 6 checks passed',exact:true}).waitFor({timeout:120000});
  await page.getByText(/^Saved Python self-check: 6\/6/).waitFor();
  await page.reload();
  await page.getByText(/^Saved Python self-check: 6\/6/).waitFor();
  await page.getByRole('heading',{name:'4 of 4 correct',exact:true}).waitFor();
  await page.getByRole('link',{name:'All learning paths',exact:false}).click();
  await page.getByText(/Python self-checks saved: 1/).waitFor();
  await page.getByText(/4\/4 correct/).waitFor();
  return ['Real quiz graded/persisted PASS','Refresh restores answers and feedback without focus jump PASS','Real Python execution6/6 and save PASS','Python self-check survives refresh PASS','Dashboard saved progress PASS'];
}
