export const reportCurrency=(v:number|string|null|undefined)=>{const n=Number(v??0);return new Intl.NumberFormat("ar-EG",{minimumFractionDigits:0,maximumFractionDigits:2}).format(Number.isFinite(n)?n:0)};
export const reportDate=(v?:string|Date|null)=>{if(!v)return"—";const d=v instanceof Date?v:new Date(v);return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("ar-EG",{year:"numeric",month:"2-digit",day:"2-digit"}).format(d)};
export const reportTotalRent=(rent:number|string|null|undefined,water:number|string|null|undefined,charges:number|string|null|undefined=0)=>Number(rent??0)+Number(water??0)+Number(charges??0);
export const printReport=()=>window.print();
