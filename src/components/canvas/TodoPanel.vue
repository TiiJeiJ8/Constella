<template>
    <div class="todo-wrap">
        <button v-if="!isOpen" class="todo-fab" @click="open">
            <svg class="fab-icon" viewBox="0 0 24 24"><rect x="5.5" y="4.5" width="13" height="15" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M8 10l2.5 2.5 5-5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/></svg>
            <span class="fab-badge">{{ incCnt }}</span>
        </button>
        <div v-else ref="panelRef" class="todo-panel" :style="panelStyle" @mousedown.stop>
            <div class="tp-head" @mousedown.prevent="startDrag">
                <span class="tp-title">TODO</span>
                <div class="tp-head-actions">
                    <button class="tp-mini-btn" @click="resize({w:300,h:400})" title="small">S</button>
                    <button class="tp-mini-btn" @click="resize({w:420,h:600})" title="large">L</button>
                    <button class="tp-close" @click="isOpen=false">&times;</button>
                </div>
            </div>
            <div class="tp-add">
                <div class="tp-row1">
                    <input v-model="txt" class="tp-inp" placeholder="add todo..." @keydown.enter="add" />
                    <button class="tp-addbtn" :disabled="!txt.trim()" @click="add">+</button>
                </div>
                <div class="tp-row2">
                    <input v-model="ddlD" type="date" class="tp-date" />
                    <button class="tp-qd" @click="setQ('today')">today</button>
                    <button class="tp-qd" @click="setQ('tomorrow')">tmr</button>
                    <button class="tp-qd" @click="setQ('weekend')">wknd</button>
                </div>
            </div>
            <div class="tp-list" ref="listRef">
                <div v-if="sorted.length===0" class="tp-empty">empty</div>
                <div v-for="item in sorted" :key="item.id" class="tp-row" :class="{done:item.done}">
                    <button class="tp-cb" :class="{chk:item.done}" @click="tog(item.id)">
                        <svg v-if="item.done" class="tp-cbic" viewBox="0 0 24 24"><path d="M6 12.5 10 16.5 18 8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2"/></svg>
                    </button>
                    <div class="tp-body">
                        <span class="tp-lbl" :class="{done:item.done}">{{ item.text }}</span>
                        <div class="tp-meta">
                            <button class="tp-assign" @click.stop="toggleAssign(item.id)">{{ assignName(item) }}</button>
                            <span v-if="item.dueDate" class="tp-date-label">{{ fmtDate(item.dueDate) }}</span>
                        </div>
                        <div v-if="activeAssign===item.id" class="tp-dropdown" @click.stop>
                            <div v-for="u in members" :key="u.id" class="tp-drop-item" :class="{sel:item.assigneeId===u.id}" @click="setAssign(item.id,u)">{{ u.name }}<span v-if="u.isMe"> (me)</span></div>
                            <div v-if="item.assigneeId" class="tp-drop-div"></div>
                            <div v-if="item.assigneeId" class="tp-drop-item danger" @click="clearAssign(item.id)">remove</div>
                        </div>
                    </div>
                    <button class="tp-del" @click="del(item.id)">&#x1F5D1;</button>
                </div>
            </div>
            <div class="tp-resize-handle" @mousedown.prevent="startResize"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
interface Todo { id:string; text:string; done:boolean; dueDate?:string; assigneeId?:string; assigneeName?:string; createdAt:number }
interface UserOpt { id:string; name:string; isMe:boolean }
defineProps<{ members: UserOpt[] }>()
const isOpen=ref(false)
const txt=ref('')
const ddlD=ref('')
const todos=ref<Todo[]>([])
const activeAssign=ref<string|null>(null)
const listRef=ref<HTMLElement|null>(null)
const panelRef=ref<HTMLElement|null>(null)
const SK='ctodo2'
const panelX=ref(0), panelY=ref(0), dragOffX=ref(0), dragOffY=ref(0), isDrag=ref(false)
const pw=ref(320), ph=ref(400), resizing=ref(false), resOffX=ref(0), resOffY=ref(0)
const panelStyle=computed(()=>{
    return isDrag.value||panelX.value!==0||panelY.value!==0
        ? { position:'fixed', left:panelX.value+'px', top:panelY.value+'px', width:pw.value+'px', height:ph.value+'px' }
        : { width:pw.value+'px', height:ph.value+'px' }
})
const incCnt=computed(()=>todos.value.filter(t=>!t.done).length)
const sorted=computed(()=>[...todos.value].sort((a,b)=>{
    if(a.done!==b.done)return a.done?1:-1
    const aD=!!a.dueDate,bD=!!b.dueDate
    if(aD!==bD)return aD?-1:1
    if(aD)return new Date(a.dueDate!).getTime()-new Date(b.dueDate!).getTime()
    return b.createdAt-a.createdAt
}))
function open(){
    const btn=document.querySelector('.todo-fab')
    if(btn){const r=btn.getBoundingClientRect();panelX.value=r.left;panelY.value=r.bottom+4}
    isOpen.value=true
}
function genId(){return't'+Date.now()+'-'+Math.random().toString(36).slice(2,6)}
function add(){
    const t=txt.value.trim();if(!t)return
    let dd:string|undefined
    if(ddlD.value)dd=new Date(ddlD.value+'T12:00').toISOString()
    todos.value.unshift({id:genId(),text:t,done:false,dueDate:dd,createdAt:Date.now()})
    txt.value='';ddlD.value='';save()
    nextTick(()=>listRef.value&&(listRef.value.scrollTop=0))
}
function setQ(tp:'today'|'tomorrow'|'weekend'){
    const d=new Date()
    if(tp==='tomorrow')d.setDate(d.getDate()+1)
    else if(tp==='weekend'){const dw=d.getDay();d.setDate(d.getDate()+(dw<=5?6-dw:1))}
    ddlD.value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')
}
function fmtDate(d:string):string{const dt=new Date(d);return (dt.getMonth()+1)+'/'+dt.getDate()}
function tog(id:string){const i=todos.value.find(t=>t.id===id);if(i){i.done=!i.done;save()}}
function del(id:string){todos.value=todos.value.filter(t=>t.id!==id);save()}
function toggleAssign(id:string){activeAssign.value=activeAssign.value===id?null:id}
function assignName(item:Todo):string{return item.assigneeName||'assign'}
function setAssign(id:string,u:UserOpt){
    const i=todos.value.find(t=>t.id===id)
    if(i){i.assigneeId=u.id;i.assigneeName=u.name;activeAssign.value=null;save()}
}
function clearAssign(id:string){
    const i=todos.value.find(t=>t.id===id)
    if(i){i.assigneeId=undefined;i.assigneeName=undefined;activeAssign.value=null;save()}
}
function startDrag(e:MouseEvent){
    if(!panelRef.value)return;const r=panelRef.value.getBoundingClientRect()
    panelX.value=r.left;panelY.value=r.top;isDrag.value=true
    dragOffX.value=e.clientX-r.left;dragOffY.value=e.clientY-r.top
    document.addEventListener('mousemove',onDrag);document.addEventListener('mouseup',stopDrag)
}
function onDrag(e:MouseEvent){panelX.value=e.clientX-dragOffX.value;panelY.value=e.clientY-dragOffY.value}
function stopDrag(){isDrag.value=false;document.removeEventListener('mousemove',onDrag);document.removeEventListener('mouseup',stopDrag)}
function startResize(e:MouseEvent){
    if(!panelRef.value)return;const r=panelRef.value.getBoundingClientRect()
    pw.value=r.width;ph.value=r.height;resizing.value=true
    resOffX.value=e.clientX;resOffY.value=e.clientY
    document.addEventListener('mousemove',onResize);document.addEventListener('mouseup',stopResize)
}
function onResize(e:MouseEvent){
    pw.value=Math.max(280,pw.value+(e.clientX-resOffX.value))
    ph.value=Math.max(300,ph.value+(e.clientY-resOffY.value))
    resOffX.value=e.clientX;resOffY.value=e.clientY
}
function stopResize(){resizing.value=false;document.removeEventListener('mousemove',onResize);document.removeEventListener('mouseup',stopResize)}
function resize(sz:{w:number,h:number}){pw.value=sz.w;ph.value=sz.h}
function onClick(e:MouseEvent){
    const t=e.target as HTMLElement
    if(!t.closest('.todo-panel')&&!t.closest('.todo-fab')){activeAssign.value=null}
}
function save(){try{localStorage.setItem(SK,JSON.stringify(todos.value))}catch{}}
function load(){try{const r=localStorage.getItem(SK);if(r)todos.value=JSON.parse(r)}catch{}}
onMounted(()=>{load();document.addEventListener('click',onClick)})
onUnmounted(()=>{
    document.removeEventListener('mousemove',onDrag);document.removeEventListener('mouseup',stopDrag)
    document.removeEventListener('mousemove',onResize);document.removeEventListener('mouseup',stopResize)
    document.removeEventListener('click',onClick)
})
</script>

<style scoped>
.todo-wrap{position:relative;display:inline-flex;align-items:center}
.todo-fab{display:inline-flex;align-items:center;gap:4px;padding:6px 10px;border-radius:12px;background:var(--canvas-toolbar-bg);backdrop-filter:blur(20px);border:1px solid var(--border-color);color:var(--text-primary);cursor:pointer;font-size:12px;transition:all .2s;white-space:nowrap}
.todo-fab:hover{border-color:var(--color-primary)}
.fab-icon{width:16px;height:16px;display:block}
.fab-badge{min-width:18px;height:18px;padding:0 5px;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;background:var(--color-primary);color:#fff;font-size:10px;font-weight:700}
.todo-panel{background:var(--canvas-panel-bg);backdrop-filter:blur(20px);border:1px solid var(--border-color);border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.12);z-index:200;overflow:hidden;display:flex;flex-direction:column;position:fixed}
.tp-head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px 6px;cursor:grab;flex-shrink:0}
.tp-head:active{cursor:grabbing}
.tp-title{font-size:14px;font-weight:600;color:var(--text-primary)}
.tp-head-actions{display:flex;align-items:center;gap:4px}
.tp-mini-btn{width:24px;height:24px;border-radius:6px;border:1px solid var(--border-color);background:transparent;color:var(--text-tertiary);font-size:10px;font-weight:700;cursor:pointer;transition:all .15s}
.tp-mini-btn:hover{background:var(--bg-tertiary);color:var(--text-primary)}
.tp-close{width:26px;height:26px;border-radius:6px;border:none;background:transparent;color:var(--text-secondary);font-size:16px;cursor:pointer;line-height:1}
.tp-close:hover{background:var(--bg-tertiary);color:var(--text-primary)}
.tp-add{display:flex;flex-direction:column;gap:6px;padding:2px 14px 8px;flex-shrink:0}
.tp-row1{display:flex;gap:6px}
.tp-inp{flex:1;height:30px;padding:0 10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);font-size:13px;outline:none}
.tp-inp:focus{border-color:var(--color-primary)}
.tp-addbtn{width:30px;height:30px;border-radius:8px;border:none;background:var(--color-primary);color:#fff;font-size:16px;cursor:pointer;line-height:1;flex-shrink:0}
.tp-addbtn:disabled{opacity:.4;cursor:default}
.tp-row2{display:flex;gap:4px;align-items:center;flex-wrap:wrap}
.tp-date{flex:1;min-width:100px;height:26px;padding:0 6px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);font-size:11px;outline:none}
.tp-date:focus{border-color:var(--color-primary)}
.tp-qd{height:26px;padding:0 8px;border-radius:6px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-secondary);font-size:10px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap}
.tp-qd:hover{background:var(--bg-tertiary);color:var(--text-primary);border-color:var(--color-primary)}
.tp-list{flex:1;overflow-y:auto;padding:0 8px 8px;display:flex;flex-direction:column;gap:1px}
.tp-list::-webkit-scrollbar{width:4px}
.tp-list::-webkit-scrollbar-thumb{background:var(--border-color);border-radius:2px}
.tp-empty{padding:20px;text-align:center;color:var(--text-tertiary);font-size:13px}
.tp-row{display:flex;align-items:flex-start;gap:6px;padding:6px 8px;border-radius:8px;transition:background .15s}
.tp-row:hover{background:var(--bg-secondary)}
.tp-cb{width:20px;height:20px;min-width:20px;margin-top:1px;border-radius:6px;border:2px solid var(--border-color);background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;color:transparent;transition:all .15s}
.tp-cb:hover{border-color:var(--color-primary)}
.tp-cb.chk{background:var(--color-primary);border-color:var(--color-primary);color:#fff}
.tp-cbic{width:14px;height:14px;display:block}
.tp-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.tp-lbl{font-size:13px;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;line-height:1.4}
.tp-lbl.done{text-decoration:line-through;color:var(--text-tertiary)}
.tp-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.tp-assign{font-size:11px;padding:2px 7px;border-radius:6px;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.15);color:#6366f1;cursor:pointer;transition:all .15s;white-space:nowrap}
.tp-assign:hover{background:rgba(99,102,241,0.15)}
.tp-date-label{font-size:11px;color:var(--text-secondary);white-space:nowrap}
.tp-dropdown{margin-top:4px;background:var(--canvas-panel-bg);backdrop-filter:blur(20px);border:1px solid var(--border-color);border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.12);padding:4px;position:relative;z-index:300}
.tp-drop-item{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;font-size:12px;color:var(--text-primary);cursor:pointer;transition:background .15s}
.tp-drop-item:hover{background:var(--bg-secondary)}
.tp-drop-item.sel{background:rgba(102,126,234,0.08);color:var(--color-primary)}
.tp-drop-item.danger{color:#ef4444}
.tp-drop-item.danger:hover{background:rgba(239,68,68,0.08)}
.tp-drop-div{height:1px;margin:3px 6px;background:var(--border-color)}
.tp-del{width:24px;height:24px;min-width:24px;margin-top:1px;border-radius:6px;border:none;background:transparent;color:var(--text-tertiary);cursor:pointer;opacity:0;transition:all .15s;display:flex;align-items:center;justify-content:center;font-size:16px}
.tp-row:hover .tp-del{opacity:1}
.tp-del:hover{background:rgba(239,68,68,.12);color:#ef4444}
.tp-resize-handle{position:absolute;bottom:0;right:0;width:16px;height:16px;cursor:nwse-resize;background:linear-gradient(135deg,transparent 50%,var(--text-tertiary) 50%);opacity:.3;transition:opacity .2s}
.tp-resize-handle:hover{opacity:.7}
</style>
