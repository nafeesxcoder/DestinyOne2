import giftCatalogJson from '../../shared/gift-catalog.json';

export type GiftConciergeMood='romantic'|'playful'|'comforting'|'celebratory';
export type GiftConciergeInput={budgetCents:number;mood:GiftConciergeMood;occasion:string;deliveryWindow:'asap'|'today'|'scheduled';recipientName:string;city?:string};
export type GiftConciergePlan={recommendedProductIds:string[];headline:string;reason:string;suggestedNote:string;premiumDifferentiators:Array<{title:string;body:string}>;mode:'preview_rules'|'live_ai';budgetCents:number;estimatedTotalCents:number;estimatedSubtotalCents:number};

type CatalogProduct={id:string;priceCents:number;deliveryFeeCents:number;serviceLevel:'on_demand'|'same_day'|'scheduled';moods:string[];deliveryWindows:string[];active:boolean};
const productProfiles=(giftCatalogJson as CatalogProduct[]).filter(product=>product.active);

export function estimateConciergeCartTotal(productIds:string[],deliveryWindow:GiftConciergeInput['deliveryWindow']){
  const products=productIds.map(id=>productProfiles.find(product=>product.id===id)).filter((product):product is CatalogProduct=>Boolean(product));
  const subtotal=products.reduce((sum,product)=>sum+product.priceCents,0);
  if(!products.length)return{subtotalCents:0,totalCents:0};
  const delivery=Math.max(...products.map(product=>product.deliveryFeeCents));
  const rush=deliveryWindow==='asap'&&!products.some(product=>product.serviceLevel==='scheduled')?299:0;
  const small=subtotal<2500?199:0;
  const service=Math.max(199,Math.round(subtotal*.065));
  const discount=subtotal>=6000?Math.min(499,delivery):0;
  const taxable=subtotal+delivery+rush+small+service-discount;
  return{subtotalCents:subtotal,totalCents:taxable+Math.round(taxable*.0875)};
}

function combinations<T>(items:T[],maxSize:number){
  const result:T[][]=[];
  const visit=(start:number,current:T[])=>{if(current.length)result.push([...current]);if(current.length===maxSize)return;for(let index=start;index<items.length;index+=1){current.push(items[index]!);visit(index+1,current);current.pop()}};
  visit(0,[]);return result;
}

export function buildGiftConciergePlan(input:GiftConciergeInput):GiftConciergePlan{
  const budget=Math.max(1800,Math.min(25000,Math.round(input.budgetCents||5000)));
  const ranked=productProfiles.map(product=>{
    let score=product.priceCents<=budget?4:Math.max(-4,-Math.ceil((product.priceCents-budget)/1000));
    if(product.moods.includes(input.mood))score+=5;
    if(product.deliveryWindows.includes(input.deliveryWindow))score+=3;
    if(/birthday|milestone|anniversary/i.test(input.occasion)&&['ruby-roses','orchid','card'].includes(product.id))score+=2;
    return{...product,score};
  }).sort((a,b)=>b.score-a.score||a.priceCents-b.priceCents);
  const candidates=combinations(ranked.filter(product=>product.deliveryWindows.includes(input.deliveryWindow)),3)
    .map(products=>{const estimate=estimateConciergeCartTotal(products.map(product=>product.id),input.deliveryWindow);return{products,estimate,score:products.reduce((sum,product)=>sum+product.score,0)+products.length*2}})
    .filter(candidate=>candidate.estimate.totalCents<=budget)
    .sort((a,b)=>b.score-a.score||b.estimate.totalCents-a.estimate.totalCents);
  const fallback=ranked.map(product=>({products:[product],estimate:estimateConciergeCartTotal([product.id],input.deliveryWindow),score:product.score})).sort((a,b)=>a.estimate.totalCents-b.estimate.totalCents)[0]!;
  const name=input.recipientName.trim()||'your match';
  const moodCopy={romantic:'quietly romantic',playful:'light and playful',comforting:'warm and reassuring',celebratory:'made for the moment'}[input.mood];
  if(!candidates[0])return{
    recommendedProductIds:[],
    headline:`A little more room will unlock a thoughtful surprise`,
    reason:`No ${input.deliveryWindow.replace('_',' ')} cart fits the complete $${Math.round(budget/100)} checkout budget yet. The closest delivery-ready option is $${(fallback.estimate.totalCents/100).toFixed(2)} including estimated fees and tax.`,
    suggestedNote:`${name}, I’m thinking of you and saving the right surprise for the right moment. ❤️`,
    premiumDifferentiators:[
      {title:'Budget protected',body:'DestinyOne will not recommend a cart whose estimated complete checkout exceeds your limit.'},
      {title:'Relationship-aware curation',body:'Uses consented preferences and occasion context—not private chat text.'},
      {title:'Private surprise coordination',body:'Recipient confirms the address without revealing it to the sender.'},
      {title:'Premium fulfillment',body:'Inventory and courier coverage are checked before payment authorization.'},
    ],mode:'preview_rules',budgetCents:budget,estimatedTotalCents:0,estimatedSubtotalCents:0,
  };
  const chosen=candidates[0];
  return{
    recommendedProductIds:chosen.products.map(item=>item.id),
    headline:`A ${moodCopy} surprise for ${name}`,
    reason:`Balanced for your ${input.occasion.toLowerCase()} occasion, ${input.deliveryWindow.replace('_',' ')} timing and $${Math.round(budget/100)} total budget${input.city?` near ${input.city}`:''}. Estimated checkout total $${(chosen.estimate.totalCents/100).toFixed(2)}.`,
    suggestedNote:`${name}, I chose this because the little moments with you deserve to feel special. ❤️`,
    premiumDifferentiators:[
      {title:'Relationship-aware curation',body:'Uses consented preferences and occasion context—not private chat text.'},
      {title:'Private surprise coordination',body:'Recipient confirms the address without revealing it to the sender.'},
      {title:'Concierge rescue',body:'One in-app place for substitutions, late delivery, cancellation and support.'},
      {title:'Premium fulfillment',body:'Inventory and courier coverage are checked before payment authorization.'},
    ],
    mode:'preview_rules',
    budgetCents:budget,
    estimatedTotalCents:chosen.estimate.totalCents,
    estimatedSubtotalCents:chosen.estimate.subtotalCents,
  };
}
