import subprocess, os, re, json, glob, sys
from concurrent.futures import ThreadPoolExecutor
def sh(*a): return subprocess.run(a,capture_output=True,text=True)
def slug(n):
    return re.sub(r'[^a-z0-9]+','_',n.lower()).strip('_')
def game_of(n):
    n=n.lower()
    if 'hell' in n: return 'hell'
    if 'mguf' in n: return 'mguf'
    if 'peak' in n: return 'peak'
    if 'harbour' in n: return 'harbour'
    if 'core' in n: return 'base'
    return None
def enc(f):
    base=os.path.splitext(os.path.basename(f))[0]; key=slug(base); out=f'musenc/{key}.mp3'
    loop='loop' in base.lower(); boss='boss' in base.lower()
    dur=float(sh('ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f).stdout)
    pre='' if loop else 'silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.05,'
    # pasada 1: medir
    r=sh('ffmpeg','-hide_banner','-i',f,'-af',pre+'loudnorm=I=-19:TP=-1.5:LRA=11:print_format=json','-f','null','-')
    j=json.loads(re.search(r'\{[^{}]*"input_i"[^{}]*\}',r.stderr,re.S).group(0))
    ln=f"loudnorm=I=-19:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true"
    af=pre+ln+f",aresample=44100"
    if not loop:
        # fundido final de 1,5 s (el tema ya recortado ~dur)
        af+=f",afade=t=out:st={max(0,dur-2.5):.2f}:d=1.5"
    r=sh('ffmpeg','-y','-hide_banner','-i',f,'-af',af,'-ac','2','-c:a','libmp3lame','-b:a','64k','-joint_stereo','1',out)
    if r.returncode: return (key,'ERR',r.stderr[-300:])
    d2=float(sh('ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',out).stdout)
    return dict(file=key+'.mp3',name=base,game=game_of(base),boss=boss,loop=loop,dur=round(d2,1),kb=os.path.getsize(out)//1024,lufs_in=j['input_i'])
fs=sorted(glob.glob('song/*.mp3'))
with ThreadPoolExecutor(max_workers=4) as ex: res=list(ex.map(enc,fs))
json.dump(res,open('musenc/manifest.json','w'),ensure_ascii=False,indent=1)
tot=0
for r in res:
    print(r); tot+=r.get('kb',0) if isinstance(r,dict) else 0
print('TOTAL KB',tot)
