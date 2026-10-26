import {readFileSync,writeFileSync}from'node:fs';import{calculate,preset,type Data,type Method}from'../src/model.ts';
const data=JSON.parse(readFileSync('public/data/atlas.json','utf8')) as Data;const output:Record<string,unknown>={};
for(const name of ['atlanta','state','reduced']){const scenario=preset(name);const plans=(['access','population','geographic'] as Method[]).map(m=>calculate(data,scenario,m));output[name]={scenario,plans};console.log(name,plans.map(p=>({method:p.method,enrollment:p.enrollment,cost:p.cost,score:Math.round(p.weighted),ms:Math.round(p.elapsed)})));}
writeFileSync('public/data/examples.json',JSON.stringify(output));
