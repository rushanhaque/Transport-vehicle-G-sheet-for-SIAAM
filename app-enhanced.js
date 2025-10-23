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
  if(view === views.main) updateDashboard()
}

// Toast notifications
function showToast(message, type = 'success') {
  const toast = document.createElement('div')
  toast.className = `p-4 rounded-lg shadow-lg mb-2 animate-slide ${
    type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
  } text-white`
  toast.textContent = message
  el('toastContainer').appendChild(toast)
  setTimeout(() => toast.remove(), 3000)
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

// Dashboard updates
function updateDashboard() {
  const rcv = load(S.rcv)
  const exp = load(S.exp)
  const totalR = rcv.reduce((s,r)=> s+r.amount, 0)
  const totalE = exp.reduce((s,x)=> s+x.amount, 0)
  const balance = totalR - totalE
  
  el('dashReceived').textContent = fmtCurrency(totalR)
  el('dashExpenses').textContent = fmtCurrency(totalE)
  el('dashBalance').textContent = fmtCurrency(balance)
  
  renderChart()
}

// Chart rendering
let dashChartInstance = null
function renderChart() {
  const rcv = load(S.rcv)
  const exp = load(S.exp)
  
  // Group by month
  const months = {}
  rcv.forEach(r => {
    const m = r.date.slice(0, 7)
    if (!months[m]) months[m] = { rcv: 0, exp: 0 }
    months[m].rcv += r.amount
  })
  exp.forEach(x => {
    const m = x.billDate.slice(0, 7)
    if (!months[m]) months[m] = { rcv: 0, exp: 0 }
    months[m].exp += x.amount
  })
  
  const sorted = Object.keys(months).sort().slice(-6)
  const labels = sorted.map(m => {
    const [y, mo] = m.split('-')
    return `${mo}/${y.slice(2)}`
  })
  const rcvData = sorted.map(m => months[m].rcv)
  const expData = sorted.map(m => months[m].exp)
  
  const ctx = el('dashChart').getContext('2d')
  if (dashChartInstance) dashChartInstance.destroy()
  
  dashChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Received',
          data: rcvData,
          backgroundColor: 'rgba(34, 197, 94, 0.7)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 1
        },
        {
          label: 'Expenses',
          data: expData,
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: 'top' }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  })
}

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
    descField.placeholder = 'Add notes...'
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
  showToast('Receiving saved successfully!')
  updateDashboard()
})

el('expenseForm').addEventListener('submit', (e)=>{
  e.preventDefault()
  const expType = el('expType').value
  const expDesc = el('expDesc').value?.trim()||''
  
  if(!expType) {
    showToast('Please select Type of Expense', 'error')
    return
  }
  
  if(expType === 'Other' && !expDesc) {
    showToast('Description is required when expense type is "Other"', 'error')
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
  showToast('Expense saved successfully!')
  updateDashboard()
})

function within(d, from, to){
  if(from && d < from) return false
  if(to && d > to) return false
  return true
}

let currentReportData = []

function buildReport(){
  const from = el('repFrom').value
  const to = el('repTo').value
  const prev = Number(el('repPrevBalance').value||0)
  const search = el('repSearch').value.toLowerCase()
  
  const rcv = load(S.rcv).filter(r=> within(r.date, from, to))
  const exp = load(S.exp).filter(x=> within(x.billDate, from, to))
  
  const rows = []
  rcv.forEach(r=> rows.push({
    type: 'Receiving',
    date: r.date,
    amount: r.amount,
    amountFmt: fmtCurrency(r.amount),
    expType: '-',
    vehicle: '-',
    vatMode: r.mode,
    desc: r.desc,
    sortKey: r.ts
  }))
  exp.forEach(x=> rows.push({
    type: 'Expense',
    date: x.billDate,
    amount: x.amount,
    amountFmt: fmtCurrency(x.amount),
    expType: x.type || '-',
    vehicle: x.vehicle || '-',
    vatMode: x.vat,
    desc: x.desc,
    sortKey: x.ts
  }))
  rows.sort((a,b)=> a.sortKey.localeCompare(b.sortKey))
  
  // Filter by search
  const filtered = search ? rows.filter(r => 
    r.desc.toLowerCase().includes(search) || 
    r.vehicle.toLowerCase().includes(search) ||
    r.expType.toLowerCase().includes(search)
  ) : rows
  
  currentReportData = filtered
  
  const body = el('repBody')
  body.innerHTML = ''
  
  if(filtered.length === 0) {
    body.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-500">No records found</td></tr>'
  } else {
    filtered.forEach((r, i)=>{
      const tr = document.createElement('tr')
      tr.className = i % 2 === 0 ? 'bg-white' : 'bg-gray-50'
      ;[r.type, r.date, r.amountFmt, r.expType, r.vehicle, r.vatMode, r.desc].forEach((c, idx)=>{
        const td = document.createElement('td')
        td.className = 'p-2 lg:p-3 border-b'
        if(idx === 0) td.className += r.type === 'Receiving' ? ' text-green-600 font-semibold' : ' text-red-600 font-semibold'
        if(idx === 2) td.className += ' font-semibold'
        if(idx < 6) td.className += ' whitespace-nowrap'
        td.textContent = c
        tr.appendChild(td)
      })
      body.appendChild(tr)
    })
  }
  
  const totalR = rcv.reduce((s,r)=> s+r.amount, 0)
  const totalE = exp.reduce((s,x)=> s+x.amount, 0)
  const remaining = prev + totalR - totalE
  
  el('repCount').textContent = `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`
  
  const totals = el('repTotals')
  totals.innerHTML = ''+
    `<div class="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
      <div class="text-sm text-green-700">Total Received</div>
      <div class="text-2xl font-bold text-green-600">${fmtCurrency(totalR)}</div>
    </div>`+
    `<div class="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border border-red-200">
      <div class="text-sm text-red-700">Total Expenses</div>
      <div class="text-2xl font-bold text-red-600">${fmtCurrency(totalE)}</div>
    </div>`+
    `<div class="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
      <div class="text-sm text-blue-700">Remaining Balance</div>
      <div class="text-2xl font-bold text-blue-600">${fmtCurrency(remaining)}</div>
    </div>`
}

el('repApply').onclick = (e)=>{ e.preventDefault(); buildReport() }
el('repSearch').addEventListener('input', buildReport)

// CSV Export
function toCSV(){
  const headers = ['Type','Timestamp','Date','Amount','Expense Type','Vehicle','VAT/Mode','Description']
  const rows = currentReportData.map(r => [
    r.type, r.sortKey, r.date, r.amount, r.expType === '-' ? '' : r.expType, 
    r.vehicle === '-' ? '' : r.vehicle, r.vatMode, r.desc
  ])
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
  downloadBlob(blob, `SIAAM-Report-${Date.now()}.csv`)
  showToast('CSV exported successfully!')
}

// Excel Export
el('exportExcel').onclick = ()=>{
  const headers = ['Type','Timestamp','Date','Amount','Expense Type','Vehicle','VAT/Mode','Description']
  const rows = currentReportData.map(r => [
    r.type, r.sortKey, r.date, r.amount, r.expType === '-' ? '' : r.expType, 
    r.vehicle === '-' ? '' : r.vehicle, r.vatMode, r.desc
  ])
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Report')
  XLSX.writeFile(wb, `SIAAM-Report-${Date.now()}.xlsx`)
  showToast('Excel file exported successfully!')
}

// PDF Export
el('exportPdf').onclick = ()=>{
  const { jsPDF } = window.jspdf
  const doc = new jsPDF()
  
  doc.setFontSize(18)
  doc.text('SIAAM Land Transport Co.', 14, 20)
  doc.setFontSize(12)
  doc.text('Financial Report', 14, 28)
  doc.setFontSize(10)
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 35)
  
  const headers = [['Type','Date','Amount','Category','Vehicle','VAT/Mode','Description']]
  const rows = currentReportData.map(r => [
    r.type, r.date, r.amountFmt, r.expType, r.vehicle, r.vatMode, r.desc
  ])
  
  doc.autoTable({
    head: headers,
    body: rows,
    startY: 42,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [102, 126, 234] },
    alternateRowStyles: { fillColor: [245, 245, 245] }
  })
  
  doc.save(`SIAAM-Report-${Date.now()}.pdf`)
  showToast('PDF exported successfully!')
}

// JSON Export
el('exportJson').onclick = ()=>{
  const data = {
    exported: new Date().toISOString(),
    receivings: load(S.rcv),
    expenses: load(S.exp)
  }
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], {type: 'application/json'})
  downloadBlob(blob, `SIAAM-Backup-${Date.now()}.json`)
  showToast('JSON data exported successfully!')
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}

// Import Data
el('importData').onclick = ()=>{
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e)=>{
    const file = e.target.files[0]
    if(!file) return
    const reader = new FileReader()
    reader.onload = (ev)=>{
      try {
        const data = JSON.parse(ev.target.result)
        if(data.receivings && data.expenses) {
          save(S.rcv, data.receivings)
          save(S.exp, data.expenses)
          showToast('Data imported successfully!')
          updateDashboard()
        } else {
          showToast('Invalid file format', 'error')
        }
      } catch(err) {
        showToast('Error reading file', 'error')
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

// Backup All Data
el('backupData').onclick = ()=>{
  const data = {
    exported: new Date().toISOString(),
    receivings: load(S.rcv),
    expenses: load(S.exp)
  }
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], {type: 'application/json'})
  downloadBlob(blob, `SIAAM-Full-Backup-${Date.now()}.json`)
  showToast('Full backup created successfully!')
}

// Clear Data
el('clearData').onclick = ()=>{
  if(!confirm('Are you sure you want to clear ALL data? This cannot be undone!')) return
  if(!confirm('FINAL WARNING: All receivings and expenses will be deleted permanently!')) return
  localStorage.removeItem(S.rcv)
  localStorage.removeItem(S.exp)
  showToast('All data cleared', 'info')
  updateDashboard()
}

// Settings (placeholder)
el('settingsBtn').onclick = ()=>{
  showToast('Settings feature coming soon!', 'info')
}

// Statistics (placeholder)
el('statsView').onclick = ()=>{
  showToast('Detailed statistics coming soon!', 'info')
}

// Initialize
updateDashboard()
