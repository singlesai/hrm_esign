var Account = require('./Account')
var Organizations = require('./Organizations')
var Template = require('./Template')
var Sign = require('./Sign')

class Esign {
    constructor(company) {
        this.account = new Account(company)
        this.organizations = new Organizations(company)
        this.template = new Template(company)
        this.sign = new Sign(company)
    }

    static getCompanyApi(company) {
        if (!this.apis) {
            this.apis = {}
        }
        if( !this.apis[company]) {
            this.apis[company] = new Esign(company)
        }
        return this.apis[company]
    }
}
module.exports = Esign