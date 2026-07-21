#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, dirname, extname, join, resolve } from 'node:path';

const args = process.argv.slice(2);
const input = args.find(value => !value.startsWith('--'));
const approve = args.includes('--approve');
const approverIndex = args.indexOf('--approved-by');
const approver = approverIndex >= 0 ? args[approverIndex + 1] : '';
const root = resolve(import.meta.dirname, '..');

function fail(message){console.error(`ERROR: ${message}`);process.exitCode=1}
function required(value,path,errors){if(value===null||value===undefined||value==='')errors.push(`${path} is required.`)}
function finite(value,path,errors){if(typeof value!=='number'||!Number.isFinite(value))errors.push(`${path} must be a finite number.`)}

function validate(dataset){
 const errors=[];
 if(dataset.schemaVersion!==1)errors.push('schemaVersion must equal 1.');
 const identity=dataset.aircraftIdentity||{};
 ['manufacturer','model','modelCode','year','serialApplicability','engine','propeller'].forEach(key=>required(identity[key],`aircraftIdentity.${key}`,errors));
 if(identity.year!==undefined&&(!Number.isInteger(identity.year)||identity.year<1900||identity.year>2100))errors.push('aircraftIdentity.year must be a four-digit year.');
 const source=dataset.source||{};
 ['documentTitle','revision','revisionDate','checksumSha256','transcribedBy','transcribedAt','independentlyVerifiedBy','independentlyVerifiedAt'].forEach(key=>required(source[key],`source.${key}`,errors));
 if(source.checksumSha256&&!/^[a-f0-9]{64}$/i.test(source.checksumSha256))errors.push('source.checksumSha256 must contain 64 hexadecimal characters.');
 if(dataset.interpolation?.method!=='bounded-linear')errors.push('interpolation.method must be bounded-linear.');
 if(dataset.interpolation?.extrapolationAllowed!==false)errors.push('interpolation.extrapolationAllowed must be false.');
 if(!Array.isArray(dataset.configurations)||!dataset.configurations.length)errors.push('At least one configuration is required.');
 const configurationIds=new Set((dataset.configurations||[]).map(item=>item.id));
 ['takeoff','landing','climb'].forEach(kind=>{
  const charts=dataset.charts?.[kind];
  if(!Array.isArray(charts)||!charts.length){errors.push(`charts.${kind} requires at least one chart.`);return}
  charts.forEach((chart,chartIndex)=>{
   ['id','title','page','configurationId'].forEach(key=>required(chart[key],`charts.${kind}[${chartIndex}].${key}`,errors));
   if(chart.configurationId&&!configurationIds.has(chart.configurationId))errors.push(`charts.${kind}[${chartIndex}] references an unknown configurationId.`);
   if(!Array.isArray(chart.inputs)||!chart.inputs.length)errors.push(`charts.${kind}[${chartIndex}].inputs is required.`);
   if(!Array.isArray(chart.outputs)||!chart.outputs.length)errors.push(`charts.${kind}[${chartIndex}].outputs is required.`);
   if(!Array.isArray(chart.points)||chart.points.length<2)errors.push(`charts.${kind}[${chartIndex}] requires at least two digitized points.`);
   (chart.points||[]).forEach((point,pointIndex)=>Object.entries(point).forEach(([key,value])=>finite(value,`charts.${kind}[${chartIndex}].points[${pointIndex}].${key}`,errors)));
  });
 });
 if(approve){
  required(approver,'--approved-by',errors);
  required(source.approvedBy,'source.approvedBy',errors);
  required(source.approvedAt,'source.approvedAt',errors);
  if(approver&&source.approvedBy&&approver!==source.approvedBy)errors.push('--approved-by must match source.approvedBy.');
 }
 return errors;
}

function parseCsv(text){
 const lines=text.split(/\r?\n/).filter(line=>line.trim()&&!line.trim().startsWith('#'));
 if(lines.length<2)throw new Error('CSV must include a header and at least one point.');
 const rows=lines.map(line=>line.split(',').map(value=>value.trim()));
 const headers=rows.shift();
 const requiredHeaders=['chartType','chartId','chartTitle','page','configurationId','inputs','outputs'];
 requiredHeaders.forEach(header=>{if(!headers.includes(header))throw new Error(`CSV header ${header} is required.`)});
 const metadataHeaders=new Set(requiredHeaders);
 const groups={takeoff:new Map(),landing:new Map(),climb:new Map()};
 rows.forEach((row,index)=>{
  const record=Object.fromEntries(headers.map((header,column)=>[header,row[column]??'']));
  if(!groups[record.chartType])throw new Error(`CSV row ${index+2}: chartType must be takeoff, landing, or climb.`);
  const map=groups[record.chartType];
  if(!map.has(record.chartId))map.set(record.chartId,{id:record.chartId,title:record.chartTitle,page:record.page,configurationId:record.configurationId,inputs:record.inputs.split(';').filter(Boolean),outputs:record.outputs.split(';').filter(Boolean),points:[]});
  const chart=map.get(record.chartId),point={};
  headers.filter(header=>!metadataHeaders.has(header)).forEach(header=>{if(record[header]!==''){const number=Number(record[header]);if(!Number.isFinite(number))throw new Error(`CSV row ${index+2}, ${header}: expected a number.`);point[header]=number}});
  chart.points.push(point);
 });
 return Object.fromEntries(Object.entries(groups).map(([kind,map])=>[kind,[...map.values()]]));
}

async function loadDataset(file){
 const extension=extname(file).toLowerCase(),text=await readFile(file,'utf8');
 if(extension==='.json')return JSON.parse(text);
 if(extension!=='.csv')throw new Error('Input must be JSON or CSV.');
 const metaPath=file.slice(0,-4)+'.meta.json';
 const metadata=JSON.parse(await readFile(metaPath,'utf8'));
 metadata.charts=parseCsv(text);
 return metadata;
}

if(!input){
 fail('Usage: node tools/import-performance.mjs <dataset.json|points.csv> [--approve --approved-by "Name"]');
}else{
 try{
  const sourcePath=resolve(input),dataset=await loadDataset(sourcePath),errors=validate(dataset);
  if(errors.length){errors.forEach(fail)}else if(!approve){
   console.log('VALID: dataset structure passed. No public file was written; rerun with --approve and --approved-by after independent verification.');
  }else{
   dataset.status='approved';
   const slug=[dataset.aircraftIdentity.modelCode,dataset.aircraftIdentity.year,dataset.aircraftIdentity.engine,dataset.aircraftIdentity.propeller].join('-').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
   const outputDir=join(root,'data','performance','approved'),outputPath=join(outputDir,slug+'.json');
   await mkdir(outputDir,{recursive:true});
   await writeFile(outputPath,JSON.stringify(dataset,null,2)+'\n','utf8');
   const catalogPath=join(root,'data','performance','catalog.json');
   const catalog=JSON.parse(await readFile(catalogPath,'utf8'));
   const entry={id:slug,path:`./data/performance/approved/${slug}.json`,modelCode:dataset.aircraftIdentity.modelCode,year:dataset.aircraftIdentity.year,engine:dataset.aircraftIdentity.engine,propeller:dataset.aircraftIdentity.propeller,revision:dataset.source.revision,approvedBy:dataset.source.approvedBy,approvedAt:dataset.source.approvedAt};
   catalog.datasets=(catalog.datasets||[]).filter(item=>item.id!==slug).concat(entry);
   await writeFile(catalogPath,JSON.stringify(catalog,null,2)+'\n','utf8');
   console.log(`APPROVED: ${outputPath}`);
   console.log('Review and commit both the approved dataset and catalog change. Add the approved dataset path to sw.js for offline use.');
  }
 }catch(error){fail(error.message)}
}
