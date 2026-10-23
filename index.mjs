// Scoped StellarValue XDR parser. Does not authenticate consensus signatures.
const U64=(1n<<64n)-1n;
export function uint64(v){if(typeof v!=='string'||! /^(0|[1-9][0-9]*)$/.test(v)||BigInt(v)>U64)throw Error('Expected canonical uint64 decimal string');return BigInt(v)}
export function normalize(v){
 if(!v||!Number.isInteger(v.arm)||v.arm<0||v.arm>4)throw Error('Unknown StellarValue arm');
 const seconds=uint64(v.closeTime),hasMs=v.arm===3||v.arm===4;
 const ms=hasMs?uint64(v.closeTimeMs):seconds*1000n;
 if(hasMs&&ms/1000n!==seconds)throw Error('Seconds/milliseconds mismatch');
 return {arm:v.arm,closeTime:seconds.toString(),closeTimeMs:hasMs?ms.toString():null,effectiveMs:ms.toString(),precision:hasMs?'millisecond':'second',empty:v.arm===2||v.arm===4};
}
export function decodeStellarValue(base64){
 if(typeof base64!=='string'||base64.length>4096||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))throw Error('Invalid bounded base64');
 const b=Buffer.from(base64,'base64');let o=0;
 const take=n=>{if(o+n>b.length)throw Error('Truncated XDR');const s=b.subarray(o,o+n);o+=n;return s};
 const u32=()=>take(4).readUInt32BE(),u64=()=>take(8).readBigUInt64BE().toString();
 const opaque=max=>{const n=u32();if(n>max)throw Error('Oversized opaque');const v=take(n),pad=take((4-n%4)%4);if(pad.some(x=>x!==0))throw Error('Nonzero XDR padding');return v};
 const hash=take(32).toString('hex'),closeTime=u64(),n=u32();if(n>6)throw Error('Too many upgrades');
 for(let i=0;i<n;i++)opaque(128);
 const arm=u32();if(arm>4)throw Error('Unknown StellarValue arm');
 let closeTimeMs;if(arm===3||arm===4)closeTimeMs=u64();
 if(arm===2||arm===4){take(32);take(32);u32()}
 if(arm!==0){if(u32()!==0)throw Error('Unsupported NodeID');take(32);opaque(64)}
 if(o!==b.length)throw Error('Trailing XDR bytes');
 return {...normalize({arm,closeTime,closeTimeMs}),txSetHash:hash,signatureVerified:false};
}
export function timeBounds(value,minTime='0',maxTime='0'){
 const t=uint64(value.closeTime),min=uint64(minTime),max=uint64(maxTime);
 if(max!==0n&&max<min)throw Error('Inverted time bounds');
 return t>=min&&(max===0n||t<=max);
}
