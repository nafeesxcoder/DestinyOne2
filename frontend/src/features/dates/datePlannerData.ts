export const dateCategories=[
  {name:'Café',icon:'cafe' as const},
  {name:'Walk',icon:'leaf' as const},
  {name:'Dinner',icon:'restaurant' as const},
  {name:'Activity',icon:'color-palette' as const},
];
export type DateVenue={id:string;name:string;category:string;area:string;price:string;vibe:string;icon:string};
export const dateVenues:DateVenue[]=[
  {id:'cafe-1',name:'Juniper Café',category:'Café',area:'Near the city center',price:'$$',vibe:'Quiet tables · Great conversation',icon:'☕'},
  {id:'cafe-2',name:'The Garden Coffee Room',category:'Café',area:'A lively public neighborhood',price:'$$',vibe:'Bright · Relaxed · Weekend-friendly',icon:'🌿'},
  {id:'walk-1',name:'Riverside Promenade',category:'Walk',area:'Popular waterfront area',price:'Free',vibe:'Scenic · Public · Easygoing',icon:'🌅'},
  {id:'walk-2',name:'Botanical Garden Stroll',category:'Walk',area:'Central garden district',price:'$',vibe:'Calm · Beautiful · Daytime',icon:'🌷'},
  {id:'dinner-1',name:'Candlelight Kitchen',category:'Dinner',area:'Restaurant district',price:'$$$',vibe:'Warm · Vegetarian-friendly options',icon:'🍽️'},
  {id:'dinner-2',name:'Spice & Stories',category:'Dinner',area:'Busy public square',price:'$$',vibe:'Indian-inspired · Conversation-friendly',icon:'✨'},
  {id:'activity-1',name:'Clay & Chai Studio',category:'Activity',area:'Arts district',price:'$$',vibe:'Creative · Low pressure · Memorable',icon:'🎨'},
  {id:'activity-2',name:'Mini Golf Social',category:'Activity',area:'Entertainment district',price:'$$',vibe:'Playful · Public · Easy icebreaker',icon:'⛳'},
];
export const dateTimes=['Friday · 7:00 PM','Saturday · 11:00 AM','Saturday · 5:00 PM','Sunday · 4:00 PM'];
