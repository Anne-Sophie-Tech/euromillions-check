#!/usr/bin/env python3
"""Build the EuroMillions history used by the PWA from official FDJ archives."""
import csv, io, json, re, zipfile
from datetime import datetime
from urllib.request import Request, urlopen

PAGE='https://www.fdj.fr/jeux-de-tirage/euromillions-my-million/historique'
HEAD={'User-Agent':'Mozilla/5.0'}
html=urlopen(Request(PAGE,headers=HEAD),timeout=30).read().decode('utf-8','ignore')
urls=re.findall(r'https://www\.sto\.api\.fdj\.fr/anonymous/service-draw-info/v3/documentations/[^"\\<> ]+',html)
urls=list(dict.fromkeys(urls))
if len(urls)<6: raise RuntimeError(f'Archives FDJ EuroMillions introuvables ou incomplètes: {len(urls)}')
urls=urls[:6]

def norm(v):
    v=v.strip()
    for fmt in ('%d/%m/%Y','%Y-%m-%d','%d-%m-%Y','%d/%m/%y'):
        try:return datetime.strptime(v,fmt).strftime('%d/%m/%Y')
        except ValueError:pass
    return None

def clean_header(v):
    v=v.lower().replace('é','e').replace('è','e').replace('ê','e').replace('à','a').replace('ô','o')
    return re.sub(r'[^a-z0-9]','',v)

def decode_csv(raw):
    for encoding in ('utf-8-sig','cp1252','latin-1'):
        try:return raw.decode(encoding)
        except UnicodeDecodeError:pass
    return raw.decode('utf-8','ignore')

def parse_csv(text):
    sample=text[:4096]
    try: dialect=csv.Sniffer().sniff(sample,delimiters=';,\t')
    except csv.Error: dialect=csv.excel; dialect.delimiter=';'
    rows=list(csv.reader(io.StringIO(text),dialect))
    if not rows:return []
    header=[clean_header(x) for x in rows[0]]
    date_i=next((i for i,h in enumerate(header) if h in ('date','datedetirage','datedutirage')),None)
    ball_i=[]
    for n in range(1,6):
        i=next((i for i,h in enumerate(header) if h in (f'boule{n}',f'numero{n}',f'num{n}')),None)
        ball_i.append(i)
    star_i=[]
    for n in range(1,3):
        i=next((i for i,h in enumerate(header) if h in (f'etoile{n}',f'etoile{n}sortie')),None)
        star_i.append(i)
    out=[]
    for row in rows[1:]:
        if date_i is None or date_i>=len(row):continue
        date=norm(row[date_i])
        if not date:continue
        nums=[]
        for i in ball_i:
            if i is None or i>=len(row):continue
            try:n=int(row[i])
            except ValueError:continue
            if 1<=n<=50:nums.append(n)
        stars=[]
        for i in star_i:
            if i is None or i>=len(row):continue
            try:n=int(row[i])
            except ValueError:continue
            if 1<=n<=12:stars.append(n)
        if len(nums)!=5 or len(set(nums))!=5 or len(stars)!=2 or len(set(stars))!=2:continue
        out.append({'date':date,'numbers':sorted(nums),'stars':sorted(stars)})
    return out

draws=[]
for url in urls:
    raw=urlopen(Request(url,headers=HEAD),timeout=60).read()
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        for name in z.namelist():
            if name.lower().endswith('.csv'):
                draws.extend(parse_csv(decode_csv(z.read(name))))

seen=set();clean=[]
for d in draws:
    k=(d['date'],tuple(d['numbers']),tuple(d['stars']))
    if k not in seen:seen.add(k);clean.append(d)
clean.sort(key=lambda x:datetime.strptime(x['date'],'%d/%m/%Y'),reverse=True)
if len(clean)<1000: raise RuntimeError(f'Historique EuroMillions anormalement petit: {len(clean)} tirages')
with open('data/euromillions_history.json','w',encoding='utf-8') as f:
    json.dump({'updatedAt':datetime.now().strftime('%Y-%m-%d'),'draws':clean},f,ensure_ascii=False,separators=(',',':'))
print(f'Wrote {len(clean)} EuroMillions draws')
