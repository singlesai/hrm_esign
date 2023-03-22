const express = require('express')
const schedule = require('node-schedule')
const cfg = require('../config.json')

const app = express()

const Sync = require('./sync')

const Esign = require('./esign')
const Hrm = require('./hrm')
var hrm = new Hrm()
hrm.init()
Esign.getCompanyApi('科技').template.flowTemplates().then(rst=>{console.log('flowTemplates',rst)}).catch(ex=>{console.log('flowTemplates err',ex)})

/*
Esign.organizations.administrators('20e2309132544a65b2c2e9ee805fb5a5').then(rst=>{console.log('admin',rst)}).catch(ex=>{console.log('admin err',ex)})

Esign.organizations.memberList('20e2309132544a65b2c2e9ee805fb5a5').then(rst=>{console.log('member',rst)}).catch(ex=>{console.log('member err',ex)})
Esign.template.templates().then(rst=>{console.log('template',rst)}).catch(ex=>{console.log('template err',ex)})

Esign.template.flowTemplates().then(rst=>{console.log('flowTemplates',rst)}).catch(ex=>{console.log('flowTemplates err',ex)})
Esign.template.flowTemplate('ffd0f4a2f5064ea486dce7b2a57d8260').then(rst=>{console.log('flowTemplate',rst)}).catch(ex=>{console.log('flowTemplate err',ex)})
Esign.template.flowTemplateBaseInfo('ffd0f4a2f5064ea486dce7b2a57d8260').then(rst=>{console.log('flowTemplateBaseInfo',rst)}).catch(ex=>{console.log('flowTemplateBaseInfo err',ex)})
Esign.template.createFileByTemplate('ffd0f4a2f5064ea486dce7b2a57d8260', 'test', {name: 'test'}).then(rst=>{console.log('createFileByTemplate',rst)}).catch(ex=>{console.log('createFileByTemplate err',ex)})

hrm.NewEmp().then(rst => {
    console.log('hrm new emp', rst)
})
*/
var syncNewEmp = async function(){
    var templateId = '0cba1f72d9a443bbb60c5f3418f40620' //'61d4faa1a3d148c893073ce2d6b73d3d' //
    var template = await Esign.template.flowTemplate(templateId)
    // var template = await Esign.template.flowTemplateBaseInfo(templateId)
    var recs = await hrm.NewEmp()
    var cnt = 0
    var file = undefined
    var signers = []
    for (var idx in recs) {
        var rec = recs[idx]
        try {
            var data = []
            console.log(template.components)
            for (var jdx in template.components) {
                var component = template.components[jdx]
                if (component.componentKey in rec) {
                    var val = rec[component.componentKey]
                    if (val!==null)
                    {
                        if(component.componentSpecialAttribute.componentMaxLength && val.length > component.componentSpecialAttribute.componentMaxLength/2) {
                            val = val.slice(0, component.componentSpecialAttribute.componentMaxLength/2)
                        }
                        if (typeof val ==='string' && val.constructor===String) {
                            val = val.replace(/[\r\n]/g, "")
                        }
                        data.push({
                            componentKey: component.componentKey,
                            componentValue: val
                        })
                    }
                } else {
                    if (component.componentKey.indexOf('_Sign')>0) {
                        signers.push({
                            phone: '18666076856',
                            position: {
                                page: component.componentPosition.componentPageNum,
                                x: component.componentPosition.componentPositionX,
                                y: component.componentPosition.componentPositionY
                            }
                        })
                    }
                }
            }
            var rst = await Esign.template.createFileByTemplate(templateId, 'test', data)
            console.log('file:', rst)
            file = rst
            rst = await Esign.sign.createByFile(rst.fileId, 'test', signers)
            console.log('sign flow id:', rst)
            await hrm.NewEmpSynced(rec.TRANSID)
            cnt += 1
            console.log('rst', rst)
            return file
            break
        } catch (ex) {
            var errMsg = ex.message || ex
            if (file) {
                errMsg += `;<a>${file.fileDownloadUrl}</a>`
            }
            throw(errMsg)
            console.log('new emp sync err:', ex.message || ex)
        }
        // Esign.template.createFileByTemplate()
    }
    if (cnt > 0) {
        console.log(`Synced New Employee Records: ${cnt}`)
    }
}

var syncOldEmp = async function(){
    var templateId = '10fb43ae490349628a1b89563ddfbc23' //'61d4faa1a3d148c893073ce2d6b73d3d' //
    var template = await Esign.template.flowTemplate(templateId)
    // var template = await Esign.template.flowTemplateBaseInfo(templateId)
    var recs = await hrm.OldEmp()
    var cnt = 0
    var file = undefined
    var signers = []
    for (var idx in recs) {
        var rec = recs[idx]
        try {
            var data = []
            console.log(template.components)
            for (var jdx in template.components) {
                var component = template.components[jdx]
                if (component.componentKey in rec) {
                    var val = rec[component.componentKey]
                    if (val!==null)
                    {
                        if(component.componentSpecialAttribute.componentMaxLength && val.length > component.componentSpecialAttribute.componentMaxLength/2) {
                            val = val.slice(0, component.componentSpecialAttribute.componentMaxLength/2)
                        }
                        if (typeof val ==='string' && val.constructor===String) {
                            val = val.replace(/[\r\n]/g, "")
                        }
                        data.push({
                            componentKey: component.componentKey,
                            componentValue: val
                        })
                    }
                } else {
                    if (component.componentKey && component.componentKey.indexOf('_Sign')>0) {
                        signers.push({
                            phone: '18666076856',
                            position: {
                                page: component.componentPosition.componentPageNum,
                                x: component.componentPosition.componentPositionX,
                                y: component.componentPosition.componentPositionY
                            }
                        })
                    }
                }
            }
            var rst = await Esign.template.createFileByTemplate(templateId, 'test', data)
            console.log('file:', rst)
            file = rst
            rst = await Esign.sign.createByFile(rst.fileId, 'test', signers)
            console.log('sign flow id:', rst)
            await hrm.OldEmpSynced(rec.HT_NUMBER)
            cnt += 1
            console.log('rst', rst)
            return file
            break
        } catch (ex) {
            var errMsg = ex.message || ex
            if (file) {
                errMsg += `;<a>${file.fileDownloadUrl}</a>`
            }
            throw(errMsg)
            console.log('new emp sync err:', ex.message || ex)
        }
        // Esign.template.createFileByTemplate()
    }
    if (cnt > 0) {
        console.log(`Synced New Employee Records: ${cnt}`)
    }
}
//10fb43ae490349628a1b89563ddfbc23
schedule.scheduleJob('30 * * * * *', () => {
    Sync.all()
})


app.get('/syncOldEmp', async function(req, res) {
    try{
        var rst = await syncOldEmp()
        res.send(JSON.stringify(rst))
    }catch(ex) {
        res.send(JSON.stringify(ex))
    }
})

app.get('/syncEmp', async function(req, res) {
    try{
        var rst = await syncNewEmp()
        res.send(JSON.stringify(rst))
    }catch(ex) {
        res.send(JSON.stringify(ex))
    }
})

app.get('/', function(req, res) {
    res.send('test')
})

app.get('/newemp', async function(req, res) {
    try {
        var rst = await Sync.newEmp()//await hrm.NewEmp()
        res.send(rst)
    }catch(ex) {
        res.send(JSON.stringify(ex))
    }
})

app.get('/templates', async function(req, res) {
    try {
        var rst = await Esign.template.flowTemplates()
        res.send(rst)
    }catch(ex) {
        res.send(JSON.stringify(ex))
    }
})


app.get('/template', async function(req, res) {
    try {
        var rst = await Esign.template.flowTemplate(req.query.id)
        res.send(rst)
    }catch(ex) {
        res.send(JSON.stringify(ex))
    }
})

var port = cfg.app[cfg.mode].port
const server = app.listen(port, function() {
    console.log("Server Started,Listening " + port)
})