#!/usr/bin/env python3
"""Build the Loto history used by the PWA from official FDJ archives.

Only periods using the current 5-number + Chance rules are indexed:
- Oct 2008 -> Mar 2017
- Mar 2017 -> Nov 2019
- Nov 2019 -> today
The 1976-2008 archive used six main balls, so those draws are deliberately
not treated as exact 5-number combinations of the current game.
"""
import csv, io, json, re, zipfile
from datetime import datetime
from urllib.request import Request, urlopen

PAGE='https://www.fdj.fr/jeux-de-tirage/loto/historique'
HEAD={'User-Agent':'Mozilla/5.0'}
html=urlopen(Request(PAGE,headers=HEAD),timeout=30).read().decode('utf-8','ignore')
urls=re.findall(r'https://www\.sto\.api\.fdj\.fr/anonymous/service-draw-info/v3/documentations/[^"\\<> ]+',html)
urls=list(dict.fromkeys(urls))
# The page order is: current, 2019, 2017, 2008, 1976.
if len(urls)<4: raise RuntimeError(f'Archives FDJ introuvables: {len(urls)}')
urls=urls[:4]

def norm(v):
    v=v.strip()
    for fmt in ('%d/%m/%Y','%Y-%m-%d','%d-%m-%Y','%d/%m/%y'):
        try:return datetime.strptime(v,fmt).strftime('%d/%m/%Y')
        except ValueError:pass
    return None

def clean_header(v):
    return re.sub(r'[^a-z0-9]','',v.lower().replace('é','e').replace('è','e').replace('ê','e').replace('à','a').replace('ô','o'))

def parse_csv(text):
    sample=text[:4096]
    try: dialect=csv.Sniffer().sniff(sample,delimiters=';,\t')
    except csv.Error: dialect=csv.excel; dialect.delimiter=';'
    rows=list(csv.reader(io.StringIO(text),dialect))
    if not rows:return []
    header=[clean_header(x) for x in rows[0]]
    date_i=next((i for i,h in enumerate(header) if h in ('date','datedetirage','datedutirage')),None)
    ball_i=[i for i,h in enumerate(header) if re.search(r'(boule|numero|numerogagnant|numgagnant)[_ ]?[1-5]$',h)]
    # Prefer explicit boule_1..boule_5 columns.
    explicit=[next((i for i,h in enumerate(header) if h in (f'boule{n}',f'numero{n}',f'num{n}')),None) for n in range(1,6)]
    if all(i is not None for i in explicit): ball_i=explicit
    chance_i=next((i for i,h in enumerate(header) if 'chance' in h),None)
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
            if 1<=n<=49:nums.append(n)
        if len(nums)!=5 or len(set(nums))!=5:continue
        chance=None
        if chance_i is not None and chance_i<len(row):
            try:
                n=int(row[chance_i]); chance=n if 1<=n<=10 else None
            except ValueError:pass
        out.append({'date':date,'numbers':sorted(nums),'chance':chance})
    return out

draws=[]
for url in urls:
    raw=urlopen(Request(url,headers=HEAD),timeout=60).read()
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        for name in z.namelist():
            if name.lower().endswith('.csv'):
                draws.extend(parse_csv(z.read(name).decode('utf-8-sig','ignore')))

seen=set();clean=[]
for d in draws:
    k=(d['date'],tuple(d['numbers']),d['chance'])
    if k not in seen:seen.add(k);clean.append(d)
clean.sort(key=lambda x:datetime.strptime(x['date'],'%d/%m/%Y'),reverse=True)
if len(clean)<1000: raise RuntimeError(f'Historique anormalement petit: {len(clean)} tirages')
with open('data/history.json','w',encoding='utf-8') as f:
    json.dump({'updatedAt':datetime.now().strftime('%Y-%m-%d'),'draws':clean},f,ensure_ascii=False,separators=(',',':'))
print(f'Wrote {len(clean)} draws')
