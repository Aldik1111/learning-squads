/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI evaluates this function expression. */
async (page) => {
  const results=[];
  const assert=(condition,message)=>{if(!condition)throw new Error(message);};
  async function run(code, expected) {
    await page.getByRole('textbox',{name:'Your Python code'}).fill(code);
    await page.getByRole('button',{name:'Run checks',exact:true}).click();
    await page.getByRole('heading',{name:expected,exact:true}).waitFor({timeout:105000});
    return await page.locator('pre').allTextContents();
  }
  await page.reload();
  await run('def count_completed(habits):\n    print("checking")\n    return sum(habits)\n','All 6 checks passed');
  assert((await page.locator('pre').innerText()).split('\n').filter(Boolean).length===6,'Output must contain real newlines');
  results.push('Real Python, six correct cases, stdout PASS');
  await run('def count_completed(habits):\n    return len(habits)\n','3 of 6 checks passed');
  results.push('Wrong result distinguished PASS');
  await run('def count_completed(habits):\n    return True\n','0 of 6 checks passed');
  results.push('Boolean is not accepted as integer PASS');
  await run('def count_completed(habits):\n    total=sum(habits)\n    habits.clear()\n    return total\n','1 of 6 checks passed');
  assert(await page.getByText('The function changed its input.',{exact:true}).count()===5,'Input mutation feedback');
  results.push('Input mutation detected PASS');
  const error=await run('def count_completed(:\n    return 0\n','Python needs attention');
  assert(error.join('\n').includes('SyntaxError'),'SyntaxError must be visible');
  results.push('Syntax error distinguished PASS');
  const globalsError=await run('import js\njs.fetch("http://127.0.0.1:4181/runner-isolation-probe")\ndef count_completed(habits):\n    return sum(habits)\n','Python needs attention');
  assert(globalsError.join('\n').includes('AttributeError'),'Python JS bridge has no browser globals');
  results.push('Python JS bridge unavailable PASS');
  await page.getByRole('textbox',{name:'Your Python code'}).fill('while True:\n    pass\n');
  const workerPromise=page.waitForEvent('worker');
  await page.getByRole('button',{name:'Run checks',exact:true}).click();
  const worker=await workerPromise;
  const frame=page.frames().find(f=>f.url()==='about:srcdoc');
  assert(frame,'Sandbox frame must exist');
  assert(await page.locator('iframe').getAttribute('sandbox')==='allow-scripts','No allow-same-origin token');
  const checks=await frame.evaluate(async()=>{
    let parentBlocked=false,storageBlocked=false,networkBlocked=false;
    try{void parent.document.cookie;}catch{parentBlocked=true;}
    try{void localStorage.length;}catch{storageBlocked=true;}
    try{await fetch('http://127.0.0.1:4181/runner-isolation-probe',{credentials:'include'});}catch{networkBlocked=true;}
    return {origin:self.origin,parentBlocked,storageBlocked,networkBlocked};
  });
  assert(checks.origin==='null' && checks.parentBlocked && checks.storageBlocked && checks.networkBlocked,'Opaque frame isolation failed: '+JSON.stringify(checks));
  const workerChecks=await worker.evaluate(async()=>{
    let networkBlocked=false,storageBlocked=false;
    try{await fetch('http://127.0.0.1:4181/runner-isolation-probe',{credentials:'include'});}catch{networkBlocked=true;}
    try{indexedDB.open('isolation-probe');}catch{storageBlocked=true;}
    return {origin:self.origin,networkBlocked,storageBlocked,documentAbsent:typeof document==='undefined',localStorageAbsent:typeof localStorage==='undefined'};
  });
  assert(workerChecks.origin==='null' && workerChecks.networkBlocked && workerChecks.storageBlocked && workerChecks.documentAbsent && workerChecks.localStorageAbsent,'Worker isolation failed: '+JSON.stringify(workerChecks));
  results.push('Opaque frame/worker, parent DOM, storage, app network blocked PASS');
  await page.getByRole('button',{name:'Stop execution'}).click();
  await page.getByRole('heading',{name:'Execution stopped',exact:true}).waitFor();
  assert(await page.locator('iframe').count()===0,'Cancel must remove iframe');
  assert(await page.getByRole('textbox',{name:'Your Python code'}).inputValue()==='while True:\n    pass\n','Cancel must preserve code');
  results.push('Cancel and cleanup PASS');
  await run('while True:\n    pass\n','Execution timed out');
  assert(await page.locator('iframe').count()===0,'Timeout must remove iframe');
  results.push('Infinite loop watchdog PASS');
  await run('def count_completed(habits):\n    return sum(habits)\n','All 6 checks passed');
  results.push('Run after timeout PASS');
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Mobile overflow');
  await page.screenshot({path:'runner-mobile.png',fullPage:true});
  results.push('Mobile layout PASS');
  return results;
}
