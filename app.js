(() => {
  'use strict';
  const STORAGE_KEY = 'today-planner-data-v1';
  const CATEGORIES = ['餐饮','交通','购物','娱乐','学习','医疗','居住','其他'];
  const $ = id => document.getElementById(id);
  const refs = Object.fromEntries(['datePicker','dateText','weekdayLabel','greeting','summaryLine','saveStatus','taskStat','taskProgress','goalStat','goalProgress','expenseStat','expenseCount','taskBadge','taskProgressText','taskPercent','taskTrack','taskList','goalBadge','goalList','expenseList','expenseTotal','categorySummary','memoInput','memoStatus','memoCount','entryModal','entryForm','entryType','entryId','entryTitle','expenseFields','expenseAmount','expenseCategory','titleField','modalKicker','modalTitle','submitEntry','dataModal','importFile','toast'].map(id => [id,$(id)]));
  let store = loadStore();
  let selectedDate = localDateKey(new Date());
  let memoTimer;

  function localDateKey(date){ const d=new Date(date); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,10); }
  function parseDate(key){ const [y,m,d]=key.split('-').map(Number); return new Date(y,m-1,d); }
  function uid(){ return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`; }
  function blankDay(){ return {tasks:[],goals:[],expenses:[],memo:''}; }
  function day(){ return store.days[selectedDate] || (store.days[selectedDate]=blankDay()); }
  function loadStore(){ try { const value=JSON.parse(localStorage.getItem(STORAGE_KEY)); return validStore(value) ? value : {version:1,days:{}}; } catch { return {version:1,days:{}}; } }
  function validStore(value){ return !!value && value.version===1 && value.days && typeof value.days==='object' && !Array.isArray(value.days); }
  function persist(){ refs.saveStatus.classList.add('saving'); refs.saveStatus.lastChild.textContent=' 正在保存…'; localStorage.setItem(STORAGE_KEY,JSON.stringify(store)); setTimeout(()=>{refs.saveStatus.classList.remove('saving');refs.saveStatus.lastChild.textContent=' 已自动保存';},220); }
  function escapeHtml(value){ const span=document.createElement('span'); span.textContent=String(value); return span.innerHTML; }
  function money(n){ return `¥${Number(n).toFixed(2)}`; }
  function timeLabel(ts){ return new Date(ts).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false}); }
  function empty(message){ return `<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M6 5h12v14H6zM9 9h6M9 13h4"/></svg>${message}</div>`; }

  function render(){
    const data=day(), date=parseDate(selectedDate), now=new Date();
    refs.datePicker.value=selectedDate;
    refs.dateText.textContent=`${date.getMonth()+1}月${date.getDate()}日`;
    refs.weekdayLabel.textContent=date.toLocaleDateString('zh-CN',{weekday:'long'}).toUpperCase();
    const hour=now.getHours(), salutation=hour<6?'夜深了':hour<11?'上午好':hour<14?'中午好':hour<18?'下午好':'晚上好';
    refs.greeting.textContent=`${salutation}，${selectedDate===localDateKey(now)?'今天也要闪闪发光。':'规划好这充实的一天。'}`;
    renderTasks(data); renderGoals(data); renderExpenses(data); renderMemo(data); updateSummary(data);
  }
  function renderTasks(data){
    const done=data.tasks.filter(x=>x.done).length,total=data.tasks.length,pct=total?Math.round(done/total*100):0;
    refs.taskBadge.textContent=total; refs.taskStat.textContent=`${done} / ${total}`; refs.taskProgress.style.width=`${pct}%`; refs.taskPercent.textContent=`${pct}%`; refs.taskTrack.style.width=`${pct}%`; refs.taskProgressText.textContent=total?`已完成 ${done} 项，还剩 ${total-done} 项`:'尚未添加任务';
    refs.taskList.innerHTML=total?data.tasks.map(item=>listItem(item,'task')).join(''):empty('还没有任务，添加一项开始行动吧');
  }
  function renderGoals(data){
    const done=data.goals.filter(x=>x.done).length,total=data.goals.length,pct=total?Math.round(done/total*100):0;
    refs.goalBadge.textContent=total; refs.goalStat.textContent=`${pct}%`; refs.goalProgress.style.width=`${pct}%`;
    refs.goalList.innerHTML=total?data.goals.map(item=>listItem(item,'goal')).join(''):empty('写下今天最重要的目标');
  }
  function listItem(item,type){ return `<div class="list-item ${item.done?'is-done':''}" data-id="${item.id}" data-type="${type}"><button class="check ${item.done?'checked':''}" data-action="toggle" aria-label="${item.done?'标记为未完成':'标记为完成'}"></button><div class="item-copy"><strong>${escapeHtml(item.title)}</strong><small>${timeLabel(item.createdAt)} 添加</small></div><div class="item-actions"><button data-action="edit">编辑</button><button class="delete" data-action="delete">删除</button></div></div>`; }
  function renderExpenses(data){
    const total=data.expenses.reduce((sum,x)=>sum+Number(x.amount),0);
    refs.expenseStat.textContent=money(total); refs.expenseTotal.textContent=money(total); refs.expenseCount.textContent=data.expenses.length?`共 ${data.expenses.length} 笔记录`:'还没有花费记录';
    refs.expenseList.innerHTML=data.expenses.length?data.expenses.map(item=>`<div class="expense-row" data-id="${item.id}"><span class="expense-dot">${escapeHtml(item.category.slice(0,1))}</span><div class="expense-copy"><strong>${escapeHtml(item.category)}</strong><small>${escapeHtml(item.note||'无备注')} · ${timeLabel(item.createdAt)}</small></div><span class="expense-amount">-${money(item.amount)}</span><button class="expense-delete" data-expense-delete aria-label="删除此花费">×</button></div>`).join(''):empty('今天还没有花费记录');
    const grouped={}; data.expenses.forEach(x=>grouped[x.category]=(grouped[x.category]||0)+Number(x.amount));
    refs.categorySummary.innerHTML=Object.entries(grouped).sort((a,b)=>b[1]-a[1]).map(([cat,amount])=>`<div class="category-line"><span><i></i>${escapeHtml(cat)}</span><strong>${money(amount)}</strong></div>`).join('') || '<div class="category-line"><span>暂无分类</span><strong>—</strong></div>';
  }
  function renderMemo(data){ refs.memoInput.value=data.memo||''; refs.memoCount.textContent=`${refs.memoInput.value.length} / 3000`; refs.memoStatus.textContent='输入内容将自动保存'; }
  function updateSummary(data){ const remaining=data.tasks.filter(x=>!x.done).length; refs.summaryLine.textContent=remaining?`今天还有 ${remaining} 项任务等待完成，稳稳向前。`:data.tasks.length?'今日任务已全部完成，做得真棒！':'准备好开启充实的一天了吗？'; }

  function changeDate(offset){ saveMemoNow(); const date=parseDate(selectedDate); date.setDate(date.getDate()+offset); selectedDate=localDateKey(date); render(); }
  function openEntry(type,item){
    refs.entryType.value=type; refs.entryId.value=item?.id||''; refs.entryTitle.value=item?.title||item?.note||'';
    const isExpense=type==='expense'; refs.expenseFields.hidden=!isExpense; refs.titleField.firstChild.textContent=isExpense?'备注（可选）':'内容'; refs.modalKicker.textContent=item?'EDIT ITEM':isExpense?'NEW EXPENSE':type==='goal'?'NEW GOAL':'NEW TASK'; refs.modalTitle.textContent=`${item?'编辑':'添加'}${isExpense?'花费':type==='goal'?'目标':'任务'}`; refs.submitEntry.textContent=item?'保存修改':'确认添加';
    if(isExpense){refs.expenseAmount.value=item?.amount||'';refs.expenseCategory.value=item?.category||CATEGORIES[0];}
    refs.entryModal.hidden=false; setTimeout(()=>(isExpense?refs.expenseAmount:refs.entryTitle).focus(),30);
  }
  function closeEntry(){ refs.entryModal.hidden=true; refs.entryForm.reset(); }
  function handleSubmit(event){
    event.preventDefault(); const type=refs.entryType.value,id=refs.entryId.value,title=refs.entryTitle.value.trim();
    if(type!=='expense'&&!title){toast('请输入内容');refs.entryTitle.focus();return;}
    if(type==='expense'){
      const raw=refs.expenseAmount.value.trim(),amount=Number(raw); if(!/^\d+(\.\d{1,2})?$/.test(raw)||amount<=0){toast('请输入大于 0 且最多两位小数的金额');refs.expenseAmount.focus();return;}
      day().expenses.push({id:uid(),amount:Number(amount.toFixed(2)),category:CATEGORIES.includes(refs.expenseCategory.value)?refs.expenseCategory.value:'其他',note:title,createdAt:Date.now()});
    } else { const list=type==='task'?day().tasks:day().goals; const item=list.find(x=>x.id===id); if(item)item.title=title;else list.push({id:uid(),title,done:false,createdAt:Date.now()}); }
    persist();render();closeEntry();toast(id?'已保存修改':'添加成功');
  }
  function handleList(event){ const action=event.target.dataset.action;if(!action)return;const row=event.target.closest('.list-item'),list=row.dataset.type==='task'?day().tasks:day().goals,index=list.findIndex(x=>x.id===row.dataset.id);if(index<0)return;if(action==='toggle')list[index].done=!list[index].done;if(action==='edit'){openEntry(row.dataset.type,list[index]);return;}if(action==='delete'&&confirm('确定删除这一项吗？'))list.splice(index,1);persist();render(); }
  function saveMemoNow(){ clearTimeout(memoTimer); const value=refs.memoInput.value; if(day().memo!==value){day().memo=value;persist();} }
  function toast(message){ refs.toast.textContent=message;refs.toast.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>refs.toast.classList.remove('show'),1800); }
  function exportData(){ const blob=new Blob([JSON.stringify(store,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`今日日程备份-${localDateKey(new Date())}.json`;a.click();URL.revokeObjectURL(url);toast('备份已导出'); }
  function sanitizeImported(value){
    if(!validStore(value))throw new Error('格式不正确'); const clean={version:1,days:{}};
    for(const [key,d] of Object.entries(value.days)){ if(!/^\d{4}-\d{2}-\d{2}$/.test(key)||!d||typeof d!=='object')continue; clean.days[key]={tasks:Array.isArray(d.tasks)?d.tasks.filter(validItem).map(x=>({id:String(x.id),title:String(x.title).trim().slice(0,120),done:!!x.done,createdAt:Number(x.createdAt)||Date.now()})):[],goals:Array.isArray(d.goals)?d.goals.filter(validItem).map(x=>({id:String(x.id),title:String(x.title).trim().slice(0,120),done:!!x.done,createdAt:Number(x.createdAt)||Date.now()})):[],expenses:Array.isArray(d.expenses)?d.expenses.filter(x=>x&&Number(x.amount)>0).map(x=>({id:String(x.id||uid()),amount:Number(Number(x.amount).toFixed(2)),category:CATEGORIES.includes(x.category)?x.category:'其他',note:String(x.note||'').trim().slice(0,120),createdAt:Number(x.createdAt)||Date.now()})):[],memo:typeof d.memo==='string'?d.memo.slice(0,3000):''}; }
    return clean;
  }
  function validItem(x){return x&&x.id!=null&&typeof x.title==='string'&&x.title.trim();}

  $('prevDay').addEventListener('click',()=>changeDate(-1)); $('nextDay').addEventListener('click',()=>changeDate(1)); $('todayButton').addEventListener('click',()=>{saveMemoNow();selectedDate=localDateKey(new Date());render();});
  refs.datePicker.addEventListener('change',()=>{if(refs.datePicker.value){saveMemoNow();selectedDate=refs.datePicker.value;render();}});
  document.querySelectorAll('[data-open]').forEach(btn=>btn.addEventListener('click',()=>openEntry(btn.dataset.open)));
  document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',closeEntry)); refs.entryModal.addEventListener('click',e=>{if(e.target===refs.entryModal)closeEntry();});refs.entryForm.addEventListener('submit',handleSubmit);
  refs.taskList.addEventListener('click',handleList);refs.goalList.addEventListener('click',handleList);
  refs.expenseList.addEventListener('click',e=>{const btn=e.target.closest('[data-expense-delete]');if(!btn)return;const id=btn.closest('.expense-row').dataset.id;if(confirm('确定删除这笔花费吗？')){day().expenses=day().expenses.filter(x=>x.id!==id);persist();render();toast('已删除花费');}});
  refs.memoInput.addEventListener('input',()=>{refs.memoCount.textContent=`${refs.memoInput.value.length} / 3000`;refs.memoStatus.textContent='正在输入…';clearTimeout(memoTimer);memoTimer=setTimeout(()=>{saveMemoNow();refs.memoStatus.textContent='已自动保存';},500);});refs.memoInput.addEventListener('blur',saveMemoNow);
  $('dataButton').addEventListener('click',()=>refs.dataModal.hidden=false);document.querySelector('[data-data-close]').addEventListener('click',()=>refs.dataModal.hidden=true);refs.dataModal.addEventListener('click',e=>{if(e.target===refs.dataModal)refs.dataModal.hidden=true;});
  $('exportButton').addEventListener('click',exportData);$('importButton').addEventListener('click',()=>refs.importFile.click());refs.importFile.addEventListener('change',async()=>{const file=refs.importFile.files[0];if(!file)return;try{const imported=sanitizeImported(JSON.parse(await file.text()));if(!confirm('导入将覆盖当前全部数据，确定继续吗？'))return;store=imported;persist();render();refs.dataModal.hidden=true;toast('数据恢复成功');}catch{toast('备份文件无效，未修改现有数据');}finally{refs.importFile.value='';}});
  $('clearButton').addEventListener('click',()=>{if(confirm('确定清空所有日期的数据吗？此操作无法撤销。')){store={version:1,days:{}};persist();render();refs.dataModal.hidden=true;toast('所有数据已清空');}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeEntry();refs.dataModal.hidden=true;}});window.addEventListener('beforeunload',saveMemoNow);
  render();
})();
