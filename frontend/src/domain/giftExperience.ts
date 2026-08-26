import type {GiftCommerceProduct,GiftCurrency} from './giftCommerce';
import {convertGiftMinor,resolveGiftMarket} from './giftCommerce';

export type GiftDeliverySlot='recipient_choice'|'morning'|'afternoon'|'evening';
export type GiftRecipientAvailability='confirm_before_dispatch'|'available'|'not_sure';
export type GiftMomentKind='scheduled_message'|'voice_note'|'digital_card'|'photo_memory'|'date_invitation'|'playlist'|'couple_game';
export type GiftReaction='loved_it'|'thoughtful'|'made_me_smile'|'not_my_style';

export type GiftMomentSelection={kind:GiftMomentKind;enabled:boolean;value?:string};
export type GiftConciergeV2Option={
  productId:string;
  reason:string;
  estimatedTotalMinor:number;
  deliveryConfidence:'high'|'medium';
  caution:string;
};

export type GiftConciergeV2Plan={
  prompt:string;
  budgetMinor:number;
  inferredMood:'romantic'|'playful'|'comforting'|'celebratory';
  inferredDelivery:'asap'|'today'|'scheduled';
  options:GiftConciergeV2Option[];
  privacyNote:string;
  mode:'rules_fallback'|'live_ai';
};

export function parseGiftConciergePrompt(prompt:string,currency:GiftCurrency,fallbackBudgetMinor:number){
  const normalized=prompt.trim().toLowerCase();
  const amountMatch=normalized.match(/(?:₹|rs\.?|inr|\$|usd|cad\$?)\s*(\d[\d,]*)|(\d[\d,]*)\s*(?:₹|rs\.?|inr|\$|usd|cad)/i);
  const rawAmount=Number((amountMatch?.[1]??amountMatch?.[2]??'').replace(/,/g,''));
  const budgetMinor=Number.isFinite(rawAmount)&&rawAmount>0?Math.round(rawAmount*100):fallbackBudgetMinor;
  const inferredMood=/upset|sad|sorry|apolog|comfort|naraz|नाराज़|उदास/.test(normalized)?'comforting':/birthday|celebrat|promotion|congrat/.test(normalized)?'celebratory':/fun|funny|playful|masti/.test(normalized)?'playful':'romantic';
  const inferredDelivery=/today|aaj|आज|asap|urgent|abhi|अभी/.test(normalized)?'today':/tomorrow|kal|कल|schedule|date/.test(normalized)?'scheduled':'asap';
  return{budgetMinor,currency,inferredMood,inferredDelivery} as const;
}

function estimateOptionTotal(product:GiftCommerceProduct,currency:GiftCurrency,delivery:'asap'|'today'|'scheduled'){
  const deliveryMinor=convertGiftMinor(product.deliveryFeeCents,currency);
  const rushMinor=delivery==='asap'&&product.serviceLevel!=='scheduled'?convertGiftMinor(299,currency):0;
  const serviceMinor=Math.max(convertGiftMinor(199,currency),Math.round(product.localizedPriceMinor*.065));
  const taxable=product.localizedPriceMinor+deliveryMinor+rushMinor+serviceMinor;
  return taxable+Math.round(taxable*resolveGiftMarket(currency==='INR'?'IN':currency==='CAD'?'CA':'US').taxRate);
}

export function buildGiftConciergeV2Plan(input:{
  prompt:string;
  products:GiftCommerceProduct[];
  currency:GiftCurrency;
  fallbackBudgetMinor:number;
  previousProductIds?:string[];
  relationshipStage?:'new_match'|'dating'|'committed';
}):GiftConciergeV2Plan{
  const parsed=parseGiftConciergePrompt(input.prompt,input.currency,input.fallbackBudgetMinor);
  const previous=new Set(input.previousProductIds??[]);
  const candidates=input.products.filter(product=>!previous.has(product.id)&&product.availability!=='sold_out'&&product.availability!=='waitlist').map(product=>{
    const total=estimateOptionTotal(product,input.currency,parsed.inferredDelivery);
    let score=product.moods.includes(parsed.inferredMood)?6:1;
    if(product.deliveryWindows.includes(parsed.inferredDelivery))score+=4;
    if(total<=parsed.budgetMinor)score+=5;else score-=Math.ceil((total-parsed.budgetMinor)/Math.max(500,input.currency==='INR'?10000:500));
    if(product.availability==='available')score+=2;
    return{product,total,score};
  }).filter(item=>item.total<=parsed.budgetMinor).sort((a,b)=>b.score-a.score||b.product.rating-a.product.rating||a.total-b.total).slice(0,3);
  const upset=/upset|sad|sorry|apolog|naraz|नाराज़|उदास/i.test(input.prompt);
  return{
    prompt:input.prompt.trim(),
    budgetMinor:parsed.budgetMinor,
    inferredMood:parsed.inferredMood,
    inferredDelivery:parsed.inferredDelivery,
    options:candidates.map(({product,total})=>({
      productId:product.id,
      reason:upset?`${product.name} feels warm and low-pressure without making the moment heavier.`:`${product.name} matches the ${parsed.inferredMood} feeling, timing and complete budget.`,
      estimatedTotalMinor:total,
      deliveryConfidence:product.availability==='available'&&product.deliveryWindows.includes(parsed.inferredDelivery)?'high':'medium',
      caution:upset?'Avoid jokes, apology pressure or an overly expensive gesture.':input.relationshipStage==='new_match'?'Keep the note light and avoid an overly intense message.':'No relationship-boundary concern detected.',
    })),
    privacyNote:'Uses only the prompt you chose to submit, consented preferences and order history—not private chat content.',
    mode:'rules_fallback',
  };
}

export function buildGiftPriceBreakdown(input:{
  productSubtotalMinor:number;
  addOnSubtotalMinor:number;
  deliveryMinor:number;
  serviceMinor:number;
  taxMinor:number;
  discountMinor:number;
  tipMinor:number;
}){
  const finalPayableMinor=Math.max(0,input.productSubtotalMinor+input.addOnSubtotalMinor+input.deliveryMinor+input.serviceMinor+input.taxMinor-input.discountMinor+input.tipMinor);
  return{...input,refundableAuthorizationMinor:finalPayableMinor,finalPayableMinor};
}

export function giftReactionSignals(reaction:GiftReaction){
  return reaction==='not_my_style'?{learningSignal:'delivered_negative' as const,score:-4}:{learningSignal:'delivered_positive' as const,score:reaction==='loved_it'?4:reaction==='made_me_smile'?3.5:3};
}

export const giftMomentOptions:Array<{kind:GiftMomentKind;label:string;description:string;icon:string}>=[
  {kind:'scheduled_message',label:'Scheduled message',description:'Send your note when the gift arrives.',icon:'chatbubble-ellipses-outline'},
  {kind:'voice_note',label:'Voice note',description:'Attach a warm private recording.',icon:'mic-outline'},
  {kind:'digital_card',label:'Digital card',description:'Add a polished card inside Chat.',icon:'mail-open-outline'},
  {kind:'photo_memory',label:'Photo memory',description:'Share one meaningful photo.',icon:'images-outline'},
  {kind:'date_invitation',label:'Date invitation',description:'Suggest the next moment together.',icon:'calendar-outline'},
  {kind:'playlist',label:'Playlist link',description:'Add music for the mood.',icon:'musical-notes-outline'},
  {kind:'couple_game',label:'Couple-game prompt',description:'Unlock a playful prompt after delivery.',icon:'game-controller-outline'},
];
