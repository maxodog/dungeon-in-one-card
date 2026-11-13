import subprocess, os, re, json, base64, glob
src='ex'; out='enc'
def sh(*a): return subprocess.run(a,capture_output=True,text=True)
def vol(f):
    r=sh('ffmpeg','-hide_banner','-i',f,'-af','volumedetect','-f','null','-')
    m=re.search(r'mean_volume: (-?[\d.]+) dB',r.stderr); x=re.search(r'max_volume: (-?[\d.]+) dB',r.stderr)
    return float(m.group(1)), float(x.group(1))
keys={}
for f in sorted(glob.glob(src+'/*.mp3')):
    base=os.path.basename(f)[:-4]
    key=re.sub(r'[^a-z0-9]+','_',base.lower()).strip('_')
    trim='silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse'
    sh('ffmpeg','-y','-hide_banner','-i',f,'-af',trim,'-ac','1','-ar','32000','/tmp/snd/tmp.wav')
    mean,mx=vol('/tmp/snd/tmp.wav')
    # recorte de silencios y normalización: media objetivo -20 dB, sin pasar de -1 dB de pico
    gain=max(-12,min(12,min(-20-mean,-1.5-mx)))
    af=trim+f",volume={gain:.1f}dB"
    o=f'{out}/{key}.mp3'
    r=sh('ffmpeg','-y','-hide_banner','-i',f,'-af',af,'-ac','1','-ar','32000','-c:a','libmp3lame','-b:a','56k',o)
    if r.returncode: print('ERR',f,r.stderr[-300:]); continue
    d=sh('ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',o).stdout.strip()
    keys[key]=(round(float(d),2),os.path.getsize(o),round(gain,1),round(mean,1),round(mx,1))
tot=0
for k,v in keys.items(): print(k,v); tot+=v[1]
print('total bytes',tot)
