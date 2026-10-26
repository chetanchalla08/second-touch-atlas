"""Transform cached Census Reporter ACS/TIGER and OSM Overpass responses. No fabricated observations."""
import json,math,pathlib
base=pathlib.Path(__file__).resolve().parents[1]/'data-raw'
if not base.exists():base=pathlib.Path(__file__).resolve().parents[2]/'reference'
out=pathlib.Path(__file__).resolve().parents[1]/'public/data'
def read(n):return json.load(open(base/(n+'.json')))
def rings(g):return [p[0] for p in g['coordinates']] if g['type']=='MultiPolygon' else [g['coordinates'][0]]
def centroid(g):
 pts=max(rings(g),key=len); a=x=y=0
 for p,q in zip(pts,pts[1:]):
  k=p[0]*q[1]-q[0]*p[1];a+=k;x+=(p[0]+q[0])*k;y+=(p[1]+q[1])*k
 return [x/(3*a),y/(3*a)] if a else pts[0]
def inside(pt,g):
 x,y=pt
 for ring in rings(g):
  c=False
  for p,q in zip(ring,ring[1:]):
   if (p[1]>y)!=(q[1]>y) and x<(q[0]-p[0])*(y-p[1])/(q[1]-p[1])+p[0]:c=not c
  if c:return True
 return False
def stats(d):
 a=d['B01001']['estimate'];p=d['B17001']['estimate'];v=d['B08201']['estimate']
 vals=[a['B01001028'],a['B01001029'],p['B17001002'],p['B17001001'],v['B08201002'],v['B08201001']]
 if any(x is None or x<0 for x in vals):return None
 return {'eligible':round(.8*vals[0]+vals[1]),'poverty':vals[2]/vals[3] if vals[3] else 0,'noVehicle':vals[4]/vals[5] if vals[5] else 0}
geo=read('county-geo');acs=read('reporter');counties=[]
for f in geo['features']:
 id=f['properties']['geoid'][-5:]; s=stats(acs['data']['05000US'+id]);assert s is not None
 f['id']=id;f['properties']={'id':id,'name':f['properties']['name'].replace(' County, GA','')}
 counties.append({'id':id,'name':f['properties']['name'],'point':centroid(f['geometry']),**s})
countyBy={c['id']:c for c in counties};areas=[];tractCounties=set()
if (base/'tract-acs.json').exists() and (base/'tract-geo.json').exists():
 ta=read('tract-acs');tg=read('tract-geo')
 for f in tg['features']:
  geoid=f['properties']['geoid'];county=geoid.replace('14000US','')[:5];s=stats(ta['data'].get(geoid,{})) if geoid in ta['data'] else None
  if s is None:continue
  tractCounties.add(county);areas.append({'id':geoid,'county':county,'name':f['properties']['name'],'point':centroid(f['geometry']),'level':'tract',**s})
for c in counties:
 if c['id'] not in tractCounties:areas.append({**c,'county':c['id'],'level':'county'})
fields=[]
for e in read('fields')['elements']:
 p=e.get('center',e);pt=[p['lon'],p['lat']];f=next((f for f in geo['features'] if inside(pt,f['geometry'])),None)
 if not f:continue
 tags=e.get('tags',{}); id=str(e['type'])+'/'+str(e['id']);co=f['id'];name=tags.get('name') or tags.get('description') or ('Mapped soccer pitch · '+countyBy[co]['name']+' '+str(e['id'])[-4:])
 fields.append({'id':id,'name':name,'point':pt,'county':co,'source':'https://www.openstreetmap.org/'+id,'access':tags.get('access','unknown'),'unavailable':tags.get('access') in ['no','private'],'surface':tags.get('surface','unrecorded')})
# Keep real mapped pitch coordinates; every pitch remains a distinct candidate, even at a shared complex.
data={'counties':counties,'areas':areas,'fields':fields,'meta':{'retrieved':'2026-10-25','acs':'2020–2024 ACS 5-year','tractCounties':sorted(tractCounties),'fieldSnapshot':read('fields').get('osm3s',{}).get('timestamp_osm_base'),'missingTractPolicy':'Tracts lacking required estimates are omitted; county-level estimates remain visible in the choropleth.'}}
for name,obj in [('atlas',data),('counties',geo)]:
 (out/(name+'.json')).write_text(json.dumps(obj,separators=(',',':')))
print(len(counties),'counties',len(areas),'demand areas',len(fields),'real mapped pitches',len(tractCounties),'counties with tracts')
