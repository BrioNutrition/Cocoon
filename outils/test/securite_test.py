import subprocess
A='11111111-1111-1111-1111-111111111111'; E='22222222-2222-2222-2222-222222222222'; F="'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'"
def q(who, sql):
    em='angel@x' if who==A else 'emma@x'
    full=f"set role authenticated; set request.jwt.claim.sub='{who}'; set request.jwt.claims='{{\"email\":\"{em}\"}}'; {sql}"
    r=subprocess.run(['psql','-h','/tmp/pgt','-p','5499','-U','postgres','-q','-d','t','-tA','-c',full],capture_output=True,text=True)
    err=[l for l in r.stderr.splitlines() if 'ERROR' in l]
    return ('REFUSÉ · '+err[0].split('ERROR:')[1].strip()) if err else ('accepté '+r.stdout.strip().replace('\n',' '))
subprocess.run(['psql','-h','/tmp/pgt','-p','5499','-U','postgres','-q','-d','t','-c',
  f"grant all on all tables in schema public to authenticated; delete from cocoon_docs; insert into cocoon_members(foyer,user_id,role) values ({F},'{E}','membre') on conflict do nothing;"])
tests=[
 (A,f"insert into cocoon_docs(foyer,path,id,data) values ({F},'membres','angel','{{\"nom\":\"Angel\",\"uid\":\"{A}\",\"role\":\"admin\"}}')","Angel crée son profil admin"),
 (A,f"insert into cocoon_docs(foyer,path,id,data) values ({F},'membres','leo','{{\"nom\":\"Léo\",\"type\":\"enfant\"}}')","Angel crée le profil de Léo (sans compte)"),
 (A,f"insert into cocoon_docs(foyer,path,id,data) values ({F},'membres','emma','{{\"nom\":\"Emma\",\"role\":\"membre\",\"email\":\"Emma@x\"}}')","Angel crée l'invitation d'Emma"),
 (E,f"update cocoon_docs set data=data||'{{\"uid\":\"{E}\"}}' where path='membres' and id='emma'","Emma réclame son profil"),
 (E,"update cocoon_docs set data=data||'{\"nom\":\"Pirate\"}' where path='membres' and id='angel'","Emma modifie le profil d'Angel"),
 (E,"update cocoon_docs set data=data||'{\"role\":\"admin\"}' where path='membres' and id='emma'","Emma se nomme admin"),
 (E,f"select cocoon_merge({F},'membres','emma','{{\"role\":\"admin\"}}')","Emma se nomme admin (autre chemin)"),
 (E,"update cocoon_docs set data=data||'{\"bio\":\"Coucou\"}' where path='membres' and id='emma'","Emma modifie SON profil"),
 (E,f"update cocoon_docs set data=data||'{{\"uid\":\"{E}\"}}' where path='membres' and id='leo'","Emma s'approprie le profil de Léo"),
 (E,f"insert into cocoon_docs(foyer,path,id,data) values ({F},'membres','faux','{{\"nom\":\"X\",\"uid\":\"{A}\"}}')","Emma crée un profil au nom du compte d'Angel"),
 (E,"delete from cocoon_docs where path='membres' and id='angel'","Emma supprime le profil d'Angel"),
 (E,"delete from cocoon_docs where path='membres' and id='leo'","Emma (pas admin) supprime le profil de Léo"),
 (A,f"insert into cocoon_docs(foyer,path,id,data) values ({F},'membres','zoe','{{\"nom\":\"Zoé\",\"email\":\"zoe@x\",\"invite\":true}}')","Angel invite Zoé (zoe@x)"),
 (E,f"update cocoon_docs set data=data||'{{\"uid\":\"{E}\"}}' where path='membres' and id='zoe'","Emma réclame l'invitation de Zoé"),
 (A,"update cocoon_docs set data=data||'{\"nom\":\"Emmanuelle\"}' where path='membres' and id='emma'","Angel (créateur) modifie le profil d'Emma"),
 (A,"update cocoon_docs set data=data||'{\"nom\":\"Léonard\"}' where path='membres' and id='leo'","Angel modifie le profil de Léo"),
 (E,f"insert into cocoon_docs(foyer,path,id,data,updated_by) values ({F},'taches','t1','{{\"titre\":\"x\"}}','{A}'); select updated_by from cocoon_docs where id='t1'","Emma signe une tâche au nom d'Angel (signature forcée ?)"),
 (E,f"select cocoon_remove_member({F},'{A}')","Emma retire Angel du foyer"),
 (A,f"select cocoon_remove_member({F},'{A}')","Angel se retire lui-même"),
 (A,"delete from cocoon_docs where path='membres' and id='emma'","Angel (créateur) supprime le profil d'Emma"),
 (A,f"select cocoon_remove_member({F},'{E}'); select count(*) from cocoon_members where user_id='{E}'","Angel retire Emma du foyer (membres restants pour Emma)"),
 (E,"select count(*) from cocoon_docs","Emma, retirée, voit encore des données ?"),
]
for who,sql,label in tests: print(f"{label:58s} → {q(who,sql)}")
