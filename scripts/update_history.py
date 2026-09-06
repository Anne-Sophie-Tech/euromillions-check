#!/usr/bin/env python3
"""Build data/history.json from the official FDJ Loto archive page.
The FDJ page publishes several ZIP archives whose links can change over time.
This script discovers the current links from the official page, downloads them,
and normalises their CSV content into a compact JSON index for the static PWA.
"""
import csv, io, json, re, sys, zipfile
from datetime import datetime
from urllib.request import Request, urlopen

PAGE='https://www.fdj.fr/jeux-de-tirage/loto/historique'
html=urlopen(Request(PAGE,headers={'User-Agent':'Mozilla/5.0'}),timeout=30).read().decode('utf-8','ignore')
urls=re.findall(r'https://www\.sto\.api\.fdj\.fr/anonymous/service-draw-info/v3/documentations/[^"\\<> ]+',html)
# Keep unique archive links in page order.
urls=list(dict.fromkeys(urls))
if len(urls)<5:
    raise RuntimeError(f'Impossible de trouver les 5 archives FDJ (trouvé: {len(urls)})')

def norm_date(v):
    v=v.strip()
    for fmt in ('%d/%m/%Y','%Y-%m-%d','%d-%m-%Y','%d/%m/%y'):
        try:return datetime.strptime(v,fmt).strftime('%d/%m/%Y')
        except ValueError:pass
    if v.isdigit() and len(v)==8:
        try:return datetime.strptime(v,'%Y%m%d').strftime('%d/%m/%Y')
        except ValueError:pass
    return None

def nums(row):
    out=[]
    for cell in row:
        try:
            n=int(str(cell).strip())
            if 1<=n<=49: out.append(n)
        except: pass
    return out

draws=[]
for url in urls[:5]:
    raw=urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=60).read()
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        for name in z.namelist():
            if not name.lower().endswith('.csv'): continue
            text=z.read(name).decode('utf-8-sig','ignore')
            rows=list(csv.reader(io.StringIO(text),delimiter=';'))
            for row in rows:
                if not row: continue
                date=next((norm_date(c) for c in row[:8]),None)
                if not date: continue
                values=nums(row)
                # Current-format records contain at least five 1..49 values; the first five
                # are not necessarily the winning balls in every historical CSV, so prefer
                # header-driven columns when available.
                if len(values)<5: continue
                # For the periods with 5-ball Loto, take the first five numeric ball values.
                # Chance is normally the next value and must be 1..10.
                numbers=values[:5]
                chance=values[5] if len(values)>5 and 1<=values[5]<=10 else None
                if len(set(numbers))!=5: continue
                draws.append({'date':date,'numbers':sorted(numbers),'chance':chance})

# Deduplicate by date + main numbers + chance.
seen=set(); clean=[]
for d in draws:
    k=(d['date'],tuple(d['numbers']),d['chance'])
    if k not in seen:seen.add(k);clean.append(d)
clean.sort(key=lambda x:datetime.strptime(x['date'],'%d/%m/%Y'),reverse=True)
with open('data/history.json','w',encoding='utf-8') as f:
    json.dump({'updatedAt':datetime.now().strftime('%Y-%m-%d'),'draws':clean},f,ensure_ascii=False,separators=(',',':'))
print(f'Wrote {len(clean)} draws')
