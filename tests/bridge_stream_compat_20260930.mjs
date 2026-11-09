import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Reuse the frozen VM/HTTP harness without changing its original twelve cases.
let harness=readFileSync(new URL('./bridge_stream_fixture_20260930.mjs',import.meta.url),'utf8');
const cases=String.raw`const unicodeDelta=sse({type:'content_block_delta',index:0,delta:{type:'text_delta',text:'答复😀'}});
const ping=sse({type:'ping'});
const unknown=sse({type:'future_extension',payload:'ignored'});
const complete=start+delta+finish+stop;
const cases=[
 {name:'ping_and_unknown_compatibility',events:[ping,unknown,start,delta,finish,stop,ping,unknown],expect:'completed',text:'fixture answer',reason:'end_turn',usage:{input_tokens:3,output_tokens:2}},
 {name:'multibyte_utf8_single_bytes',events:Array.from(Buffer.from(start+unicodeDelta+finish+stop),b=>Buffer.from([b])),expect:'completed',text:'答复😀',reason:'end_turn'},
 {name:'crlf_event_delimiters',events:[complete.replace(/\n/g,'\r\n')],expect:'completed',text:'fixture answer',reason:'end_turn'},
 {name:'truncated_one_byte_chunks',events:Array.from(Buffer.from(start+delta+finish),b=>Buffer.from([b])),expect:'error',text:''},
 {name:'error_one_byte_chunks',events:Array.from(Buffer.from(start+delta+error),b=>Buffer.from([b])),expect:'error',text:''},
 {name:'terminal_without_stop_reason',events:[start,delta,stop],expect:'error',text:''},
];
`;
const start=harness.indexOf('const cases=[');
const end=harness.indexOf('const results=[];',start);
if(start<0||end<0)throw new Error('FROZEN_HARNESS_SHAPE_CHANGED');
harness=harness.slice(0,start)+cases+harness.slice(end);
const old='pass:body.status===test.expect';
if(harness.split(old).length!==2)throw new Error('FROZEN_ORACLE_SHAPE_CHANGED');
harness=harness.replace(old,"pass:body.status===test.expect && (test.text===undefined || body.output_text===test.text) && (test.reason===undefined || body.stop_reason===test.reason) && (test.usage===undefined || (body.usage?.input_tokens===test.usage.input_tokens && body.usage?.output_tokens===test.usage.output_tokens))");
const result=spawnSync(process.execPath,['--input-type=module','-',...process.argv.slice(2)],{
  input:harness,encoding:'utf8',timeout:15000,
});
process.stdout.write(result.stdout||'');
process.stderr.write(result.stderr||'');
process.exitCode=result.status??2;
