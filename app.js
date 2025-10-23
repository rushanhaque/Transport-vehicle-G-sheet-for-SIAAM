const S = {
  rcv: 'receivings',
  exp: 'expenses'
}

function nowISO() { return new Date().toISOString() }
function todayStr() { return new Date().toISOString().slice(0,10) }
function fmtCurrency(n) { return (Number(n)||0).toFixed(2) }

function load(key){ try { return JSON.parse(localStorage.getItem(key)||'[]') } catch { return [] } }
function save(key, arr){ localStorage.setItem(key, JSON.stringify(arr)) }

const el = id => document.getElementById(id)
const views = {
  main: el('mainView'),
  receiving: el('receivingView'),
  expense: el('expenseView'),
  report: el('reportView')
}

function show(view){
  Object.values(views).forEach(v=>v.classList.add('hidden'))
  view.classList.remove('hidden')
}

function setStamp(){
  el('dateStamp').textContent = new Date().toLocaleString()
  el('rcvTimestamp').value = nowISO()
  el('rcvDate').value = todayStr()
  el('expTimestamp').value = nowISO()
  el('expBillDate').value = todayStr()
}

setStamp()
setInterval(()=> el('dateStamp').textContent = new Date().toLocaleString(), 60000)

el('goReceiving').onclick = () => { setStamp(); show(views.receiving) }
el('goExpense').onclick = () => { setStamp(); show(views.expense) }
el('goReport').onclick = () => { show(views.report); buildReport() }

el('backFromReceiving').onclick = () => show(views.main)
el('backFromExpense').onclick = () => show(views.main)
el('backFromReport').onclick = () => show(views.main)

// VAT bill handling
el('expVat').addEventListener('change', (e)=> {
  const isVAT = e.target.value === 'VAT'
  const vatInputs = el('vatInputs')
  if(isVAT) {
    vatInputs.classList.remove('hidden')
    el('expVatAmount').setAttribute('required', 'required')
  } else {
    vatInputs.classList.add('hidden')
    el('expVatAmount').removeAttribute('required')
    el('expVatAmount').value = ''
    el('calcNetAmount').textContent = '0.00'
    el('calcGrossAmount').textContent = '0.00'
    el('expAmount').removeAttribute('readonly')
  }
})

// VAT amount calculation
el('expVatAmount').addEventListener('input', (e)=> {
  const vatAmt = Number(e.target.value) || 0
  const netAmt = vatAmt / 0.15
  const grossAmt = netAmt + vatAmt
  el('calcNetAmount').textContent = fmtCurrency(netAmt)
  el('calcGrossAmount').textContent = fmtCurrency(grossAmt)
  el('expAmount').value = fmtCurrency(grossAmt)
  el('expAmount').setAttribute('readonly', 'readonly')
})

// Expense type "Other" makes description mandatory
el('expType').addEventListener('change', (e)=> {
  const isOther = e.target.value === 'Other'
  const descField = el('expDesc')
  if(isOther) {
    descField.setAttribute('required', 'required')
    descField.placeholder = 'Description (required for Other type)'
  } else {
    descField.removeAttribute('required')
    descField.placeholder = 'Description'
  }
})

el('receivingForm').addEventListener('submit', (e)=>{
  e.preventDefault()
  const rec = {
    id: crypto.randomUUID(),
    ts: el('rcvTimestamp').value,
    date: el('rcvDate').value,
    amount: Number(el('rcvAmount').value),
    mode: el('rcvMode').value,
    desc: el('rcvDesc').value?.trim()||''
  }
  if(!rec.date || !(rec.amount>0)) return
  const arr = load(S.rcv)
  arr.push(rec)
  save(S.rcv, arr)
  e.target.reset()
  setStamp()
  alert('Saved')
})

el('expenseForm').addEventListener('submit', (e)=>{
  e.preventDefault()
  const expType = el('expType').value
  const expDesc = el('expDesc').value?.trim()||''
  
  // Validate expense type
  if(!expType) {
    alert('Please select Type of Expense')
    return
  }
  
  // Validate description for "Other" type
  if(expType === 'Other' && !expDesc) {
    alert('Description is required when expense type is "Other"')
    return
  }
  
  const isVAT = el('expVat').value === 'VAT'
  const vatAmount = isVAT ? Number(el('expVatAmount').value) : 0
  const netAmount = isVAT ? vatAmount / 0.15 : 0
  const grossAmount = isVAT ? netAmount + vatAmount : 0
  
  const exp = {
    id: crypto.randomUUID(),
    ts: el('expTimestamp').value,
    billDate: el('expBillDate').value,
    amount: Number(el('expAmount').value),
    vat: el('expVat').value,
    vatAmount: isVAT ? vatAmount : null,
    netAmount: isVAT ? netAmount : null,
    grossAmount: isVAT ? grossAmount : null,
    type: expType,
    desc: expDesc,
    vehicle: el('expVehicle').value?.trim()||'',
    odo: el('expOdo').value? Number(el('expOdo').value): '',
    station: el('expStation').value?.trim()||''
  }
  if(!exp.billDate || !(exp.amount>0)) return
  const arr = load(S.exp)
  arr.push(exp)
  save(S.exp, arr)
  e.target.reset()
  el('vatInputs').classList.add('hidden')
  el('expAmount').removeAttribute('readonly')
  setStamp()
  alert('Saved')
})

function within(d, from, to){
  if(from && d < from) return false
  if(to && d > to) return false
  return true
}

function buildReport(){
  const from = el('repFrom').value
  const to = el('repTo').value
  const prev = Number(el('repPrevBalance').value||0)
  const rcv = load(S.rcv).filter(r=> within(r.date, from, to))
  const exp = load(S.exp).filter(x=> within(x.billDate, from, to))
  const rows = []
  // Columns: Type, Date, Amount, Expense Type, Vehicle, VAT/Mode, Desc
  rcv.forEach(r=> rows.push({
    type: 'Receiving',
    date: r.date,
    amount: fmtCurrency(r.amount),
    expType: '-',
    vehicle: '-',
    vatMode: r.mode,
    desc: r.desc,
    sortKey: r.ts
  }))
  exp.forEach(x=> rows.push({
    type: 'Expense',
    date: x.billDate,
    amount: fmtCurrency(x.amount),
    expType: x.type || '-',
    vehicle: x.vehicle || '-',
    vatMode: x.vat,
    desc: x.desc,
    sortKey: x.ts
  }))
  rows.sort((a,b)=> a.sortKey.localeCompare(b.sortKey))

  const body = el('repBody')
  body.innerHTML = ''
  rows.forEach(r=>{
    const tr = document.createElement('tr')
    ;[r.type, r.date, r.amount, r.expType, r.vehicle, r.vatMode, r.desc].forEach(c=>{
      const td = document.createElement('td')
      td.className = 'p-2 border'
      td.textContent = c
      tr.appendChild(td)
    })
    body.appendChild(tr)
  })

  const totalR = rcv.reduce((s,r)=> s+r.amount, 0)
  const totalE = exp.reduce((s,x)=> s+x.amount, 0)
  const remaining = prev + totalR - totalE
  const totals = el('repTotals')
  totals.innerHTML = ''+
    `<div>Total Amount Received: <strong>${fmtCurrency(totalR)}</strong></div>`+
    `<div>Total Amount Paid: <strong>${fmtCurrency(totalE)}</strong></div>`+
    `<div>Remaining Balance: <strong>${fmtCurrency(remaining)}</strong></div>`
}

el('repApply').onclick = (e)=>{ e.preventDefault(); buildReport() }

function toCSV(){
  const headers = ['Type','Timestamp','Date','Amount','Expense Type','Vehicle','VAT/Mode','Description']
  const from = el('repFrom').value
  const to = el('repTo').value
  const rcv = load(S.rcv).filter(r=> within(r.date, from, to))
  const exp = load(S.exp).filter(x=> within(x.billDate, from, to))
  const rows = []
  rcv.forEach(r=> rows.push(['Receiving', r.ts, r.date, r.amount, '', '', r.mode, r.desc]))
  exp.forEach(x=> rows.push(['Expense', x.ts, x.billDate, x.amount, x.type||'', x.vehicle||'', x.vat, x.desc]))
  rows.sort((a,b)=> a[1].localeCompare(b[1]))
  const all = [headers, ...rows]
  return all.map(r=> r.map(v=> {
    const s = String(v??'')
    if(/[",\n]/.test(s)) return '"'+s.replaceAll('"','""')+'"'
    return s
  }).join(',')).join('\n')
}

el('exportCsv').onclick = ()=>{
  const csv = toCSV()
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'})
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `report-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}
