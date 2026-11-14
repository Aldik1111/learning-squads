// Playwright CLI run-code snippet. Use an isolated QA guest on the real app.
// Writes only that guest's first Python task; no external result URL is opened.
// Group sharing/rematching needs a second current teammate; see task-board.md.
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
async (page) => {
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const base = new URL(page.url()).origin;
  const title = 'Explain your completed-habit counter';
  const card = target => target.getByRole('article').filter({has:target.getByRole('heading',{name:title,exact:true})});
  const editor = target => target.getByRole('dialog',{name:title,exact:true});
  const open = async target => {await card(target).getByRole('button',{name:'Edit task',exact:true}).click();await editor(target).waitFor();};
  const save = async target => {await editor(target).getByRole('button',{name:'Save task',exact:true}).click();await editor(target).waitFor({state:'hidden'});};
  await page.goto(base+'/tasks?course=python',{waitUntil:'domcontentloaded',timeout:60000});
  await card(page).waitFor();
  await open(page);
  await editor(page).getByRole('combobox',{name:'Task status',exact:true}).selectOption('done');
  await editor(page).getByRole('textbox',{name:/^Your result/}).fill('   ');
  await editor(page).getByRole('button',{name:'Save task',exact:true}).click();
  await editor(page).getByText('Describe what you made before marking the task Done.',{exact:true}).waitFor();
  await editor(page).getByRole('textbox',{name:/^Your result/}).fill('QA private result: empty input returns zero; mixed values count only true.');
  await editor(page).getByRole('textbox',{name:/^Result link/}).fill('http://example.com/qa-task');
  await editor(page).getByRole('button',{name:'Save task',exact:true}).click();
  await editor(page).getByText(/Use a full HTTPS link without a username or password/).waitFor();
  await editor(page).getByRole('textbox',{name:/^Result link/}).fill('https://example.com/qa-task');
  const share = editor(page).getByRole('checkbox');
  if(await share.count())await share.uncheck();
  await save(page);
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});
  await card(page).getByText('Only you',{exact:true}).waitFor();
  assert(await page.getByRole('region',{name:'Done',exact:true}).getByRole('heading',{name:title,exact:true}).count()===1,'Done persists in its column');
  assert(await card(page).getByRole('link',{name:'Open result link ↗',exact:true}).getAttribute('href')==='https://example.com/qa-task','Saved HTTPS result link');
  await open(page);
  await editor(page).getByRole('textbox',{name:/^Your result/}).fill('QA unsaved draft in the first tab.');
  const second = await page.context().newPage();
  try {
    await second.goto(base+'/tasks?course=python',{waitUntil:'domcontentloaded',timeout:60000});
    await open(second);
    await editor(second).getByRole('textbox',{name:/^Your result/}).fill('QA newer version saved in the second tab.');
    await save(second);
    await editor(page).getByRole('button',{name:'Save task',exact:true}).click();
    await editor(page).getByText('This task or your course group changed.',{exact:true}).waitFor();
    assert(await editor(page).getByRole('textbox',{name:/^Your result/}).inputValue()==='QA unsaved draft in the first tab.','Conflict preserves the draft');
    assert(await editor(page).getByRole('button',{name:'Save task',exact:true}).isDisabled(),'Conflict blocks silent overwrite');
    await editor(page).getByRole('button',{name:'Load latest and discard this draft',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('dialog textarea')?.value==='QA newer version saved in the second tab.');
    await editor(page).getByRole('button',{name:'Cancel',exact:true}).click();
  } finally {await second.close();}
  const viewport = page.viewportSize();
  try {
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Board has no mobile overflow');
    await open(page);
    assert(await editor(page).evaluate(el=>el.scrollWidth<=el.clientWidth),'Editor has no horizontal overflow');
    await page.keyboard.press('Escape');
  } finally {if(viewport)await page.setViewportSize(viewport);}
  return ['Done description and HTTPS validation PASS','Private result and status survive reload PASS','Concurrent edit conflict preserves draft PASS','Explicit reload restores newer version PASS','Mobile board/editor and Escape PASS'];
}
