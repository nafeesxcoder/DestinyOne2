import giftCatalogJson from '../../shared/gift-catalog.json';

export type GiftCountry='US'|'CA'|'IN';
export type GiftCurrency='USD'|'CAD'|'INR';
export type GiftSort='recommended'|'fastest'|'price_low'|'price_high';
export type GiftAvailability='available'|'low_stock'|'sold_out'|'waitlist';
export type GiftCommerceSignal='viewed'|'added'|'removed'|'purchased'|'substituted'|'liked'|'disliked'|'delivered_positive'|'delivered_negative';

export type GiftMarket={
  country:GiftCountry;currency:GiftCurrency;locale:string;symbol:string;taxRate:number;
  cities:Array<{key:string;label:string;status:'pilot'|'active'|'waitlist';services:Array<'asap'|'today'|'scheduled'>}>;
};

export const giftMarkets:GiftMarket[]=[
  {country:'US',currency:'USD',locale:'en-US',symbol:'$',taxRate:.0875,cities:[
    {key:'fresno-ca',label:'Fresno, CA',status:'pilot',services:['asap','today','scheduled']},
    {key:'new-york-ny',label:'New York, NY',status:'pilot',services:['asap','today','scheduled']},
  ]},
  {country:'CA',currency:'CAD',locale:'en-CA',symbol:'CA$',taxRate:.13,cities:[
    {key:'toronto-on',label:'Toronto, ON',status:'pilot',services:['asap','today','scheduled']},
  ]},
  {country:'IN',currency:'INR',locale:'en-IN',symbol:'₹',taxRate:.18,cities:[
    {key:'new-delhi-dl',label:'New Delhi, Delhi',status:'pilot',services:['asap','today','scheduled']},
    {key:'mumbai-mh',label:'Mumbai, Maharashtra',status:'pilot',services:['asap','today','scheduled']},
  ]},
];

export type GiftCommerceProduct=(typeof giftCatalogJson)[number]&{
  localizedPriceMinor:number;currency:GiftCurrency;availability:GiftAvailability;availableUnits:number;
  rating:number;reviewCount:number;merchantVerified:boolean;searchText:string;
};

const rates:Record<GiftCurrency,number>={USD:1,CAD:1.36,INR:17.5};
const deliveryWindowRank:Record<string,number>={on_demand:1,same_day:2,scheduled:3};

export function resolveGiftMarket(country:GiftCountry='US'){return giftMarkets.find(market=>market.country===country)??giftMarkets[0]!}

export function convertGiftMinor(amountMinor:number,currency:GiftCurrency){
  return Math.round(amountMinor*rates[currency]);
}

export function localizeGiftPrice(priceCents:number,currency:GiftCurrency){
  const converted=convertGiftMinor(priceCents,currency);
  return currency==='INR'?Math.max(69900,converted):converted;
}

export function formatGiftMarketMoney(amountMinor:number,currency:GiftCurrency){
  const market=giftMarkets.find(item=>item.currency===currency)??giftMarkets[0]!;
  return new Intl.NumberFormat(market.locale,{style:'currency',currency,maximumFractionDigits:currency==='INR'?0:2}).format(amountMinor/100);
}

export function buildGiftMarketplaceProducts(input:{country:GiftCountry;city:string;inventory?:Record<string,number>}):GiftCommerceProduct[]{
  const market=resolveGiftMarket(input.country);
  const citySupported=market.cities.some(city=>city.label.toLowerCase()===input.city.toLowerCase()&&city.status!=='waitlist');
  return giftCatalogJson.filter(product=>product.active).map((product,index)=>{
    const units=citySupported?(input.inventory?.[product.id]??(index%5===0?3:12-index%4)):0;
    const availability:GiftAvailability=!citySupported?'waitlist':units<=0?'sold_out':units<=3?'low_stock':'available';
    return {...product,localizedPriceMinor:localizeGiftPrice(product.priceCents,market.currency),currency:market.currency,availability,availableUnits:units,rating:Number((4.7+(index%3)*.1).toFixed(1)),reviewCount:48+index*17,merchantVerified:true,searchText:[product.name,product.category,product.occasion,product.description,...product.moods].join(' ').toLowerCase()};
  });
}

export function filterGiftMarketplace(products:GiftCommerceProduct[],input:{query:string;category:string;delivery:'all'|'asap'|'today'|'scheduled';sort:GiftSort;inStockOnly?:boolean}){
  const query=input.query.trim().toLowerCase();
  const filtered=products.filter(product=>(!query||product.searchText.includes(query))&&(input.category==='All'||product.category===input.category)&&(input.delivery==='all'||product.deliveryWindows.includes(input.delivery))&&(!input.inStockOnly||product.availability==='available'||product.availability==='low_stock'));
  return [...filtered].sort((a,b)=>{
    if(input.sort==='price_low')return a.localizedPriceMinor-b.localizedPriceMinor;
    if(input.sort==='price_high')return b.localizedPriceMinor-a.localizedPriceMinor;
    if(input.sort==='fastest')return (deliveryWindowRank[a.serviceLevel]??9)-(deliveryWindowRank[b.serviceLevel]??9)||a.prepMinutes-b.prepMinutes;
    const availabilityScore=(value:GiftAvailability)=>value==='available'?3:value==='low_stock'?2:value==='sold_out'?1:0;
    return availabilityScore(b.availability)-availabilityScore(a.availability)||b.rating-a.rating||b.reviewCount-a.reviewCount;
  });
}

export function recommendGiftSubstitutions(products:GiftCommerceProduct[],originalId:string,maxPriceIncreaseMinor:number,limit=3){
  const original=products.find(product=>product.id===originalId);if(!original)return[];
  return products.filter(product=>product.id!==originalId&&product.category===original.category&&product.availability!=='sold_out'&&product.availability!=='waitlist'&&product.localizedPriceMinor<=original.localizedPriceMinor+maxPriceIncreaseMinor)
    .sort((a,b)=>Math.abs(a.localizedPriceMinor-original.localizedPriceMinor)-Math.abs(b.localizedPriceMinor-original.localizedPriceMinor)||b.rating-a.rating).slice(0,limit);
}

export function assessGiftOrderRisk(input:{ordersLastHour:number;ordersLastDay:number;totalMinor:number;currency:GiftCurrency;newDevice:boolean;recipientCountLastDay:number}){
  let score=0;const reasons:string[]=[];
  if(input.ordersLastHour>=3){score+=35;reasons.push('hourly_velocity')}
  if(input.ordersLastDay>=8){score+=30;reasons.push('daily_velocity')}
  if(input.recipientCountLastDay>=5){score+=20;reasons.push('recipient_velocity')}
  const highValue=input.currency==='INR'?1500000:15000;if(input.totalMinor>=highValue){score+=20;reasons.push('high_value')}
  if(input.newDevice){score+=15;reasons.push('new_device')}
  const normalized=Math.min(100,score);return{score:normalized,decision:normalized>=70?'block' as const:normalized>=40?'review' as const:'approve' as const,reasons};
}

export function giftOrderLimitMessage(input:{ordersLastHour:number;ordersLastDay:number;decision:'approve'|'review'|'block'}){
  if(input.decision==='block')return 'For your protection, this gift request needs a short safety review before payment.';
  if(input.ordersLastHour>=3)return 'You reached the hourly gift limit. Try again later or contact Gift Support.';
  if(input.ordersLastDay>=8)return 'You reached today’s gift limit. This helps protect members and merchants.';
  return '';
}

export function scoreGiftRecommendationLearning(signals:GiftCommerceSignal[]){
  const weights:Record<GiftCommerceSignal,number>={viewed:.1,added:1,removed:-.6,purchased:3,substituted:-.4,liked:1.5,disliked:-1.5,delivered_positive:4,delivered_negative:-4};
  return Number(signals.reduce((total,signal)=>total+weights[signal],0).toFixed(2));
}

export function buildGiftOperationsSnapshot(input:{staleInventoryCities:number;lowStockItems:number;failedProviderJobs:number;failedNotifications:number;openDisputes:number}){
  const critical=input.failedProviderJobs+input.failedNotifications;
  return{health:critical>0?'attention' as const:input.staleInventoryCities>0||input.lowStockItems>0?'watch' as const:'healthy' as const,critical,metrics:[
    {label:'Stale inventory cities',value:input.staleInventoryCities,tone:input.staleInventoryCities?'warning':'good'},
    {label:'Low-stock products',value:input.lowStockItems,tone:input.lowStockItems?'warning':'good'},
    {label:'Provider jobs failed',value:input.failedProviderJobs,tone:input.failedProviderJobs?'critical':'good'},
    {label:'Confirmations failed',value:input.failedNotifications,tone:input.failedNotifications?'critical':'good'},
    {label:'Open disputes',value:input.openDisputes,tone:input.openDisputes?'warning':'good'},
  ]};
}
