const DB = require('../db')
const fs = require('fs')
const path = require('path')
const request = require('request')
const uuid = require('uuid')
const moment = require('moment')
const cfg = require('../../config.json')

class Hrm {
    constructor() {
        this._db = new DB('mssql')
        this._cache = {}
        this._cfg = cfg.hrm[cfg.mode]
    }

    async tableFields(table) {
        if (!this._cache[table]) {
            this._cache[table] = await this._db.query(undefined, 'ySysColumns', {op:'=',lVal:{type:'prop', value:'TableName'},rVal:{type:'string',value: table}}, ['ColName', 'DisplayLabel', 'EditFormat'])
        }
        return this._cache[table]
    }

    async init() {
        /*
        var strSql = `if not exists(select 1 from sysobjects where type='u' and name='A43Synced') create table A43Synced(id int)`
        await this._db.excSql(undefined,strSql)
        var strSql = `if not exists(select 1 from sysobjects where type='u' and name='C41Synced') create table C41Synced(id int)`
        await this._db.excSql(undefined,strSql)
        */
    }

    makeDir(dirPath) {
        if(!fs.existsSync(dirPath)) {
            dirPath = dirPath.replaceAll('\\','/')
            var pathtmp
            dirPath.split('/').forEach(dirname => {
                if(pathtmp) {
                    pathtmp=path.join(pathtmp, dirname)
                } else {
                    if (dirname) {
                        pathtmp = dirname
                    } else {
                        pathtmp = '/'
                    }
                }
                if(!fs.existsSync(pathtmp)) {
                    if(!fs.mkdirSync(pathtmp)) {
                        return false
                    }
                }
                
            });
        }else {
            
        }
        return true
    }

    getFileByUrl(url, dir, fileName) {
        this.makeDir(dir)
        return new Promise((res, rej) => {
            let stream = fs.createWriteStream(path.join(dir, fileName))
            request(url).pipe(stream).on('close', (err) => {
                if(err) {
                    rej(err)
                } else {
                    res()
                }
            })
        })
    }

    copyFile(sDir, sFileName, dDir, dFileName) {
        this.makeDir(dDir)
        return new Promise((res, rej) => {
            fs.copyFile(`${sDir}/${sFileName}`, `${dDir}/${dFileName}`, (err) => {
                if (err) {
                    rej(err)
                } else {
                    res()
                }
            })
        })
    }

    async companys() {
        var recs = await this._db.query(undefined, 'BM_KR_HTDW')
        var tmps = await this._db.query(undefined, 'esign_template')
        var sigs = await this._db.query(undefined, 'esign_details')
        var rst = []
        for(var idx in recs) {
            var rec = recs[idx]
            var r = {
                name: rec.MC0000,
                orgId: rec.COMPANYID,
                appId: rec.APPLYID,
                secret: rec.COMPANYSECRET,
                token: rec.COMPANYTOKEN,
                templates: []
            }
            var eRecs = tmps.filter(element=>{return element.ESIGNCOMPANY===rec.MC0000})
            for(var jdx in eRecs) {
                var eRec = eRecs[jdx]
                var er = {
                    table: eRec.HRMTABLE,
                    id: eRec.TEMPLATEID,
                    savePath: eRec.SAVEPATH,
                    signs: []
                }
                /*
                var sRecs = sigs.filter(element=>{return element.TEMPLATEID===er.id})
                for(var kdx in sRecs) {
                    var sRec = sRecs[kdx]
                    var sr = {
                        order: sRec.ESIGNNUMBER,
                        name: sRec.SIGNATURE,
                        method: sRec.SIGNMETHOD,
                        phone: sRec.SIGNPHONE
                    }
                    er.signs.push(sr)
                }
                */
                r.templates.push(er)
            }
            rst.push(r)
        }
        return rst
    }

    getTableKey(tableName) {
        var rst = 'id'
        switch(tableName.toLowerCase()) {
            case 'a43':
                rst = 'TRANSID'
                break
            case 'k_month':
                rst = 'k_id'
                break
        }
        return rst
    }

    async getDynamicVal(formula, id) {
        var arr = formula.split('.')
        var preTable = ''
        for(var jdx in arr) {
            if (Number(jdx) === 0) {
                preTable = arr[jdx]
                var strSql = `\nfrom ${arr[jdx]} t${jdx}`
            } else {
                var fieldInfos = await this._db.getData(undefined, `select EditFormat from ySysColumns where TableName='${preTable}' and colName='${arr[jdx]}'`)
                fieldInfos = fieldInfos.recordset
                if(fieldInfos.length===0) {
                    throw(`动态配置${str.phone}不正确，字段${arr[jdx]}在表${preTable}中不存在`)
                }
                var field = fieldInfos[0]
                switch(field.EditFormat.substr(0,4)) {
                    case 'LOOK':
                        var strTmp = field.EditFormat
                        strTmp = strTmp.substr(strTmp.indexOf('(')+1, strTmp.lastIndexOf(')')-strTmp.indexOf('('))
                        var strArr = strTmp.split('|')
                        preTable = strArr[0]
                        strSql += `\nleft join ${preTable} t${jdx} on t${jdx}.${strArr[1]}=t${jdx-1}.${arr[jdx]}`
                        break
                    case 'CODE':
                    case 'RADI':
                        strTmp = field.EditFormat
                        strTmp = strTmp.substr(strTmp.indexOf('(')+1, strTmp.lastIndexOf(')')-strTmp.indexOf('('))
                        strArr = strTmp.split('|')
                        strSql += `\nleft join ${strArr[0]} t${jdx} on t${jdx}.BM0000=t${jdx-1}.${arr[jdx]}`
                        break
                    default:
                        strSql = `select ${arr[jdx]} ${strSql} where t${0}.${this.getTableKey(arr[0])}=${id}`
                        break
                }
            }
        }
        var rst = undefined
        fieldInfos = await this._db.getData(undefined,strSql)
        if (fieldInfos.recordset.length>0) {
            rst = fieldInfos.recordset[0][arr[arr.length-1]]
        }
        return rst
    }

    async getSigners(templateId, recId) {
        var strSql = `select * from esign_details where TemplateID='${templateId}'`
        var recs = await this._db.getData(undefined, strSql)
        recs = recs.recordset
        var rst = []
        for(var idx in recs) {
            var rec = recs[idx]
            var sr = {
                order: rec.ESIGNNUMBER,
                name: rec.SIGNATURE,
                method: rec.SIGNMETHOD,
                phone: rec.SIGNPHONE
            }
            if(sr.method==='SIGNMETH01') {
                var phone = await this.getDynamicVal(sr.phone, recId)
                if (phone) {
                    sr.phone = phone
                }
                /*
                var arr = sr.phone.split('.')
                var preTable = ''
                for(var jdx in arr) {
                    if (Number(jdx) === 0) {
                        preTable = arr[jdx]
                        strSql = `\nfrom ${arr[jdx]} t${jdx}`
                    } else {
                        var fieldInfos = await this._db.getData(undefined, `select EditFormat from ySysColumns where TableName='${preTable}' and colName='${arr[jdx]}'`)
                        fieldInfos = fieldInfos.recordset
                        if(fieldInfos.length===0) {
                            throw(`动态签署人配置${str.phone}不正确，字段${arr[jdx]}在表${preTable}中不存在`)
                        }
                        var field = fieldInfos[0]
                        switch(field.EditFormat.substr(0,4)) {
                            case 'LOOK':
                                var strTmp = field.EditFormat
                                strTmp = strTmp.substr(strTmp.indexOf('(')+1, strTmp.lastIndexOf(')')-strTmp.indexOf('('))
                                var strArr = strTmp.split('|')
                                preTable = strArr[0]
                                strSql += `\nleft join ${preTable} t${jdx} on t${jdx}.${strArr[1]}=t${jdx-1}.${arr[jdx]}`
                                break
                            case 'CODE':
                            case 'RADI':
                                strTmp = field.EditFormat
                                strTmp = strTmp.substr(strTmp.indexOf('(')+1, strTmp.lastIndexOf(')')-strTmp.indexOf('('))
                                strArr = strTmp.split('|')
                                strSql += `\nleft join ${strArr[0]} t${jdx} on t${jdx}.BM0000=t${jdx-1}.${arr[jdx]}`
                                break
                            default:
                                strSql = `select ${arr[jdx]} ${strSql} where t${0}.TRANSID=${recId}`
                                break
                        }
                    }
                }
                fieldInfos = await this._db.getData(undefined,strSql)
                if (fieldInfos.recordset.length>0) {
                    sr.phone = fieldInfos.recordset[0][arr[arr.length-1]]
                }
                */
            }
            rst.push(sr)
        }
        return rst
    }

    async NewEmp() {
        return await this.getData('A43', undefined, `and i.A43114='待发起'`)
    }

    async NewEmpSign() {
        return await this.getData('A43', undefined, `and i.A43114='签署中'`)
    }

    
    async monthAttendance() {
        return await this.getData('K_Month', undefined, `and i.ESIGNSTATE='待发起'`)
    }

    async monthAttendanceSign() {
        return await this.getData('K_Month', undefined, `and i.ESIGNSTATE='签署中'`)
    }

    async monthAttendanceSynced(id, status, flowId, businessName, operator, info, files, savePath) {
        var strSql = ``
        if(files) {
            var curMonth = moment(new Date()).format('yyyy-MM')
            strSql += `if exists(select 1 from K_Month where k_id=${id} and SIGNATTACH is null) update K_Month set SIGNATTACH=newid() where k_id=${id}
            `
            for(var idx in files) {
                var file = files[idx]
                var fileName = file.fileName.split('.')
                var type = fileName[fileName.length -1]
                file.tmpFileName = file.fileId + '.' + type
                file.filePath = `/upload/${curMonth}/accessory`
                var dir = `${this._cfg.wwwRoot}${this._cfg.filePath}${file.filePath}`
                await this.getFileByUrl(file.downloadUrl, dir, file.tmpFileName)
                if(savePath) {
                    await this.copyFile(dir, file.tmpFileName, savePath, file.fileName)
                }
                strSql += `insert into ysysDocuments(guidCode,Dname,DFileName,fileLength,filePath)
                select SIGNATTACH,'${file.fileName}','${file.fileName}',${0},'${file.filePath}/${file.tmpFileName}'
                from K_Month where k_id=${id}
                `
            }
        }
        strSql += `update K_Month set ESIGNSTATE='${status===1?'签署中':status===2?'签署完成':'签署异常'}',SIGNFLOWID='${flowId}' where k_id=${id}
        insert into esign_log(SYNDate,SYNState,ESIGNBUSINESS,ESIGNOPERATOR,FEEDBACK) select getdate(),${(status===1|| status===2)?1:2},'${businessName}','${operator}','${info}'`
        await this._db.excSql(undefined,strSql)
    }

    async OldEmp() {
        return await this.getData('C41', 'HT_NUMBER')
    }

    async getData(table, empField, strWhere) {      
        var fields = await this.tableFields(table)
        var sqlSelect = ''
        var sqlTables = table + ' i'
        var hasCompany = false
        for (var jdx in fields) {
            var field = fields[jdx]
            sqlSelect += sqlSelect===''?'':','
            if (field.EditFormat===null) {
                sqlSelect += `i.${field.ColName} [${field.ColName}]`
            } else {
                switch(field.EditFormat.substr(0,4)) {
                    case 'LOOK':
                        var strTmp = field.EditFormat
                        strTmp = strTmp.substr(strTmp.indexOf('(')+1, strTmp.lastIndexOf(')')-strTmp.indexOf('('))
                        var strArr = strTmp.split('|')
                        sqlSelect += `${field.ColName}.${strArr[2]} [${field.ColName}]`
                        sqlTables += `\n left join ${strArr[0]} ${field.ColName} on ${field.ColName}.${strArr[1]}=i.${field.ColName}`
                        if (empField) {
                            if (field.ColName === empField) {
                                sqlSelect += `,company.MC0000 company`
                                sqlTables += `\n left join BM_KR_HTDW company on company.BM0000=${field.ColName}.A011493`
                            }
                        } else {
                            if(strArr[0]==='A01' && !hasCompany) {
                                sqlSelect += `,company.MC0000 company`
                                sqlTables += `\n left join BM_KR_HTDW company on company.BM0000=${field.ColName}.A011493`
                                hasCompany = true
                            }
                        }
                        
                        
                        break
                    case 'CODE':
                    case 'RADI':
                        var strTmp = field.EditFormat
                        strTmp = strTmp.substr(strTmp.indexOf('(')+1, strTmp.lastIndexOf(')')-strTmp.indexOf('('))
                        var strArr = strTmp.split('|')
                        sqlSelect += `${field.ColName}.MC0000 [${field.ColName}]`
                        sqlTables += `\n left join ${strArr[0]} ${field.ColName} on ${field.ColName}.BM0000=i.${field.ColName}`
                        break
                    default:
                        sqlSelect += `i.${field.ColName} [${field.ColName}]`
                        break
                }
            }
            
        }
        var recs = await this._db.getData(undefined, `select ${sqlSelect} \nfrom \n${sqlTables} \nwhere i.SIGNED=2 ${strWhere}`)
        return recs.recordset
    }

    async NewEmpSynced(id, status, flowId, businessName, operator, info, files, savePath) {
        var strSql = ``
        if(files) {
            var curMonth = moment(new Date()).format('yyyy-MM')
            strSql += `if exists(select 1 from A43 where TransID=${id} and SIGNATTACH is null) update A43 set SIGNATTACH=newid() where TransID=${id}
            `
            for(var idx in files) {
                var file = files[idx]
                var fileName = file.fileName.split('.')
                var type = fileName[fileName.length -1]
                file.tmpFileName = file.fileId + '.' + type
                file.filePath = `/upload/${curMonth}/accessory`
                var dir = `${this._cfg.wwwRoot}${this._cfg.filePath}${file.filePath}`
                await this.getFileByUrl(file.downloadUrl, dir, file.tmpFileName)
                if(savePath) {
                    await this.copyFile(dir, file.tmpFileName, savePath, file.fileName)
                }
                strSql += `insert into ysysDocuments(guidCode,Dname,DFileName,fileLength,filePath)
                select SIGNATTACH,'${file.fileName}','${file.fileName}',${0},'${file.filePath}/${file.tmpFileName}'
                from A43 where TransID=${id}
                `
            }
        }
        strSql += `update A43 set A43114='${status===1?'签署中':status===2?'签署完成':'签署异常'}',SIGNFLOWID='${flowId}' where TRANSID=${id}
        insert into esign_log(SYNDate,SYNState,ESIGNBUSINESS,ESIGNOPERATOR,FEEDBACK) select getdate(),${(status===1|| status===2)?1:2},'${businessName}','${operator}','${info}'`
        await this._db.excSql(undefined,strSql)
    }

    async OldEmpSynced(id) {
        var strSql = `if not exists(select 1 from C41Synced where id=${id}) insert into C41Synced(id)values(${id})`
        await this._db.excSql(undefined,strSql)
    }
}

module.exports = Hrm