export type Point=[number,number];
export interface Area {id:string; county:string; name:string; point:Point; eligible:number; poverty:number; noVehicle:number; level:string}
export interface County {id:string; name:string; point:Point; eligible:number; poverty:number; noVehicle:number}
export interface Field {id:string; name:string; point:Point; county:string; source:string; access:string; unavailable:boolean; surface:string}
export interface Data {counties:County[]; areas:Area[]; fields:Field[]; meta:{retrieved:string;acs:string;tractCounties:string[];fieldSnapshot:string}}
export interface Scenario {name:string; scope:'state'|'atlanta'|'custom'; counties:string[]; budget:number; cap:number; maxFields:number; miles:number; waves:number; coaches:number; refs:number; povertyWeight:number; vehicleWeight:number; distanceWeight:number; takeup:number; retention:number; fixed:number; variable:number; places:number; perCoach:number; refsPerCohort:number; decisions:Record<string,'include'|'exclude'>}
export interface Allocation {areaId:string;county:string;count:number;miles:number;priority:number}
export interface Activation {fieldId:string; wave:number; cost:number; places:number; enrollment:number; coaches:number;refs:number; weighted:number; allocations:Allocation[];reason:string}
export interface Plan {method:Method; activations:Activation[];cost:number;unused:number;unique:number;places:number;enrollment:number;reach:number;weighted:number;distance:number;coaches:number;refs:number;returners:number;warnings:string[];priority:Record<string,number>;demand:number;elapsed:number}
export type Method='access'|'population'|'geographic';
export const ATLANTA=['13121','13089','13067','13135','13063'];
export const defaults:Scenario={name:'Atlanta pilot',scope:'atlanta',counties:ATLANTA,budget:300000,cap:5000,maxFields:30,miles:8,waves:2,coaches:90,refs:45,povertyWeight:50,vehicleWeight:30,distanceWeight:20,takeup:10,retention:30,fixed:0,variable:60,places:50,perCoach:20,refsPerCohort:1,decisions:{}};
export function preset(name:string):Scenario {return name==='state'?{...defaults,name:'Statewide access',scope:'state',counties:[],miles:15,maxFields:40,waves:3}:name==='reduced'?{...defaults,name:'Reduced budget',budget:90000}:structuredClone(defaults)}
export const distance=(a:Point,b:Point)=>{const r=Math.PI/180,dlat=(b[1]-a[1])*r,dlon=(b[0]-a[0])*r;return 3958.7613*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(dlat/2)**2+Math.cos(a[1]*r)*Math.cos(b[1]*r)*Math.sin(dlon/2)**2)))};
const norm=(v:number,min:number,max:number)=>max>min?(v-min)/(max-min):0;
export function calculate(data:Data,s:Scenario,method:Method='access'):Plan {
 const start=performance.now(), active=(co:string)=>s.scope==='state'||s.counties.includes(co);
 const areas=data.areas.filter(a=>active(a.county)),network=data.fields.filter(f=>active(f.county)&&!f.unavailable),fields=network.filter(f=>s.decisions[f.id]!=='exclude');
 const distances=network.map(f=>areas.map(a=>distance(f.point,a.point)));const index=new Map(network.map((f,i)=>[f.id,i]));
 const nearest=areas.map((_,i)=>network.length?Math.min(...distances.map(row=>row[i])):0);
 const poverty=areas.map(a=>a.poverty),vehicle=areas.map(a=>a.noVehicle), minP=Math.min(...poverty),maxP=Math.max(...poverty),minV=Math.min(...vehicle),maxV=Math.max(...vehicle),minD=Math.min(...nearest),maxD=Math.max(...nearest);
 const weight=s.povertyWeight+s.vehicleWeight+s.distanceWeight;
 const priorities=areas.map((a,i)=>weight?(s.povertyWeight*norm(a.poverty,minP,maxP)+s.vehicleWeight*norm(a.noVehicle,minV,maxV)+s.distanceWeight*norm(nearest[i],minD,maxD))/weight:0);
 const priority=Object.fromEntries(areas.map((a,i)=>[a.id,priorities[i]]));
 const remaining=areas.map(a=>Math.floor(a.eligible*Math.max(0,Math.min(100,s.takeup))/100)),demand=remaining.reduce((a,b)=>a+b,0);
 const nearby=new Map(fields.map(f=>[f.id,areas.map((_,i)=>i).filter(i=>distances[index.get(f.id)!][i]<=s.miles).sort((a,b)=>priorities[b]-priorities[a]||distances[index.get(f.id)!][a]-distances[index.get(f.id)!][b]||areas[a].id.localeCompare(areas[b].id))]));
 const warnings:string[]=[],activations:Activation[]=[],unique=new Set<string>();let cost=0;
 const places=Math.max(0,Math.floor(s.places)),cohortCost=Math.round((Math.max(0,s.fixed)+Math.max(0,s.variable)*places)*100)/100,coaches=Math.ceil(places/Math.max(1,s.perCoach)),refs=Math.max(0,Math.floor(s.refsPerCohort));
 const forced=Object.keys(s.decisions).filter(id=>s.decisions[id]==='include'),done=new Set<string>();
 const countyOrder=data.counties.filter(c=>active(c.id)).sort((a,b)=>a.name.localeCompare(b.name)).map(c=>c.id);let cursor=0;
 const evaluate=(f:Field):Activation|null=>{
  let seats=places;const allocations:Allocation[]=[];
  for(const i of nearby.get(f.id)??[]){const n=Math.min(seats,remaining[i]);if(n>0){allocations.push({areaId:areas[i].id,county:areas[i].county,count:n,miles:distances[index.get(f.id)!][i],priority:priorities[i]});seats-=n;}if(!seats)break;}
  const enrollment=places-seats;if(!enrollment)return null;
  const weighted=allocations.reduce((v,a)=>v+a.count*(1+a.priority),0),avg=allocations.reduce((v,a)=>v+a.count*a.miles,0)/enrollment;
  return {fieldId:f.id,wave:0,cost:cohortCost,places,enrollment,coaches,refs,weighted,allocations,reason:`${enrollment} additional modeled enrollments from ${allocations.length} demand area${allocations.length===1?'':'s'}; ${avg.toFixed(1)} mi average. Access factor ${(weighted/enrollment).toFixed(2)}×.`};
 };
 if(cohortCost>s.cap)warnings.push(`A full cohort costs $${cohortCost.toLocaleString()}, above the $${s.cap.toLocaleString()} cohort cap.`);
 if(cohortCost>s.budget)warnings.push('The delivery budget cannot fund one full cohort.');
 if(coaches>s.coaches||refs>s.refs)warnings.push('Available staff cannot support one full cohort per wave.');
 if(!demand)warnings.push('No modeled demand: check the selected counties and take-up assumption.');
 if(!fields.length)warnings.push('No eligible candidate pitches in this scope.');
 if(places&&cohortCost<=s.cap&&cohortCost<=s.budget&&coaches<=s.coaches&&refs<=s.refs){
  for(let wave=1;wave<=s.waves;wave++){
   let usedCoaches=0,usedRefs=0;const used=new Set<string>();
   while(true){
    if(cost+cohortCost>s.budget+.0001||usedCoaches+coaches>s.coaches||usedRefs+refs>s.refs)break;
    const options=fields.filter(f=>!used.has(f.id)&&(unique.has(f.id)||unique.size<s.maxFields)).map(f=>evaluate(f)).filter((x):x is Activation=>!!x);
    if(!options.length)break;
    const potential=(a:Activation)=>(nearby.get(a.fieldId)??[]).reduce((v,i)=>v+remaining[i],0);
    let best=options.find(a=>forced.includes(a.fieldId)&&!done.has(a.fieldId));
    if(!best&&method==='geographic'){
     for(let tries=0;tries<countyOrder.length;tries++){
      const county=countyOrder[cursor%countyOrder.length];cursor++;
      const choices=options.filter(a=>network[index.get(a.fieldId)!].county===county);
      if(choices.length){best=choices.sort((a,b)=>b.enrollment-a.enrollment||b.weighted-a.weighted||a.fieldId.localeCompare(b.fieldId))[0];break;}
     }
    }
    if(!best)best=options.sort((a,b)=>method==='population'?potential(b)-potential(a)||b.enrollment-a.enrollment||a.fieldId.localeCompare(b.fieldId):(b.weighted/Math.max(.01,b.cost)-a.weighted/Math.max(.01,a.cost))||b.enrollment-a.enrollment||a.fieldId.localeCompare(b.fieldId))[0];
    best.wave=wave;activations.push(best);unique.add(best.fieldId);used.add(best.fieldId);done.add(best.fieldId);cost+=best.cost;usedCoaches+=coaches;usedRefs+=refs;
    for(const a of best.allocations){const i=areas.findIndex(x=>x.id===a.areaId);remaining[i]-=a.count;}
   }
  }
 }
 for(const id of forced)if(!done.has(id))warnings.push(`Could not include ${data.fields.find(f=>f.id===id)?.name??id}: unavailable, outside the scope, unreachable demand, or insufficient budget, fields or staffing.`);
 if(!activations.length&&demand&&fields.length&&!warnings.length)warnings.push('No feasible allocation. Increase distance, field limit, waves or staffing.');
 const enrollment=activations.reduce((v,a)=>v+a.enrollment,0),weighted=activations.reduce((v,a)=>v+a.weighted,0);
 const reached=new Set(activations.flatMap(a=>nearby.get(a.fieldId)??[]));
 const waveNeed=(key:'coaches'|'refs')=>Math.max(0,...Array.from({length:s.waves},(_,i)=>activations.filter(a=>a.wave===i+1).reduce((v,a)=>v+a[key],0)));
 return {method,activations,cost,unused:s.budget-cost,unique:unique.size,places:activations.length*places,enrollment,reach:[...reached].reduce((v,i)=>v+areas[i].eligible,0),weighted,distance:enrollment?activations.flatMap(a=>a.allocations).reduce((v,a)=>v+a.count*a.miles,0)/enrollment:0,coaches:waveNeed('coaches'),refs:waveNeed('refs'),returners:Math.round(enrollment*s.retention/100),warnings,priority,demand,elapsed:performance.now()-start};
}
