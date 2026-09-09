type Tag={id?:string;slug?:string;label:string};
export function TagPills({tags,limit,tone='default'}:{tags:Tag[];limit?:number;tone?:'default'|'orange'}){
  const visible=typeof limit==='number'?tags.slice(0,limit):tags;
  const rest=tags.length-visible.length;
  if(!tags.length)return null;
  return <div className="tag-pills">{visible.map((tag,index)=><span className={tone==='orange'?'tag-pill orange-pill':'tag-pill'} key={tag.id??tag.slug??`${tag.label}-${index}`}>#{tag.label}</span>)}{rest>0&&<span className="tag-pill">+{rest}</span>}</div>;
}

export function DiningTypePills({relations,limit=3}:{relations:{diningType:Tag}[];limit?:number}){
  return <TagPills tags={relations.map(relation=>relation.diningType)} limit={limit}/>;
}
