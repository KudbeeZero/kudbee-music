// Monotonic fuzzy alignment of known lyric lines to Whisper word timestamps.
// Returns per-line {start,end} aligned to the real vocal (nulls interpolated).
const norm = s => s.toLowerCase().replace(/[^a-z0-9']/g, '');
function sim(a, b){
  if(!a||!b) return 0;
  if(a===b) return 2;
  if(a.length>=3 && b.length>=3 && (a.slice(0,3)===b.slice(0,3))) return 1;
  return 0;
}
// lines: array of strings (in order). whisper: {words:[{w,start,end}]}
export function alignLines(lines, whisper){
  const myW = [];
  lines.forEach((ln, li) => ln.split(/\s+/).map(norm).filter(Boolean).forEach(tok => myW.push({ li, tok })));
  const wW = whisper.words.map(o => ({ tok: norm(o.w), start: o.start, end: o.end })).filter(o => o.tok);
  const M = myW.length, N = wW.length;
  const GAP = -0.1;
  const dp = Array.from({length:M+1}, () => new Float64Array(N+1));
  const bt = Array.from({length:M+1}, () => new Int8Array(N+1));
  for(let i=1;i<=M;i++){ dp[i][0]=dp[i-1][0]+GAP; bt[i][0]=1; }
  for(let j=1;j<=N;j++){ dp[0][j]=dp[0][j-1]+GAP; bt[0][j]=2; }
  for(let i=1;i<=M;i++) for(let j=1;j<=N;j++){
    const d = dp[i-1][j-1] + sim(myW[i-1].tok, wW[j-1].tok);
    const u = dp[i-1][j] + GAP;
    const l = dp[i][j-1] + GAP;
    let best=d, b=0; if(u>best){best=u;b=1;} if(l>best){best=l;b=2;}
    dp[i][j]=best; bt[i][j]=b;
  }
  const matchTime = new Array(M).fill(null);
  let i=M, j=N;
  while(i>0 && j>0){
    const b=bt[i][j];
    if(b===0){ if(sim(myW[i-1].tok, wW[j-1].tok)>0) matchTime[i-1]={start:wW[j-1].start,end:wW[j-1].end}; i--; j--; }
    else if(b===1) i--; else j--;
  }
  const raw = lines.map(()=>({start:null,end:null,anchored:false}));
  myW.forEach((mw, idx) => {
    const t = matchTime[idx]; if(!t) return;
    const r = raw[mw.li]; r.anchored=true;
    if(r.start===null || t.start<r.start) r.start=t.start;
    if(r.end===null   || t.end>r.end)     r.end=t.end;
  });
  let last=0;
  for(const r of raw){ if(r.start!==null){ if(r.start<last) r.start=last; last=r.start; } }
  for(let k=0;k<raw.length;k++){
    if(raw[k].start!==null) continue;
    let p=k-1; while(p>=0 && raw[p].start===null) p--;
    let n=k+1; while(n<raw.length && raw[n].start===null) n++;
    const ns = n<raw.length ? raw[n].start : ((p>=0?(raw[p].end ?? raw[p].start):0)+2);
    // leading lines Whisper missed: anchor back from the next known start (~2.6s/line)
    const ps = p>=0 ? (raw[p].end ?? raw[p].start) : Math.max(0, ns - (n - k) * 2.6);
    const gap=(ns-ps), steps=(n - p);
    raw[k].start = +(ps + gap*((k-p)/steps)).toFixed(2);
  }
  for(let k=0;k<raw.length;k++){
    const next = k+1<raw.length ? raw[k+1].start : (raw[k].end ?? raw[k].start)+2;
    let end = raw[k].end!==null ? Math.max(raw[k].end, raw[k].start+0.4) : next-0.05;
    end = Math.min(end, next-0.03);
    if(end<=raw[k].start) end = raw[k].start+0.4;
    raw[k].end = +end.toFixed(2);
    raw[k].start = +raw[k].start.toFixed(2);
  }
  return raw;
}
