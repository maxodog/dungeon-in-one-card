import base64, hashlib, glob, os, json
files=sorted(glob.glob('enc/*.mp3'))
seen={}; clips={}; alias={}
for f in files:
    k=os.path.basename(f)[:-4]; b=open(f,'rb').read(); h=hashlib.md5(b).hexdigest()
    if h in seen: alias[k]=seen[h]; continue
    seen[h]=k; clips[k]=base64.b64encode(b).decode()
def R(k): return alias.get(k,k)
pools={
 'atk':['attack_monster_%d'%i for i in range(1,7)],
 'blk':['block','block_2','block_3'],
 'hurtM':['male_hero_hurt','male_hero_hurt_2','male_hero_hurt_3','male_hero_hurt_4','male_hero_hurt_5'],
 'hurtF':['female_hero_hurt','female_hero_hurt_2','female_hero_hurt_3','female_hero_hurt_4'],
 'hurtN':['male_or_female_hero_hurt','male_or_female_hero_hurt_2','male_or_female_hero_hurt_3'],
 'dieM':['male_hero_dies','male_hero_dies_2','male_hero_dies_3'],
 'dieF':['female_hero_dies','female_hero_dies_2','female_hero_dies_3'],
 'killS':['kill_small_monster_1','kill_monster_1','kill_monster_2'],
 'killB':['kill_big_monster_1','kill_monster_2'],
 'killD':['kill_demon_monster'],
 'killJ':['kill_monster_boss'],
 'chest':['chest'],
 'floor':['next_floor'],
 'win':['dungeon_completed','dungeon_completed_2'],
 'died':['you_died'],
 'lvl':['level_up'],
}
pools={p:sorted(set(R(k) for k in ks),key=lambda k:ks.index(k) if k in ks else 99) for p,ks in pools.items()}
js="/* Sonidos aportados por el autor del proyecto, recomprimidos (mono, mp3). */\nconst SND_CLIPS = "+json.dumps(clips,separators=(',',':'))+";\nconst SND_POOLS = "+json.dumps(pools,separators=(',',':'))+";\n"
open('/home/claude/dioc/sounds.js','w').write(js)
print(len(js), len(clips),'clips únicos; alias',alias)
