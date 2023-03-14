
// global vars
let DATA         = [];

// var to elements
let _file        = document.getElementById('selectLog')
let _filter      = document.getElementById('filterLog')
let _regex       = document.getElementById('input-regex')
let _load        = document.getElementById('btn-load')
let _nstart      = 0

// support vars
let flag_timeout = false

// constants
const BIAS_SCROLL  = 56

// main
async function main() {
    
    // load data and update UI
    updateRefreshBtn()
    await loadData()
    
    // select first if exist
    if (_file.options.length) {
        _file.options.selectedIndex = 0
        _load.click()
    }
}

// listenners
document.addEventListener('keyup', (e) => {
    // console.log(e)
    // console.log(e.code)

    if (e.code == 'r') {
        refreshData()
    }
    
    if (e.code == 'Equal') {
        gotoNextStart(_nstart + 1)
    }

    if (e.code == 'Minus') {
        gotoNextStart(_nstart -1)
    }

    if (e.code == 'BracketRight') {
        gotoNextStart(-2)
    }

    if (e.code == 'BracketLeft') {
        gotoNextStart(0)
    }
})

document.getElementById('btn-load').addEventListener('click', (e) => {
    refreshData()
})

document.getElementById('btn-auto-refresh').addEventListener('click', (e) => {
    // getLog_()
    // loadData()
    flag_timeout = !flag_timeout
    updateRefreshBtn()
    refreshDataTimeout(1000)
})

// functions
function gotoNextStart(n) {
    let s = document.getElementsByClassName('table-success')

    // condition for (-2) == last
    _nstart = n
    if (_nstart === -2) {
        _nstart = s.length - 1
    }
    
    // limiting the values of _nstart: [0, length - 1]
    _nstart = Math.min(Math.max(_nstart, 0), s.length - 1)
    
    let el = s[_nstart]
    // el.scrollIntoView()

    let position = el.getBoundingClientRect()
    window.scrollTo(position.left, position.top + window.scrollY - BIAS_SCROLL)
    
    console.log(`going to ${_nstart+1} / ${s.length + 1}`)
}

async function loadData() {

    // loading files
    let response = await fetch("/logs");
    let data = await response.json();
    
    if (data.response === "ok") {
        DATA = data.data;
    } else {
        console.log(`ERROR: ${data.message}`);
    }

    // when data is loaded
    dataLoaded();

    // filterLog_()
    let filterSelect = document.getElementById("filterLog");
    filterSelect.onchange = filterLog;
}

function updateRefreshBtn() {
    let refr = document.getElementById('btn-auto-refresh')
    refr.innerHTML = (flag_timeout) ? 'Refresh ON' : 'Refresh OFF'
}

function refreshData() {
    loadData()
    getLog_()
}

function refreshDataTimeout(time_ms) {

    if (flag_timeout) {
        setTimeout(() => {
            refreshData()
            refreshDataTimeout(time_ms)
        }, time_ms)
    }
}

window.onload = async function () {
    main()
}

function dataLoaded() {
    let files = [...new Set(DATA.map((d) => d.filename))]
    let select = document.getElementById("selectLog")
    let filter = document.getElementById("filterLog")
    
    let log_selected = select.value
    let filter_selected = filter.value

    // remove children
    while (select.children.length) {
        select.removeChild(select.firstChild)
    }

    var i = 1;
    for (f of files) {
        let opt = document.createElement("option");
        opt.name = i;
        opt.value = f;
        let txt = document.createTextNode(f);
        opt.appendChild(txt);
        select.appendChild(opt);
        i++;
    }

    select.value = log_selected
    filter.value = filter_selected

    select.onchange = getLog;
}

function getLog_() {
    let select = document.getElementById('selectLog')
    let val = select.value;

    if (val === "none") {
        return;
    }

    let log = DATA.find((n) => n.filename === val);
    filterLog_()

    // drawData(log.log_entries);
    // document.getElementById("filterLog").value = "none";
}

function getLog(e) {
    console.log(`Getting logs from: ${e.target.value}`);
    let val = e.target.value;

    if (val === "none") {
        return;
    }

    let log = DATA.find((n) => n.filename === val);
    drawData(log.log_entries);
}

function filterLog_() {
    let current_file = document.getElementById("selectLog").value;
    if (current_file == "none") {
        return;
    }

    let current_log = DATA.find((n) => n.filename === current_file);
    let currentData = current_log.log_entries;

    let filter = _filter.value;
    // console.log(filter);

    var filteredData;

    switch (filter) {
        case "none":
            filteredData = currentData;
            break;
        case "info":
            filteredData = filterData("INFO", currentData);
            break;
        case "warn":
            filteredData = filterData("WARN", currentData);
            break;
        case "error":
            filteredData = filterData("ERROR", currentData);
            break;
        case "debug":
            filteredData = filterData("DEBUG", currentData);
            break;
        case "other":
            filteredData = filterData("OTHER", currentData);
            break;
        case "warnerror":
            filteredData = filterData("WARN+ERROR", currentData);
            break;
        default:
            throw new Error("Invalid filter option")
    }

    drawData(filteredData)
}

function filterLog(e) {
    let current_file = document.getElementById("selectLog").value;
    if (current_file == "none") {
        return;
    }

    let current_log = DATA.find((n) => n.filename === current_file);
    let currentData = current_log.log_entries;

    let filter = e.target.value;
    console.log(filter);

    var filteredData;

    switch (filter) {
        case "none":
            filteredData = currentData;
            break;
        case "info":
            filteredData = filterData("INFO", currentData);
            break;
        case "warn":
            filteredData = filterData("WARN", currentData);
            break;
        case "error":
            filteredData = filterData("ERROR", currentData);
            break;
        case "debug":
            filteredData = filterData("DEBUG", currentData);
            break;
        case "other":
            filteredData = filterData("OTHER", currentData);
            break;
        case "warnerror":
            filteredData = filterData("WARN+ERROR", currentData);
            break;
        default:
            throw new Error("Invalid filter option")
    }
    
    drawData(filteredData)
}

// Returns the filtered data
function filterData(filter, c_data) {
    console.log(`filterData: ${filter}`);
    switch (filter) {
        case "INFO":
            return c_data.filter((n) => {return (n.entry.Info ? true : false) || isTestStarting(n)})
        case "WARN":
            return c_data.filter((n) => {return (n.entry.Warn ? true : false) || isTestStarting(n)})
        case "ERROR":
            return c_data.filter((n) => {return (n.entry.Error ? true : false) || isTestStarting(n)})
        case "DEBUG":
            return c_data.filter((n) => {return (n.entry.Debug ? true : false) || isTestStarting(n)})
        case "OTHER":
            return c_data.filter((n) => {return (n.entry.Other ? true : false) || isTestStarting(n)})
        case "WARN+ERROR":
            return c_data.filter((n) => {
                let is_warn = n.entry.Warn ? true : false;
                let is_err = n.entry.Error ? true : false;
                let is_start = isTestStarting(n)
                return is_warn || is_err || is_start;
            })
        default:
            console.log("ERROR: Invalid filter")
            return []
    }
}

function isTestStarting(d) {
    info = d.entry.Info
    if (!info) {
        return false
    }
    
    return /BaseAdapter.*Waiting.*start/.test(info)
}

function drawData(data) {

    let table = document.getElementById("logs");
    let tbody = table.getElementsByTagName("tbody")[0];
    
    // remove existing elements in the table
    let c_nodescount = tbody.childElementCount;
    for (i = 0; i < c_nodescount; i++) {
        tbody.removeChild(tbody.lastChild);
    }

    // filtering last
    let only_last = document.getElementById('check-last').checked

    // find last test init
    let filename = _file.value
    let data_ = DATA.filter(d => d.filename.includes(filename))[0].log_entries

    let pos_ = -1
    let pos  = -1
    if (only_last) {
        for (d of data_) {
            if (isTestStarting(d)) {
                pos_ = pos
                pos  = d.line
            }
        }
    }
    
    data = data.filter(d => d.line >= pos)
    
    // filter regex
    if (_regex.value) {
        let re = new RegExp(_regex.value)
        data = data.filter(d => {
            let info  = re.test(d.entry.Info)
            let warn  = re.test(d.entry.warn)
            let error = re.test(d.entry.Error)
            let debug = re.test(d.entry.Debug)
            let other = re.test(d.entry.Debug)
            let start = isTestStarting(d)
        
            return info || warn || error || debug || other || start
        })
    } 

    // add new elements
    for (d of data) {
        var row_class = "";
        var str_content = "";
        var type = "";
        if (d.entry.Info) {
            // highlight waiting for test
            row_class = (isTestStarting(d)) ? "table-success" : "";
            
            str_content = d.entry.Info;
            type = "INFO";
        } else if (d.entry.Error) {
            row_class = "table-danger";
            str_content = d.entry.Error;
            type = "ERROR";
        } else if (d.entry.Warn) {
            row_class = "table-warning";
            str_content = d.entry.Warn;
            type = "WARN";
        } else if (d.entry.Debug) {
            row_class = "";
            str_content = d.entry.Debug;
            type = "DEBUG";
        } else if (d.entry.Other) {
            row_class = "";
            str_content = d.entry.Other;
            type = "OTHER";
        } else {
            console.log(`"ERROR: Unspecified type: ${d.entry}`)
            continue;
        }

        // <tr>
        let tr = document.createElement("tr");
        tr.className = row_class;

        // <td>
        var td = document.createElement("td");
        var td_txt = document.createTextNode(d.line);
        td.appendChild(td_txt);
        tr.appendChild(td);
        // </td>

        // <td>
        var td = document.createElement("td");
        var td_txt = document.createTextNode(type);
        td.appendChild(td_txt);
        tr.appendChild(td);
        // </td>

        // <td>
        var td = document.createElement("td");
        var td_txt = document.createTextNode(str_content);
        td.appendChild(td_txt);
        tr.appendChild(td);
        // </td>

        tbody.appendChild(tr);
        // </td>
    }
}