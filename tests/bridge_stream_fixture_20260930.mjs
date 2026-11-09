import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';
import vm from 'node:vm';

const sourcePath = process.argv[2] || 'client/server_sglang_anthropic.mjs';
const source = readFileSync(sourcePath, 'utf8');
const sha256 = createHash('sha256').update(source).digest('hex');
if (!process.argv[2]) assert.equal(sha256,'426d3d2d93f3a8888b5a35916068d70602d23fe6d395a9f210aed25ed4affe3b');
let chunks = [];
let statusCode = 200;
let requests = 0;
const chain = new Proxy({}, {get:()=>()=>chain});
const z = {string:()=>chain,number:()=>chain,boolean:()=>chain};
class MockServer {
  constructor(){this.handlers={};}
  registerTool(name,schema,handler){this.handlers[name]=handler;}
  async connect(){}
}
const transport = {
  request(){
    requests++;
    const request=new EventEmitter();
    request.write=()=>{};
    request.destroy=(error)=>request.emit('error',error);
    request.end=()=>queueMicrotask(()=>request.emit('response',{
      statusCode,statusMessage:'synthetic',
      async *[Symbol.asyncIterator](){for(const chunk of chunks)yield Buffer.from(chunk);},
    }));
    return request;
  },
};
const importsRemoved = source.replace(/^#![^\n]*\n/,'').replace(/^import .*;\r?\n/gm,'');
const server=await vm.runInNewContext(`(async()=>{${importsRemoved}\nreturn server;})()`,{
  McpServer:MockServer,StdioServerTransport:class{},http:transport,https:transport,z,
  readFileSync:()=>{throw new Error('NO_CREDENTIAL_FILE_ACCESS_ALLOWED');},
  process:{env:{GLM52_API_KEY:'synthetic_offline_fixture_only',GLM52_MCP_TIMEOUT_MS:'1000'}},
  Buffer,URL,TextDecoder,setTimeout,clearTimeout,
});
const sse=(event)=>`data: ${JSON.stringify(event)}\n\n`;
const start=sse({type:'message_start',message:{id:'synthetic-1',usage:{input_tokens:3}}});
const delta=sse({type:'content_block_delta',index:0,delta:{type:'text_delta',text:'fixture answer'}});
const finish=sse({type:'message_delta',delta:{stop_reason:'end_turn'},usage:{output_tokens:2}});
const stop=sse({type:'message_stop'});
const error=sse({type:'error',error:{type:'overloaded_error',message:'synthetic overload'}});
const cases=[
  {name:'complete_success',events:[start,delta,finish,stop],expect:'completed'},
  {name:'truncated_after_text',events:[start,delta,finish],expect:'error'},
  {name:'upstream_error_before_start',events:[error],expect:'error'},
  {name:'upstream_error_after_text',events:[start,delta,error],expect:'error'},
  {name:'empty_http_200',events:[],expect:'error'},
  {name:'start_only_eof',events:[start],expect:'error'},
  {name:'stop_without_start',events:[stop],expect:'error'},
  {name:'duplicate_start',events:[start,start,delta,finish,stop],expect:'error'},
  {name:'data_after_terminal',events:[start,delta,finish,stop,delta],expect:'error'},
  {name:'malformed_json',events:['data: {broken}\n\n'],expect:'error'},
  {name:'complete_success_byte_chunks',events:Buffer.from(start+delta+finish+stop).toString().split(''),expect:'completed'},
  {name:'http_503',events:['synthetic unavailable'],status:503,expect:'error'},
];
const results=[];
for(const test of cases){
  chunks=test.events;statusCode=test.status||200;
  const before=requests;
  const result=await server.handlers.glm52_ask({prompt:'synthetic',max_output_tokens:32,temperature:0,thinking:false,stream:true});
  const body=JSON.parse(result.content[0].text);
  assert.equal(requests-before,1,'NO_AUTOMATIC_RETRY');
  if(body.status==='error')assert.equal(result.isError,true);
  results.push({name:test.name,expected:test.expect,observed:body.status,
                partial_text_returned:body.output_text==='fixture answer',pass:body.status===test.expect});
}
const receipt={sourcePath,source_sha256:sha256,scope:'EXACT_SOURCE_HANDLER_WITH_SYNTHETIC_HTTP_BOUNDARY_NO_NETWORK_NO_MODEL_NO_REAL_SDK',
               tests:results.length,passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results};
if(process.argv[3])writeFileSync(process.argv[3],JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(receipt,null,2));
if(process.argv[2]&&receipt.failed)process.exitCode=2;
