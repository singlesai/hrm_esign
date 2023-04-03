const Esign = require('../esign')
const Hrm = require('../hrm')
const Pub = require('../public')
const moment = require('moment')

class Sync {
    constructor() {
        this.hrm = new Hrm()
        this.hrm.init()
    }
    static async init() {
        if(!this.hrm) {
            this.hrm = new Hrm()
            this.hrm.init()
        }
    }
    static async newEmp() { //转正
        await this.init()
        var recs = await this.hrm.NewEmp()
        var cnt = 0
        var file = undefined
        var signers = []
        for (var idx in recs) {
            var rec = recs[idx]
            rec.company = rec.a0188_obj.a011493
            try {
                var templateInfo = await Pub.template(rec.company, 'A43')//'0cba1f72d9a443bbb60c5f3418f40620' //'61d4faa1a3d148c893073ce2d6b73d3d' //
                var template = await Esign.getCompanyApi(rec.company).template.flowTemplate(templateInfo.id)
                var data = []
                // console.log(template.components)
                for (var jdx in template.components) {
                    var component = template.components[jdx]
                    if (component.componentKey==='') continue
                    if (component.componentKey.toLowerCase().indexOf('_sign')>0) {
                        templateInfo.signs = await this.hrm.getSigners(templateInfo.id, rec.transid)
                        if (!templateInfo.signs || templateInfo.signs.length===0) {
                            throw(`请在hrm维护签署人信息`)
                        }
                        for(var kdx in templateInfo.signs){
                            var sign = templateInfo.signs[kdx]
                            signers.push({
                                phone: sign.phone,
                                position: {
                                    page: component.componentPosition.componentPageNum,
                                    x: component.componentPosition.componentPositionX,
                                    y: component.componentPosition.componentPositionY
                                }
                            })
                        }
                    } else {
                        var prop = component.componentKey
                        prop=prop.toLowerCase()
                        prop=prop.replace('a43.','')
                        var val = this.getObjPropVal(rec, prop)
                        if (val!==undefined && val!==null)
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
                    }
                }
                var rst = await Esign.getCompanyApi(rec.company).template.createFileByTemplate(templateInfo.id, `转正申请_${moment(new Date()).format('yyyyMMddHHmmss')}_${rec.a0188}`, data)
                console.log('file:', rst)
                file = rst
                rst = await Esign.getCompanyApi(rec.company).sign.createByFile(rst.fileId, `转正申请_${moment(new Date()).format('yyyyMMddHHmmss')}_${rec.a0188}`, signers)
                console.log('sign flow id:', rst)
                await this.hrm.NewEmpSynced(rec.transid, 1,rst.signFlowId, '转正申请', '', `记录:${rec.a0188};id:${JSON.stringify(rst)}`)
                cnt += 1
                // return file
                // break
            } catch (ex) {
                var errMsg = ex.message || ex
                if (file) {
                    errMsg += `;文件：${file.fileDownloadUrl}`
                }
                errMsg=errMsg.replaceAll(`'`,`''`)
                await this.hrm.NewEmpSynced(rec.transid, 0, '', '转正申请', '', `记录:${rec.a0188};错误信息:${errMsg}`)
                //console.log('new emp sync err:', ex.message || ex)
                //throw(errMsg)
            }
        }
    }

    static async newEmpSign() { // 转正签署
        await this.init()
        var recs = await this.hrm.NewEmpSign()
        for (var idx in recs) {
            var rec = recs[idx]
            rec.company = rec.a0188_obj.a011493
            if (!rec.signflowid) {
                continue
            }
            try {
                var sign = await Esign.getCompanyApi(rec.company).sign.signFlow(rec.signflowid)
                if (sign.signFlowStatus>2) {
                    throw(sign.signFlowDescription)
                }
                if (sign.signFlowStatus===2) {
                    var templateInfo = await Pub.template(rec.company, 'A43')
                    var savePath = await Pub.getSavePath(templateInfo.savePath, rec.transid)
                    var files = await Esign.getCompanyApi(rec.company).sign.signFlowFile(rec.signflowid)
                    await this.hrm.NewEmpSynced(rec.transid, 2, rec.signflowid, '转正申请签署结果', '', `记录：${rec.a0188};签署完毕`, files.files, savePath)
                }
            }catch(ex) {
                var errMsg = ex.message || ex
                errMsg = errMsg.replaceAll(`'`, `''`)
                await this.hrm.NewEmpSynced(rec.transid, 1, rec.signflowid, '转正申请签署结果', '', `记录：${rec.a0188};错误信息:${errMsg}`)
            }
        }
    }

    static getObjPropVal(obj, prop) {
        prop = prop.toLowerCase()
        var strArr = prop.split('.')
        if (obj.constructor !== Object) {
            return obj
        }
        var rst = undefined
        if (strArr.length===1 && strArr[0] in obj) {
            rst = obj[strArr[0]]
        }
        if (strArr.length>1 && strArr[0]+'_obj' in obj) {
            rst = obj[strArr[0]+'_obj']
        }
        if (rst && rst.constructor !== Object) {
            return rst
        }
        if(strArr.length>1) {
            return this.getObjPropVal(rst, prop.replace(strArr[0]+'.',''))
        } else {
            return undefined
        }
    }

    static async monthAttendance() { //月度考勤
        await this.init()
        var recs = await this.hrm.monthAttendance()
        var cnt = 0
        var file = undefined
        var signers = []
        for (var idx in recs) {
            var rec = recs[idx]
            rec.company = rec.a0188_obj.a011493
            try {
                var templateInfo = await Pub.template(rec.company, 'K_MONTH')//'0cba1f72d9a443bbb60c5f3418f40620' //'61d4faa1a3d148c893073ce2d6b73d3d' //
                var template = await Esign.getCompanyApi(rec.company).template.flowTemplate(templateInfo.id)
                var data = []
                // console.log(template.components)
                for (var jdx in template.components) {
                    var component = template.components[jdx]
                    if (component.componentKey==='') continue
                    if (component.componentKey.toLowerCase().indexOf('_sign')>0) {
                        templateInfo.signs = await this.hrm.getSigners(templateInfo.id, rec.k_id)
                        if (!templateInfo.signs || templateInfo.signs.length===0) {
                            throw(`请在hrm维护签署人信息`)
                        }
                        for(var kdx in templateInfo.signs){
                            var sign = templateInfo.signs[kdx]
                            signers.push({
                                phone: sign.phone,
                                position: {
                                    page: component.componentPosition.componentPageNum,
                                    x: component.componentPosition.componentPositionX,
                                    y: component.componentPosition.componentPositionY
                                }
                            })
                        }
                    } else {
                        var prop = component.componentKey
                        prop=prop.toLowerCase()
                        prop=prop.replace('k_month.','')
                        var val = this.getObjPropVal(rec, prop)
                        if (val!==undefined && val!==null)
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
                    }
                }
                var rst = await Esign.getCompanyApi(rec.company).template.createFileByTemplate(templateInfo.id, `月度考勤_${moment(new Date()).format('yyyyMMddHHmmss')}_${rec.a0188}`, data)
                console.log('file:', rst)
                file = rst
                rst = await Esign.getCompanyApi(rec.company).sign.createByFile(rst.fileId, `月度考勤_${moment(new Date()).format('yyyyMMddHHmmss')}_${rec.a0188}`, signers)
                console.log('sign flow id:', rst)
                await this.hrm.monthAttendanceSynced(rec.k_id, 1,rst.signFlowId, '月度考勤', '', `记录:${rec.a0188};id:${JSON.stringify(rst)}`)
                cnt += 1
                // return file
                // break
            } catch (ex) {
                var errMsg = ex.message || ex
                if (file) {
                    errMsg += `;文件：${file.fileDownloadUrl}`
                }
                errMsg=errMsg.replaceAll(`'`,`''`)
                await this.hrm.monthAttendanceSynced(rec.k_id, 0, '', '月度考勤', '', `记录:${rec.a0188};错误信息:${errMsg}`)
                //console.log('new emp sync err:', ex.message || ex)
                //throw(errMsg)
            }
        }
    }

    static async monthAttendanceSign() { // 月度考勤签署
        await this.init()
        var recs = await this.hrm.monthAttendanceSign()
        for (var idx in recs) {
            var rec = recs[idx]
            rec.company = rec.a0188_obj.a011493
            if (!rec.signflowid) {
                continue
            }
            try {
                var sign = await Esign.getCompanyApi(rec.company).sign.signFlow(rec.signflowid)
                if (sign.signFlowStatus>2) {
                    throw(sign.signFlowDescription)
                }
                if (sign.signFlowStatus===2) {
                    var templateInfo = await Pub.template(rec.company, 'K_MONTH')
                    var savePath = await Pub.getSavePath(templateInfo.savePath, rec.k_id)
                    var files = await Esign.getCompanyApi(rec.company).sign.signFlowFile(rec.signflowid)
                    await this.hrm.monthAttendanceSynced(rec.k_id, 2, rec.signflowid, '月度考勤签署结果', '', `记录：${rec.a0188};签署完毕`, files.files, savePath)
                }
            }catch(ex) {
                var errMsg = ex.message || ex
                errMsg = errMsg.replaceAll(`'`, `''`)
                await this.hrm.monthAttendanceSynced(rec.k_id, 1, rec.signflowid, '月度考勤签署结果', '', `记录：${rec.a0188};错误信息:${errMsg}`)
            }
        }
    }

    static async all() {
        await this.newEmp()
        await this.newEmpSign()

        await this.monthAttendance()
        await this.monthAttendanceSign()
    }
}

module.exports = Sync