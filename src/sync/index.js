const Esign = require('../esign')
const Hrm = require('../hrm')
const Pub = require('../public')

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
            try {
                var templateInfo = await Pub.template(rec.company, 'A43')//'0cba1f72d9a443bbb60c5f3418f40620' //'61d4faa1a3d148c893073ce2d6b73d3d' //
                var template = await Esign.getCompanyApi(rec.company).template.flowTemplate(templateInfo.id)
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
                            templateInfo.signs = await this.hrm.getSigners(templateInfo.id, rec.TRANSID)
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
                        }
                    }
                }
                var rst = await Esign.getCompanyApi(rec.company).template.createFileByTemplate(templateInfo.id, `转正申请_${rec.A0188}`, data)
                console.log('file:', rst)
                file = rst
                rst = await Esign.getCompanyApi(rec.company).sign.createByFile(rst.fileId, `转正申请_${rec.A0188}`, signers)
                console.log('sign flow id:', rst)
                await this.hrm.NewEmpSynced(rec.TRANSID, 1,rst.signFlowId, '转正申请', '', `记录:${rec.A0188};id:${JSON.stringify(rst)}`)
                cnt += 1
                // return file
                // break
            } catch (ex) {
                var errMsg = ex.message || ex
                if (file) {
                    errMsg += `;文件：${file.fileDownloadUrl}`
                }
                errMsg=errMsg.replaceAll(`'`,`''`)
                await this.hrm.NewEmpSynced(rec.TRANSID, 0, '', '转正申请', '', `记录:${rec.A0188};错误信息:${errMsg}`)
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
            if (!rec.SIGNFLOWID) {
                continue
            }
            try {
                var sign = await Esign.getCompanyApi(rec.company).sign.signFlow(rec.SIGNFLOWID)
                if (sign.signFlowStatus>2) {
                    throw(sign.signFlowDescription)
                }
                if (sign.signFlowStatus===2) {
                    var templateInfo = await Pub.template(rec.company, 'A43')
                    var savePath = await Pub.getSavePath(templateInfo.savePath, rec.TRANSID)
                    var files = await Esign.getCompanyApi(rec.company).sign.signFlowFile(rec.SIGNFLOWID)
                    await this.hrm.NewEmpSynced(rec.TRANSID, 2, rec.SIGNFLOWID, '转正申请签署结果', '', `记录：${rec.A0188};签署完毕`, files.files, savePath)
                }
            }catch(ex) {
                var errMsg = ex.message || ex
                errMsg = errMsg.replaceAll(`'`, `''`)
                await this.hrm.NewEmpSynced(rec.TRANSID, 1, rec.SIGNFLOWID, '转正申请签署结果', '', `记录：${rec.A0188};错误信息:${errMsg}`)
            }
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
            try {
                var templateInfo = await Pub.template(rec.company, 'K_MONTH')//'0cba1f72d9a443bbb60c5f3418f40620' //'61d4faa1a3d148c893073ce2d6b73d3d' //
                var template = await Esign.getCompanyApi(rec.company).template.flowTemplate(templateInfo.id)
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
                        if (component.componentKey.toLowerCase().indexOf('_sign')>0) {
                            templateInfo.signs = await this.hrm.getSigners(templateInfo.id, rec.K_ID)
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
                        }
                    }
                }
                var rst = await Esign.getCompanyApi(rec.company).template.createFileByTemplate(templateInfo.id, `月度考勤_${rec.A0188}`, data)
                console.log('file:', rst)
                file = rst
                rst = await Esign.getCompanyApi(rec.company).sign.createByFile(rst.fileId, `月度考勤_${rec.A0188}`, signers)
                console.log('sign flow id:', rst)
                await this.hrm.monthAttendanceSynced(rec.K_ID, 1,rst.signFlowId, '月度考勤', '', `记录:${rec.A0188};id:${JSON.stringify(rst)}`)
                cnt += 1
                // return file
                // break
            } catch (ex) {
                var errMsg = ex.message || ex
                if (file) {
                    errMsg += `;文件：${file.fileDownloadUrl}`
                }
                errMsg=errMsg.replaceAll(`'`,`''`)
                await this.hrm.monthAttendanceSynced(rec.K_ID, 0, '', '月度考勤', '', `记录:${rec.A0188};错误信息:${errMsg}`)
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
            if (!rec.SIGNFLOWID) {
                continue
            }
            try {
                var sign = await Esign.getCompanyApi(rec.company).sign.signFlow(rec.SIGNFLOWID)
                if (sign.signFlowStatus>2) {
                    throw(sign.signFlowDescription)
                }
                if (sign.signFlowStatus===2) {
                    var templateInfo = await Pub.template(rec.company, 'K_MONTH')
                    var savePath = await Pub.getSavePath(templateInfo.savePath, rec.K_ID)
                    var files = await Esign.getCompanyApi(rec.company).sign.signFlowFile(rec.SIGNFLOWID)
                    await this.hrm.NewEmpSynced(rec.K_ID, 2, rec.SIGNFLOWID, '转正申请签署结果', '', `记录：${rec.A0188};签署完毕`, files.files, savePath)
                }
            }catch(ex) {
                var errMsg = ex.message || ex
                errMsg = errMsg.replaceAll(`'`, `''`)
                await this.hrm.NewEmpSynced(rec.K_ID, 1, rec.SIGNFLOWID, '转正申请签署结果', '', `记录：${rec.A0188};错误信息:${errMsg}`)
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