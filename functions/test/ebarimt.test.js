// ebarimt лавлагааны тест (сүлжээгүй): оролт хэвийн болгох, хариу задлах, кэш/алдааны урсгал
const assert=require('assert');
const eb=require('../ebarimt');
// 1) оролт
assert.deepStrictEqual(eb.normalizeInput({reg:' аа 1234-5678 '}),{reg:'АА12345678',tin:''});
assert.deepStrictEqual(eb.normalizeInput({reg:'ab12345678',tin:' 12 345 678 '}),{reg:'AB12345678',tin:'12345678'});
assert.deepStrictEqual(eb.normalizeInput({tin:'ТТД:12345678'}),{reg:'',tin:'12345678'});
assert.deepStrictEqual(eb.normalizeInput(null),{reg:'',tin:''});
assert.deepStrictEqual(eb.normalizeInput({reg:6183689}),{reg:'6183689',tin:''});
// 2) getInfo хариу — янз бүрийн бүтэц
let r=eb.mapInfo({name:'Бизнес Би Ай ХХК',vatPayer:true,found:true});
assert.deepStrictEqual(r,{name:'Бизнес Би Ай ХХК',vatPayer:true,found:true});
r=eb.mapInfo({data:{name:'Тест ХХК',vatPayer:'false',found:'true'}});
assert.deepStrictEqual(r,{name:'Тест ХХК',vatPayer:false,found:true});
r=eb.mapInfo({status:'SUCCESS',data:{found:false,name:null,vatPayer:null}});
assert.deepStrictEqual(r,{name:'',vatPayer:false,found:false});
r=eb.mapInfo({result:{companyName:'Жишээ ХК',isVatPayer:1}});   // found талбаргүй → нэр байвал олдсон
assert.deepStrictEqual(r,{name:'Жишээ ХК',vatPayer:true,found:true});
assert.deepStrictEqual(eb.mapInfo(null),{name:'',vatPayer:false,found:false});
assert.deepStrictEqual(eb.mapInfo('<html>err'),{name:'',vatPayer:false,found:false});
// 3) getTinInfo хариу
assert.strictEqual(eb.mapTin({data:'37900012345'}),'37900012345');
assert.strictEqual(eb.mapTin({tin:37900012345}),'37900012345');
assert.strictEqual(eb.mapTin({status:'SUCCESS',data:{tin:'123'}}),'123');
assert.strictEqual(eb.mapTin('"456"'),'456');
assert.strictEqual(eb.mapTin({data:null}),'');
assert.strictEqual(eb.mapTin({}),'');
// 4) lookup — хуурамч Firestore + хуурамч fetch
function fakeDb(store){
  return {collection(){return {doc(id){return {
    async get(){return {exists:id in store,data:()=>store[id]};},
    async set(v){store[id]=v;}};}};}};
}
const calls=[];
global.fetch=async(url)=>{
  calls.push(url);
  if(/getTinInfo\?regNo=6183689$/.test(url))return {ok:true,text:async()=>JSON.stringify({data:'37900012345'})};
  if(/getTinInfo/.test(url))return {ok:true,text:async()=>JSON.stringify({data:null})};
  if(/getInfo\?tin=37900012345$/.test(url))return {ok:true,text:async()=>JSON.stringify({name:'Бизнес Би Ай ХХК',vatPayer:true,found:true})};
  if(/getInfo\?tin=99$/.test(url))throw new Error('ECONNRESET');
  return {ok:true,text:async()=>JSON.stringify({found:false})};
};
(async()=>{
  const store={};const db=fakeDb(store);
  // хоосон оролт → invalid-argument
  await assert.rejects(eb.lookup(db,{}),e=>e.code==='invalid-argument');
  // РД → ТТД → мэдээлэл; кэшлэгдэнэ
  let out=await eb.lookup(db,{reg:'6183689'});
  assert.deepStrictEqual([out.tin,out.name,out.vatPayer,out.found,out.cachedAt],['37900012345','Бизнес Би Ай ХХК',true,true,null]);
  assert.ok(store['reg_6183689'].tin==='37900012345' && store['37900012345'].fetchedAt>0,'cached');
  assert.strictEqual(calls.length,2);
  // дахин асуухад сүлжээ дуудахгүй (кэш)
  out=await eb.lookup(db,{reg:'6183689'});
  assert.strictEqual(calls.length,2);assert.ok(out.cachedAt>0,'served from cache');
  // ТТД-ээр шууд → кэшээс
  out=await eb.lookup(db,{tin:'37900012345'});
  assert.strictEqual(calls.length,2);assert.strictEqual(out.name,'Бизнес Би Ай ХХК');
  // 30 хоногоос хуучирсан кэш → дахин татна
  store['37900012345'].fetchedAt=Date.now()-eb.TTL_MS-1000;
  out=await eb.lookup(db,{tin:'37900012345'});
  assert.strictEqual(calls.length,3);assert.strictEqual(out.found,true);
  // олдоогүй РД → found:false, кэшлэхгүй
  out=await eb.lookup(db,{reg:'АА00000000'});
  assert.deepStrictEqual([out.found,out.name,out.tin],[false,'','']);assert.ok(!store['reg_АА00000000']);
  // цифрэн РД-г getTinInfo олоогүй бол ТТД гэж үзнэ
  out=await eb.lookup(db,{reg:'12345'});
  assert.ok(calls.some(u=>/getInfo\?tin=12345$/.test(u)),'digit reg retried as tin');
  assert.strictEqual(out.found,false);assert.ok(!store['12345'],'not-found not cached');
  // upstream алдаа → throw хийхгүй, error:'upstream'
  out=await eb.lookup(db,{tin:'99'});
  assert.deepStrictEqual([out.found,out.error],[false,'upstream']);
  console.log('ebarimt.test.js: ALL OK');
})().catch(e=>{console.error(e);process.exit(1);});
