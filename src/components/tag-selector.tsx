'use client';
export type SelectableTag={id:string;slug:string;label:string};
export function TagSelector({tags,selected,onChange,max,label}:{tags:SelectableTag[];selected:string[];onChange:(ids:string[])=>void;max:number;label:string}){
  function toggle(id:string){if(selected.includes(id)){onChange(selected.filter(value=>value!==id));return;}if(selected.length<max)onChange([...selected,id]);}
  return <div className="tag-selector" aria-label={label}>{tags.map(tag=>{const active=selected.includes(tag.id);return <button key={tag.id} type="button" className={`selectable-chip${active?' selected':''}`} aria-pressed={active} onClick={()=>toggle(tag.id)} disabled={!active&&selected.length>=max}>{tag.label}</button>;})}<small className="muted">{selected.length} / {max}個</small></div>;
}
