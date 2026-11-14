/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI evaluates this function expression. */
async(page) => {
  await page.getByRole('textbox',{name:'Your Python code'}).fill('while True:\n    pass\n');
  const nextWorker=page.waitForEvent('worker');
  await page.getByRole('button',{name:'Run checks',exact:true}).click();
  await nextWorker;
  const frame=page.frames().find(f=>f.url()==='about:srcdoc');
  const result=await frame.evaluate(async()=>{
    const url=URL.createObjectURL(new Blob([`const request=new XMLHttpRequest();request.onload=()=>postMessage('UNEXPECTED_NETWORK_SUCCESS');request.onerror=()=>postMessage('native XHR blocked');request.open('GET','http://127.0.0.1:4181/runner-native-network-probe');request.withCredentials=true;try{request.send();}catch{postMessage('native XHR blocked');}`],{type:'text/javascript'}));
    const probe=new Worker(url);
    return await new Promise(resolve=>{probe.onmessage=e=>{probe.terminate();URL.revokeObjectURL(url);resolve(e.data);};probe.onerror=()=>{probe.terminate();URL.revokeObjectURL(url);resolve('PROBE_START_FAILED');};});
  });
  if(result!=='native XHR blocked')throw new Error(String(result));
  await page.getByRole('button',{name:'Stop execution'}).click();
  await page.getByRole('heading',{name:'Execution stopped',exact:true}).waitFor();
  return result;
}
