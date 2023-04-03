const Hrm = require('./hrm')

 class pub {
    constructor() {
        
    }

    static async company(name) {
        if (!this._companys) {
            var hrm = new Hrm()
            this._companys = await hrm.companys()
        }
        var rst = this._companys.find(element => { return element.name === name || element.number === name })
        if (!rst) {
            throw(`公司'${name}'不存在配置`)
        }
        if (!rst.appId) {
            throw(`公司'${name}'未配置appid`)
        }
        if (!rst.secret) {
            throw(`公司'${name}'未配置secret`)
        }
        return rst
    }

    static async template(company, hrmTable) {
        if (!this._companys) {
            var hrm = new Hrm()
            this._companys = await hrm.companys()
        }
        var rst = this._companys.find(element => { return element.name === company || element.number===company })
        if (!rst) {
            throw(`公司'${company}'不存在配置`)
        }
        var tr = rst.templates.find(element=>{ return element.table=== hrmTable})
        if (!tr) {
            throw(`公司'${company}'不存在HRM业务数据${hrmTable}对应模板配置`)
        }
        return tr
    }

    static async getTemplateById(templateId) { //根据模板id获取hrm配置
        if (!this._companys) {
            var hrm = new Hrm()
            this._companys = await hrm.companys()
        }
        var rst = this._companys.find(element => { return element.templates && element.templates.find(ce=>{return ce.id===templateId})})
        if (!rst) return undefined
        var template = rst.templates.find(ce=>{return ce.id === templateId})
        return tempalte
    }

    static async getSavePath(savePath, id) {
        var strTmp = savePath.substr(savePath.indexOf('[')+1, savePath.lastIndexOf(']')-savePath.indexOf('[')-1)
        if (strTmp) {
            var hrm = new Hrm()
            var strTmp1 = await hrm.getDynamicVal(strTmp, id)
            savePath = savePath.replace(`[${strTmp}]`, strTmp1)
        }
        return savePath
    }
}

module.exports = pub