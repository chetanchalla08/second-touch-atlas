"""Optional refresh. Uses public APIs with a specific User-Agent; retains downloaded inputs locally."""
import json,pathlib,urllib.request,urllib.parse
root=pathlib.Path(__file__).resolve().parents[1];cache=root/'data-raw';cache.mkdir(exist_ok=True)
sources=json.load(open(root/'public/data/sources.json'))['sources']
for i,name in enumerate(['reporter','tract-acs','county-geo','tract-geo','fields']):
 source=sources[i];body=urllib.parse.urlencode({'data':source['query']}).encode() if 'query' in source else None
 request=urllib.request.Request(source['url'].replace('|','%7C'),data=body,headers={'User-Agent':'SecondTouchAtlas/1.0 (+https://second-touch-atlas.satinycrane20.chatgpt.site)'})
 with urllib.request.urlopen(request,timeout=120) as response:data=json.load(response)
 (cache/(name+'.json')).write_text(json.dumps(data));print('Saved',name)
print('Update source retrieval dates, then run prepare-data.py and cache-examples.ts; inspect changed coverage before publishing.')
