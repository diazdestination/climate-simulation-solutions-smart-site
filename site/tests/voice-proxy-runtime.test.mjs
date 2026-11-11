import assert from 'node:assert/strict';
import test from 'node:test';
import {handleVoiceSessionRequest,handleVoiceFileRequest} from '../core/worker/voice-proxy.js';
import {createElevenLabsFetch} from '../worker/elevenlabs-fetch.js';

const env={ELEVENLABS_API_KEY:'synthetic-key',ELEVENLABS_AGENT_ID:'synthetic-agent',ELEVENLABS_VOICE_PUBLIC:'true'};
const config={voice:{public:true,modes:{text:true,voice:false},fileUploads:true}};

test('signed text sessions use Workers-compatible redirects and accept a valid provider response',async()=>{
 let calls=0;
 const response=await handleVoiceSessionRequest(new Request('https://example.test/api/elevenlabs/session'),env,config,createElevenLabsFetch(async(url,init)=>{
  assert.equal(init.redirect,'manual');
  assert.equal(new URL(url).searchParams.get('agent_id'),'synthetic-agent');
  calls++;return Response.json({signed_url:'wss://api.elevenlabs.io/synthetic-session'});
 }));
 assert.equal(response.status,200);assert.equal((await response.json()).ready,true);assert.equal(calls,1);
});

test('provider redirects are rejected without following them or forwarding credentials',async()=>{
 let calls=0;
 const response=await handleVoiceSessionRequest(new Request('https://example.test/api/elevenlabs/session'),env,config,createElevenLabsFetch(async(_url,init)=>{
  assert.equal(init.redirect,'manual');calls++;return new Response(null,{status:302,headers:{location:'https://untrusted.example.test/'}});
 }));
 assert.equal(response.status,502);assert.equal((await response.json()).code,'voice_session_unavailable');assert.equal(calls,1);
});

test('CSS voice tokens remain unavailable',async()=>{
 const response=await handleVoiceSessionRequest(new Request('https://example.test/api/elevenlabs/token'),env,config,async()=>{throw new Error('Provider must not be called');});
 assert.equal(response.status,404);assert.equal((await response.json()).code,'voice_mode_disabled');
});

test('evidence uploads use manual redirects and reject a redirect response',async()=>{
 const form=new FormData();form.append('file',new File(['%PDF-1.7\nsynthetic test'],'setup-test.pdf',{type:'application/pdf'}));
 const request=new Request('https://example.test/api/elevenlabs/files?conversation_id=synthetic_conversation',{method:'POST',body:form});
 const response=await handleVoiceFileRequest(request,env,config,createElevenLabsFetch(async(_url,init)=>{
  assert.equal(init.redirect,'manual');return new Response(null,{status:307,headers:{location:'https://untrusted.example.test/'}});
 }));
 assert.equal(response.status,502);assert.equal((await response.json()).code,'file_upload_unavailable');
});

test('the compatibility boundary leaves unrelated requests unchanged',async()=>{
 const init={redirect:'error',headers:{'x-example':'value'}};
 await createElevenLabsFetch(async(_input,actual)=>{assert.equal(actual,init);return new Response();})('https://example.test/v1/convai/conversation',init);
});
