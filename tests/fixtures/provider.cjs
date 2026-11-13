// Test process only: deterministic network boundary, never imported by application code.
const originalFetch=globalThis.fetch;
globalThis.fetch=async (input,init)=>{
 const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
 if(url==='https://api.openai.com/v1/responses') return new Response(JSON.stringify({output:[{type:'message',content:[{type:'output_text',text:'I noticed how a familiar street feels different in the rain. Which small detail would you remember?'}]}]}),{status:200,headers:{'Content-Type':'application/json'}});
 return originalFetch(input,init);
};
