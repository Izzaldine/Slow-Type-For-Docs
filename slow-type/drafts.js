export function saveDraft(drafts, {id, name, text}, makeId = () => crypto.randomUUID()) {
  name = String(name || '').trim();
  if (!name || name.length > 80) throw Error('Enter a draft name (1–80 characters).');
  if (typeof text !== 'string' || !text.trim()) throw Error('Add some text before saving.');
  if (text.length > 100000) throw Error('Use at most 100,000 characters.');
  const existing = drafts.find(d=>d.id===id);
  if (!existing && drafts.length>=30) throw Error('You can save up to 30 drafts. Delete one to make room.');
  const item={id:existing?.id || makeId(),name,text,updatedAt:Date.now()};
  return {id:item.id, drafts:[item,...drafts.filter(d=>d.id!==item.id)]};
}
export function deleteDraft(drafts,id) {return drafts.filter(d=>d.id!==id);}
